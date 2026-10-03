-- Extends the public profile (0003_public_profile.sql) with what a
-- BCA-grad-with-no-CS-degree profile actually needs to be credible to a
-- recruiter: a short bio/pitch, the build-in-public proof trail (tweets/
-- posts with links, not just a completion percentage), and a consistency
-- signal (streak) — without exposing the private journal content itself.

alter table public.user_settings
  add column if not exists public_profile_bio text;

comment on column public.user_settings.public_profile_bio is
  'Optional short bio/pitch shown at the top of the public profile page — e.g. "BCA grad building in public toward a full-stack role." Plain text, no markdown.';

-- Build-in-public proof trail: which phases the user actually posted about,
-- and the link to that post. This is the single most credibility-building
-- piece of a public profile (evidence of consistent public work, not just
-- a claimed percentage) and was previously private-only by omission.
create policy "public read: opted-in build in public status" on public.build_in_public_status
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = build_in_public_status.user_id
        and s.public_profile_enabled = true
    )
  );

-- daily_logs holds private journal content (learned/mistakes/wins/
-- tomorrow_goal) that must never be public, and RLS is row-level rather
-- than column-level — so rather than adding any public policy to
-- daily_logs itself (which would also expose those private fields), the
-- public streak signal is computed app-side from the user's own private
-- daily_logs query and cached into this small summary row instead. Same
-- pattern as build_in_public_status: a narrow, purpose-built public table
-- rather than opening broader access to a private one.
create table if not exists public.public_streak_summary (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  total_days_logged int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.public_streak_summary enable row level security;

create policy "own rows: public_streak_summary" on public.public_streak_summary
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public read: opted-in streak summary" on public.public_streak_summary
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = public_streak_summary.user_id
        and s.public_profile_enabled = true
    )
  );

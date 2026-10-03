-- ============================================================================
-- PUBLIC SHAREABLE PROFILE (P6 polish)
-- Adds an opt-in public flag + slug to user_settings, and read-only public
-- access to the minimal data needed to render a read-only progress profile.
-- ============================================================================

alter table public.user_settings
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists public_profile_slug text unique,
  add column if not exists display_name text;

-- Anyone (anon or authenticated) can read a user_settings row IF that user has
-- opted in to a public profile. This is in addition to the existing owner-only
-- policy, not a replacement.
create policy "public read: opted-in profile settings" on public.user_settings
  for select to anon, authenticated
  using (public_profile_enabled = true);

-- Same pattern for topic_progress, dsa_progress, project_progress, career is
-- intentionally excluded (career applications stay private). Only progress
-- data relevant to a "what have they shipped/learned" profile is exposed,
-- and only for rows belonging to a user who has opted in.
create policy "public read: opted-in topic progress" on public.topic_progress
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = topic_progress.user_id
        and s.public_profile_enabled = true
    )
  );

create policy "public read: opted-in dsa progress" on public.dsa_progress
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = dsa_progress.user_id
        and s.public_profile_enabled = true
    )
  );

create policy "public read: opted-in project progress" on public.project_progress
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = project_progress.user_id
        and s.public_profile_enabled = true
    )
  );

-- Helper: generate a short random slug if the user enables public profile
-- without picking one explicitly. Called from the app on first enable.
create or replace function public.ensure_profile_slug(uid uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  candidate text;
  existing text;
begin
  select public_profile_slug into existing from public.user_settings where user_id = uid;
  if existing is not null then
    return existing;
  end if;
  candidate := substr(md5(random()::text || uid::text), 1, 10);
  update public.user_settings set public_profile_slug = candidate where user_id = uid;
  return candidate;
end;
$$;

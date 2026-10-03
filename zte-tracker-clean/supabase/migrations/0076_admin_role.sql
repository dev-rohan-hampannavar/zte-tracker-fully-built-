-- ============================================================================
-- PHASE 19 — Admin/content management: role flag + write access
--
-- No admin concept exists anywhere in this schema before this migration —
-- confirmed by grep across all prior migrations. All shared-content
-- tables (phases, topics, technologies, roadmaps, etc.) are writable only
-- via service role today, meaning every curriculum edit requires a code
-- deploy. This migration adds the minimum needed to change that: an
-- is_admin flag, and RLS policies letting admins write to the content
-- tables that matter first (roadmaps, phases, topics) rather than all ~30
-- shared-content tables at once — the master prompt's own Phase 19 list
-- (roadmaps, phases, modules, topics, lessons, exercises, projects,
-- resources) is a big surface; starting with the three an admin UI
-- actually needs first keeps this reviewable, and more tables can get
-- the identical policy shape added later without redesigning anything.
-- ============================================================================

alter table public.user_settings
  add column if not exists is_admin boolean not null default false;

comment on column public.user_settings.is_admin is
  'Grants write access to shared content tables (roadmaps, phases, '
  'topics) via the policies below. Defaults false for everyone, '
  'including existing accounts — set manually per account, never by '
  'email/identity check in application code.';

-- Helper used by every admin policy below, instead of repeating the
-- exists-subquery in each one. security definer + search_path pinned
-- so it can't be tricked by a search_path change, and it reads
-- user_settings directly rather than trusting a JWT claim, since
-- nothing in this app issues custom JWT claims today.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.user_settings where user_id = auth.uid()),
    false
  );
$$;

create policy "admin write: roadmaps" on public.roadmaps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin write: phases" on public.phases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin write: topics" on public.topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

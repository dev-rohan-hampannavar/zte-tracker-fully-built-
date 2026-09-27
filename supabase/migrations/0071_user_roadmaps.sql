-- ============================================================================
-- PHASE 5 — Roadmap enrollment
--
-- Purpose: let a user be enrolled in a roadmap without duplicating the
-- roadmap's content into their account (master prompt Phase 5's explicit
-- requirement). This is the "user_roadmaps" table the spec names,
-- containing user_id / roadmap_id / roadmap_version_id / started_at /
-- target_date / weekly_hours / status.
--
-- Design decision this migration has to make and document (not left
-- implicit): migration 0069 already added `user_settings.roadmap_id` as a
-- single free-text pointer ("which roadmap is this account on"). That
-- column and this new table would be two independent sources of truth
-- for the same fact unless one is defined in terms of the other. Nothing
-- in the app reads `user_settings.roadmap_id` yet (checked before writing
-- this), so it's safe to settle this now rather than let it drift:
--
--   `user_roadmaps` is the source of truth. It supports what a single
--   pointer column structurally cannot — enrollment history, a real
--   target_date/weekly_hours/status per enrollment, multiple past
--   enrollments if a user ever switches roadmaps.
--
--   `user_settings.roadmap_id` becomes a denormalized convenience
--   pointer at "whichever user_roadmaps row is currently active for
--   this user" — kept in sync by a trigger below rather than trusted to
--   stay correct by application code remembering to update both. Reads
--   that only need "what roadmap is this user on right now" (e.g. a
--   dashboard header) can keep reading the cheap single column; reads
--   that need enrollment detail (target date, weekly hours, status,
--   history) go to user_roadmaps.
--
-- Explicit non-goals of this migration:
--   - Does NOT change fetchRoadmap() in src/lib/hooks/use-roadmap.ts to
--     filter by enrollment. That hook currently loads `phases`/`topics`
--     completely unfiltered, which only works because exactly one
--     roadmap exists. Filtering it is real behavior change that belongs
--     with Phase 9 (dashboard) once Phase 6-8 (onboarding + content)
--     actually produce more than one roadmap to filter between —
--     wiring it now, against a catalog that still only has one row,
--     would be untestable and premature.
--   - Does NOT auto-enroll existing users via this migration's own SQL.
--     See the backfill section below for why that's handled differently
--     from the phases.roadmap_id backfill in migration 0070.
-- ============================================================================

create table if not exists public.user_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id text not null references public.roadmaps(id),
  roadmap_version_id uuid references public.roadmap_versions(id),
  started_at timestamptz not null default now(),
  target_date date,
  weekly_hours numeric,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_roadmaps is
  'Enrollment: which roadmap(s) a user is on, independent of the '
  'roadmap''s own content (phases/topics are never duplicated per user). '
  'Phase 5 of the multi-user transformation. user_settings.roadmap_id is '
  'kept in sync with whichever row here has status = ''active'' via the '
  'trigger below — read that column for “what roadmap is this user on '
  'right now”, read this table for enrollment detail or history.';

-- At most one active enrollment per user. A user can have historical
-- paused/completed/abandoned rows, but "active" must be unambiguous for
-- the user_settings.roadmap_id sync trigger below to have a single
-- correct value to copy.
create unique index if not exists user_roadmaps_one_active_idx
  on public.user_roadmaps (user_id)
  where status = 'active';

create index if not exists user_roadmaps_user_id_idx on public.user_roadmaps (user_id);

alter table public.user_roadmaps enable row level security;

create policy "user_roadmaps_select_own" on public.user_roadmaps
  for select using (auth.uid() = user_id);
create policy "user_roadmaps_insert_own" on public.user_roadmaps
  for insert with check (auth.uid() = user_id);
create policy "user_roadmaps_update_own" on public.user_roadmaps
  for update using (auth.uid() = user_id);
create policy "user_roadmaps_delete_own" on public.user_roadmaps
  for delete using (auth.uid() = user_id);

-- Keep user_settings.roadmap_id in sync with the active enrollment,
-- rather than relying on every future piece of application code that
-- writes user_roadmaps to remember to also update user_settings. Fires
-- on insert/update of user_roadmaps; a newly-active row's roadmap_id
-- gets copied onto that user's user_settings row.
create or replace function public.sync_active_roadmap_to_user_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'active' then
    update public.user_settings
    set roadmap_id = new.roadmap_id
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_active_roadmap on public.user_roadmaps;
create trigger sync_active_roadmap
  after insert or update of status, roadmap_id on public.user_roadmaps
  for each row
  execute function public.sync_active_roadmap_to_user_settings();

-- Backfill, deliberately NOT done as a blanket insert here (unlike
-- migration 0070's phases backfill). Every existing account already has
-- `user_settings.roadmap_id = 'zte-core-v1'` and `is_personalized = true`
-- from migration 0069 — that's sufficient for "what roadmap is this
-- account on" today. Auto-creating a user_roadmaps row for every existing
-- user here would mean inventing a started_at/target_date/weekly_hours
-- for accounts that never went through onboarding and never stated
-- those values, which is exactly the kind of "do not invent missing
-- information" the master prompt's ROLE section opens with. Real
-- enrollment rows get created going forward: for the existing owner
-- account, a one-off manual insert once this ships (their actual
-- started_at is knowable — decide it at that point, not guessed here);
-- for new signups, Phase 6's onboarding flow creates the row as part of
-- completing onboarding.

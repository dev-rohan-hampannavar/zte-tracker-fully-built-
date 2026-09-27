-- ============================================================================
-- PHASE 3/4 — Separate content from user state: roadmap catalog tables
--
-- Purpose: introduce `roadmaps` and `roadmap_versions` as real, queryable
-- tables (the master prompt's Phase 4 conceptual hierarchy), and give the
-- existing curriculum an explicit identity ("zte-core-v1", version 1)
-- inside that catalog — without moving, renaming, or duplicating a single
-- row of `phases`/`topics`/`roadmap_metadata` or any of the 21 tables
-- elsewhere in the schema that hold a foreign key into `phases.id` or
-- `topics.id` (checked directly against the migration source before
-- writing this: 0001, 0002, 0009, 0011, 0018, 0026, 0029, 0030, 0033,
-- 0034, 0041, 0052, 0054, 0062). Those all reference the row, not the
-- roadmap it belongs to, so none of them need to change for this to work.
--
-- Explicit non-goals of this migration:
--   - Does NOT touch `roadmap_metadata` (still the singleton `id=1` row
--     every existing page reads — src/lib/hooks/use-roadmap.ts,
--     src/app/api/health/route.ts, the landing/statistics/reference pages,
--     src/lib/job-readiness.ts all keep working unchanged).
--   - Does NOT make `user_settings.roadmap_id` (added in 0069) a real
--     foreign key yet — it stays free text for now. Wiring it up is a
--     follow-up migration once this table has settled, so a mistake here
--     can't cascade into breaking every user's row.
--   - Does NOT add new roadmaps yet (Phase 8's job) — this seeds exactly
--     one row, matching the one curriculum that exists today.
--
-- Result of this migration: the data needed to eventually assign
-- different users to different roadmaps now exists, addressed by a
-- stable slug ("zte-core-v1") rather than an implicit "there's only one"
-- assumption. Nothing currently reads these two new tables yet — that
-- wiring happens in Phase 5 (enrollment).
-- ============================================================================

create table if not exists public.roadmaps (
  id text primary key,                    -- stable slug, e.g. 'zte-core-v1'
  title text not null,
  track text,                             -- 'frontend' | 'backend' | 'full-stack' | ... (Phase 8)
  description text,
  is_public boolean not null default false, -- can a new signup be assigned this roadmap?
  created_at timestamptz not null default now()
);

comment on table public.roadmaps is
  'Catalog of roadmaps. Phase 4 of the multi-user transformation. Today '
  'contains exactly one row (the existing curriculum, is_public = false '
  'since onboarding/assignment does not exist yet) — more rows get added '
  'in Phase 8 when public tracks (frontend/backend/full-stack) ship. '
  'Shared content, same RLS shape as phases/topics: public read, no '
  'regular-user write.';

create table if not exists public.roadmap_versions (
  id uuid primary key default gen_random_uuid(),
  roadmap_id text not null references public.roadmaps(id) on delete cascade,
  version_number int not null,
  label text,                             -- e.g. 'v1.0', 'v1.1'
  is_current boolean not null default true,
  released_at timestamptz not null default now(),
  unique (roadmap_id, version_number)
);

comment on table public.roadmap_versions is
  'Content versioning per roadmap (master prompt Phase 47). Today, '
  'phases/topics are not yet linked to a specific version row — that '
  'link is added by the roadmap_id/roadmap_version_id columns below, '
  'currently pointing every existing phase at version 1 of the one '
  'existing roadmap. Future content edits that need to preserve already-'
  'enrolled users'' progress will create a new version row rather than '
  'mutating phases/topics in place.';

-- One partial unique index instead of a table-level constraint, since
-- "at most one current version per roadmap" only needs to hold among the
-- is_current = true rows.
create unique index if not exists roadmap_versions_one_current_idx
  on public.roadmap_versions (roadmap_id)
  where is_current;

alter table public.roadmaps enable row level security;
alter table public.roadmap_versions enable row level security;

-- Two policies per table (authenticated + anon), not one unscoped
-- `using (true)` — matching the pattern 0027_fix_public_profile_phases_
-- topics.sql had to retrofit onto phases/topics/capstones after
-- discovering the anon-key client used by logged-out /u/[slug] visitors
-- silently got empty results from an `authenticated`-only policy. These
-- two tables have the same shape (non-sensitive static reference
-- content), so they're opened to both roles from the start instead of
-- repeating that bug.
create policy "static read: roadmaps" on public.roadmaps
  for select to authenticated using (true);
create policy "static read (anon): roadmaps" on public.roadmaps
  for select to anon using (true);

create policy "static read: roadmap_versions" on public.roadmap_versions
  for select to authenticated using (true);
create policy "static read (anon): roadmap_versions" on public.roadmap_versions
  for select to anon using (true);

-- No insert/update/delete policies for either table: same pattern as
-- phases/topics/roadmap_metadata — writes are service-role/migration
-- only, verified against every other shared-content table in AUDIT.md
-- section 3.

-- Link phases to a roadmap + version. Nullable and backfilled rather than
-- `not null` from the start, so this ships safely even if a future
-- migration adds a phase before this one in some branch/rebase ordering
-- — a null here just means "not yet assigned to a roadmap", not a broken
-- row. topics is intentionally left untouched: it already cascades from
-- phases via phase_id, so a topic's roadmap is always phases.roadmap_id
-- one hop away — duplicating the column onto topics would just be two
-- places that could disagree.
alter table public.phases
  add column if not exists roadmap_id text references public.roadmaps(id),
  add column if not exists roadmap_version_id uuid references public.roadmap_versions(id);

-- Seed: the existing curriculum becomes roadmap "zte-core-v1", version 1,
-- and every existing phase row is backfilled to point at it. Uses
-- `roadmap_metadata` (the existing singleton, id = 1) as the source of
-- the title, so this migration can't drift out of sync with whatever
-- that row currently says.
insert into public.roadmaps (id, title, track, description, is_public)
select 'zte-core-v1', title, 'full-stack', 'The original hand-built ZTE curriculum.', false
from public.roadmap_metadata
where id = 1
on conflict (id) do nothing;

-- Fallback in case roadmap_metadata's single row doesn't exist for some
-- reason (fresh database with migrations applied out of the usual order)
-- — don't let this migration hard-fail on that; insert a sane default
-- instead of leaving `roadmaps` empty and every phase unassigned.
insert into public.roadmaps (id, title, track, description, is_public)
values ('zte-core-v1', 'Zero to Elite', 'full-stack', 'The original hand-built ZTE curriculum.', false)
on conflict (id) do nothing;

insert into public.roadmap_versions (roadmap_id, version_number, label, is_current)
values ('zte-core-v1', 1, 'v1.0', true)
on conflict (roadmap_id, version_number) do nothing;

update public.phases
set
  roadmap_id = 'zte-core-v1',
  roadmap_version_id = (select id from public.roadmap_versions where roadmap_id = 'zte-core-v1' and version_number = 1)
where roadmap_id is null;

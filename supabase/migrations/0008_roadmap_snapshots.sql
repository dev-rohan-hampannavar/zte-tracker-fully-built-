-- ============================================================================
-- ZTE Tracker — P7.6: Roadmap diff / versioning
-- Snapshots the structural roadmap content (phases/stages/topics — not
-- per-user progress) each time the parser is re-run, so future re-parses
-- of an updated roadmap.md can be diffed against what shipped before.
-- There has only ever been one roadmap.md in this repo, so this is
-- forward-looking infrastructure: version 1 is seeded now as a baseline,
-- and the diff algorithm is verified against synthetic before/after
-- snapshots (see scripts/diff_roadmap_snapshots.py) since no second real
-- version exists yet to diff against. Additive only.
-- ============================================================================

create table if not exists public.roadmap_snapshots (
  id uuid primary key default uuid_generate_v4(),
  version int not null,
  created_at timestamptz not null default now(),
  source_hash text not null,        -- sha256 of roadmap.md at snapshot time, to detect no-op re-parses
  phase_count int not null,
  stage_count int not null,
  topic_count int not null,
  unique (version)
);

-- One row per phase/stage/topic as it existed in a given snapshot. A
-- generic (entity_type, entity_id) shape rather than three separate tables,
-- since the diff algorithm treats all three the same way (added/removed/
-- changed/moved-by-order_index) and a single table keeps that symmetric.
create table if not exists public.roadmap_snapshot_entities (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id uuid not null references public.roadmap_snapshots(id) on delete cascade,
  entity_type text not null check (entity_type in ('phase', 'stage', 'topic')),
  entity_id text not null,          -- the real id, e.g. 'phase-06', 'topic-03-12'
  parent_id text,                   -- phase_id for a stage/topic-without-stage, stage_id for a topic-in-a-stage
  title text not null,
  order_index int not null,
  estimated_hours numeric
);

create index if not exists idx_snapshot_entities_snapshot on public.roadmap_snapshot_entities(snapshot_id);
create index if not exists idx_snapshot_entities_entity on public.roadmap_snapshot_entities(entity_type, entity_id);

alter table public.roadmap_snapshots enable row level security;
alter table public.roadmap_snapshot_entities enable row level security;

create policy "static read: roadmap_snapshots" on public.roadmap_snapshots for select to authenticated using (true);
create policy "static read: roadmap_snapshot_entities" on public.roadmap_snapshot_entities for select to authenticated using (true);

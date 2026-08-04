-- ============================================================================
-- ZTE Tracker — Stage 1 / Item 8: Portfolio Projects — data model
--
-- roadmap.md Part VII ("Advanced Projects") contains 10 fully-specified SaaS
-- project ideas — this table was never modeled or parsed. Fields below map
-- 1:1 to what the source document actually states per project: THE PROBLEM,
-- WHO EXACTLY, WHAT EXISTS, THE GAP, CORE FEATURES, ADVANCED FEATURES,
-- ZTD SKILLS (feature -> phase table), MONETIZATION, FIRST 5 USERS.
--
-- Two fields from item 8's original ~10-field spec are deliberately NOT
-- modeled as static columns:
--   - "Related phases" is fully covered by skill_mapping (feature/phase
--     pairs) — a separate flat phase-list column would just be a lossy
--     duplicate of the same data.
--   - "Status" is inherently per-user (which of these 10 ideas *you've*
--     started), so it belongs in a progress table, not the static content
--     table — see advanced_project_progress below.
-- ============================================================================

create table if not exists public.advanced_projects (
  id text primary key,                  -- e.g. 'adv-project-01-tiffinos'
  order_index int not null,
  name text not null,                   -- e.g. 'TiffinOS'
  tagline text not null,                -- e.g. 'Tiffin Service Management Platform'
  problem text not null,
  who_exactly text not null,
  what_exists text not null,
  the_gap text not null,
  core_features text[] not null default '{}',
  advanced_features text[] not null default '{}',
  skill_mapping jsonb not null default '[]',  -- [{feature, phase}]
  monetization text not null,
  first_users text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.advanced_project_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.advanced_projects(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','considering','in_progress','completed','abandoned')),
  github_url text,
  deployment_url text,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.roadmap_metadata
  add column if not exists total_advanced_projects int;

alter table public.advanced_projects enable row level security;
alter table public.advanced_project_progress enable row level security;

create policy "static read: advanced_projects" on public.advanced_projects for select to authenticated using (true);

create policy "own rows: advanced_project_progress" on public.advanced_project_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_set_updated_at on public.advanced_project_progress;
create trigger trg_set_updated_at before update on public.advanced_project_progress
  for each row execute procedure public.set_updated_at();

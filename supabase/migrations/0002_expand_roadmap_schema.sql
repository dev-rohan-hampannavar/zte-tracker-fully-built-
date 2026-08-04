-- ============================================================================
-- ZTE Tracker — P0 Schema Expansion
-- Adds the hierarchy the v1 parser dropped: stages, topic subtopic groups,
-- stage projects/exercises, phase capstones, ClientSync milestones, companies.
-- Additive only — does not alter or drop any existing table.
-- ============================================================================

-- ---------- STAGES (Phase -> Stage -> Topic) ----------
create table if not exists public.stages (
  id text primary key,                  -- e.g. 'stage-01-03'
  phase_id text not null references public.phases(id) on delete cascade,
  stage_number int not null,
  title text not null,
  description text,
  estimated_hours numeric(6,1),
  order_index int not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stages_phase on public.stages(phase_id, order_index);

-- ---------- TOPICS: add stage linkage + extra fields (additive columns) ----------
alter table public.topics
  add column if not exists stage_id text references public.stages(id) on delete set null,
  add column if not exists heading_number int,
  add column if not exists intro text;
create index if not exists idx_topics_stage on public.topics(stage_id);

-- ---------- TOPIC SUBTOPIC GROUPS (bold subheading + bullet list within a topic) ----------
create table if not exists public.topic_groups (
  id uuid primary key default uuid_generate_v4(),
  topic_id text not null references public.topics(id) on delete cascade,
  heading text,                         -- null when bullets appear with no subheading
  order_index int not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_topic_groups_topic on public.topic_groups(topic_id, order_index);

create table if not exists public.topic_group_bullets (
  id uuid primary key default uuid_generate_v4(),
  topic_group_id uuid not null references public.topic_groups(id) on delete cascade,
  content text not null,
  order_index int not null
);
create index if not exists idx_topic_bullets_group on public.topic_group_bullets(topic_group_id, order_index);

-- ---------- STAGE PROJECTS (Easy/Medium/Hard project briefs per stage) ----------
create table if not exists public.stage_projects (
  id text primary key,                  -- stable hash-derived id, e.g. 'proj-67e8561bd7'
  stage_id text not null references public.stages(id) on delete cascade,
  name text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  description text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stage_projects_stage on public.stage_projects(stage_id, difficulty);

-- ---------- STAGE EXERCISES (Practice Exercises bullet list per stage) ----------
create table if not exists public.stage_exercises (
  id text primary key,                  -- stable hash-derived id, e.g. 'ex-f04b004ded'
  stage_id text not null references public.stages(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stage_exercises_stage on public.stage_exercises(stage_id);

-- ---------- PHASE EXIT CAPSTONES ----------
create table if not exists public.capstones (
  id text primary key,                  -- e.g. 'capstone-01'
  phase_id text not null references public.phases(id) on delete cascade,
  name text not null,                   -- e.g. 'DevScribe'
  title text not null,                  -- e.g. 'A Personal Developer Journal & Snippet Manager'
  description text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_capstones_phase on public.capstones(phase_id);

-- ---------- CLIENTSYNC MILESTONES ----------
create table if not exists public.clientsync_milestones (
  id text primary key,                  -- e.g. 'clientsync-06'
  linked_phase text references public.phases(id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------- COMPANIES (curated allowlist of real companies/products named in the roadmap) ----------
create table if not exists public.companies (
  id text primary key,                  -- e.g. 'company-vercel'
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- ROADMAP METADATA: extra rollup columns (additive) ----------
alter table public.roadmap_metadata
  add column if not exists total_stages int,
  add column if not exists total_capstones int,
  add column if not exists total_stage_projects int,
  add column if not exists total_stage_exercises int,
  add column if not exists total_companies int;

-- ============================================================================
-- ROW LEVEL SECURITY (static content — read-only for authenticated users)
-- ============================================================================
alter table public.stages enable row level security;
alter table public.topic_groups enable row level security;
alter table public.topic_group_bullets enable row level security;
alter table public.stage_projects enable row level security;
alter table public.stage_exercises enable row level security;
alter table public.capstones enable row level security;
alter table public.clientsync_milestones enable row level security;
alter table public.companies enable row level security;

create policy "static read: stages" on public.stages for select to authenticated using (true);
create policy "static read: topic_groups" on public.topic_groups for select to authenticated using (true);
create policy "static read: topic_group_bullets" on public.topic_group_bullets for select to authenticated using (true);
create policy "static read: stage_projects" on public.stage_projects for select to authenticated using (true);
create policy "static read: stage_exercises" on public.stage_exercises for select to authenticated using (true);
create policy "static read: capstones" on public.capstones for select to authenticated using (true);
create policy "static read: clientsync_milestones" on public.clientsync_milestones for select to authenticated using (true);
create policy "static read: companies" on public.companies for select to authenticated using (true);

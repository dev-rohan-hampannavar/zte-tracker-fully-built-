-- ============================================================================
-- ZTE Tracker — Stage 0 / Item 24: Technology Pages — data model
-- No technology entity existed anywhere in the schema. This adds a
-- technologies table and a topic<->technology join so a page per technology
-- (React, Next.js, PostgreSQL, ...) can show every topic it appears in.
-- Additive only.
-- ============================================================================

create table if not exists public.technologies (
  id text primary key,                  -- e.g. 'tech-react'
  name text not null unique,
  category text,                        -- e.g. 'Frontend', 'Backend', 'Database', 'DevOps', 'AI'
  created_at timestamptz not null default now()
);

create table if not exists public.topic_technologies (
  topic_id text not null references public.topics(id) on delete cascade,
  technology_id text not null references public.technologies(id) on delete cascade,
  primary key (topic_id, technology_id)
);
create index if not exists idx_topic_technologies_tech on public.topic_technologies(technology_id);
create index if not exists idx_topic_technologies_topic on public.topic_technologies(topic_id);

alter table public.roadmap_metadata
  add column if not exists total_technologies int;

alter table public.technologies enable row level security;
alter table public.topic_technologies enable row level security;

create policy "static read: technologies" on public.technologies for select to authenticated using (true);
create policy "static read: topic_technologies" on public.topic_technologies for select to authenticated using (true);

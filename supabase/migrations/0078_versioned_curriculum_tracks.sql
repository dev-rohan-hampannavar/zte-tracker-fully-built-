-- Version-scoped shared curriculum tables. Existing phases/topics and their
-- user progress IDs remain untouched so the owner's history stays intact.
create table if not exists public.roadmap_phases (
  id text primary key,
  roadmap_id text not null references public.roadmaps(id) on delete cascade,
  roadmap_version_id uuid not null references public.roadmap_versions(id) on delete cascade,
  phase_number text not null,
  title text not null,
  band text not null check (band in ('Foundation','Core','Advanced','Expert')),
  description text not null,
  estimated_hours int not null check (estimated_hours > 0),
  order_index int not null,
  unique (roadmap_version_id, phase_number),
  unique (roadmap_version_id, order_index)
);

create table if not exists public.roadmap_modules (
  id text primary key,
  phase_id text not null references public.roadmap_phases(id) on delete cascade,
  module_number int not null,
  title text not null,
  description text not null,
  estimated_hours int not null check (estimated_hours > 0),
  order_index int not null,
  unique (phase_id, order_index)
);

create table if not exists public.roadmap_topics (
  id text primary key,
  module_id text not null references public.roadmap_modules(id) on delete cascade,
  title text not null,
  learning_objectives text[] not null default '{}',
  practice_tasks text[] not null default '{}',
  completion_evidence text[] not null default '{}',
  estimated_minutes int not null check (estimated_minutes > 0),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  order_index int not null,
  unique (module_id, order_index)
);

create table if not exists public.roadmap_projects (
  id text primary key,
  phase_id text not null references public.roadmap_phases(id) on delete cascade,
  title text not null,
  problem_statement text not null,
  requirements text[] not null default '{}',
  milestones text[] not null default '{}',
  deliverables text[] not null default '{}',
  skills text[] not null default '{}',
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  order_index int not null,
  unique (phase_id, order_index)
);

create table if not exists public.user_roadmap_topic_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.roadmap_topics(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','learning','practicing','applied','mastered')),
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.roadmap_topic_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.roadmap_topics(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_phases_roadmap_idx on public.roadmap_phases(roadmap_id, roadmap_version_id, order_index);
create index if not exists roadmap_modules_phase_idx on public.roadmap_modules(phase_id, order_index);
create index if not exists roadmap_topics_module_idx on public.roadmap_topics(module_id, order_index);
create index if not exists roadmap_projects_phase_idx on public.roadmap_projects(phase_id, order_index);
create index if not exists roadmap_topic_notes_owner_idx on public.roadmap_topic_notes(user_id, topic_id, created_at desc);

alter table public.roadmap_phases enable row level security;
alter table public.roadmap_modules enable row level security;
alter table public.roadmap_topics enable row level security;
alter table public.roadmap_projects enable row level security;
alter table public.user_roadmap_topic_progress enable row level security;
alter table public.roadmap_topic_notes enable row level security;

create policy "published roadmap phases read" on public.roadmap_phases
  for select to authenticated using (
    exists (select 1 from public.roadmaps r where r.id = roadmap_id and r.is_public)
    or exists (select 1 from public.user_roadmaps ur where ur.user_id = auth.uid() and ur.roadmap_id = roadmap_id and ur.status = 'active')
  );
create policy "published roadmap modules read" on public.roadmap_modules
  for select to authenticated using (exists (
    select 1 from public.roadmap_phases p join public.roadmaps r on r.id = p.roadmap_id
    where p.id = phase_id and (r.is_public or exists (
      select 1 from public.user_roadmaps ur where ur.user_id = auth.uid() and ur.roadmap_id = r.id and ur.status = 'active'
    ))
  ));
create policy "published roadmap topics read" on public.roadmap_topics
  for select to authenticated using (exists (
    select 1 from public.roadmap_modules m join public.roadmap_phases p on p.id = m.phase_id
    join public.roadmaps r on r.id = p.roadmap_id
    where m.id = module_id and (r.is_public or exists (
      select 1 from public.user_roadmaps ur where ur.user_id = auth.uid() and ur.roadmap_id = r.id and ur.status = 'active'
    ))
  ));
create policy "published roadmap projects read" on public.roadmap_projects
  for select to authenticated using (exists (
    select 1 from public.roadmaps r where r.id = (select p.roadmap_id from public.roadmap_phases p where p.id = phase_id)
      and (r.is_public or exists (
        select 1 from public.user_roadmaps ur where ur.user_id = auth.uid() and ur.roadmap_id = r.id and ur.status = 'active'
      ))
  ));
create policy "own roadmap topic progress" on public.user_roadmap_topic_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own roadmap topic notes" on public.roadmap_topic_notes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.roadmap_phases, public.roadmap_modules, public.roadmap_topics, public.roadmap_projects to authenticated;
grant select, insert, update, delete on public.user_roadmap_topic_progress to authenticated;
grant select, insert, update, delete on public.roadmap_topic_notes to authenticated;

-- Mapping a public role to a new track is data-driven and keeps every
-- account's existing enrollment untouched. Keep role selection limited to
-- roles with an authored curriculum. Other roles are not assigned a fake
-- specialist path and can use the legacy owner's full-stack roadmap only
-- through the legacy full-stack curriculum fallback in onboarding.
update public.roadmaps set is_public = true where id = 'zte-core-v1';
delete from public.role_roadmap_assignments a
where a.roadmap_id = 'zte-core-v1'
  and exists (select 1 from public.target_roles tr where tr.id = a.role_id);

insert into public.role_roadmap_assignments (role_id, roadmap_id, priority)
select id, 'zte-frontend-v1', 0
from public.target_roles
where id = 'frontend-developer'
on conflict (role_id, roadmap_id) do update set priority = excluded.priority;

insert into public.role_roadmap_assignments (role_id, roadmap_id, priority)
select id, 'zte-backend-java-v1', 0
from public.target_roles
where id = 'backend-developer'
on conflict (role_id, roadmap_id) do update set priority = excluded.priority;

insert into public.role_roadmap_assignments (role_id, roadmap_id, priority)
select id, 'zte-frontend-v1', 0
from public.target_roles
where id = 'sde-1'
on conflict (role_id, roadmap_id) do update set priority = excluded.priority;

insert into public.role_roadmap_assignments (role_id, roadmap_id, priority)
select id, 'zte-fullstack-v1', 0
from public.target_roles
where id = 'fullstack-developer'
on conflict (role_id, roadmap_id) do update set priority = excluded.priority;

comment on table public.roadmap_topics is
  'Shared, versioned curriculum topics with measurable objectives, practice, evidence, and estimated duration.';

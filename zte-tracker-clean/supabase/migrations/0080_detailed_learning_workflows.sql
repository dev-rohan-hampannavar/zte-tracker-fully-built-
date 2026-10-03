-- Add the learning relationships and personal evidence needed to use the
-- detailed tracks as an actual study workflow.
alter table public.roadmap_topics
  add column if not exists prerequisite_topic_ids text[] not null default '{}',
  add column if not exists learning_resources jsonb not null default '[]'::jsonb;

alter table public.user_roadmap_topic_progress
  add column if not exists confidence smallint check (confidence is null or confidence between 1 and 5),
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_at timestamptz,
  add column if not exists review_interval_days int,
  add column if not exists review_count int not null default 0;

create table if not exists public.user_roadmap_project_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.roadmap_projects(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','planning','building','review','complete')),
  repository_url text,
  deployed_url text,
  evidence jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists user_roadmap_project_progress_owner_idx
  on public.user_roadmap_project_progress(user_id, updated_at desc);

alter table public.user_roadmap_project_progress enable row level security;
create policy "own detailed roadmap project progress" on public.user_roadmap_project_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_roadmap_project_progress to authenticated;

comment on column public.roadmap_topics.prerequisite_topic_ids is
  'Ordered topic IDs recommended before this topic. Guidance only; a learner may choose to skip.';
comment on column public.user_roadmap_topic_progress.next_review_at is
  'Next suggested spaced-review time, updated when the learner changes topic status.';

-- Daily Mission redesign: individual logged study sessions, not just the
-- daily_logs rollup. daily_logs stays as the one-row-per-day hours total
-- (streak/heatmap/weekly stats all read that and shouldn't change), this
-- adds the session-level detail needed for "Today's Sessions" — what was
-- actually logged, when, against what curriculum item.
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  hours numeric(5,2) not null,
  activity text not null default 'learn' check (activity in ('learn','practice','project','revision','dsa','other')),
  topic_id text references public.topics(id) on delete set null,
  stage_project_id text references public.stage_projects(id) on delete set null,
  notes text,
  logged_at timestamptz not null default now()
);
create index if not exists idx_study_sessions_user_date on public.study_sessions(user_id, date);

alter table public.study_sessions enable row level security;

create policy "own rows: study_sessions" on public.study_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

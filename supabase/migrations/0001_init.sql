-- ============================================================================
-- ZTE Tracker — Initial Schema
-- Static roadmap tables + user progress tables + Row Level Security
-- ============================================================================

-- ---------- extensions ----------
create extension if not exists "uuid-ossp";

-- ============================================================================
-- STATIC TABLES (roadmap content — same for every user)
-- ============================================================================

create table if not exists public.roadmap_metadata (
  id int primary key default 1,
  title text not null,
  total_phases int not null,
  total_topics int not null,
  total_realistic_hours int not null,
  source_stated_hours int,
  months_at_40hrs_week numeric,
  dsa_easy_target int not null default 75,
  dsa_medium_target int not null default 50,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists public.phases (
  id text primary key,                  -- e.g. 'phase-01', 'phase-06b'
  phase_number text not null,           -- '01', '06b'
  title text not null,
  band text,                            -- Foundation / Core / Advanced / Expert
  description text,
  estimated_hours int,
  exit_point_code text,
  build_in_public_prompt text,
  skip_build_in_public boolean not null default false,
  order_index int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id text primary key,                  -- e.g. 'topic-01-03'
  phase_id text not null references public.phases(id) on delete cascade,
  order_index int not null,
  title text not null,
  estimated_hours int,
  created_at timestamptz not null default now()
);
create index if not exists idx_topics_phase on public.topics(phase_id, order_index);

create table if not exists public.exit_ladder (
  exit_code text primary key,           -- 'A', 'A2', 'B', '★1', ...
  linked_phase text references public.phases(id),
  name text,
  job_level text,
  salary_range text,
  target_companies text,
  highlights text,
  order_index int not null default 0
);

-- ============================================================================
-- USER TABLES (per-user progress — protected by RLS)
-- ============================================================================

create table if not exists public.topic_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  actual_minutes_spent int not null default 0,
  last_reviewed timestamptz,
  difficulty text check (difficulty in ('easy','medium','hard')),
  bookmarked boolean not null default false,
  revision_status text check (revision_status in ('needs_revision','comfortable','mastered')),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.topic_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_topic_notes_user_topic on public.topic_notes(user_id, topic_id);

create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  hours numeric(5,2) not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.project_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id text not null references public.phases(id) on delete cascade,
  github_url text,
  deployment_url text,
  demo_url text,
  screenshots text[] default '{}',
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, phase_id)
);

create table if not exists public.build_in_public_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id text not null references public.phases(id) on delete cascade,
  posted boolean not null default false,
  proof_url text,
  posted_at timestamptz,
  primary key (user_id, phase_id)
);

create table if not exists public.dsa_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_name text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  topic_tag text,
  url text,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_dsa_user on public.dsa_progress(user_id, completed, difficulty);

create table if not exists public.career_tracker (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text,
  application_status text not null default 'applied'
    check (application_status in ('wishlist','applied','screening','interviewing','offer','rejected','withdrawn')),
  interview_date timestamptz,
  offer boolean not null default false,
  resume_version text,
  notes text,
  applied_at timestamptz default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_career_user on public.career_tracker(user_id, application_status);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_goal_type text default 'hours' check (weekly_goal_type in ('hours','topics')),
  weekly_goal_value int default 20,
  theme text default 'system' check (theme in ('light','dark','system')),
  last_opened_page text,
  last_opened_phase text,
  last_expanded_accordion text[],
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.roadmap_metadata enable row level security;
alter table public.phases enable row level security;
alter table public.topics enable row level security;
alter table public.exit_ladder enable row level security;

alter table public.topic_progress enable row level security;
alter table public.topic_notes enable row level security;
alter table public.daily_logs enable row level security;
alter table public.project_progress enable row level security;
alter table public.build_in_public_status enable row level security;
alter table public.dsa_progress enable row level security;
alter table public.career_tracker enable row level security;
alter table public.user_settings enable row level security;

-- Static content: readable by any authenticated user, writable only via service role (admin import)
create policy "static read: roadmap_metadata" on public.roadmap_metadata for select to authenticated using (true);
create policy "static read: phases" on public.phases for select to authenticated using (true);
create policy "static read: topics" on public.topics for select to authenticated using (true);
create policy "static read: exit_ladder" on public.exit_ladder for select to authenticated using (true);

-- User tables: strict owner-only access
create policy "own rows: topic_progress" on public.topic_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: topic_notes" on public.topic_notes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: daily_logs" on public.daily_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: project_progress" on public.project_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: build_in_public_status" on public.build_in_public_status
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: dsa_progress" on public.dsa_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: career_tracker" on public.career_tracker
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows: user_settings" on public.user_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-create user_settings row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'topic_progress','daily_logs','project_progress',
    'dsa_progress','career_tracker','user_settings'
  ] loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I; ' ||
      'create trigger trg_set_updated_at before update on public.%I ' ||
      'for each row execute procedure public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

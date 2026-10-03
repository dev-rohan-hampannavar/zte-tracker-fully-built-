-- Execution OS: lightweight user-owned planning, proof, and runway tables.
-- These are additive and intentionally separate from roadmap source tables.

create table if not exists public.weekly_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  domain text not null default 'engineering' check (domain in ('engineering','project','dsa','career','operations')),
  status text not null default 'pending' check (status in ('pending','completed','skipped')),
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start, title)
);

create index if not exists idx_weekly_commitments_user_week on public.weekly_commitments(user_id, week_start desc);
alter table public.weekly_commitments enable row level security;
drop policy if exists "own rows: weekly_commitments" on public.weekly_commitments;
create policy "own rows: weekly_commitments" on public.weekly_commitments
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_weekly_commitments_updated_at on public.weekly_commitments;
create trigger set_weekly_commitments_updated_at before update on public.weekly_commitments
  for each row execute function public.set_updated_at();

create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  block_type text not null default 'engineering' check (block_type in ('engineering','project','dsa','career','operations','rest')),
  status text not null default 'planned' check (status in ('planned','completed','skipped')),
  topic_id text references public.topics(id) on delete set null,
  phase_id text references public.phases(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_time_blocks_user_date on public.time_blocks(user_id, block_date, start_time);
alter table public.time_blocks enable row level security;
drop policy if exists "own rows: time_blocks" on public.time_blocks;
create policy "own rows: time_blocks" on public.time_blocks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_time_blocks_updated_at on public.time_blocks;
create trigger set_time_blocks_updated_at before update on public.time_blocks
  for each row execute function public.set_updated_at();

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  evidence_type text not null default 'other' check (evidence_type in ('github','deployment','certificate','screenshot','interview','resume','other')),
  url text,
  description text,
  tags text[] not null default '{}',
  topic_id text references public.topics(id) on delete set null,
  phase_id text references public.phases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (url is null or url ~* '^https?://')
);

create index if not exists idx_evidence_items_user_created on public.evidence_items(user_id, created_at desc);
alter table public.evidence_items enable row level security;
drop policy if exists "own rows: evidence_items" on public.evidence_items;
create policy "own rows: evidence_items" on public.evidence_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_evidence_items_updated_at on public.evidence_items;
create trigger set_evidence_items_updated_at before update on public.evidence_items
  for each row execute function public.set_updated_at();

create table if not exists public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric(12,2) not null default 0 check (monthly_income >= 0),
  monthly_expenses numeric(12,2) not null default 0 check (monthly_expenses >= 0),
  savings numeric(12,2) not null default 0 check (savings >= 0),
  emergency_months numeric(4,1) not null default 6 check (emergency_months between 0 and 36),
  minimum_switch_salary numeric(12,2) not null default 0 check (minimum_switch_salary >= 0),
  updated_at timestamptz not null default now()
);

alter table public.financial_profiles enable row level security;
drop policy if exists "own rows: financial_profiles" on public.financial_profiles;
create policy "own rows: financial_profiles" on public.financial_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_financial_profiles_updated_at on public.financial_profiles;
create trigger set_financial_profiles_updated_at before update on public.financial_profiles
  for each row execute function public.set_updated_at();
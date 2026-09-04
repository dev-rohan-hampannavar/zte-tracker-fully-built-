-- ============================================================================
-- ZTE Tracker — P7.0 Schema Expansion
-- Adds Part I of roadmap.md (Orientation, Why This Works, Roadmap Dashboards,
-- Navigation Layers, Timeline & Pacing Views) — the section the original
-- parser never processed. Unblocks the Reference page and full Onboarding.
-- Additive only — does not alter or drop any existing table.
-- ============================================================================

-- ---------- ORIENTATION (single-row prose + small structured lists) ----------
create table if not exists public.orientation (
  id int primary key default 1,
  overview text,
  who_is_this_for jsonb not null default '[]'::jsonb,       -- [{category, details}]
  key_note text,
  job_market_case text,
  build_in_public_guide text,
  quick_start_checklist jsonb not null default '[]'::jsonb, -- [{step, text}]
  critical_advice text,
  weekly_pace_options jsonb not null default '[]'::jsonb,   -- [{weekly_hours, timeline, best_fit}]
  phase_summaries jsonb not null default '[]'::jsonb,       -- [{phase_title, weeks, tech}]
  decision_matrix jsonb not null default '[]'::jsonb,       -- [{if_you_want, build_this}]
  decision_rule text,
  updated_at timestamptz not null default now(),
  constraint orientation_single_row check (id = 1)
);

-- ---------- WHY THIS WORKS (failure-mode -> mechanism table) ----------
create table if not exists public.why_this_works (
  id uuid primary key default uuid_generate_v4(),
  failure_mode text not null,
  mechanism text not null,
  order_index int not null default 0
);

-- ---------- MASTER PHASE TABLE (Part III dashboard — all 21 phases at a glance) ----------
create table if not exists public.master_phase_table (
  phase text primary key,               -- '01', '01b', '06b', ...
  focus text not null,
  weeks text,
  header_hours text,
  realistic_hours text,
  band text,
  track text,
  order_index int not null default 0
);

-- ---------- HOURS BREAKDOWN (Learn/Problems/Project/ClientSync per phase) ----------
create table if not exists public.hours_breakdown (
  phase text primary key references public.master_phase_table(phase) on delete cascade,
  learn text,
  problems text,
  project text,
  clientsync text,
  realistic_total text,
  order_index int not null default 0
);

-- ---------- PROGRAM TOTAL (single-row rollup of the hours recalculation) ----------
create table if not exists public.program_total (
  id int primary key default 1,
  original_stated text,
  raw_bottom_up_sum text,
  realistic_total text,
  net_change text,
  constraint program_total_single_row check (id = 1)
);

-- ---------- DIFFICULTY RAMP (phase grouped by Foundation/Core/Advanced/Expert) ----------
create table if not exists public.difficulty_ramp (
  id uuid primary key default uuid_generate_v4(),
  band text not null,                   -- Foundation / Core / Advanced / Expert
  phase text not null,
  title text not null,
  order_index int not null default 0
);
create index if not exists idx_difficulty_ramp_band on public.difficulty_ramp(band, order_index);

-- ---------- SOURCE DISCREPANCIES (flagged header-vs-table hour mismatches) ----------
create table if not exists public.source_discrepancies (
  id uuid primary key default uuid_generate_v4(),
  phase text not null,
  discrepancy text not null,
  order_index int not null default 0
);

-- ---------- SKILL TRACKS (Navigation Layers — track -> phase list) ----------
create table if not exists public.skill_tracks (
  id uuid primary key default uuid_generate_v4(),
  track text not null unique,
  phases jsonb not null default '[]'::jsonb,  -- ['01','01b','02',...]
  order_index int not null default 0
);

-- ---------- NAVIGATION EXTRAS (DSA spine index prose + MVP fast-path lines) ----------
create table if not exists public.navigation_notes (
  id int primary key default 1,
  dsa_spine_index text,
  mvp_fast_path jsonb not null default '[]'::jsonb,  -- string[]
  constraint navigation_notes_single_row check (id = 1)
);

-- ---------- MONTH-BY-MONTH VIEW (Part V — pacing at 40 hrs/wk baseline) ----------
create table if not exists public.month_by_month (
  id uuid primary key default uuid_generate_v4(),
  month text not null,                  -- '1', '1–2', ...
  phases_active text not null,
  focus text not null,
  realistic_hours text,
  order_index int not null default 0
);

-- ---------- PHASE CHECKLIST (Part V tick sheet — one row per phase) ----------
create table if not exists public.phase_checklist (
  phase text primary key,
  title text not null,
  hours text,
  weeks text,
  order_index int not null default 0
);

-- ============================================================================
-- ROADMAP METADATA: extra rollup columns for Part I coverage (additive)
-- ============================================================================
alter table public.roadmap_metadata
  add column if not exists part1_parsed boolean not null default false,
  add column if not exists quick_start_checklist_items int,
  add column if not exists why_this_works_rows int,
  add column if not exists master_phase_table_rows int,
  add column if not exists skill_track_count int;

-- ============================================================================
-- ROW LEVEL SECURITY (static content — read-only for authenticated users)
-- ============================================================================
alter table public.orientation enable row level security;
alter table public.why_this_works enable row level security;
alter table public.master_phase_table enable row level security;
alter table public.hours_breakdown enable row level security;
alter table public.program_total enable row level security;
alter table public.difficulty_ramp enable row level security;
alter table public.source_discrepancies enable row level security;
alter table public.skill_tracks enable row level security;
alter table public.navigation_notes enable row level security;
alter table public.month_by_month enable row level security;
alter table public.phase_checklist enable row level security;

create policy "static read: orientation" on public.orientation for select to authenticated using (true);
create policy "static read: why_this_works" on public.why_this_works for select to authenticated using (true);
create policy "static read: master_phase_table" on public.master_phase_table for select to authenticated using (true);
create policy "static read: hours_breakdown" on public.hours_breakdown for select to authenticated using (true);
create policy "static read: program_total" on public.program_total for select to authenticated using (true);
create policy "static read: difficulty_ramp" on public.difficulty_ramp for select to authenticated using (true);
create policy "static read: source_discrepancies" on public.source_discrepancies for select to authenticated using (true);
create policy "static read: skill_tracks" on public.skill_tracks for select to authenticated using (true);
create policy "static read: navigation_notes" on public.navigation_notes for select to authenticated using (true);
create policy "static read: month_by_month" on public.month_by_month for select to authenticated using (true);
create policy "static read: phase_checklist" on public.phase_checklist for select to authenticated using (true);

-- Onboarding (welcome page) reads this before auth exists — allow anon read too,
-- same pattern as any other pre-auth marketing content would need.
create policy "anon read: orientation" on public.orientation for select to anon using (true);
create policy "anon read: why_this_works" on public.why_this_works for select to anon using (true);
create policy "anon read: master_phase_table" on public.master_phase_table for select to anon using (true);
create policy "anon read: navigation_notes" on public.navigation_notes for select to anon using (true);

-- ============================================================================
-- ZTE Tracker — Stage 1 / Item 17: Progress Axes
--
-- The Statistics page's axis list (Learning, DSA, Revision, ClientSync,
-- Projects) is missing Exercises, Portfolio, and Build-in-Public per item
-- 17's spec. Portfolio and Build-in-Public already have real backing data
-- (project_progress / capstones, build_in_public_status respectively) — no
-- new schema needed there. Exercises has no per-user completion tracking
-- anywhere, though: stage_exercises is static content only. This adds the
-- missing per-user completion table, same shape as topic_progress/dsa_progress.
-- ============================================================================

create table if not exists public.exercise_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null references public.stage_exercises(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_progress enable row level security;

create policy "own rows: exercise_progress" on public.exercise_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_set_updated_at on public.exercise_progress;
create trigger trg_set_updated_at before update on public.exercise_progress
  for each row execute procedure public.set_updated_at();

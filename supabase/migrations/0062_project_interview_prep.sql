-- Spec section 32: "Project-Based Interview Preparation" — deterministic
-- prompts generated from a project's own metadata (architecture,
-- technologies, trade-offs, etc.), with the person able to answer, save
-- answers, and track practice history. Explicitly NOT AI-generated per
-- the spec.
--
-- interview_questions (0034) is shared, curated, admin-seeded reference
-- content — its RLS policy is select-only for every authenticated user,
-- with no insert policy at all, by design (same pattern as
-- technologies/target_roles). Project-based questions are the opposite:
-- generated from ONE person's own project data, so they belong in a
-- separate, genuinely per-user table, not squeezed into the shared bank
-- (which would either fail the existing RLS, or if an insert policy were
-- added, leak one user's project-specific questions into every other
-- user's shared question list — a real cross-user data leak, not a
-- hypothetical one).
--
-- Mirrors interview_questions/interview_attempts' shape deliberately (same
-- category/difficulty/result vocabulary) so the UI can reuse the same
-- practice-history rendering logic, just pointed at a different table.

create table if not exists public.project_interview_questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id text references public.phases(id) on delete set null,
  advanced_project_id text references public.advanced_projects(id) on delete set null,
  category text not null check (category in ('architecture', 'backend', 'performance', 'security', 'testing', 'tradeoffs')),
  question text not null,
  -- The deterministic template this was generated from, and the project
  -- field it was filled in from — kept for transparency (a person can see
  -- why a question was generated) and so regenerating doesn't duplicate
  -- the same question if the underlying project data hasn't changed.
  source_field text,
  created_at timestamptz not null default now(),
  check (phase_id is not null or advanced_project_id is not null)
);
create index if not exists idx_project_interview_questions_user on public.project_interview_questions(user_id);

alter table public.project_interview_questions enable row level security;
create policy "own rows: project_interview_questions" on public.project_interview_questions
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (phase_id is null or exists (select 1 from public.project_progress pp where pp.phase_id = project_interview_questions.phase_id and pp.user_id = auth.uid()))
    and (advanced_project_id is null or exists (select 1 from public.advanced_project_progress app where app.project_id = project_interview_questions.advanced_project_id and app.user_id = auth.uid()))
  );

create table if not exists public.project_interview_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.project_interview_questions(id) on delete cascade,
  result text not null check (result in ('correct', 'partial', 'incorrect')),
  -- The person's saved answer — spec explicitly asks for "answer
  -- questions, save answers, practice repeatedly, track practice
  -- history", same field name/role as interview_attempts.notes.
  notes text,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_project_interview_attempts_user on public.project_interview_attempts(user_id, attempted_at desc);
create index if not exists idx_project_interview_attempts_question on public.project_interview_attempts(question_id);

alter table public.project_interview_attempts enable row level security;
create policy "own rows: project_interview_attempts" on public.project_interview_attempts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

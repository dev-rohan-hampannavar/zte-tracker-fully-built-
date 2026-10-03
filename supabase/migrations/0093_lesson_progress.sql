-- Progress for the shared-workspace lessons. One row per completed lesson per
-- user, with the quiz score at completion. Lesson content itself ships with
-- the app, so this table holds only the learner's own progress.

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 120),
  quiz_correct int not null default 0 check (quiz_correct >= 0),
  quiz_total int not null default 0 check (quiz_total >= 0 and quiz_correct <= quiz_total),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own" on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete to authenticated using (user_id = auth.uid());

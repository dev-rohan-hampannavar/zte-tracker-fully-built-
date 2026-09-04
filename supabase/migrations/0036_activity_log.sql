-- ============================================================================
-- PHASE 8b of the Career OS build: Activity History / Undo.
--
-- Design choice: activity_log is populated by explicit calls from the
-- application layer at each meaningful action's existing write path
-- (e.g. right where completeMilestone() or deleteCareerEntry() already
-- run), NOT by blanket AFTER triggers on every table. A trigger-based
-- approach would be more "complete" in theory, but retrofitting triggers
-- onto ~20 existing tables in one migration risks silently breaking an
-- existing write path (e.g. a bulk upsert during import suddenly logging
-- hundreds of rows, or a trigger referencing a column that gets renamed
-- later) — exactly the kind of blind, sweeping change the master prompt's
-- own rules warn against ("do not rewrite functioning systems
-- unnecessarily"). Explicit calls at meaningful, user-initiated actions
-- are slower to build out fully but can never accidentally corrupt an
-- unrelated write path.
--
-- undo_payload stores enough of the pre-change row to reverse the action
-- via the SAME upsert/delete helpers the app already uses (not a generic
-- row-level undo engine) — undo is therefore only offered for actions
-- where reversal is safe and well-defined (delete -> re-insert the same
-- row; status change -> revert the one column), matching the "support
-- undo for reversible actions" phrasing in the spec, not "support undo
-- for everything."
-- ============================================================================

create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'topic_completed', 'goal_created', 'goal_updated', 'goal_completed',
    'milestone_completed', 'project_started', 'project_completed',
    'task_deleted', 'application_created', 'application_status_changed',
    'application_deleted', 'interview_completed', 'skill_added',
    'skill_removed'
  )),
  entity_type text not null, -- e.g. 'goal', 'milestone', 'career_tracker'
  entity_id text not null,
  summary text not null, -- human-readable, e.g. "Completed milestone: Master TypeScript"
  undo_payload jsonb, -- null = not undoable
  undone boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_log_user on public.activity_log(user_id, created_at desc);

alter table public.activity_log enable row level security;
create policy "own rows: activity_log" on public.activity_log
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Fix reset_user_progress(): activity_log (Phase 8) is per-user history —
-- a reset should clear it so old activity doesn't reference progress rows
-- that no longer exist.
-- ----------------------------------------------------------------------------
create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.topic_progress where user_id = auth.uid();
  delete from public.daily_logs where user_id = auth.uid();
  delete from public.topic_notes where user_id = auth.uid();
  delete from public.project_progress where user_id = auth.uid();
  delete from public.dsa_progress where user_id = auth.uid();
  delete from public.career_tracker where user_id = auth.uid();
  delete from public.topic_resources where user_id = auth.uid();
  delete from public.advanced_project_progress where user_id = auth.uid();
  delete from public.exercise_progress where user_id = auth.uid();
  delete from public.build_in_public_status where user_id = auth.uid();
  delete from public.manual_item_checks where user_id = auth.uid();
  delete from public.public_streak_summary where user_id = auth.uid();
  delete from public.study_sessions where user_id = auth.uid();
  delete from public.focus_sessions where user_id = auth.uid();
  delete from public.milestones where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.interview_rounds where user_id = auth.uid();
  delete from public.user_skills where user_id = auth.uid();
  delete from public.project_skills where user_id = auth.uid();
  delete from public.interview_attempts where user_id = auth.uid();
  delete from public.notification_dismissals where user_id = auth.uid();
  delete from public.activity_log where user_id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;

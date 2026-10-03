-- ============================================================================
-- 0039_activity_log_dsa_revision.sql
--
-- Gap fix (Phase 18): activity_log's action check constraint never
-- included a DSA or revision action, so those two write paths (marking a
-- DSA problem solved, completing a spaced-repetition review) could never
-- be logged even after client-side calls were added. Every other
-- meaningful action from the master spec's Phase 18 list already had a
-- constraint value (topic_completed, project_completed,
-- interview_completed, etc.) — this was specifically missed, not a
-- deliberate omission.
--
-- Naming follows the existing convention exactly (past-tense, snake_case,
-- <entity>_<verb>) rather than inventing a different style.
-- ============================================================================

alter table public.activity_log drop constraint if exists activity_log_action_check;

alter table public.activity_log add constraint activity_log_action_check
  check (action in (
    'topic_completed', 'goal_created', 'goal_updated', 'goal_completed',
    'milestone_completed', 'project_started', 'project_completed',
    'task_deleted', 'application_created', 'application_status_changed',
    'application_deleted', 'interview_completed', 'skill_added',
    'skill_removed', 'dsa_problem_solved', 'revision_completed'
  ));

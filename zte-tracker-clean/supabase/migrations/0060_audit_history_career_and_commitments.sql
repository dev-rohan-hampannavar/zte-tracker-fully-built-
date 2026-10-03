-- Spec section 27 (Audit History) explicitly names "career target changes"
-- and "weekly commitment changes" as things that should be logged, along
-- with goal/milestone/profile changes. Goal and milestone changes were
-- already covered by activity_log (0036); career target changes
-- (saveCareerPlanSettings in use-career-plan.ts, which updates
-- user_settings.career_plan_track) and weekly commitment creation
-- (createWeeklyCommitment in use-execution-os.ts) were not logged
-- anywhere at all.
--
-- Following 0036's own documented design choice: explicit logActivity()
-- calls added at the specific existing write paths that matter, not a
-- blanket trigger on user_settings/weekly_commitments (which would also
-- fire on every unrelated settings field, like theme or last_opened_page,
-- producing noise rather than a meaningful history).

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'activity_log'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%topic_completed%';

  if v_constraint_name is not null then
    execute format('alter table public.activity_log drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.activity_log add constraint activity_log_action_check
  check (action in (
    'topic_completed', 'goal_created', 'goal_updated', 'goal_completed',
    'milestone_completed', 'project_started', 'project_completed',
    'task_deleted', 'application_created', 'application_status_changed',
    'application_deleted', 'interview_completed', 'skill_added',
    'skill_removed', 'dsa_problem_solved', 'revision_completed',
    'career_target_changed', 'weekly_commitment_created'
  ));

-- reset_user_progress (most recently redefined in 0054) needs to clear
-- the two new tables added in 0062 (project_interview_questions,
-- project_interview_attempts) — otherwise a user resetting their progress
-- would still see project-based interview questions/practice history for
-- projects that no longer have any progress, which is exactly the kind of
-- state-drift the master spec's correctness rules (section 3: "verify
-- backup restoration", and generally never showing stale data) exist to
-- prevent. Following this function's own established pattern: extend the
-- existing definition with create or replace, don't touch anything else
-- it already does.

create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required'; end if;
  delete from public.daily_plan_task_state where user_id = caller;
  delete from public.milestone_dependencies where milestone_id in (select id from public.milestones where user_id = caller)
    or depends_on_milestone_id in (select id from public.milestones where user_id = caller);
  delete from public.project_interview_attempts where user_id = caller;
  delete from public.project_interview_questions where user_id = caller;
  delete from public.interview_attempts where user_id = caller;
  delete from public.interview_rounds where user_id = caller;
  delete from public.revision_history where user_id = caller;
  delete from public.activity_log where user_id = caller;
  delete from public.notification_dismissals where user_id = caller;
  delete from public.career_decisions where user_id = caller;
  delete from public.project_skills where user_id = caller;
  delete from public.user_skills where user_id = caller;
  delete from public.milestones where user_id = caller;
  delete from public.goals where user_id = caller;
  delete from public.topic_progress where user_id = caller;
  delete from public.daily_logs where user_id = caller;
  delete from public.topic_notes where user_id = caller;
  delete from public.topic_resources where user_id = caller;
  delete from public.project_progress where user_id = caller;
  delete from public.advanced_project_progress where user_id = caller;
  delete from public.dsa_progress where user_id = caller;
  delete from public.career_tracker where user_id = caller;
  delete from public.exercise_progress where user_id = caller;
  delete from public.build_in_public_status where user_id = caller;
  delete from public.manual_item_checks where user_id = caller;
  delete from public.public_streak_summary where user_id = caller;
  delete from public.focus_sessions where user_id = caller;
  delete from public.study_sessions where user_id = caller;
  delete from public.weekly_commitments where user_id = caller;
  delete from public.time_blocks where user_id = caller;
  delete from public.evidence_items where user_id = caller;
  delete from public.study_events where user_id = caller;
end;
$$;
revoke all on function public.reset_user_progress() from public, anon;
grant execute on function public.reset_user_progress() to authenticated;

-- Canonical RESET_ALL_PROGRESS registry. Identity and user_settings are
-- intentionally preserved; every user-owned progress/history table is
-- cleared in dependency-safe order inside one transaction.
create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required'; end if;

  delete from public.daily_plan_task_state where user_id = caller;
  delete from public.milestone_dependencies where milestone_id in (select id from public.milestones where user_id = caller)
    or depends_on_milestone_id in (select id from public.milestones where user_id = caller);
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
end;
$$;

revoke all on function public.reset_user_progress() from public, anon;
grant execute on function public.reset_user_progress() to authenticated;

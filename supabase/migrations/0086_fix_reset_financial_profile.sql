-- Fix reset_user_progress(): financial_profiles (added in 0052_execution_os)
-- was never added to the reset registry, even though it is per-user personal
-- data in the same category as career_tracker and evidence_items, which
-- already are cleared. Settings already treats it as reset-domain data —
-- handleResetProgress() in settings/page.tsx calls mutateFinancialProfile()
-- alongside the other reset mutators, and it's part of the export/import
-- (backup) round-trip via use-career-merge.ts / use-execution-os.ts — so
-- "Reset progress" was silently leaving salary/savings/expense figures
-- behind while the UI implied a complete reset had happened.
--
-- financial_profiles has user_id as its primary key (not a separate id
-- column), so this deletes the single row rather than filtering a set —
-- same shape as the user_settings-adjacent singleton tables, but this one
-- IS progress/personal data (unlike user_settings, which reset deliberately
-- leaves alone) and belongs in the reset registry.
create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required'; end if;
  delete from public.user_roadmap_project_progress where user_id = caller;
  delete from public.user_roadmap_topic_progress where user_id = caller;
  delete from public.roadmap_topic_notes where user_id = caller;
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
  delete from public.financial_profiles where user_id = caller;
end;
$$;

revoke all on function public.reset_user_progress() from public, anon;
grant execute on function public.reset_user_progress() to authenticated;

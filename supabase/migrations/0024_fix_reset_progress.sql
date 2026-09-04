-- Fixes public.reset_user_progress: tables added since 0017
-- (manual_item_checks, public_streak_summary) were per-user progress data
-- that "Reset progress" should wipe but didn't. create or replace is safe
-- to run whether or not 0017 succeeded originally — this becomes the
-- authoritative definition either way.
--
-- topic_day_map is deliberately NOT included: it's the same kind of
-- reference/config data user_settings already is (topic-to-manual-day
-- mapping), not progress, so a reset shouldn't touch it.
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
end;
$$;

-- Re-affirm grants in case 0017 partially failed before reaching this line
-- (e.g. if a table referenced there didn't exist yet in some environments).
-- delete_own_account itself is also re-created here (not just granted) —
-- confirmed missing entirely in at least one deployed environment, so
-- 0017 must have failed partway through in that case, before ever
-- reaching this function's own create statement.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

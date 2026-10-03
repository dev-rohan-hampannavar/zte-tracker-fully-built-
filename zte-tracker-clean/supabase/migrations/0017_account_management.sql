-- ============================================================================
-- Settings — Reset progress / Delete account
-- Two destructive, user-initiated actions the Settings page didn't expose
-- yet. Both are callable only by the signed-in user against their own
-- auth.uid() (never take a uid parameter) so no policy is needed for
-- someone to affect another user's data.
-- ============================================================================

-- Reset progress: wipes every row this user owns in every progress/log
-- table (mirrors the domain list Settings already exports/imports:
-- topic_progress, daily_logs, topic_notes, project_progress, dsa_progress,
-- career_tracker) plus the tables added since (topic_resources,
-- advanced_project_progress, exercise_progress, build_in_public_status).
-- Deliberately does NOT touch user_settings — theme, goal, developer mode,
-- and public-profile config are preferences, not progress, and resetting
-- progress shouldn't silently sign them out of their own preferences too.
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
end;
$$;

-- Delete account: every user-owned table references auth.users(id)
-- on delete cascade (checked across all migrations), so deleting the
-- auth.users row alone cascades through everything — this function
-- doesn't need to enumerate tables the way reset_user_progress does.
-- Deleting from auth.users requires elevated privilege the calling
-- (anon/authenticated) role doesn't have; security definer runs this
-- as the function owner instead, which is why this one function is
-- the only place that privilege is exercised, and why it takes no
-- parameters — it only ever deletes auth.uid(), never an arbitrary id.
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

-- User-scoped views must evaluate underlying RLS policies as the caller.
-- Without security_invoker, a view owner can accidentally bypass those
-- policies and return another user's aggregate rows through PostgREST.
alter view public.goal_progress set (security_invoker = true);
alter view public.application_metrics set (security_invoker = true);
alter view public.application_metrics_by_plan set (security_invoker = true);
alter view public.skill_evidence set (security_invoker = true);
alter view public.skill_freshness set (security_invoker = true);
alter view public.interview_weaknesses set (security_invoker = true);
alter view public.interview_readiness_by_role set (security_invoker = true);

-- Calendar-day calculations use the user's persisted IANA timezone instead
-- of treating UTC midnight as everybody's local midnight.
alter table public.user_settings
  add column if not exists timezone text not null default 'UTC';

create or replace function public.complete_focus_session(
  p_focus_session_id uuid,
  p_final_elapsed_seconds int,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_hours numeric(5,2);
  v_study_session_id uuid;
  v_date date;
  v_timezone text := 'UTC';
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.focus_sessions
    where id = p_focus_session_id and user_id = auth.uid() and status in ('running', 'paused');
  if v_session is null then
    raise exception 'focus session not found, not owned by caller, or already finished';
  end if;

  select coalesce(timezone, 'UTC') into v_timezone from public.user_settings where user_id = auth.uid();
  if not exists (select 1 from pg_timezone_names where name = v_timezone) then v_timezone := 'UTC'; end if;
  v_hours := round(greatest(coalesce(p_final_elapsed_seconds, 0), 0) / 3600.0, 2);
  v_date := (now() at time zone v_timezone)::date;

  update public.focus_sessions
    set status = 'completed', elapsed_seconds = greatest(coalesce(p_final_elapsed_seconds, 0), 0),
        ended_at = now(), notes = coalesce(p_note, notes), updated_at = now()
    where id = p_focus_session_id;

  if v_hours > 0 then
    insert into public.study_sessions (user_id, date, hours, activity, topic_id, stage_project_id, notes, goal_id, milestone_id)
    values (auth.uid(), v_date, v_hours, v_session.activity, v_session.topic_id, v_session.stage_project_id, p_note, v_session.goal_id, v_session.milestone_id)
    returning id into v_study_session_id;
    update public.focus_sessions set logged_study_session_id = v_study_session_id where id = p_focus_session_id;
    perform public.log_study_session_hours(v_date, v_hours, null);
  end if;
  return v_study_session_id;
end;
$$;

revoke all on function public.complete_focus_session(uuid, int, text) from public, anon;
grant execute on function public.complete_focus_session(uuid, int, text) to authenticated;

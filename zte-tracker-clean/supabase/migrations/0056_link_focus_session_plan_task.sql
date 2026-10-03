-- Fixes a real task-state/timer-state desync (master spec P0: "Make timer
-- state and task state consistent"): starting a focus session from a
-- /daily-plan task row had no way to link back to that row, so finishing
-- the timer from the dashboard FocusTimer left the plan task stuck at
-- 'pending' forever unless the person separately clicked "Mark done" on
-- /daily-plan. focus_sessions had no column recording which plan task (if
-- any) it was started for.
--
-- plan_task_key mirrors the column already on study_events (0054) and
-- daily_plan_task_state (0040) — the same client-computed composite key
-- (`${kind}:${naturalKey}`), so no new identity scheme is introduced.

alter table public.focus_sessions add column if not exists plan_task_key text;

-- complete_focus_session (0054's version) is extended, not replaced from
-- scratch, to keep doing exactly what it already does (write study_sessions,
-- call record_study_activity) and additionally complete the linked plan
-- task in the same atomic statement when one is present. This mirrors
-- complete_daily_plan_task's own upsert shape so the plan row ends up
-- identical to what clicking "Mark done" on /daily-plan would have
-- produced, just triggered from the timer completing instead.
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
  caller uuid := auth.uid();
  v_session record;
  v_minutes integer;
  v_study_session_id uuid;
  v_date date;
  v_timezone text := 'UTC';
begin
  if caller is null then raise exception 'authentication required'; end if;
  select * into v_session from public.focus_sessions
    where id = p_focus_session_id and user_id = caller and status in ('running', 'paused');
  if v_session is null then raise exception 'focus session not found, not owned by caller, or already finished'; end if;
  select coalesce(timezone, 'UTC') into v_timezone from public.user_settings where user_id = caller;
  if not exists (select 1 from pg_timezone_names where name = v_timezone) then v_timezone := 'UTC'; end if;
  v_minutes := least(greatest(round(coalesce(p_final_elapsed_seconds, 0) / 60.0), 0), 1440)::integer;
  v_date := (now() at time zone v_timezone)::date;

  update public.focus_sessions
    set status = 'completed', elapsed_seconds = greatest(coalesce(p_final_elapsed_seconds, 0), 0),
        ended_at = now(), notes = coalesce(p_note, notes), updated_at = now()
    where id = p_focus_session_id;

  if v_minutes > 0 then
    insert into public.study_sessions (user_id, date, hours, activity, topic_id, stage_project_id, notes, goal_id, milestone_id)
    values (caller, v_date, round(v_minutes / 60.0, 2), v_session.activity, v_session.topic_id, v_session.stage_project_id, p_note, v_session.goal_id, v_session.milestone_id)
    returning id into v_study_session_id;
    update public.focus_sessions set logged_study_session_id = v_study_session_id where id = p_focus_session_id;
    perform public.record_study_activity(
      v_minutes, v_session.activity, v_session.topic_id, v_session.stage_project_id,
      null, 'FOCUS_TIMER', now(), v_date, v_session.plan_task_key,
      jsonb_build_object('focus_session_id', p_focus_session_id, 'study_session_id', v_study_session_id), p_note
    );
  end if;

  -- Complete the linked plan task, if any, in the same transaction as the
  -- timer completion — this is the actual fix. Uses ON CONFLICT rather
  -- than requiring the row to already exist, because a task started via
  -- PlanTaskRow's handleStart now writes a 'pending'->'in_progress' row
  -- first (markDailyPlanTaskStarted), but that write and this one are
  -- separate client round-trips; if the started-row write raced or was
  -- missed for any reason, this still lands a correct completed row
  -- instead of silently no-op'ing. kind is inferred from plan_task_key's
  -- own `${kind}:` prefix so this function doesn't need it passed in.
  if v_session.plan_task_key is not null
     and split_part(v_session.plan_task_key, ':', 1) in
         ('goal_deadline', 'weak_skill', 'revision', 'project', 'interview_prep', 'learning') then
    insert into public.daily_plan_task_state (
      user_id, plan_date, task_key, kind, title, status,
      estimated_minutes, actual_minutes, study_session_id,
      started_at, completed_at
    )
    values (
      caller, v_date, v_session.plan_task_key,
      split_part(v_session.plan_task_key, ':', 1),
      -- Title is only known if a row already exists (from
      -- markDailyPlanTaskStarted); fall back to the task_key itself
      -- rather than leaving it null, since title is not-null.
      coalesce(
        (select title from public.daily_plan_task_state
           where user_id = caller and plan_date = v_date and task_key = v_session.plan_task_key),
        v_session.plan_task_key
      ),
      'completed', v_minutes, v_minutes, v_study_session_id, now(), now()
    )
    on conflict (user_id, plan_date, task_key) do update
      set status = 'completed',
          actual_minutes = coalesce(excluded.actual_minutes, public.daily_plan_task_state.actual_minutes),
          study_session_id = coalesce(excluded.study_session_id, public.daily_plan_task_state.study_session_id),
          completed_at = now(), updated_at = now();
  end if;

  return v_study_session_id;
end;
$$;
revoke all on function public.complete_focus_session(uuid, int, text) from public, anon;
grant execute on function public.complete_focus_session(uuid, int, text) to authenticated;

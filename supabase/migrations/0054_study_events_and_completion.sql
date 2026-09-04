-- Canonical execution events and server-authorized topic completion.
-- Existing daily_logs/study_sessions remain compatibility projections; every
-- new activity is also represented once in study_events.

create table if not exists public.study_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_date date not null,
  timezone text not null default 'UTC',
  duration_minutes integer not null check (duration_minutes between 0 and 1440),
  activity_type text not null default 'learn' check (activity_type in ('learn','practice','project','revision','dsa','other')),
  topic_id text references public.topics(id) on delete set null,
  stage_project_id text references public.stage_projects(id) on delete set null,
  dsa_problem_id uuid references public.dsa_progress(id) on delete set null,
  plan_task_key text,
  source text not null default 'MANUAL' check (source in ('MANUAL','FOCUS_TIMER','DAILY_PLAN','IMPORT','SYSTEM')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_events_user_date on public.study_events(user_id, event_date desc);
create index if not exists idx_study_events_user_occurred on public.study_events(user_id, occurred_at desc);
create index if not exists idx_study_events_topic on public.study_events(user_id, topic_id) where topic_id is not null;

alter table public.study_events enable row level security;
drop policy if exists "own rows: study_events" on public.study_events;
create policy "own rows: study_events" on public.study_events
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (dsa_problem_id is null or exists (
      select 1 from public.dsa_progress d where d.id = dsa_problem_id and d.user_id = auth.uid()
    ))
  );

-- One transaction for the event and its compatibility daily total. The
-- caller supplies a local calendar date only when importing historical data;
-- normal calls derive it from the user's persisted IANA timezone.
create or replace function public.record_study_activity(
  p_duration_minutes integer,
  p_activity_type text default 'learn',
  p_topic_id text default null,
  p_stage_project_id text default null,
  p_dsa_problem_id uuid default null,
  p_source text default 'MANUAL',
  p_occurred_at timestamptz default now(),
  p_event_date date default null,
  p_plan_task_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  v_timezone text := 'UTC';
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
  v_event_date date;
  v_event_id uuid;
begin
  if caller is null then raise exception 'authentication required'; end if;
  if coalesce(p_duration_minutes, 0) < 0 or p_duration_minutes > 1440 then
    raise exception 'duration must be between 0 and 1440 minutes';
  end if;
  if p_activity_type not in ('learn','practice','project','revision','dsa','other') then
    raise exception 'invalid activity type';
  end if;
  if p_source not in ('MANUAL','FOCUS_TIMER','DAILY_PLAN','IMPORT','SYSTEM') then
    raise exception 'invalid activity source';
  end if;
  if p_dsa_problem_id is not null and not exists (
    select 1 from public.dsa_progress where id = p_dsa_problem_id and user_id = caller
  ) then
    raise exception 'DSA problem is not owned by caller';
  end if;
  select coalesce(timezone, 'UTC') into v_timezone from public.user_settings where user_id = caller;
  if not exists (select 1 from pg_timezone_names where name = v_timezone) then v_timezone := 'UTC'; end if;
  v_event_date := coalesce(p_event_date, (v_occurred_at at time zone v_timezone)::date);

  insert into public.study_events (
    user_id, occurred_at, event_date, timezone, duration_minutes,
    activity_type, topic_id, stage_project_id, dsa_problem_id,
    plan_task_key, source, metadata
  ) values (
    caller, v_occurred_at, v_event_date, v_timezone, p_duration_minutes,
    coalesce(p_activity_type, 'learn'), p_topic_id, p_stage_project_id, p_dsa_problem_id,
    p_plan_task_key, coalesce(p_source, 'MANUAL'), coalesce(p_metadata, '{}'::jsonb) ||
      case when p_note is null then '{}'::jsonb else jsonb_build_object('note', p_note) end
  ) returning id into v_event_id;

  if p_duration_minutes > 0 then
    insert into public.daily_logs (user_id, date, hours, note, updated_at)
    values (caller, v_event_date, round(p_duration_minutes / 60.0, 2), p_note, now())
    on conflict (user_id, date) do update
      set hours = public.daily_logs.hours + excluded.hours,
          note = case
            when public.daily_logs.note is null or public.daily_logs.note = '' then excluded.note
            when excluded.note is null or excluded.note = '' then public.daily_logs.note
            else public.daily_logs.note || ' · ' || excluded.note
          end,
          updated_at = now();
  end if;
  return v_event_id;
end;
$$;

revoke all on function public.record_study_activity(integer, text, text, text, uuid, text, timestamptz, date, text, jsonb, text) from public, anon;
grant execute on function public.record_study_activity(integer, text, text, text, uuid, text, timestamptz, date, text, jsonb, text) to authenticated;

-- Manual study-session entry uses the same transaction as the canonical
-- event, preserving the existing session-level history consumed by the UI.
create or replace function public.record_study_session(
  p_date date,
  p_hours numeric,
  p_activity text default 'learn',
  p_topic_id text default null,
  p_stage_project_id text default null,
  p_note text default null,
  p_is_tutorial boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  v_session_id uuid;
  v_minutes integer;
begin
  if caller is null then raise exception 'authentication required'; end if;
  if coalesce(p_hours, 0) < 0 or p_hours > 24 then raise exception 'hours must be between 0 and 24'; end if;
  if p_activity not in ('learn','practice','project','revision','dsa','other') then raise exception 'invalid activity type'; end if;
  v_minutes := round(greatest(coalesce(p_hours, 0), 0) * 60)::integer;
  insert into public.study_sessions (user_id, date, hours, activity, topic_id, stage_project_id, notes, is_tutorial)
  values (caller, coalesce(p_date, (now() at time zone 'UTC')::date), round(coalesce(p_hours, 0), 2), coalesce(p_activity, 'learn'), p_topic_id, p_stage_project_id, p_note, p_is_tutorial)
  returning id into v_session_id;
  perform public.record_study_activity(
    v_minutes, coalesce(p_activity, 'learn'), p_topic_id, p_stage_project_id,
    null, 'MANUAL', now(), coalesce(p_date, (now() at time zone 'UTC')::date), null,
    jsonb_build_object('study_session_id', v_session_id), p_note
  );
  return v_session_id;
end;
$$;
revoke all on function public.record_study_session(date, numeric, text, text, text, text, boolean) from public, anon;
grant execute on function public.record_study_session(date, numeric, text, text, text, text, boolean) to authenticated;

-- Preserve the existing manual logging API while routing new activity through
-- the canonical event function. This keeps older clients source-compatible.
create or replace function public.log_study_session_hours(p_date date, p_hours numeric, p_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform public.record_study_activity(
    greatest(round(coalesce(p_hours, 0) * 60), 0)::integer,
    'learn', null, null, null, 'MANUAL', now(), p_date, null, '{}'::jsonb, p_note
  );
end;
$$;
revoke all on function public.log_study_session_hours(date, numeric, text) from public, anon;
grant execute on function public.log_study_session_hours(date, numeric, text) to authenticated;

-- The completion workflow is now server-authorized. A trigger below prevents
-- direct authenticated table writes from changing completion state without
-- going through this function.
create or replace function public.set_topic_completion(
  p_topic_id text,
  p_completed boolean,
  p_completed_at timestamptz default null,
  p_next_review_due timestamptz default null,
  p_revision_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  v_completed_at timestamptz;
  v_next_review_due timestamptz;
  v_revision_status text;
  v_title text;
begin
  if caller is null then raise exception 'authentication required'; end if;
  select title into v_title from public.topics where id = p_topic_id;
  if v_title is null then raise exception 'topic not found'; end if;
  if p_completed then
    v_completed_at := coalesce(p_completed_at, now());
    v_next_review_due := coalesce(p_next_review_due, v_completed_at + interval '1 day');
    v_revision_status := coalesce(p_revision_status, 'needs_revision');
  else
    v_completed_at := null;
    v_next_review_due := null;
    v_revision_status := null;
  end if;

  perform set_config('zte.topic_completion_authorized', '1', true);
  insert into public.topic_progress (
    user_id, topic_id, completed, completed_at, next_review_due, revision_status
  ) values (caller, p_topic_id, p_completed, v_completed_at, v_next_review_due, v_revision_status)
  on conflict (user_id, topic_id) do update set
    completed = excluded.completed,
    completed_at = excluded.completed_at,
    next_review_due = excluded.next_review_due,
    revision_status = excluded.revision_status,
    updated_at = now();

  if p_completed then
    insert into public.activity_log (user_id, action, entity_type, entity_id, summary)
    values (caller, 'topic_completed', 'topic', p_topic_id, 'Completed topic: ' || v_title);
  end if;
end;
$$;

revoke all on function public.set_topic_completion(text, boolean, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.set_topic_completion(text, boolean, timestamptz, timestamptz, text) to authenticated;

create or replace function public.guard_topic_completion_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('zte.topic_completion_authorized', true), '') <> '1'
     and (tg_op = 'INSERT' and new.completed or tg_op = 'UPDATE' and new.completed is distinct from old.completed) then
    raise exception 'topic completion must use set_topic_completion()';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_topic_completion_mutation() from public, anon, authenticated;

drop trigger if exists guard_topic_completion on public.topic_progress;
create trigger guard_topic_completion
  before insert or update of completed on public.topic_progress
  for each row execute function public.guard_topic_completion_mutation();

-- Daily-plan completion can contribute canonical activity when it is not
-- already linked to a timed study session. Existing linked sessions remain
-- the source of their own event to avoid double counting.
create or replace function public.complete_daily_plan_task(
  p_plan_date date,
  p_task_key text,
  p_kind text,
  p_title text,
  p_estimated_minutes int,
  p_actual_minutes int default null,
  p_study_session_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.daily_plan_task_state (
    user_id, plan_date, task_key, kind, title, status,
    estimated_minutes, actual_minutes, study_session_id, notes,
    started_at, completed_at
  ) values (
    auth.uid(), p_plan_date, p_task_key, p_kind, p_title, 'completed',
    p_estimated_minutes, p_actual_minutes, p_study_session_id, p_notes,
    now(), now()
  ) on conflict (user_id, plan_date, task_key) do update set
    status = 'completed',
    actual_minutes = coalesce(excluded.actual_minutes, public.daily_plan_task_state.actual_minutes),
    study_session_id = coalesce(excluded.study_session_id, public.daily_plan_task_state.study_session_id),
    notes = coalesce(excluded.notes, public.daily_plan_task_state.notes),
    completed_at = now(), updated_at = now();

  if coalesce(p_actual_minutes, 0) > 0 and p_study_session_id is null then
    perform public.record_study_activity(
      least(p_actual_minutes, 1440), 'learn', null, null, null, 'DAILY_PLAN',
      now(), p_plan_date, p_task_key, '{}'::jsonb, p_notes
    );
  end if;
end;
$$;
revoke all on function public.complete_daily_plan_task(date, text, text, text, int, int, uuid, text) from public, anon;
grant execute on function public.complete_daily_plan_task(date, text, text, text, int, int, uuid, text) to authenticated;

-- Rebind the focus-timer transaction to the canonical event path while
-- retaining the historical study_sessions row consumed by existing screens.
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
      null, 'FOCUS_TIMER', now(), v_date, null,
      jsonb_build_object('focus_session_id', p_focus_session_id, 'study_session_id', v_study_session_id), p_note
    );
  end if;
  return v_study_session_id;
end;
$$;
revoke all on function public.complete_focus_session(uuid, int, text) from public, anon;
grant execute on function public.complete_focus_session(uuid, int, text) to authenticated;

-- Reset newly canonical events as part of progress, while preserving the
-- financial profile and identity/settings rows.
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

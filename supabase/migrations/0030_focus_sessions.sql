-- ============================================================================
-- PHASE 2 of the Career OS build: real time/focus tracking.
--
-- The codebase already has solid after-the-fact time logging
-- (study_sessions: "I did 45 min of X just now, log it") powering
-- streaks/heatmap/weekly stats via daily_logs. What's missing per the
-- master spec is a *live* timer: stopwatch/countdown/Pomodoro with
-- pause/resume and abandoned-session detection.
--
-- Rather than inventing a second, parallel "time tracking" data source
-- (which would fragment stats and violate the "one source of truth per
-- metric" rule), a focus_session is the live/interactive front-end for a
-- timer; when it finishes (or is stopped early with logged time), it
-- writes into study_sessions through the SAME log_study_session_hours /
-- study_sessions insert path already in use. daily_logs, streaks, and the
-- heatmap therefore pick it up automatically with zero changes.
--
-- focus_sessions itself only needs to persist enough to survive a page
-- reload mid-session and to support "abandoned session" detection (a
-- session left running/paused past a reasonable staleness window with no
-- completion). It is NOT a duplicate historical log — completed sessions
-- are the ones that get converted into a study_sessions row; the
-- focus_sessions row itself is kept as an audit trail of planned vs.
-- actual duration and abandonment, not as a second source of "how many
-- hours did I study."
-- ============================================================================

create table if not exists public.focus_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('stopwatch', 'countdown', 'pomodoro')),
  status text not null default 'running' check (status in ('running', 'paused', 'completed', 'abandoned')),
  planned_seconds int, -- null for stopwatch (open-ended)
  elapsed_seconds int not null default 0,
  activity text not null default 'learn' check (activity in ('learn', 'practice', 'project', 'revision', 'dsa', 'other')),
  goal_id uuid references public.goals(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  topic_id text references public.topics(id) on delete set null,
  stage_project_id text references public.stage_projects(id) on delete set null,
  notes text,
  started_at timestamptz not null default now(),
  last_resumed_at timestamptz not null default now(),
  ended_at timestamptz,
  -- the study_sessions row this became once completed, so a focus session
  -- can be traced forward to the hours it actually contributed
  logged_study_session_id uuid references public.study_sessions(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_focus_sessions_user_status on public.focus_sessions(user_id, status);

create trigger set_focus_sessions_updated_at
  before update on public.focus_sessions
  for each row execute function public.set_updated_at();

alter table public.focus_sessions enable row level security;
create policy "own rows: focus_sessions" on public.focus_sessions
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()))
    and (milestone_id is null or exists (select 1 from public.milestones m where m.id = milestone_id and m.user_id = auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- Extend study_sessions with an optional goal link, so time logged either
-- via a completed focus session or the existing manual "Log study time"
-- dialog can roll up into a goal's activity, without touching any existing
-- read path (column is nullable, additive only).
-- ----------------------------------------------------------------------------
alter table public.study_sessions add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.study_sessions add column if not exists milestone_id uuid references public.milestones(id) on delete set null;
create index if not exists idx_study_sessions_goal on public.study_sessions(goal_id) where goal_id is not null;

-- The goal_id/milestone_id columns just added are per-user private data
-- (unlike study_sessions' existing topic_id/stage_project_id, which
-- reference shared curriculum content and are safe under user_id alone).
-- 0026's original policy only checked user_id, which — now that this
-- table can reference another user's goal/milestone by id — needs the
-- same ownership check applied to focus_sessions and interview_rounds
-- above. Policies aren't altered in place in Postgres; drop and recreate.
drop policy if exists "own rows: study_sessions" on public.study_sessions;
create policy "own rows: study_sessions" on public.study_sessions
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()))
    and (milestone_id is null or exists (select 1 from public.milestones m where m.id = milestone_id and m.user_id = auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- Atomic completion: finishes a focus session AND logs the corresponding
-- study_sessions row AND bumps daily_logs hours, all in one statement, so
-- there's no window where a session shows "completed" but the hours
-- haven't landed yet (or vice versa). Mirrors log_study_session_hours
-- (0028) for the daily_logs increment specifically, called internally.
-- ----------------------------------------------------------------------------
create or replace function public.complete_focus_session(
  p_focus_session_id uuid,
  p_final_elapsed_seconds int,
  p_note text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_session record;
  v_hours numeric(5,2);
  v_study_session_id uuid;
  v_date date;
begin
  select * into v_session from public.focus_sessions
    where id = p_focus_session_id and user_id = auth.uid() and status in ('running', 'paused');

  if v_session is null then
    raise exception 'focus session not found, not owned by caller, or already finished';
  end if;

  v_hours := round(greatest(p_final_elapsed_seconds, 0) / 3600.0, 2);
  v_date := (now() at time zone 'utc')::date; -- caller's local date is passed via the note/UI layer if needed later; kept simple for v1

  update public.focus_sessions
    set status = 'completed',
        elapsed_seconds = p_final_elapsed_seconds,
        ended_at = now(),
        notes = coalesce(p_note, notes),
        updated_at = now()
    where id = p_focus_session_id;

  if v_hours > 0 then
    insert into public.study_sessions (user_id, date, hours, activity, topic_id, stage_project_id, notes, goal_id, milestone_id)
    values (auth.uid(), v_date, v_hours, v_session.activity, v_session.topic_id, v_session.stage_project_id, p_note, v_session.goal_id, v_session.milestone_id)
    returning id into v_study_session_id;

    update public.focus_sessions set logged_study_session_id = v_study_session_id where id = p_focus_session_id;

    -- Reuse the existing atomic daily_logs increment so streak/heatmap/
    -- weekly stats stay consistent with the manual logging path.
    perform public.log_study_session_hours(v_date, v_hours, null);
  end if;

  return v_study_session_id;
end;
$$;

grant execute on function public.complete_focus_session(uuid, int, text) to authenticated;

-- Marks any focus session left running/paused for over 4 hours as
-- abandoned, without logging fabricated hours for it. Called opportunistically
-- from the client on load (cheap, idempotent, scoped to the caller via RLS).
create or replace function public.abandon_stale_focus_sessions()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.focus_sessions
    set status = 'abandoned', ended_at = now(), updated_at = now()
    where user_id = auth.uid()
      and status in ('running', 'paused')
      and last_resumed_at < now() - interval '4 hours';
end;
$$;

grant execute on function public.abandon_stale_focus_sessions() to authenticated;

-- ============================================================================
-- PHASE 1 of the requested "Engineering Career Operating System" expansion:
-- Daily Operating System.
--
-- What already existed before this migration:
--   - generateDailyPlan() (src/lib/daily-planner.ts) — a pure function that
--     derives a *prioritized, ranked* task list from goals/skills/revision/
--     projects/interview-prep/roadmap data already loaded elsewhere. Nothing
--     wrong with it; it's the recommendation engine.
--   - focus_sessions (0030) + study_sessions (0026) + daily_logs (0001) —
--     a complete, atomic start/pause/resume/complete/discard time-tracking
--     stack already wired end to end (complete_focus_session() writes
--     study_sessions AND increments daily_logs in one statement).
--
-- What was missing: a generated PlanTask is a derived, in-memory-only
-- object — it has no row anywhere, so there was no way to know, once a
-- plan is generated for today, which of its tasks were actually done,
-- skipped, or left untouched — and therefore no way to build "unfinished
-- tasks from yesterday" or an end-of-day planned-vs-actual review.
--
-- This migration adds exactly that missing join point. It does NOT
-- duplicate time tracking (that stays in focus_sessions/study_sessions/
-- daily_logs) — it only tracks the outcome of a *plan slot* for a given
-- day, optionally pointing at the study_sessions row that fulfilled it.
--
-- A plan task doesn't have a stable database id (it's regenerated fresh
-- every render from live data), so it's identified by a deterministic
-- composite key the client computes from the same fields that make a task
-- what it is: kind + a natural key within that kind (topic id, skill/tech
-- name, company name, etc.) + the plan date. That's enough to recognize
-- "this is the same task slot as yesterday's revision-due task" without
-- needing the planner itself to persist anything.
-- ============================================================================

create table if not exists public.daily_plan_task_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  -- Deterministic client-computed key: `${kind}:${naturalKey}`, e.g.
  -- "revision:topic-123" or "weak_skill:react" or "goal_deadline:<goal-id>".
  task_key text not null,
  kind text not null check (kind in ('goal_deadline', 'weak_skill', 'revision', 'project', 'interview_prep', 'learning')),
  title text not null, -- snapshot of the task title at the time of action, for history/review even if the underlying data later changes
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  estimated_minutes int not null default 0,
  actual_minutes int, -- filled in on completion, from the linked focus/study session when available
  notes text,
  -- Optional link to the study_sessions row that fulfilled this task (via
  -- a completed focus session or a manual log against the same topic/
  -- project), so "what did I actually do" can be traced from the plan
  -- slot forward. Nullable: a task can be marked done without a formal
  -- session (e.g. an interview-prep task ticked off after reviewing notes
  -- offline).
  study_session_id uuid references public.study_sessions(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  -- Set when this row was carried forward from a prior day's unfinished
  -- task, pointing at the row it was carried from — lets the UI show
  -- "carried from yesterday" without re-deriving it by date math.
  carried_from_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date, task_key)
);

create index if not exists idx_daily_plan_task_state_user_date
  on public.daily_plan_task_state(user_id, plan_date);

-- Fast lookup of a user's most recent day with any unfinished (pending)
-- tasks, for computing "carried forward from yesterday" without scanning
-- every historical date.
create index if not exists idx_daily_plan_task_state_pending
  on public.daily_plan_task_state(user_id, plan_date)
  where status = 'pending';

create trigger set_daily_plan_task_state_updated_at
  before update on public.daily_plan_task_state
  for each row execute function public.set_updated_at();

alter table public.daily_plan_task_state enable row level security;

create policy "own rows: daily_plan_task_state" on public.daily_plan_task_state
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      study_session_id is null
      or exists (select 1 from public.study_sessions s where s.id = study_session_id and s.user_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- Atomic completion of a plan task. Mirrors complete_focus_session's
-- pattern: one statement, no read-modify-write race between two tabs
-- marking the same task done. If actual_minutes is provided without a
-- study_session_id (task ticked off without a formal timed session), no
-- study_sessions/daily_logs row is touched — this only ever records the
-- plan-slot outcome, never fabricates time-tracking data.
-- ----------------------------------------------------------------------------
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
  insert into public.daily_plan_task_state (
    user_id, plan_date, task_key, kind, title, status,
    estimated_minutes, actual_minutes, study_session_id, notes,
    started_at, completed_at
  )
  values (
    auth.uid(), p_plan_date, p_task_key, p_kind, p_title, 'completed',
    p_estimated_minutes, p_actual_minutes, p_study_session_id, p_notes,
    now(), now()
  )
  on conflict (user_id, plan_date, task_key) do update
    set status = 'completed',
        actual_minutes = coalesce(excluded.actual_minutes, public.daily_plan_task_state.actual_minutes),
        study_session_id = coalesce(excluded.study_session_id, public.daily_plan_task_state.study_session_id),
        notes = coalesce(excluded.notes, public.daily_plan_task_state.notes),
        completed_at = now(),
        updated_at = now();
end;
$$;

grant execute on function public.complete_daily_plan_task(date, text, text, text, int, int, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Carries every still-pending task from the most recent prior day (if any)
-- forward onto today, so a task not completed or skipped doesn't just
-- silently vanish when the plan regenerates. Idempotent: re-running for a
-- day that already has carried rows does nothing further for those keys
-- (on conflict do nothing), so it's safe to call opportunistically on
-- every dashboard/daily-plan load rather than needing a cron job.
-- ----------------------------------------------------------------------------
create or replace function public.carry_forward_daily_plan_tasks(p_today date)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_last_date date;
begin
  select max(plan_date) into v_last_date
    from public.daily_plan_task_state
    where user_id = auth.uid() and plan_date < p_today and status = 'pending';

  if v_last_date is null then
    return;
  end if;

  insert into public.daily_plan_task_state (
    user_id, plan_date, task_key, kind, title, status,
    estimated_minutes, carried_from_date
  )
  select
    user_id, p_today, task_key, kind, title, 'pending',
    estimated_minutes, plan_date
  from public.daily_plan_task_state
  where user_id = auth.uid() and plan_date = v_last_date and status = 'pending'
  on conflict (user_id, plan_date, task_key) do nothing;
end;
$$;

grant execute on function public.carry_forward_daily_plan_tasks(date) to authenticated;

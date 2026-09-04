-- Fixes a real carry-forward correctness bug (master spec: "Correct
-- carry-forward behavior").
--
-- The original carry_forward_daily_plan_tasks (0040) only looked at the
-- SINGLE most recent prior day with pending tasks (`select max(plan_date)
-- ... where status = 'pending'`), then carried only that day's rows.
--
-- Concretely, this under-carries whenever a task has already been carried
-- once before without being resolved: Monday's pending task gets copied to
-- Tuesday; if it's still pending Wednesday, `max(plan_date)` is now
-- Tuesday (more recent than Monday), so Monday's now-superseded original
-- row is never looked at again — it just sits there forever as a stale
-- duplicate 'pending' row with the same task_key as the live one that did
-- get carried to Wednesday. The task itself isn't lost (Tuesday's copy
-- keeps propagating forward correctly), but the same task_key now exists
-- as multiple 'pending' rows across different plan_dates within the same
-- week, and weekly-review.ts / EndOfDayReview count raw rows without
-- deduplicating by task_key — so a single unfinished task inflates
-- plannedTaskCount/incompleteTaskCount and appears multiple times in the
-- "blockers" list, corrupting exactly the plan-adherence metric fixed in
-- the app code alongside this migration.
--
-- Fix: carry every task_key that has a pending row on ANY prior day (not
-- just the max), taking the most recent occurrence of each task_key so
-- carried_from_date is still meaningful, and mark every superseded prior
-- occurrence as carried_forward, a new terminal-for-counting status
-- distinct from pending — it stops being double-counted as still-open
-- work on its original day while remaining in history (not deleted) for
-- audit purposes, exactly like 'completed'/'skipped' already are.

-- The status check constraint was declared inline with no explicit name in
-- 0040, so Postgres auto-generated one. Rather than assume the
-- conventional `<table>_<column>_check` name is exactly right (there's no
-- live database in this environment to verify it against before this
-- migration runs elsewhere), look it up from the catalog and drop
-- whichever constraint is actually enforcing this check.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'daily_plan_task_state'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%pending%';

  if v_constraint_name is not null then
    execute format('alter table public.daily_plan_task_state drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.daily_plan_task_state
  add constraint daily_plan_task_state_status_check
  check (status in ('pending', 'in_progress', 'completed', 'skipped', 'carried_forward'));

create or replace function public.carry_forward_daily_plan_tasks(p_today date)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- One row per task_key: the most recent prior-day pending occurrence of
  -- each, so a task pending on both Mon and Tue (Tue being Mon's own
  -- carried copy) is only carried once, from its latest occurrence.
  with latest_pending as (
    select distinct on (task_key)
      task_key, kind, title, estimated_minutes, plan_date
    from public.daily_plan_task_state
    where user_id = auth.uid() and plan_date < p_today and status = 'pending'
    order by task_key, plan_date desc
  )
  insert into public.daily_plan_task_state (
    user_id, plan_date, task_key, kind, title, status,
    estimated_minutes, carried_from_date
  )
  select
    auth.uid(), p_today, task_key, kind, title, 'pending',
    estimated_minutes, plan_date
  from latest_pending
  on conflict (user_id, plan_date, task_key) do nothing;

  -- Retire every prior-day pending row now that its task_key has a live
  -- row on p_today (either just carried above, or already present from an
  -- earlier call this same day) — this is what actually fixes the
  -- double-counting: a task_key should have at most one row counted as
  -- "still open" at any point in time, on whichever day currently
  -- represents it.
  update public.daily_plan_task_state AS old
    set status = 'carried_forward', updated_at = now()
    where old.user_id = auth.uid()
      and old.plan_date < p_today
      and old.status = 'pending'
      and exists (
        select 1 from public.daily_plan_task_state cur
        where cur.user_id = auth.uid()
          and cur.plan_date = p_today
          and cur.task_key = old.task_key
      );
end;
$$;

grant execute on function public.carry_forward_daily_plan_tasks(date) to authenticated;

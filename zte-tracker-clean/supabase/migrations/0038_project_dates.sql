-- ============================================================================
-- 0038_project_dates.sql
--
-- Gap fix: neither project_progress (curriculum-defined projects) nor
-- advanced_project_progress (freeform portfolio projects) tracked when
-- work actually started or finished — only a bare status enum and an
-- updated_at that gets overwritten on every edit. The spec (Phase 9)
-- asks for start date / completion date as real project evidence.
--
-- Approach: add started_at / completed_at columns and set them via a
-- trigger on status transitions, not by trusting every call site (the
-- client hooks do a plain upsert with no special-casing today) to
-- remember to stamp them. This mirrors the existing dsa_progress pattern
-- (completed_at set when completed flips true) rather than inventing a
-- new convention.
--
-- Rules, matching how a person actually works:
--   - started_at is set the first time status moves away from its initial
--     state (not_started / not_started+considering) into anything active.
--   - completed_at is set when status becomes 'completed'.
--   - Moving OFF completed (e.g. back to in_progress to fix something)
--     clears completed_at — it's no longer true that the project is done.
--   - started_at is never cleared once set; going back to in_progress
--     from completed doesn't erase when the work began.
--   - Existing rows get a one-time backfill from updated_at as a
--     reasonable estimate (better than leaving historical projects with
--     no dates at all), clearly distinguishable from a real start via
--     the fact that started_at == updated_at for those pre-existing rows.
-- ============================================================================

alter table public.project_progress
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.advanced_project_progress
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

-- One-time backfill for existing rows: anything already in_progress or
-- completed gets started_at = updated_at (best available estimate);
-- anything already completed also gets completed_at = updated_at.
update public.project_progress
  set started_at = updated_at
  where status in ('in_progress', 'completed') and started_at is null;
update public.project_progress
  set completed_at = updated_at
  where status = 'completed' and completed_at is null;

update public.advanced_project_progress
  set started_at = updated_at
  where status in ('in_progress', 'completed') and started_at is null;
update public.advanced_project_progress
  set completed_at = updated_at
  where status = 'completed' and completed_at is null;

-- Trigger function for project_progress (not_started -> in_progress/completed)
create or replace function public.stamp_project_progress_dates()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'not_started' and (old.started_at is null) then
    new.started_at := coalesce(new.started_at, now());
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_progress_dates on public.project_progress;
create trigger trg_project_progress_dates
  before update on public.project_progress
  for each row
  execute function public.stamp_project_progress_dates();

-- Same rule, but advanced_project_progress's "not started yet" state is
-- two values (not_started, considering), not one.
create or replace function public.stamp_advanced_project_progress_dates()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('not_started', 'considering') and (old.started_at is null) then
    new.started_at := coalesce(new.started_at, now());
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_advanced_project_progress_dates on public.advanced_project_progress;
create trigger trg_advanced_project_progress_dates
  before update on public.advanced_project_progress
  for each row
  execute function public.stamp_advanced_project_progress_dates();

-- Also cover the insert path (upsert can insert directly with a non-default
-- status in one call, e.g. importing/bulk-adding a project already marked
-- in_progress) — the BEFORE UPDATE trigger above never fires for that case
-- since there's no OLD row.
create or replace function public.stamp_project_progress_dates_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'not_started' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_progress_dates_insert on public.project_progress;
create trigger trg_project_progress_dates_insert
  before insert on public.project_progress
  for each row
  execute function public.stamp_project_progress_dates_insert();

create or replace function public.stamp_advanced_project_progress_dates_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('not_started', 'considering') and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advanced_project_progress_dates_insert on public.advanced_project_progress;
create trigger trg_advanced_project_progress_dates_insert
  before insert on public.advanced_project_progress
  for each row
  execute function public.stamp_advanced_project_progress_dates_insert();

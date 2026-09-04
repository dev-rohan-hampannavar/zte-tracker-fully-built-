-- ============================================================================
-- PHASE 7 of the Career OS build: Notifications persistence.
--
-- use-notifications.ts already computes real, live notifications with an
-- explicit design note that there's no read/seen tracking "by design" —
-- no backend infra existed for it at the time. That reasoning was correct
-- given what existed then; it no longer holds now that this app has a
-- real Postgres backend with per-user tables everywhere else. This
-- migration adds exactly the missing piece — dismissal/snooze state — as
-- a lightweight table, not a rearchitecture of the notification computation
-- itself (which stays exactly as-is: computed fresh each load, not stored).
--
-- Each notification has a stable client-computed id (e.g. "revision-overdue",
-- "inactive-<phase_id>") already; notification_dismissals references that
-- id directly rather than a notifications table with foreign keys, since
-- the notifications themselves are ephemeral/derived and have no row of
-- their own to reference.
-- ============================================================================

create table if not exists public.notification_dismissals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null, -- matches AppNotification.id from use-notifications.ts
  action text not null check (action in ('read', 'snoozed', 'deleted')),
  snoozed_until timestamptz, -- set only when action = 'snoozed'
  created_at timestamptz not null default now()
);
create unique index if not exists idx_notification_dismissals_unique on public.notification_dismissals(user_id, notification_id);
create index if not exists idx_notification_dismissals_user on public.notification_dismissals(user_id);

alter table public.notification_dismissals enable row level security;
create policy "own rows: notification_dismissals" on public.notification_dismissals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Fix reset_user_progress(): notification_dismissals (Phase 7) is
-- per-user state, same category as user_settings.pinned_items — a reset
-- should clear it so old dismissals don't hide notifications that are
-- newly relevant again after a reset.
-- ----------------------------------------------------------------------------
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
  delete from public.study_sessions where user_id = auth.uid();
  delete from public.focus_sessions where user_id = auth.uid();
  delete from public.milestones where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.interview_rounds where user_id = auth.uid();
  delete from public.user_skills where user_id = auth.uid();
  delete from public.project_skills where user_id = auth.uid();
  delete from public.interview_attempts where user_id = auth.uid();
  delete from public.notification_dismissals where user_id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;

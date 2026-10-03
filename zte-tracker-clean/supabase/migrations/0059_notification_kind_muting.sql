-- Section 23 of the master spec requires notifications to be
-- user-controlled. notification_dismissals (an earlier migration)
-- already supports dismissing/snoozing individual notification
-- instances, but there was no way to turn off an entire KIND of
-- notification (e.g. "stop telling me about stale skills") — the person
-- would have to re-dismiss the same kind of notification every time a
-- new instance of it appeared. This adds a simple stored array of muted
-- kinds, checked client-side against the same NotificationKind union
-- use-notifications.ts already defines.

alter table public.user_settings
  add column if not exists muted_notification_kinds text[] not null default '{}';

comment on column public.user_settings.muted_notification_kinds is
  'Notification kinds (matching the NotificationKind union in use-notifications.ts) the user has turned off entirely, distinct from per-instance dismiss/snooze in notification_dismissals.';

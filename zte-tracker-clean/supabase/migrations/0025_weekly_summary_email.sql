-- Weekly summary email: a recap of the week's hours/topics/streak, sent
-- automatically every Sunday to a recipient the user chooses (e.g. a
-- parent) — not the user's own login email, since the point is sharing
-- progress with someone else, not a self-reminder (reminders already
-- exist in-app via the notification bell).
alter table public.user_settings
  add column if not exists weekly_summary_enabled boolean not null default false,
  add column if not exists weekly_summary_recipient_email text,
  add column if not exists weekly_summary_recipient_name text,
  add column if not exists weekly_summary_last_sent_at timestamptz;

comment on column public.user_settings.weekly_summary_recipient_email is
  'Email address the weekly summary is sent to — deliberately separate from the user''s own auth email, since this is meant to be shared with someone else (parent, mentor, etc.), not a self-reminder.';

comment on column public.user_settings.weekly_summary_last_sent_at is
  'Set by the cron-triggered send route after a successful send, so the same week never gets sent twice even if the external cron pinger fires more than once (e.g. a retry after a timeout).';

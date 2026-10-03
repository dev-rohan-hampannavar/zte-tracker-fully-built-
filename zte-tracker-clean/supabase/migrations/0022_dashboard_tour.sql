-- Tracks whether a user has dismissed the first-visit dashboard tour (a
-- short card carousel introducing Daily Mission, hours logging, pace
-- tracking, Today's Lesson, etc.) so it only shows once per account rather
-- than on every dashboard load. Same table/pattern as the other small
-- per-user flags already on user_settings (developer_mode,
-- topic_locking_disabled) rather than a new table, since this is a single
-- boolean with no relational shape of its own.
alter table public.user_settings
  add column if not exists dashboard_tour_seen boolean not null default false;

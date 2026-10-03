-- ============================================================================
-- ZTE Tracker — Stage 3, Item 34: Prerequisite Locking (topic level)
-- A persistent per-user toggle to disable topic-level prerequisite locking
-- for advanced users, following the same pattern as 0007's developer_mode
-- column. Additive only.
-- ============================================================================

alter table public.user_settings
  add column if not exists topic_locking_disabled boolean not null default false;

comment on column public.user_settings.topic_locking_disabled is
  'When true, topic-level prerequisite locking (a topic requires the previous topic in its stage to be completed first) is bypassed everywhere it is checked. Off by default. Does not affect phase-level locking, which has its own separate unlock-anyway override.';

-- ============================================================================
-- Item 11: "Today's non-negotiable" — a single daily commitment, distinct
-- from general Workspace pinning (0016_pinned_items.sql). Pinned items are
-- a multi-item, cross-session bookmark list; this is exactly one item that
-- resets each day, so it needs its own date-scoped state rather than
-- overloading pinned_items with a "which pin is today's commitment" flag.
--
-- Stored as a single nullable row of fields on user_settings (not a table)
-- because there is never more than one live commitment per user at a time,
-- matching the same "small per-user state, no relational joins needed"
-- reasoning 0016 used for pinned_items.
-- ============================================================================

alter table public.user_settings
  add column if not exists daily_commitment_type text
    check (daily_commitment_type is null or daily_commitment_type in ('topic', 'project', 'dsa_problem', 'custom')),
  add column if not exists daily_commitment_id text,
  add column if not exists daily_commitment_label text,
  add column if not exists daily_commitment_date date,
  add column if not exists daily_commitment_done_at timestamptz;

comment on column public.user_settings.daily_commitment_type is
  'Kind of item set as today''s single non-negotiable task, or null if none set.';
comment on column public.user_settings.daily_commitment_id is
  'ID of the committed item (topic id, project phase id, dsa_progress id), or null for a free-text "custom" commitment.';
comment on column public.user_settings.daily_commitment_label is
  'Display label for the commitment, snapshotted at set-time so it still reads correctly even if the underlying item is later renamed or removed.';
comment on column public.user_settings.daily_commitment_date is
  'The date (user-local) this commitment was set for. A commitment from a previous date is treated as stale/expired by the app, not carried forward automatically — carry-forward is the daily plan tasks'' job (0022), not this single-item pin.';
comment on column public.user_settings.daily_commitment_done_at is
  'When the commitment was marked done today, or null. Cleared whenever a new commitment is set.';

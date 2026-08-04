-- ============================================================================
-- ZTE Tracker — P7.6: Developer mode
-- A persistent per-user toggle (not local-only) so it carries across
-- devices like every other setting. Additive only.
-- ============================================================================

alter table public.user_settings
  add column if not exists developer_mode boolean not null default false;

comment on column public.user_settings.developer_mode is
  'When true, the app surfaces raw internal IDs and metadata (phase/topic/stage IDs, table names, row counts) throughout the UI for debugging and curiosity — off by default.';

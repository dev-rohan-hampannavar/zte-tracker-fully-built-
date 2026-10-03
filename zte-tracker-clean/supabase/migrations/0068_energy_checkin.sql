-- ============================================================================
-- Item 23: energy-level check-in. Stored on daily_logs (not a new table)
-- because it's exactly one value per user per day, same cardinality as
-- hours/journal fields already on that row — no relational structure is
-- needed, matching 0066's reasoning for daily_commitment on user_settings.
--
-- This is the schema half only. Nothing reorders anything yet: "reordering"
-- (e.g. surfacing lower-effort tasks on low-energy days) is a read-time
-- concern for the daily-plan UI, not something the column itself does.
-- ============================================================================

alter table public.daily_logs
  add column if not exists energy_level smallint
    check (energy_level is null or energy_level between 1 and 5);

comment on column public.daily_logs.energy_level is
  'Self-reported energy for the day, 1 (lowest) to 5 (highest), or null if not checked in. Optional — logging hours does not require setting this.';

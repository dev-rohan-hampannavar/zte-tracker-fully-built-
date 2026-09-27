-- ============================================================================
-- PHASE 1 — Protect the existing personal experience
--
-- Purpose: make "this account's roadmap configuration" an explicit,
-- database-backed fact instead of an implicit assumption. Today every
-- authenticated user reads the same singleton `roadmap_metadata` (id = 1)
-- and the same `phases`/`topics` rows — there is no per-account roadmap
-- assignment at all, so there is nothing to "protect" yet at the data
-- level. This migration adds the columns that later phases (enrollment,
-- onboarding, the personalization engine) will populate, and explicitly
-- marks the existing account(s) as pointing at the current curriculum, so
-- that when Phase 4 introduces multiple roadmaps, existing users don't
-- silently lose their assignment or get re-onboarded.
--
-- Explicit non-goal: this migration does NOT create `roadmaps` /
-- `roadmap_versions` tables (that's Phase 3/4) and does NOT change
-- `roadmap_metadata` from a singleton to a multi-row table. It only adds
-- the account-level fields so that work has somewhere to land.
--
-- Principle from the master prompt, honored here: no `if (email === ...)`
-- or other identity-specific logic. Every column here is populated by
-- data (a default value applied to all existing rows), not by code that
-- singles out one user.
-- ============================================================================

alter table public.user_settings
  add column if not exists roadmap_id text not null default 'zte-core-v1',
  add column if not exists is_personalized boolean not null default true,
  add column if not exists onboarding_completed boolean not null default true,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.user_settings.roadmap_id is
  'Which roadmap this account is enrolled in. Currently always ''zte-core-v1'' '
  '(the single seeded curriculum) since there is only one roadmap. Becomes a '
  'real foreign key to a `roadmaps` table in Phase 4 — kept as free text for '
  'now so this migration has zero dependency on that not-yet-built table.';

comment on column public.user_settings.is_personalized is
  'True for accounts using the original hand-built ZTE curriculum/career '
  'plan as-is (the current default for every existing account). Public '
  'users who complete onboarding in Phase 6 onward will get this set '
  'false and a roadmap assembled by the personalization engine instead. '
  'Existing accounts default to true so nothing about their experience '
  'changes when this ships.';

comment on column public.user_settings.onboarding_completed is
  'True for every account that existed before this column did — they '
  'never went through onboarding because it did not exist yet, and the '
  'column default made that a no-op for them at alter-table time. Every '
  'row created AFTER this migration goes through handle_new_user() below '
  'instead, which explicitly inserts false, so brand-new signups are '
  'routed into onboarding (Phase 6) rather than inheriting this column '
  'default of true.';

-- Backfill for EXISTING rows is implicit via the column defaults above
-- (`default true` / `default 'zte-core-v1'` apply to existing rows on
-- `alter table add column` in Postgres) — no separate `update` needed.
--
-- That column default is deliberately wrong for any row inserted AFTER
-- this migration: a new signup has not completed onboarding and has not
-- been assigned a personalized roadmap. `handle_new_user()` currently
-- does a bare `insert (user_id)`, which would silently inherit the
-- `onboarding_completed = true` / `is_personalized = true` defaults and
-- skip onboarding entirely for every future user. Redefine the trigger
-- function to insert the new-signup values explicitly, so the "existing
-- accounts" default above and the "new signups" behavior are decoupled
-- rather than accidentally sharing one column default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id, onboarding_completed, is_personalized)
  values (new.id, false, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- No RLS changes needed: these are plain columns on an already
-- owner-scoped table (`user_settings` RLS is `auth.uid() = user_id`,
-- unchanged since 0001_init.sql). No new policy required.

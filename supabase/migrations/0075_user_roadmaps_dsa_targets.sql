-- ============================================================================
-- PHASE 7 (continued) — Personalize DSA targets from onboarding's dsa_level
--
-- Closes the gap flagged during the Phase 11-18 audit: onboarding_responses
-- collects dsa_level (migration 0072) but nothing reads it — the only DSA
-- targets in the app are the global singleton roadmap_metadata.dsa_easy_
-- target / dsa_medium_target (75/50), read directly by 6 call sites
-- (src/app/(app)/dsa/page.tsx, companies/[id]/page.tsx, reference/page.tsx,
-- dashboard/page.tsx, use-job-readiness.ts).
--
-- Numeric mapping (beginner 40/20, intermediate 60/35, advanced 75/50 —
-- the existing global default IS the "advanced" tier, not a separate
-- number) confirmed with the product owner rather than invented here.
--
-- Columns added to user_roadmaps (not a new table): this is per-enrollment
-- configuration, the same category as weekly_hours/target_date already
-- on this table, not a new concern needing its own table.
-- ============================================================================

alter table public.user_roadmaps
  add column if not exists dsa_easy_target int,
  add column if not exists dsa_medium_target int;

comment on column public.user_roadmaps.dsa_easy_target is
  'Per-user override of roadmap_metadata.dsa_easy_target (the global '
  'default, 75), seeded from onboarding_responses.dsa_level at '
  'enrollment time. Null means no override was recorded — callers must '
  'fall back to roadmap_metadata.dsa_easy_target, not treat null as '
  'zero. Set once at enrollment; not kept in sync if roadmap_metadata''s '
  'global default changes later, same as target_date/weekly_hours '
  'already on this table are point-in-time enrollment configuration, '
  'not live-synced settings.';

comment on column public.user_roadmaps.dsa_medium_target is
  'See dsa_easy_target — same override semantics, for medium-difficulty '
  'problems.';

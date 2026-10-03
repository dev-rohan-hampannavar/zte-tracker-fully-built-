-- ============================================================================
-- PHASE 7 — Roadmap personalization engine: record the starting point
--
-- Purpose: src/lib/personalization-engine.ts computes a recommended
-- starting phase from a user's onboarding answers. This column is where
-- that recommendation (or the user's own override, if they chose to
-- start earlier — see the engine's own comment: "a recommendation is not
-- a forced restriction") gets recorded on their enrollment, so the
-- dashboard (Phase 9) and daily execution engine (Phase 10) know where
-- their roadmap actually begins instead of assuming phase-01 for every
-- enrollment.
--
-- Nullable and with no default: an enrollment created before this column
-- existed, or one created without going through the personalization
-- engine (e.g. the owner's original account, enrolled directly per
-- migration 0071's own comment about not inventing a value for existing
-- accounts), simply has no recorded starting point — that's a fact worth
-- representing as null, not defaulting to the first phase, since "starts
-- at the first phase" and "we don't know where this enrollment starts"
-- are different things and code reading this column should be able to
-- tell them apart.
-- ============================================================================

alter table public.user_roadmaps
  add column if not exists starting_phase_id text references public.phases(id);

comment on column public.user_roadmaps.starting_phase_id is
  'The phase this enrollment''s roadmap effectively begins at, per '
  'src/lib/personalization-engine.ts''s recommendation (or the user''s '
  'own override of it). Null means no starting point was recorded — '
  'callers should not assume that means "phase one", only that this '
  'enrollment predates or bypassed the personalization engine.';

# ZTE Tracker Transformation Implementation Plan

This plan tracks the supplied master prompt against the source package. Source implementation and live release are separate: the code changes below are present in this package, while database application, deployed behavior, and signed-in acceptance checks still need a configured Supabase/Vercel environment. See [`AUDIT.md`](AUDIT.md) and [`MASTER_GAP_MATRIX.md`](MASTER_GAP_MATRIX.md) for current evidence and remaining gates.

## Current State

- Next.js/Supabase application with learning, projects, DSA, daily execution, career, profile, analytics, and PWA features.
- 85 append-only SQL migrations in source; new migrations add three detailed track families, enrollment-aware progress, curriculum release workflow, product funnel events, and feature flags.
- Three detailed shared curricula contain 63 phases, 1,193 topics, and 614 applied projects. Ten seeded target roles map to those families. Existing users were not assigned guessed enrollment dates or weekly hours.
- User-owned tables generally use `auth.uid() = user_id`. The isolation script covers representative core, detailed-learning, and analytics tables; it requires live Supabase secrets and does not cover every table/RPC.
- Owner-specific career content remains in source/seed and a manual owner-email seed script; it is not a runtime authorization branch.

## Gap Analysis

1. Apply migrations 0077–0085 and the generated track seed to staging; verify schema, RPCs, RLS, admin denial, and the migration ledger.
2. Review the existing owner's account and data before deciding whether an explicit enrollment backfill is needed; do not guess unknown dates or hours.
3. Expand cross-user checks across all user-owned tables/RPCs and verify public-profile/service-role projections.
4. Complete human subject-matter review of the detailed tracks and confirm role assignments with the intended users.
5. Verify new-user and returning-user journeys, progress persistence, backup/restore, account reset/deletion, and accessibility/mobile behavior in staging.
6. Configure production Supabase/Vercel services, monitoring, backups, and beta acceptance before deployment.

## Phase 0 — Audit and evidence (complete)

- **Objective:** Record the source-based architecture, risks, and planned work before implementation.
- **Affected files:** `AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `MASTER_GAP_MATRIX.md`.
- **Database changes:** None.
- **Security implications:** No production mutation; distinguish source evidence from live verification.
- **Migration strategy:** None.
- **Tests:** No tests run; document available scripts and prerequisites.
- **Acceptance criteria:** Deliverables exist, findings cite repository paths/migrations, unknowns are labeled. Complete.
- **Risks:** Audit is source-only; ZIP does not prove deployed state.

## Phase 1 — Owner preservation and deployed-state baseline (not verified live)

- **Objective:** Prove how the existing account resolves today and preserve its rows/configuration before multi-roadmap behavior changes.
- **Affected files:** likely new staging verification scripts/docs; potentially an additive migration after review. Inspect `supabase/seed_rohan_career_plan.sql`, `src/lib/hooks/use-user-settings.ts`, `src/lib/hooks/use-roadmap.ts`, `(app)/layout.tsx`.
- **Database changes:** None until a schema/data export and live schema check are reviewed. Then add an idempotent, operator-resolved enrollment backfill if required; avoid guessed dates/hours.
- **Security implications:** Do not add email/user-id runtime branches. Resolve owner account for data migration under controlled operator procedure only.
- **Migration strategy:** Additive, transactional where possible; snapshot and row-count/checksum before/after; rollback instructions.
- **Tests:** Owner flow against staging; compare existing settings, progress, projects, career, logs, notes before/after.
- **Acceptance criteria:** Owner logs in, profile and existing experience/data remain unchanged, enrollment semantics are explicit.
- **Risks:** No live credentials/current production snapshot supplied.

## Historical implementation record — multi-user platform slice (implemented in source, DB not applied)

- **Objective:** Protect admin roles; add role-specific detailed curricula, versioned shared content, per-user topic/project state, release management, funnel analytics, and feature switches.
- **Affected files:** migrations `0077`–`0085`; `data/roadmap-tracks.json`; generated `supabase/seed_roadmap_tracks.sql`; validators, onboarding, detailed roadmap/dashboard/daily plan, admin editor and console, event hooks, tests, and documentation.
- **Database changes:** Nine additive migrations and a generated track seed. Existing legacy phase/topic identifiers remain intact.
- **Security implications:** New learning and event records are user-scoped; admin release/assignment/flag operations use guarded database functions and RLS. Live policy behavior remains unverified.
- **Migration strategy:** Apply migrations and seed in order to staging after taking a baseline; none were applied because credentials were not supplied.
- **Tests:** `npm test`, `npx tsc --noEmit`, full lint (two warnings), and both curriculum validators pass. The normal Next build reaches `spawn EPERM` during its managed type-check worker; the production bundle and route generation completed when type validation was run separately.
- **Acceptance criteria:** Source implementation is present; Supabase persistence, RLS, returning-user continuity, and deployment remain acceptance gates.
- **Risks:** Curriculum editorial review is pending, and several master-prompt goals require external account setup or staging evidence.

## Phase 2 — Complete isolation and privilege audit

- **Objective:** Verify every user-owned table, RPC, trigger, public projection, and admin path.
- **Affected files:** migrations 0001–0076, `src/types/database.ts`, all API handlers, `src/lib/supabase/admin.ts`, current `scripts/verify-user-isolation.mjs`; add table-driven coverage where needed.
- **Database changes:** Only targeted additive policy/privilege fixes after findings; protect `is_admin` against self-escalation.
- **Security implications:** Critical release gate; explicitly model sensitive tables and `SECURITY DEFINER` ownership/search path.
- **Migration strategy:** Small migrations with rollback scripts; no blanket policy reset.
- **Tests:** Staging two-user create/read/update/delete across all owned tables and RPCs; admin privilege negative tests; public profile disclosure tests.
- **Acceptance criteria:** Every data path has correct ownership policy and adversarial tests pass live.
- **Risks:** The current script uses service-role credentials to create throwaway users and only tests a subset.

## Phase 3 — Shared content versus account state

- **Objective:** Complete explicit content/state boundaries while preserving existing IDs/progress.
- **Affected files:** migrations 0070–0071 and future schema; `src/types/database.ts`, seed generators, `src/lib/hooks/use-roadmap.ts`.
- **Database changes:** Link all relevant content to roadmap/version and identify missing content hierarchy only where app needs it. Keep content single-copy.
- **Security implications:** Shared curricula readable by intended roles; user progress remains private.
- **Migration strategy:** Backfill links, validate foreign keys/counts, retain topic IDs, never duplicate curriculum per user.
- **Tests:** Migration replay/idempotency as appropriate, referential integrity, legacy progress linkage.
- **Acceptance criteria:** Existing progress joins the same content; shared catalog and private state are demonstrably separate.
- **Risks:** Current `roadmap_metadata` remains singleton; do not convert without auditing all consumers.

## Phase 4 — Enrollment-aware roadmap resolution/versioning

- **Objective:** Ensure each authenticated user sees the roadmap/version tied to active enrollment.
- **Affected files:** `src/lib/hooks/use-roadmap.ts`, `use-user-roadmap.ts`, dashboard/roadmap/daily planner/readiness consumers; relevant tests.
- **Database changes:** Potential constraints/indexes only if the audit finds gaps; enrollment/version FKs already exist.
- **Security implications:** Enrollment reads must remain caller-scoped; only shared selected content is returned.
- **Migration strategy:** No content identity changes; compatibility fallback for legacy rows until Phase 1 enrollment is complete.
- **Tests:** Multiple enrollment fixtures and legacy account compatibility; no cross-user state mixing.
- **Acceptance criteria:** View models are composed from the enrolled version plus caller's progress.
- **Risks:** Broad consumers currently assume a global roadmap singleton.

## Phase 5 — Atomic onboarding and personalization

- **Objective:** Persist onboarding, role/skill assessment, enrollment, starting point, workload, and target date reliably.
- **Affected files:** `src/app/onboarding/*`, `src/lib/hooks/use-onboarding.ts`, `src/lib/personalization-engine.ts`, migrations 0072–0075.
- **Database changes:** Prefer a transaction/RPC or server-side endpoint for enrollment+completion; maintain resumable draft and idempotency.
- **Security implications:** Validate caller identity in database/RPC; reject user-id spoofing and invalid catalog IDs.
- **Migration strategy:** Keep existing onboarding records; new atomic path accepts retries and repairs partial prior state.
- **Tests:** Failure injection between current steps; role/experience/skills examples; onboarding completion and enrollment isolation.
- **Acceptance criteria:** Beginner frontend and experienced Java backend receive distinct valid starting configurations once suitable curricula exist.
- **Risks:** One curriculum currently makes role assignment non-differentiating.

## Phase 6 — Curated versioned roadmap portfolio

- **Objective:** Add genuinely deep, reviewed curricula for supported user tracks.
- **Affected files:** curriculum authoring/source data, seed generator, validation scripts, migrations/seeds, role assignment data.
- **Database changes:** Versioned content rows; avoid copying content into user-owned tables.
- **Security implications:** Admin-only content writes; public read policies limited to published content.
- **Migration strategy:** Seed immutable roadmap versions and publish only after content checks; preserve old versions for enrolled users.
- **Tests:** Curriculum validation, prerequisite graph checks, depth/coverage acceptance review, selection differences.
- **Acceptance criteria:** Each supported role maps only to an adequate roadmap; advanced users can skip mastered foundations with explicit dependencies.
- **Risks:** Curriculum quality is a substantive content effort; do not manufacture shallow entries to fill tracks.

## Phase 7 — Personalized dashboard, daily execution, adaptive learning

- **Objective:** Compose profile, enrollment, progress, available time, deadlines, weak areas, review schedule, and daily plan.
- **Affected files:** dashboard, daily-plan, roadmap/revision components and hooks; `src/lib/daily-planner.ts`; schema only if necessary.
- **Database changes:** Reuse existing progress/session/plan state tables unless a measured gap requires an additive change.
- **Security implications:** All generated plan data must derive from the caller's records.
- **Migration strategy:** No destructive changes; new state is optional and backwards compatible.
- **Tests:** Deterministic schedules, capacity limits, skip/prerequisite behavior, planned-vs-actual and carry-forward.
- **Acceptance criteria:** A useful daily action list responds to user hours, enrollment and current progress.
- **Risks:** Distinguish recommendation from mastery; avoid false precision.

## Phase 8 — Projects, DSA, career, interview, evidence, GitHub

- **Objective:** Preserve and verify existing depth; fill evidence-backed gaps in project sequence, interview history, resume, portfolio, and external integration.
- **Affected files:** relevant routes/hooks/components, `docs/feature-matrix.md`, integration routes and tests.
- **Database changes:** Reuse current tables; add only justified fields/tables with safe data migration.
- **Security implications:** Salary, applications, notes, and finance remain private; public portfolio remains explicit opt-in projection.
- **Migration strategy:** Map legacy fields without dropping them; add export/rollback plan for changes.
- **Tests:** Authenticated end-to-end flows and public projection disclosure tests.
- **Acceptance criteria:** Learn → build → prove → prepare → apply path persists real state.
- **Risks:** Repo already implements much of this; avoid duplicate subsystems.

## Phase 9 — Analytics, admin CMS, production hardening

- **Objective:** Make analytics truthful, content editing controlled, and release operations observable/recoverable.
- **Affected files:** admin routes/policies, metrics, health/smoke scripts, deployment docs, backup/export/delete flows.
- **Database changes:** Only for durable event/retention needs approved by privacy review.
- **Security implications:** Minimize telemetry; admin write access and service-role boundaries audited.
- **Migration strategy:** Additive and reversible; test backup restore before rollout.
- **Tests:** Typecheck/lint/unit/build, release schema gate, RLS isolation, authenticated journey, backup/restore, rate-limit behavior.
- **Acceptance criteria:** Migration status, monitoring, backup, data export/deletion, and recovery are verified.
- **Risks:** Existing feature matrix says live migrations/backups/error monitoring and authenticated browser QA are not verified.

## Phase 10 — Responsive/PWA, beta, public launch

- **Objective:** Complete mobile/accessibility checks, controlled beta, then release only after security and owner acceptance gates pass.
- **Affected files:** responsive UI/PWA, QA docs, product analytics, release configuration.
- **Database changes:** No launch-specific schema changes absent evidence.
- **Security implications:** Re-run isolation and public disclosure checks against release candidate.
- **Migration strategy:** Freeze content/schema changes during beta windows where possible; documented rollback.
- **Tests:** Keyboard/screen-reader/responsive checks, owner flow, two-user flow, export/delete, smoke/monitoring.
- **Acceptance criteria:** 10–50-user beta evidence; no unresolved critical privacy/isolation issue; owner and new-user journeys pass.
- **Risks:** Launch cannot be represented as production-ready from source inspection alone.

## Dependency flow

```text
Current source audit
  ↓
Owner data/deployed-state baseline
  ↓
Complete RLS and admin privilege verification
  ↓
Shared content + enrollment-aware data access
  ↓
Atomic onboarding + differentiated versioned content
  ↓
Personalized execution + existing product systems
  ↓
Operational hardening + mobile QA
  ↓
Beta → public launch
```

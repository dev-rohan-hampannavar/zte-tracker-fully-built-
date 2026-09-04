# Claude handoff prompt — finish ZTE Career Strategy integration

You are taking over the Zero to Elite Tracker repository. Finish and productionize the Career Strategy integration that is already partially implemented. Treat the repository code as the source of truth and do not replace the existing design system with a separate app or iframe.

## What we were trying to do

The supplied `Zero_to_Elite_Full_Plan (1).html` is a career playbook, not a second application. We were integrating its ideas into the existing ZTE Tracker so it feels like one product instead of a document pasted on later. The plan is a 24-month fork:

- Keep the Business Operations job as income and the low-risk Plan A fallback.
- Run Plan B as a serious SDE-1 sprint at roughly 40 hours/week around the job.
- Build one flagship, deployed proof project (`ClientSync` by default).
- Start applications around Months 7–8 so market feedback arrives early.
- Use the six windows (foundation, backend/auth, ship/apply, DSA/interviews, depth, buffer) to decide what matters now.
- Make a hard, evidence-based GO/NO-GO decision at Month 24; never drift indefinitely or decide from hours/motivation alone.

The goal is not to redesign ZTE Tracker. Preserve its visual language and navigation patterns; only finish the native integration and polish issues that prevent it from feeling coherent.

## How much is done vs. remaining

Most core application implementation is present in this repository, but this is not yet a complete production release. The native pages, content model, settings path, live metric composition, navigation entry points, canonical study-event ledger, BI/data role readiness, Execution OS backup/reset coverage, transparent job-description analyzer, migrations, documentation, and repository checks are present. Remaining launch gates include applying migrations 0051–0055, authenticated backup/RLS/E2E testing, full accessibility/mobile QA, external error monitoring, fixing the deployed health-route drift, and deploying to the user's Vercel project. Push notifications, two-way calendar OAuth, custom widget rearrangement, and the deliberately deferred AI/external integrations are not included. See `docs/feature-matrix.md` for the exact status. The live site has not been changed by this handoff.

Evidence already collected: `npx tsc --noEmit`, `npm test`, curriculum validation, `npm audit --audit-level=high`, and full `npm run lint` passed. The original transport-only public smoke reached all five routes; the stricter current probe correctly rejects the live deployment because `/api/health` is redirected to login by the older deployed middleware. Deploy this package, then rerun smoke to validate the public JSON health contract. Curriculum validation reports 112 non-fatal warnings. `npm run build` compiled successfully but the managed sandbox stopped at the Next worker with `spawn EPERM`; signed-in Supabase/RLS/Vercel journeys still need to be completed.

## Objective

Make the supplied `Zero_to_Elite_Full_Plan (1).html` feel native to the existing ZTE Tracker application. The product should read as one coherent experience: a personal 24-month operating plan layered on top of the existing roadmap, daily plan, projects, DSA, career tracker, exit ladder, weekly digest, and dashboard.

## Work already completed

- Added native plan content in `src/data/full-plan.ts` (Plan A/Plan B, six timeline windows, weekly operating system, discipline rules, failure modes, Month-24 checklist, salary planning references).
- Added settings hook in `src/lib/hooks/use-career-plan.ts`.
- Added pure snapshot helpers in `src/lib/career-plan.ts`.
- Added signed-in route `src/app/(app)/career-plan/page.tsx`.
- Added `/career-plan` to `src/components/layout/sidebar.tsx` and a Dashboard CTA.
- Added stale-overview protection to `src/app/welcome/page.tsx` so legacy 290-topic/3034-hour seeded copy is not presented as current product fact.
- Added migrations `supabase/migrations/0051_career_plan_settings.sql` through `supabase/migrations/0055_bi_data_readiness.sql`, and updated `src/types/database.ts`.
- Added `/execution` for weekly commitments, time blocks, and evidence capture, plus a financial-runway card and application follow-up queue in `/career-plan`.
- Added `/api/health` and `scripts/smoke-check.mjs` for dependency-aware deployment health checks.
- Added `scripts/verify-supabase-release.mjs` and an optional CI job for read-only verification of migration-backed tables/columns using a service-role secret; it never reads or mutates user rows.
- Added a credentialless calendar `.ics` export and documented OAuth/telemetry boundaries in `docs/integrations.md`; do not invent third-party credentials.
- Extended Settings JSON backup/import to include weekly commitments, time blocks, evidence items, and financial runway settings, with URL revalidation on restore.
- Added canonical `study_events` recording for manual logs, focus-timer completion, and daily-plan completion; topic completion is now authorized by a server RPC with a database guard against direct state changes.
- Added the BI / Data Analyst target role and data-tool technology catalog entries for role-specific readiness.
- Added a transparent job-description analyzer to Job Readiness. It matches only canonical catalog technologies against the user's live skill evidence; it does not fabricate an AI score or call an external service.
- Existing hardening work is already present; preserve it. Do not undo CSP, safe redirects, URL validation, RLS, reset RPC, or public-profile protections.

## Finish these tasks

1. Review the new route visually and functionally against the existing UI. Fix any layout, accessibility, mobile, loading, or error-state issues. Reuse existing Card, Badge, Button, Input, Select, Progress, Skeleton, motion, and theme primitives.
2. Verify that `deriveCurrentExit` and the route's phase/exit joins match the actual schema values (`exit_ladder.linked_phase` and `phases.id`). If needed, add focused tests for snapshot/date/exit calculations.
3. Make the settings flow resilient when migrations 0051–0055 have not yet been applied: defaults may render, but the UI must give a clear actionable error and never crash. Confirm authenticated users can only update their own rows under RLS.
4. Apply migrations 0051–0055 to the intended Supabase project, then run `npm run test:smoke` against the deployed URL and smoke-test `/career-plan` and `/execution` with a real signed-in account. Confirm save/reload persistence for plan settings, commitments, time blocks, evidence, financial runway values, canonical study events, backup/import, and reset semantics.
5. Ensure all visible curriculum statistics come from canonical live data or are clearly labelled planning references. Search for stale user-facing `16-month`, `290-topic`, `2700`, `3034`, or contradictory copies and reconcile them without changing historical source documents unnecessarily.
6. Add an unobtrusive link from Weekly Digest or another obvious career surface if it improves discoverability; do not duplicate the whole page in multiple routes.
7. Run and report:

   ```powershell
   npm ci
   npm test
   npx tsc --noEmit
   npm run lint
   npm run validate:curriculum
   npm audit --audit-level=high
   npm run build
   ```

   The managed Codex sandbox may fail a final Next worker with `spawn EPERM` even after compilation; distinguish that environment limitation from source errors. Do not claim a perfect production build unless it completes.
8. Update `docs/production-readiness-report.md`, `docs/test-report.md`, and/or add a concise `docs/career-plan-integration.md` with what is verified, what requires Supabase/Vercel credentials, and the exact deployment steps.
9. Build a clean source ZIP excluding `.env.local`, `node_modules`, `.next`, caches, and secrets. Do not commit secrets. Keep the migration and handoff prompt in the archive.

## Acceptance criteria

- `/career-plan` is authenticated, responsive, keyboard-usable, and visually indistinguishable from the rest of ZTE Tracker.
- Live progress metrics are derived from existing tables/hooks; no fake analytics or duplicated source of truth.
- Plan settings are user-scoped and persisted safely.
- Month-24 decision language remains evidence-based and does not decide from hours or motivation alone.
- Existing routes and hardening checks continue to pass.
- Final report states exactly what was tested locally versus what was verified on Supabase/Vercel.

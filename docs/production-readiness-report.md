# Production-readiness evidence report

## Repository baseline

- Next.js: 16.3.3
- React / React DOM: 19.2.4
- TypeScript: 5.x (lockfile-resolved)
- Supabase client: `@supabase/ssr` 0.12.4 and `@supabase/supabase-js` 2.111.0
- Package manager: npm (`package-lock.json`)
- Routes: 44 `page.tsx` routes (including authenticated `/career-plan` and `/execution`)
- Components: 58 TSX components
- Hooks: 29 hook modules
- Supabase migrations: 55 (through migration 0055; apply migrations 0051–0055 to enable Career Strategy, canonical study events, BI/data readiness, and complete reset behavior)
- CI: `.github/workflows/ci.yml` runs install, typecheck, lint, unit/security contract tests, curriculum validation, audit, and production build; optional smoke and read-only Supabase release-gate jobs run when their URL/secret inputs are configured.

## Curriculum reconciliation snapshot

The repository contains conflicting source artifacts and therefore does not permit an honest single-number claim without a product decision:

- `data/seed.json`: 21 phases, 375 topics
- `src/data/manual-days.json`: 324 execution days
- Sum of topic `estimated_hours` in `data/seed.json`: 1,834 hours
- Other metadata/README artifacts contain different totals and legacy phase labels.

The canonical curriculum version is **not declared** by this pass; the discrepancy is recorded rather than silently choosing one source.

`npm run validate:curriculum` now checks IDs, phase/stage references, technology mappings, day-number continuity, duplicate titles, and estimates. The current snapshot passes structural checks with 112 warnings (legacy missing estimates and repeated titles); `node scripts/validate-curriculum.mjs --strict` intentionally fails until those source discrepancies are reconciled.

## Security/data changes

See [`HARDENING_CHANGELOG.md`](../HARDENING_CHANGELOG.md) and migrations 0047–0055 for the complete implementation record.

## Career Strategy integration status

The supplied `Zero_to_Elite_Full_Plan (1).html` is represented as native, typed content in `src/data/full-plan.ts`, with a signed-in `/career-plan` route that composes live roadmap, daily-log, project, DSA, application, and interview evidence. The route reuses the existing design system and links from the sidebar and Dashboard; it is not an iframe or a parallel UI system.

Core code integration is present in this extracted source package. Settings backup/import now covers user-owned state and reset behavior is migration-backed; manual/focus/daily-plan activity also enters the canonical study-event ledger; readiness includes BI/data roles; Job Readiness includes a transparent job-description analyzer that compares pasted requirements with the canonical technology catalog and live evidence. Release readiness still depends on applying migrations 0051–0055, authenticated backup/RLS/E2E verification, external error monitoring, full visual/mobile/accessibility QA, fixing the deployed health-route drift, and deploying the resulting commit to the user's Vercel project. The public domain was not modified by this local pass.

## Defect register

- P0 addressed in code: redirect open-redirect path, direct public private-row policies, public-profile admin boundary, service-worker HTML cache isolation, client-controlled slug RPC identity.
- P1/P2 infrastructure/product acceptance: the source smoke probe now validates that `/api/health` is public JSON and rejects an auth redirect. The current live deployment predates that middleware fix, so live smoke must be rerun after deployment. A 390×844 public-shell check found no horizontal overflow and keyboard focus reaches the email field; the live welcome page also predates the source fallback and still shows legacy seeded copy. Authenticated Supabase/RLS tests, E2E, accessibility, performance, backup round-trip, and curriculum reconciliation remain unresolved until a signed-in deployment test is run.

This report intentionally does not assign a 10/10 score without those verifications.

# Test and verification report

**Run date:** 2026-09-28  
**Host:** Windows, Node.js 24.20.0, npm 11.19.0  
**Scope:** extracted source tree; no configured staging or production Supabase account.

## Local checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run generate:career-role-catalog` | PASS | Generated the catalog JSON and additive migration 0087 from the reviewed role list. |
| `npm run validate:career-catalog` | PASS | 10 families, 50 profiles, 118 requested titles, valid references, complete profile fields, and 8 explicitly curated detailed-track assignments. |
| `npm test` | PASS | Career catalog validator plus all seven existing suites passed: redirects, production/privacy contracts, product-platform contracts, smoke contracts, personalization, dashboard starting-point logic, and rate limits. |
| `npx tsc --noEmit` | PASS | No TypeScript diagnostics after the catalog, explorer, onboarding, and admin changes. |
| `npm run lint` | PASS | ESLint completed with 0 errors and 0 warnings. |
| `npm run validate:roadmap-tracks` | PASS | 3 tracks, 63 phases, 1,193 detailed topics, and 614 applied project briefs pass structural validation. |
| `npm run validate:curriculum` | PASS WITH WARNINGS | 21 phases, 375 topics, 324 days, and 1,834 estimated hours; structural checks pass with 112 advisory warnings. |
| `npm audit --audit-level=high` | PASS | 0 known vulnerabilities reported for the lockfile at the time of the check. |
| `npm run build` | PARTIAL | Next.js compiled successfully in 32.3 seconds, then its TypeScript worker failed to start with Windows `spawn EPERM`. Standalone TypeScript passed; a complete production build is not claimed. |

Earlier in the work, a normal `npm ci` hit the same Windows process-spawn restriction after download. `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` completed with 502 packages, and `npm ls --depth=0` resolved the declared dependency tree.

## External checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run verify:supabase` | BLOCKED BY EXTERNAL ACCESS | `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` were not configured. |
| Supabase migration application | NOT RUN | No staging project or credentials were available. Migration 0087 is included in source but has not been applied. |
| Two-user RLS isolation | NOT RUN | Requires a dedicated Supabase test project and two authenticated accounts. |
| Admin/non-admin role management | NOT RUN | RLS and published-track restrictions have source definitions but were not exercised against Postgres. |
| Onboarding, target-role update, owner continuity | NOT RUN LIVE | Source tests passed; no authenticated staging users were configured. |
| Export/restore, deletion, public-profile journey | NOT RUN LIVE | Requires configured Supabase accounts and a deployed or staging application. |
| Signed-in responsive/accessibility review | NOT RUN | No authenticated browser and assistive-technology session was available. |
| Supabase CLI version check | BLOCKED BY HOST | CLI startup attempted to write telemetry under `C:\Users\rohan\.supabase`; the managed filesystem rejected it with `EPERM`. |

## Changes included

- Added the searchable `/careers` explorer, family recommendations, per-title track labels, and target-role updates.
- Expanded onboarding search to all active titles and added a link to browse role profiles.
- Added 10 described career families, 50 shared specialization profiles, and all 118 titles from the attached DOCX.
- Added migration 0087 with RLS-protected catalog tables, weighted role skills, active-title management, and the corrected eight title-to-track mappings.
- Added roadmap metadata shells to migration 0078 so its role-assignment foreign keys exist on a clean database; migration 0087 repeats this safely for databases that already recorded 0078.
- Added a guarded database function so admin-created roles also seed the existing weighted-readiness engine.
- Added admin controls to create role profiles/titles, assign only current published tracks, and activate/deactivate titles.
- Corrected the roadmap-track generator so it no longer routes DevOps, Cloud, QA, Data Analyst, or generic Backend roles to unrelated curricula.
- Updated execution and readiness documentation to distinguish source implementation from live release verification.

## Remaining limits

The DOCX title inventory is represented, but this does not create 118 unique curricula. Eight titles use one of the three authored shared tracks; 110 use the core curriculum. The profile catalog provides starting requirements, skills, tools, projects, interviews, DSA/system-design expectations, and portfolio evidence. Subject-matter review is still required.

The catalog migration, RLS rules, admin controls, and user journeys remain unverified against live Supabase. No production migration was applied and no production data was changed.

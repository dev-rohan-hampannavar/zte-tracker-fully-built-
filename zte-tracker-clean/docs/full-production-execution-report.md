# ZTE Tracker full production execution report

**Review date:** 2026-09-28  
**Source status:** Career discovery and catalog implemented; overall release remains partial.  
**Evidence boundary:** supplied source archive plus local source checks. The database migration has not been applied to a staging or production Supabase project.

## Work completed from the specification

| Area | Source status | Evidence |
| --- | --- | --- |
| Existing application and owner experience | Preserved in source | Existing routes, content, progress stores, migrations, and feature flows remain in the project. Owner data was not available for a live before/after comparison. |
| Career families and title coverage | Implemented | 10 described families and all 118 titles parsed from the DOCX are in `data/career-role-catalog.json`; every title has its own target-role row and a link to one of 50 shared specialization profiles. |
| Shared role profiles | Implemented | Each profile includes starting prerequisites, core skills, tools, project briefs, interview focus, DSA and system-design expectations, and portfolio evidence. |
| Role explorer and recommendations | Implemented | `/careers` supports title/skill/tool search, family filters, interest-based suggestions, per-title curriculum status, and updating the user's target role. |
| Onboarding role selection | Implemented in source | The selector searches the full title list, links to the role explorer, and displays whether that exact title has an assigned track. |
| Role-to-curriculum mapping | Curated, partial | Eight titles map to relevant shared tracks: two web roles, three broad full-stack roles, and three Java roles. The other 110 titles use the core curriculum until a suitable specialist track is authored. |
| Existing detailed curricula | Retained | Three tracks contain 63 phases, 303 modules, 1,193 topics, and 614 project briefs. The generated roadmap assignment script no longer maps DevOps, Cloud, QA, or Data Analyst to unrelated tracks. |
| Role skills and readiness | Implemented in migration | The migration adds profile skills and tools to the shared technology catalog and seeds weighted `role_skill_requirements` for every target role so existing readiness calculations can use evidence. |
| Admin role management | Implemented in source | Admins can add profiles and titles, optionally map a title to a current published track, and activate or deactivate titles. Database writes are gated by admin RLS policies. |
| Existing user records and enrollments | Preserved by design | The migration updates role metadata and assignments only; existing user progress and active enrollments are not rewritten. This still needs staging verification. |
| User isolation, privacy, exports, deletion, mobile, and accessibility | Existing source retained; live checks open | The archive has relevant routes and source contracts. This pass did not establish deployed RLS behavior or run signed-in device/accessibility journeys. |
| Staging, production, and release | Not performed | Supabase credentials and deployment access were not configured. No migration was applied and no production data was changed. |

## Catalog and coverage facts

| Measure | Source result |
| --- | ---: |
| Career families | 10 |
| Requested job titles | 118 |
| Shared specialization profiles | 50 |
| Titles assigned a detailed shared track | 8 |
| Titles that fall back to the core curriculum | 110 |
| Detailed roadmap tracks | 3 |
| Detailed phases / modules / topics | 63 / 303 / 1,193 |
| Detailed project briefs | 614 |
| Legacy curriculum phases / topics / execution days | 21 / 375 / 324 |
| Ordered migrations after this work | 87, through `0087_career_role_catalog.sql` |

Exact requested titles are preserved as individual selectable target roles; related titles reuse a profile. The DOCX provides title lists, not a synonym dictionary, so the implementation does not invent employer-specific aliases. The profile groups are the explicit related-title mapping.

The three existing curricula are shared learning paths. They are not 118 bespoke, role-specific curricula. The explorer labels coverage per exact title and explains when a title receives the core curriculum.

## Database migration and application behavior

Migration 0078 now creates the three roadmap metadata rows before inserting its assignment foreign keys. Migration 0087 repeats those inserts idempotently for databases that already recorded 0078, then creates career-family, role-profile, and role records; preserves inactive legacy target-role rows; activates the 118 requested titles; adds admin-only writes; synchronizes readiness skills for admin-created roles; and corrects the legacy role assignments while leaving existing enrollments in place.

Regenerate deterministic catalog data with `npm run generate:career-role-catalog`; validate counts and relationships with `npm run validate:career-catalog`. The onboarding role query requires migration 0087 because it filters the new `target_roles.is_active` field.

## Verification and remaining gates

Run the checks recorded in [`test-report.md`](test-report.md) after the catalog implementation. Structural catalog validation must pass before packaging. The local Windows host previously blocked the final Next.js worker with `spawn EPERM`; a complete production build is still required on a supported runner.

Before calling the application production-ready:

1. Apply migrations to a dedicated staging Supabase project and verify the catalog row counts and current published track assignments.
2. Run onboarding for representative mapped and core-fallback titles, including a second user; verify the chosen curriculum and starting point.
3. Exercise admin/non-admin create, deactivate, and track-mapping permissions and cross-user RLS behavior.
4. Verify user target-role changes, exports, restore, deletion, public profile access, and owner continuity with test accounts.
5. Complete signed-in mobile, keyboard, screen-reader, performance, monitoring, backup, and restore checks.
6. Obtain subject-matter review of role-profile content and the three shared curricula; resolve the existing 112 advisory warnings where relevant.
7. Run a full production build and deployed smoke checks, then release through the project’s configured deployment process.

## Inputs

The DOCX references separate `zte-master-prompt.md` and career-expansion source files that were not present in the supplied ZIP. The attached DOCX contained the consolidated instructions and 118-title inventory, so the implementation used those provided contents rather than reconstructing absent files.

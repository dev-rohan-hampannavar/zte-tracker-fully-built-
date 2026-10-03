# Production readiness report

**Review date:** 2026-09-28  
**Scope:** supplied ZIP, implementation changes, and local checks. No live database or deployment account was available.

## Source snapshot

- Next.js 16.3.3, React 19.2.4, TypeScript, and Supabase client/SSR libraries.
- 50 application pages and 87 ordered SQL migrations after this work.
- Three shared detailed roadmap tracks: 63 phases, 303 modules, 1,193 topics, and 614 project briefs.
- Career explorer source catalog: 10 families, 50 shared role profiles, and all 118 job titles from the attached DOCX.
- Eight exact titles use one of the three detailed tracks; 110 titles use the core curriculum until a suitable track is authored.
- Legacy curriculum validation reports 112 advisory warnings.

## Implemented in source

- Searchable and filterable role explorer with interest-based family suggestions.
- Role profiles with prerequisites, core skills, tools, projects, interview focus, DSA/system-design expectations, and portfolio evidence.
- Role selection during onboarding and target-role updates from the explorer.
- Migration 0087 adds catalog tables, target-role activity state, RLS-protected admin writes, role-skill weights, and corrected track assignments.
- Admin UI to add shared profiles and titles, map a new role only to a published shared track, and activate/deactivate titles.
- Generator and validator commands for reproducible catalog data.
- Existing enrollment/progress records remain untouched by migration 0087.

## Career coverage limits

The catalog covers the exact requested titles and explains the 50 shared-profile groupings. It does not create 118 different specialist curricula. Three authored tracks remain available; only eight titles are mapped to them, and 110 roles fall back to the core curriculum. That is displayed in onboarding and the explorer. The DOCX does not supply a synonym dictionary, so no extra employer-specific aliases were invented.

The role profiles are curated guidance, not a promise about every employer's requirements. Expert review is still needed for the role content and existing curricula. Skill requirements connect to the existing readiness engine, but live scoring behavior depends on the migration and staging evidence.

## Security and data

Migration 0087 gates catalog writes with `public.is_admin()` and keeps catalog reads authenticated. User target-role changes upsert the signed-in user's onboarding row under existing row ownership policies. Source code does not prove deployed RLS behavior. No live cross-user, admin, owner-continuity, export/restore, deletion, or public-profile journey was run.

No production migration was applied. Existing user enrollments and progress were not rewritten in source SQL. Verify that behavior in staging before release.

## Release gates

1. Review and apply migration 0087 in staging; confirm 10 families, 50 profiles, 118 active roles, skill weights, and the eight shared-track assignments.
2. Test onboarding and target-role changes for mapped and core-fallback roles using separate accounts.
3. Test admin and non-admin catalog writes, published-track assignment rules, user isolation, and public-profile privacy.
4. Test owner continuity, export/restore, and account deletion on staging data.
5. Complete mobile, keyboard, screen-reader, performance, monitoring, backup, and restore review.
6. Resolve or explicitly accept the 112 legacy curriculum warnings after subject-matter review.
7. Run a complete production build and deployed smoke checks on a supported runner.

**Release status:** Not production-ready until staging and deployment gates pass. The local Windows host previously compiled the app but failed to start the final Next.js TypeScript worker with `spawn EPERM`; see [`test-report.md`](test-report.md) for current checks and limitations.

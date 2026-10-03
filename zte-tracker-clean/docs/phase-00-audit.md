# Phase 0 — Audit + Foundation

## 1. What this app already is

ZTE Tracker is **not a prototype** — it's a mature, near feature-complete
Next.js 16 / React 19 / TypeScript / Tailwind v4 / Supabase (Postgres + Auth
+ RLS) application, built over multiple prior stages (see `CHANGELOG.md`,
`P7-CHANGELOG.md`, `STAGE_*_CHANGELOG.md`, `DECISIONS.md`). Those documents
already record a stage-by-stage build and verification history — this audit
cross-checks that history against the actual code rather than re-deriving it
from scratch.

**41 routes**, **39 SQL migrations**, **55 tables**. Auth is Supabase
magic-link/OTP (no passwords), gated centrally in `(app)/layout.tsx`.

## 2. Feature inventory vs. the requested phase roadmap

Almost every phase in the requested 12-phase plan already has a real,
working implementation. Summary:

| Requested phase | Existing route(s) | Status |
|---|---|---|
| Daily Operating System | `/daily-plan`, `/dashboard` | **Partial** — `daily-planner.ts` generates a prioritized task list (deadlines → weak skills → revision → projects → interview prep → learning) from live data, and adapts available time using historical completion rate. It does **not** yet support start/pause/complete/actual-time-logging per task, or an end-of-day planned-vs-actual review. This is real Phase 1 scope, not done yet. |
| Roadmap intelligence | `/roadmap`, `/dependency-graph`, `/roadmap-diff` | **Built** — prerequisite/lock logic, phase readiness score, "Current Position" (current phase → next topic → next stage → next phase → next exit point), hours→schedule calculator. Explicit override for locked topics exists. |
| DSA + revision | `/dsa`, `/revision` | **Built** — `dsa_progress`, `exercise_progress`, `difficulty_ramp` tables; spaced-revision tiers (`0005_revision_tiers.sql`, `skill_freshness_config`) with due/overdue/mastered states. |
| Project engine | `/projects`, `/clientsync`, `/portfolio`, `/portfolio/ideas` | **Built** — three deliberately distinct views (capstone tracker, deployed-project dashboard, SaaS idea bank), each with github/deployment/screenshot/status fields, verified non-overlapping in `CHANGELOG.md`. |
| GitHub integration | `/developer-activity`, `/api/github-activity` | **Built** — reads `github_username` from the caller's own `user_settings` (RLS-scoped, no cross-user probing), pulls public event breakdown server-side. |
| Career + applications | `/career`, `/companies`, `/companies/[id]` | **Built** — `career_tracker`, `job_application_crm` (`0031`), `companies` with per-company detail pages. |
| Interview prep | `/interview-prep`, `/interviews` | **Built** — `interview_questions`, `interview_rounds`, `interview_attempts` (`0034_interview_prep_engine.sql`) — a real engine, not a static list. |
| Resume + portfolio | `/resume` | **Partial** — exists as a text-based builder (plain-text Blob export). Multi-profile variants (Frontend/Full-stack/Backend/JS) and pulling live tracker data into portfolio-readiness checklists are not yet built — real Phase 8 scope. |
| Job readiness | `/job-readiness` | **Built** — route exists; needs verification in a later phase that it's category-based (not a single %) per the spec, and that "next 5 actions" surfaces from live evidence. |
| Architecture/knowledge | `/architecture`, `/technologies`, `/technologies/[id]` | **Partial** — architecture manifest viewer exists (`scripts/generate_architecture_manifest.py`). Technology detail pages are explicitly noted in `P7-CHANGELOG.md` as blocked on a missing tech taxonomy — real gap, honestly flagged by the prior work rather than faked. |
| Search + notifications | — | **Not yet built.** No `cmdk`-based global Ctrl+K search wired up yet despite the dependency being installed. `notification_dismissals` table exists but there's no evidence of a general notification-due engine spanning revision/interviews/applications/DSA together — real Phase 11 scope. |
| Public profile | `/u/[slug]`, `/api/public/[slug]` | **Built** — `0003_public_profile.sql` + `0021_public_profile_showcase.sql`, includes an OG image route (`/u/-/opengraph-image`). |

**Conclusion:** most of Phases 2–7 and part of 12 are already substantially
done. The real remaining work is concentrated in: Phase 1 (execution
tracking, not just a suggestion list), Phase 8 (resume profiles + portfolio
readiness checklist), Phase 10 (tech taxonomy — honestly unresolved by prior
work), and Phase 11 (universal search + unified notifications).

## 3. Database

55 tables, RLS-scoped throughout, 33 explicit index statements across
migrations, foreign keys used consistently. No duplicate-entity tables were
found (e.g. `advanced_projects` vs `stage_projects` vs `clientsync_milestones`
are confirmed distinct concerns in `CHANGELOG.md`, not redundant tracking of
the same thing). Migrations are sequential and additive — no destructive
rewrites found. This area does not need foundation-phase changes.

## 4. Design system

Shared `src/components/ui/*` (Radix-based: dialog, dropdown, tabs, select,
switch, progress, accordion, etc.), consistent `Card`/`Button`/`Badge`
primitives used across every route inspected, shared motion primitives
(`FadeUp`, `StaggerContainer`). Logo/icon usage was already unified in a
prior decision (`DECISIONS.md`, 2026-08-16). No inconsistent component
patterns found that would justify a foundation-phase change.

## 5. Checks run this phase

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint .` → 1 warning (unused `_req` param in
  `api/github-activity/route.ts`) → **fixed**.
- `npm run build` (production, Turbopack, real `.env.local` against the
  live Supabase project already checked into the repo) → **succeeds**, all
  41 routes compile (`ƒ` dynamic / `○` static as expected — no broken
  routes).

## 6. Foundation fixes made this phase

Kept deliberately small, per the instruction not to rewrite working code:

1. **`src/middleware.ts` → `src/proxy.ts`.** Next.js 16.2 deprecates the
   `middleware` file convention in favor of `proxy` (build emitted an
   explicit deprecation warning). Renamed the file and its exported function
   (`middleware` → `proxy`); the Supabase session-refresh logic it calls
   (`src/lib/supabase/middleware.ts`) is untouched — that's an unrelated
   helper module, not the file-convention entry point, so it keeps its name.
   Verified with a full rebuild afterward.
2. **Removed an unused import/param** in `api/github-activity/route.ts`
   (`NextRequest` / `_req`) that ESLint flagged — the route doesn't use the
   incoming request, it derives everything from the authenticated session.

Nothing else was changed. No schema changes, no component rewrites, no
dependency upgrades — none were justified by what the audit found.

## 7. Known gaps / technical risks for future phases

- **Tech taxonomy is genuinely missing** (flagged honestly in
  `P7-CHANGELOG.md`, confirmed still true). `/technologies` pages need this
  before they can be more than a shell — Phase 10 will need to decide
  whether to derive it from seed data (`topic_technologies`,
  `project_skills`) or introduce a small curated mapping table.
- **Daily execution loop is a plan, not a tracker.** `daily-planner.ts`
  recommends tasks; there's no `daily_logs`-backed start/pause/complete/
  actual-minutes flow wired to the UI yet, despite `daily_logs` and
  `study_sessions`/`focus_sessions` tables already existing — Phase 1 should
  connect the recommendation engine to those tables rather than adding new
  ones.
- **Resume is single-profile, plain-text.** Multi-profile resume variants
  sourced from one underlying dataset (Phase 8) will need a small new table
  (e.g. `resume_profiles`) rather than duplicating project/skill data.
- **No unified notification engine.** `notification_dismissals` exists but
  nothing currently aggregates "revision due + interview tomorrow + weekly
  target behind + application follow-up due" into one feed — Phase 11 scope.
- **Correction (found during Phase 2 work):** a global Ctrl/⌘+K search
  (`src/components/layout/global-search.tsx`, cmdk-based) already exists
  and covers phases, topics, exercises, projects, exit-ladder,
  clientsync, companies, skills, and journal — the "No global search UI"
  line below was wrong; corrected here rather than silently deleted, so
  the original audit's miss stays visible.
- ~~No global search UI despite `cmdk` already being a dependency~~ —
  incorrect, see correction above.
- **Middleware→proxy rename (fixed this phase)** was the only structural
  deprecation risk found; no other Next 16 / React 19 API deprecations
  surfaced during the build.

## 8. Planned database changes for future phases (not made yet)

- Phase 1: none required — reuse `daily_logs`, `study_sessions`,
  `focus_sessions`.
- Phase 8: add `resume_profiles` (role label + selected project/skill IDs),
  extend `advanced_project_progress`/`project_progress` with the specific
  portfolio-readiness flags (`has_tests`, `has_case_study`,
  `has_performance_metrics`, `has_demo_video`) if not already present under
  different names — needs a closer read of those two tables' current
  columns before deciding to add vs. reuse.
- Phase 10: either a small `technologies` taxonomy seed (the table already
  exists — `0011_technologies.sql` — it's the *data* that's missing, not the
  schema) or a derived view over `topic_technologies` + `project_skills`.
- Phase 11: no new tables strictly required; `notification_dismissals`
  already supports a "mark seen" pattern that a unified feed can reuse.

## 9. Roadmap for subsequent phases

Given how much is already built, subsequent phases should be scoped as
**verification + the specific gap** rather than full builds, mirroring how
`P7-CHANGELOG.md` already operates ("found already built" is a valid, common
outcome). Suggested order, adjusted from the original request to match
actual remaining work:

1. **Phase 1** — Daily Operating System: wire start/pause/complete/actual-time
   to `daily_logs`/`study_sessions`, add end-of-day planned-vs-actual review,
   carry-forward. This is the biggest genuine gap.
2. **Phase 2–7** — Verification passes against the spec's exact requirements
   (readiness-score formula, revision confidence scale 1–5, project health
   view fields, career pipeline stages) — fix only what's actually missing.
3. **Phase 8** — Resume multi-profile + portfolio-readiness checklist.
4. **Phase 9** — Job-readiness category verification (confirm no single %
   is shown anywhere).
5. **Phase 10** — Tech taxonomy decision + architecture explorer polish.
6. **Phase 11** — Global Ctrl+K search (`cmdk` already installed) + unified
   notification feed.
7. **Phase 12** — Public profile: verify it already reflects all the above
   once built.
8. **Final phase** — full integration + polish pass as originally scoped.

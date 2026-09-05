# Changelog

This file tracks work against `ZTE_Tracker_Execution_Plan_docx.md`'s Stage/Item
numbering specifically (Stage 0–7), separate from `P7-CHANGELOG.md` which uses
the original spec's own P7.0–P7.6 numbering. Each entry below names the exact
stage and item it closes, its status before and after, and what was actually
changed (or confirmed unchanged) in the code.

---

## 2026-08-26 — Phase 3: DSA + Revision Intelligence

**Scope:** the "Engineering Career Operating System" phased expansion,
Phase 3. Audited `/dsa`, `/revision`, `revision-schedule.ts`, and the
underlying `dsa_progress`/`topic_progress` schemas before writing
anything.

**Finding — revision needed no work:** the roadmap revision system
already implements the spec's exact ask. `revision-schedule.ts` has a
real 1-5 confidence scale (1 Forgot .. 5 Mastered, migration `0041`,
already shipped before this phase) that adjusts the next review interval
— a low rating repeats sooner and drops a tier, a 5 skips straight to
mastered — on top of the existing 1/3/7-day spaced schedule. The
Overdue/Due-soon/Mastered dashboard the spec asks for is also already on
`/revision`. Nothing here needed changing.

**Finding — DSA was a real gap:** `dsa_progress` was a plain checklist
(problem/difficulty/topic_tag/completed/notes). The DSA page's own
existing "weak areas" section had a comment explicitly stating it
computes completion rate instead of accuracy *because the schema has no
per-attempt history* — an honest flag of exactly what this phase needed
to fix, rather than something to silently work around.

**What changed:**
- `supabase/migrations/0042_dsa_intelligence.sql` — extends
  `dsa_progress` additively with `pattern`, `attempts`,
  `time_taken_minutes`, `hints_used`, `solution_viewed`, `mistakes`,
  `confidence` (same 1-5 scale as topic revision), and — mirroring
  `topic_progress` exactly — `revision_status`, `review_count`,
  `next_review_due`. Existing rows get safe defaults; nothing renamed or
  dropped.
- `src/lib/hooks/use-dsa.ts` — added `logDsaAttempt` (records the richer
  evidence fields) and `rateDsaConfidence` (reuses
  `revision-schedule.ts`'s interval math unchanged, so a DSA problem's
  "how well do I know this" behaves identically to a roadmap topic's,
  rather than a second scheduling algorithm).
- `src/lib/dsa-analytics.ts` (new) — pure functions: weakest patterns by
  *real* accuracy (not completion-rate proxy anymore, once `pattern` is
  logged), accuracy by difficulty, average solve time, recent mistakes,
  and `recommendNextDsaProblems` (overdue-for-revision first, then
  unsolved problems in the single weakest pattern, then oldest backlog
  item — each with a stated reason, never a random pick). Every metric
  only counts rows with real data for that field — no fabricated
  numbers where evidence doesn't exist yet.
- `src/app/(app)/dsa/page.tsx` — added a `pattern` field to the add-problem
  form, a confidence-rating picker (reusing the existing
  `ConfidencePicker` component from revision, unchanged) on solved
  problems, and a new "Analytics" tab: practice-next recommendations,
  avg solve time, accuracy by difficulty, weakest-patterns-by-accuracy,
  and recent mistakes.

**Not changed:** the existing completion-rate-based "weak areas" section
on the pattern tab — kept as-is since it's still valid for anyone not
yet using the new `pattern` field, and its own comment already correctly
described its limitation.

**Verified:** `npx tsc --noEmit` (0 errors), `npx eslint .` (0
warnings), `npm run build` (all 41 routes compile, no regressions).
Migration SQL statically validated (balanced syntax). **Could not be
executed against the live Supabase project from this sandbox** — apply
`0040`, `0041` (if not already applied), and `0042` via the Supabase SQL
editor before DSA confidence rating and analytics will work end-to-end.

**Known remaining gaps for later phases:** `mistakes` stays free text by
design (no fixed taxonomy — wrong-answer categories vary too much per
problem to enumerate meaningfully), so "most common mistakes" surfaces
recent entries rather than clustering them; DSA revision scheduling and
roadmap topic revision are still two separate due-lists (both feed
`/daily-plan` already via the existing revision-count logic, but there's
no single merged "due today" view across both yet).

---

## 2026-08-26 — Phase 2: Roadmap Intelligence + Planning Engine

**Scope:** the "Engineering Career Operating System" phased expansion,
Phase 2. Audited `/roadmap`, `/dependency-graph`, prerequisite locking,
the hours calculator, and anything week-scoped before writing anything.

**Correction to the Phase 0 audit:** that audit claimed no global search
existed. It does — `src/components/layout/global-search.tsx`, a
431-line cmdk-based ⌘K search already covering phases, topics, exercises,
projects, exit-ladder, clientsync, companies, skills, and journal. Fixed
in `docs/phase-00-audit.md` rather than silently corrected.

**Findings:**
- Prerequisite locking (`src/lib/topic-prerequisites.ts`,
  `use-topic-locking.ts`) was already real and complete: phase-level and
  topic-level locking, both derived from real progress data, plus an
  explicit "disable topic locking" override — no work needed here.
- The hours calculator (`hours-calculator.tsx`) computed a single
  completion date from one entered rate. The spec's scenario comparison
  (10/20/25 hrs/week side by side) did not exist.
- **No phase readiness score existed anywhere** — a genuine gap.
  `job-readiness` is a career-level page unrelated to per-phase roadmap
  readiness.
- Weekly planning existed only as a Sunday recap **email** (hours,
  topics, streak) — no in-app weekly review, and it didn't touch DSA,
  projects, revision, or blockers.

**What changed:**
- `src/lib/phase-readiness.ts` (new) — pure function computing a 0-100
  readiness score per phase from three real signals: topic completion
  (always available), revision confidence (from `topic_progress
  .revision_status`, only counted when a phase has completed topics with
  that field set), and time-estimate accuracy (`actual_minutes_spent` vs.
  `estimated_hours`, only counted when time data exists). Missing signals
  are excluded and their weight redistributed rather than treated as
  zero — avoids the "meaningless percentage" the spec explicitly warns
  against. A phase attempted before its prerequisite is done gets its
  score halved, not zeroed (work done is still work done).
- `src/components/roadmap/readiness-badge.tsx` (new) — compact badge on
  each phase card, hover text shows the component breakdown via a native
  `title` attribute (this design system has no Tooltip primitive, so this
  matches the existing pattern in `kanban-view.tsx` rather than
  introducing one).
- `src/app/(app)/roadmap/page.tsx` — wired the readiness badge onto the
  phase-card grid (both the top-level grid and the phase drill-down
  header).
- `src/components/roadmap/hours-calculator.tsx` — added a fixed
  10/20/25-hrs/week scenario comparison alongside the existing
  single-rate input (kept, still useful for a custom pace).
- `src/lib/weekly-review.ts` (new) — pure aggregation of the current
  Monday-Sunday week's `daily_plan_task_state` rows (the Phase 1
  execution table — already cross-domain: goals, revision, projects,
  interview prep, learning) plus `dsa_progress` (solved this week) and
  `daily_logs` (hours this week). No new table — a week's plan is just
  seven days of the rows Phase 1 already writes.
- `src/lib/hooks/use-daily-plan-task-state.ts` — added
  `useDailyPlanTaskStateRange` for the date-range query the weekly review
  needs (existing hooks only fetched a single day).
- `src/components/daily-plan/weekly-review-card.tsx` (new) — planned vs.
  actual completion %, topics/DSA/projects/revision counts, and a
  blockers list (tasks still incomplete by review time).
- `src/app/(app)/daily-plan/page.tsx` — renders the weekly review below
  the end-of-day review, computed Monday-through-today so it's useful
  mid-week, not just once Sunday arrives.

**Not changed:** the Sunday recap email (still useful as a passive
notification; not replaced, since it serves a different purpose — a
nudge outside the app — than the in-app review which needs the person to
open the app to see).

**Verified:** `npx tsc --noEmit` (0 errors), `npx eslint .` (0
warnings), `npm run build` (all 41 routes compile, no regressions). All
new logic reads existing tables only — no new migration this phase, so
nothing needs to be applied to Supabase before this works.

**Known remaining gaps for later phases:** the weekly review only covers
the current week (no history/browse-past-weeks view yet); phase readiness
doesn't yet factor in DSA performance for phases with DSA-heavy topics,
per the spec's "readiness ... DSA performance where relevant" — left out
because there's no existing link between `dsa_progress` rows and specific
phases/topics to draw that connection from without fabricating one.

---

## 2026-08-26 — Phase 1: Daily Operating System — execution tracking

**Scope:** the "Engineering Career Operating System" phased expansion,
Phase 1. Audited `/daily-plan`, `/dashboard`, and the focus-session/
study-session/daily-log stack before writing anything.

**Finding:** the prioritized recommendation engine
(`src/lib/daily-planner.ts`, deadlines → weak skills → revision →
projects → interview prep → learning) and the time-tracking stack
(`focus_sessions` → `study_sessions` → `daily_logs`, atomic start/pause/
resume/complete already built in migrations 0026/0028/0030) were both
already solid. The actual gap: a generated `PlanTask` has no database
identity — it's recomputed fresh every render — so there was no way to
mark one done/skipped, no memory of what carried over from yesterday, and
no end-of-day planned-vs-actual review anywhere in the app.

**What changed:**
- `supabase/migrations/0040_daily_plan_task_state.sql` — new
  `daily_plan_task_state` table (one row per user/day/task-slot,
  identified by a deterministic `task_key` computed client-side) plus two
  atomic RPCs: `complete_daily_plan_task` (mirrors
  `complete_focus_session`'s one-statement pattern) and
  `carry_forward_daily_plan_tasks` (idempotent, safe to call on every
  load). Deliberately does not duplicate time tracking — it optionally
  links to the `study_sessions` row that fulfilled a task rather than
  recording a second "hours worked" figure.
- `src/lib/daily-planner.ts` — `PlanTask` gained `naturalKey` (stable
  identity across re-renders) and `activity`/`topicId`/`stageProjectId`
  (so a task can start a real focus session, not just link away to
  another page).
- `src/lib/hooks/use-daily-plan-task-state.ts` (new) — start/complete/
  skip/undo helpers plus the SWR hook that carries yesterday's unfinished
  tasks forward on load.
- `src/components/daily-plan/plan-task-row.tsx` (new) — per-task Start/
  Done/Skip/Undo controls; "Start" begins a real `focus_sessions` timer
  against the task's linked topic/project when one exists.
- `src/components/daily-plan/end-of-day-review.tsx` (new) — completed vs.
  skipped vs. carrying-forward, plus today's logged hours read straight
  from `daily_logs` (never recomputed separately, so it can't disagree
  with the dashboard's own hours figure).
- `src/app/(app)/daily-plan/page.tsx` — rewired to use the above.
- `src/types/database.ts` — added `DailyPlanTaskState`/`DailyPlanTaskKind`
  types and registered the table in the `Database` interface.
- `src/app/api/github-activity/route.ts` — dropped an unused
  import/param left over from Phase 0's lint pass.
- `src/middleware.ts` → `src/proxy.ts` (Phase 0, Next 16.2 file-convention
  rename) carried forward unchanged.

**Not changed:** the recommendation engine's priority ordering, the
dashboard's existing "Recommended next action" card and 3-task preview
(already correct, untouched), and the entire focus-session/study-session/
daily-log pipeline (reused as-is, not modified).

**Verified:** `npx tsc --noEmit` (0 errors), `npx eslint .` (0 warnings),
`npm run build` (all 41 routes compile). The new migration was validated
statically (balanced syntax, every referenced table/function confirmed to
already exist) but **could not be executed against the live Supabase
project from this environment** — that host isn't reachable from this
sandbox's network egress. Run `supabase/migrations/0040_daily_plan_task_state.sql`
via the Supabase SQL editor before this feature will work end-to-end.

**Known remaining gaps for later phases:** the review card only covers
today (no historical "yesterday" or weekly rollup view yet — could reuse
`useDailyPlanTaskStateForDate` for that later); tasks with no linkable
`activity` (goal-deadline nudges) can only be marked done/skipped, not
timed, which is correct behavior, not a bug, but worth noting so it isn't
"fixed" by mistake later.

---

## 2026-08-04 — Session: 4 Stage 7 verification items

### 1. Stage 7 — Item 16: Learning Path Visualizer — confirm GPS-style framing

**Plan's execution step:** *"Read `dependency-graph/page.tsx` in full; confirm
it presents Current → Next Topic → Next Stage → Next Phase → Next Exit Point
as a linear path, not just a graph."*

**Status before:** Unverified
**Status after:** Built

**Finding:** Page existed but only rendered the full static phase ladder
(grouped by band, with progress dots and exit-point flags) — no "you are
here" / "what's next" summary of the kind the item describes.

**What changed** — `src/app/(app)/dependency-graph/page.tsx`:
- Added a "Current Position" card above the ladder.
- Derives, from data already loaded by `usePhasesWithProgress` (no new
  queries, no new tables):
  - **Current phase** — first phase with incomplete topics
  - **Next topic** — first incomplete topic in that phase, by `order_index`
  - **Next stage** — the stage that topic belongs to
  - **Next phase** — the phase after the current one, by `order_index`
  - **Next exit point** — nearest upcoming phase with `exit_point_code` set
- Handles the "everything complete" edge case with its own message.

---

### 2. Stage 7 — Item 7: ClientSync fields — final confirmation

**Plan's execution step:** *"Re-open `/clientsync` after Stage 0 changes ship
and confirm all six requested fields render per phase."* (Field list from the
Stage 0 item this depends on: GitHub repo, live deployment, screenshots,
completion % per phase.)

**Status before:** Unverified
**Status after:** Verified — no gap found, no code changed

**Finding:** Audited `src/app/(app)/clientsync/page.tsx` (365 lines) field by
field against the plan's list and the seeded `clientsync_milestones` table.
All requested fields are present and already wired to
`upsertProjectProgress`:
- `status` (not started / in progress / completed)
- `github_url`
- `deployment_url`
- `demo_url` (extra, beyond the plan's list)
- `notes` (extra, beyond the plan's list)
- `screenshots` (add/remove, stored as an array)
- Per-phase completion % (`phaseCompletionPct`, driven by topic completion)

**What changed:** Nothing. This item was already fully built.

---

### 3. Stage 7 — Item 36: Portfolio Dashboard vs. Portfolio Projects — resolve overlap

**Plan's execution step:** *"Confirm whether `/projects` ... is meant to be
the same page as `/portfolio` ... or a second, distinct view — clarify before
building anything new here to avoid duplicating work."*

**Status before:** Unverified
**Status after:** Verified — three distinct routes, no overlap, no code changed

**Finding:** Read all three routes in full and confirmed each has a
genuinely separate data source and purpose:
- **`/projects`** — capstone/stage-project tracker: GitHub/deployment/status
  per phase-linked project, plus dependency chips derived from stage/topic
  order.
- **`/portfolio`** — summary dashboard of deployed capstones (GitHub links,
  live demos, completion %), reading the same `project_progress` data as
  `/projects` but presented as a rollup, not an editor.
- **`/portfolio/ideas`** — the ~10 seeded SaaS project ideas, backed by a
  separate `advanced_projects` table and its own `advanced_project_progress`
  tracking table.

**What changed:** Nothing. No duplication — the three routes were correctly
scoped from the start.

---

### 4. Stage 6 — Certificate PDF generation

**Plan's execution step:** *"Use the existing PDF generation pattern (the app
already creates downloadable files elsewhere) to generate a simple
certificate PDF on Stage/Phase/Exit Point completion, including the person's
name (from `user_settings.display_name`), the milestone title, and the
completion date. Trigger generation from a 'Download certificate' button
shown once a stage/phase/exit point reaches 100%."*

**Status before:** Not built (plan listed this under Stage 6, "safe to defer
indefinitely" — pulled forward and completed as part of this session's scope)

**Status after:** Built

**Correction to the plan's premise:** The plan assumes an existing PDF
generation pattern in the codebase. There isn't one — `package.json` had no
PDF library at all, and the only prior "download" button
(`resume/page.tsx`) generates a plain-text `.txt` Blob, not a PDF. This item
needed a new dependency and a real generator, not a copy of an existing
pattern.

**What changed:**
- Added `jspdf` as a dependency.
- New `src/lib/certificate.ts` — client-side landscape A4 certificate
  generator (recipient name, milestone title, optional subtitle, completion
  date), triggers a direct browser download. No server round trip, no new
  schema.
- New `src/lib/hooks/use-display-name.ts` — small SWR hook that reads
  `user_settings.display_name`, kept separate from the fuller Settings-page
  hook since certificate generation only needs the one field.
- `src/app/(app)/roadmap/page.tsx` — added a "Certificate" button to each
  phase's accordion header, shown only when `completedCount === totalCount`
  for that phase's topics.
- `src/app/(app)/exit-ladder/page.tsx` — added a "Certificate" button to each
  rung, shown only when `rung.status === "complete"`.

---

## Verification (all 4 items, this session)

- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on all touched files — clean.
- `npm run build` — full production build succeeds; all 29 routes compile,
  including `/dependency-graph`, `/roadmap`, and `/exit-ladder`.

---

## 2026-08-04 — Session: Stage 5, Item 49 — Import / Export (import half)

**Plan's execution step:** *"Add an export function (client-side): serialize
the person's own `topic_progress`, `daily_logs`, `topic_notes`, and
`project_progress` rows to JSON, download via browser. Add a matching import
function that upserts a previously-exported JSON file back in, with a clear
warning about overwrite behavior before it runs."*

**Status before:** Partial — export existed (JSON + CSV in Settings) but only
covered `phases` (nested/derived, not a raw table), `daily_logs`,
`dsa_progress`, `career_tracker`. `topic_notes` and `project_progress` were
missing from export entirely, and there was no import at all.

**Status after:** Built

**What changed** — `src/app/(app)/settings/page.tsx`:

- **Export, corrected:** `exportJSON` now writes a flat, versioned payload
  (`export_version`, `exported_at`) keyed by table rather than by UI shape:
  `topic_progress` (flattened out of `phases[].topics[].progress`, joined
  with `topic_id`), `daily_logs`, `topic_notes` (newly added — was missing
  from the old export), `project_progress` (newly added — was missing from
  the old export), `dsa_progress`, `career_tracker`. This closes the gap
  between the plan's requested field list and what was actually being
  exported.
- **Import, new:** an "Import JSON" button opens a dialog that:
  - Parses the selected file client-side and shows a per-domain row count
    preview before anything is written.
  - Shows a clear, explicit overwrite warning, as the plan requires, before
    the import can run.
  - On confirm, upserts each domain back in using the same helpers/conflict
    keys the rest of the app already writes with, so an import behaves like
    the person redoing those actions by hand:
    - `topic_progress` → `updateTopicProgress` (per row, `user_id,topic_id`)
    - `daily_logs` → raw upsert on `user_id,date` (not the narrower
      `logStudySession`/`saveJournalEntry` helpers, which merge into today's
      row by design — import needs to restore historical dates as-is)
    - `topic_notes` → raw upsert on `id`
    - `project_progress` → `upsertProjectProgress` (per row, `user_id,phase_id`)
    - `dsa_progress` → raw upsert on `id` (not `addDsaProblem`, which always
      inserts and would duplicate every problem on re-import)
    - `career_tracker` → raw upsert on `id`
  - Reports a row-failure count if any individual upsert fails, rather than
    failing the whole import silently.
  - Re-validates all six local SWR caches (`mutateProgress`, `mutateLogs`,
    `mutateNotes`, `mutateProjects`, `mutateDsa`, `mutateCareer`) after a
    successful import so the UI reflects restored data immediately.

**No schema changes** — every domain already had a table and (for most) an
existing upsert-capable helper; import reuses those rather than introducing
new write paths.

## Verified

- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on `settings/page.tsx` — no new errors introduced (one
  pre-existing `react-hooks/set-state-in-effect` warning on an unrelated,
  untouched `useEffect` block remains, unchanged from before this session).
- `npm run build` — full production build succeeds, all 29 routes compile.

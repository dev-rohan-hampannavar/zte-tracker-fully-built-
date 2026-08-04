# Stage 2 — Navigation & Discovery — Completed

All 5 items in Stage 2 of `ZTE_Tracker_Execution_Plan_docx.md` are built and
verified in this package. Combined from individual session changelogs
below, in build order.

---

## Stage 2 — Item 24: Technology Pages — UI

**Status before:** Missing
**Status after:** Built

**What changed:**
- New `src/app/(app)/technologies/page.tsx` — list view (77 seeded technologies), search, grouped by category. Mirrors `companies/page.tsx` pattern.
- New `src/app/(app)/technologies/[id]/page.tsx` — detail view showing:
  - Every topic that references the technology (via `topic_technologies`, using existing `useTopicsForTechnology` hook), with phase context.
  - Stage projects from stages where the technology is used (no direct project<->technology link exists in the schema, so this is stage-level).
  - "Related Technologies" — co-occurrence within the same topics, ranked by frequency, not a hand-authored graph, per the plan's explicit instruction.
- `src/components/layout/sidebar.tsx` — added "Technologies" nav entry (Cpu icon) after Companies; `mobile-nav.tsx` picks it up automatically via the shared `NAV` export.

**No schema or hook changes** — Stage 0's `technologies`/`topic_technologies` tables, seed data (77 technologies, 101 joins), and `useTechnologies`/`useTechnology`/`useTopicsForTechnology` hooks already existed and were unused until now.

## Verified
- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on new/touched files — clean.
- `npm run build` — full production build succeeds, all 32 routes compile (30 previous + new `/technologies`, `/technologies/[id]`).
-e 
---

## Stage 2 — Item 23: Search Everything — extend coverage

**Status before:** Partial (Ctrl+K covered Phases, Topics, Exercises, Exit Points, ClientSync, Companies — missing Projects and Skills)
**Status after:** Built

**What changed** — `src/components/layout/global-search.tsx`:
- Added a `Command.Group heading="Projects"` block sourced from `roadmap.stageProjects` (already fetched by the existing `useRoadmap` hook — no new query), ~179 rows, each showing its parent stage title. Routes to `/projects` (no anchor — that page doesn't support per-project deep links, matching the existing ClientSync group's precedent of linking to the page rather than a specific row).
- Added a `Command.Group heading="Skills"` block sourced from `useSkillTracks()` (already existed, unused until now) — skill-track entries as defined in Reference. Routes to `/reference`.
- Projects group given the same empty-query preview cap (30, `+N more — type to search all N`) as Topics/Exercises, since ~179 unconditionally-mounted items is real DOM weight; Skills wasn't capped since skill-track counts are small.
- Updated the search input placeholder and the header comment describing group sizes/capping rationale to include the two new groups.

**No schema or hook changes** — `stageProjects` was already part of the `useRoadmap()` payload; `useSkillTracks` already existed and was only used on `/reference`.

## Verified
- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on `global-search.tsx` — no new errors introduced (one pre-existing `no-unused-vars` warning on `user` from `useUser()`, unchanged from before this session — that hook call predates this edit).
- `npm run build` — full production build succeeds, all 32 routes compile.
-e 
---

## Stage 2 — Item 20: Smart Filters — domain taxonomy

**Status before:** Partial (Band/Difficulty filters existed on `/roadmap`; no domain field in source data, confirmed in earlier audit)
**Status after:** Built

**What changed:**
- New `src/lib/domain-taxonomy.ts` — client-side heuristic that derives 0+
  domain tags per phase from its title, matched against 9 domains
  (Frontend/Backend/DevOps/Database/Testing/AI/Infrastructure/DSA/Career)
  using word-boundary keyword regexes (avoids false positives like "ai"
  matching inside "payments" or "api" inside "Apis"). Explicitly documented
  as inferred, not sourced — no domain field was fabricated in the schema.
  Verified against all 21 real phase titles: 3 legitimately get no tag
  (e.g. "TypeScript Mastery") rather than being force-fit into a bucket.
- `src/app/(app)/roadmap/page.tsx`:
  - Added a `domainFilter` state and a "Domain" `Select` alongside the
    existing Band/Difficulty filters.
  - Extended `filteredPhases` to also require a domain match when set.
  - Added domain badges (outline variant, `title` attribute noting they're
    inferred) next to the existing Band badge on each phase's accordion
    trigger — hidden below `lg` to avoid crowding on smaller screens,
    matching the existing responsive pattern for Band/hours.
  - Updated the "N of M phases match" helper line to note when domain
    filtering is active that the tag is inferred, not sourced.
  - Rewrote the stale comment above `filteredPhases` that previously said
    "band stands in for domain" — this item replaces that stand-in with a
    real, separate domain filter as the plan requires.

**No schema or hook changes** — domain is computed client-side from
`phase.title`, already present on every loaded phase; no new table or
column.

## Verified
- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on `roadmap/page.tsx` and `domain-taxonomy.ts` — clean, zero
  warnings or errors.
- `npm run build` — full production build succeeds, all 32 routes compile.
-e 
---

## Stage 2 — Item 27: Visual Roadmap — card-based view

**Status before:** Unverified (accordion-only, confirmed in code)
**Status after:** Built

**What changed** — `src/app/(app)/roadmap/page.tsx`:
- Added a List/Cards view toggle (segmented control, matching the app's
  existing filter-row styling) next to the Clear-filters button.
- New `PhaseCardGrid` component implementing the requested Career Ladder →
  Phase Cards → Stage Cards → Topic Cards drill-down:
  - **Phase Cards** (top level) — phase number, title, progress bar, Band
    and inferred-Domain badges (reusing Item 20's `inferDomains`), and a
    lock indicator + inline unlock link for locked phases, matching the
    List view's own lock UX.
  - **Stage Cards** (click a phase) — that phase's stages as cards with
    their own progress; phases with no stage breakdown fall through to
    rendering topics directly, same fallback the List/accordion view uses.
  - **Topic Cards** (click a stage) — reuses the existing `TopicRow`
    component as-is, so checkbox-toggle, bookmark, difficulty badge, and
    "open full page" behavior are identical between List and Card views —
    no duplicated topic-row logic.
  - Drill-down state (open phase/stage) is local to `PhaseCardGrid`, so
    switching back to List view doesn't affect List's own accordion state.
- Card view consumes the same `filteredPhases` the List view already
  computes — Band/Difficulty/Domain filters and search apply identically
  in both views, no separate filtering path.
- `isPhaseLocked` and `PREREQ_THRESHOLD` (both local to `RoadmapPage`) are
  passed down as props rather than duplicated, so prerequisite-lock logic
  has a single source of truth.

**No schema, hook, or data changes** — purely a new presentation layer over
`usePhasesWithProgress`, per the plan's explicit instruction that this is
additive, not a rewrite.

## Verified
- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on `roadmap/page.tsx` — clean, zero warnings or errors.
- `npm run build` — full production build succeeds, all 32 routes compile.
-e 
---

## Stage 2 — Item 54: Multiple Roadmap Views (Kanban / Calendar / Dependency)

**Status before:** Missing (only list/accordion + the Item 27 card view existed)
**Status after:** Built

**What changed:**

- **`src/components/roadmap/kanban-view.tsx`** (new) — Kanban board with
  Not Started / In Progress / Completed columns, cards = topics. "In
  progress" uses the plan's own heuristic: `actual_minutes_spent > 0` on an
  incomplete topic (the only per-topic signal for "touched but not done"
  without adding schema). Reuses the same toggle/open handlers as List and
  Cards views — no separate completion-write path.

- **`src/components/roadmap/calendar-view.tsx`** (new) — projects
  incomplete topics onto estimated weekly study-date buckets using the
  person's own `user_settings.weekly_goal_value`/`weekly_goal_type`
  (already set in Settings). Handles both goal types honestly: hours-based
  goals accumulate `estimated_hours` per topic against the weekly budget;
  topic-count goals bucket N topics/week instead of guessing an hours
  equivalent. Falls back to a labeled default (10 hrs/week) only when no
  goal is set, and the UI states plainly that this is a projection, not
  roadmap.md content (roadmap.md defines no calendar dates).

- **`src/components/roadmap/learning-path-view.tsx`** (new) — the
  Dependency Graph's band-grouped sequence + "Current Position" card,
  extracted out of `dependency-graph/page.tsx` into a reusable component
  that takes `phases` as a prop instead of fetching its own data. This is
  the literal reuse the plan asks for ("Reuse the Dependency Graph...as the
  fifth view") rather than a second, drifting copy of the same logic.
  `src/app/(app)/dependency-graph/page.tsx` is now a thin wrapper around
  this component — its own route, heading, and behavior are unchanged.

- **`src/lib/hooks/use-user-settings.ts`** (new) — `useUserSettings`,
  extracted from a private helper that lived inside `settings/page.tsx`
  (same SWR key, so no cache fragmentation) so the Calendar view can read
  the same weekly-pace setting without duplicating the query or inventing
  a second settings source. `settings/page.tsx` now imports this instead
  of defining its own copy.

- **`src/app/(app)/roadmap/page.tsx`** — the Item 27 List/Cards toggle is
  now a 5-way toggle: List / Cards / Kanban / Calendar / Path. All five
  consume the same `filteredPhases` the page already computes, so Band /
  Difficulty / Domain filters and search apply identically across every
  view — no per-view filtering logic.

**No schema changes** — Kanban's "in progress" signal, Calendar's pace
source, and Path's sequence all read fields that already existed
(`actual_minutes_spent`, `weekly_goal_value`/`weekly_goal_type`, phase/stage
`order_index`).

## Verified
- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on all new/touched files — clean, except one pre-existing
  `react-hooks/set-state-in-effect` error in `settings/page.tsx` on a
  `useEffect` block I did not touch (only the hook call one line above it
  changed from a local `useSettings` to the shared `useUserSettings`) —
  this block was already flagged as a warning in an earlier session's
  CHANGELOG entry and is unrelated to this work.
- `npm run build` — full production build succeeds, all 32 routes compile.

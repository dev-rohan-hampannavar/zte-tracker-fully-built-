# Stage 3 — Learning Mechanics — Completed

All 3 items in Stage 3 of `ZTE_Tracker_Execution_Plan_docx.md` are built in
this package.

**Verification note:** this session's sandbox had no network access (the
egress proxy denied all outbound requests, confirmed via a direct `curl` to
the npm registry — `403 host_not_allowed`), so `npm install`, `npx tsc
--noEmit`, `npx eslint`, and `npm run build` could not be run here, unlike
every prior stage's changelog. Everything below was reviewed by hand
instead: brace/paren balance was checked across every touched file, every
new import was traced to a real usage, every new hook call was checked
against React's rules of hooks, and every prop threaded through a component
tree was checked at each call site. That's a real substitute for careful
reading, not for the compiler — **run the standard verification pass
(`npm install`, `npx tsc --noEmit`, `npx eslint`, `npm run build`) before
treating this as shippable**, the same way every earlier stage's changelog
recorded a clean run of all four.

---

## Stage 3 — Item 34: Prerequisite Locking — topic level

**Status before:** Missing (only phase-level locking existed, gated on 50%
of the previous phase's topics)
**Status after:** Built

**What changed:**

- **`src/lib/topic-prerequisites.ts`** (new) — `isTopicLocked` and
  `computeStageTopicLocks`, the single source of truth for topic-level
  locking. A topic's prerequisite is derived from `order_index` within its
  stage at read time (topic N requires topic N-1 in the same stage to be
  completed) rather than stored as a second column that could drift out of
  sync with `order_index`. Scope is intra-stage only — the first topic of a
  stage is never topic-locked (phase-level locking is the separate,
  pre-existing mechanism for that), and topics with no `stage_id` (phases
  with no stage breakdown) are never topic-locked.

- **`supabase/migrations/0015_topic_lock_override.sql`** (new) — adds
  `user_settings.topic_locking_disabled boolean not null default false`,
  following the exact pattern of `0007_developer_mode.sql`.

- **`src/types/database.ts`** — added `topic_locking_disabled` to the
  `UserSettings` interface.

- **`src/lib/hooks/use-topic-locking.ts`** (new) — `useTopicLockingDisabled`,
  a persisted per-user toggle mirroring `useDeveloperMode`'s local-first /
  lazily-synced pattern (instant from localStorage, synced to
  `user_settings` once a user is known). Kept as its own dedicated hook
  rather than folded into `useUserSettings` so call sites that only care
  about this one flag don't pull in the whole settings row.

  This is a **separate, persisted** setting from the pre-existing
  `unlockedOverride` local state on the roadmap page, which is a
  per-session "unlock this one locked phase for now" click, not a global
  toggle — the plan's "extend it to topics" is implemented as this new
  dedicated persisted setting instead, since the local click-state has
  different semantics (per-phase, per-session) than what a topic-locking
  disable switch needs (global, persisted).

- **`src/app/(app)/settings/page.tsx`** — added a "Topic locking" card with
  the disable toggle, directly below Developer mode, using the same
  `Switch`/`Label` pattern.

- **`src/app/(app)/roadmap/page.tsx`**:
  - `TopicRow` now accepts a `lockInfo` prop: renders a lock icon +
    "Requires: X" (hidden below `sm`, matching the row's existing
    responsive pattern for other secondary info), disables the checkbox,
    and disables the open-topic click.
  - `StageBlock` computes `computeStageTopicLocks(stage.topics)` (skipped
    entirely when the override is on) and passes each topic's lock info
    down to `TopicRow`. Also now accepts and threads a `technologies` prop
    (see Item 19 below) into its own stage-project list.
  - `PhaseCardGrid`'s two topic-rendering branches (Stage Cards → Topic
    Cards drill-down, and the no-stage-breakdown fallback) both wire up
    the same lock computation — locking behaves identically in List and
    Cards view.
  - Top-level `RoadmapPage` reads `useTopicLockingDisabled` once and
    threads it to every view.

- **`src/app/(app)/roadmap/topic/[id]/page.tsx`** — the standalone topic
  detail page now computes its own lock state (building the topic's stage
  siblings as `TopicWithProgress[]` from the already-fetched `roadmap` +
  `progress` data, the same shape `usePhasesWithProgress` builds but scoped
  to just the one stage). Shows a "Requires: X" badge next to the title, a
  warning-toned explanation card with a link to Settings, and disables the
  completion checkbox — `handleToggleComplete` now no-ops when locked.

- **`src/components/roadmap/kanban-view.tsx`** — computes a lock map across
  all phases/stages (Kanban flattens topics out of their phase/stage
  grouping, so locks are computed per-stage across every phase up front).
  Locked cards get `opacity-60`, a disabled checkbox, a disabled open
  button, and a small "Requires: X" line.

- **Deliberately out of scope:** `CalendarView` and `LearningPathView` have
  no completion-toggle UI at all (Calendar only opens the detail sheet;
  Path is a passive sequence display), and the shared `TopicDetailSheet`
  component has no completion toggle of its own either — so there was
  nothing to lock in any of the three. Opening the sheet or the topic
  detail page for a locked topic is harmless; the actual completion
  controls are what's gated.

## Stage 3 — Item 22: Realistic Hours Calculator — interactive

**Status before:** Partial (static `weekly_pace_options` table only)
**Status after:** Built

**What changed:**

- **`src/components/roadmap/hours-calculator.tsx`** (new) — numeric
  hrs/week input; computes the person's own remaining hours (total minus
  completed, both summed from `estimated_hours` across their topics — the
  same computation Statistics already uses for its "Completed
  hours"/"Remaining hours" figures) divided by the entered rate, and shows
  a projected completion date. Falls back to
  `roadmap_metadata.total_realistic_hours` for the total when no per-topic
  progress has loaded yet (e.g. signed out), so the component degrades
  gracefully rather than showing zero.

- **`src/app/(app)/reference/page.tsx`** — added `usePhasesWithProgress`
  and `useUser` to compute the person's own total/completed hours, and
  rendered `<HoursCalculator>` immediately after the existing static
  "Choose your timeline" table, per the plan's explicit instruction to show
  it *alongside* the static table for comparison rather than replace it.

**No schema changes** — reads `estimated_hours` (already on every topic)
and `roadmap_metadata.total_realistic_hours` (already seeded), both
pre-existing fields.

## Stage 3 — Item 19: Project Dependencies Display

**Status before:** Missing
**Status after:** Built

**What changed:**

- **`src/lib/project-dependencies.ts`** (new) — `matchTechnologiesInText`,
  a whole-word case-insensitive matcher, longest-name-first (so e.g.
  "Next.js" matches before a shorter substring could steal it — the same
  ordering precaution `scripts/parse_roadmap.py`'s own regex alternation
  uses). Rather than hand-author a second TypeScript copy of the Python
  parser's `KNOWN_TECHNOLOGIES` allowlist — a second source of truth that
  could drift — this matches against the **live `technologies` table**
  (fetched via the already-existing `useTechnologies()` hook, the same
  data Technology Pages renders). If a technology is ever added to the
  allowlist and re-seeded, project dependency badges pick it up
  automatically with no second edit required anywhere in the frontend.

- **`src/app/(app)/projects/page.tsx`** — added a "Tech stack" badge row
  (accent-variant badges, distinct styling from the pre-existing
  "Requires:" badges) to both:
  - **Stage Projects tab** cards — matched against each project's own
    `description` text.
  - **Portfolio (capstone) tab** cards — matched against
    `phase.title + phase.description`, since capstone entries don't have
    their own separate project description field.

  This page already had a "Requires:" badge row from earlier work — but
  that's a *different* concept (topic/phase-ordering prerequisites, derived
  from `order_index`), not a technology-stack listing. The two are kept
  visually and semantically distinct rather than merged, so "Requires:
  Component Architecture" and "Tech stack: React, Supabase" don't get
  confused for the same kind of dependency.

- **`src/app/(app)/roadmap/page.tsx`** — `StageBlock`'s own compact
  stage-project list (the one shown inline in the accordion, separate from
  the dedicated `/projects` page) also got the same "Tech stack" badge
  treatment, fed by a `technologies` prop threaded down from `RoadmapPage`
  (fetched once via `useTechnologies()`, not re-fetched per `StageBlock`).

- **Deliberately out of scope:** `/portfolio` (Item 36's "Portfolio
  Dashboard") shows `phase.capstone`, which already surfaces via the
  Portfolio tab work above through `/projects`; no separate edit needed
  there since it doesn't render its own project description text.
  `/portfolio/ideas` (Item 8's ~10 Advanced Projects) already has its own
  proper, source-derived field for this — `AdvancedProject.skill_mapping`,
  a structured skill-to-phase mapping built in an earlier stage — so it was
  left untouched rather than adding a second, redundant tech-badge
  mechanism on top of an already-complete one.

**No schema changes** — matches against `stage_projects.description` /
`phases.title` + `phases.description` (all pre-existing) against the
already-seeded `technologies` table.

## Not verified this session

`npx tsc --noEmit`, `npx eslint`, and `npm run build` — blocked by no
network access in this sandbox (see note at the top of this file). Please
run all three before merging.

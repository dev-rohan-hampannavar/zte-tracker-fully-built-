# Stage 5 — Engineering OS / Productivity Layer — Completed

All five items in Stage 5 of `ZTE_Tracker_Execution_Plan_docx.md` are addressed
in this package. One (Item 49) turned out to already be fully built and is
documented rather than duplicated.

**Verification:**
- `npm install` — clean.
- `npx tsc --noEmit` — no errors.
- `npx eslint .` — no new errors introduced by this stage's changes. Full-repo
  lint still reports the same pre-existing `react-hooks/set-state-in-effect`
  errors flagged in the Stage 4 changelog (`use-theme.ts`, `use-topic-locking.ts`,
  `use-developer-mode.ts`, `topic-detail-sheet.tsx`, and a few others) — not
  introduced or touched this stage.
- `npm run build` — compiles clean, all 33 routes generated including the new
  `/workspace` route. Requires `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` at build time (same pre-existing requirement
  as Stage 4).

---

## Item 32 — Daily Mission Generator — full version

**Status before:** Partial (next topic + hours only)
**Status after:** Built

**What changed (`src/app/(app)/dashboard/page.tsx`):**
- Added `overdueRevisions` (reuses `isOverdue`/`next_review_due`, already on
  `topic.progress` from `usePhasesWithProgress` — no new fetch), a
  `nextDsaProblem` lookup, and a generated `missionOutcome` one-line summary
  combining next topic, overdue revision count, next DSA problem, and current
  project into a sentence like *"Finish 'X', review 2 overdue items, log 1 DSA
  problem (Y), push Z forward."*
- The Daily Mission card now shows a secondary row of three quick links
  (revision status, current project, next DSA problem) below the existing
  next-topic/mark-complete UI, plus the outcome line.

## Item 47 — Keyboard Navigation — full set

**Status before:** Partial (nav chords only, no page-level bindings)
**Status after:** Built

**What changed:**
- `src/app/(app)/roadmap/topic/[id]/page.tsx` — added `j`/`k` (next/previous
  topic, computed via a phase-order-then-topic-order-index global ordering),
  `x` (toggle mark-complete, respects the existing lock check), and `n`
  (focus the notes textarea, wired via a ref). All bindings skip when
  focus is in an input/textarea, matching the existing guard pattern in
  `shortcuts-help.tsx`. Added visible prev/next buttons in the page header
  as a non-keyboard affordance for the same navigation.
- `src/components/layout/shortcuts-help.tsx` — added a "Topic page" section
  listing the four new bindings, so they're discoverable via `?`.

## Item 52 — Smart Notifications — verify logic

**Status before:** Unverified — 3 of 5 named types existed
  (`revision_overdue`, `milestone_pending`, `ready_to_apply`); missing
  `project_inactive` and `exit_almost_ready` (90%).
**Status after:** Built — all five types now implemented.

**What changed (`src/lib/hooks/use-notifications.ts`):**
- Added `project_inactive`: an in-progress `project_progress` row with no
  `updated_at` change in 14 days (chosen threshold — commented in source).
- Added `exit_almost_ready`: an exit-ladder tier at ≥90% but <100% topic
  completion (the existing `ready_to_apply` logic only fired at exactly
  100%; both now share one loop over `exitLadder`).
- `src/components/layout/notification-bell.tsx` — added icon/color mappings
  for the two new kinds (`FolderGit2`/warning, `TrendingUp`/accent).

## Item 51 — Workspace (pin items)

**Status before:** Missing
**Status after:** Built

**What changed:**
- `supabase/migrations/0016_pinned_items.sql` — added `pinned_items jsonb`
  (default `[]`) to `user_settings`, holding up to 8
  `{type, id, label, pinned_at}` objects. A JSON column rather than a new
  table, matching the plan's "or" option and the precedent already set by
  `last_expanded_accordion` on the same table.
- `src/types/database.ts` — added the `PinnedItem` type and the
  `pinned_items` field on `UserSettings`.
- `src/lib/hooks/use-user-settings.ts` — added `pinItem`/`unpinItem`
  (fresh-read-then-upsert, avoiding races with stale hook data) and
  `isPinned`.
- `src/app/(app)/workspace/page.tsx` (new route, already linked from the
  sidebar) — resolves each pin against already-fetched data (topics via
  `usePhasesWithProgress`, projects via `project_progress` + phase title,
  milestones via `useClientSyncMilestones`) rather than storing derived
  state that could go stale; shows a status badge per item and an unpin
  action. Items whose source record no longer exists are shown greyed out
  rather than silently dropped.
- Pin/unpin buttons wired into `roadmap/topic/[id]/page.tsx`, `projects/page.tsx`,
  and `clientsync/page.tsx` so every pinnable entity type has an actual pin
  affordance at its source.

## Item 49 — Import / Export

**Status before (per plan):** Missing
**Actual status found:** Already fully built in `src/app/(app)/settings/page.tsx`
— broader than the plan's ask.

**Not rebuilt — documenting instead of duplicating:**
- **Export:** `exportJSON()` serializes `topic_progress`, `daily_logs`,
  `topic_notes`, `project_progress` (the plan's exact list) plus
  `dsa_progress` and `career_tracker` (two extra domains this app tracks
  that the plan's list predates) into a versioned (`export_version: 1`)
  JSON file, downloaded client-side via `Blob`/`createObjectURL`. A
  separate `exportCSV()` gives a flat per-topic progress view.
- **Import:** file picker → parse → preview dialog showing counts per
  domain → explicit confirm, with an upfront overwrite warning, before
  `runImport()` upserts each domain back in via the same helpers/conflict
  keys the rest of the app already writes with (so a re-import behaves
  identically to redoing those actions by hand).

No code changes were needed here; verified the feature against the plan's
four required domains (all present) and the "clear warning before overwrite"
requirement (present — confirmation dialog with `AlertTriangle` warning
before `runImport()` runs).

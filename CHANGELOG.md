# Changelog

This file tracks work against `ZTE_Tracker_Execution_Plan_docx.md`'s Stage/Item
numbering specifically (Stage 0–7), separate from `P7-CHANGELOG.md` which uses
the original spec's own P7.0–P7.6 numbering. Each entry below names the exact
stage and item it closes, its status before and after, and what was actually
changed (or confirmed unchanged) in the code.

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

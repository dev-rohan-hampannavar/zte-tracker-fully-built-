# Stage 7 — Verification Pass

Stage 7 has no new schema, no new routes, and no new UI. Its job is to close
out every item still marked **Unverified** in the plan by reading the actual
shipped code in full — not re-auditing from memory — and recording a
definite **Built** or a scoped follow-up. All three items below were closed
by direct file reads against the Stage 6 codebase; no code changes were
required because all three were already correctly implemented.

---

## Item 7 — ClientSync fields — final confirmation

**Status before:** Unverified (depended on Stage 0's ClientSync audit).
**Status after:** **Built.**

**What was checked:** `src/app/(app)/clientsync/page.tsx` in full (455
lines), against the plan's six requested fields — status, GitHub repo,
deployment URL, demo/video URL, screenshots, and completion % per phase.

**Findings, all present and wired to real Supabase writes via
`upsertProjectProgress`:**
- **Status** — a `Select` bound to `activeProgress?.status`, one of
  `not_started` / `in_progress` / `completed` (line 313).
- **GitHub repo** — `Input` bound to `github_url`, saved on blur (line 331).
- **Deployment URL** — same pattern, `deployment_url` (line 343).
- **Demo / video URL** — same pattern, `demo_url` (line 355), which slightly
  exceeds the plan's literal "screenshots" wording but matches the schema
  field already defined in `types/database.ts` and the original item's
  intent (visual proof of a working milestone).
- **Screenshots** — a repeatable URL list (`screenshots: string[]`) with
  add/remove UI and a live thumbnail grid (lines 399–444), not just a
  single-image field.
- **Completion % per phase** — `phaseCompletionPct()` (lines 101–106),
  computed from the same `topic_progress` data as the rest of the app
  (`done / total` topics in the linked phase), shown both as a numeric
  label and a `Progress` bar in the milestone dialog (line 308).

Confirmed against `src/types/database.ts:403-406` that all four URL/array
fields (`github_url`, `deployment_url`, `demo_url`, `screenshots`) exist on
the `project_progress` row type the page reads from — this isn't UI ahead
of schema.

No changes needed. Item 7 closes as Built.

---

## Item 16 — Learning Path Visualizer — confirm GPS-style framing

**Status before:** Unverified ("existing page may already cover this under
a different visual metaphor").
**Status after:** **Built.**

**What was checked:** `src/app/(app)/dependency-graph/page.tsx` (a thin
26-line wrapper) and the component it renders,
`src/components/roadmap/learning-path-view.tsx` (205 lines), in full.

**Finding:** The page already implements exactly what Item 16 asks for, and
does so more literally than the plan's own phrasing suggested. A dedicated
**"Current Position"** card (lines 82–137) renders a breadcrumb of
`Current Phase → Next Topic → Next Stage → Next Phase → Next Exit Point`,
each derived live from the same ordered phase/stage/topic progress data
used everywhere else in the app (`currentPosition` memo, lines 33–65) — no
separate computation, no fabricated dependency graph. Below that sits a
vertical band-grouped sequence of every phase (arrows between cards,
exit-point flags on the phases that have them), which is the "map" the GPS
framing sits on top of.

The component's own top-of-file comment already documents that it's shared
between this standalone route and the roadmap page's view-toggle (Stage 2,
Item 54), so this was also, incidentally, confirmation that the two
"visual roadmap" items didn't drift out of sync with each other.

No changes needed. Item 16 closes as Built.

---

## Item 36 — Portfolio Dashboard vs. Portfolio Projects — resolve overlap

**Status before:** Unverified (depended on Stage 1's Portfolio Projects
field audit; open question of whether `/projects` and `/portfolio` are the
same page described twice, or two intended routes).
**Status after:** **Resolved — not a conflict.** Three distinct routes,
each backed by a different data source, with no duplicated functionality:

| Route | Role | Data source |
|---|---|---|
| `/projects` | The **editable** form — status, GitHub/deployment/demo URLs, tech-dependency detection, notes — for every roadmap phase that has a capstone project | `project_progress` (one row per phase) |
| `/portfolio` | A **read-only rollup dashboard** of the same `project_progress` data: summary stat cards (total / completed / live / with-links) plus a card grid, each card linking back to `/projects` to edit | `project_progress`, joined against `phase.capstone` |
| `/portfolio/ideas` | The **10 advanced SaaS project ideas** from the roadmap's Part VII — a separate concept (things to consider building *after* the tracked capstones), each with its own detail page | `portfolio_projects` (a distinct table, via `useAdvancedProjects`) |

**Why this isn't overlap:** `/portfolio` and `/projects` render the same
underlying `project_progress` rows but serve different purposes —
dashboard-style overview vs. inline-editable form — the same
read/write split the rest of the app already uses elsewhere (e.g.
dashboard cards linking to their source pages). `/portfolio/ideas` reads
from an entirely separate table (`portfolio_projects`, its own status enum
including `considering` / `abandoned` that `project_progress` doesn't
have) and represents unstarted ideas, not tracked build progress — it was
never the same content as the other two under a different name.

Confirmed via direct read of all three page files
(`src/app/(app)/projects/page.tsx`,
`src/app/(app)/portfolio/page.tsx`,
`src/app/(app)/portfolio/ideas/page.tsx`) plus the two backing hooks
(`useProjectProgress` vs. `useAdvancedProjects`/`useAdvancedProjectProgress`
in `src/lib/hooks/use-projects.ts`) — this wasn't inferred from route names
alone.

No changes needed. Item 36 closes as Resolved (no duplicate work exists;
the three-route split is intentional and correctly separated by data
source).

---

## Stage 7 outcome

All three Unverified rows carried into this stage are now closed:

| Item | Before | After |
|---|---|---|
| 7 — ClientSync fields | Unverified | **Built** |
| 16 — Learning Path GPS framing | Unverified | **Built** |
| 36 — Portfolio route overlap | Unverified | **Resolved (no overlap)** |

No code, schema, or route changes were made in this stage — every finding
was a confirmation against already-shipped Stage 0–6 work, not a new gap.
With this pass complete, the plan's execution order summary
(Stages 0 → 7) is fully closed: every item across all 55 spec entries now
carries a definite status of Built, Resolved, or an explicitly scoped,
deliberately-deferred follow-up (documented in the Stage 5/6 changelogs —
optimistic UI retrofit and offline queued-writes, specifically), rather
than an open Unverified or silently-dropped item.

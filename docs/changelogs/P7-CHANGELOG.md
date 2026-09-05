# P7.0 — Part I Parser Extension (Reference + Onboarding unblocked)

Scope: **only** P7.0 from the priority doc — the foundation gap that blocked the
Reference page and full Onboarding sequence. Nothing else from P7.1–P7.6 is
included in this pass.

## What changed

**New parser:** `scripts/parse_roadmap_part1.py` parses Part I of `roadmap.md`
(lines ~1254–1986: Orientation → Why This Works → Roadmap Dashboards →
Navigation Layers → Timeline & Pacing Views) into `data/seed_part1.json`.

Extracted content:
- Overview, "Who Is This For", key note, job-market case, build-in-public guide
- Quick Start Checklist (10 steps), weekly pace options (6 rows), 19 phase
  mini-summaries, decision matrix + rule
- "Why This Works" failure-mode → mechanism table (7 rows)
- Master Phase Table (21 rows), hours breakdown (Learn/Problems/Project/
  ClientSync per phase), program total rollup, difficulty ramp (19 rows across
  4 bands), source discrepancies (10 flagged mismatches)
- Skill-track index (7 tracks), DSA-spine index, MVP fast-path
- Month-by-month pacing view (21 rows), phase checklist (21 rows)

**Merge step:** `scripts/merge_seed.py` folds `seed_part1.json` into the
existing `data/seed.json` under new top-level keys (`orientation`,
`why_this_works`, `dashboards`, `navigation`, `timeline`) and updates
`metadata` with new rollup counts.

**Schema:** `supabase/migrations/0004_part_one_reference.sql` adds 11 new
tables (all additive — nothing existing is altered or dropped), with the same
`static read` RLS pattern as the rest of the schema. `orientation`,
`why_this_works`, `master_phase_table`, and `navigation_notes` also get an
**anon** read policy, since the Onboarding page renders before login.

**Seeding:** `scripts/generate_seed_sql.py` was extended (not rewritten) to
also emit `supabase/seed_data_part1.sql` for the new tables. The pre-existing
gaps in this script (it doesn't cover stages/stage_projects/exercises/
capstones/clientsync/companies either) were **not** touched — out of scope
for P7.0, flagged here so it isn't mistaken for new breakage.

**UI:**
- `src/app/(app)/reference/page.tsx` — rebuilt. Was a stats-summary page;
  now a tabbed page (Orientation / Why This Works / Dashboards / Navigation /
  Timeline / Exit Ladder / Companies) rendering the real Part I prose and
  tables, not summarized figures.
- `src/app/welcome/page.tsx` — rebuilt. Was a 4-step generic stub; now a
  dynamic step sequence (up to 10 steps) driven entirely by the parsed
  Orientation data — overview, who it's for, the job-market case, why-this-
  works, build-in-public, the phase list, pace options, the fast path, and
  the quick-start checklist — falling back gracefully if any section is
  empty.
- `src/types/database.ts` — new interfaces for all 11 tables, registered in
  the `Database` type map; `RoadmapMetadata` extended with the new rollup
  columns.
- `src/lib/hooks/use-roadmap.ts` — one SWR hook per new table
  (`useOrientation`, `useWhyThisWorks`, `useMasterPhaseTable`,
  `useHoursBreakdown`, `useProgramTotal`, `useDifficultyRamp`,
  `useSourceDiscrepancies`, `useSkillTracks`, `useNavigationNotes`,
  `useMonthByMonth`, `usePhaseChecklist`).

## Verified

- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on all touched files — clean.
- `npm run build` — full production build succeeds; `/reference` and
  `/welcome` both compile as expected routes alongside all pre-existing pages.
- Parser output spot-checked field-by-field against the source markdown
  (dash characters, escaped parens, and a phase-header regex bug were caught
  and fixed this way — see the script's inline comments).

## How to (re)run the pipeline

```bash
cd app
python3 scripts/parse_roadmap.py          # existing — Part II onward (unchanged)
python3 scripts/parse_roadmap_part1.py    # new — Part I
python3 scripts/merge_seed.py             # new — folds Part I into seed.json
python3 scripts/generate_seed_sql.py      # extended — now also writes seed_data_part1.sql
```

Then apply `supabase/migrations/0004_part_one_reference.sql`, followed by
`supabase/seed_data_part1.sql` (alongside the existing `seed_data.sql`).

## Explicitly not done (P7.1 onward — not in this pass)

Exit Ladder interactive UI, ClientSync `project_progress` join, multi-axis
progress view, project dependency chips, real architecture explorer, smart
filters, universal search expansion, technology pages, prerequisite locking,
phase readiness score, hours calculator, revision spaced-repetition tiers,
and everything in the "Net-new features" list. See
`ZTE-Tracker-Status-and-Priority-v3.md` for the full P7 breakdown.

---

# P7.1 (partial) — Exit Ladder interactive progression UI

Scope: item 5 from the priority doc — "Exit Ladder — interactive progression
UI + skills-unlocked + remaining-requirements calculation." Reference and
Onboarding (items 3–4) were already finished in P7.0.

## What changed

`src/app/(app)/exit-ladder/page.tsx` — rebuilt. The old page was a plain list
with a vertical connector line and one completion stat per rung. The new
version adds, computed live from real progress data (nothing fabricated):

- **Rung status** (`complete` / `current` / `locked`) — a rung is complete
  when every topic across every phase up to and including its linked phase
  is done; the first non-complete rung is `current`; everything after is
  `locked`. Locked rungs render with a lock icon and reduced opacity instead
  of looking identical to the current one.
- **Cumulative progress bar per rung** — topics completed / total across
  *all* phases up to that rung (not just the linked phase), since exits are
  ladder rungs, not isolated checkpoints. Exit A2 branches off Exit A but is
  still additive on the same cumulative count.
- **"Skills unlocked" per rung** — the titles of the phases that sit between
  the previous rung's linked phase and this rung's linked phase. This is
  derived directly from real phase titles already in the roadmap, not an
  invented skill taxonomy — the codebase has no skill-tag model to draw from,
  and building one would have meant fabricating fields the source document
  doesn't contain (the exact thing P7.0's changelog flagged as a risk for
  P7.2 company/portfolio work).
- **Capstone(s) at this rung** — same derivation, surfaced separately since a
  capstone is a distinct deliverable, not just "another skill."
- **Remaining requirements** — for a locked rung, the topic count and the
  specific phase titles still incomplete between here and that rung.
- **"Next up" banner** — pulls the current rung to the top of the page with
  its own progress bar, so the person doesn't have to scan the whole ladder
  to find where they are.

No new tables or migrations — everything renders from `exit_ladder`,
`phases`, `topics`, and `topic_progress`, already queried via the existing
`useExitLadder` and `usePhasesWithProgress` hooks.

## Verified

- Ladder math simulated against the real `data/seed.json` at both progress
  extremes (0% and 100% complete) to confirm status assignment and
  skills-unlocked counts behave correctly at the boundaries — see inline
  Python checks in the build session; not committed as a test file since the
  project has no test harness yet.
- `npx tsc --noEmit` — clean.
- `npx eslint` on the changed file — clean.
- `npm run build` — full production build succeeds, `/exit-ladder` compiles
  alongside every other route.

## Explicitly not done (still P7.1+ remainder)

Items 3–4 (Reference, Onboarding) were finished in P7.0. This closes item 5.
Nothing from P7.2 onward (ClientSync depth, multi-axis progress, dependency
chips, architecture explorer, search, prerequisite locking, phase readiness
score, hours calculator, revision tiers, daily-use additions, long tail) is
included here.


---

# P7.2 (partial) — ClientSync depth + Multi-axis progress view

## Item 6 — ClientSync: join `project_progress` into the page

`src/app/(app)/clientsync/page.tsx` — rebuilt. GitHub/deployment links were
already surfaced as icons; what was missing was `screenshots`, `demo_url`,
`status`, and `notes` — all real columns on `project_progress` that no page
in the app rendered or let you edit. Milestones are now clickable and open a
dialog with the same status/links/notes editing pattern already used on
`/projects` (matched, not reinvented), plus a screenshot gallery — add a URL,
see a thumbnail grid, remove with a hover button. No new tables; this was a
pure UI gap on data that already existed.

## Item 7 — Multi-axis progress view

`src/app/(app)/statistics/page.tsx` — extended, not replaced. Individual
trackers (Roadmap, DSA, Revision, ClientSync, Projects) already existed as
separate pages with no shared view. Added a "Progress by axis" card grid at
the top of Statistics — chosen over a new route since Statistics was already
the closest thing to a cross-cutting view, and a 6th nav item for essentially
the same purpose would fragment rather than unify. Each axis card shows that
tracker's own real completion percentage and a one-line detail pulled from
its own data (DSA by difficulty, revision by mastered/comfortable/needs-work,
ClientSync milestones, project status distribution) — no blended "readiness
score," since that would mean inventing a weighting the source document
doesn't define. Cards link to their full tracker page.

Also discovered mid-build: Statistics already contains the hours calculator
(20/40/60 hrs/wk) that the priority doc lists separately as P7.4 item 15 —
noted here so it isn't redone.

## Verified

- `npx tsc --noEmit` — clean on both files. One real bug caught and fixed:
  importing lucide-react's `Map` icon shadowed the native `Map` constructor
  used elsewhere in the same file (`new Map(...)`), breaking type inference;
  renamed the import to `MapIcon`.
- `npx eslint` — clean on the ClientSync page. The Statistics page reports
  two pre-existing issues (`Date.now()` purity warning, an unused `week`
  variable) that were already present in the untouched original file —
  confirmed by linting a copy of the pre-edit version — and left alone as
  out of scope. One new compiler-memoization error was surfaced by my edit
  (a `useMemo` depending on an unmemoized `completedTopics`) and fixed by
  memoizing `completedTopics` itself, which was a latent issue in the
  original code that nothing had exercised until now.
- `npm run build` — full production build succeeds; both routes compile
  alongside every other page.

## Explicitly not done (P7.2 remainder + everything after)

Project dependency chips (item 8) and the real architecture explorer (item
9) are not done. Nothing from P7.3 onward (smart filters, search expansion,
technology pages, prerequisite locking, phase readiness score, revision
tiers, daily-use additions, long tail) is included here.

---

# P7.2 (partial) — Project dependency chips

## Item 8 — "Requires: X, Y, Z" modeling on projects

`src/app/(app)/projects/page.tsx` — extended, not replaced.

There is no `requires`/`tech_stack`/`prerequisites` field anywhere in the
data — not on `stage_projects`, not on `capstones`. Technologies are
sometimes named in free-text descriptions ("SQLite", "IndexedDB", "Web
Worker") but as unstructured prose, not tags. Two ways to build "dependency
chips" from that:

1. Keyword/NLP-extract tech names from the free-text descriptions.
2. Derive dependencies from the curriculum's own real structure — a project
   necessarily depends on the topics its stage teaches, plus everything
   before it.

Went with (2). Extracting tech names from prose would produce chips the
source document never actually authored — the exact fabrication risk this
changelog has flagged twice already (P7.0's companies/portfolio note, P7.2's
"skills unlocked" note). Curriculum structure is real, already in the DB,
and traceable to source.

What renders now, per stage project:
- **Requires:** — the topics taught in that project's own stage (deduped)
- **+N from earlier stages** — topics from earlier stages in the same phase,
  rolled into a count rather than exploded into individual chips (a late
  stage in a long phase would otherwise dump 15+ chips)
- **builds on N earlier phases** — phase-level depth, from `order_index`

Per capstone/portfolio project: the 3 most recent prior phases as chips,
plus a "+N more" count for anything further back, since a Phase 18 capstone
listing all 17 phases before it would be noise, not signal.

## Verified

- Dependency math checked against real `data/seed.json` for a mid-roadmap
  case (Phase 03, second stage): correctly shows 1 same-stage topic, 4
  prior-stage topics, 3 prior phases — matches the actual curriculum
  ordering.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean (one pre-existing unused-import warning, confirmed
  present in the file before this change, left untouched).
- `npm run build` — full production build succeeds, `/projects` compiles
  alongside every other route.

## Explicitly not done (P7.2 remainder + everything after)

Item 9 (real architecture explorer, replacing the static/hardcoded diagram)
is not done. Nothing from P7.3 onward is included here.

---

# P7.2 (complete) — Real architecture explorer

## Item 9 — replace the static/hardcoded diagram with a derived one

The old `/architecture` page rendered a hand-typed `LAYERS` constant (Client
Layer, Business Layer, API Layer, etc.) with zero connection to the actual
codebase — the exact "fake" the priority doc flagged it as. There's no
separate ClientSync backend to introspect; ClientSync is the anchor project
*within* this tracker, so "derive from the actual schema/routes" means
introspecting this app's own Supabase migrations and Next.js routes.

**New script:** `scripts/generate_architecture_manifest.py` — parses:

1. Every `create table` / `alter table` in `supabase/migrations/*.sql` →
   table name, column count, foreign-key edges (31 tables found).
2. Every function (exported hooks *and* private `fetch*` helpers) in
   `src/lib/hooks/use-*.ts`, resolving `.from("...")` calls through the
   real call graph — a hook that calls another hook that calls a private
   fetcher gets the fetcher's tables too, not just its own body's direct
   calls (this took two iterations to get right: a first pass only counted
   direct calls with parens, `fetchRoadmap()`, and missed hooks that pass a
   fetcher by reference to `useSWR(key, fetchRoadmap)` — fixed by dropping
   the parens requirement from the call-graph edge detection).
3. Every `src/app/**/page.tsx` → which tables it touches, either directly
   (routes that query Supabase inline, like the public profile page) or
   transitively through whichever specific hook functions it actually calls
   (not just "imports something from this hook file," which would have
   massively overstated e.g. ClientSync's footprint by attributing all 20+
   tables `use-roadmap.ts` exports across its many hooks, instead of the 2
   hooks the ClientSync page actually calls).

Writes `src/data/architecture_manifest.json` (~25KB), imported directly as a
JSON module by the page — no new runtime dependency, no fetch, no new table.

**Rebuilt page:** `src/app/(app)/architecture/page.tsx` — three real views:
- **Routes → tables**: every data-touching route (24 of 26; `/` and
  `/login` correctly show zero) with clickable table pills.
- **Schema browser**: all 31 tables, column counts, source migration,
  click-through to see FK edges in both directions (references / referenced
  by) and exactly which routes read that table.
- **Unused-table callout**: the manifest generator found `topic_groups` and
  `topic_group_bullets` are defined in the schema but queried by nothing —
  a real finding (topic groups/bullets are embedded directly in the seeded
  topic JSON instead of being relationally queried), surfaced honestly
  instead of hidden, since that's exactly the kind of drift a real
  architecture explorer should catch.

## Verified

- Manifest cross-checked by hand against `grep` output at every stage: the
  raw table list, the FK list, the hook-file-to-table map, and finally the
  full resolved call graph for `usePhasesWithProgress` (confirmed it now
  correctly includes `phases`, `topics`, `stages`, `stage_projects`,
  `stage_exercises`, `capstones`, `topic_progress` — traced three call
  levels deep: `usePhasesWithProgress` → `useRoadmap`/`useProgress` →
  `fetchRoadmap`/`fetchProgress` → `.from()`).
- `npx tsc --noEmit` — clean; the JSON import type-checks correctly via
  `resolveJsonModule`.
- `npx eslint` — clean.
- `npm run build` — full production build succeeds, `/architecture`
  compiles alongside all 26 other routes; bundled manifest confirmed small
  (~25KB) with no meaningful bundle-size impact.

## P7.2 — now fully closed

All 4 items done: ClientSync depth, multi-axis progress view, project
dependency chips, real architecture explorer. Nothing from P7.3 onward
(smart filters, universal search expansion, technology pages, prerequisite
locking, phase readiness score, hours calculator [already existed, noted in
the P7.2 changelog entry above], revision spaced-repetition tiers, daily-use
additions, long tail) is included here.

---

# P7.3 (partial) — Smart filters, plus two P7.4 items found already built

## Important correction before P7.3: two P7.4 items already exist

While reading `skills/page.tsx` and `roadmap/page.tsx` to place the new
filters correctly, found:

- **Phase readiness score** (P7.4 item 14) — already fully implemented on
  `/skills` as a weighted score (70% topic completion + 30% hard-topic
  mastery), with labeled bands (Ready to exit / On track / In progress / Not
  started) and a visible explanation of the weighting. Nothing to build.
- **Prerequisite locking** (P7.4 item 13) — already fully implemented on
  `/roadmap`: a phase locks if the previous phase is below 50% complete,
  shows exactly how far short it is, and has an explicit "unlock anyway"
  override per phase — matching the doc's spec ("with disable option for
  advanced users") exactly.

Combined with the hours calculator already found on `/statistics` (noted in
the P7.2 changelog entry), that's now 3 of P7.4's 4 items already done
before P7.4 was even started. Flagging here so they aren't rebuilt when
P7.4 comes up — only "revision spaced-repetition tiers" is actually new
work in that phase.

## Item 10 — Smart filters (difficulty × domain)

`src/app/(app)/roadmap/page.tsx` — extended, not replaced.

"Domain" has no field anywhere in the source data — confirmed again here,
same finding as the dependency-chips and skills-matrix work: no per-topic
tech tag exists. `band` (Foundation/Core/Advanced/Expert) is the real
grouping the Skills page already substitutes for "domain" for the same
reason, and it's what this filter uses too, for consistency across the app.

Added to the Roadmap page:
- A **search box** — matches topic titles and phase titles.
- A **band select** — Foundation / Core / Advanced / Expert / all.
- A **difficulty select** — easy / medium / hard / all. This is a
  user-*rated* field on `topic_progress` (set only once someone has
  actually completed and rated a topic), not an inherent roadmap attribute,
  so the filter bar says so explicitly rather than implying every topic is
  pre-tagged.
- A **result count** ("N of 21 phases match") and a **Clear** button when
  any filter is active.

Filtering rule, kept deliberately simple to stay predictable: a phase
survives if its band matches (when set), it has a topic at the selected
difficulty (when set), and either its own title or one of its topics
matches the search text. A phase that survives on title-match alone still
shows all of its topics — filtering narrows which phases are worth opening,
not which topics disappear inside a phase you already found by name.

One correctness detail worth calling out: prerequisite locking (see above)
depends on comparing each phase to *the previous phase in the full,
unfiltered list* — so filtering could not simply map over a filtered array
and use its local index, since that would compare a phase to the wrong
"previous" phase once phases in between get filtered out. Fixed by looking
up each rendered phase's real index via `phases.findIndex` against the
original unfiltered array before calling `isPhaseLocked`.

## Verified

- Band filter checked against real `data/seed.json`: filtering to "Advanced"
  returns phases 09–15, matching the Difficulty Ramp data from P7.0 exactly
  — confirms the filter and the earlier-parsed reference data key off the
  same real field consistently.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean.
- `npm run build` — full production build succeeds, `/roadmap` compiles
  alongside all 26 other routes.

## Explicitly not done (P7.3 remainder)

Item 11 (universal search expansion — the ⌘K search covers phases/topics/
exit points/companies today; adding exercises, salary, and ClientSync
features to it) and item 12 (technology pages + cross-linking, which is
blocked on the same "no structured tech field" gap flagged in the P7.2
dependency-chips entry) are not done.

---

# P7.3 (2 of 3) — Universal search expansion

## Item 11 — add exercises, salary, ClientSync features to ⌘K

`src/components/layout/global-search.tsx` — extended, not replaced. The
existing search already covered Phases, Topics, Exit points, and Companies;
added:

- **Exercises** (358 total) — new group, searches `stage_exercises`
  descriptions (already fetched in bulk by the existing `useRoadmap()` call,
  no new hook needed), selecting one navigates to its stage page.
- **Salary** — not a new group; folded into the existing Exit points group's
  searchable value string, so typing a figure like "20-30" or "LPA" now
  matches the right exit tier instead of only matching by code or name.
- **ClientSync milestones** (7 total) — new group, searches milestone
  descriptions, selecting one navigates to `/clientsync`.

Also fixed a real completeness gap while in here: the old topics list was
hard-capped at 50 items (`topics.slice(0, 50)`) *before* cmdk's own
filtering ran — so a topic past the 50th couldn't be found by typing its
exact title, only by luck of array order. `cmdk` needs every `Command.Item`
mounted to score it against a query (filtering happens after mount, not
before), so simply removing the cap outright would mount all 375 topics +
358 exercises unconditionally even with an empty search box. Fix: the full
375/358 are only mounted once there's an actual query; the empty/idle state
shows a capped 30-item preview with a "+N more — type to search all" hint,
so opening the palette stays light but nothing is ever unreachable by
typing.

## Verified

- `npx tsc --noEmit` — clean.
- `npx eslint` — one pre-existing unused-import warning (confirmed present
  in the file before this change), one new warning caught and fixed (an
  unmemoized `stages` array feeding a `useMemo`, same class of issue as the
  Statistics page fix in the P7.2 entry above — fixed by memoizing `stages`
  itself).
- `npm run build` — full production build succeeds; confirmed `GlobalSearch`
  is actually mounted app-wide via `app-topbar.tsx`, not an orphaned
  component.

## P7.3 — 2 of 3 items done; item 12 blocked, not fabricated

Smart filters and universal search expansion are both done. Item 12
(technology pages + cross-linking) is **not done** — it's blocked on the
same "no structured tech field in the source data" gap already flagged for
project dependency chips (P7.2) and the skill matrix (pre-existing on
`/skills`): there is no per-topic tech tag anywhere in the schema or the
seed data, only free-text mentions inside descriptions. Building "technology
pages" honestly would require either fabricating a tech taxonomy the source
document never authored, or a real NLP-extraction pass whose output would
need human review before being trusted — neither is something to ship
silently as if it were derived the same way everything else in this
changelog has been. Flagging it here rather than skipping past it quietly.

---

# P7.4 (complete) — Revision spaced-repetition tiers

## Item 16 — the only genuinely new item left in P7.4

As flagged in the P7.3 changelog entry, 3 of P7.4's 4 items were already
built before this phase started (phase readiness score, prerequisite
locking, hours calculator). This closes the 4th and last one.

The old `revision_status` field was a single static tag — set once, by
hand, never advancing, with no concept of a schedule or "overdue." Real
spaced repetition needs two things that didn't exist anywhere: a review
count (how many times has this actually been reviewed) and a due date (when
is the next one). Neither could be derived from existing columns without
conflating separate events — `completed_at` means "finished the topic," not
"reviewed it for retention" — so this needed real new columns, not just new
computation on old data.

**Migration:** `supabase/migrations/0005_revision_tiers.sql` — adds
`review_count int not null default 0` and `next_review_due timestamptz` to
`topic_progress`. Additive only.

**Schedule:** `src/lib/revision-schedule.ts` — a fixed 1 / 3 / 7-day interval
ladder (the same doubling-ish cadence Anki/SuperMemo use, not invented for
this app), matching the roadmap's own three named tiers
(needs_revision/comfortable/mastered → tier_1/tier_2/tier_3/mastered) rather
than adding a longer or shorter ladder than the source data implies.
Completing a topic seeds day-1; each "mark reviewed" advances the count and
recomputes the next due date; the 3rd review exits scheduling as mastered.

**Revision page** — rebuilt with a "Due soon" default view, a live overdue
count in the page header, an "Overdue" filter tab, and per-topic due-date
badges (color-coded red when overdue). The old free-text "set status"
dropdown is replaced by a "Mark reviewed" button that drives the schedule
directly — you no longer hand-pick a status disconnected from any timeline.

## Real bug caught mid-build: cross-page consistency

Two other places in the app — `topic-detail-sheet.tsx` (opened from
Roadmap) and the standalone `roadmap/topic/[id]` page — still have their
own manual "Revision status" dropdown, predating this change. Left as-is
they'd silently desync from the new tier system: someone could set
"Mastered" there while `review_count` stays at 0, so `/revision` would
still list it as due for a 1st review — two pages showing contradictory
state for the same topic. Fixed by making both dropdowns tier-aware:
picking "Mastered" now also sets `review_count` to the mastery threshold
and clears the due date; picking "Needs revision" resets the count and
reseeds day-1. "Comfortable" has no single correct review count to snap to
(it's the label for every mid-schedule tier), so it's left as a label-only
change there, same as the automatic path.

Also fixed: `toggleTopicComplete` (called whenever a topic checkbox is
ticked) now seeds `next_review_due` and sets `revision_status` to
`needs_revision` at completion — without this, a freshly-completed,
never-reviewed topic would show as `unset` in Statistics' multi-axis
revision breakdown (P7.2) instead of `needs_revision`, undercounting the
one bucket that matters most.

## Verified

- Interval math checked independently in plain Node against the actual
  `computeNextReviewDue` logic: review_count 0→1 due in 3 days, 1→2 due in
  7 days, 2→3 (mastered) returns null — matches the intended 1/3/7 cadence
  exactly.
- Traced every remaining reader/writer of `revision_status` across the
  codebase (`grep -rl`) to catch the cross-page desync before it shipped,
  not after.
- `npx tsc --noEmit` — clean across all 5 touched files.
- `npx eslint` — clean on the new/primarily-changed files. 3 pre-existing
  errors surfaced on `topic-detail-sheet.tsx` and the standalone topic page
  (a `setState`-in-`useEffect` pattern in the notes-fetching effect, which
  I did not write or touch — only `handleRevisionChange` in those files was
  mine). Confirmed the production build still succeeds despite them; left
  alone as out of scope, same policy as every other pre-existing issue
  flagged in this changelog.
- `npm run build` — full production build succeeds both before and after
  the cross-page consistency fix, all 26 routes compile.

## P7.4 — now fully closed

---

# P7.5 (partial) — Engineering OS gap closed; daily mission generator found pre-existing

## Correction before P7.5: item 18 already exists

Reading `dashboard/page.tsx` to scope this phase found a "Daily Mission"
card already fully built — shows the next incomplete topic, its phase, an
hours estimate, and a "Mark complete" button. That's exactly item 18
("daily mission generator — what should I do today"). Nothing to build.

## Item 21 — Engineering OS unified dashboard (partial)

The existing Dashboard already covered most of what this item describes:
Daily Mission, a study-log form, streak, a 12-month heatmap, current/next
exit point, and recent activity. What it was missing, matching the doc's
own framing exactly ("continue X, current project, today's DSA,
applications sent"), was **current project**, **DSA standing**, and
**applications sent** — none of which appeared anywhere on the page despite
all three having real, structured data already (`project_progress`,
`dsa_progress`, `career_tracker`).

Added a 3-card row right under Daily Mission:
- **Current project** — whichever phase's `project_progress.status` is
  `in_progress`, or a prompt to start one.
- **DSA progress** — easy/medium/hard counts against the roadmap's own
  targets (`roadmap_metadata.dsa_easy_target`/`dsa_medium_target`, parsed in
  P7.0). Deliberately framed as overall progress, not "solved today" — DSA
  problems have no completion timestamp in the schema, so a day-level signal
  doesn't exist to show honestly.
- **Applications** — count of applications in `applied`/`screening`/
  `interviewing` status, plus an offer count when any exist.

Each card links through to its full tracker page rather than duplicating
its detail.

## Verified

- `npx tsc --noEmit` — clean.
- `npx eslint` — 2 pre-existing errors surfaced (a React Compiler
  memoization-preservation warning on the untouched `nextTopic` useMemo, and
  an unescaped apostrophe in "You've finished the roadmap"). Confirmed both
  present with identical content in the original file before this change —
  only their line numbers shifted from my insertions above them. Left
  alone, same policy as every other pre-existing issue in this changelog.
- `npm run build` — full production build succeeds, `/dashboard` compiles
  alongside all 26 other routes.

## Explicitly not done (P7.5 remainder)

Learning journal (item 17), DSA sub-dashboard by pattern (item 19), and
personal analytics — velocity/hardest topics/best week (item 20) are not
done. Offline mode and certificates (both explicitly deferred in P6 per the
priority doc itself) are not done.

---

# P7.5 (partial, continued) — DSA sub-dashboard by pattern

## Item 19 — genuinely new work, not another pre-existing find

Unlike the last several items, this one really didn't exist: `/dsa` had a
flat problem list with a free-text `topic_tag` field on each problem, no
grouping or pattern-level view anywhere.

`topic_tag` is exactly that — free text the person types when adding a
problem ("two-pointers", "Arrays", "dp", or nothing at all). There is no
fixed pattern taxonomy anywhere in the schema or seed data. Hardcoding the
doc's example buckets (arrays/trees/graphs/DP/greedy) as literal match
targets would silently misfile or drop any problem tagged with a variant
spelling, a pattern the person calls something else, or nothing — the same
fabrication risk flagged repeatedly elsewhere in this changelog (dependency
chips, technology pages, "domain" filters), just showing up again here in a
new place.

**Fix:** group by whatever tags actually exist, normalized only for casing
and whitespace ("Arrays", "arrays", " Arrays " all collapse into one
bucket, using the first-seen casing as the display label) — not remapped
into a fixed vocabulary. Groups sort by problem count descending. Untagged
problems get their own explicit "Untagged" group pinned last, rather than
disappearing from the pattern view entirely.

`/dsa` now has two tabs: **By list** (the original flat view, filters and
add-problem form unchanged) and **By pattern** (new) — each group shown as
a card with a completion count and progress bar, expandable to the actual
problems inside it.

## Verified

- Grouping/normalization logic checked independently in plain Node with
  mixed-case and whitespace-variant tags plus an untagged entry: confirmed
  "Arrays" / "arrays" / " Arrays " correctly collapse into one 3-problem
  group, sorted ahead of a 1-problem group, with the untagged entry pinned
  last regardless of count.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean, no pre-existing issues carried over this time.
- `npm run build` — full production build succeeds, `/dsa` compiles
  alongside all 26 other routes.

## Explicitly not done (P7.5 remainder)

Learning journal (item 17) and personal analytics — velocity/hardest
topics/best week (item 20) are not done.

---

# P7.5 (partial, continued) — Learning journal

## Item 17 — genuinely new page, new columns

`daily_logs` already had `hours` and a single free-text `note` (additive
across multiple sessions in a day). The doc wants four distinct reflective
prompts — learned / mistakes / wins / tomorrow's goal — which don't fit
cleanly into one shared note string: you couldn't render them separately,
search by "wins" alone, or show only mistakes across a week. This needed
real new columns, not new computation on old data (same category of gap as
the P7.4 revision-tiers work).

**Migration:** `supabase/migrations/0006_learning_journal.sql` — adds
`learned`, `mistakes`, `wins`, `tomorrow_goal` (all nullable text) to
`daily_logs`. Kept on the same table rather than a new one, since a journal
entry is the same daily unit hours/note already are — one row per user per
date, not a separate parallel entity.

**Hook:** `saveJournalEntry` in `use-daily-logs.ts` — a second upsert
function alongside the existing `logStudySession`, but overwrite-semantics
instead of additive: a day's reflection is a single edit-in-place thing,
not something that accumulates the way multiple study sessions' hours do.
Confirmed safe against the existing `logStudySession`/Dashboard flow before
writing it — Supabase's partial-payload upsert only touches the columns in
the payload (verified against the `upsertProjectProgress` precedent already
relied on throughout P7.2's ClientSync work), so the two functions can write
disjoint column sets to the same row without either clobbering the other.

**New page:** `/journal` (added to the shared `NAV` array, so it shows in
both desktop sidebar and mobile nav automatically) — a "Today" card with
four labeled textareas and a save button, plus a "Past entries" list below
showing prior days with any journal content, collapsed by default and
expandable.

## A pattern I introduced then fixed before it shipped

First draft hydrated the day's form fields from the fetched row using
`setState` directly inside a `useEffect` — the exact anti-pattern flagged
as pre-existing (and left alone) in two other files during the P7.4 work.
Since this was new code, not inherited code, fixed it properly instead of
letting a fresh instance through: split the form into its own `TodayForm`
component, keyed by `todayLog?.updated_at` in the parent, so React
re-mounts it with fresh initial state whenever the fetched row changes —
no manual effect-driven sync needed at all.

Also caught and fixed a `user!.id` non-null assertion in the same pass —
the `(app)` layout redirects unauthenticated users server-side, but
`useUser()` can still be briefly null client-side during hydration, and no
other page in the codebase uses that assertion; they all guard properly.
Wrapped the form in `{user && (...)}` instead.

## Verified

- Traced both daily_logs writers (`logStudySession`, `saveJournalEntry`) to
  confirm they touch disjoint column sets before treating the design as
  safe, rather than assuming.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean on every touched file, no pre-existing issues
  carried over and no new ones left unresolved (including the
  setState-in-effect pattern caught above).
- `npm run build` — full production build succeeds; `/journal` compiles as
  route 27 of 27, confirmed present in the build route listing.

## Explicitly not done (P7.5 remainder)

Personal analytics — velocity, hardest topics, best week (item 20) — is not
done. That closes out everything in P7.5 except that one item.

---

# P7.5 (complete) — Personal analytics

## Item 20 — velocity, hardest topics, best week

`src/app/(app)/statistics/page.tsx` — extended again, no new page (same
reasoning as the multi-axis work: this is a view over data Statistics
already assembles, not a new surface).

**Velocity** and **best week** — new `weeklyBreakdown()` function in
`use-daily-logs.ts`, bucketing every logged day into Monday-anchored
calendar weeks. Velocity compares the most recent complete week to the one
before it (not a long-run average — a single unusually big or small week
shouldn't be read as a permanent trend in either direction). Best week is
just the single highest-hours bucket. Both are plain arithmetic over real
`daily_logs` rows, nothing estimated.

**Hardest topics** — the one place in this item that risked the same
fabrication trap flagged repeatedly elsewhere in this changelog. There's no
"difficulty score" anywhere in the schema. Two real signals exist instead:
the person's own difficulty rating (`topic_progress.difficulty === "hard"`)
and how far `actual_minutes_spent` overran the roadmap's own
`estimated_hours` — a topic that took 3x its estimate is empirically hard
whether or not it got self-rated that way. Combined both rather than
picking one: a topic surfaces if it's rated hard, or overran estimate by
1.5x or more (whichever), ranked by an overrun-ratio-plus-rating score so
the worst measured mismatches lead. Topics with neither signal don't
appear at all, rather than being padded in with a default score.

## Verified

- `weeklyBreakdown`'s Monday-anchored bucketing checked independently in
  plain Node against dates spanning a week boundary (Sunday Aug 2 vs.
  Monday Aug 3): confirmed the Sunday correctly stays in the prior week's
  bucket and the Monday correctly starts a new one.
- Hardest-topics scoring/filtering checked independently against 5
  synthetic edge cases: a slight (1.17x) unrated overrun and an on-estimate
  rated-easy topic are both correctly excluded; a 5x unrated overrun, a
  2.5x rated-hard overrun, and a rated-hard-with-no-time-data topic are all
  correctly included and ranked with the strongest measured signal first.
- `npx tsc --noEmit` — clean.
- `npx eslint` — 2 pre-existing issues surfaced (the same `Date.now()`
  purity warning and unused `week` variable documented in the P7.2
  changelog entry), confirmed unchanged from before this round's edits by
  diffing against a fresh backup — not something reintroduced or newly
  ignored, no new issues from this round's own code.
- `npm run build` — full production build succeeds, all 27 routes compile
  (including `/journal` from the previous entry).

## P7.5 — now fully closed

All 5 items resolved: daily mission generator and phase readiness score
were found pre-existing (also true of prerequisite locking and the hours
calculator, both flagged in earlier P7.3/P7.4 entries); Engineering OS gap
(current project / DSA / applications), DSA sub-dashboard by pattern,
learning journal, and personal analytics were all built and verified this
phase.

---

# P7.6 (partial) — Company prep pages

## Scope decision before starting P7.6

Skipping offline mode and certificates — both are explicitly deferred by
the source roadmap document itself (P6 per the priority doc: "explicitly
deferred," and for certificates specifically, "no clear artifact to certify
against"). Building either would mean inventing scope the roadmap's own
author declined to define, not completing something the source document
actually calls for.

## Item — company prep pages (checklist, expected interview difficulty)

The `companies` table is confirmed name-only — no tech stack, hiring
difficulty, or interview-process field anywhere in the schema, for any
company (this was flagged as an open question back in the original P0-P6
status doc, under "needs source check," and confirmed unresolved here: the
roadmap has no such per-company data to draw from). "Expected interview
difficulty" as a literal per-company rating isn't buildable without
fabricating a rating the source document never authored — the same
fabrication trap flagged repeatedly throughout this changelog (dependency
chips, technology pages, DSA patterns, hardest topics).

What IS real and taggable to a specific company: which exit tier's target
list names it, and the person's own progress against that tier. Rebuilt
`companies/[id]/page.tsx` to add:
- An **active-application banner** if the person already has a
  `career_tracker` entry matching this company (status, interview date if
  set), linking through to Interviews.
- A **prep checklist card** for the highest-relevance exit tier that names
  this company: roadmap topics completed through that tier's linked phase,
  and DSA problems completed against the roadmap's own targets — the
  person's real, own progress, not a generic or invented per-company
  metric.

## Verified

- Company-to-exit matching checked against real data: "FAANG India" (a real
  company row) correctly matches Exit 3's target-companies text and
  resolves to phase-17 — the tier that actually names it (Senior
  Full-Stack), not an arbitrary or wrong phase.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean, no pre-existing issues.
- `npm run build` — full production build succeeds, `/companies/[id]`
  compiles alongside all 26 other routes.

## Explicitly not done (P7.6 remainder)

Roadmap diff/versioning, resource library, notes bidirectional linking,
smart notifications, multiple roadmap views (Kanban/Calendar/Tree),
developer mode are not done. Offline mode and certificates are intentionally
skipped per the scope decision above.

---

# P7.6 (partial, continued) — Notes bidirectional linking ("Wikipedia mode")

## Genuinely new — no linking mechanism existed at all

`topic_notes` was plain free text, duplicated across two separate
implementations (`topic-detail-sheet.tsx` for the Roadmap page's quick-edit
panel, and the standalone `roadmap/topic/[id]` page) — no way to link
between notes, no backlinks, no shared rendering.

**New:** `src/lib/note-links.ts` — parses `[[Topic Title]]` syntax. A
bracketed phrase only becomes a real link if it exact-matches (case-
insensitive) an actual topic title — no fuzzy matching, since silently
resolving to the "closest" topic could point at the wrong one without the
person noticing. An unmatched `[[...]]` renders as plain bracketed text
rather than a broken or wrongly-guessed link. `computeBacklinks()` scans
every note the user has written (not just the current topic's own notes)
for links resolving to a given topic, correctly excluding a topic's own
self-referencing notes from its own backlink list.

**New hook:** `useAllTopicNotes` in `use-roadmap.ts` — the per-topic note
fetch that already existed in both files can't compute backlinks (it only
ever sees one topic's notes); this fetches the user's full note set,
needed once, shared by both consumers.

**New shared component:** `src/components/roadmap/note-text.tsx` — renders
parsed note text with real links as clickable `<Link>`s. Wired into both
the sheet and the standalone page, replacing two independent `<p>{n.note}</p>`
renders with one shared implementation — the first step toward not having
two full duplicate note-editing implementations, though the CRUD logic
itself (add/delete/fetch) is still separately implemented in each file;
consolidating that further was out of scope for this pass.

**Backlinks section** — added to the standalone topic page only (not the
compact sheet, which doesn't have room for a whole extra section): a
"Linked from" card listing every other topic whose notes reference this
one, each linking through to that topic.

## Verified

- Link parsing checked independently: exact match, case-insensitive match,
  and unmatched-bracket-stays-plain-text all confirmed correct.
- Backlink computation checked independently with a realistic 3-topic,
  3-note graph: a topic correctly shows backlinks from both other topics
  that reference it, correctly excludes its own self-referencing note, and
  a topic referenced by only one other topic shows exactly that one.
- `npx tsc --noEmit` — clean across all 5 touched/new files.
- `npx eslint` — clean on every new file. 2 pre-existing errors surfaced
  (the same setState-in-effect pattern flagged twice already in the P7.4
  entry, in the same two files) — confirmed neither `useEffect` body
  touched by this round's edits, only new imports/hooks/JSX added around
  them.
- `npm run build` — full production build succeeds both before and after
  wiring the sheet component, all 27 routes compile.

## Explicitly not done (P7.6 remainder)

Roadmap diff/versioning, resource library, smart notifications, multiple
roadmap views (Kanban/Calendar/Tree), developer mode are not done. Offline
mode and certificates remain intentionally skipped per the earlier scope
decision.

---

# P7.6 (partial, continued) — Developer mode

## Genuinely new — real per-user setting, not local-only

No dev-mode flag existed anywhere. Added `developer_mode boolean` to
`user_settings` (migration `0007_developer_mode.sql`) rather than a
localStorage-only toggle, so it's a real persistent preference that
carries across devices like theme, weekly goal, and every other setting
already does — consistent with the rest of the app, not a special case.

**New hook:** `use-developer-mode.ts` — deliberately mirrors `useTheme`'s
local-first-then-sync shape: read from localStorage synchronously on mount
(so the toggle applies instantly everywhere it's checked, no flash), then
lazily reconcile with the server value once the user is known.

**Settings toggle** — a new card next to Theme, same `Switch` component and
layout pattern already used for the public-profile toggle.

**Where it actually surfaces data:** Roadmap page — phase IDs and topic IDs
render inline (small, muted, monospace) when enabled, threaded through
`TopicRow` and `StageBlock` via a `devMode` prop from the page's own hook
call. Scoped to Roadmap specifically since that's where the real internal
IDs (phase/topic/stage) are already in scope and rendering — extending it
further (e.g. showing raw Supabase row data everywhere) was judged out of
scope for this pass; the toggle and its persistence layer are the durable
piece, and more surfaces can read the same hook later without new plumbing.

## A setState-in-effect pattern I kept, and explained why

`use-developer-mode.ts` has the same "setState inside an effect" shape
flagged and fixed in the P7.5 Journal entry. This time it's justified, not
an oversight: localStorage isn't available during server rendering, so
there's no way to read the cached preference during render itself without
risking an SSR/hydration mismatch — the same reason `useTheme` (pre-
existing, unrelated to this change) has the identical shape. The Journal
fix's keyed-remount approach doesn't apply here either, since there's no
fetched row to key on before the user is even known — the whole point is
showing the locally-cached value before that fetch resolves. Documented
this reasoning directly in the hook rather than silently mirroring the
pattern without comment.

## Verified

- `npx tsc --noEmit` — clean across all touched/new files.
- `npx eslint` — 1 pre-existing error confirmed unrelated to this change
  (`settings/page.tsx`'s existing goal-hydration effect, untouched here);
  2 errors in the new hook explained and kept intentionally, matching a
  pattern already present and justified in `useTheme`.
- `npm run build` — full production build succeeds, all 27 routes compile.

## Explicitly not done (P7.6 remainder)

Roadmap diff/versioning, resource library, smart notifications, and
multiple roadmap views (Kanban/Calendar/Tree) are not done. Offline mode
and certificates remain intentionally skipped.

---

# P7.6 (partial, continued) — Smart notifications

## Scope decision: in-app notification center, not push/email delivery

The doc's item is "smart notifications (revision overdue, milestone
pending, ready to apply)." A literal notification *delivery* system (push
or email) would need a server-side scheduler and delivery infrastructure —
neither exists in this client-rendered Next.js/Supabase app, and adding one
would be a genuinely separate subsystem (cron jobs, a mail provider, push
subscription management), not a P7.6-sized addition. Built the honest,
buildable version instead: an in-app notification center that computes the
same three signals live, every page load, and surfaces them where the
person already is.

**New hook:** `use-notifications.ts` — deliberately doesn't invent new
derivations for any of the three signals; it reuses the exact completion
logic already built and verified elsewhere:
- **Revision overdue** — `isOverdue()` from the P7.4 revision-tiers work,
  applied to every completed topic.
- **Milestone pending** — the same "is this phase's roadmap complete"
  check from P7.2's ClientSync page, but inverted against
  `project_progress.status`: surfaces milestones where the roadmap
  learning is done but the actual deliverable (repo/deploy/demo) isn't
  marked complete — a real, honest gap between "learned it" and "shipped
  it," not a fabricated urgency signal.
- **Ready to apply** — the same cumulative phase-completion math from
  P7.1's Exit Ladder, flagging any exit tier that has just become 100%
  complete.

No "new since you last checked" diffing — there's no read/seen state
anywhere in the schema, and adding one would mean guessing at a
notification UX the source document doesn't specify. This shows current
state, freshly computed, every time.

**New component:** `notification-bell.tsx` — a bell icon in the topbar
(matching the existing lightweight overlay pattern from `global-search.tsx`
rather than pulling in a new dropdown-menu dependency for one feature), a
red dot when anything needs attention, and a panel listing each
notification with a link straight to the relevant page.

## Verified

- "Ready to apply" logic simulated against real `data/seed.json` with only
  phases 01–06 marked complete (Exit A's exact target range): confirmed
  only Exit A triggers, no other tier false-positives — consistent with
  the identical math already verified twice before in the P7.1 Exit Ladder
  work.
- `npx tsc --noEmit` — clean.
- `npx eslint` — one issue caught and fixed (an unmemoized `milestones`
  array feeding a `useMemo`, the same class of issue fixed twice before in
  Statistics and Global Search — fixed the same way, by memoizing the
  derivation itself).
- `npm run build` — full production build succeeds, all 27 routes compile;
  the bell is mounted app-wide via the shared topbar, not an orphaned
  component.

## Explicitly not done (P7.6 remainder)

Roadmap diff/versioning and resource library are not done. Offline mode
and certificates remain intentionally skipped.

---

# P7.6 (partial, continued) — Roadmap diff / versioning

## Real constraint: only one version of roadmap.md has ever existed

The doc's item is "roadmap diff (versioning — added/removed/changed/moved
between roadmap versions)." There is, and has only ever been, one
`roadmap.md` in this repo — no `v1`/`v2` files, no prior version anywhere.
That means there's no real second version to diff against today. Building
this honestly meant separating two different things: the **infrastructure**
to snapshot and diff future versions (buildable and testable now), and
**historical data** to diff (which genuinely doesn't exist yet, and
pretending otherwise would mean fabricating a fake "previous version").

**New migration:** `0008_roadmap_snapshots.sql` — `roadmap_snapshots`
(one row per parser run: version number, source hash, entity counts) and
`roadmap_snapshot_entities` (one row per phase/stage/topic as it existed in
that snapshot — a single generic table for all three entity types, since
the diff algorithm treats them identically).

**New script:** `scripts/snapshot_roadmap.py` — reads `data/seed.json` and
hashes `roadmap.md`, writes a new versioned snapshot. Auto-increments by
scanning existing `data/roadmap_snapshot_v*.json` files on disk. Run once
per future re-parse. Generated the real `v1` baseline from the current
actual roadmap content — 21 phases, 108 stages, 375 topics.

**New script:** `scripts/diff_roadmap_snapshots.py` — compares two
snapshots by `entity_id`, classifying each difference as added / removed /
changed (title or hours differ) / moved (position differs but content
doesn't).

**New page:** `/roadmap-diff` — a version picker and diff view. Explicitly
handles the honest current state: zero snapshots shows instructions to run
the script; exactly one snapshot (today's real situation) shows that
snapshot's stats with a note that a second is needed to diff; two or more
shows the actual added/removed/changed/moved breakdown. No fabricated
"changelog" or fake prior version anywhere in the UI.

## How the diff algorithm was verified without a real second version

Wrote a synthetic `v2` snapshot by deep-copying the real `v1` and applying
five known, controlled mutations: added one topic, removed one topic,
renamed one phase, changed another phase's hours, and reordered a third
phase's `order_index`. Ran the diff script against `v1`→synthetic-`v2` and
confirmed every single expected change was detected correctly — the exact
topic added, the exact topic removed, the exact hours delta (135→145), the
exact title change, and the exact position change (4→9) with no false
content-change flag on the moved phase. Deleted the synthetic `v2` and its
diff output afterward — only the real `v1` baseline ships. This proves the
diff logic is correct today, even though there's nothing real to diff it
against yet; the client-side TypeScript version (`roadmap-diff.ts`) mirrors
the same algorithm the verified Python script uses.

## Verified

- Diff algorithm correctness confirmed against known synthetic ground
  truth (5/5 mutations detected exactly, no false positives) before being
  trusted, both in the Python script and mirrored in the TypeScript client
  logic.
- `npx tsc --noEmit` — clean.
- `npx eslint` — clean on every new file.
- `npm run build` — full production build succeeds, `/roadmap-diff`
  compiles as route 28 of 28.

## Explicitly not done (P7.6 remainder)

Resource library is not done. Offline mode and certificates remain
intentionally skipped.

---

# P7.6 (complete) — Resource library

## roadmap.md has no curated resources — same honesty constraint as before

The doc's item is "resource library (curated docs/videos per topic — not
random links)." roadmap.md contains no external doc/video links anywhere
in its source text — this was already established while building P7.0's
parser (Part I was combed line by line) and confirmed again here. There is
nothing to curate from the source document itself.

Built the honest version: a real per-topic resource library each person
builds for themselves as they study, rather than fabricated links no one
has verified point to real, correct, current content. "Curated by the
person actually using the app" is a legitimate reading of "curated" that
doesn't require inventing a curator.

**New migration:** `0009_topic_resources.sql` — `topic_resources`
(user_id, topic_id, title, url, resource_type, notes), RLS scoped so each
person only ever sees and manages their own rows.

**New hooks:** `useTopicResources`, `addTopicResource`,
`deleteTopicResource` in `use-roadmap.ts`.

**UI:** added to the standalone topic detail page — an add-resource form
(title, URL, type: doc/video/article/link) and a list of what's been
added, each opening in a new tab, deletable. Explicitly labeled as the
person's own curated list, not roadmap-sourced content, so it's never
mistaken for something the roadmap itself provides.

## Verified

- `npx tsc --noEmit` — clean.
- `npx eslint` — 2 pre-existing errors confirmed unrelated (the same two
  `useEffect` blocks flagged repeatedly since P7.4, untouched by this
  round — only new handlers and the Resources card were added around
  them).
- `npm run build` — full production build succeeds, all 28 routes compile.

## P7.6 — now fully closed

Company prep pages, notes bidirectional linking, developer mode, smart
notifications, roadmap diff/versioning, and resource library are all done.
Offline mode and certificates were intentionally skipped — both explicitly
deferred by the source roadmap document itself, not something this pass
declined to build for lack of effort.

---

# P7 — final status

Every phase (P7.0 through P7.6) is now closed, at whatever level of
completeness was honestly achievable:

| Phase | Status |
|---|---|
| P7.0 — parser foundation | Fully done |
| P7.1 — Reference, Onboarding, Exit Ladder | Fully done |
| P7.2 — ClientSync depth, multi-axis progress, dependency chips, architecture explorer | Fully done |
| P7.3 — Smart filters, search expansion, technology pages | 2 of 3 done; technology pages blocked on a missing tech taxonomy that doesn't exist anywhere in the source data |
| P7.4 — Prerequisite locking, phase readiness score, hours calculator, revision tiers | Fully done (3 of 4 items were found already built before this pass started) |
| P7.5 — Journal, daily mission, DSA sub-dashboard, analytics, Engineering OS | Fully done (2 of 5 items were found already built) |
| P7.6 — Company prep, roadmap diff, resource library, notes linking, notifications, dev mode, offline mode, certificates | 6 of 8 done; offline mode and certificates intentionally skipped, both explicitly deferred by the source document itself |

Every item above that says "done" was verified with `npx tsc --noEmit`,
`npx eslint`, and a full `npm run build` — not just written and assumed
correct. Every algorithm with real logic to get wrong (spaced-repetition
scheduling, dependency derivation, pattern grouping, note-link parsing and
backlinks, roadmap diffing) was checked against known inputs with known
correct outputs before being trusted, not just typechecked. Every item
that risked fabricating data the source document doesn't contain — a tech
taxonomy, per-company interview difficulty, per-topic curated resources,
a second roadmap version — was either built on real derivable signals
instead, or explicitly left undone with the reason stated plainly rather
than quietly faked.

---

# P8 — Stage 7 verification pass (4 items closed)

Scope: the four remaining Stage 7 verification items — dependency graph
current-position, ClientSync field audit, Portfolio/Projects overlap audit,
and certificate PDF generation.

## Item 16 — Learning Path Visualizer (dependency-graph) — Current Position

Was: static ladder only, no "you are here" summary.
Now: a "Current Position" card above the ladder derives Current phase →
Next topic → Next stage → Next phase → Next exit point from data already
loaded by `usePhasesWithProgress` — no new queries, no new tables.

## Item 7 — ClientSync fields — final confirmation

Audited `clientsync/page.tsx` (365 lines) against the plan's field list
(GitHub repo, live deployment, screenshots, completion %). Found: status,
github_url, deployment_url, demo_url, notes, screenshots (add/remove), and
per-phase completion % all present and wired to `upsertProjectProgress`.
**Verified — no gap, no code change needed.**

## Item 36 — Portfolio Dashboard vs. Portfolio Projects overlap

Confirmed three genuinely distinct routes, not overlapping:
- `/projects` — capstone/stage-project tracker (github/deployment/status per
  phase, dependency chips)
- `/portfolio` — summary dashboard of deployed capstones
- `/portfolio/ideas` — the ~10 seeded SaaS project ideas (`advanced_projects`
  table, separate progress table)
**Verified — no gap, no code change needed.**

## Item — Certificate PDF generation (Stage 6)

The plan's claim of an "existing PDF generation pattern" doesn't hold —
`package.json` had no PDF library; the only prior "download" (`resume/page.tsx`)
was a plain-text Blob, not a PDF. Added:

- `jspdf` dependency.
- `src/lib/certificate.ts` — client-side landscape A4 certificate generator
  (name, milestone title/subtitle, completion date), triggers a browser
  download, no server round trip.
- `src/lib/hooks/use-display-name.ts` — small SWR hook for
  `user_settings.display_name`, separate from the fuller Settings hook.
- Wired a "Certificate" button into `/roadmap` phase headers (shown once a
  phase's topics hit 100%) and `/exit-ladder` rungs (shown once a rung's
  status is `complete`).

## Verified

- `npx tsc --noEmit` — clean, zero errors across the full project.
- `npx eslint` on all touched files — clean.
- `npm run build` — full production build succeeds, all 29 routes compile.

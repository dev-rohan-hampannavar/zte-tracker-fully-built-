# Stage 7 Follow-up — Fixing the two real gaps found during full validation

After the Stage 7 verification pass (Items 7, 16, 36), a full item-by-item
validation of the remaining 52 items was requested. That pass read actual
source code — not changelog prose — for every item and found 53 of 55
already correctly built, plus two real gaps and one hygiene issue. This
changelog documents the fixes for all three.

---

## Gap 1 — Item 3: Company Profiles UI was behind its own schema

**What was wrong:** The Stage 0 migration (`0010_company_profiles.sql`)
correctly added `category`, `hiring_stage`, `typical_tech_stack`,
`hiring_difficulty`, and `notes` to `companies`, and
`supabase/seed_data_structural.sql` populated real values for every seeded
company. But neither `companies/page.tsx` (the list) nor
`companies/[id]/page.tsx` (the detail page) rendered any of it beyond
`name`. The detail page's own code comment still claimed *"the company
table is name-only — no interview difficulty, tech stack, or process data
exists"*, which had been false since Stage 0 shipped. Only `category` was
surfaced anywhere, and only indirectly, via the Reference page's company
grouping — not on the Companies pages themselves.

**Fix (`src/app/(app)/companies/page.tsx`):**
- Each company card now shows `category` and `hiring_difficulty` as
  badges (difficulty color-coded: low=success, medium=warning,
  high=danger) and `hiring_stage` as a text line, when present.
- Updated the page's description line to reflect the richer data now
  shown, rather than the old name-only framing.

**Fix (`src/app/(app)/companies/[id]/page.tsx`):**
- Replaced the stale "name-only" comment with one describing what's
  actually rendered and why `hiring_difficulty` still shows as absent for
  many companies (the source document doesn't rate every company — that's
  a correct null, not a bug).
- Added a new "Company profile" card: category, hiring stage, hiring
  difficulty badge, the full `typical_tech_stack` list as badges, and
  `notes` when present. When `hiring_difficulty` is null, an explicit
  small note explains why (no invented rating), preserving the original
  Stage 0 migration's stated intent of leaving it null rather than
  guessing.
- The rest of the page (exit-tier linkage, application tracking, prep
  checklist) is unchanged — this was purely additive.

No hook or query changes were needed: both `useCompanies()` and
`useCompany(id)` already `select("*")`, so the new fields were already
flowing to the client. Only the UI was missing.

---

## Gap 2 — Item 25: exercises were missing from cross-linking

**What was wrong:** The plan's exact wording was *"topics, exercises,
projects, and ClientSync features all mutually linked."* Topics, projects,
and ClientSync milestones were correctly wired into
`LinkableEntityType`/`buildLinkRegistry` in `note-links.ts`. Exercises were
not — not present in the type, not in the registry-building function, and
`note-text.tsx`'s `hrefForEntity` switch only handled three cases. There
was no comment explaining this as a deliberate scope cut; it was a
straightforward omission.

**Fix (`src/lib/note-links.ts`):**
- Added `"exercise"` to `LinkableEntityType`.
- `buildLinkRegistry` now takes an optional fourth `exercises: StageExercise[]`
  parameter (defaults to `[]` so existing callers that haven't been updated
  don't break) and registers each exercise's `description` as matchable
  text — same pattern already used for ClientSync milestones, which also
  lack a short title field.
- `computeBacklinks` needed no changes: it was already entity-type-agnostic.

**Fix (`src/lib/hooks/use-roadmap.ts`):**
- `useLinkRegistry()` now passes `roadmap?.stageExercises ?? []` as the
  fourth argument. No new fetch was required — `useRoadmap()` already
  fetches `stage_exercises` for the roadmap page's own exercise list, so
  this reuses data that was already on hand, consistent with how the other
  three entity types were wired.

**Fix (`src/components/roadmap/note-text.tsx`):**
- Added an `"exercise"` case to `hrefForEntity`. Exercises have no
  dedicated detail route (they render inline inside a stage's accordion
  panel on `/roadmap`), so a linked exercise resolves to `/roadmap` — the
  same "link to parent page" pattern already used for stage projects
  (`/projects`) and ClientSync milestones (`/clientsync`), both of which
  also lack their own routes.

**Scope note:** This fix makes `[[exercise description]]` links in notes
resolve, render as clickable, and participate in backlink computation —
matching what topics/projects/milestones already do. It does not add a new
exercise detail page or a `ReferencedInPanel` on the roadmap page itself,
because no such per-exercise view exists for any of the other inline-only
entity types either (projects, milestones) — adding one exclusively for
exercises would be new scope beyond closing this specific gap.

---

## Hygiene fix — unused `next-pwa` dependency

**What was wrong:** `package.json` listed `next-pwa": "^5.6.0"` as a
dependency, but the actual offline-mode implementation (Stage 6, Item 50)
is a hand-written service worker (`public/sw.js`), manually registered via
`navigator.serviceWorker.register("/sw.js")` in
`offline-indicator.tsx` — for a real, already-documented reason: `next-pwa`
wraps webpack config, and Next.js 16 defaults to Turbopack, where a custom
webpack config breaks `next build` outright rather than degrading
gracefully. `next.config.ts` never imports or wraps with `next-pwa`, so the
package sat in `package.json` unused — dead weight, not a functional bug.

**Fix:** Removed the `next-pwa` line from `package.json`'s `dependencies`.
`package-lock.json` was left untouched rather than hand-edited — it's
machine-generated and will self-correct on the next `npm install`; hand-
editing a lockfile without running the installer risks producing an
inconsistent lock, which is a worse outcome than one harmless stale entry
that disappears on the next real install.

---

## Outcome

All three issues found during the full 55-item validation are now closed:

| Issue | Status |
|---|---|
| Item 3 — Company Profiles UI lagging schema | **Fixed** — category, hiring stage, tech stack, hiring difficulty, and notes now render on both Companies pages |
| Item 25 — exercises missing from cross-linking | **Fixed** — exercises now participate in `[[...]]` linking and backlinks, same as topics/projects/milestones |
| Unused `next-pwa` dependency | **Fixed** — removed from `package.json` |

No other changes were made. Every other item across all 55 spec entries
was independently confirmed Built by direct source read during the
validation pass that preceded this fix.

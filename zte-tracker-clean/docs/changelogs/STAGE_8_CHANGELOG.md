# Stage 8 — Build-section audit and terminology fix

## Context

Picked up a task framed as "finish the Build section, which stopped after
Projects/Portfolio/ClientSync/Architecture were begun." That framing was
stale: all four pages already existed, and `CHANGELOG.md` /
`STAGE_7_FOLLOWUP_CHANGELOG.md` show the app had already passed Stage 7 plus
a full 55-item validation pass. Rewriting per the stale brief would have
reverted already-correct work, so this session audited the actual current
code instead of trusting the prompt's premise.

## What was found and fixed

**Terminology collision — "Portfolio projects" (Item was claimed done, was not).**
An earlier changelog states the `/projects` tab was renamed "Portfolio
projects" → "Capstone builds" to disambiguate from the separate `/portfolio`
advanced-SaaS-ideas system. The rename was never applied:

- `src/app/(app)/projects/page.tsx` — tab still read "Portfolio projects".
  Changed to **"Capstone builds"**.
- `src/app/(app)/portfolio/page.tsx` — page title was *also* "Portfolio
  Projects" (same phrase, different concept, different route). Changed to
  **"Portfolio Ideas"**; description now explicitly states it's distinct
  from Capstone builds.

**Dead duplicate route — `/portfolio/ideas`.**
`/portfolio` and `/portfolio/ideas` rendered near-identical listings (diff
showed only cosmetic differences — one had motion primitives, one didn't).
Sidebar links to `/portfolio` only; nothing navigates to `/portfolio/ideas`
directly. Worse, `/portfolio/ideas/[id]`'s own back-button linked to
`/portfolio/ideas`, not `/portfolio` — a genuine broken-navigation
inconsistency, not just a stylistic duplicate.

- Fixed the back-link in `portfolio/ideas/[id]/page.tsx` to point to
  `/portfolio`.
- Replaced `portfolio/ideas/page.tsx` with a `redirect("/portfolio")` rather
  than deleting the route outright, in case anything external links to it.

**Minor — internal link using `<a>` instead of `<Link>`.**
`src/app/(app)/architecture/page.tsx` linked to `/clientsync` with a raw
`<a>` tag (full page reload) instead of Next's `<Link>`. Swapped for
consistency with the rest of the app's internal navigation.

## What was checked and found already correct

- **ClientSync** (`/clientsync`, 455 lines) — real workflow: status select,
  repo/deployment/demo URLs, notes, screenshot gallery, pin-to-workspace,
  backlinks panel, loading skeletons, empty state. No changes needed.
- **Architecture** (`/architecture`, 363 lines) — manifest-derived table/route
  data (`architecture_manifest.json`, generated from actual migrations and
  hook files, not hand-typed), orphan-table warning, bidirectional FK
  navigation, separate hand-drawn ClientSync diagram tab. No fabricated data
  found. No changes needed beyond the `<a>`→`<Link>` swap above.
- **Full route audit (26 route areas under `(app)`)** — every static and
  template-literal `href` checked against actual route folders, including
  dynamic `[id]` segments. Zero dead links.
- **`/dependency-graph`** — absent as a standalone route, but this is
  documented and intentional: code comments in `sidebar.tsx`,
  `learning-path-view.tsx`, and `roadmap/page.tsx` confirm it was folded into
  Roadmap as a tab during a prior IA pass. Not a regression.
- **TODO/FIXME/"coming soon" sweep** across `src/app`, `src/components`,
  `src/lib` — zero matches.

## Deliberately unchanged

Every other page across the 26 route areas — no genuine UX/IA defects found
on inspection beyond the two above. Per the standing risk rule (defer touching
complex, already-good pages), nothing else was rewritten.

## Verification

- `npx tsc --noEmit` — clean, zero errors, both before and after changes.
- `npx eslint .` — zero errors; 6 pre-existing unused-var warnings
  (`dashboard/page.tsx`, `job-readiness/page.tsx`,
  `api/github-activity/route.ts`, `u/[slug]/page.tsx`) are unchanged by this
  session and unrelated to touched files.
- `npm run build` — Turbopack compile succeeds. The only build failure in
  this sandbox is `next/font/google` unable to reach
  `fonts.googleapis.com` (blocked by the sandbox's network allowlist, not a
  code defect). Confirmed by stubbing the font import: the rest of the app,
  including every file touched this session, compiles cleanly.

## Requires live testing (unverified here)

- Supabase read/write paths — no live project/credentials in this
  environment. All touched code reuses existing hooks
  (`upsertProjectProgress`, `useAdvancedProjects`, etc.); no schema or query
  changes were made this session.
- Browser click-through of the redirect (`/portfolio/ideas` →
  `/portfolio`) and the corrected back-link — logic is standard Next.js
  (`redirect()` from `next/navigation`, matches the pattern used elsewhere
  in the app) but not exercised in a live browser here.

---

## Follow-up — UI consistency pass

Checked every page's title class (`text-page-title font-semibold
tracking-tight`), root wrapper spacing (`flex flex-col gap-N`), and
loading/empty-state usage across all 24 route pages.

- **`skills/page.tsx`** root wrapper used `gap-8` — every other page uses
  `gap-6`. Fixed to `gap-6`.
- Everything else checked out: page titles are consistent, all pages with
  async data have `Skeleton` loading states (architecture correctly has
  none — its data is a static JSON import, not a fetch), `EmptyState` is
  used wherever a list can legitimately be empty.

No other spacing/typography/component drift found.

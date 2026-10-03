# Stage 6 — Retention, Gamification & Platform Polish — Completed

All three items in Stage 6 of `ZTE_Tracker_Execution_Plan_docx.md` are
addressed in this package. One deviates from the plan's literal execution
steps for a compatibility reason explained below (Item 50); one is
partially built with the unbuilt portion documented rather than silently
skipped (Item 30).

**Verification:**
- `npm install` — clean.
- `npx tsc --noEmit` — no errors.
- `npx eslint .` — 14 pre-existing errors (all `react-hooks/set-state-in-effect`
  in `use-theme.ts`, `use-topic-locking.ts`, `use-developer-mode.ts`,
  `topic-detail-sheet.tsx`, flagged as pre-existing since Stage 4/5) plus
  12 pre-existing warnings. Zero new errors introduced by this stage. One
  new error was introduced mid-stage by `offline-indicator.tsx` (same
  category, from reading `navigator.onLine` inside a mount effect) and was
  fixed properly — via `useSyncExternalStore`, React's actual recommended
  primitive for subscribing to external browser state — rather than
  suppressed. Confirmed via before/after error counts (27→26 total
  problems, 15→14 errors) that the fix removed exactly that one issue and
  nothing else shifted.
- `npm run build` — compiles clean, all 33 routes generated (same route
  count as Stage 5's baseline). Requires `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` at build time (same pre-existing
  requirement as Stage 4/5).
- Live HTTP verification against the built app (`npm run start`):
  unauthenticated `GET /sw.js` → 200, unauthenticated `GET /offline.html`
  → 200, unauthenticated `GET /dashboard` → 307 to `/login?next=%2Fdashboard`
  — confirming the new middleware exemption is scoped to exactly the two
  files that need it and does not weaken auth on any real route.

---

## Item 28 — Completion Certificates

**Status before (per plan):** Missing
**Actual status found:** Partially already built — `src/lib/certificate.ts`
(`downloadCertificate()`, full landscape PDF via `jspdf`) existed and was
already wired into Phase-completion (`roadmap/page.tsx`) and Exit-Point-
completion (`exit-ladder/page.tsx`), neither of which is mentioned in the
Stage 5 changelog. The plan's "Status: Missing" call was written before
this existed, or before it was audited — either way, treating it as a
from-scratch build would have duplicated working code.
**Status after:** Built. All three trigger points named in the plan
(Stage, Phase, Exit Point) now exist.

**What changed (`src/app/(app)/roadmap/stage/[id]/page.tsx`):**
- Added a "Certificate" button next to the stage progress bar, gated on
  `completedCount === topics.length` (100% topic completion) — the same
  gating pattern already used by the Phase and Exit Point buttons.
- Added `useDisplayName(user?.id)` (an existing hook whose own doc comment
  names certificate generation as its purpose — reused, not duplicated) to
  source the recipient name, matching the other two call sites exactly.
- No changes to `certificate.ts` itself — `downloadCertificate()` already
  accepted an arbitrary `milestoneTitle`/`milestoneSubtitle`, so a third
  caller needed no new parameters.

**Not touched:** the pre-existing `mutate` destructured from
`useStageDetail` on this page was already unused before this edit (never
called anywhere in the original file). Left as-is — fixing an unrelated
pre-existing lint warning wasn't part of this item's scope, and is noted
here rather than silently changed.

## Item 50 — Offline Mode

**Status before:** Missing — `next-pwa` installed but unconfigured in
`next.config.ts`, confirmed in the Stage 5 audit.
**Status after:** Built — via a hand-written service worker, not
`next-pwa`. This is a deliberate deviation from the plan's literal
execution steps, explained below.

**Why not `next-pwa` as the plan describes:**
`next-pwa@5.6.0` works by wrapping `next.config.ts`'s webpack config. This
app runs Next.js 16.2.12, where Turbopack is now the default builder for
both `next dev` and `next build`, and Next's own upgrade documentation
states that a custom webpack config now makes `next build` **fail outright**
rather than silently degrading, specifically to prevent misconfiguration.
Configuring `next-pwa` as the plan's execution steps literally describe
would risk breaking the production build for the entire app — an
unacceptable trade to add one Stage 6 polish item, and the opposite of the
plan's own completion bar ("test on a real network-disabled session").
This was verified via web search against Next.js's official version-16
upgrade guide before deciding to deviate, not assumed.

**What was built instead (`public/sw.js`, `public/offline.html`,
`src/components/layout/offline-indicator.tsx`):**
- A minimal, manually-registered service worker. Registration happens
  client-side from a new `OfflineIndicator` component mounted in the root
  layout, guarded so a registration failure (unsupported browser, blocked
  by an extension) never breaks the app itself.
- **Caching scope, and why it's deliberately narrow:** every route in this
  app requires auth and renders live, per-user Supabase data — unlike a
  marketing site, there is no page that is "just static content"
  independent of a network round trip. Precaching full pages with live
  data and serving them offline would show stale progress/notes as if
  current, which is worse than an honest offline state. So the service
  worker caches only the app shell (`_next/static/*`, content-hashed and
  safe to cache indefinitely) cache-first, and page navigations
  network-first-falling-back-to-last-cached-copy-of-that-URL, with an
  `/offline.html` fallback for any route never visited while online.
- **Writes are never touched, let alone dropped:** the fetch handler
  explicitly returns early (does nothing) for any non-GET request and for
  any request whose hostname matches Supabase, at any path. A write
  attempted while offline hits a dead network exactly as it would with no
  service worker at all, and fails through the app's existing
  `toast.error(...)` paths (`updateTopicProgress`, `saveJournalEntry`,
  `handleAddNote`, etc.) — visible and immediate, not silently dropped,
  satisfying the plan's explicit requirement.
- A queued-write/retry pattern for offline writes was considered and
  rejected for this pass: it would require building conflict resolution
  for every mutation path in the app (what happens if the same topic was
  also edited from another device while this one was offline?), which is
  a materially larger feature than "don't lose data," and risks silently
  replaying a stale write against data the person has since changed
  elsewhere. Scoped out deliberately, not an oversight.
- **`OfflineIndicator`** also shows a small "Offline — showing last-loaded
  data" badge whenever `navigator.onLine` is false, using
  `useSyncExternalStore` (not `useState` + effect) to read it. This exists
  because the caching scope above means a person offline is looking at a
  cached shell with possibly-stale SWR data — the badge is what keeps that
  honest rather than visually identical to a live session.

**Also fixed (`src/middleware.ts`):** the existing auth-redirect matcher
did not exempt `sw.js` or `offline.html`. Without this, the service
worker's own registration request — and the offline fallback page, which
by definition must load with zero network/auth dependency — would be
caught by the middleware and redirected to `/login`, breaking registration
silently. Found by reading the matcher's negative-lookahead regex against
what it actually excludes, not assumed; confirmed against the compiled
`middleware-manifest.json` and a live unauthenticated `curl` request
before considering this closed.

## Item 30 — Production Polish

**Status before:** Partial — keyboard shortcuts existed; autosave, undo,
and optimistic UI unconfirmed.
**Status after:** Partial → autosave built and verified on Journal;
optimistic UI confirmed absent everywhere, documented rather than built
(see below); undo not addressed this stage (not named in the plan's
execution steps for this item beyond the audit).

**Autosave — what changed (`src/app/(app)/journal/page.tsx`,
`src/lib/hooks/use-debounced-callback.ts`):**
- Added `useDebouncedCallback`, a small local hook (2000ms), rather than
  pulling in `lodash` or `use-debounce` — neither was already a dependency,
  and this is the only place in the codebase that needs debouncing,
  matching the existing pattern of hand-rolled utilities over new
  dependencies for single-use needs (`revision-schedule.ts`,
  `roadmap-diff.ts`).
- Journal's `TodayForm` now autosaves 2s after any field changes, gated by
  a `hasEditedRef` so it never fires from the component's own hydration-via-
  remount (it remounts keyed on `todayLog?.updated_at` by design, per the
  existing comment in that file — without the guard, every remount would
  look identical to an edit and fire a no-op upsert).
- A separate `autosaveStatus` state (distinct from the explicit Save
  button's `saving` state) shows "Autosaving…" / "Autosaved" next to the
  button. Autosave failures are silent (no toast) by design — a toast every
  ~2s of typing would be noisy — the status line is the honest signal
  instead, and the explicit Save button (which does toast) remains the
  reliable fallback path.
- Autosave deliberately does not call `onSaved()`/`mutate()` on the parent:
  doing so would refetch `todayLog` and remount the form mid-type (per the
  key above), losing cursor position and focus. It persists silently in
  the background; the next real visit picks up the saved values normally.

**Autosave — deliberately NOT extended to topic notes
(`topic-detail-sheet.tsx`):** the plan's Item 30 execution steps say
"Notes and Journal editors," written as if both are the same shape. They
aren't. Journal's fields are a single daily draft, edited and overwritten
in place — a genuine autosave target. Topic notes are an append-only log:
each "Add note" click creates a new, distinct, individually-deletable row.
There is no draft buffer to autosave; debouncing the `newNote` textarea
and calling the same insert path would create a new duplicate note row
every 2 seconds of typing, which is actively wrong, not merely
unnecessary. Autosaving this correctly would require a schema change (a
separate `draft_note` column) that Item 30 doesn't ask for and that
would expand this item's scope well past a polish pass — scoped out
deliberately.

**Optimistic UI — audited, not built.** Every `mutate()` call in the
codebase (10 call sites across `dsa/page.tsx`, `projects/page.tsx`,
`portfolio/ideas/[id]/page.tsx`, `career/page.tsx`, `settings/page.tsx`,
`interviews/page.tsx`) was checked directly via `grep -rn "optimisticData\|
rollbackOnError"` — zero matches anywhere. Every mutation is a bare
`await mutate()` refetch-after-write, not SWR's optimistic pattern. This
is a stronger finding than the plan's "needs confirmation" framing implied
— it's not a spot gap, it's the whole app.
Retrofitting this correctly is out of scope for this pass, not skipped
out of convenience: `usePhasesWithProgress` (the hook backing the
highest-traffic mutation, topic completion) composes two independently-
fetched SWR resources (`useRoadmap` + `useProgress`) and merges them in
plain JS on every render — there's no single SWR key a caller could pass
`optimisticData` against directly. Doing this properly means restructuring
`useProgress`'s `mutate` call at every call site to construct the correct
optimistic array shape, including edge cases already documented in
`toggleTopicComplete` itself (revision-status and due-date side effects on
completion) — real, non-trivial, per-mutation work, not a single shared
fix. Recommended as a dedicated follow-up item rather than attempted
piecemeal here.

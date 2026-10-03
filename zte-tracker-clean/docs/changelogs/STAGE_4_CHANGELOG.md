# Stage 4 — Cross-Linking & Knowledge Graph — Completed

Both items in Stage 4 of `ZTE_Tracker_Execution_Plan_docx.md` are built in
this package.

**Verification note:** unlike Stage 3's session, this sandbox had network
access. All four standard checks were run and pass clean:

- `npm install` — 763 packages, no errors.
- `npx tsc --noEmit` — no errors.
- `npx eslint .` — no errors or warnings in any file touched this stage.
  (The full-repo lint still reports 16 pre-existing `react-hooks/set-state-in-effect`
  errors and a handful of warnings in files this stage didn't touch —
  `use-developer-mode.ts`, `use-theme.ts`, `use-topic-locking.ts`, and two
  `useEffect`s in `topic-detail-sheet.tsx` / the topic detail page that
  predate this stage. Not introduced or modified here; flagged for a future
  cleanup pass rather than silently left out of this note.)
- `npm run build` — compiles clean and prerenders all 32 routes. (Build
  requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` to be
  set — without them `/welcome`'s prerender fails on Supabase client
  construction, unrelated to this stage's changes. Confirmed clean with
  dummy values; use real project values for an actual deploy.)

---

## Stage 4 — Item 25: Resource Cross-Linking — full graph

**Status before:** Partial (`[[topic]]` linking existed in `note-links.ts`,
but only between notes and topics)
**Status after:** Built

**What changed:**

- **`src/lib/note-links.ts`** — generalized from a topic-only matcher to a
  three-entity registry. New `LinkableEntity` type (`topic` | `project` |
  `clientsync_milestone`) and `buildLinkRegistry()`, which builds one
  combined lowercase-keyed map from topic titles, stage project names, and
  ClientSync milestone descriptions. `parseNoteLinks()` and
  `computeBacklinks()` were rewritten against this registry instead of a
  topic-only `Map<string, Topic>` — same exact-match, no-fuzzy-matching
  behavior as before, just entity-agnostic now. Milestones don't have a
  separate short title field, so their full `description` is the matchable
  text (mirroring how a project's short `name` — not its longer
  `description` — is what's matchable for projects).

- **`src/lib/hooks/use-roadmap.ts`** — added `useLinkRegistry()`, a thin hook
  that calls `buildLinkRegistry()` over data every consumer already fetches
  via `useRoadmap()` / `useClientSyncMilestones()`. No new Supabase queries.

- **`src/components/roadmap/note-text.tsx`** — rewritten to accept a
  `registry: Map<string, LinkableEntity>` prop instead of `allTopics:
  Topic[]`, and to route each resolved link by entity type: topics still go
  to `/roadmap/topic/[id]`; stage projects and ClientSync milestones don't
  have their own detail routes (a project renders inline on `/projects`, a
  milestone opens as a dialog on `/clientsync`), so both route to their
  parent page rather than a 404.

- **`src/components/roadmap/topic-detail-sheet.tsx`** and
  **`src/app/(app)/roadmap/topic/[id]/page.tsx`** — updated to the new
  `NoteText`/`computeBacklinks` signatures. The topic detail page's existing
  "Linked from" panel is unchanged visually — it was already the reverse-
  lookup pattern the plan asks to mirror, just re-pointed at the new
  registry-based `computeBacklinks` so it also catches project/milestone
  links made *from* a topic's notes, not only topic-to-topic links.

- **`src/components/roadmap/referenced-in-panel.tsx`** (new) —
  `ReferencedInPanel`, the "Referenced in" reverse-lookup panel for entities
  that don't have their own detail page (stage projects, ClientSync
  milestones), per the plan's explicit instruction. Same visual language as
  the topic page's "Linked from" card, scaled down to fit inline inside an
  existing card/dialog rather than as a standalone `<Card>`.

- **`src/app/(app)/projects/page.tsx`** — wired `ReferencedInPanel` into
  each stage project's `<li>` on the Stage Projects tab, showing every note
  (anywhere in the app) that links to that project via `[[Project Name]]`.
  Portfolio (capstone) tab was left alone — a capstone's "project" is really
  its parent phase, which is a `topic`-adjacent concept already covered by
  topic-level backlinks, not a distinct linkable entity in this pass.

- **`src/app/(app)/clientsync/page.tsx`** — wired `ReferencedInPanel` into
  the milestone detail dialog, between the Notes textarea and the
  Screenshots section, showing every note that links to that milestone via
  `[[milestone description]]`.

- Both note-entry placeholder strings (topic detail page and
  `topic-detail-sheet.tsx`) updated from *"use `[[Topic Title]]` to link
  another topic"* to *"use `[[Name]]` to link a topic, project, or
  ClientSync milestone"* so the expanded matching set is actually
  discoverable.

**No schema changes** — matches against `topics.title`, `stage_projects.name`,
and `clientsync_milestones.description`, all pre-existing columns already
fetched by `useRoadmap()` / `useClientSyncMilestones()`.

## Stage 4 — Item 44: Architecture Explorer — ClientSync-specific view

**Status before:** Partial (existing `/architecture` visualizes the app's
own codebase — tables, routes, migrations — a different, also-useful thing)
**Status after:** Built

**What changed:**

- **`src/components/architecture/clientsync-architecture-diagram.tsx`**
  (new) — a hand-authored SVG diagram of ClientSync's own architecture:
  web client + Expo mobile client → API layer (Next.js route handlers /
  server actions, plus a WebSocket/SSE channel for real-time features) →
  auth (Supabase Auth) / database (Postgres via Supabase) / integrations
  (Razorpay, Resend) → deployment & observability (Docker, CI badge,
  PostHog, Sentry). This is drawn by hand rather than generated, per the
  plan's reasoning — ClientSync's architecture is the person's own project
  choice, not something `roadmap.md` specifies structurally the way the
  schema/routes explorer's tables and migrations are. The concrete
  integrations shown (Razorpay/Resend/PostHog/Sentry/WebSockets/Docker/Expo)
  are pulled directly from the seeded `clientsync_milestones` descriptions
  rather than invented, and each box's phase reference traces back to the
  specific milestone that introduces it. Uses the app's existing CSS custom
  properties (`--surface`, `--surface-2`, `--border`, `--foreground`,
  `--muted`, `--accent`, `--success`) so it matches the rest of the UI in
  both light and dark mode with no separate color logic.

- **`src/app/(app)/architecture/page.tsx`** — the existing codebase explorer
  is kept exactly as it was (per the plan: "not a mistake"), now inside a
  "This app's codebase" tab. Added a second "ClientSync architecture" tab
  rendering the new diagram inside a `Card`, with a short link over to
  `/clientsync` for live milestone-progress tracking (the diagram itself is
  a static target-architecture snapshot, not a live query — noted in the
  card's own description so it isn't mistaken for one).

**No schema changes** — the diagram is a static hand-authored component;
its content was informed by reading `clientsync_milestones` rows during
authoring, not by querying them at render time.

## Not verified this session

Nothing — all four checks (`npm install`, `tsc --noEmit`, `eslint`,
`npm run build`) ran clean this session, network access permitting.

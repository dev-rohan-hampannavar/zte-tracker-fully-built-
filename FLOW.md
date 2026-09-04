# Flow

Two flows are documented here:

1. **User flow** — the screens a person moves through.
2. **Data flow** — how data gets from source files into the running app.

---

## 1. User flow

### Entry

```
Visitor hits "/"
  │
  ├─ Signed in?  ──yes──▶  redirect to /dashboard
  │
  └─ no
      │
      ▼
  Landing page (src/app/page.tsx → landing-page.tsx)
      │
      ├─▶ "How it works" ──▶ /welcome (onboarding carousel)
      │
      └─▶ "Sign in" ──▶ /login
```

- `/welcome` — a multi-step onboarding carousel (orientation, why-this-works,
  master phase table, navigation notes) pulled live from roadmap data via
  `use-roadmap` hooks. Ends by sending the visitor to `/login`.
- `/login` — email/OTP auth via Supabase. On success, `auth/callback/route.ts`
  exchanges the code for a session and redirects to `/dashboard` (or a `next`
  param if one was set).

### Authenticated app

Every route under `src/app/(app)/` is gated by `(app)/layout.tsx`, which
redirects to `/login` if there's no session. Once past that gate:

```
(app)/layout.tsx
  │
  ├─ Sidebar (desktop, ≥ md)         — full nav, logo-mark.png header
  ├─ MobileNav (< md)                — collapsed drawer, logo-mark.png header
  ├─ AppTopbar                       — search, notifications, theme
  │
  └─ {children} — one of:
       dashboard          — today's lesson, streak heatmap, revision-due widget
       roadmap            — phase → stage → topic drill-down
         roadmap/phase/[id]
         roadmap/stage/[id]
         roadmap/topic/[id]
       roadmap-diff        — compares two roadmap_snapshot_v*.json versions
       dsa                 — DSA gate tracking
       projects            — advanced project tracking
       career              — career-related tracking
       companies            — company research
         companies/[id]
       interviews           — interview prep
       exit-ladder          — capstone/exit criteria
       portfolio            — portfolio idea tracking
         portfolio/ideas
         portfolio/ideas/[id]
       journal               — learning journal entries
       revision              — spaced-revision queue
       achievements           — earned achievements
       statistics             — progress stats
       skills                  — skill tracking
       technologies            — technology reference
         technologies/[id]
       reference               — curated resources
       resume                  — resume builder
       clientsync              — client sync feature
       dependency-graph        — project dependency visualization
       architecture            — architecture manifest viewer
       workspace               — misc workspace
       settings                — account/app settings
```

Sign-out (from Sidebar or MobileNav footer) calls Supabase `signOut()` and
routes back to `/login`.

### Public-facing (no auth)

- `/u/[slug]` — a public profile showcase page for a user who's opted in,
  with a matching `opengraph-image.tsx` for social previews.
- `/api/public/[slug]` — the API route backing that public profile.
- `/api/cron/weekly-summary` — scheduled route, not user-navigated; sends
  the weekly summary email (see `weekly-summary-email.ts`).

---

## 2. Data flow

### Roadmap content: markdown → seed data → Supabase → UI

The roadmap curriculum itself starts as a single markdown file and is
parsed into structured data before it ever reaches the database:

```
roadmap.md
  │
  ├─ scripts/parse_roadmap.py        ──▶ data/seed.json (phases 2+)
  ├─ scripts/parse_roadmap_part1.py  ──▶ data/seed_part1.json (phase 1)
  │
  ▼
scripts/merge_seed.py  (merges seed.json + seed_part1.json)
  │
  ▼
scripts/generate_seed_sql.py
  │
  ▼
supabase/seed_data.sql, seed_data_part1.sql, seed_data_structural.sql
  │
  ▼
Supabase Postgres (applied via supabase/migrations/*.sql + these seed files)
  │
  ▼
src/lib/hooks/use-roadmap.ts (and sibling hooks)  — SWR + Supabase client
  │
  ▼
Page components (roadmap/, dashboard/, welcome/, etc.)
```

### Roadmap versioning (the roadmap-diff feature)

A separate, related pipeline snapshots the roadmap over time so changes can
be diffed:

```
data/seed.json (current parsed state) + roadmap.md
  │
  ▼
scripts/snapshot_roadmap.py
  │
  ├─▶ data/roadmap_snapshot_v{N}.json   (versioned snapshot)
  └─▶ supabase/seed_data_snapshot_v{N}.sql
  │
  ▼
scripts/diff_roadmap_snapshots.py <a> <b>
  │
  ▼
data/roadmap_diff_v{a}_v{b}.json
  │
  ▼
src/lib/roadmap-diff.ts  (same diff algorithm, used client-side)
  │
  ▼
/roadmap-diff page
```

### Manual day-mapping data

```
supabase/topic_day_map_candidates.csv  (candidate mappings)
  │
  ▼
supabase/seed_topic_day_map.sql
  │
  ▼
Supabase (topic_day_map table)
  │
  ▼
src/lib/hooks/use-manual-day.ts  ──▶ components that show "Day N" labels
```

### Runtime data path (any authenticated page)

```
Browser
  │
  ▼
Next.js middleware (src/middleware.ts)
  │  refreshes the Supabase session cookie via
  │  src/lib/supabase/middleware.ts on every non-static request
  ▼
Server Components (src/lib/supabase/server.ts client)
  │  used for the initial auth check in layout.tsx / page.tsx
  ▼
Client Components (src/lib/supabase/client.ts client)
  │  used inside "use client" hooks (src/lib/hooks/*) via useSWR,
  │  which call Supabase directly from the browser (RLS-enforced)
  ▼
Rendered UI
```

`src/lib/supabase/admin.ts` is the only client using the service-role key —
it's used only in trusted server contexts (the weekly-summary cron route),
never reachable from the browser.

### Branding asset flow (see also DECISIONS.md)

```
public/icons/logo-mark.png   (canonical source, 1254×1254)
  │
  ├─▶ favicon-16x16.png, favicon-32x32.png, favicon.ico   (resized)
  ├─▶ android-chrome-192x192.png, android-chrome-512x512.png (resized)
  ├─▶ apple-touch-icon.png                                  (resized)
  ├─▶ icons/icon-192.png, icons/icon-512.png                (resized)
  │
  ├─▶ referenced directly (as <Image>) in:
  │     sidebar.tsx, mobile-nav.tsx, login/page.tsx,
  │     welcome/page.tsx, landing-page.tsx
  │
  └─▶ declared in src/app/layout.tsx `metadata.icons`
        and public/manifest.json / site.webmanifest
```

If `logo-mark.png` is ever replaced, every file in the "resized" branch
should be regenerated from it — see the icon-generation step in
`DECISIONS.md`'s log for the exact approach (Pillow `resize` per target
dimension, `LANCZOS` filter, no cropping since the source is square).

# ZTE Tracker — Zero to Elite Roadmap Companion

A daily execution tracker for the **Zero to Elite — The Complete Engineering Roadmap**
(21 phases, 303 topics, ~3,034 hours). Not a course platform — a productivity tool that
sits on top of the roadmap and helps you actually finish it.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Postgres, Auth, RLS).

---

## 1. Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- The Supabase CLI (optional but recommended): `npm install -g supabase`

---

## 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
3. Go to the **SQL Editor** in the Supabase dashboard and run, in order:
   1. `supabase/migrations/0001_init.sql` — creates all tables, RLS policies, triggers.
   2. `supabase/seed_data.sql` — loads the parsed roadmap content (21 phases, 303 topics,
      9 exit-ladder rungs). This is regenerated from the roadmap markdown — see
      [Regenerating seed data](#6-regenerating-seed-data-roadmap-import) below.
4. Under **Authentication → Providers**, ensure **Email** is enabled. This app uses
   **magic link** and **email OTP** only — no passwords. Under **Authentication → URL
   Configuration**, add your deployed URL (and `http://localhost:3000` for local dev) to
   the redirect allow-list.

---

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. You'll be redirected to `/login`. Sign in via magic link
or email code — first sign-in auto-creates your account (no separate sign-up flow).

---

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the repo in the Vercel dashboard. Add the two env vars from `.env.example`
under **Project Settings → Environment Variables**, then add your production domain to
Supabase's redirect allow-list (step 2.4 above).

---

## 6. Regenerating seed data (roadmap import)

If you update the roadmap markdown (new topics, reordered phases, changed hours), the
seed data can be regenerated without touching the app code:

```bash
# 1. Place the updated roadmap markdown at the repo root as roadmap.md
# 2. Re-parse it into structured JSON
python3 scripts/parse_roadmap.py

# 3. Regenerate the SQL seed file from that JSON
python3 scripts/generate_seed_sql.py

# 4. Re-run supabase/seed_data.sql in the Supabase SQL editor
```

`scripts/parse_roadmap.py` extracts phases (band, hours, exit code, build-in-public
prompt), the numbered topic tables per phase, the Exit Point Ladder, and rolls up
metadata (total phases/topics/hours). It's intentionally simple regex-based parsing
tied to this roadmap's specific Markdown conventions (`# **Phase NN — Title**` headers,
`| # | TOPIC | ... |` tables, `▌ Exit Point Ladder` section) — if the source document's
structure changes significantly, the parser will need matching updates.

**Note on user progress:** the seed script only touches the *static* tables (`phases`,
`topics`, `exit_ladder`, `roadmap_metadata`). It does not delete or modify any user's
`topic_progress`, notes, logs, etc. If you renumber or delete topic IDs, any progress
rows referencing the old `topic_id` will be orphaned (cascade-deleted, per the FK) —
so change topic IDs sparingly once people are using the app.

---

## 7. Project structure

```
src/
  app/
    (app)/            # authenticated routes (sidebar layout)
      dashboard/       roadmap/         projects/
      dsa/             exit-ladder/     career/
      statistics/      revision/        reference/
      settings/
    auth/callback/     # magic-link exchange route
    login/             # sign-in page
  components/
    ui/                # design-system primitives (button, card, dialog, ...)
    layout/            # sidebar, mobile nav, topbar, global search
    dashboard/         # heatmap
    roadmap/           # topic detail dialog
  lib/
    supabase/          # browser / server / middleware clients
    hooks/             # data-fetching hooks (SWR-based), one per domain
  types/database.ts    # hand-written types mirroring the SQL schema
supabase/
  migrations/0001_init.sql   # schema + RLS + triggers
  seed_data.sql               # generated roadmap content
scripts/
  parse_roadmap.py            # markdown → data/seed.json
  generate_seed_sql.py        # data/seed.json → supabase/seed_data.sql
data/seed.json                # parsed roadmap (source of truth for seed_data.sql)
```

---

## 8. Notes on scope / deliberate omissions

Per the original spec, this app deliberately does **not** include: AI chat/tutor/quiz
features, social feed, messaging, community features, gamification beyond streaks, or
a native mobile app (it's a responsive PWA — installable from the browser).

**DSA gate targets** (75 Easy / 50 Medium) are defaults, not values stated verbatim in
the roadmap document — the source markdown doesn't specify exact counts. Edit
`roadmap_metadata.dsa_easy_target` / `dsa_medium_target` directly in Supabase if you
want different numbers.

**Fonts:** the layout ships with a system-font fallback stack (no external font
requests) so it builds in network-restricted environments. To use Inter / JetBrains
Mono from Google Fonts in production, swap `src/app/layout.tsx` back to
`next/font/google` once deployed somewhere with outbound internet access at build time.

**PWA icons** in `public/icons/` are solid-color placeholders — swap in real 192×192
and 512×512 PNGs before shipping.

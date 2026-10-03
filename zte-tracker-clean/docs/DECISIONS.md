# Decisions

This file has two parts:

1. **Log** — decisions actually made in this project, in the order they happened.
2. **Template** — copy this to record a new decision.

---

## Log

### 2026-08-16 — `logo-mark.png` is the single source of truth for branding

**Context:** The app had inconsistent branding — a Lucide `Terminal` icon was used
as a stand-in logo in the sidebar, mobile nav, login screen, welcome/onboarding
screen, and landing page, while `public/icons/logo-mark.png` (the actual logo)
sat unused. Favicon/PWA icon files (`favicon.ico`, `android-chrome-*.png`,
`icons/icon-192.png`, `icons/icon-512.png`, `apple-touch-icon.png`) were stale
and didn't match the real logo either.

**Decision:** `public/icons/logo-mark.png` is the canonical logo. Every UI
location that displays branding uses it directly (as an `<Image>`, aspect
ratio preserved, no stretching). All favicon/PWA icon files are generated
*from* it at the required dimensions, never hand-substituted.

**Consequences:**
- Removed `Terminal` icon usage from `sidebar.tsx`, `mobile-nav.tsx`,
  `login/page.tsx`, `welcome/page.tsx`, `landing-page.tsx`.
- Regenerated `favicon-16x16.png`, `favicon-32x32.png`, `favicon.ico`,
  `android-chrome-192x192.png`, `android-chrome-512x512.png`,
  `apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png` from
  `logo-mark.png`.
- Added explicit `icons` metadata in `src/app/layout.tsx` instead of relying
  on Next's implicit file-based favicon convention, to avoid two competing
  favicon declarations.
- Removed `src/app/favicon.ico` (the file-based auto-icon) since the explicit
  metadata now owns that responsibility — having both risks a duplicate/
  conflicting favicon declaration.
- `public/site.webmanifest` had empty `name`/`short_name` fields; filled them
  in and matched its `theme_color`/`background_color` to `public/manifest.json`
  (the manifest actually referenced by `layout.tsx`) rather than leaving two
  manifests with different colors.

### 2026-08-16 — Replaced the 64×64 `logo-mark.png` with a 1254×1254 version

**Context:** The original `logo-mark.png` was only 64×64. Every icon derived
from it — especially the 512×512 PWA icon — was an upscale of a 64×64 source,
which is visibly soft/blurry at large sizes.

**Decision:** Confirmed (via visual comparison and a pixel diff after
normalizing scale — mean diff 0.32/255, effectively noise) that a
user-provided 1254×1254 image was the *same* design, just higher resolution,
not a different logo. Replaced `logo-mark.png` with it and regenerated all
derived icon sizes from the new source.

**Consequences:** All icons are now downscaled from a high-res source instead
of upscaled from a low-res one — sharper at every size, same visual design.

### 2026-08-16 — Removed unused scaffold files, a deprecated script, and changelog files

**Context:** The repo carried some clearly dead weight alongside some files
that only *looked* unnecessary.

**Decision — removed, confirmed unreferenced by grep + typecheck + lint + build:**
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` —
  default Next.js scaffold assets, not imported anywhere.
- `scripts/parse_roadmap_v1_deprecated.py` — explicitly named deprecated,
  no other script or app code referenced it.
- `STAGE_2_CHANGELOG.md` through `STAGE_7_FOLLOWUP_CHANGELOG.md`,
  `CHANGELOG.md`, `P7-CHANGELOG.md` (9 files) — historical changelogs, only
  referenced in code *comments* (not imports), so safe to remove.

**Decision — explicitly kept, despite initially looking like "old seed/snapshot
data":**
- `data/roadmap_snapshot_v1.json`, `supabase/seed_data_snapshot_v1.sql` — these
  are the working data for the roadmap-diff/versioning feature
  (`src/app/(app)/roadmap-diff/`, `src/lib/roadmap-diff.ts`), not changelog
  artifacts.
- `supabase/seed_topic_day_map.sql`, `supabase/topic_day_map_candidates.csv` —
  used by `src/lib/hooks/use-manual-day.ts`.
- `data/seed.json`, `data/seed_part1.json`, `supabase/seed_data.sql`,
  `seed_data_part1.sql`, `seed_data_structural.sql` — active inputs/outputs of
  `scripts/generate_seed_sql.py`, `merge_seed.py`, `parse_roadmap.py`,
  `parse_roadmap_part1.py`, `snapshot_roadmap.py`.

**Rationale for the split:** "Looks old" and "is unused" are different
questions. Every removal in this project was verified with a repo-wide grep
for the filename *and* a green typecheck/lint/build before being treated as
safe — guessing based on file naming (e.g. "seed_data_snapshot" sounding like
a changelog) would have broken the roadmap-diff feature.

---

## Template

Copy this block for a new decision:

```md
### YYYY-MM-DD — <short decision title>

**Context:** What problem or question prompted this? What was the state
before?

**Decision:** What was actually decided/done. Be concrete — name the files,
components, or approach, not just the general direction.

**Alternatives considered:** (optional) What else was on the table and why
it lost out.

**Consequences:** What changed as a result — files touched, behavior changed,
follow-up work created, tradeoffs accepted.
```

**Guidelines for using this log:**
- Log a decision when it affects more than one file, changes a convention
  future work will follow, or reverses something that was there before.
- Don't log routine bug fixes or straightforward feature additions that
  follow existing patterns — this is for things a future contributor would
  otherwise have to reverse-engineer from git history.
- Prefer verifying claims (grep, typecheck, build) before writing "removed:
  safe" — record what you checked, not just the conclusion.

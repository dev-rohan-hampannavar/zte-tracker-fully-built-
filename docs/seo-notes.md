# SEO Implementation Notes

## Context that shapes everything below

ZTE Tracker is a personal, authenticated career-tracking app. Every route
under `(app)/` — dashboard, journal, roadmap, DSA, etc. — requires login
(see `src/lib/supabase/middleware.ts`). There are exactly **three** routes
a logged-out visitor, or Google, can actually reach:

- `/` — the marketing/landing page
- `/login`, `/welcome` — auth and onboarding (crawlable, but intentionally
  kept out of search results — nobody searches for a sign-in form)
- `/u/[slug]` — a public, opt-in progress profile a user can share

That's it. "SEO for ZTE Tracker" is really "SEO for the homepage and the
public profile page" — everything else in the checklist either doesn't
apply, or applies in the opposite direction (keeping private pages *out*
of search results, not putting them in).

## What was implemented in code

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Meta titles | Done | `src/app/layout.tsx` (title template), `src/app/page.tsx`, `src/app/u/[slug]/page.tsx` (`generateMetadata`), `src/app/login/layout.tsx`, `src/app/welcome/layout.tsx` |
| 2 | Meta descriptions | Done | Same files as above |
| 3 | Remove unnecessary noindex | Done — inverted | Root layout now defaults `robots: noindex`; `/` and `/u/[slug]` explicitly override back to `index: true`. This is safer than auditing dozens of `(app)/` pages for a tag none of them previously set — the default now does the job. |
| 4 | Image alt text | Already correct | Every `<Image>`/`<img>` in the app already had descriptive `alt` text — audited, no changes needed |
| 5 | Core Web Vitals | See caveat below | Not independently measured — see "What was NOT done" |
| 6 | sitemap.xml | Done | `src/app/sitemap.ts` — lists `/` plus every row in `user_settings` where `public_profile_enabled = true`, live from the database, no hardcoded URLs |
| 7 | Open Graph image | Already existed, now wired to metadata | `src/app/u/[slug]/opengraph-image.tsx` pre-existed; `generateMetadata` now supplies the surrounding `og:title`/`og:description`/`og:url` it needs |
| 8 | Broken links | See caveat below | Not fixable without crawling the live deployed site |
| 9 | Header hierarchy | Already correct | Every public page already had exactly one `<h1>` and sane `<h2>` usage — audited, no changes needed |
| 10 | Backlink strategy | Doc only, see below | Not a code change |
| 11 | URL slugs | Already correct | `/u/[slug]` slugs are already lowercase/hyphenated; no existing URLs changed |
| 12 | Internal linking | Not applicable | A single-page public profile has nothing else public to link to |
| 13 | Canonical tags | Done | `alternates.canonical` on `/` and `/u/[slug]` |
| 14 | HTTPS | Handled by Vercel | See caveat below |
| 15 | Image compression | Already handled | `next/image` serves AVIF/WebP automatically; no custom `images` config existed to misconfigure |
| 16 | Schema markup | Done | JSON-LD `ProfilePage`/`Person` on `/u/[slug]`, built only from real displayed data (name, bio, GitHub link) — no fake ratings/reviews/org info |
| 17 | Search Console readiness | Doc only, see below | Sitemap and robots.txt are live at build; verification itself is an external, manual step |
| 18 | robots.txt | Done | `src/app/robots.ts` — allows `/`, `/u/`, `/login`, `/welcome`; disallows every authenticated route by name |
| 19 | Mobile responsiveness | Not independently re-tested | See caveat below |

## What was NOT done, and why

**Core Web Vitals (#5) and mobile responsiveness (#19)** — these require
measuring the actual deployed site (Lighthouse, PageSpeed Insights, or
real device testing), not something verifiable by reading source code in
this environment. The codebase already does the things that typically
help (Next/Image, self-hosted fonts via `@fontsource`, no obvious
render-blocking scripts), but claiming Core Web Vitals "pass" without
running a real test against production would be a fabricated result.
**Once deployed, run this yourself**: https://pagespeed.web.dev/, enter
`https://www.zerotoelite.site`.

**Broken links (#8)** — detecting these requires crawling the live,
deployed site (a static audit of source code can't tell you if a GitHub
project link the user typed into their profile 404s, for instance).
**To check**: run a tool like https://www.deadlinkchecker.com/ or
`npx linkinator https://www.zerotoelite.site` against production after
deploying.

**HTTPS enforcement (#14)** — Vercel automatically provisions and enforces
HTTPS (including redirecting HTTP→HTTPS) for all deployments and custom
domains; there is no application-code lever for this. All URLs generated
by this implementation (`SITE_URL` in `src/lib/site-config.ts`) already
use `https://`, so canonical tags, sitemap entries, and OG URLs are
consistent with that.

**Backlink strategy (#10)** — see below; this is an outreach/content
activity, not something that lives in a codebase.

## Backlink strategy

ZTE Tracker's natural backlink opportunities all come from one thing: it's
a genuine build-in-public artifact of a real job search, not a product
being marketed cold. That's the honest angle to lead with everywhere below
— it reads as spam the moment it's framed as "check out my app."

**Where a mention could happen naturally:**
- Your own `/u/[slug]` public profile, linked from your GitHub profile
  README, LinkedIn "featured" section, and resume — the highest-value,
  zero-risk backlink you control directly.
- Dev.to / Hashnode posts about *the roadmap itself* (e.g. "How I'm
  structuring my path from BCA grad to SDE-1") that mention the tracker
  as the tool you built to execute on it — content-first, tool-second.
- r/cscareerquestions, r/developersIndia, r/learnprogramming — only in
  response to threads genuinely asking "how do you track daily study/DSA
  progress," not as a standalone promotional post (most of these
  subreddits explicitly ban that and will remove it).
- Indie Hackers / Product Hunt, if you ever want ZTE Tracker to be a
  standalone product rather than a personal tool — this is a bigger
  commitment (support burden, more users) worth deciding on separately.
- Hacker News "Show HN" — same caveat as Product Hunt; only worth it if
  the tool is meant for other people, not just you.

**What to explicitly avoid**: paid link placements, link exchanges,
directory submissions, or any "SEO backlink package" — these are
against Google's guidelines, can trigger a manual action, and add zero
real value to a tool with one primary user.

## Submitting the sitemap to Google Search Console

1. Go to https://search.google.com/search-console
2. Add a property for `https://www.zerotoelite.site` (use the "Domain"
   property type if you can verify via DNS, since it covers `www` and
   non-`www` automatically; otherwise use "URL prefix" with the exact
   domain used in `NEXT_PUBLIC_SITE_URL`).
3. Verify ownership — DNS TXT record is usually easiest if you control
   the domain's DNS. Google will show you the exact record to add.
4. Once verified, go to **Sitemaps** in the left nav, enter `sitemap.xml`,
   and submit. Google will fetch `https://www.zerotoelite.site/sitemap.xml`
   (confirm this resolves correctly *after* deploying the changes here).
5. Use **URL Inspection** on `https://www.zerotoelite.site` and on one of
   your `/u/[slug]` profile URLs to request indexing directly rather than
   waiting for the next crawl.

No verification has been performed as part of this work — the above is a
guide for you to run, not a claim that it's already been done.

## Environment variable required

All of the above assumes `NEXT_PUBLIC_SITE_URL=https://www.zerotoelite.site`
is set in the production environment (Vercel project settings → 
Environment Variables). If it isn't set, `src/lib/site-config.ts` falls
back to that same hardcoded value, so URLs will still be correct for this
domain specifically — but setting the env var explicitly is still the
right long-term move (see `.env.example` for why it also matters for the
weekly summary email).

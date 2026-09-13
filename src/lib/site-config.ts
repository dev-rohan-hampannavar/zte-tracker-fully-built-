// Single source of truth for the canonical production URL. Reused by
// layout metadata, /u/[slug]'s generateMetadata, robots.ts, and sitemap.ts
// so there's exactly one place to change if the domain ever moves — the
// alternative (hardcoding the domain in 4+ files) is how sitemaps and
// canonical tags silently drift out of sync with each other.
//
// Falls back to the same NEXT_PUBLIC_SITE_URL convention already used by
// the auth callback and the weekly-summary email (see .env.example) rather
// than introducing a second env var for the same concept. The hardcoded
// fallback is the real production domain, so local/preview builds that
// don't set the env var still produce a valid (if not currently accurate
// for that deployment) canonical URL instead of an empty string.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.zerotoelite.site";

// Strip any trailing slash so every caller can safely do `${SITE_URL}/path`
// without ever producing a double slash.
export const SITE_URL = RAW_SITE_URL.replace(/\/$/, "");

export const SITE_NAME = "ZTE Tracker";

// ZTE Tracker service worker — hand-written, not next-pwa.
//
// Why not next-pwa: next-pwa (^5.6.0) works by wrapping next.config.ts's
// webpack config. Next.js 16 uses Turbopack by default for both `next dev`
// and `next build`, and its own upgrade guide states that a custom webpack
// config now makes `next build` fail outright rather than silently
// degrading. Wiring next-pwa in as the plan originally described would risk
// breaking the production build for the entire app to add one polish item —
// not an acceptable trade. This file gets the same user-facing outcome
// (installable, loads offline, doesn't drop writes) without touching the
// build pipeline at all.
//
// Scope of what's cached, and why:
// Every route in this app requires auth and renders live, per-user Supabase
// data — there is no page that is "just static roadmap content" independent
// of a network round trip in the way a marketing page would be. So this SW
// does NOT attempt to serve full pages with live data while offline (that
// would show stale progress/notes as if current, which is worse than an
// honest offline state). Instead it caches the app shell — JS/CSS bundles,
// fonts, icons, manifest — so the app *loads* instantly offline and
// previously-visited routes still render their last-fetched client state
// from SWR's in-memory cache (not this SW), then shows OFFLINE_URL for any
// navigation that has never been cached.
//
// What this SW deliberately never touches: any request to Supabase
// (identified by URL, not just path, since it's cross-origin) is left
// completely alone — no caching, no interception, no queuing. A write made
// while offline fails immediately and visibly through the app's existing
// `toast.error(...)` paths (see updateTopicProgress, saveJournalEntry,
// handleAddNote, etc.), which is the plan's explicit requirement: never
// silently drop a write. A queued-write/retry pattern was considered and
// rejected for this pass — it would mean building conflict resolution for
// every mutation path in the app (see STAGE_6_CHANGELOG "Item 50" notes for
// the full reasoning), which is a much larger feature than "don't lose
// data," and risks silently replaying a stale write against data the person
// has since changed from another device.

const CACHE_VERSION = "zte-shell-v1";
const OFFLINE_URL = "/offline.html";

// Precached at install time: the offline fallback page itself, the PWA
// manifest, and the icons referenced by it. Next's hashed JS/CSS chunk
// paths aren't knowable at SW-authoring time (they change per build), so
// those are cached opportunistically at runtime instead (see fetch handler).
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  // Matches both the REST/auth API host and any *.supabase.co project host —
  // deliberately broad so a misconfigured guess here fails toward "don't
  // cache" rather than toward "accidentally cache a write endpoint."
  return url.hostname.endsWith("supabase.co") || url.hostname.includes("supabase");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch writes, at any origin
  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return; // let Supabase requests hit the network untouched

  // App shell / static assets: cache-first, since these are content-hashed
  // by Next's build and safe to serve stale-never (a new deploy means a new
  // hash, means a cache miss, means a fresh fetch — no manual invalidation
  // needed).
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Page navigations: network-first (so a person online always sees live
  // data), falling back to a cached copy of that same URL if one exists
  // from a previous visit, and finally to the offline fallback page. This
  // means a page only ever works offline after being visited at least once
  // while online — intentional, since this app has no content worth
  // precaching blind.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
  }
});

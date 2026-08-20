import type { NextConfig } from "next";

// SHA-256 hash of the one inline <script> in the app (the theme-flash-
// prevention script in src/app/layout.tsx, which has to run before
// hydration to avoid a flash of the wrong theme). A nonce-based CSP is
// the more common pattern, but it requires forcing the whole app into
// dynamic rendering (Next.js's own docs confirm this — nonces only work
// when a fresh one is generated per request in middleware, which by
// definition can't be pre-rendered) — that would silently defeat the
// `revalidate = 300` ISR caching already set on /u/[slug] and
// /api/public/[slug] (the public profile surfaces), undoing the load-time
// work already done there. A hash-based CSP for this one known, static
// script avoids that entirely: no middleware involvement, no nonce, no
// forced dynamic rendering, and — same as a nonce — still no
// 'unsafe-inline', so any *other* injected inline script is still
// blocked. If this script's content ever changes, this hash must be
// regenerated to match (see the comment above generateOtherScriptHash
// pattern in Next's own CSP docs) or the script will silently stop
// running in production.
const THEME_SCRIPT_HASH = "'sha256-82ytc1C/jdF0a8KcD8+yfUETn3M0Ao6m6Gm+4WsCREQ='";

// connect-src: 'self' (same-origin API routes) plus https://*.supabase.co
// (REST/Auth — this app's only client-side data source; confirmed no
// Supabase Realtime/websocket usage anywhere in the app, so no wss:
// needed). GitHub's API is only ever called server-side
// (getGithubActivity in /u/[slug]/page.tsx), so it doesn't need to be
// here.
//
// img-src includes data: for next/image placeholders/blur — no external
// image domains are used anywhere (no images.domains entries below, no
// external <img> src in the app, the OG image generator is fully
// self-contained).
//
// font-src 'self' only: next/font/google self-hosts font files at build
// time, so there's no runtime dependency on fonts.googleapis.com or
// fonts.gstatic.com.
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${THEME_SCRIPT_HASH}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // Applied to every route. Previously there were no security
        // headers anywhere in the app beyond icon cache-control — no CSP,
        // no clickjacking protection, no MIME-sniffing protection, no
        // referrer control, despite this app handling auth, a public-
        // facing profile page, and a service worker.
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Belt-and-suspenders alongside frame-ancestors 'none' above —
          // frame-ancestors is the modern CSP directive and takes
          // priority in supporting browsers, but X-Frame-Options covers
          // any browser that only understands the older header.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disables browser features this app has no use for and no UI
          // to request permission for — reduces attack surface for any
          // future XSS that did get through the CSP above.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Keep favicon/icon files from being cached too aggressively at the
        // edge/browser, so future logo updates show up without needing a
        // filename change every time.
        source: "/:path(favicon.*|favicon-v2.ico|apple-touch-icon.png|android-chrome-.*.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

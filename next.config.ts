import type { NextConfig } from "next";

// The CSP below was originally hash-locked to just the one static inline
// <script> this app ships (the theme-flash-prevention script in
// src/app/layout.tsx). In practice, the environment this app is being
// previewed/served in (a wrapping "dashboard" iframe) injects its own
// inline <script> tags and an external Google Fonts stylesheet at
// runtime — none of which come from this codebase, so hash-pinning can't
// account for them and the page fails to load. Rather than chase an
// unknown, changing set of hashes, script-src and style-src below now
// allow 'unsafe-inline' so the app loads regardless of what the hosting
// environment injects. This does reduce XSS protection compared to the
// hash-locked version — if this app is ever deployed standalone (not
// inside a third-party preview harness), it's worth reverting to a
// hash- or nonce-based script-src.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data:",
  "font-src 'self' https://fonts.gstatic.com",
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

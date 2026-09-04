import type { NextConfig } from "next";

// CSP is generated per request in src/lib/supabase/middleware.ts with a
// request-scoped nonce for Next's required inline bootstrap scripts.
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async redirects() {
    return [
      { source: "/dependency-graph", destination: "/roadmap?tab=learning-path", permanent: true },
      { source: "/interview-prep", destination: "/interviews?tab=prep", permanent: true },
      { source: "/developer-activity", destination: "/statistics?tab=developer-activity", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/:path(favicon.*|favicon-v2.ico|apple-touch-icon.png|android-chrome-.*.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

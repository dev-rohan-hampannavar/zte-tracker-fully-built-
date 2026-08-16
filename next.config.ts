import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
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

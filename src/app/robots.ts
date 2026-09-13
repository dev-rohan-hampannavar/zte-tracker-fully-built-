import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// Next's native robots.txt convention — served at /robots.txt automatically,
// no separate public/robots.txt file needed (and one shouldn't coexist
// with this, since a static file in /public would take precedence and
// silently make this file dead code).
//
// Disallows everything under the authenticated (app) route group by
// listing each real top-level path rather than a single blanket
// "Disallow: /" — a blanket disallow would also block the public /u/
// profiles and the marketing homepage, which is the opposite of what
// this app needs. The allowlist below is deliberately the mirror image
// of middleware.ts's isPublicProfileRoute/isPublicRoute checks: those are
// the only routes real users can reach without logging in, so they're the
// only ones worth a crawler's time.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/u/", "/login", "/welcome"],
      disallow: [
        "/dashboard",
        "/journal",
        "/roadmap",
        "/daily-plan",
        "/activity",
        "/achievements",
        "/architecture",
        "/career",
        "/career-gap",
        "/career-plan",
        "/clientsync",
        "/companies",
        "/dependency-graph",
        "/developer-activity",
        "/dsa",
        "/execution",
        "/exit-ladder",
        "/goals",
        "/interview-prep",
        "/interviews",
        "/job-readiness",
        "/leaderboard",
        "/milestones",
        "/monthly-review",
        "/portfolio",
        "/projects",
        "/reference",
        "/resume",
        "/revision",
        "/roadmap-diff",
        "/settings",
        "/skills",
        "/statistics",
        "/technologies",
        "/weekly-digest",
        "/workspace",
        "/api/",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

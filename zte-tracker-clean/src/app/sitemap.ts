import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-config";

// Next's native sitemap convention — served at /sitemap.xml automatically.
// Only ever lists routes that are actually indexable: the marketing
// homepage, and one entry per user who has opted into a public profile
// (public_profile_enabled = true), matching exactly what robots.ts allows
// and what /u/[slug]'s generateMetadata sets to index:true. Login/welcome
// are crawlable per robots.ts (so a crawler that follows a link to them
// isn't blocked) but intentionally excluded here and kept noindex in their
// own metadata — a sitemap entry is an implicit "please index this",
// which doesn't apply to a sign-in form or onboarding carousel.
//
// No hardcoded fake URLs — every /u/ entry below is a real row read from
// user_settings at request time (revalidated hourly), so the sitemap can
// never list a profile that doesn't exist or isn't actually public.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const supabase = createAdminClient();
    const { data: profiles } = await supabase
      .from("user_settings")
      .select("public_profile_slug")
      .eq("public_profile_enabled", true)
      .not("public_profile_slug", "is", null);

    for (const profile of (profiles ?? []) as { public_profile_slug: string | null }[]) {
      if (!profile.public_profile_slug) continue;
      entries.push({
        url: `${SITE_URL}/u/${profile.public_profile_slug}`,
        // user_settings has no updated_at column to source a real
        // last-modified date from, and profile pages already revalidate
        // every 5 minutes (see revalidate export on the page itself) —
        // "now" is an honest-enough signal that the page is kept fresh,
        // rather than fabricating a more precise timestamp than the data
        // supports.
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch {
    // If Supabase is unreachable at build/request time, still return the
    // one static entry rather than failing the whole sitemap route — a
    // sitemap missing profile URLs temporarily is far better than a
    // sitemap.xml that 500s, which can make Search Console flag the
    // entire site.
  }

  return entries;
}

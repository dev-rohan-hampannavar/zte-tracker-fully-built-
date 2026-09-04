import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));
  // Prefer the deployment's configured origin over an untrusted Host header
  // when constructing callback redirects. The path is independently bounded
  // by safeRedirectPath(), so this prevents both open redirects and host
  // header poisoning without breaking local development.
  let siteOrigin = origin;
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    try {
      const parsedSiteUrl = new URL(configuredSiteUrl);
      if (parsedSiteUrl.protocol === "http:" || parsedSiteUrl.protocol === "https:") {
        siteOrigin = parsedSiteUrl.origin;
      }
    } catch {
      // Keep the request origin as a development fallback if configuration is malformed.
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, siteOrigin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth-callback-failed", siteOrigin));
}

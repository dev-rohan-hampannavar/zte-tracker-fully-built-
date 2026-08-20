import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isWelcomeRoute = request.nextUrl.pathname.startsWith("/welcome");
  // /u/[slug] and /api/public/[slug] are the public, shareable profile
  // surfaces — they're explicitly meant to work for logged-out visitors
  // (that's the entire point of a shareable link). They were missing from
  // this allowlist, so every unauthenticated visitor to a shared profile
  // link was being redirected to /login instead of seeing the profile —
  // the feature was completely unreachable by its actual audience.
  const isPublicProfileRoute =
    request.nextUrl.pathname.startsWith("/u/") ||
    request.nextUrl.pathname.startsWith("/api/public/");
  const isPublicRoute =
    isAuthRoute ||
    isWelcomeRoute ||
    isPublicProfileRoute ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

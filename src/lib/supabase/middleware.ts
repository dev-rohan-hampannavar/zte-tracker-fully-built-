import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // A request-scoped nonce permits Next's required inline bootstrap/Flight
  // scripts without allowing arbitrary inline script injection.
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

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
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
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
  // Health probes must be reachable without a browser session. The endpoint
  // still reports dependency status (and never user data), so keeping it
  // public lets Vercel uptime checks distinguish a healthy app from a login
  // redirect or an unavailable database.
  const isHealthRoute = request.nextUrl.pathname === "/api/health";
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
    isHealthRoute ||
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

  supabaseResponse.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.github.com",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return supabaseResponse;
}

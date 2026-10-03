import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Deployment health probe. It intentionally returns only dependency status,
 * a build identifier, and timing — never environment values or row data.
 * Vercel uptime checks can call this endpoint without a user session.
 */
export async function GET() {
  const started = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("roadmap_metadata").select("id").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      {
        status: "ok",
        dependencies: { database: "ok" },
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
        latency_ms: Date.now() - started,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        dependencies: { database: "unavailable" },
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
        latency_ms: Date.now() - started,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function HEAD() {
  const response = await GET();
  return new NextResponse(null, { status: response.status, headers: response.headers });
}

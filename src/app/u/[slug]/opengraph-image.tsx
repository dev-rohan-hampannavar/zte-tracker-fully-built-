import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "ZTE Tracker — public progress profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same shape of query as the profile page itself, but only the handful of
// numbers actually needed for the card — no point fetching topics/dsa/
// projects in full just to compute three percentages for an image.
async function getOgData(slug: string) {
  const supabase = await createClient();

  const { data: settings } = (await supabase
    .from("user_settings")
    .select("user_id, public_profile_enabled, display_name")
    .eq("public_profile_slug", slug)
    .single()) as {
    data: { user_id: string; public_profile_enabled: boolean; display_name: string | null } | null;
  };

  if (!settings || !settings.public_profile_enabled) return null;
  const userId = settings.user_id;

  const [{ count: totalTopics }, { count: totalDone }, { data: dsa }, { data: projects }, { data: streak }] =
    await Promise.all([
      supabase.from("topics").select("*", { count: "exact", head: true }),
      supabase.from("topic_progress").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
      supabase.from("dsa_progress").select("completed").eq("user_id", userId).eq("completed", true),
      supabase.from("project_progress").select("status, github_url, deployment_url").eq("user_id", userId),
      supabase.from("public_streak_summary").select("current_streak").eq("user_id", userId).maybeSingle(),
    ]);

  const projectRows = (projects ?? []) as unknown as {
    status: string;
    github_url: string | null;
    deployment_url: string | null;
  }[];
  const shippedProjects = projectRows.filter(
    (p) => p.status === "completed" && (p.github_url || p.deployment_url)
  ).length;

  return {
    displayName: settings.display_name || "Zero to Elite",
    overallPct: totalTopics ? Math.round(((totalDone ?? 0) / totalTopics) * 100) : 0,
    totalDone: totalDone ?? 0,
    totalTopics: totalTopics ?? 0,
    dsaCount: (dsa ?? []).length,
    shippedProjects,
    streak: (streak as { current_streak: number } | null)?.current_streak ?? 0,
  };
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getOgData(slug);

  if (!data) {
    // Opted-out or nonexistent profile — a generic fallback card rather
    // than a broken image, since this route has no other error path
    // (link previews shouldn't 404 silently on social platforms).
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1512",
            color: "#f7f1e8",
            fontSize: 40,
          }}
        >
          ZTE Tracker
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a1512 0%, #2b2016 100%)",
          padding: "64px",
          color: "#f7f1e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: "#c9a876", letterSpacing: 2 }}>
          PUBLIC PROGRESS PROFILE
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 12 }}>{data.displayName}</div>

        <div style={{ display: "flex", gap: 20, marginTop: 48 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "24px 32px",
              minWidth: 180,
            }}
          >
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#c9a876" }}>
              {data.overallPct}%
            </div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.7, marginTop: 4 }}>Roadmap complete</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "24px 32px",
              minWidth: 180,
            }}
          >
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{data.shippedProjects}</div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.7, marginTop: 4 }}>Projects shipped</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "24px 32px",
              minWidth: 180,
            }}
          >
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{data.dsaCount}</div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.7, marginTop: 4 }}>DSA solved</div>
          </div>
          {data.streak > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: "24px 32px",
                minWidth: 180,
              }}
            >
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{data.streak}</div>
              <div style={{ display: "flex", fontSize: 20, opacity: 0.7, marginTop: 4 }}>Day streak</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 18, opacity: 0.5 }}>
          {data.totalDone}/{data.totalTopics} topics · ZTE Tracker
        </div>
      </div>
    ),
    { ...size }
  );
}

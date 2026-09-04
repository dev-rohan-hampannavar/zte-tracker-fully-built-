import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 300; // same cache window as the profile page itself

/**
 * Public, unauthenticated JSON endpoint mirroring what /u/[slug] shows —
 * for embedding stats in a personal site, resume builder, or any other
 * external tool without scraping the HTML page. Only ever returns data
 * for profiles that opted in via public_profile_enabled (the same opt-in
 * check the page itself uses), and only the same fields already public on
 * that page — nothing this route exposes isn't already visible there.
 *
 * No API key/auth required (it's public data by definition, gated only by
 * the profile owner's own opt-in), but responses are capped to what a
 * legitimate embed needs — no journal content, no email, no raw topic-by-
 * topic breakdown beyond phase-level completion.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // This endpoint is the server-side public projection boundary. It may use
  // the service role only after resolving an opted-in profile, and selects
  // just fields explicitly returned below; direct REST access remains RLS
  // owner-only.
  const supabase = createAdminClient();

  const { data: settings } = (await supabase
    .from("user_settings")
    .select("user_id, public_profile_enabled, display_name, public_profile_bio, github_username")
    .eq("public_profile_slug", slug)
    .single()) as {
    data: {
      user_id: string;
      public_profile_enabled: boolean;
      display_name: string | null;
      public_profile_bio: string | null;
      github_username: string | null;
    } | null;
  };

  if (!settings || !settings.public_profile_enabled) {
    return NextResponse.json({ error: "Profile not found or not public" }, { status: 404 });
  }

  const userId = settings.user_id;

  const [{ data: phases }, { data: topics }, { data: progress }, { data: dsa }, { data: projects }, { data: streak }] =
    await Promise.all([
      supabase.from("phases").select("id, title, phase_number").order("order_index"),
      supabase.from("topics").select("id, phase_id"),
      supabase.from("topic_progress").select("topic_id, completed").eq("user_id", userId),
      supabase.from("dsa_progress").select("completed, difficulty").eq("user_id", userId).eq("completed", true),
      supabase.from("project_progress").select("phase_id, status, github_url, deployment_url").eq("user_id", userId),
      supabase.from("public_streak_summary").select("current_streak, best_streak, total_days_logged").eq("user_id", userId).maybeSingle(),
    ]);

  const progressRows = (progress ?? []) as unknown as { topic_id: string; completed: boolean }[];
  const completedTopicIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.topic_id));
  const topicRows = (topics ?? []) as unknown as { id: string; phase_id: string }[];
  const phaseRows = (phases ?? []) as unknown as { id: string; title: string; phase_number: string }[];

  const phaseBreakdown = phaseRows.map((phase) => {
    const phaseTopics = topicRows.filter((t) => t.phase_id === phase.id);
    const done = phaseTopics.filter((t) => completedTopicIds.has(t.id)).length;
    return {
      phase_number: phase.phase_number,
      title: phase.title,
      topics_total: phaseTopics.length,
      topics_completed: done,
      complete: phaseTopics.length > 0 && done === phaseTopics.length,
    };
  });

  const dsaRows = (dsa ?? []) as unknown as { completed: boolean; difficulty: string }[];
  const projectRows = (projects ?? []) as unknown as {
    phase_id: string;
    status: string;
    github_url: string | null;
    deployment_url: string | null;
  }[];
  const shippedProjects = projectRows.filter((p) => p.status === "completed" && (p.github_url || p.deployment_url));

  const totalTopics = topicRows.length;
  const totalDone = completedTopicIds.size;

  const profilePath = `/u/${encodeURIComponent(slug)}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  return NextResponse.json({
    display_name: settings.display_name,
    bio: settings.public_profile_bio,
    github_username: settings.github_username,
    overall_percent: totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0,
    topics_completed: totalDone,
    topics_total: totalTopics,
    phases: phaseBreakdown,
    dsa_solved: dsaRows.length,
    dsa_by_difficulty: {
      easy: dsaRows.filter((d) => d.difficulty === "easy").length,
      medium: dsaRows.filter((d) => d.difficulty === "medium").length,
      hard: dsaRows.filter((d) => d.difficulty === "hard").length,
    },
    projects_shipped: shippedProjects.length,
    streak: (streak as { current_streak: number; best_streak: number; total_days_logged: number } | null) ?? {
      current_streak: 0,
      best_streak: 0,
      total_days_logged: 0,
    },
    // Never build absolute links from the Host header (host-header poisoning).
    profile_url: siteUrl ? `${siteUrl}${profilePath}` : profilePath,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGithubEventBreakdown } from "@/lib/github-activity";

// Small server-side wrapper so the (now client-component) Statistics tab
// can still get GitHub's public-events breakdown — getGithubEventBreakdown
// itself relies on Next's fetch `revalidate` option, which only works in
// Server Components/Route Handlers, not client code. Auth-gated the same
// way every other per-user endpoint in this app is: reads github_username
// from the CALLER's own user_settings row (RLS-scoped), never accepts a
// username param from the client, so this can't be used to probe another
// user's GitHub activity by guessing their user id.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("github_username")
    .eq("user_id", user.id)
    .maybeSingle();

  const githubUsername = (settings as { github_username: string | null } | null)?.github_username ?? null;
  const breakdown = await getGithubEventBreakdown(githubUsername, 7);

  return NextResponse.json({ githubUsername, breakdown });
}

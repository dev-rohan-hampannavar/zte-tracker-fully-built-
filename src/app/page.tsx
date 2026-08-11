import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // Signed-in users skip straight to their dashboard.
  // Signed-out visitors go straight to /welcome, which is now the single
  // marketing/landing page for the app (previously a separate LandingPage
  // component lived here — retired in favor of one page instead of two
  // near-duplicate pitches drifting out of sync).
  if (data.user) redirect("/dashboard");
  redirect("/welcome");
}
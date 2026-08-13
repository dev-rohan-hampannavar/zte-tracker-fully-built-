import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";

export default async function RootPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // Signed-in users skip straight to their dashboard, same as before.
  // Signed-out visitors now see the marketing landing page here instead of
  // being redirected straight into the /welcome onboarding carousel — that
  // flow still exists and is linked from this page's CTAs, but a first-time
  // visitor should land on a page that explains what this is before being
  // dropped into a multi-step walkthrough.
  if (data.user) redirect("/dashboard");
  return <LandingPage />;
}

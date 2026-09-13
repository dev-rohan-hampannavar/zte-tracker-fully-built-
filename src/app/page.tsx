import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";
import { SITE_URL } from "@/lib/site-config";

// This is the one page a logged-out visitor is actually meant to find via
// Google — overrides the root layout's default noindex back to indexable,
// and sets its own title/description instead of inheriting the generic
// layout copy verbatim, satisfying the "unique meta title/description on
// public pages" requirement for the single most important public route.
export const metadata: Metadata = {
  title: "ZTE Tracker — Zero to Elite Roadmap Companion",
  description:
    "Daily execution tracker for the Zero to Elite engineering roadmap. Track your daily study, DSA, projects, and job applications in one place — ship the roadmap, don't just read it.",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "ZTE Tracker — Zero to Elite Roadmap Companion",
    description:
      "Daily execution tracker for the Zero to Elite engineering roadmap. Ship the roadmap, don't just read it.",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZTE Tracker — Zero to Elite Roadmap Companion",
    description: "Daily execution tracker for the Zero to Elite engineering roadmap.",
  },
};

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

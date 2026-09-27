import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ShortcutsHelp } from "@/components/layout/shortcuts-help";
import { RouteTransition } from "@/components/motion/route-transition";
import { FeatureFlagGate } from "@/components/layout/feature-flag-gate";
import { ReturnUsageRecorder } from "@/components/layout/return-usage-recorder";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  // Phase 1/6 gate: an account that hasn't completed onboarding has no
  // roadmap enrollment yet (see migrations 0069/0071/0072), so every
  // page under (app) — which all assume a roadmap exists — would either
  // error or silently render empty. Existing accounts default to
  // onboarding_completed = true (migration 0069's backfill), so this
  // redirect only affects genuinely new signups; it never fires for the
  // pre-existing owner account.
  const { data: settingsRaw } = await supabase
    .from("user_settings")
    .select("onboarding_completed, roadmap_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  const settings = settingsRaw as { onboarding_completed: boolean; roadmap_id: string | null } | null;

  if (settings && settings.onboarding_completed === false) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" />
      <ReturnUsageRecorder />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav />
        <AppTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <FeatureFlagGate><RouteTransition>{children}</RouteTransition></FeatureFlagGate>
          </div>
        </main>
      </div>
      <ShortcutsHelp />
    </div>
  );
}

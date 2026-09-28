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

  const { data: settingsRaw } = await supabase
    .from("user_settings")
    .select("onboarding_completed")
    .eq("user_id", data.user.id)
    .maybeSingle();
  const settings = settingsRaw as { onboarding_completed: boolean } | null;

  // Fail closed. Only an explicit onboarding_completed === true reaches the
  // app. A missing row (trigger didn't fire / row deleted) used to fall
  // through to the owner's dashboard; now it is recreated as "not onboarded"
  // and sent to onboarding.
  if (!settings) {
    await supabase
      .from("user_settings")
      .upsert(
        { user_id: data.user.id, onboarding_completed: false, is_personalized: false },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
    redirect("/onboarding");
  }
  if (settings.onboarding_completed !== true) {
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
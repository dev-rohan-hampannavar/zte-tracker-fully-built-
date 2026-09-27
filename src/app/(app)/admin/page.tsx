"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Phase } from "@/types/database";
import { DetailedCurriculumEditor } from "@/components/admin/detailed-curriculum-editor";
import { ProductAdminConsole } from "@/components/admin/product-admin-console";

const supabase = createClient();

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const { data: settings, isLoading: settingsLoading } = useUserSettings(user?.id);
  const { data: phases, isLoading: phasesLoading } = useSWR(
    settings?.is_admin ? "admin-phases" : null,
    async () => {
      const { data, error } = await supabase.from("phases").select("*").order("order_index");
      if (error) throw error;
      return data as Phase[];
    }
  );

  if (userLoading || settingsLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted" /></div>;
  }

  if (!settings?.is_admin) {
    return <div className="p-6"><p className="text-sm text-muted">You don&apos;t have access to this page.</p></div>;
  }

  return <div className="mx-auto max-w-6xl p-6">
    <h1 className="mb-1 text-xl font-semibold text-foreground">Platform administration</h1>
    <p className="mb-6 text-sm text-muted">Manage curriculum releases, product flags, and aggregate adoption milestones.</p>
    <DetailedCurriculumEditor />
    <ProductAdminConsole />
    <section>
      <h2 className="mb-1 text-lg font-semibold">Legacy curriculum (read-only)</h2>
      <p className="mb-4 text-sm text-muted">The original personal roadmap is preserved unchanged. Detailed public tracks use the versioned editor above.</p>
      {phasesLoading && <Loader2 className="size-5 animate-spin text-muted" />}
      <div className="grid gap-3 md:grid-cols-2">
        {(phases ?? []).map((phase) => <Card key={phase.id}>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-muted">{phase.phase_number} · {phase.band ?? "—"}</p>
            <h3 className="font-medium">{phase.title}</h3>
            {phase.description && <p className="text-sm text-muted">{phase.description}</p>}
          </CardContent>
        </Card>)}
      </div>
    </section>
  </div>;
}

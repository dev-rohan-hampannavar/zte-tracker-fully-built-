"use client";

import { useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatFunnelLabel, getFunnelConversion } from "@/lib/product-analytics";
import type { FeatureFlag, ProductFunnelRow, Roadmap, RoleRoadmapAssignment, TargetRole } from "@/types/database";

const supabase = createClient();

export function ProductAdminConsole() {
  const [savingFlag, setSavingFlag] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const { data: flags, error: flagsError, mutate: mutateFlags } = useSWR("admin-feature-flags", async () => {
    const { data, error } = await supabase.from("feature_flags").select("*").order("key");
    if (error) throw error;
    return (data ?? []) as FeatureFlag[];
  });
  const { data: funnel, error: funnelError } = useSWR("admin-product-funnel", async () => {
    const { data, error } = await supabase.rpc("get_product_funnel");
    if (error) throw error;
    return (data ?? []) as ProductFunnelRow[];
  });
  const { data: roleMapping, error: roleError, mutate: mutateRoleMapping } = useSWR("admin-role-roadmap-mapping", async () => {
    const [rolesResult, assignmentsResult, roadmapsResult] = await Promise.all([
      supabase.from("target_roles").select("id,name,description").order("name"),
      supabase.from("role_roadmap_assignments").select("role_id,roadmap_id,priority").order("priority"),
      supabase.from("roadmaps").select("id,title,track,description,is_public,created_at").eq("is_public", true).order("title"),
    ]);
    if (rolesResult.error) throw rolesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (roadmapsResult.error) throw roadmapsResult.error;
    const assignments = (assignmentsResult.data ?? []) as RoleRoadmapAssignment[];
    return {
      roles: (rolesResult.data ?? []) as TargetRole[],
      roadmaps: (roadmapsResult.data ?? []) as Roadmap[],
      assignmentByRole: new Map(assignments.map((row) => [row.role_id, row.roadmap_id])),
    };
  });

  async function toggleFlag(flag: FeatureFlag) {
    setSavingFlag(flag.key);
    const { error } = await supabase.from("feature_flags").update({ enabled: !flag.enabled } as never).eq("key", flag.key);
    if (error) toast.error(error.message);
    else {
      toast.success(`${formatFunnelLabel(flag.key)} ${flag.enabled ? "disabled" : "enabled"}`);
      await mutateFlags();
    }
    setSavingFlag(null);
  }

  async function saveRoleMapping(roleId: string, currentRoadmapId: string | undefined) {
    const roadmapId = roleDrafts[roleId] ?? currentRoadmapId;
    if (!roadmapId || roadmapId === currentRoadmapId) return;
    setSavingRole(roleId);
    const { error } = await supabase.rpc("set_role_roadmap_assignment" as never, { p_role_id: roleId, p_roadmap_id: roadmapId } as never);
    if (error) toast.error(error.message);
    else {
      toast.success("Roadmap assignment updated");
      setRoleDrafts((drafts) => { const next = { ...drafts }; delete next[roleId]; return next; });
      await mutateRoleMapping();
    }
    setSavingRole(null);
  }

  const conversionStages: Array<[string, string]> = [
    ["signup", "onboarding_completed"],
    ["onboarding_completed", "roadmap_viewed"],
    ["roadmap_viewed", "topic_started"],
    ["topic_started", "topic_completed"],
    ["topic_completed", "project_started"],
    ["project_started", "project_deployed"],
  ];

  return <section className="mb-8 grid gap-5 lg:grid-cols-2">
    <Card>
      <CardHeader><CardTitle>Product funnel</CardTitle><p className="text-sm text-muted-foreground">Unique accounts reaching each milestone. Return usage counts accounts that have returned at least once.</p></CardHeader>
      <CardContent className="space-y-3">
        {funnelError && <p className="text-sm text-destructive">Funnel data is unavailable. Apply migration 0085 and check admin access.</p>}
        {(funnel ?? []).map((row) => <div key={row.event_name} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
          <span className="text-sm">{formatFunnelLabel(row.event_name)}</span><span className="font-mono text-sm tabular-nums">{row.user_count.toLocaleString()}</span>
        </div>)}
        {funnel?.length === 0 && !funnelError && <p className="text-sm text-muted-foreground">No milestones recorded yet.</p>}
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
          {conversionStages.map(([from, to]) => {
            const pct = getFunnelConversion(funnel ?? [], from, to);
            return <div className="rounded-md bg-muted/40 p-2" key={`${from}-${to}`}>
              <p className="text-[10px] text-muted-foreground">{formatFunnelLabel(from)} → {formatFunnelLabel(to)}</p>
              <p className="mt-1 text-sm font-medium">{pct === null ? "—" : `${pct}%`}</p>
            </div>;
          })}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Feature switches</CardTitle><p className="text-sm text-muted-foreground">Control selected app areas without editing code or deploying.</p></CardHeader>
      <CardContent className="space-y-3">
        {flagsError && <p className="text-sm text-destructive">Feature flags are unavailable. Apply migration 0085 and check admin access.</p>}
        {(flags ?? []).map((flag) => <div key={flag.key} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{flag.key}</span><Badge variant={flag.enabled ? "default" : "outline"}>{flag.enabled ? "On" : "Off"}</Badge></div>
            <p className="mt-1 text-xs text-muted-foreground">{flag.description}</p>
          </div>
          <Button size="sm" variant="outline" disabled={savingFlag === flag.key} onClick={() => void toggleFlag(flag)}>
            {savingFlag === flag.key ? "Saving…" : flag.enabled ? "Turn off" : "Turn on"}
          </Button>
        </div>)}
        {flags?.length === 0 && !flagsError && <p className="text-sm text-muted-foreground">No feature switches are configured.</p>}
      </CardContent>
    </Card>

    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Role-to-roadmap assignments</CardTitle><p className="text-sm text-muted-foreground">Choose which published learning track new learners receive for each target role.</p></CardHeader>
      <CardContent className="space-y-3">
        {roleError && <p className="text-sm text-destructive">Role mappings are unavailable. Check that migrations 0074 and 0085 are applied.</p>}
        {(roleMapping?.roles ?? []).map((role) => {
          const currentRoadmapId = roleMapping?.assignmentByRole.get(role.id);
          const value = roleDrafts[role.id] ?? currentRoadmapId ?? "";
          const changed = value !== currentRoadmapId;
          return <div key={role.id} className="grid items-center gap-2 border-b pb-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)_auto]">
            <div><p className="text-sm font-medium">{role.name}</p><p className="text-xs text-muted-foreground">{role.id}</p></div>
            <Select value={value} onValueChange={(next) => setRoleDrafts((drafts) => ({ ...drafts, [role.id]: next }))}>
              <SelectTrigger aria-label={`Roadmap for ${role.name}`}><SelectValue placeholder="Choose a roadmap" /></SelectTrigger>
              <SelectContent>{(roleMapping?.roadmaps ?? []).map((roadmap) => <SelectItem key={roadmap.id} value={roadmap.id}>{roadmap.title}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={!changed || savingRole === role.id} onClick={() => void saveRoleMapping(role.id, currentRoadmapId)}>{savingRole === role.id ? "Saving…" : "Save assignment"}</Button>
          </div>;
        })}
        {roleMapping?.roles.length === 0 && !roleError && <p className="text-sm text-muted-foreground">No target roles are configured.</p>}
      </CardContent>
    </Card>
  </section>;
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { CheckCircle2, AlertTriangle, XCircle, Flame } from "lucide-react";
import type { SkillGapDetail } from "@/lib/job-readiness";

/**
 * Career Gap page — spec section 18. Shown as its own page (rather than
 * folded further into /job-readiness, which already covers the overall
 * score + ad-hoc JD paste) because the spec asks for a standing view of
 * gaps against the person's chosen career target, independent of pasting
 * any particular job description.
 *
 * Deliberately built on top of computeJobReadiness's existing skillGaps
 * output (job-readiness.ts) rather than a second gap-scoring formula —
 * one readiness calculation, several views of it, so this page can never
 * disagree with what /job-readiness itself reports for the same role.
 */

function statusMeta(status: SkillGapDetail["status"]) {
  switch (status) {
    case "ready":
      return { label: "Ready", icon: CheckCircle2, badge: "success" as const, iconClass: "text-success" };
    case "weak":
      return { label: "Weak", icon: AlertTriangle, badge: "warning" as const, iconClass: "text-warning" };
    case "missing":
      return { label: "Missing", icon: XCircle, badge: "danger" as const, iconClass: "text-danger" };
  }
}

// Effort is estimated from how far a skill is from "ready" (70%), not
// invented per-skill — a missing skill (0%) is a bigger lift than a weak
// one already at 50%. This mirrors the honesty constraint the rest of the
// readiness system holds to: no fabricated per-skill time estimates, just
// a coarse relative signal derived from the same knowledge_pct evidence
// everything else here uses.
function estimatedEffort(pct: number): string {
  if (pct === 0) return "High — no evidence yet";
  if (pct < 35) return "High — early stage";
  if (pct < 70) return "Medium — partial coverage";
  return "Low";
}

function GapRow({ gap, rank }: { gap: SkillGapDetail; rank?: number }) {
  const meta = statusMeta(gap.status);
  const Icon = meta.icon;
  return (
    <Link
      href={`/technologies/${gap.technologyId}`}
      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 hover:bg-surface transition-colors"
    >
      {rank !== undefined && (
        <span className="text-xs font-mono-tabular text-muted w-4 shrink-0 text-center">{rank}</span>
      )}
      <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{gap.name}</p>
        <p className="text-xs text-muted">
          {estimatedEffort(gap.pct)} · weight {gap.weight.toFixed(1)} for this role
        </p>
      </div>
      <div className="w-24 shrink-0">
        <Progress value={gap.pct} />
      </div>
      <span className="text-xs font-mono-tabular text-muted w-9 text-right shrink-0">{gap.pct}%</span>
    </Link>
  );
}

export default function CareerGapPage() {
  const { user } = useUser();
  const { data: roles, isLoading: rolesLoading } = useTargetRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const roleId = selectedRoleId ?? roles?.[0]?.id;
  const selectedRole = roles?.find((r) => r.id === roleId);
  const { breakdown, isLoading } = useJobReadiness(user?.id, selectedRole);

  const { ready, weak, missing, highestImpact } = useMemo(() => {
    const gaps = breakdown?.skillGaps ?? [];
    const ready = gaps.filter((g) => g.status === "ready");
    const weak = gaps.filter((g) => g.status === "weak");
    const missing = gaps.filter((g) => g.status === "missing");
    // Highest Impact per spec section 18: rank gaps (weak + missing) by
    // relevance to the selected role, i.e. weight × how far from ready —
    // a heavily-weighted missing skill outranks a lightly-weighted one
    // even though both show 0%, and outranks a heavily-weighted skill
    // that's merely weak rather than missing.
    const highestImpact = [...weak, ...missing]
      .map((g) => ({ ...g, impact: g.weight * (100 - g.pct) }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
    return { ready, weak, missing, highestImpact };
  }, [breakdown]);

  if (rolesLoading || (roleId && isLoading)) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title font-semibold tracking-tight">Career Gap</h1>
            <p className="text-sm text-muted mt-1">
              What&apos;s ready, what&apos;s weak, and what&apos;s missing for your target role — ranked by what
              actually moves the needle.
            </p>
          </div>
          <Select value={roleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select target role" />
            </SelectTrigger>
            <SelectContent>
              {(roles ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeUp>

      {!breakdown ? (
        <Card>
          <CardContent noHeader>
            <p className="text-sm text-muted">
              No role skill requirements are configured for this role in this deployment, so there&apos;s nothing to
              show a gap against yet.
            </p>
          </CardContent>
        </Card>
      ) : breakdown.skillGaps.length === 0 ? (
        <Card>
          <CardContent noHeader>
            <p className="text-sm text-muted">No required skills are configured for {breakdown.roleName} yet.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="flex flex-col gap-6">
          {highestImpact.length > 0 && (
            <StaggerItem>
              <Card className="border-warning/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-warning" /> Highest impact
                  </CardTitle>
                  <p className="text-sm text-muted">
                    Ranked by how much each gap is weighted for {breakdown.roleName} combined with how far it is
                    from ready — closing these moves your readiness score the most.
                  </p>
                </CardHeader>
                <CardContent noHeader className="flex flex-col gap-2">
                  {highestImpact.map((gap, i) => (
                    <GapRow key={gap.technologyId} gap={gap} rank={i + 1} />
                  ))}
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Ready
                    <Badge variant="success" className="ml-auto">
                      {ready.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent noHeader className="flex flex-col gap-2">
                  {ready.length === 0 ? (
                    <p className="text-sm text-muted">Nothing at ready level yet for this role.</p>
                  ) : (
                    ready.map((gap) => <GapRow key={gap.technologyId} gap={gap} />)
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Weak
                    <Badge variant="warning" className="ml-auto">
                      {weak.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent noHeader className="flex flex-col gap-2">
                  {weak.length === 0 ? (
                    <p className="text-sm text-muted">No partially-covered skills for this role.</p>
                  ) : (
                    weak.map((gap) => <GapRow key={gap.technologyId} gap={gap} />)
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-danger" /> Missing
                    <Badge variant="danger" className="ml-auto">
                      {missing.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent noHeader className="flex flex-col gap-2">
                  {missing.length === 0 ? (
                    <p className="text-sm text-muted">No zero-evidence required skills for this role.</p>
                  ) : (
                    missing.map((gap) => <GapRow key={gap.technologyId} gap={gap} />)
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          </div>
        </StaggerContainer>
      )}
    </div>
  );
}

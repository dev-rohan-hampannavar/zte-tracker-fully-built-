"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useInterviewAttempts } from "@/lib/hooks/use-interview-prep";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { computeCareerMilestones } from "@/lib/career-milestones";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { Trophy, Lock, Target } from "lucide-react";

export default function MilestonesPage() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: projects, isLoading: projLoading } = useProjectProgress(user?.id);
  const { data: dsa, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: applications, isLoading: appsLoading } = useCareerTracker(user?.id);
  const { data: interviewAttempts, isLoading: attemptsLoading } = useInterviewAttempts(user?.id);
  const { data: roles, isLoading: rolesLoading } = useTargetRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const roleId = selectedRoleId ?? roles?.[0]?.id;
  const selectedRole = roles?.find((r) => r.id === roleId);
  const { breakdown, isLoading: readinessLoading } = useJobReadiness(user?.id, selectedRole);

  const loading =
    phasesLoading || projLoading || dsaLoading || appsLoading || attemptsLoading || rolesLoading || (roleId && readinessLoading);

  const milestones = useMemo(() => {
    const projectsShipped = (projects ?? []).filter(
      (p) => p.status === "completed" && (p.github_url || p.deployment_url)
    ).length;
    const dsaCompleted = (dsa ?? []).filter((d) => d.completed).length;
    const realApplications = (applications ?? []).filter((a) => a.application_status !== "wishlist");
    return computeCareerMilestones({
      phasesCompleted: phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)).length,
      totalPhases: phases.length,
      projectsShipped,
      dsaCompleted,
      overallReadinessPct: breakdown?.overallPct ?? null,
      hasUsedResumeVersion: realApplications.some((a) => a.resume_version && a.resume_version.trim().length > 0),
      applicationsSubmitted: realApplications.length,
      mockInterviewAttempts: (interviewAttempts ?? []).length,
      offersReceived: (applications ?? []).filter((a) => a.offer).length,
    });
  }, [phases, projects, dsa, applications, interviewAttempts, breakdown]);

  const reached = milestones.filter((m) => m.reached);
  const locked = milestones.filter((m) => !m.reached);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title font-semibold tracking-tight">Career Milestones</h1>
            <p className="text-sm text-muted mt-1">
              {reached.length}/{milestones.length} reached — readiness checkpoints computed from your real progress,
              not badges for activity.
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

      <StaggerContainer className="grid gap-3 sm:grid-cols-2">
        {[...reached, ...locked].map((m) => (
          <StaggerItem key={m.id}>
            <Card className={m.reached ? "border-success/30" : undefined}>
              <CardContent noHeader className="flex items-start gap-3">
                {m.reached ? (
                  <Trophy className="h-5 w-5 text-success shrink-0 mt-0.5" />
                ) : (
                  <Lock className="h-5 w-5 text-muted shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{m.label}</p>
                    <Badge variant={m.reached ? "success" : "outline"} className="text-[10px]">
                      {m.progressLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{m.description}</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {!breakdown && (
        <Card>
          <CardContent noHeader className="flex items-start gap-3">
            <Target className="h-4 w-4 text-muted shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              No role skill requirements are configured for the selected role, so &quot;Readiness target reached&quot;
              can&apos;t be evaluated for it yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

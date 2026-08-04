"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, GitBranch, ArrowRight, FolderGit2 } from "lucide-react";
import type { ProjectStatus } from "@/types/database";

const STATUS_VARIANT: Record<ProjectStatus, "default" | "warning" | "success"> = {
  not_started: "default",
  in_progress: "warning",
  completed: "success",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function PortfolioPage() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: projectProgress, isLoading: projLoading } = useProjectProgress(user?.id);

  const loading = phasesLoading || projLoading;
  const progressMap = new Map((projectProgress ?? []).map((p) => [p.phase_id, p]));

  const rows = useMemo(
    () =>
      phases
        .filter((p) => p.capstone || progressMap.has(p.id))
        .map((phase) => {
          const progress = progressMap.get(phase.id);
          const topicsDone = phase.topics.filter((t) => t.progress?.completed).length;
          const pct = phase.topics.length ? Math.round((topicsDone / phase.topics.length) * 100) : 0;
          return { phase, progress, pct };
        })
        .sort((a, b) => (b.progress?.status === "completed" ? 1 : 0) - (a.progress?.status === "completed" ? 1 : 0)),
    [phases, progressMap]
  );

  const stats = useMemo(() => {
    const withLinks = rows.filter((r) => r.progress?.github_url || r.progress?.deployment_url);
    const completed = rows.filter((r) => r.progress?.status === "completed");
    const live = rows.filter((r) => r.progress?.deployment_url);
    return { total: rows.length, withLinks: withLinks.length, completed: completed.length, live: live.length };
  }, [rows]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio Dashboard</h1>
          <p className="text-sm text-muted">Deployed and in-progress build artifacts, one view.</p>
        </div>
        <Link
          href="/portfolio/ideas"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline shrink-0 mt-1"
        >
          Portfolio Projects (10 ideas) <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total projects", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "Live deployments", value: stats.live },
          { label: "With links", value: stats.withLinks },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold font-mono-tabular">{s.value}</p>
              <p className="text-[11px] text-muted">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            No portfolio items yet. Mark project progress from the Projects page to populate this dashboard.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(({ phase, progress, pct }) => (
          <Card key={phase.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate">{phase.capstone?.title ?? phase.title}</CardTitle>
                <p className="text-xs text-muted mt-0.5">{phase.phase_number} — {phase.title}</p>
              </div>
              <Badge variant={STATUS_VARIANT[progress?.status ?? "not_started"]}>
                {STATUS_LABEL[progress?.status ?? "not_started"]}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {phase.capstone?.description && (
                <p className="text-sm text-muted line-clamp-2">{phase.capstone.description}</p>
              )}
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted font-mono-tabular w-9 text-right">{pct}%</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {progress?.github_url && (
                  <a
                    href={progress.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                  >
                    <GitBranch className="h-3.5 w-3.5" /> Source
                  </a>
                )}
                {progress?.deployment_url && (
                  <a
                    href={progress.deployment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Live
                  </a>
                )}
                {!progress?.github_url && !progress?.deployment_url && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <FolderGit2 className="h-3.5 w-3.5" /> No links added
                  </span>
                )}
                <Link
                  href="/projects"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  Edit <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

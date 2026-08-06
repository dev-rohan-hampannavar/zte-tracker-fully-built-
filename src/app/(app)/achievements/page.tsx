"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useDailyLogs, computeStreak } from "@/lib/hooks/use-daily-logs";
import { computeAllAchievements } from "@/lib/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AchievementsPage() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: dsa, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: projects, isLoading: projLoading } = useProjectProgress(user?.id);
  const { data: logs, isLoading: logsLoading } = useDailyLogs(user?.id);

  const loading = phasesLoading || dsaLoading || projLoading || logsLoading;

  const achievements = useMemo(() => {
    const phasesCompleted = phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)).length;
    const topicsCompleted = phases.reduce((s, p) => s + p.topics.filter((t) => t.progress?.completed).length, 0);
    const dsaDone = (dsa ?? []).filter((d) => d.completed);
    const projectsShipped = (projects ?? []).filter((p) => p.status === "completed" && (p.github_url || p.deployment_url)).length;
    const { current } = computeStreak(logs ?? []);

    return computeAllAchievements({
      phasesCompleted,
      totalPhases: phases.length,
      topicsCompleted,
      dsaCompleted: dsaDone.length,
      dsaHard: dsaDone.filter((d) => d.difficulty === "hard").length,
      projectsShipped,
      streakDays: current,
    });
  }, [phases, dsa, projects, logs]);

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted mt-1">
          {earned.length}/{achievements.length} unlocked — computed live from your progress, nothing to configure.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Unlocked", value: earned.length },
          { label: "Locked", value: locked.length },
          { label: "Total", value: achievements.length },
          { label: "Completion", value: `${achievements.length ? Math.round((earned.length / achievements.length) * 100) : 0}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-3 text-center">
            <p className="text-lg font-bold font-mono-tabular text-accent">{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {earned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-reward" /> Unlocked
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {earned.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-card border border-success/30 bg-success/5 px-3.5 py-3 transition-standard hover:border-success/50"
              >
                <Trophy className="h-4 w-4 text-reward mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted">
            <Lock className="h-4 w-4" /> Locked
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {locked.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-card border border-border px-3.5 py-3 opacity-60">
              <Lock className="h-4 w-4 text-muted mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </div>
            </div>
          ))}
          {locked.length === 0 && (
            <p className="text-sm text-muted text-center py-6 col-span-2">Everything unlocked. Impressive.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

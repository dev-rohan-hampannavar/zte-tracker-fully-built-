"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useDailyLogs, computeStreak } from "@/lib/hooks/use-daily-logs";
import { useGoals } from "@/lib/hooks/use-goals";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useInterviewAttempts } from "@/lib/hooks/use-interview-prep";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { computeAllAchievements } from "@/lib/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Lock } from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { motion } from "framer-motion";

export default function AchievementsPage() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: dsa, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: projects, isLoading: projLoading } = useProjectProgress(user?.id);
  const { data: logs, isLoading: logsLoading } = useDailyLogs(user?.id);
  const { data: goals } = useGoals(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: interviewAttempts } = useInterviewAttempts(user?.id);
  const { data: skillEvidence } = useSkillEvidence(user?.id);

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
      goalsCompleted: (goals ?? []).filter((g) => g.status === "completed").length,
      applicationsSubmitted: (applications ?? []).filter((a) => a.application_status !== "wishlist").length,
      offersReceived: (applications ?? []).filter((a) => a.offer).length,
      interviewAttemptsLogged: (interviewAttempts ?? []).length,
      skillsWithEvidence: (skillEvidence ?? []).filter((s) => s.knowledge_pct > 0).length,
    });
  }, [phases, dsa, projects, logs, goals, applications, interviewAttempts, skillEvidence]);

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted mt-1">
          {earned.length}/{achievements.length} unlocked — computed live from your progress, nothing to configure.
        </p>
      </div>
      </FadeUp>

      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Unlocked", value: earned.length, isPct: false },
          { label: "Locked", value: locked.length, isPct: false },
          { label: "Total", value: achievements.length, isPct: false },
          { label: "Completion", value: achievements.length ? Math.round((earned.length / achievements.length) * 100) : 0, isPct: true },
        ].map((s) => (
          <StaggerItem key={s.label}>
          <div className="rounded-card border border-border bg-surface p-3 text-center glow-card">
            <p className="text-lg font-bold font-mono-tabular text-accent">
              <AnimatedCounter value={s.value} suffix={s.isPct ? "%" : ""} />
            </p>
            <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
          </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {earned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-reward" /> Unlocked
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StaggerContainer className="contents">
            {earned.map((a) => (
              <StaggerItem key={a.id}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-start gap-3 rounded-card border border-success/30 bg-success/5 px-3.5 py-3 transition-standard hover:border-success/50 hover:shadow-[0_0_16px_rgb(var(--success-glow)/0.25)]"
              >
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Trophy className="h-4 w-4 text-reward mt-0.5 shrink-0 drop-shadow-[0_0_6px_rgb(var(--reward-glow)/0.6)]" />
                </motion.span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted">{a.description}</p>
                </div>
              </motion.div>
              </StaggerItem>
            ))}
            </StaggerContainer>
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
          <StaggerContainer className="contents">
          {locked.map((a) => (
            <StaggerItem key={a.id}>
            <div className="flex items-start gap-3 rounded-card border border-border px-3.5 py-3 opacity-60">
              <Lock className="h-4 w-4 text-muted mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </div>
            </div>
            </StaggerItem>
          ))}
          {locked.length === 0 && (
            <p className="text-sm text-muted text-center py-6 col-span-2">Everything unlocked. Impressive.</p>
          )}
          </StaggerContainer>
        </CardContent>
      </Card>
    </div>
  );
}

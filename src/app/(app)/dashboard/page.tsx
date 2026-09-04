"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useExitLadder, useRoadmapMetadata, useMonthByMonth } from "@/lib/hooks/use-roadmap";
import { computePlanPosition } from "@/lib/plan-position";
import { useDailyLogs, computeStreak, weeklyHours, syncPublicStreakSummary } from "@/lib/hooks/use-daily-logs";
import { useAllStudySessions } from "@/lib/hooks/use-study-sessions";
import { detectFailureSignals, detectTutorialDependency, detectPerfectionism, detectIgnoringDayJob, detectSkillDecay, computeSmartAction, getStaleApplications } from "@/lib/plan-position";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { isOverdue } from "@/lib/revision-schedule";
import { useCareerTracker, useApplicationMetrics } from "@/lib/hooks/use-career";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useExerciseProgress } from "@/lib/hooks/use-exercises";
import { useGoals } from "@/lib/hooks/use-goals";
import { useDailyPlan } from "@/lib/hooks/use-daily-plan";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useActivityLog, ACTIVITY_LABELS } from "@/lib/hooks/use-activity-log";
import { DailyMission } from "@/components/dashboard/daily-mission";
import { FocusTimer } from "@/components/dashboard/focus-timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyHeatmap } from "@/components/dashboard/heatmap";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { RevisionDueWidget } from "@/components/dashboard/revision-due-widget";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { pct, cn } from "@/lib/utils";
import {
  Flame,
  TrendingUp,
  Code2,
  Briefcase,
  FolderGit2,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Target,
  Gauge,
  Lightbulb,
  BookOpen,
  CalendarClock,
  Trophy,
  Percent,
  ListChecks,
  Sparkles,
  Clock,
  History,
  ArrowRight,
  Zap,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { StaggerContainer, StaggerItem, FadeUp } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import type { NotificationKind, AppNotification } from "@/lib/hooks/use-notifications";

// ---- Constants ----
const NOTIF_ICON: Record<NotificationKind, typeof Target> = {
  revision_overdue: AlertCircle,
  milestone_pending: ListChecks,
  ready_to_apply: Sparkles,
  project_inactive: FolderGit2,
  exit_almost_ready: TrendingUp,
  daily_log_missing: Flame,
  skill_stale: Gauge,
  goal_deadline: Target,
  interview_reminder: CalendarClock,
  follow_up_reminder: Clock,
  career_milestone: Trophy,
};

const NOTIF_COLOR: Record<NotificationKind, string> = {
  revision_overdue: "text-danger",
  milestone_pending: "text-warning",
  ready_to_apply: "text-success",
  project_inactive: "text-warning",
  exit_almost_ready: "text-accent",
  daily_log_missing: "text-accent",
  skill_stale: "text-danger",
  goal_deadline: "text-warning",
  interview_reminder: "text-accent",
  follow_up_reminder: "text-warning",
  career_milestone: "text-success",
};

function now(): number {
  return Date.now();
}

// ---- Typed StatCard props ----
interface StatCardProps {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
  progress?: number;
}

// ---- Memoised StatCard with proper typing ----
const StatCard = memo(({ href, icon, iconBg, label, value, sub, progress }: StatCardProps) => (
  <Link href={href} className="block h-full">
    <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border-border/50 bg-surface/80 backdrop-blur-sm hover:border-accent/30 group">
      <CardContent noHeader className="flex flex-col items-start p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-colors", iconBg)}>
            {icon}
          </span>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        </div>
        {typeof value === "string" ? (
          <p className="text-2xl font-bold font-mono-tabular leading-none">{value}</p>
        ) : (
          <p className="text-2xl font-bold font-mono-tabular leading-none">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {progress !== undefined && <Progress value={progress} className="mt-2 h-1 w-full" />}
      </CardContent>
    </Card>
  </Link>
));
StatCard.displayName = "StatCard";

// ---- Main Component ----
export default function DashboardPage() {
  const { user } = useUser();
  const { data: userSettings } = useUserSettings(user?.id);
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: exitLadder } = useExitLadder();
  const { data: logs, mutate: mutateLogs } = useDailyLogs(user?.id);
  const { data: monthByMonth } = useMonthByMonth();
  const { data: studySessions } = useAllStudySessions(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: skillEvidence } = useSkillEvidence(user?.id);
  const planPosition = useMemo(
    () => (monthByMonth && logs ? computePlanPosition(monthByMonth, logs) : null),
    [monthByMonth, logs]
  );
  const failureSignals = useMemo(() => {
    const signals = studySessions ? detectFailureSignals(studySessions) : [];
    const tutorialSignal = studySessions ? detectTutorialDependency(studySessions) : null;
    if (tutorialSignal) signals.push(tutorialSignal);

    if (planPosition && applications) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentApplications = applications.filter((a) => a.applied_at && new Date(a.applied_at) >= twoWeeksAgo).length;
      const perfectionismSignal = detectPerfectionism(planPosition.overallProgressPct, recentApplications);
      if (perfectionismSignal) signals.push(perfectionismSignal);
    }

    const dayJobSignal = logs ? detectIgnoringDayJob(logs) : null;
    if (dayJobSignal) signals.push(dayJobSignal);

    const skillDecaySignal = skillEvidence ? detectSkillDecay(skillEvidence) : null;
    if (skillDecaySignal) signals.push(skillDecaySignal);

    return signals;
  }, [studySessions, planPosition, applications, logs, skillEvidence]);
  const { data: metadata } = useRoadmapMetadata();
  const { data: dsaProblems } = useDsaProgress(user?.id);
  const { data: projectProgress } = useProjectProgress(user?.id);
  const { data: exerciseProgress } = useExerciseProgress(user?.id);
  const { data: goals } = useGoals(user?.id);
  const { data: applicationMetrics } = useApplicationMetrics(user?.id);
  const { data: leaderboard } = useLeaderboard();
  const { notifications } = useNotifications();
  const { data: activityLog } = useActivityLog(user?.id, 8);
  const [missionDetailsOpen, setMissionDetailsOpen] = useState(false);
  const { plan: dailyPlan } = useDailyPlan(120);

  // ---- Memoised derived state ----
  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  const completedTopics = useMemo(() => allTopics.filter((t) => t.progress?.completed), [allTopics]);
  const totalTopics = allTopics.length;

  const orderedIncompleteTopics = useMemo(() => {
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phaseIdx, stageIdx, topicIdx }))
      )
    );
    return candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => a.phaseIdx - b.phaseIdx || a.stageIdx - b.stageIdx || a.topicIdx - b.topicIdx)
      .map((c) => c.topic);
  }, [phases]);

  const nextTopic = useMemo(() => {
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phase, phaseIdx, stageIdx, topicIdx }))
      )
    );
    const next = candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => a.phaseIdx - b.phaseIdx || a.stageIdx - b.stageIdx || a.topicIdx - b.topicIdx)[0];
    return next ? { topic: next.topic, phase: next.phase } : null;
  }, [phases]);

  const currentStage = useMemo(() => {
    if (!nextTopic) return null;
    for (const phase of phases) {
      for (const stage of phase.stages ?? []) {
        if (stage.topics.some((t) => t.id === nextTopic.topic.id)) return stage;
      }
    }
    return null;
  }, [phases, nextTopic]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const firstName = useMemo(() => {
    if (userSettings?.display_name) return userSettings.display_name.split(" ")[0];
    const email = user?.email;
    if (!email) return null;
    const local = email.split("@")[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [userSettings, user]);

  const streak = useMemo(() => computeStreak(logs ?? []), [logs]);
  const weekHours = useMemo(() => weeklyHours(logs ?? []), [logs]);

  // Sync streak
  useEffect(() => {
    if (!user || !logs) return;
    const phasesCompleted = phases.filter(
      (p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)
    ).length;
    syncPublicStreakSummary(user.id, logs, phasesCompleted);
  }, [user, logs, phases]);

  const dsaEasyDone = useMemo(() => (dsaProblems ?? []).filter((p) => p.difficulty === "easy" && p.completed).length, [dsaProblems]);
  const dsaMediumDone = useMemo(() => (dsaProblems ?? []).filter((p) => p.difficulty === "medium" && p.completed).length, [dsaProblems]);
  const dsaHardDone = useMemo(() => (dsaProblems ?? []).filter((p) => p.difficulty === "hard" && p.completed).length, [dsaProblems]);

  const activeApplications = useMemo(
    () => (applications ?? []).filter((a) => ["applied", "screening", "interviewing"].includes(a.application_status)),
    [applications]
  );
  const offersCount = useMemo(() => (applications ?? []).filter((a) => a.offer).length, [applications]);

  const activeGoals = useMemo(() => (goals ?? []).filter((g) => g.status === "active"), [goals]);
  const atRiskGoal = useMemo(() => {
    const nowMs = now();
    return activeGoals
      .filter((g) => g.target_date)
      .sort((a, b) => new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime())
      .find((g) => new Date(g.target_date!).getTime() - nowMs < 7 * 86400000) ?? null;
  }, [activeGoals]);

  const weakestSkills = useMemo(
    () => [...(skillEvidence ?? [])].filter((s) => s.knowledge_pct > 0).sort((a, b) => a.knowledge_pct - b.knowledge_pct).slice(0, 3),
    [skillEvidence]
  );
  const staleSkillsCount = useMemo(
    () => (skillEvidence ?? []).filter((s) => s.freshness === "stale" && s.knowledge_pct > 0).length,
    [skillEvidence]
  );
  const improvingSkillsCount = useMemo(
    () => (skillEvidence ?? []).filter((s) => s.freshness === "fresh" && s.knowledge_pct > 0).length,
    [skillEvidence]
  );

  const currentProject = useMemo(() => {
    const inProgress = (projectProgress ?? []).find((p) => p.status === "in_progress");
    if (!inProgress) return null;
    const phase = phases.find((p) => p.id === inProgress.phase_id);
    return phase ? { phase, progress: inProgress } : null;
  }, [projectProgress, phases]);

  const overdueRevisions = useMemo(
    () => allTopics.filter((t) => t.progress?.completed && isOverdue(t.progress?.next_review_due ?? null)),
    [allTopics]
  );

  const overdueDsaCount = useMemo(
    () => (dsaProblems ?? []).filter((p) => p.completed && isOverdue(p.next_review_due)).length,
    [dsaProblems]
  );

  const staleApplications = useMemo(() => getStaleApplications(applications ?? []), [applications]);

  const smartAction = useMemo(
    () =>
      computeSmartAction({
        failureSignals,
        overdueTopicCount: overdueRevisions.length,
        overdueDsaCount,
        staleApplications,
        currentPhaseTitle: nextTopic?.phase.title ?? null,
        currentPhaseIncompleteTopicTitle: nextTopic?.topic.title ?? null,
      }),
    [failureSignals, overdueRevisions, overdueDsaCount, staleApplications, nextTopic]
  );

  const recommendedAction = useMemo(() => {
    if (smartAction) return { text: smartAction.title, href: smartAction.href };
    if (atRiskGoal) {
      const days = Math.ceil((new Date(atRiskGoal.target_date!).getTime() - now()) / 86400000);
      return { text: `"${atRiskGoal.title}" due in ${days} day${days === 1 ? "" : "s"}`, href: "/goals" };
    }
    if (staleSkillsCount > 0)
      return { text: `${staleSkillsCount} skill${staleSkillsCount === 1 ? "" : "s"} going stale — revisit`, href: "/skills" };
    if (nextTopic) return { text: `Continue: ${nextTopic.topic.title}`, href: "/roadmap" };
    return { text: "You're caught up — start a new project or review career readiness.", href: "/job-readiness" };
  }, [smartAction, atRiskGoal, staleSkillsCount, nextTopic]);

  const nextDsaProblem = useMemo(() => (dsaProblems ?? []).find((p) => !p.completed) ?? null, [dsaProblems]);

  const currentExit = useMemo(() => {
    if (!exitLadder) return null;
    let current = null;
    for (const e of exitLadder) {
      const linkedPhase = phases.find((p) => p.id === e.linked_phase);
      if (linkedPhase && linkedPhase.topics.length > 0 && linkedPhase.topics.every((t) => t.progress?.completed)) {
        current = e;
      }
    }
    return current;
  }, [exitLadder, phases]);

  const nextExit = useMemo(() => {
    if (!exitLadder || !currentExit) return exitLadder?.[0] ?? null;
    const idx = exitLadder.findIndex((e) => e.exit_code === currentExit.exit_code);
    return exitLadder[idx + 1] ?? null;
  }, [exitLadder, currentExit]);

  const leaderboardRank = useMemo(() => {
    if (!leaderboard || !user) return null;
    const sorted = [...leaderboard].sort((a, b) => b.current_streak - a.current_streak);
    const idx = sorted.findIndex((e) => e.user_id === user.id);
    return idx === -1 ? null : { rank: idx + 1, total: sorted.length };
  }, [leaderboard, user]);

  // ---- Callbacks ----
  const handleMutateProgress = useCallback(() => mutateProgress?.(), [mutateProgress]);
  const handleMutateLogs = useCallback(() => mutateLogs?.(), [mutateLogs]);

  // ---- Enhanced Skeleton ----
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const missionDetailsEffectivelyOpen = missionDetailsOpen || overdueRevisions.length > 0;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 py-6">
      {/* Tour */}
      {user && userSettings?.dashboard_tour_seen === false && <DashboardTour userId={user.id} />}

      {/* --- Greeting --- */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-surface via-surface/90 to-surface/80 p-6 shadow-xl backdrop-blur-sm ring-1 ring-white/10 dark:ring-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 max-w-full">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap break-words">
                <span className="break-words">
                  {greeting}
                  {firstName ? `, ${firstName}` : ""}
                </span>
                <span className="text-2xl shrink-0">👋</span>
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                Ready to ship the roadmap
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {streak.current > 0 && (
                <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/20 backdrop-blur-sm">
                  <Flame className="h-5 w-5 text-accent" />
                  <span className="font-bold text-xl min-w-[2.5rem] text-center">
                    <AnimatedCounter value={streak.current} />
                  </span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                </div>
              )}
              <Link
                href="/daily-plan"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="h-4 w-4" /> Start session
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/career-plan"
                className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/15 transition-colors"
              >
                <Rocket className="h-4 w-4" /> Career plan
              </Link>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* --- Failure Mode Warnings --- */}
      {failureSignals.length > 0 && (
        <FadeUp>
          <div className="flex flex-col gap-2">
            {failureSignals.map((signal) => (
              <div
                key={signal.code}
                className="rounded-xl border border-danger/30 bg-danger/5 p-4 flex items-start gap-3"
              >
                <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-danger">{signal.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{signal.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      )}

      {/* --- Mission Strip: where the plan says you should be vs. where you are --- */}
      {planPosition && (
        <FadeUp>
          <div className="rounded-xl border border-border/40 bg-surface/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <span>Month {planPosition.currentMonthLabel}</span>
                <span className="opacity-40">·</span>
                <span>Phase {planPosition.phasesActive}</span>
              </div>
              <p className="text-sm font-medium mt-0.5 truncate">{planPosition.focus}</p>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {planPosition.actualHours.toFixed(0)} / {planPosition.totalPlanHours.toFixed(0)}h
                </div>
                <div className="text-xs text-muted-foreground">{planPosition.overallProgressPct}% of plan</div>
              </div>
              {planPosition.projectedMonthsRemaining !== null && (
                <div className="text-right">
                  <div className="text-sm font-semibold">{planPosition.projectedMonthsRemaining}mo</div>
                  <div className="text-xs text-muted-foreground">at current pace</div>
                </div>
              )}
              <div className="w-24">
                <Progress value={planPosition.checkpointProgressPct} className="h-2" />
                <div className="text-[10px] text-muted-foreground mt-1 text-center">this checkpoint</div>
              </div>
            </div>
          </div>
        </FadeUp>
      )}

      {/* --- Stat Cards --- */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StaggerItem>
          <StatCard
            href="/roadmap"
            icon={<BookOpen className="h-4 w-4" />}
            iconBg="bg-accent/15 text-accent"
            label="Topics"
            value={`${completedTopics.length}/${totalTopics}`}
            progress={pct(completedTopics.length, totalTopics)}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href="/dsa"
            icon={<Code2 className="h-4 w-4" />}
            iconBg="bg-highlight/15 text-highlight"
            label="DSA"
            value={`${dsaEasyDone}E · ${dsaMediumDone}M${dsaHardDone > 0 ? ` · ${dsaHardDone}H` : ""}`}
            sub={`${metadata?.dsa_easy_target || "—"} easy target`}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href="/career"
            icon={<Briefcase className="h-4 w-4" />}
            iconBg="bg-reward/15 text-reward"
            label="Applications"
            value={`${activeApplications.length}`}
            sub={offersCount > 0 ? `${offersCount} offer${offersCount > 1 ? "s" : ""}` : "Active"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href="/exit-ladder"
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-success/15 text-success"
            label="Exit Point"
            value={currentExit?.exit_code || "—"}
            sub={nextExit ? `Next: ${nextExit.exit_code}` : "Reached top"}
          />
        </StaggerItem>
        {applicationMetrics && applicationMetrics.total_applications > 0 && (
          <StaggerItem>
            <StatCard
              href="/career"
              icon={<Percent className="h-4 w-4" />}
              iconBg="bg-info/15 text-info"
              label="Response Rate"
              value={`${applicationMetrics.response_rate_pct}%`}
              sub={`${applicationMetrics.reached_interview_count} interview${applicationMetrics.reached_interview_count !== 1 ? "s" : ""}`}
            />
          </StaggerItem>
        )}
        {leaderboardRank && (
          <StaggerItem>
            <StatCard
              href="/leaderboard"
              icon={<Trophy className="h-4 w-4" />}
              iconBg="bg-accent/15 text-accent"
              label="Rank"
              value={`#${leaderboardRank.rank}`}
              sub={`of ${leaderboardRank.total} by streak`}
            />
          </StaggerItem>
        )}
      </StaggerContainer>

      {/* --- Main 3-column layout --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <StaggerItem>
            <DailyMission
              userId={user?.id}
              nextTopic={nextTopic}
              currentStage={currentStage}
              exerciseProgress={exerciseProgress ?? []}
              projectProgress={projectProgress}
              orderedIncompleteTopics={orderedIncompleteTopics}
              onMutateProgress={handleMutateProgress}
              onMutateLogs={handleMutateLogs}
            />
          </StaggerItem>

          <StaggerItem>
            <FocusTimer userId={user?.id} onLogged={handleMutateLogs} />
          </StaggerItem>

          <StaggerItem>
            <Card className="border-warning/30 shadow-lg shadow-warning/5 glow-card bg-surface/90 backdrop-blur-sm">
              <CardContent noHeader className="flex items-start gap-4 p-5">
                <div className="p-2 rounded-full bg-warning/10 text-warning">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    Recommended next action
                  </p>
                  <Link href={recommendedAction.href} className="text-sm font-medium hover:underline flex items-center gap-1">
                    {recommendedAction.text}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <Link
                  href="/daily-plan"
                  className="text-xs text-accent hover:underline shrink-0 self-center flex items-center gap-1 bg-accent/5 px-3 py-1.5 rounded-full"
                >
                  Full plan <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </StaggerItem>

          {dailyPlan && dailyPlan.tasks.length > 0 && (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" /> Today&apos;s plan
                  </CardTitle>
                  <Link href="/daily-plan" className="text-xs text-accent hover:underline flex items-center gap-1">
                    Full plan <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {dailyPlan.tasks.slice(0, 3).map((task, i) => (
                    <Link
                      key={i}
                      href={task.href}
                      className="flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3 hover:border-accent/30 hover:bg-surface-2 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-accent transition">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{task.reason}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono-tabular shrink-0 bg-surface-2 px-2 py-1 rounded-full">
                        {task.estimatedMinutes}m
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          {(overdueRevisions.length > 0 || currentProject || nextDsaProblem) && (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
                <CardContent className="py-3">
                  <button
                    onClick={() => setMissionDetailsOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all w-full"
                    aria-expanded={missionDetailsEffectivelyOpen}
                  >
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform", missionDetailsEffectivelyOpen && "rotate-180")}
                    />
                    {missionDetailsEffectivelyOpen ? "Hide details" : "Show revision, project & DSA status"}
                  </button>
                  {missionDetailsEffectivelyOpen && (
                    <div className="flex flex-col gap-3 pt-3">
                      {overdueRevisions.length > 0 && (
                        <RevisionDueWidget overdueTopics={overdueRevisions} />
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {overdueRevisions.length === 0 && (
                          <Link
                            href="/revision"
                            className="flex items-center gap-2 text-xs hover:text-accent transition p-2 rounded-lg border border-border/30"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-info">Revisions up to date</span>
                          </Link>
                        )}
                        <Link
                          href="/projects"
                          className="flex items-center gap-2 text-xs hover:text-accent transition p-2 rounded-lg border border-border/30"
                        >
                          <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {currentProject ? currentProject.phase.title : "No project in progress"}
                          </span>
                        </Link>
                        <Link
                          href="/dsa"
                          className="flex items-center gap-2 text-xs hover:text-accent transition p-2 rounded-lg border border-border/30"
                        >
                          <Code2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {nextDsaProblem ? nextDsaProblem.problem_name : "No DSA problems yet"}
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          )}
        </div>

        {/* Right column (sticky) */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 self-start">
          <StaggerItem>
            <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm">Consistency</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold font-mono-tabular leading-none">{streak.best}</p>
                    <p className="text-xs text-muted-foreground mt-1">best streak</p>
                  </div>
                  <p className="text-xs text-muted-foreground text-right bg-surface-2 px-3 py-1 rounded-full">
                    <AnimatedCounter value={weekHours} decimals={1} duration="fast" />h this week
                  </p>
                </div>
                <StudyHeatmap logs={logs ?? []} />
              </CardContent>
            </Card>
          </StaggerItem>

          {activeGoals.length === 0 ? (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm border-dashed border-2 border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4" /> Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center text-center py-2">
                    <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No active goals. Set a deadline to stay on track.
                    </p>
                    <Link
                      href="/goals"
                      className="text-xs text-accent hover:underline mt-3 inline-flex items-center gap-1"
                    >
                      Set a goal <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ) : (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4" /> Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {(atRiskGoal ? [atRiskGoal] : activeGoals.slice(0, 1)).map((g) => {
                    const goalWithProgress = goals!.find((x) => x.id === g.id)!;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <Link
                            href="/goals"
                            className="text-sm font-medium hover:underline truncate flex items-center gap-1.5"
                          >
                            {atRiskGoal?.id === g.id && (
                              <AlertCircle className="h-3 w-3 text-warning" />
                            )}
                            {g.title}
                          </Link>
                          {g.target_date && (
                            <span className="text-xs text-muted-foreground font-mono-tabular shrink-0">
                              due {new Date(g.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                        <Progress value={goalWithProgress.progress_pct} className="h-1.5" glow />
                        <p className="text-xs text-muted-foreground mt-1">
                          {goalWithProgress.progress_pct}% complete
                        </p>
                      </div>
                    );
                  })}
                  {activeGoals.length > 1 && (
                    <Link href="/goals" className="text-xs text-accent hover:underline self-start">
                      View all {activeGoals.length} active goals →
                    </Link>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          {weakestSkills.length === 0 ? (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm border-dashed border-2 border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4" /> Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center text-center py-2">
                    <Gauge className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Complete topics to build skill evidence.</p>
                    <Link
                      href="/skills"
                      className="text-xs text-accent hover:underline mt-3 inline-flex items-center gap-1"
                    >
                      View skills <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ) : (
            <StaggerItem>
              <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4" /> Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    {weakestSkills.map((s) => (
                      <div key={s.technology_id} className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate">{s.technology_name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Progress value={s.knowledge_pct} className="h-1.5 w-20" />
                          <span className="text-xs text-muted-foreground font-mono-tabular w-9 text-right">
                            {s.knowledge_pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {staleSkillsCount > 0 && <Badge variant="danger">{staleSkillsCount} stale</Badge>}
                    {improvingSkillsCount > 0 && <Badge variant="success">{improvingSkillsCount} fresh</Badge>}
                    <Link href="/skills" className="text-xs text-accent hover:underline">
                      Review all →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          )}
        </div>
      </div>

      {/* --- Bottom row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeUp>
          <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Recent completions
              </CardTitle>
              <Link href="/activity" className="text-xs text-accent hover:underline flex items-center gap-1">
                History <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {completedTopics
                  .filter((t) => t.progress?.completed_at)
                  .sort((a, b) => (b.progress!.completed_at! > a.progress!.completed_at! ? 1 : -1))
                  .slice(0, 6)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground font-mono-tabular shrink-0">
                        {new Date(t.progress!.completed_at!).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  ))}
                {completedTopics.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No topics completed yet. Head to the{" "}
                    <Link href="/roadmap" className="text-accent hover:underline">
                      roadmap
                    </Link>
                    .
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Attention needed
              </CardTitle>
              {notifications.length > 0 && <Badge variant="warning">{notifications.length}</Badge>}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {notifications.slice(0, 6).map((n: AppNotification) => {
                  const Icon = NOTIF_ICON[n.kind];
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      className="flex items-start gap-2 text-sm py-1.5 border-b border-border/50 last:border-0 hover:text-accent transition group"
                    >
                      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", NOTIF_COLOR[n.kind])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate group-hover:underline">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.detail}</p>
                      </div>
                    </Link>
                  );
                })}
                {notifications.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">🎉 Nothing needs attention.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Recent activity
              </CardTitle>
              <Link href="/activity" className="text-xs text-accent hover:underline flex items-center gap-1">
                Full <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {(activityLog ?? []).slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">{ACTIVITY_LABELS[entry.action]}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono-tabular shrink-0">
                      {new Date(entry.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
                {(!activityLog || activityLog.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeUp>
      </div>
    </div>
  );
}

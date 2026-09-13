"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDailyPlan } from "@/lib/hooks/use-daily-plan";
import { useDailyPlanTaskState, useDailyPlanTaskStateRange, planTaskKey, computeCarryCounts, STALLED_CARRY_THRESHOLD } from "@/lib/hooks/use-daily-plan-task-state";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { computeWeeklyReview } from "@/lib/weekly-review";
import { computeWeeklyVariance, computeBiggestWeeklyRisk } from "@/lib/plan-position";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useTimeBlocks, useWeeklyCommitments } from "@/lib/hooks/use-execution-os";
import { WeeklyReviewCard } from "@/components/daily-plan/weekly-review-card";
import { ExecutionContextCard } from "@/components/daily-plan/execution-context-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { CalendarClock, Target, Gauge, RotateCcw, FolderGit2, Brain, BookOpen, Info } from "lucide-react";
import type { PlanTaskKind } from "@/lib/daily-planner";
import { PlanTaskRow } from "@/components/daily-plan/plan-task-row";
import { EndOfDayReview } from "@/components/daily-plan/end-of-day-review";
import { BiggestRiskCallout } from "@/components/daily-plan/biggest-risk-callout";
import { FadeUp, StaggerContainer } from "@/components/motion/primitives";
import { todayISO } from "@/lib/utils";

const KIND_ICON: Record<PlanTaskKind, typeof Target> = {
  goal_deadline: Target,
  weak_skill: Gauge,
  revision: RotateCcw,
  project: FolderGit2,
  interview_prep: Brain,
  learning: BookOpen,
};

const KIND_LABEL: Record<PlanTaskKind, string> = {
  goal_deadline: "Deadline",
  weak_skill: "Weak skill",
  revision: "Revision",
  project: "Project",
  interview_prep: "Interview prep",
  learning: "Learning",
};

const TIME_PRESETS = [30, 60, 120, 180, 300];

export default function DailyPlanPage() {
  const { user } = useUser();
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const { plan, isLoading, historicalCompletionRate } = useDailyPlan(availableMinutes);
  const planDate = todayISO();
  const { byKey, rows, mutate: mutateTaskState } = useDailyPlanTaskState(user?.id, planDate);
  const { data: logs, mutate: mutateLogs } = useDailyLogs(user?.id);
  const todayHours = (logs ?? []).find((l) => l.date === planDate)?.hours ?? 0;

  // Weekly review: Monday through today, so it's meaningful mid-week too
  // rather than only appearing once Sunday rolls around.
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  }, []);
  const { data: weekTaskRows } = useDailyPlanTaskStateRange(user?.id, weekStart, planDate);
  // Item 24 — carry counts across the same week range already fetched
  // above for the weekly review, so this needs no extra query.
  const carryCounts = useMemo(() => computeCarryCounts(weekTaskRows ?? []), [weekTaskRows]);
  const { data: dsaRows } = useDsaProgress(user?.id);
  const { data: careerRows } = useCareerTracker(user?.id);
  const weeklyReview = useMemo(
    () => computeWeeklyReview(weekTaskRows ?? [], dsaRows ?? [], logs ?? []),
    [weekTaskRows, dsaRows, logs]
  );
  const careerUpdatesThisWeek = useMemo(
    () => (careerRows ?? []).filter((c) => c.updated_at.slice(0, 10) >= weekStart).length,
    [careerRows, weekStart]
  );
  const weeklyVariance = useMemo(
    () => computeWeeklyVariance(weeklyReview, careerUpdatesThisWeek),
    [weeklyReview, careerUpdatesThisWeek]
  );
  const biggestWeeklyRisk = useMemo(
    () => computeBiggestWeeklyRisk(weekStart, logs ?? [], weeklyVariance),
    [weekStart, logs, weeklyVariance]
  );

  // Read-only cross-visibility into the Execution OS's weekly plan (see
  // ExecutionContextCard) — this page stays the single source for the
  // system-generated task list, /execution stays the single source for
  // manually-committed weekly outcomes and scheduled time blocks.
  const { data: weeklyCommitments } = useWeeklyCommitments(user?.id, weekStart);
  const { data: timeBlocks } = useTimeBlocks(user?.id, planDate, planDate);

  async function refreshAll() {
    await Promise.all([mutateTaskState(), mutateLogs()]);
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Daily Plan
        </h1>
        <p className="text-sm text-muted mt-1">
          Tell it how much time you have — it prioritizes deadlines, weak skills, and due revision first.
        </p>
      </div>
      </FadeUp>

      <Card className="glow-card">
        <CardContent noHeader className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-wide">How much time do you have today?</p>
          <div className="flex items-center gap-2 flex-wrap">
            {TIME_PRESETS.map((mins) => (
              <Button
                key={mins}
                size="sm"
                variant={availableMinutes === mins ? "default" : "outline"}
                onClick={() => setAvailableMinutes(mins)}
              >
                {mins < 60 ? `${mins}m` : `${(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)}h`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ExecutionContextCard
        todaysBlocks={timeBlocks ?? []}
        weeklyCommitments={weeklyCommitments ?? []}
      />

      {biggestWeeklyRisk && <BiggestRiskCallout risk={biggestWeeklyRisk} />}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && plan && (
        <>
          {plan.loadAdjusted && plan.adjustmentNote && (
            <Card className="border-warning/30">
              <CardContent noHeader className="flex items-start gap-3">
                <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-muted">{plan.adjustmentNote}</p>
              </CardContent>
            </Card>
          )}

          {plan.minimumViableDay && (
            <Card className="border-warning/30">
              <CardContent noHeader className="flex items-start gap-3">
                <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-muted">
                  Nothing fit exactly in {availableMinutes} minutes, so this is the smallest useful thing you can do
                  today ({plan.totalPlannedMinutes}m) — a short win beats an empty plan.
                </p>
              </CardContent>
            </Card>
          )}

          {plan.hasDeepShallowAlternation && plan.tasks.length > 2 && (
            <Card className="border-warning/30">
              <CardContent noHeader className="flex items-start gap-3">
                <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-muted">
                  Today&apos;s plan alternates between deep work (project/learning) and quick tasks (revision/DSA/prep)
                  {plan.distinctActivityKinds > 1 && ` across ${plan.distinctActivityKinds} different kinds of work`} —
                  consider grouping similar tasks back-to-back if you can, so you&apos;re not resetting focus between each one.
                </p>
              </CardContent>
            </Card>
          )}

          {plan.lowEnergyReordered && (
            <Card className="border-warning/30">
              <CardContent noHeader className="flex items-start gap-3">
                <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-muted">
                  You checked in low energy today, so lighter tasks are surfaced first within each priority —
                  nothing was dropped, just reordered.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Today&apos;s plan — {plan.totalPlannedMinutes} of {availableMinutes} min
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {plan.tasks.length === 0 && (
                <p className="text-sm text-muted">
                  Nothing urgent right now — nice work staying on top of things. Head to the{" "}
                  <Link href="/roadmap" className="text-accent hover:underline">
                    roadmap
                  </Link>{" "}
                  for general progress.
                </p>
              )}
              <StaggerContainer className="flex flex-col gap-2">
                {plan.tasks.map((task) => (
                  <PlanTaskRow
                    key={planTaskKey(task)}
                    task={task}
                    icon={KIND_ICON[task.kind]}
                    kindLabel={KIND_LABEL}
                    userId={user?.id}
                    state={byKey.get(planTaskKey(task))}
                    planDate={planDate}
                    onStateChange={refreshAll}
                    onFocusStarted={refreshAll}
                    stalled={(carryCounts.get(planTaskKey(task)) ?? 0) >= STALLED_CARRY_THRESHOLD}
                  />
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>

          <p className="text-xs text-muted">
            Priority order: goal deadlines within 3 days, then your weakest skills, then overdue/stale revision, then
            active project work, then interview prep, then the next roadmap topic.
            {historicalCompletionRate !== null && (
              <> Based on the last 14 days, you&apos;ve logged some study time on {Math.round(historicalCompletionRate * 100)}% of days.</>
            )}
          </p>

          <EndOfDayReview rows={rows} totalPlannedMinutes={plan.totalPlannedMinutes} actualHoursToday={todayHours} />
          <WeeklyReviewCard review={weeklyReview} variance={weeklyVariance} />
        </>
      )}
    </div>
  );
}

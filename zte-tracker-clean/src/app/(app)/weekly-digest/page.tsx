"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useAllStudySessions } from "@/lib/hooks/use-study-sessions";
import { useDailyPlanTaskStateRange } from "@/lib/hooks/use-daily-plan-task-state";
import { useCareerTracker, useApplicationMetrics } from "@/lib/hooks/use-career";
import { useExitLadder, usePhasesWithProgress, useMonthByMonth } from "@/lib/hooks/use-roadmap";
import { useInterviewWeaknesses } from "@/lib/hooks/use-interview-prep";
import { computeWeeklyReview } from "@/lib/weekly-review";
import {
  computeWeeklyVariance,
  computePlanPosition,
  computeExitEta,
  detectFailureSignals,
  detectTutorialDependency,
  detectPerfectionism,
  detectIgnoringDayJob,
  assessMonth24Decision,
} from "@/lib/plan-position";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AlertCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One page pulling together everything that's otherwise scattered across
 * dashboard / roadmap / exit-ladder / daily-plan into a single weekly
 * read. Every number here is computed by a function that already exists
 * elsewhere in the app (plan-position.ts, weekly-review.ts) — this page
 * adds zero new business logic, it's purely composition.
 */
export default function WeeklyDigestPage() {
  const { user } = useUser();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  const { data: logs } = useDailyLogs(user?.id);
  const { data: dsaRows } = useDsaProgress(user?.id);
  const { data: studySessions } = useAllStudySessions(user?.id);
  const { data: weekTaskRows } = useDailyPlanTaskStateRange(user?.id, weekStart, today);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: applicationMetrics } = useApplicationMetrics(user?.id);
  const { data: exitLadder } = useExitLadder();
  const { phases } = usePhasesWithProgress(user?.id);
  const { data: monthByMonth } = useMonthByMonth();
  const { data: interviewWeaknesses } = useInterviewWeaknesses(user?.id);

  const weeklyReview = useMemo(
    () => (weekTaskRows && dsaRows && logs ? computeWeeklyReview(weekTaskRows, dsaRows, logs) : null),
    [weekTaskRows, dsaRows, logs]
  );

  const careerUpdatesThisWeek = useMemo(
    () => (applications ?? []).filter((c) => c.updated_at.slice(0, 10) >= weekStart).length,
    [applications, weekStart]
  );

  const weeklyVariance = useMemo(
    () => (weeklyReview ? computeWeeklyVariance(weeklyReview, careerUpdatesThisWeek) : []),
    [weeklyReview, careerUpdatesThisWeek]
  );

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
    return signals;
  }, [studySessions, planPosition, applications, logs]);

  // Current exit rung readiness + ETA, mirroring exit-ladder page's own calc.
  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.order_index - b.order_index), [phases]);
  const currentRungInfo = useMemo(() => {
    if (!exitLadder || orderedPhases.length === 0) return null;
    let firstIncomplete: { exitCode: string; name: string | null; remainingHours: number; readinessPct: number } | null = null;

    for (const exit of exitLadder) {
      const cutoffIndex = orderedPhases.findIndex((p) => p.phase_number === exit.linked_phase);
      const upTo = cutoffIndex >= 0 ? orderedPhases.slice(0, cutoffIndex + 1) : [];
      let completed = 0;
      let total = 0;
      let remainingHours = 0;
      for (const phase of upTo) {
        for (const t of phase.topics) {
          total += 1;
          if (t.progress?.completed) completed += 1;
          else remainingHours += t.estimated_hours ?? 0;
        }
      }
      if (total > 0 && completed < total) {
        firstIncomplete = {
          exitCode: exit.exit_code,
          name: exit.name,
          remainingHours,
          readinessPct: Math.round((completed / total) * 100),
        };
        break;
      }
    }
    return firstIncomplete;
  }, [exitLadder, orderedPhases]);

  const currentEta = useMemo(
    () => (currentRungInfo && logs ? computeExitEta(currentRungInfo.remainingHours, logs) : null),
    [currentRungInfo, logs]
  );

  const month24 = useMemo(() => {
    if (!currentRungInfo) return null;
    return assessMonth24Decision({
      exitReadinessPct: currentRungInfo.readinessPct,
      totalApplications: applicationMetrics?.total_applications ?? 0,
      interviewsReached: applicationMetrics?.reached_interview_count ?? 0,
      offersReceived: applicationMetrics?.offer_count ?? 0,
      openInterviewWeaknesses: interviewWeaknesses?.length ?? 0,
    });
  }, [currentRungInfo, applicationMetrics, interviewWeaknesses]);

  const isLoading = !weeklyReview || !planPosition;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-accent" /> Weekly Digest
        </h1>
        <p className="text-sm text-muted mt-1">
          Everything that matters this week, in one read — pulled from the same numbers shown across the app.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <StaggerContainer className="flex flex-col gap-4">
          {/* Plan position */}
          {planPosition && (
            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle>Where you are</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Month {planPosition.currentMonthLabel} — {planPosition.focus}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {planPosition.actualHours.toFixed(0)} / {planPosition.totalPlanHours.toFixed(0)}h logged (
                        {planPosition.overallProgressPct}% of plan)
                      </p>
                    </div>
                    {planPosition.projectedMonthsRemaining !== null && (
                      <Badge variant="outline">{planPosition.projectedMonthsRemaining}mo remaining at current pace</Badge>
                    )}
                  </div>
                  <Progress value={planPosition.checkpointProgressPct} className="h-2" />
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          {/* Failure warnings */}
          {failureSignals.length > 0 && (
            <StaggerItem>
              <div className="flex flex-col gap-2">
                {failureSignals.map((signal) => (
                  <div key={signal.code} className="rounded-xl border border-danger/30 bg-danger/5 p-3 flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-danger">{signal.message}</p>
                      <p className="text-xs text-muted mt-0.5">{signal.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </StaggerItem>
          )}

          {/* Weekly variance */}
          {weeklyVariance.length > 0 && (
            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle>This week — planned vs. actual</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {weeklyVariance.map((v) => (
                    <div key={v.label} className="rounded-lg border border-border/40 p-2">
                      <p className="text-[10px] text-muted truncate">{v.label}</p>
                      <p className="text-sm font-semibold font-mono-tabular">{v.actual}</p>
                      <p className="text-[10px] text-muted">of {v.planned}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-1 text-[9px] px-1.5 py-0",
                          v.status === "on-target" && "border-success/40 text-success bg-success/10",
                          v.status === "under" && "border-danger/40 text-danger bg-danger/10",
                          v.status === "over" && "border-info/40 text-info bg-info/10"
                        )}
                      >
                        {v.variance >= 0 ? "+" : ""}
                        {v.variance}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          {/* Exit ETA */}
          {currentRungInfo && (
            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle>Next exit — {currentRungInfo.exitCode}{currentRungInfo.name ? ` (${currentRungInfo.name})` : ""}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{currentRungInfo.readinessPct}% ready</span>
                    {currentEta?.estimatedWeeks !== null && currentEta?.estimatedWeeks !== undefined && (
                      <span className="text-muted">~{currentEta.estimatedWeeks} week{currentEta.estimatedWeeks === 1 ? "" : "s"} away at current pace</span>
                    )}
                  </div>
                  <Progress value={currentRungInfo.readinessPct} className="h-2" />
                </CardContent>
              </Card>
            </StaggerItem>
          )}

          {/* Month-24 status */}
          {month24 && (
            <StaggerItem>
              <Card
                className={cn(
                  month24.decision === "go" && "border-success/40 bg-success/5",
                  month24.decision === "no-go" && "border-danger/40 bg-danger/5"
                )}
              >
                <CardContent className="flex flex-col gap-2 pt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={month24.decision === "go" ? "success" : month24.decision === "no-go" ? "danger" : "outline"}>
                      {month24.decision === "insufficient-evidence" ? "Insufficient evidence" : month24.decision}
                    </Badge>
                    <span className="text-sm font-semibold">Month-24 evidence status</span>
                  </div>
                  <ul className="text-xs text-muted flex flex-col gap-1">
                    {month24.reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>
          )}
        </StaggerContainer>
      )}
    </div>
  );
}

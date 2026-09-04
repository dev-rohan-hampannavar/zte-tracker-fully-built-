"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useInterviewAttempts } from "@/lib/hooks/use-interview-prep";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { computeMonthlyReview } from "@/lib/monthly-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <Badge variant="success" className="gap-1">
        <ArrowUp className="h-3 w-3" /> {delta}
      </Badge>
    );
  if (delta < 0)
    return (
      <Badge variant="warning" className="gap-1">
        <ArrowDown className="h-3 w-3" /> {Math.abs(delta)}
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1">
      <Minus className="h-3 w-3" /> 0
    </Badge>
  );
}

function monthName(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function MonthlyReviewPage() {
  const { user } = useUser();
  const { data: dsa, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: applications, isLoading: appsLoading } = useCareerTracker(user?.id);
  const { data: interviewAttempts, isLoading: attemptsLoading } = useInterviewAttempts(user?.id);
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);

  const loading = dsaLoading || appsLoading || attemptsLoading || phasesLoading;

  const review = useMemo(() => {
    if (!dsa || !applications || !interviewAttempts) return null;

    // A phase counts as "completed by end of <month>" if every one of its
    // topics has a completed_at timestamp on or before that month's last
    // day — using each phase's LATEST topic completion date as the
    // phase's own completion month, since that's the point the phase
    // actually became fully done. Topics with no timestamp (never
    // completed) make the phase not-yet-complete for every month.
    const phaseCompletionMonths = phases
      .filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed && t.progress.completed_at))
      .map((p) => {
        const dates = p.topics.map((t) => t.progress!.completed_at!);
        return dates.reduce((max, d) => (d > max ? d : max), dates[0]).slice(0, 7);
      })
      .sort();

    const phasesCompletedTotalByMonth = (month: string) => phaseCompletionMonths.filter((m) => m <= month).length;

    return computeMonthlyReview(
      dsa,
      applications,
      interviewAttempts.map((a) => a.attempted_at),
      phasesCompletedTotalByMonth
    );
  }, [dsa, applications, interviewAttempts, phases]);

  if (loading || !review) return <Skeleton className="h-96 w-full" />;

  const { current, previous } = review;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Monthly Career Review</h1>
          <p className="text-sm text-muted mt-1">
            {monthName(current.monthLabel)} vs {monthName(previous.monthLabel)} — real counts, nothing estimated.
          </p>
        </div>
      </FadeUp>

      <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "DSA solved", value: current.dsaSolved, prev: previous.dsaSolved, delta: review.dsaDelta },
          {
            label: "Applications submitted",
            value: current.applicationsSubmitted,
            prev: previous.applicationsSubmitted,
            delta: review.applicationsDelta,
          },
          {
            label: "Interview practice logged",
            value: current.interviewAttemptsLogged,
            prev: previous.interviewAttemptsLogged,
            delta: review.interviewAttemptsDelta,
          },
          { label: "Offers received", value: current.offersReceived, prev: previous.offersReceived, delta: null },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent noHeader>
                <p className="text-xs text-muted">{s.label}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-2xl font-bold font-mono-tabular">{s.value}</p>
                  {s.delta !== null && <DeltaBadge delta={s.delta} />}
                </div>
                <p className="text-[11px] text-muted mt-1">vs {s.prev} last month</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap progress</CardTitle>
        </CardHeader>
        <CardContent noHeader className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold font-mono-tabular">{current.phasesCompletedByMonthEnd}</p>
            <p className="text-xs text-muted">phases complete by end of {monthName(current.monthLabel)}</p>
          </div>
          <div className="text-muted">vs</div>
          <div>
            <p className="text-2xl font-bold font-mono-tabular text-muted">{previous.phasesCompletedByMonthEnd}</p>
            <p className="text-xs text-muted">by end of {monthName(previous.monthLabel)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary ranges seen this month</CardTitle>
          <p className="text-xs text-muted mt-1">
            Straight from the salary_range you entered per application — not a percentage against a target, since
            there&apos;s no salary target stored to measure progress against honestly.
          </p>
        </CardHeader>
        <CardContent noHeader className="flex flex-wrap gap-2">
          {current.salaryRangesSeen.length === 0 ? (
            <p className="text-sm text-muted">No salary ranges recorded on this month&apos;s applications.</p>
          ) : (
            current.salaryRangesSeen.map((s, i) => (
              <Badge key={`${s}-${i}`} variant="outline">
                {s}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DailyPlanTaskState } from "@/types/database";
import { formatHours } from "@/lib/utils";

interface EndOfDayReviewProps {
  rows: DailyPlanTaskState[];
  totalPlannedMinutes: number;
  actualHoursToday: number; // from daily_logs — the real, atomic source of "hours worked today"
}

/**
 * Planned-vs-actual summary for today's plan. Reads only
 * daily_plan_task_state (per-task outcome) + the existing daily_logs hours
 * figure that already powers streaks/heatmap — doesn't recompute "hours
 * worked" from a second source, so this can never disagree with what the
 * dashboard already shows for today's total.
 */
export function EndOfDayReview({ rows, totalPlannedMinutes, actualHoursToday }: EndOfDayReviewProps) {
  const completed = rows.filter((r) => r.status === "completed");
  const skipped = rows.filter((r) => r.status === "skipped");
  const incomplete = rows.filter((r) => r.status === "pending" || r.status === "in_progress");
  // carried_forward (migration 0057) marks a row superseded by a later
  // date's copy of the same task — this component is only ever passed
  // today's rows, which never carry that status, but excluding it from
  // the denominator here too keeps this consistent with weekly-review.ts
  // if that assumption ever changes.
  const total = completed.length + skipped.length + incomplete.length;
  const completionPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  // Plan adherence per the spec: completed planned minutes / total planned
  // minutes, not a task-count ratio — a 5-minute task and a 90-minute task
  // shouldn't count equally. Weighted by estimated_minutes (the planned
  // figure), same denominator basis as the weekly version in
  // weekly-review.ts.
  const plannedMinutesTotal = rows.reduce((sum, r) => sum + (r.estimated_minutes ?? 0), 0);
  const completedPlannedMinutes = completed.reduce((sum, r) => sum + (r.estimated_minutes ?? 0), 0);
  const adherencePct = plannedMinutesTotal > 0 ? Math.round((completedPlannedMinutes / plannedMinutesTotal) * 100) : 0;

  if (total === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> Today&apos;s review
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold font-mono-tabular">{completed.length}</p>
            <p className="text-xs text-muted">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-semibold font-mono-tabular">{incomplete.length}</p>
            <p className="text-xs text-muted">Incomplete</p>
          </div>
          <div>
            <p className="text-2xl font-semibold font-mono-tabular">{formatHours(actualHoursToday)}</p>
            <p className="text-xs text-muted">Hours logged</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {adherencePct}% of planned time completed
              {completionPct !== adherencePct && (
                <span className="text-muted/70"> · {completionPct}% of tasks</span>
              )}
            </span>
            <span>
              {completedPlannedMinutes}m / {totalPlannedMinutes}m planned
            </span>
          </div>
          <Progress value={adherencePct} />
        </div>

        {completed.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {completed.map((r) => (
              <div key={r.task_key} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">{r.title}</span>
                {r.actual_minutes != null && (
                  <span className="text-xs text-muted font-mono-tabular ml-auto shrink-0">{r.actual_minutes}m</span>
                )}
              </div>
            ))}
          </div>
        )}

        {skipped.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {skipped.map((r) => (
              <div key={r.task_key} className="flex items-center gap-2 text-sm text-muted">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate line-through">{r.title}</span>
              </div>
            ))}
          </div>
        )}

        {incomplete.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted uppercase tracking-wide flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Carrying forward to tomorrow
            </p>
            {incomplete.map((r) => (
              <div key={r.task_key} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px]">
                  {r.kind.replace("_", " ")}
                </Badge>
                <span className="truncate">{r.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

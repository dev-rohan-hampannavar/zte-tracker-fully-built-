"use client";

import { CalendarRange, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { WeeklyReview } from "@/lib/weekly-review";
import type { WeeklyVarianceItem } from "@/lib/plan-position";
import { formatHours, cn } from "@/lib/utils";

/**
 * Cross-domain weekly review — planned vs. actual, topics/DSA/projects/
 * revision counts, and blockers (tasks still incomplete by week's end).
 * Sourced entirely from daily_plan_task_state (the Phase 1 execution
 * table) + dsa_progress + daily_logs — no separate weekly-planning table,
 * since a week's plan is just seven days' worth of the same task rows.
 */
export function WeeklyReviewCard({ review, variance }: { review: WeeklyReview; variance?: WeeklyVarianceItem[] }) {
  const weekLabel = `${new Date(review.weekStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(
    review.weekEnd + "T00:00:00"
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  if (review.plannedTaskCount === 0 && review.actualHours === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4" /> This week — {weekLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {review.adherencePct}% of planned time completed
              <span className="text-muted/70">
                {" "}
                · {review.completedTaskCount}/{review.plannedTaskCount} tasks
              </span>
            </span>
            <span>{formatHours(review.actualHours)} logged</span>
          </div>
          <Progress value={review.adherencePct} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xl font-semibold font-mono-tabular">{review.topicsCompleted}</p>
            <p className="text-xs text-muted">Topics done</p>
          </div>
          <div>
            <p className="text-xl font-semibold font-mono-tabular">{review.dsaSolved}</p>
            <p className="text-xs text-muted">DSA solved</p>
          </div>
          <div>
            <p className="text-xl font-semibold font-mono-tabular">{review.projectsProgressed}</p>
            <p className="text-xs text-muted">Projects touched</p>
          </div>
          <div>
            <p className="text-xl font-semibold font-mono-tabular">{review.revisionCompleted}</p>
            <p className="text-xs text-muted">Revisions done</p>
          </div>
        </div>

        {variance && variance.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
            <p className="text-xs text-muted uppercase tracking-wide">Planned vs. actual</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {variance.map((v) => (
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
            </div>
          </div>
        )}

        {review.blockers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted uppercase tracking-wide flex items-center gap-1">
              <Flag className="h-3 w-3" /> Still open this week
            </p>
            {review.blockers.slice(0, 6).map((title, i) => (
              <div key={`${title}-${i}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px]">
                  blocker
                </Badge>
                <span className="truncate">{title}</span>
              </div>
            ))}
            {review.blockers.length > 6 && (
              <p className="text-xs text-muted">+{review.blockers.length - 6} more</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

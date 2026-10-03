"use client";

import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WeeklyRisk } from "@/lib/plan-position";

interface BiggestRiskCalloutProps {
  risk: WeeklyRisk;
}

/**
 * #27 — "Biggest risk this week" trending callout.
 *
 * Surfaces the single most urgent week-level risk: either a pace drop
 * vs the same window last week, or the worst-performing planned metric.
 * Strictly derived from real logged data — see computeBiggestWeeklyRisk
 * in plan-position.ts for what fires it and why.
 *
 * Positioned at the top of /daily-plan (above the task list) because it
 * answers "should I even follow today's plan as-is, or am I already off
 * track for the week?" — a question that changes how you weight today's
 * tasks, so it belongs before you read them, not after.
 */
export function BiggestRiskCallout({ risk }: BiggestRiskCalloutProps) {
  const isHigh = risk.severity === "high";

  return (
    <Card
      className={cn(
        "border",
        isHigh ? "border-danger/40 bg-danger/5" : "border-warning/40 bg-warning/5",
      )}
    >
      <CardContent noHeader className="flex items-start gap-3 py-3">
        <TrendingDown
          className={cn("h-4 w-4 mt-0.5 shrink-0", isHigh ? "text-danger" : "text-warning")}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-0.5">
            Biggest risk this week — {risk.dimension}
          </p>
          <p className="text-sm">{risk.message}</p>
          <p className={cn("text-xs mt-1", isHigh ? "text-danger" : "text-warning")}>
            {risk.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerPlanSettings } from "@/lib/hooks/use-career-plan";
import { PLAN_PATHS } from "@/data/full-plan";
import { getCareerPathStages } from "@/data/career-path-stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<string, string> = {
  green: "text-success",
  purple: "text-accent",
  amber: "text-warning",
  blue: "text-info",
};

/**
 * Compact Career Plan summary for the Dashboard: active track, its next
 * stage (from career-path-stages.ts), and its 10-yr ceiling, with a link
 * through to the full explorer. Renders nothing while settings are loading
 * or unset, matching the pattern other dashboard widgets use for
 * conditional sections (e.g. dailyPlan, overdueRevisions).
 */
export function CareerPlanWidget() {
  const { user } = useUser();
  const { data: settings } = useCareerPlanSettings(user?.id);
  if (!settings) return null;

  const path = PLAN_PATHS.find((p) => p.id === settings.career_plan_track);
  if (!path) return null;

  const entry = getCareerPathStages(settings.career_plan_track);
  const nextStage = entry?.stages.find((s) => !s.isNow) ?? entry?.stages[0];
  const toneClass = TONE_TEXT[path.tone] ?? "text-accent";

  return (
    <Card className="shadow-sm bg-surface/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4" /> Career plan
        </CardTitle>
        <Link href="/career-plan" className="text-xs text-accent hover:underline flex items-center gap-1">
          Explore paths <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{path.title}</p>
            <p className="text-xs text-muted truncate mt-0.5">{path.summary}</p>
          </div>
          <Badge variant="outline" className={cn("shrink-0 font-mono-tabular", toneClass)}>
            {path.ceiling}
          </Badge>
        </div>
        {nextStage && (
          <div className="rounded-lg border border-border/50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted">Next stage</p>
            <p className="text-sm font-medium mt-0.5">{nextStage.title}</p>
            <p className="text-xs text-muted mt-0.5">{nextStage.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

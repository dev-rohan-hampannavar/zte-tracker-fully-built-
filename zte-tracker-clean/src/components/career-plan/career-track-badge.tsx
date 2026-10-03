"use client";

import { useUser } from "@/lib/hooks/use-user";
import { useCareerPlanSettings } from "@/lib/hooks/use-career-plan";
import { PLAN_PATHS } from "@/data/full-plan";
import { cn } from "@/lib/utils";

const TONE_DOT: Record<string, string> = {
  green: "bg-success",
  purple: "bg-accent",
  amber: "bg-warning",
  blue: "bg-info",
};

/**
 * A compact "active track" indicator — a colored dot + short label — for
 * anywhere in the app that references the Career Plan without needing the
 * full explorer. Renders nothing while loading or signed out, so it never
 * causes layout shift/flicker on first paint.
 */
export function CareerTrackBadge({ className }: { className?: string }) {
  const { user } = useUser();
  const { data: settings } = useCareerPlanSettings(user?.id);
  if (!settings) return null;

  const path = PLAN_PATHS.find((p) => p.id === settings.career_plan_track);
  if (!path) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium text-muted", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[path.tone] ?? "bg-muted")} />
      <span className="truncate">{path.eyebrow.split(" · ")[0]}</span>
    </span>
  );
}

/** Just the short label ("Plan A", "SAP", ...) with no dot — for tighter spaces. */
export function useActiveCareerTrackLabel(): string | null {
  const { user } = useUser();
  const { data: settings } = useCareerPlanSettings(user?.id);
  if (!settings) return null;
  const path = PLAN_PATHS.find((p) => p.id === settings.career_plan_track);
  return path ? path.eyebrow.split(" · ")[0] : null;
}

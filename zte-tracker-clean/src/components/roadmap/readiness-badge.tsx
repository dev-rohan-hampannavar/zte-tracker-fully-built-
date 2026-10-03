"use client";

import { Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PhaseReadiness } from "@/lib/phase-readiness";

/**
 * Compact phase readiness indicator — a small badge, not a second progress
 * bar, since topic completion already has one on the phase card. Color
 * bands are intentionally coarse (not a precise gradient) so this reads
 * as "roughly where you stand," matching the spec's "avoid meaningless
 * percentages" instruction — the number is real, but its presentation
 * doesn't pretend to more precision than the underlying evidence has.
 *
 * Uses a native `title` attribute for the component breakdown on hover,
 * matching the existing pattern in kanban-view.tsx rather than
 * introducing a new Tooltip primitive this design system doesn't have.
 */
export function ReadinessBadge({ readiness }: { readiness: PhaseReadiness | undefined }) {
  if (!readiness || readiness.score === null) return null;

  const { score, components } = readiness;
  const band = score >= 80 ? "success" : score >= 50 ? "warning" : "outline";

  const parts = [
    components.prerequisiteComplete ? "Prerequisite phase complete" : "Started before the prior phase finished",
    `Topics: ${components.topicCompletionPct}% complete`,
  ];
  if (components.revisionConfidencePct !== null) parts.push(`Revision confidence: ${components.revisionConfidencePct}%`);
  if (components.timeAccuracyPct !== null) parts.push(`Time-estimate accuracy: ${components.timeAccuracyPct}%`);

  return (
    <Badge
      variant={band as "success" | "warning" | "outline"}
      className="shrink-0 text-[10px] gap-1 cursor-help"
      title={parts.join(" · ")}
    >
      <Gauge className="h-2.5 w-2.5" /> {score}% ready
    </Badge>
  );
}

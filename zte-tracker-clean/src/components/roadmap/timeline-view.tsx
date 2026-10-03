"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthByMonthRow, PhaseWithTopics } from "@/types/database";

/**
 * Interactive 24-month timeline (Section 6). Renders every month_by_month
 * checkpoint in order, colored by real progress — never a hardcoded
 * "current month". Status per checkpoint is derived the same way
 * plan-position.ts's computePlanPosition does (cumulative realistic_hours
 * vs. actual logged hours), so this view and the dashboard Mission strip
 * can never disagree about where "current" is.
 */

interface TimelineCheckpoint extends MonthByMonthRow {
  hours: number | null;
  cumulativeStart: number;
  cumulativeEnd: number;
  state: "complete" | "current" | "upcoming";
  linkedPhase: PhaseWithTopics | undefined;
}

function parseHours(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/[\d,.]+/);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function TimelineView({
  monthByMonth,
  phases,
  actualHours,
}: {
  monthByMonth: MonthByMonthRow[];
  phases: PhaseWithTopics[];
  actualHours: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const checkpoints: TimelineCheckpoint[] = useMemo(() => {
    const ordered = [...monthByMonth].sort((a, b) => a.order_index - b.order_index);
    return ordered.reduce<TimelineCheckpoint[]>((result, row) => {
      const hours = parseHours(row.realistic_hours);
      const cumulativeStart = result.at(-1)?.cumulativeEnd ?? 0;
      const cumulativeEnd = cumulativeStart + (hours ?? 0);
      const currentAssigned = result.some((checkpoint) => checkpoint.state === "current");

      let state: TimelineCheckpoint["state"];
      if (hours !== null && actualHours >= cumulativeEnd) {
        state = "complete";
      } else if (!currentAssigned) {
        state = "current";
      } else {
        state = "upcoming";
      }

      // phases_active can be "01", "01b", "—", etc — match against phase_number.
      const linkedPhase = phases.find((p) => p.phase_number === row.phases_active);

      result.push({ ...row, hours, cumulativeStart, cumulativeEnd, state, linkedPhase });
      return result;
    }, []);
  }, [monthByMonth, phases, actualHours]);

  const openCheckpoint = checkpoints.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col gap-2">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        {checkpoints.map((cp) => {
          return (
            <div key={cp.id} className="relative flex gap-3">
              <div
                className={cn(
                  "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 mt-1",
                  cp.state === "complete" && "border-success bg-success/15 text-success",
                  cp.state === "current" && "border-accent bg-accent/15 text-accent",
                  cp.state === "upcoming" && "border-border bg-surface text-muted"
                )}
              >
                {cp.state === "complete" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : cp.state === "current" ? (
                  <Flag className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              <button
                onClick={() => setOpenId(openId === cp.id ? null : cp.id)}
                className="flex-1 text-left"
              >
                <Card
                  interactive
                  className={cn(
                    "transition-standard",
                    cp.state === "current" && "border-accent/50 bg-accent/5",
                    cp.state === "upcoming" && "opacity-70"
                  )}
                >
                  <CardContent noHeader className="flex items-center gap-3 py-2.5">
                    <Badge variant="outline" className="font-mono-tabular shrink-0">
                      Month {cp.month}
                    </Badge>
                    <span className="text-sm font-medium truncate flex-1">{cp.focus}</span>
                    {cp.state === "current" && (
                      <Badge variant="accent" className="shrink-0">
                        You are here
                      </Badge>
                    )}
                    {cp.hours !== null && (
                      <span className="text-xs text-muted font-mono-tabular shrink-0">{cp.realistic_hours}</span>
                    )}
                  </CardContent>
                </Card>
              </button>
            </div>
          );
        })}
      </div>

      {openCheckpoint && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent noHeader className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Month {openCheckpoint.month} — {openCheckpoint.focus}
              </h3>
              <button onClick={() => setOpenId(null)} className="text-xs text-muted hover:text-foreground">
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-muted">Phase</p>
                <p className="text-sm font-mono-tabular font-semibold">{openCheckpoint.phases_active}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Plan hours</p>
                <p className="text-sm font-mono-tabular font-semibold">{openCheckpoint.realistic_hours ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Cumulative by end</p>
                <p className="text-sm font-mono-tabular font-semibold">{Math.round(openCheckpoint.cumulativeEnd)}h</p>
              </div>
              <div>
                <p className="text-xs text-muted">Status</p>
                <p className="text-sm font-semibold capitalize">{openCheckpoint.state.replace("-", " ")}</p>
              </div>
            </div>
            {openCheckpoint.linkedPhase && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span>{openCheckpoint.linkedPhase.title}</span>
                  <span>
                    {openCheckpoint.linkedPhase.topics.filter((t) => t.progress?.completed).length}/
                    {openCheckpoint.linkedPhase.topics.length} topics
                  </span>
                </div>
                <Progress
                  value={
                    openCheckpoint.linkedPhase.topics.length > 0
                      ? (openCheckpoint.linkedPhase.topics.filter((t) => t.progress?.completed).length /
                          openCheckpoint.linkedPhase.topics.length) *
                        100
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            )}
            {!openCheckpoint.linkedPhase && (
              <p className="text-xs text-muted">No single roadmap phase maps directly to this checkpoint.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

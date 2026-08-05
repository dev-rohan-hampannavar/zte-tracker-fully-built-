"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowDown, Flag, MapPin, ArrowRight } from "lucide-react";
import type { PhaseWithTopics } from "@/types/database";

/**
 * Core content of the Dependency Graph / Learning Path page, extracted so
 * it can be reused as-is in two places: the standalone `/dependency-graph`
 * route, and the roadmap page's view toggle (Stage 2, Item 54 — "Reuse the
 * Dependency Graph as the fifth view alongside List/Cards/Kanban/Calendar").
 * Takes `phases` as a prop rather than fetching its own data, so it always
 * reflects whatever the caller has already loaded (and, on the roadmap
 * page, whatever filters are currently active).
 */
export function LearningPathView({ phases }: { phases: PhaseWithTopics[] }) {
  const bands = useMemo(() => {
    const map = new Map<string, PhaseWithTopics[]>();
    for (const phase of phases) {
      const key = phase.band ?? "Unbanded";
      map.set(key, [...(map.get(key) ?? []), phase]);
    }
    return Array.from(map.entries());
  }, [phases]);

  // Current → Next Topic → Next Stage → Next Phase → Next Exit Point,
  // derived from the same ordered phase/stage/topic data used below —
  // no new tables, no new queries.
  const currentPosition = useMemo(() => {
    const orderedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);

    const currentPhase = orderedPhases.find((phase) => {
      const total = phase.topics.length;
      const done = phase.topics.filter((t) => t.progress?.completed).length;
      return total === 0 || done < total;
    });

    if (!currentPhase) {
      return { done: true } as const;
    }

    const orderedTopics = [...currentPhase.topics].sort((a, b) => a.order_index - b.order_index);
    const nextTopic = orderedTopics.find((t) => !t.progress?.completed) ?? null;

    const orderedStages = [...(currentPhase.stages ?? [])].sort((a, b) => a.order_index - b.order_index);
    const nextStage = nextTopic ? orderedStages.find((s) => s.id === nextTopic.stage_id) ?? null : null;

    const currentIndex = orderedPhases.findIndex((p) => p.id === currentPhase.id);
    const nextPhase = orderedPhases[currentIndex + 1] ?? null;

    const nextExitPhase = orderedPhases.slice(currentIndex).find((p) => p.exit_point_code);

    return {
      done: false as const,
      currentPhase,
      nextTopic,
      nextStage,
      nextPhase,
      nextExitPhase,
    };
  }, [phases]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted">
        Note: the source roadmap doesn&apos;t define granular topic-to-topic prerequisites, so this
        shows phase-level sequence (the real ordering data) rather than a fabricated dependency web.
      </p>

      {currentPosition.done ? (
        <Card className="border-success/40">
          <CardContent className="py-4 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span>All phases complete — no current position to show.</span>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm font-medium">Current Position</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
              <Link
                href={`/roadmap#${currentPosition.currentPhase.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 font-medium hover:border-accent/70"
              >
                {currentPosition.currentPhase.phase_number} — {currentPosition.currentPhase.title}
              </Link>

              <ArrowRight className="h-3 w-3 text-border shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted">Next topic</span>
                <span className="text-foreground">{currentPosition.nextTopic?.title ?? "—"}</span>
              </div>

              <ArrowRight className="h-3 w-3 text-border shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted">Next stage</span>
                <span className="text-foreground">
                  {currentPosition.nextStage
                    ? `Stage ${currentPosition.nextStage.stage_number} — ${currentPosition.nextStage.title}`
                    : "—"}
                </span>
              </div>

              <ArrowRight className="h-3 w-3 text-border shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted">Next phase</span>
                <span className="text-foreground">
                  {currentPosition.nextPhase
                    ? `${currentPosition.nextPhase.phase_number} — ${currentPosition.nextPhase.title}`
                    : "This is the final phase"}
                </span>
              </div>

              <ArrowRight className="h-3 w-3 text-border shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted">Next exit point</span>
                <span className="text-foreground inline-flex items-center gap-1">
                  {currentPosition.nextExitPhase ? (
                    <>
                      <Flag className="h-3 w-3 text-accent" /> Exit {currentPosition.nextExitPhase.exit_point_code}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {bands.map(([band, bandPhases]) => (
          <div key={band}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">{band}</p>
            <div className="flex flex-col items-start gap-0">
              {bandPhases.map((phase, i) => {
                const completedCount = phase.topics.filter((t) => t.progress?.completed).length;
                const totalCount = phase.topics.length;
                const complete = totalCount > 0 && completedCount === totalCount;
                const inProgress = completedCount > 0 && !complete;

                return (
                  <div key={phase.id} className="flex flex-col items-start w-full">
                    <Link href={`/roadmap#${phase.id}`} className="w-full max-w-xl">
                      <Card
                        interactive
                        className={cn(
                          complete && "border-success/40",
                          inProgress && "border-accent/40"
                        )}
                      >
                        <CardContent className="py-3 flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                              complete
                                ? "border-success bg-success/15 text-success"
                                : inProgress
                                ? "border-accent bg-accent/15 text-accent"
                                : "border-border bg-surface text-muted"
                            )}
                          >
                            {complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono-tabular text-muted">{phase.phase_number}</span>
                              <p className="text-sm font-medium truncate">{phase.title}</p>
                            </div>
                            <p className="text-xs text-muted font-mono-tabular">
                              {completedCount}/{totalCount} topics
                            </p>
                          </div>
                          {phase.exit_point_code && (
                            <Badge variant="accent" className="shrink-0 flex items-center gap-1">
                              <Flag className="h-3 w-3" /> Exit {phase.exit_point_code}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                    {i < bandPhases.length - 1 && (
                      <div className="flex justify-center w-full py-1 pl-3.5">
                        <ArrowDown className="h-3.5 w-3.5 text-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
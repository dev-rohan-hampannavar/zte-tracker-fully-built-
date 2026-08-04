"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/utils";
import { computeStageTopicLocks, type TopicLockInfo } from "@/lib/topic-prerequisites";
import { Lock } from "lucide-react";
import type { PhaseWithTopics, TopicWithProgress } from "@/types/database";

/**
 * Stage 2 — Item 54: Kanban view.
 * Columns = Not Started / In Progress / Completed. Cards = topics.
 * "In progress" uses the plan's own heuristic: a topic that isn't complete
 * but has actual_minutes_spent > 0 (partial time logged) — the only
 * per-topic signal that distinguishes "touched" from "untouched" without
 * a new schema field.
 *
 * Stage 3 — Item 34: topic-level prerequisite locks (see
 * lib/topic-prerequisites.ts) are respected here too — a locked topic's
 * checkbox and open button are disabled, with a small lock badge, same as
 * the List/Cards views. Locks are computed per-stage across all phases
 * since this view flattens topics out of their phase/stage grouping.
 */
export function KanbanView({
  phases,
  onToggle,
  onOpen,
  topicLockingDisabled,
}: {
  phases: PhaseWithTopics[];
  onToggle: (id: string, completed: boolean) => void;
  onOpen: (t: TopicWithProgress) => void;
  topicLockingDisabled?: boolean;
}) {
  const lockMap = useMemo(() => {
    if (topicLockingDisabled) return new Map<string, TopicLockInfo>();
    const map = new Map<string, TopicLockInfo>();
    for (const phase of phases) {
      for (const stage of phase.stages ?? []) {
        for (const [topicId, info] of computeStageTopicLocks(stage.topics)) {
          map.set(topicId, info);
        }
      }
    }
    return map;
  }, [phases, topicLockingDisabled]);

  const columns = useMemo(() => {
    const notStarted: (TopicWithProgress & { phaseTitle: string })[] = [];
    const inProgress: (TopicWithProgress & { phaseTitle: string })[] = [];
    const completed: (TopicWithProgress & { phaseTitle: string })[] = [];

    for (const phase of phases) {
      for (const topic of phase.topics) {
        const withPhase = { ...topic, phaseTitle: phase.title };
        if (topic.progress?.completed) {
          completed.push(withPhase);
        } else if ((topic.progress?.actual_minutes_spent ?? 0) > 0) {
          inProgress.push(withPhase);
        } else {
          notStarted.push(withPhase);
        }
      }
    }
    return { notStarted, inProgress, completed };
  }, [phases]);

  const groups: { key: keyof typeof columns; label: string; accent: string }[] = [
    { key: "notStarted", label: "Not Started", accent: "border-border" },
    { key: "inProgress", label: "In Progress", accent: "border-accent/40" },
    { key: "completed", label: "Completed", accent: "border-success/40" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {groups.map(({ key, label, accent }) => {
        const topics = columns[key];
        return (
          <div key={key} className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
              <span className="text-xs text-muted font-mono-tabular">{topics.length}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
              {topics.map((topic) => {
                const lockInfo = lockMap.get(topic.id);
                const isLocked = !!lockInfo?.locked;
                return (
                  <Card key={topic.id} className={cn("transition-colors", accent, isLocked && "opacity-60")}>
                    <CardContent className="pt-3 pb-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={!!topic.progress?.completed}
                          onCheckedChange={(v) => onToggle(topic.id, v === true)}
                          disabled={isLocked}
                          className="mt-0.5 shrink-0"
                        />
                        <button
                          onClick={() => !isLocked && onOpen(topic)}
                          disabled={isLocked}
                          className={cn(
                            "flex-1 text-left text-sm min-w-0",
                            topic.progress?.completed && "text-muted line-through",
                            isLocked && "cursor-not-allowed"
                          )}
                        >
                          {topic.title}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted truncate pl-6">{topic.phaseTitle}</p>
                      <div className="flex items-center gap-2 pl-6 flex-wrap">
                        {isLocked && (
                          <span
                            className="flex items-center gap-1 text-[10px] text-muted"
                            title={`Requires: ${lockInfo?.requiredTitle}`}
                          >
                            <Lock className="h-3 w-3" /> Requires: {lockInfo?.requiredTitle}
                          </span>
                        )}
                        {topic.progress?.difficulty && (
                          <Badge
                            variant={
                              topic.progress.difficulty === "hard"
                                ? "danger"
                                : topic.progress.difficulty === "medium"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {topic.progress.difficulty}
                          </Badge>
                        )}
                        {topic.estimated_hours && (
                          <span className="text-[11px] text-muted font-mono-tabular">
                            {formatHours(topic.estimated_hours)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {topics.length === 0 && (
                <p className="text-xs text-muted text-center py-6">No topics here.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

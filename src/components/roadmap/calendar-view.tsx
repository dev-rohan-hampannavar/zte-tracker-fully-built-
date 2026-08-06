"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Info } from "lucide-react";
import type { PhaseWithTopics, TopicWithProgress, UserSettings } from "@/types/database";
import { localDateISO } from "@/lib/utils";

const DEFAULT_HOURS_PER_WEEK = 10;
const DEFAULT_HOURS_PER_TOPIC = 3; // used only when a topic has no estimated_hours

/**
 * Stage 2 — Item 54: Calendar view.
 * Maps incomplete topics to projected study dates using the person's own
 * weekly-pace setting (user_settings.weekly_goal_value / weekly_goal_type,
 * already set in Settings). This is purely a forward projection assuming
 * topics are studied in their existing order at a constant weekly pace —
 * it is NOT a claim about the roadmap.md content itself, which defines no
 * calendar dates. If the person's goal is topic-count-based rather than
 * hours-based, there's no hours/week to project from, so this falls back
 * to a topics/week pace instead of guessing an hours equivalent.
 */
export function CalendarView({
  phases,
  onOpen,
  settings,
}: {
  phases: PhaseWithTopics[];
  onOpen: (t: TopicWithProgress) => void;
  settings: UserSettings | undefined;
}) {
  const usingTopicPace = settings?.weekly_goal_type === "topics";
  const hoursPerWeek =
    settings?.weekly_goal_type === "hours" && settings.weekly_goal_value > 0
      ? settings.weekly_goal_value
      : DEFAULT_HOURS_PER_WEEK;
  const topicsPerWeek =
    settings?.weekly_goal_type === "topics" && settings.weekly_goal_value > 0 ? settings.weekly_goal_value : null;

  const projection = useMemo(() => {
    const incomplete = phases
      .flatMap((phase) => phase.topics.map((t) => ({ ...t, phaseTitle: phase.title })))
      .filter((t) => !t.progress?.completed)
      .sort((a, b) => a.order_index - b.order_index);

    const today = new Date();
    const weeks = new Map<string, (TopicWithProgress & { phaseTitle: string })[]>();

    if (topicsPerWeek) {
      // Topic-count pace: N topics per week, in order.
      incomplete.forEach((topic, i) => {
        const weekOffset = Math.floor(i / topicsPerWeek);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() + weekOffset * 7);
        // localDateISO, not toISOString() — keeps projected week labels
        // stable at local midnight instead of drifting a day on UTC conversion.
        const key = localDateISO(weekStart);
        weeks.set(key, [...(weeks.get(key) ?? []), topic]);
      });
    } else {
      // Hours pace: accumulate estimated_hours until the weekly budget is
      // spent, then roll to the next week.
      let hoursIntoWeek = 0;
      let weekOffset = 0;
      for (const topic of incomplete) {
        const topicHours = topic.estimated_hours ?? DEFAULT_HOURS_PER_TOPIC;
        if (hoursIntoWeek + topicHours > hoursPerWeek && hoursIntoWeek > 0) {
          weekOffset += 1;
          hoursIntoWeek = 0;
        }
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() + weekOffset * 7);
        // localDateISO, not toISOString() — keeps projected week labels
        // stable at local midnight instead of drifting a day on UTC conversion.
        const key = localDateISO(weekStart);
        weeks.set(key, [...(weeks.get(key) ?? []), topic]);
        hoursIntoWeek += topicHours;
      }
    }

    return Array.from(weeks.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [phases, hoursPerWeek, topicsPerWeek]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
        <Info className="h-3.5 w-3.5 text-muted shrink-0 mt-0.5" />
        <p className="text-xs text-muted">
          Projection only, at{" "}
          <span className="text-foreground font-medium">
            {topicsPerWeek ? `${topicsPerWeek} topics/week` : `${hoursPerWeek} hrs/week`}
          </span>{" "}
          {usingTopicPace ? "(from your Settings goal)" : settings ? "(from your Settings goal)" : "(default — set a weekly goal in Settings)"}.
          Assumes topics are studied in roadmap order at a constant pace — not a claim about
          dates in roadmap.md, which defines none.
        </p>
      </div>

      {projection.length === 0 && (
        <p className="text-sm text-muted text-center py-8">Everything&apos;s complete — nothing to project.</p>
      )}

      <div className="flex flex-col gap-3">
        {projection.map(([weekKey, topics]) => {
          const weekStart = new Date(weekKey);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const label = `${weekStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(
            "en-IN",
            { month: "short", day: "numeric" }
          )}`;

          return (
            <Card key={weekKey}>
              <CardContent noHeader className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-muted shrink-0" />
                  <p className="text-xs font-medium">{label}</p>
                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                    {topics.length} topic{topics.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => onOpen(topic)}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                    >
                      <span className="truncate">{topic.title}</span>
                      <span className="text-[11px] text-muted shrink-0">{topic.phaseTitle}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

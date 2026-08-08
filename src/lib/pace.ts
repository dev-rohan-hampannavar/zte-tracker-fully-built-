import type { TopicWithProgress, PhaseWithTopics } from "@/types/database";
import { weeklyHours } from "@/lib/hooks/use-daily-logs";
import type { DailyLog } from "@/types/database";

export interface PaceStatus {
  // Hours the roadmap "expects" to have been spent by now, based on
  // cumulative estimated_hours of every completed-or-current topic up to
  // and including the one Daily Mission is on. Compared against actual
  // hours logged (all-time, not just this week) to judge on/behind/ahead.
  expectedHoursSoFar: number;
  actualHoursSoFar: number;
  deltaHours: number; // actual - expected; negative = behind
  status: "ahead" | "on-pace" | "behind";
  thisWeekHours: number;
}

// Within +/- this many hours of expected, we call it "on pace" rather than
// nitpicking a fractional-hour difference into "behind"/"ahead" — avoids a
// badge that flickers status on every single log.
const ON_PACE_TOLERANCE_HOURS = 3;

/**
 * Compares actual total hours logged (from daily_logs) against what the
 * roadmap's own estimated_hours would predict for someone who has reached
 * the current topic — i.e. the sum of estimated_hours for every topic
 * before (and including, if complete) the current one. This is a simple
 * "are you roughly where the roadmap assumes you'd be" signal, not a
 * calendar-based deadline — there's no fixed start date or target date
 * anywhere in this schema to compare against.
 */
export function computePaceStatus(
  phases: PhaseWithTopics[],
  logs: DailyLog[],
  currentTopicId: string | undefined
): PaceStatus | null {
  const allTopics: TopicWithProgress[] = phases.flatMap((p) => p.topics);
  if (allTopics.length === 0) return null;

  const actualHoursSoFar = logs.reduce((sum, l) => sum + Number(l.hours), 0);
  if (actualHoursSoFar === 0) return null; // nothing logged yet — no pace signal to show

  // "Expected so far" = every completed topic's full estimate, plus the
  // current topic's estimate (crediting the whole topic, not partial —
  // partial credit is already visible via the progress bar next to it).
  let expectedHoursSoFar = 0;
  for (const t of allTopics) {
    if (t.progress?.completed) {
      expectedHoursSoFar += t.estimated_hours ?? 0;
    } else if (t.id === currentTopicId) {
      expectedHoursSoFar += t.estimated_hours ?? 0;
      break;
    }
  }

  const deltaHours = actualHoursSoFar - expectedHoursSoFar;
  const status: PaceStatus["status"] =
    Math.abs(deltaHours) <= ON_PACE_TOLERANCE_HOURS ? "on-pace" : deltaHours > 0 ? "ahead" : "behind";

  return {
    expectedHoursSoFar,
    actualHoursSoFar,
    deltaHours,
    status,
    thisWeekHours: weeklyHours(logs),
  };
}

export interface CompletionProjection {
  remainingHours: number;
  weeklyPaceHours: number; // recent average weekly hours used for the projection
  weeksRemaining: number | null; // null if pace is 0 (can't project)
  projectedDate: string | null; // ISO date, null if weeksRemaining is null
}

/**
 * Projects a finish date for the remaining (incomplete) topics in `phases`
 * — pass all phases for an overall roadmap projection, or a single phase's
 * topics for a phase-level projection. Uses the trailing 4-week average
 * from weeklyBreakdown as the pace estimate (more stable than last-7-days
 * alone, which can swing a lot on a single heavy or light week).
 */
export function computeCompletionProjection(
  topics: TopicWithProgress[],
  recentWeeklyAverageHours: number
): CompletionProjection {
  const remainingHours = topics
    .filter((t) => !t.progress?.completed)
    .reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);

  if (recentWeeklyAverageHours <= 0) {
    return { remainingHours, weeklyPaceHours: recentWeeklyAverageHours, weeksRemaining: null, projectedDate: null };
  }

  const weeksRemaining = remainingHours / recentWeeklyAverageHours;
  const projected = new Date();
  projected.setDate(projected.getDate() + Math.ceil(weeksRemaining * 7));

  return {
    remainingHours,
    weeklyPaceHours: recentWeeklyAverageHours,
    weeksRemaining,
    projectedDate: projected.toISOString().slice(0, 10),
  };
}

/** Trailing N-week average from weeklyBreakdown's chronological output (most recent last). */
export function recentWeeklyAverage(weeks: { weekStart: string; hours: number }[], windowSize = 4): number {
  if (weeks.length === 0) return 0;
  const recent = weeks.slice(-windowSize);
  return recent.reduce((sum, w) => sum + w.hours, 0) / recent.length;
}

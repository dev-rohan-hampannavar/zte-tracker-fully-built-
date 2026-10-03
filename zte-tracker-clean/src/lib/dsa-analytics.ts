/**
 * Phase 3 — DSA Intelligence analytics. Pure functions over
 * DsaProgressRow[] — no new fetching, reuses whatever useDsaProgress
 * already loaded. Every metric here only counts rows that actually have
 * the relevant field set, so a person who hasn't started logging
 * attempts/time/confidence yet gets an honest "not enough data" rather
 * than a fabricated number computed from defaults.
 */

import type { DsaProgressRow, Difficulty } from "@/types/database";
import { isOverdue } from "@/lib/revision-schedule";

export interface PatternAccuracy {
  pattern: string;
  solved: number;
  total: number;
  accuracyPct: number; // solved / total among logged attempts for this pattern
  avgAttempts: number | null;
}

/** Weakest patterns by accuracy — mirrors the existing weak-areas logic
 * in dsa/page.tsx (min problem count so a single data point doesn't look
 * like a trend) but keyed on the new `pattern` field rather than
 * `topic_tag`, since pattern is the field meant to carry the algorithmic
 * technique the spec asks about. Falls back to topic_tag for rows with
 * no pattern set, so older/simpler logging still contributes. */
export function weakestPatterns(rows: DsaProgressRow[], minProblems = 3): PatternAccuracy[] {
  const groups = new Map<string, DsaProgressRow[]>();
  for (const r of rows) {
    const key = (r.pattern || r.topic_tag)?.trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries())
    .filter(([, rs]) => rs.length >= minProblems)
    .map(([key, rs]) => {
      const solved = rs.filter((r) => r.completed).length;
      const withAttempts = rs.filter((r) => r.attempts > 0);
      return {
        pattern: (rs[0].pattern || rs[0].topic_tag || key).trim(),
        solved,
        total: rs.length,
        accuracyPct: Math.round((solved / rs.length) * 100),
        avgAttempts:
          withAttempts.length === 0
            ? null
            : Math.round((withAttempts.reduce((s, r) => s + r.attempts, 0) / withAttempts.length) * 10) / 10,
      };
    })
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 5);
}

/** Accuracy by difficulty — solved / attempted, only over problems that
 * have actually been attempted (completed OR logged with attempts > 1),
 * so an untouched "someday" backlog item doesn't count against accuracy. */
export function accuracyByDifficulty(rows: DsaProgressRow[]): Record<Difficulty, { solved: number; attempted: number; pct: number | null }> {
  const result = {
    easy: { solved: 0, attempted: 0, pct: null as number | null },
    medium: { solved: 0, attempted: 0, pct: null as number | null },
    hard: { solved: 0, attempted: 0, pct: null as number | null },
  };
  for (const r of rows) {
    const attempted = r.completed || r.attempts > 1;
    if (!attempted) continue;
    result[r.difficulty].attempted += 1;
    if (r.completed) result[r.difficulty].solved += 1;
  }
  for (const d of Object.keys(result) as Difficulty[]) {
    result[d].pct = result[d].attempted > 0 ? Math.round((result[d].solved / result[d].attempted) * 100) : null;
  }
  return result;
}

/** Average solve time, only among solved problems with time actually
 * logged — nothing estimated or defaulted. */
export function averageSolveTimeMinutes(rows: DsaProgressRow[]): number | null {
  const timed = rows.filter((r) => r.completed && r.time_taken_minutes != null && r.time_taken_minutes > 0);
  if (timed.length === 0) return null;
  return Math.round(timed.reduce((s, r) => s + (r.time_taken_minutes ?? 0), 0) / timed.length);
}

/** Most common recorded mistakes — free text, so this just surfaces the
 * most recent distinct entries rather than trying to cluster/categorize
 * free-form text into buckets (which would mean inventing a taxonomy the
 * schema deliberately avoided — see the migration's own comment on why
 * `mistakes` stays free text). */
export function recentMistakes(rows: DsaProgressRow[], limit = 5): { problem: string; mistake: string }[] {
  return rows
    .filter((r) => r.mistakes && r.mistakes.trim())
    .sort((a, b) => (a.completed_at ?? a.created_at) < (b.completed_at ?? b.created_at) ? 1 : -1)
    .slice(0, limit)
    .map((r) => ({ problem: r.problem_name, mistake: r.mistakes! }));
}

export interface DsaRecommendation {
  row: DsaProgressRow;
  reason: string;
}

/**
 * "What should I practice next" — the spec's explicit ask. Priority
 * order, each a real evidence-based reason rather than a random pick:
 *   1. Overdue for revision (already solved once, due for review)
 *   2. Unsolved problems in the single weakest pattern (lowest accuracy,
 *      enough data to be meaningful)
 *   3. Any other unsolved problem, oldest first (so a backlog doesn't
 *      grow forever with nothing ever getting attention)
 */
export function recommendNextDsaProblems(rows: DsaProgressRow[], limit = 5): DsaRecommendation[] {
  const recs: DsaRecommendation[] = [];

  const overdue = rows
    .filter((r) => r.completed && isOverdue(r.next_review_due))
    .sort((a, b) => (a.next_review_due! < b.next_review_due! ? -1 : 1));
  for (const r of overdue) {
    if (recs.length >= limit) break;
    recs.push({ row: r, reason: "Overdue for revision" });
  }

  if (recs.length < limit) {
    const weak = weakestPatterns(rows)[0];
    if (weak) {
      const unsolvedInWeakest = rows.filter(
        (r) => !r.completed && (r.pattern || r.topic_tag)?.trim().toLowerCase() === weak.pattern.toLowerCase()
      );
      for (const r of unsolvedInWeakest) {
        if (recs.length >= limit) break;
        if (recs.some((x) => x.row.id === r.id)) continue;
        recs.push({ row: r, reason: `Weakest pattern: ${weak.pattern} (${weak.accuracyPct}% solved)` });
      }
    }
  }

  if (recs.length < limit) {
    const unsolved = rows
      .filter((r) => !r.completed && !recs.some((x) => x.row.id === r.id))
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    for (const r of unsolved) {
      if (recs.length >= limit) break;
      recs.push({ row: r, reason: "In your backlog" });
    }
  }

  return recs;
}

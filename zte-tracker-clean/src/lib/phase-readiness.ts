/**
 * Phase 2 of the "Engineering Career Operating System" expansion:
 * Roadmap Intelligence — phase readiness score.
 *
 * A pure function over data every other feature already loads
 * (usePhasesWithProgress's PhaseWithTopics), following the same
 * convention as daily-planner.ts and topic-prerequisites.ts — no new
 * table, no separate "readiness" data source that could drift out of
 * sync with what /roadmap and /dependency-graph already show.
 *
 * The spec explicitly warns against "meaningless percentages." This
 * avoids that by never inventing a signal: every input is either a
 * boolean (prerequisite done) or a real evidence count/ratio already
 * computed elsewhere in the app (topic completion, revision_status,
 * actual_minutes_spent vs. estimated_hours). If a phase has zero topics
 * with revision_status set, the confidence component is simply excluded
 * from the score rather than treated as 0 — "no data yet" is not the
 * same as "not confident," and conflating the two is exactly the kind of
 * fabricated precision the spec calls out.
 */

import type { PhaseWithTopics } from "@/types/database";

export interface PhaseReadiness {
  phaseId: string;
  // 0-100, or null if the phase has no topics at all to score.
  score: number | null;
  // Individual components, each 0-100 or null if that signal has no data
  // yet for this phase — surfaced separately so the UI can show *why* a
  // score is what it is, not just the number.
  components: {
    prerequisiteComplete: boolean; // is the previous phase (by order_index) done?
    topicCompletionPct: number; // real, from progress — never estimated
    revisionConfidencePct: number | null; // % of completed topics whose revision_status is 'comfortable' or 'mastered', among topics that HAVE a revision_status set
    timeAccuracyPct: number | null; // how closely actual_minutes_spent tracked estimated_hours for completed topics, capped at 100 (finishing early doesn't get penalized, only wildly over)
  };
  readyToAdvance: boolean; // true once topic completion is 100% AND the prerequisite phase is done
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Computes readiness for every phase in order, so each phase's
 * prerequisiteComplete can reference the phase immediately before it by
 * order_index — mirrors the existing phase-level lock logic in
 * roadmap/page.tsx (which this deliberately does not duplicate the UI
 * copy of, only the underlying "is the previous phase done" check).
 */
export function computePhaseReadiness(phases: PhaseWithTopics[]): Map<string, PhaseReadiness> {
  const ordered = [...phases].sort((a, b) => a.order_index - b.order_index);
  const result = new Map<string, PhaseReadiness>();

  ordered.forEach((phase, i) => {
    const topics = phase.topics;
    if (topics.length === 0) {
      result.set(phase.id, {
        phaseId: phase.id,
        score: null,
        components: { prerequisiteComplete: i === 0, topicCompletionPct: 0, revisionConfidencePct: null, timeAccuracyPct: null },
        readyToAdvance: false,
      });
      return;
    }

    const completedTopics = topics.filter((t) => t.progress?.completed);
    const topicCompletionPct = Math.round((completedTopics.length / topics.length) * 100);

    const prevPhase = i > 0 ? ordered[i - 1] : null;
    const prerequisiteComplete =
      !prevPhase || prevPhase.topics.length === 0 || prevPhase.topics.every((t) => t.progress?.completed);

    const topicsWithRevisionStatus = completedTopics.filter((t) => t.progress?.revision_status);
    const revisionConfidencePct =
      topicsWithRevisionStatus.length === 0
        ? null
        : Math.round(
            (topicsWithRevisionStatus.filter((t) => t.progress?.revision_status !== "needs_revision").length /
              topicsWithRevisionStatus.length) *
              100
          );

    const topicsWithTimeData = completedTopics.filter(
      (t) => t.estimated_hours && t.estimated_hours > 0 && (t.progress?.actual_minutes_spent ?? 0) > 0
    );
    const timeAccuracyPct =
      topicsWithTimeData.length === 0
        ? null
        : Math.round(
            topicsWithTimeData.reduce((sum, t) => {
              const estimatedMinutes = t.estimated_hours! * 60;
              const actual = t.progress!.actual_minutes_spent;
              // 100 if actual <= estimated (finished at or under estimate);
              // scales down as actual overshoots the estimate, floored at 0.
              const ratio = actual <= estimatedMinutes ? 100 : clamp(100 - ((actual - estimatedMinutes) / estimatedMinutes) * 100, 0, 100);
              return sum + ratio;
            }, 0) / topicsWithTimeData.length
          );

    // Weighted blend of whichever components have real data. Topic
    // completion always counts (it's the one signal every phase has).
    // Confidence and time-accuracy only count in when there's evidence —
    // their weight is redistributed onto completion when absent, rather
    // than silently treating missing data as a zero.
    const weights: { value: number; weight: number }[] = [{ value: topicCompletionPct, weight: 0.6 }];
    if (revisionConfidencePct !== null) weights.push({ value: revisionConfidencePct, weight: 0.25 });
    if (timeAccuracyPct !== null) weights.push({ value: timeAccuracyPct, weight: 0.15 });
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    const blended = weights.reduce((s, w) => s + (w.value * w.weight) / totalWeight, 0);
    const score = prerequisiteComplete ? Math.round(blended) : Math.round(blended * 0.5); // a phase attempted out of order is real risk, not just a lower number for no reason — halved, not zeroed, since work done is still work done

    result.set(phase.id, {
      phaseId: phase.id,
      score,
      components: { prerequisiteComplete, topicCompletionPct, revisionConfidencePct, timeAccuracyPct },
      readyToAdvance: topicCompletionPct === 100 && prerequisiteComplete,
    });
  });

  return result;
}

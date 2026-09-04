/**
 * Stage 3 — Item 34: Prerequisite Locking — topic level.
 *
 * Only phase-level locking existed before this (isPhaseLocked in
 * roadmap/page.tsx, gated on 50% of the previous phase's topics). This adds
 * a second, finer-grained lock: within a stage, topic N requires topic N-1
 * to be complete first.
 *
 * This is not a fabricated field — it mirrors the roadmap's own stated
 * dependency-first design, which shows up throughout stage `description`
 * text (e.g. "Requires the cascade/@layer understanding from Stage 1").
 * order_index within a stage already encodes the intended sequence, so the
 * prerequisite chain is *derived* from it at read time rather than stored
 * as a second column that could drift out of sync with order_index.
 *
 * Scope: locking is intra-stage only. The first topic of a stage is never
 * locked by this mechanism (its unlock condition is the phase-level lock,
 * handled separately in roadmap/page.tsx) — a topic's only prerequisite is
 * the immediately preceding topic in the same stage. Topics with no
 * stage_id (phases that render topics directly, no stage breakdown) are
 * never topic-locked, consistent with how those phases already skip the
 * Stage Cards / StageBlock UI entirely elsewhere in the app.
 */

import type { TopicWithProgress } from "@/types/database";

export interface TopicLockInfo {
  locked: boolean;
  requiredTitle?: string;
  requiredCompleted?: boolean;
}

/**
 * Given the full flat list of a stage's topics (already sorted or not — this
 * sorts internally by order_index) and the topic in question, determine
 * whether it's locked and, if so, what it requires.
 */
export function isTopicLocked(topic: TopicWithProgress, stageTopics: TopicWithProgress[]): TopicLockInfo {
  if (!topic.stage_id) return { locked: false };

  const ordered = [...stageTopics].sort((a, b) => a.order_index - b.order_index);
  const index = ordered.findIndex((t) => t.id === topic.id);
  if (index <= 0) return { locked: false };

  const prereq = ordered[index - 1];
  const prereqDone = !!prereq.progress?.completed;
  return {
    locked: !prereqDone,
    requiredTitle: prereq.title,
    requiredCompleted: prereqDone,
  };
}

/**
 * Convenience for computing every topic's lock state within a stage at once
 * (avoids re-sorting the stage's topic list once per topic).
 */
export function computeStageTopicLocks(
  stageTopics: TopicWithProgress[]
): Map<string, TopicLockInfo> {
  const ordered = [...stageTopics].sort((a, b) => a.order_index - b.order_index);
  const result = new Map<string, TopicLockInfo>();
  ordered.forEach((topic, index) => {
    if (index === 0) {
      result.set(topic.id, { locked: false });
      return;
    }
    const prereq = ordered[index - 1];
    const prereqDone = !!prereq.progress?.completed;
    result.set(topic.id, {
      locked: !prereqDone,
      requiredTitle: prereq.title,
      requiredCompleted: prereqDone,
    });
  });
  return result;
}

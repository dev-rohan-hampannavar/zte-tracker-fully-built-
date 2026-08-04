import type { TopicProgress } from "@/types/database";

/**
 * Fixed-interval spaced repetition schedule, days after the *previous*
 * review (or after completion, for the 1st review). This is the standard
 * Leitner-style doubling-ish cadence used by most spaced-repetition tools
 * (Anki, SuperMemo) — not something invented for this app. review_count
 * tracks how many reviews have happened; index 0 of this array is the gap
 * before the 1st review, index 1 before the 2nd, index 2 before the 3rd.
 * After the 3rd successful review the topic is considered mastered and
 * drops out of scheduling — matching the roadmap's own three named tiers
 * (needs_revision / comfortable / mastered) instead of inventing a longer
 * or shorter ladder than the source data already implies.
 */
export const REVISION_INTERVAL_DAYS = [1, 3, 7] as const;
export const MASTERY_REVIEW_COUNT = REVISION_INTERVAL_DAYS.length;

export type RevisionTier = "tier_1" | "tier_2" | "tier_3" | "mastered";

export function tierForReviewCount(reviewCount: number): RevisionTier {
  if (reviewCount >= MASTERY_REVIEW_COUNT) return "mastered";
  if (reviewCount === 2) return "tier_3";
  if (reviewCount === 1) return "tier_2";
  return "tier_1";
}

export const TIER_LABEL: Record<RevisionTier, string> = {
  tier_1: "1st review",
  tier_2: "2nd review",
  tier_3: "3rd review",
  mastered: "Mastered",
};

/** Computes the next due date given the review count that will result from marking a review done now. */
export function computeNextReviewDue(newReviewCount: number, from: Date = new Date()): string | null {
  if (newReviewCount >= MASTERY_REVIEW_COUNT) return null; // mastered — no further schedule
  const days = REVISION_INTERVAL_DAYS[newReviewCount];
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

export function isOverdue(nextReviewDue: string | null): boolean {
  if (!nextReviewDue) return false;
  return new Date(nextReviewDue).getTime() < Date.now();
}

export function daysUntil(nextReviewDue: string | null): number | null {
  if (!nextReviewDue) return null;
  const ms = new Date(nextReviewDue).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Marking a topic reviewed: bump review_count, compute the next due date
 * from now, and set revision_status to the closest existing tier so the
 * older needs_revision/comfortable/mastered field — read elsewhere (e.g.
 * Statistics' multi-axis breakdown, P7.2) — stays meaningful. That field
 * only has three values, not one per review tier, so a topic mid-schedule
 * (1st or 2nd review done, more still due) maps to "comfortable" — closer
 * to true than "needs_revision" (which now means "never reviewed since
 * completion") and clearly not yet "mastered".
 */
export function nextReviewPatch(current: Pick<TopicProgress, "review_count">): Partial<TopicProgress> {
  const newCount = Math.min(current.review_count + 1, MASTERY_REVIEW_COUNT);
  const tier = tierForReviewCount(newCount);
  return {
    review_count: newCount,
    last_reviewed: new Date().toISOString(),
    next_review_due: computeNextReviewDue(newCount),
    revision_status: tier === "mastered" ? "mastered" : "comfortable",
  };
}

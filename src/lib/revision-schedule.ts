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
 * Confidence rating given at review time — the spec's "1 Forgot .. 5
 * Mastered" scale. Adjusts the next review interval on top of the base
 * fixed-interval schedule above, rather than replacing it: the 1/3/7-day
 * ladder is still the default pace, but a low rating means the topic
 * genuinely wasn't retained, so it repeats sooner (and drops a tier
 * rather than advancing) instead of blindly moving to the next fixed gap.
 */
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;

export const CONFIDENCE_LABEL: Record<ConfidenceRating, string> = {
  1: "Forgot",
  2: "Weak",
  3: "Okay",
  4: "Strong",
  5: "Mastered",
};

/**
 * Adjusts the review-count delta based on confidence, rather than always
 * advancing by exactly 1 the way the old blind "mark reviewed" did:
 *  - 1 (Forgot): review_count drops back a full tier (min 0) — this
 *    wasn't retained, so treat it like the topic needs its earlier gaps
 *    again, not the next longer one.
 *  - 2 (Weak): review_count stays the same — repeat the same interval
 *    rather than advancing, since retention is shaky.
 *  - 3 (Okay): advances by 1, same as the old blind behavior — the
 *    default, unsurprising case.
 *  - 4 (Strong): advances by 1, but the next interval gets a 1.5x boost
 *    (see intervalMultiplierForRating) since recall was solid.
 *  - 5 (Mastered): jumps straight to MASTERY_REVIEW_COUNT — an explicit
 *    "I know this cold" skips the remaining scheduled reviews entirely,
 *    matching the spec's own "5 — Mastered" label rather than treating
 *    it as just another incremental step.
 */
export function nextReviewCountForRating(currentReviewCount: number, rating: ConfidenceRating): number {
  switch (rating) {
    case 1:
      return Math.max(0, currentReviewCount - 1);
    case 2:
      return currentReviewCount;
    case 3:
      return Math.min(currentReviewCount + 1, MASTERY_REVIEW_COUNT);
    case 4:
      return Math.min(currentReviewCount + 1, MASTERY_REVIEW_COUNT);
    case 5:
      return MASTERY_REVIEW_COUNT;
  }
}

/** Strong recall shortens the *effective* wait before the interval clock
 * even starts feeling due, by stretching the base interval; weak recall
 * compresses it. Applied as a multiplier on top of REVISION_INTERVAL_DAYS
 * rather than a separate table, so the base ladder stays the single
 * source of truth for "what a normal gap looks like." */
function intervalMultiplierForRating(rating: ConfidenceRating): number {
  if (rating <= 2) return 0.5; // struggled — come back sooner than the standard gap
  if (rating === 4) return 1.5; // solid — a bit longer than standard is fine
  return 1; // 3 (Okay) uses the standard interval unmodified
}

/** Computes the next due date the same way computeNextReviewDue does, but
 * scaled by how well the topic was actually recalled this time. Rating 5
 * (Mastered) returns null immediately since nextReviewCountForRating
 * already sends it past MASTERY_REVIEW_COUNT — nothing left to schedule. */
export function computeNextReviewDueForRating(
  newReviewCount: number,
  rating: ConfidenceRating,
  from: Date = new Date()
): string | null {
  if (newReviewCount >= MASTERY_REVIEW_COUNT) return null;
  const baseDays = REVISION_INTERVAL_DAYS[newReviewCount];
  const days = Math.max(1, Math.round(baseDays * intervalMultiplierForRating(rating)));
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

/**
 * Marking a topic reviewed WITH a confidence rating — the evidence-based
 * path the spec asks for. Supersedes the blind nextReviewPatch below for
 * any caller that has a rating; nextReviewPatch is kept only for
 * backward-compatibility with anything still calling it unrated (none of
 * this app's own UI does after this phase, but it stays a valid, simpler
 * fallback rather than being deleted).
 */
export function nextReviewPatchWithRating(
  current: Pick<TopicProgress, "review_count">,
  rating: ConfidenceRating
): Partial<TopicProgress> {
  const newCount = nextReviewCountForRating(current.review_count, rating);
  const tier = tierForReviewCount(newCount);
  return {
    review_count: newCount,
    last_reviewed: new Date().toISOString(),
    next_review_due: computeNextReviewDueForRating(newCount, rating),
    revision_status: tier === "mastered" ? "mastered" : rating <= 2 ? "needs_revision" : "comfortable",
    last_confidence_rating: rating,
  };
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

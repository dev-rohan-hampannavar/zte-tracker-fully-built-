import type { Phase, OnboardingResponses, UserRoadmap } from "@/types/database";

/**
 * PHASE 7 — Roadmap personalization engine.
 *
 * Honest scope note: the master prompt's Phase 7 describes choosing
 * between roadmaps ("Frontend / Backend / Full Stack / etc."), branching,
 * and project sequencing. As of this migration, `roadmaps` (migration
 * 0070) has exactly one row — there is nothing to choose *between* yet;
 * that's Phase 8's job (more public tracks). What this engine does today,
 * matching the master prompt's own worked examples (Example User A vs
 * B: same track, different starting point) is the part of Phase 7 that's
 * actually buildable against one roadmap: given a user's onboarding
 * answers, recommend where in the existing curriculum they should start,
 * rather than forcing every signup through phase-01 regardless of
 * experience.
 *
 * Deliberately deterministic, not AI-generated: the master prompt's own
 * Phase 11 instruction ("do not use arbitrary AI-generated recommendations
 * where deterministic rules are sufficient") applies here too — this is a
 * fixed function of (experience_level, existing_skills) over the existing
 * phases/technologies data, not a model call. A user can always start
 * earlier than the recommendation via the "start from the beginning"
 * override the UI should expose (not built into this function — a
 * recommendation is not a forced restriction, per the same worked
 * examples: "users can skip prerequisites if they choose").
 */

/**
 * Maps onboarding's dsa_level to per-user DSA targets, overriding the
 * global roadmap_metadata.dsa_easy_target/dsa_medium_target default
 * (75/50) for users who self-report less DSA experience. Numeric mapping
 * confirmed with the product owner rather than invented: the existing
 * global default (75/50) IS the "advanced" tier, not a separate number
 * layered on top of it.
 *
 * Returns null for both fields when dsa_level is null/undefined/"none" —
 * "none" maps to the beginner target, not to "no override" (a user who
 * said they have no DSA experience should get the beginner target, not
 * silently fall back to the full 75/50 default). Only a genuinely absent
 * answer (null/undefined — onboarding wasn't completed with this
 * question answered) returns null, matching user_roadmaps.dsa_easy_target's
 * own documented null semantics ("no override recorded" — migration 0075).
 */
export function dsaTargetsForLevel(
  dsaLevel: OnboardingResponses["dsa_level"]
): { dsaEasyTarget: number | null; dsaMediumTarget: number | null } {
  switch (dsaLevel) {
    case "none":
    case "beginner":
      return { dsaEasyTarget: 40, dsaMediumTarget: 20 };
    case "intermediate":
      return { dsaEasyTarget: 60, dsaMediumTarget: 35 };
    case "advanced":
      return { dsaEasyTarget: 75, dsaMediumTarget: 50 };
    default:
      return { dsaEasyTarget: null, dsaMediumTarget: null };
  }
}

export type StartingPointRecommendation = {
  /** The first phase the engine recommends starting at. */
  recommendedStartPhaseId: string;
  /** Phases before the recommended start, for the UI to show as
   * "skipped based on your answers" rather than silently hiding them. */
  skippedPhaseIds: string[];
  /** Plain-language reason, shown to the user so the recommendation is
   * legible rather than a black box — this is the master prompt's Phase
   * 9 "What should I do today?" transparency principle applied to the
   * very first recommendation a user sees. */
  reason: string;
};

const BAND_ORDER = ["Foundation", "Core", "Advanced", "Expert"] as const;
type Band = (typeof BAND_ORDER)[number];

/** Maps onboarding's coarse self-report to a starting band. Intentionally
 * conservative: experience_level alone never skips past "Core" — reaching
 * "Advanced"/"Expert" as a start point requires corroborating signal from
 * existing_skills (below), not a self-report alone, since the master
 * prompt's Phase 11 distinguishes self-declared skill from evidence and
 * this is the same principle applied at onboarding time. */
function bandFromExperienceLevel(level: OnboardingResponses["experience_level"]): Band {
  switch (level) {
    case "beginner":
      return "Foundation";
    case "foundation":
      return "Foundation";
    case "intermediate":
      return "Core";
    case "advanced":
      return "Core"; // see comment above — Advanced/Expert needs skill corroboration
    default:
      return "Foundation";
  }
}

/**
 * If the user's self-reported existing_skills (technology ids from the
 * onboarding UI) cover a meaningful share of a band's requirement — using
 * role_skill_requirements as the "what does this band actually need"
 * signal — bump the starting band forward by one step. Caps at "Advanced"
 * (never auto-starts someone at "Expert" from onboarding alone; that band
 * is reachable through normal progression, not a day-one skip).
 */
function bumpBandForCorroboratedSkills(
  baseBand: Band,
  existingSkills: string[] | null | undefined,
  requiredTechnologyIds: string[]
): { band: Band; corroborated: boolean } {
  if (!existingSkills || existingSkills.length === 0 || requiredTechnologyIds.length === 0) {
    return { band: baseBand, corroborated: false };
  }
  const covered = requiredTechnologyIds.filter((t) => existingSkills.includes(t)).length;
  const coverageRatio = covered / requiredTechnologyIds.length;
  // Threshold chosen deliberately conservative (60%) rather than tuned
  // against real usage data, which doesn't exist yet for a feature that
  // hasn't shipped — this is a starting default the product should
  // revisit once Phase 22's product analytics can show whether
  // recommended-vs-chosen starting points actually diverge in practice.
  if (coverageRatio < 0.6) return { band: baseBand, corroborated: false };

  const currentIndex = BAND_ORDER.indexOf(baseBand);
  const nextIndex = Math.min(currentIndex + 1, BAND_ORDER.indexOf("Advanced"));
  return { band: BAND_ORDER[nextIndex], corroborated: true };
}

/**
 * Core entry point. `phases` should be the full, order_index-sorted list
 * from useRoadmap() — this function does not fetch anything itself, it's
 * a pure function over data the caller already has, so it's trivially
 * testable and never duplicates a query.
 */
export function recommendStartingPoint(
  phases: Phase[],
  onboarding: Pick<OnboardingResponses, "experience_level" | "existing_skills">,
  requiredTechnologyIdsForTargetRole: string[]
): StartingPointRecommendation {
  const sorted = [...phases].sort((a, b) => a.order_index - b.order_index);

  if (sorted.length === 0) {
    // No phases loaded yet (e.g. called before useRoadmap() resolves) —
    // caller's responsibility to not call this until phases exist, but
    // fail into "start at the beginning" rather than throwing, since a
    // recommendation engine erroring out is worse than a conservative
    // default.
    return { recommendedStartPhaseId: "", skippedPhaseIds: [], reason: "No curriculum loaded yet." };
  }

  const baseBand = bandFromExperienceLevel(onboarding.experience_level);
  const { band: targetBand, corroborated } = bumpBandForCorroboratedSkills(
    baseBand,
    onboarding.existing_skills,
    requiredTechnologyIdsForTargetRole
  );

  const targetBandIndex = BAND_ORDER.indexOf(targetBand);
  const firstPhaseAtOrPastBand = sorted.find((p) => {
    const phaseBandIndex = BAND_ORDER.indexOf((p.band ?? "Foundation") as Band);
    return phaseBandIndex >= targetBandIndex;
  });

  // If nothing matches (e.g. every phase is tagged a band earlier than
  // the target — shouldn't happen with the real curriculum, but a
  // recommendation engine should never crash on unexpected data), fall
  // back to the first phase.
  const recommended = firstPhaseAtOrPastBand ?? sorted[0];
  const recommendedIndex = sorted.findIndex((p) => p.id === recommended.id);
  const skipped = sorted.slice(0, Math.max(recommendedIndex, 0)).map((p) => p.id);

  let reason: string;
  if (recommendedIndex === 0) {
    reason = "Starting from the beginning of the curriculum.";
  } else if (corroborated) {
    reason = `Based on your experience level and the skills you already know, you can start at "${recommended.title}".`;
  } else {
    reason = `Based on your experience level, you can start at "${recommended.title}".`;
  }

  return { recommendedStartPhaseId: recommended.id, skippedPhaseIds: skipped, reason };
}

/**
 * Resolves the DSA target a user should actually see: their per-user
 * override (migration 0075, seeded from onboarding's dsa_level) if one
 * was recorded, else the global roadmap_metadata default. Centralized
 * here rather than duplicated across the 6 call sites that read DSA
 * targets, so the fallback rule only has one place to get right.
 */
export function resolveDsaTargets(
  activeRoadmap: Pick<UserRoadmap, "dsa_easy_target" | "dsa_medium_target"> | null | undefined,
  metadata: { dsa_easy_target: number; dsa_medium_target: number } | null | undefined
): { easyTarget: number; mediumTarget: number } {
  return {
    easyTarget: activeRoadmap?.dsa_easy_target ?? metadata?.dsa_easy_target ?? 75,
    mediumTarget: activeRoadmap?.dsa_medium_target ?? metadata?.dsa_medium_target ?? 50,
  };
}

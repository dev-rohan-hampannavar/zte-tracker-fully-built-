import assert from "node:assert/strict";

// Contract-level regression tests for the starting-point recommendation
// logic in src/lib/personalization-engine.ts. Reproduced inline rather
// than imported, matching the existing convention in
// tests/safe-redirect.test.mjs (this suite stays executable without a
// TS/JSX bundler in restricted CI environments) — kept in sync by hand;
// if personalization-engine.ts's band/threshold logic changes, this file
// needs the matching change too.

const BAND_ORDER = ["Foundation", "Core", "Advanced", "Expert"];

function bandFromExperienceLevel(level) {
  switch (level) {
    case "beginner":
      return "Foundation";
    case "foundation":
      return "Foundation";
    case "intermediate":
      return "Core";
    case "advanced":
      return "Core";
    default:
      return "Foundation";
  }
}

function bumpBandForCorroboratedSkills(baseBand, existingSkills, requiredTechnologyIds) {
  if (!existingSkills || existingSkills.length === 0 || requiredTechnologyIds.length === 0) {
    return { band: baseBand, corroborated: false };
  }
  const covered = requiredTechnologyIds.filter((t) => existingSkills.includes(t)).length;
  const coverageRatio = covered / requiredTechnologyIds.length;
  if (coverageRatio < 0.6) return { band: baseBand, corroborated: false };
  const currentIndex = BAND_ORDER.indexOf(baseBand);
  const nextIndex = Math.min(currentIndex + 1, BAND_ORDER.indexOf("Advanced"));
  return { band: BAND_ORDER[nextIndex], corroborated: true };
}

function recommendStartingPoint(phases, onboarding, requiredTechnologyIdsForTargetRole) {
  const sorted = [...phases].sort((a, b) => a.order_index - b.order_index);
  if (sorted.length === 0) {
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
    const phaseBandIndex = BAND_ORDER.indexOf(p.band ?? "Foundation");
    return phaseBandIndex >= targetBandIndex;
  });
  const recommended = firstPhaseAtOrPastBand ?? sorted[0];
  const recommendedIndex = sorted.findIndex((p) => p.id === recommended.id);
  const skipped = sorted.slice(0, Math.max(recommendedIndex, 0)).map((p) => p.id);
  let reason;
  if (recommendedIndex === 0) {
    reason = "Starting from the beginning of the curriculum.";
  } else if (corroborated) {
    reason = `Based on your experience level and the skills you already know, you can start at "${recommended.title}".`;
  } else {
    reason = `Based on your experience level, you can start at "${recommended.title}".`;
  }
  return { recommendedStartPhaseId: recommended.id, skippedPhaseIds: skipped, reason };
}

const PHASES = [
  { id: "phase-01", order_index: 0, band: "Foundation", title: "Foundations" },
  { id: "phase-02", order_index: 1, band: "Foundation", title: "React Core" },
  { id: "phase-04", order_index: 2, band: "Core", title: "State & Data" },
  { id: "phase-08", order_index: 3, band: "Core", title: "DSA" },
  { id: "phase-12", order_index: 4, band: "Advanced", title: "Mid-Senior" },
  { id: "phase-19", order_index: 5, band: "Expert", title: "Complete profile" },
];

// A total beginner with no skills starts at the very first phase.
{
  const rec = recommendStartingPoint(PHASES, { experience_level: "beginner", existing_skills: [] }, []);
  assert.equal(rec.recommendedStartPhaseId, "phase-01");
  assert.deepEqual(rec.skippedPhaseIds, []);
}

// Intermediate experience alone (no corroborating skills) starts at the
// first Core-band phase, skipping only the Foundation phases.
{
  const rec = recommendStartingPoint(PHASES, { experience_level: "intermediate", existing_skills: [] }, []);
  assert.equal(rec.recommendedStartPhaseId, "phase-04");
  assert.deepEqual(rec.skippedPhaseIds, ["phase-01", "phase-02"]);
}

// Advanced self-report alone (no corroboration) is capped at Core, not
// bumped straight to Advanced — self-report alone is conservative.
{
  const rec = recommendStartingPoint(PHASES, { experience_level: "advanced", existing_skills: [] }, []);
  assert.equal(rec.recommendedStartPhaseId, "phase-04");
}

// Advanced self-report WITH corroborating skills (>=60% of the target
// role's required technologies already known) bumps one band forward,
// from Core to Advanced.
{
  const required = ["tech-react", "tech-node", "tech-postgres"];
  const rec = recommendStartingPoint(
    PHASES,
    { experience_level: "advanced", existing_skills: ["tech-react", "tech-node"] }, // 2/3 = 67%
    required
  );
  assert.equal(rec.recommendedStartPhaseId, "phase-12");
  assert.match(rec.reason, /skills you already know/);
}

// Corroboration never bumps past Advanced (Expert is never an onboarding
// day-one starting point, per the engine's own documented cap).
{
  const required = ["tech-react"];
  const rec = recommendStartingPoint(
    PHASES,
    { experience_level: "advanced", existing_skills: ["tech-react"] }, // 1/1 = 100%
    required
  );
  assert.equal(rec.recommendedStartPhaseId, "phase-12"); // Advanced, not Expert
}

// Empty phases list fails safe rather than throwing.
{
  const rec = recommendStartingPoint([], { experience_level: "advanced", existing_skills: [] }, []);
  assert.equal(rec.recommendedStartPhaseId, "");
  assert.deepEqual(rec.skippedPhaseIds, []);
}

// --- dsaTargetsForLevel / resolveDsaTargets ---
// Mapping confirmed with the product owner: beginner 40/20, intermediate
// 60/35, advanced 75/50 (the existing global default IS the advanced tier).

function dsaTargetsForLevel(dsaLevel) {
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

function resolveDsaTargets(activeRoadmap, metadata) {
  return {
    easyTarget: activeRoadmap?.dsa_easy_target ?? metadata?.dsa_easy_target ?? 75,
    mediumTarget: activeRoadmap?.dsa_medium_target ?? metadata?.dsa_medium_target ?? 50,
  };
}

{
  assert.deepEqual(dsaTargetsForLevel("beginner"), { dsaEasyTarget: 40, dsaMediumTarget: 20 });
  assert.deepEqual(dsaTargetsForLevel("none"), { dsaEasyTarget: 40, dsaMediumTarget: 20 }, "'none' maps to beginner target, not null");
  assert.deepEqual(dsaTargetsForLevel("intermediate"), { dsaEasyTarget: 60, dsaMediumTarget: 35 });
  assert.deepEqual(dsaTargetsForLevel("advanced"), { dsaEasyTarget: 75, dsaMediumTarget: 50 });
  assert.deepEqual(dsaTargetsForLevel(null), { dsaEasyTarget: null, dsaMediumTarget: null }, "absent answer stays null, not a guessed default");
}

// resolveDsaTargets: per-user override wins over global metadata.
{
  const result = resolveDsaTargets({ dsa_easy_target: 40, dsa_medium_target: 20 }, { dsa_easy_target: 75, dsa_medium_target: 50 });
  assert.deepEqual(result, { easyTarget: 40, mediumTarget: 20 });
}

// resolveDsaTargets: no override (e.g. pre-Phase-7 enrollment, or the
// owner's account which was never auto-enrolled) falls back to global.
{
  const result = resolveDsaTargets(null, { dsa_easy_target: 75, dsa_medium_target: 50 });
  assert.deepEqual(result, { easyTarget: 75, mediumTarget: 50 });
}

// resolveDsaTargets: neither override nor metadata loaded yet (initial
// SWR loading state) fails safe to the hardcoded 75/50, never to zero.
{
  const result = resolveDsaTargets(null, null);
  assert.deepEqual(result, { easyTarget: 75, mediumTarget: 50 });
}

console.log("personalization engine: 11 checks passed");

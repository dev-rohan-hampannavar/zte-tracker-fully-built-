import type { SkillEvidence, Technology } from "@/types/database";

export interface JobDescriptionSkillMatch {
  technologyId: string;
  technologyName: string;
  knowledgePct: number;
  // Three tiers per the spec ("Strong matches / Moderate matches / Weak
  // matches / Missing skills") rather than a binary covered/gap split.
  // "missing" isn't produced here — a technology with zero evidence still
  // gets matched (knowledgePct 0) if its name is present in the JD text,
  // and is correctly "weak" (they need it and don't have it yet), not a
  // separate untracked category.
  status: "strong" | "moderate" | "weak";
}

export interface JobDescriptionAnalysis {
  matched: JobDescriptionSkillMatch[];
  strong: JobDescriptionSkillMatch[];
  moderate: JobDescriptionSkillMatch[];
  weak: JobDescriptionSkillMatch[];
  // Kept for existing callers built around the old binary split — covered
  // is strong+moderate (anything at or above the coverage threshold),
  // gaps is weak, so nothing that already reads .covered/.gaps breaks.
  covered: JobDescriptionSkillMatch[];
  gaps: JobDescriptionSkillMatch[];
}

function hasTerm(text: string, term: string) {
  const escaped = term.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  // Names such as C++ and Next.js contain punctuation, so a simple
  // word-boundary check would miss them; allow a non-word boundary around
  // the term while still avoiding partial matches inside larger words.
  return new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, "i").test(text);
}

/**
 * Matches only technologies already present in the canonical catalog. This
 * intentionally avoids an opaque keyword/LLM score: every match is
 * inspectable, and coverage comes from the same skill_evidence view used by
 * Job Readiness.
 */
export function analyzeJobDescription(
  description: string,
  technologies: Technology[],
  evidence: SkillEvidence[],
  // Two thresholds, not one: >= strongThreshold is a strong match,
  // >= moderateThreshold but below strong is moderate, below that is weak.
  // Defaults chosen so "moderate" means real-but-partial evidence (some
  // topics done, not most) rather than an arbitrary midpoint.
  strongThreshold = 70,
  moderateThreshold = 35
): JobDescriptionAnalysis {
  const text = description.trim().toLowerCase();
  const evidenceById = new Map(evidence.map((item) => [item.technology_id, item]));
  const matched = technologies
    .filter((technology) => hasTerm(text, technology.name))
    .map((technology) => {
      const knowledgePct = Math.round(evidenceById.get(technology.id)?.knowledge_pct ?? 0);
      const status: JobDescriptionSkillMatch["status"] =
        knowledgePct >= strongThreshold ? "strong" : knowledgePct >= moderateThreshold ? "moderate" : "weak";
      return {
        technologyId: technology.id,
        technologyName: technology.name,
        knowledgePct,
        status,
      } satisfies JobDescriptionSkillMatch;
    })
    .sort((a, b) => a.knowledgePct - b.knowledgePct || a.technologyName.localeCompare(b.technologyName));

  const strong = matched.filter((item) => item.status === "strong");
  const moderate = matched.filter((item) => item.status === "moderate");
  const weak = matched.filter((item) => item.status === "weak");

  return {
    matched,
    strong,
    moderate,
    weak,
    covered: [...strong, ...moderate],
    gaps: weak,
  };
}

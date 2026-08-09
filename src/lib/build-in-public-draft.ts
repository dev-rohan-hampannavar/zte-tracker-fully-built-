import type { PhaseWithTopics, Capstone } from "@/types/database";

/**
 * Builds a copy-paste-ready "just shipped X" draft post from real data —
 * phase name, hours actually put in, topic count, and the capstone project
 * if there is one — combined with the phase's own build_in_public_prompt
 * (a seeded topic/angle suggestion) rather than the prompt alone. The
 * prompt tells you WHAT to talk about; this fills in the specific numbers
 * so there's less blank-page friction between finishing a phase and
 * actually posting about it.
 */
export function generateBuildInPublicDraft(
  phase: PhaseWithTopics,
  capstone: Capstone | null,
  deploymentUrl?: string | null
): string {
  const completedHours = phase.topics.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
  const topicCount = phase.topics.length;

  const lines: string[] = [];

  if (capstone) {
    lines.push(`Just shipped ${capstone.title} — my capstone project for "${phase.title}" 🚀`);
    lines.push("");
    lines.push(capstone.description);
  } else {
    lines.push(`Just wrapped "${phase.title}" — ${topicCount} topics, ~${Math.round(completedHours)}h of focused work.`);
  }

  if (phase.build_in_public_prompt) {
    lines.push("");
    lines.push(phase.build_in_public_prompt);
  }

  if (deploymentUrl) {
    lines.push("");
    lines.push(`Live: ${deploymentUrl}`);
  }

  lines.push("");
  lines.push("#buildinpublic #100daysofcode #webdev");

  return lines.join("\n");
}

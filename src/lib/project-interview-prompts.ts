/**
 * Project-Based Interview Preparation — spec section 32.
 *
 * Deterministic template filling, not AI generation, per the spec's
 * explicit instruction ("Generate deterministic interview prompts from
 * project metadata... Do not use AI generation"). Each template only
 * fires when the project actually HAS the data it needs to be filled in
 * meaningfully — a project with no tradeoffs_notes doesn't get a generic
 * "what trade-offs did you make?" question with nothing to answer from,
 * it just doesn't generate a trade-offs question at all. This mirrors the
 * app's existing discipline (skill_evidence, job-readiness.ts) of never
 * asking something with no real evidence behind it.
 */

import type { ProjectProgress, Technology } from "@/types/database";

export type ProjectInterviewCategory = "architecture" | "backend" | "performance" | "security" | "testing" | "tradeoffs";

export interface GeneratedProjectQuestion {
  category: ProjectInterviewCategory;
  question: string;
  sourceField: string;
}

export interface ProjectForPrompts {
  title: string;
  status: ProjectProgress["status"];
  architecture_notes: string | null;
  contribution_notes: string | null;
  challenges_notes: string | null;
  tradeoffs_notes: string | null;
  metrics_notes: string | null;
  testing_notes: string | null;
  technologies: Technology[];
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function generateProjectInterviewQuestions(project: ProjectForPrompts): GeneratedProjectQuestion[] {
  const questions: GeneratedProjectQuestion[] = [];
  const techNames = project.technologies.map((t) => t.name);

  if (project.architecture_notes) {
    questions.push({
      category: "architecture",
      question: `Walk me through the architecture of "${project.title}". You noted: "${truncate(project.architecture_notes, 140)}" — why did you structure it that way?`,
      sourceField: "architecture_notes",
    });
  } else if (techNames.length > 1) {
    questions.push({
      category: "architecture",
      question: `"${project.title}" uses ${techNames.join(", ")} — how do these pieces fit together?`,
      sourceField: "technologies",
    });
  }

  const backendTechs = project.technologies.filter((t) => t.category === "backend" || t.category === "database");
  if (backendTechs.length > 0) {
    questions.push({
      category: "backend",
      question: `In "${project.title}", how did you design the data model and API layer around ${backendTechs.map((t) => t.name).join(" and ")}?`,
      sourceField: "technologies",
    });
  }

  if (project.metrics_notes) {
    questions.push({
      category: "performance",
      question: `You recorded these metrics for "${project.title}": "${truncate(project.metrics_notes, 140)}" — what was the bottleneck before you got there, and how did you find it?`,
      sourceField: "metrics_notes",
    });
  }

  if (backendTechs.length > 0 || techNames.some((n) => /auth|jwt/i.test(n))) {
    questions.push({
      category: "security",
      question: `What's the biggest security risk in "${project.title}" as it stands today, and what would you fix first?`,
      sourceField: "technologies",
    });
  }

  if (project.testing_notes) {
    questions.push({
      category: "testing",
      question: `For "${project.title}" you noted testing as: "${truncate(project.testing_notes, 140)}" — what's NOT covered, and why did you draw the line there?`,
      sourceField: "testing_notes",
    });
  }

  if (project.tradeoffs_notes) {
    questions.push({
      category: "tradeoffs",
      question: `You wrote about a trade-off in "${project.title}": "${truncate(project.tradeoffs_notes, 140)}" — what would change your mind on that decision?`,
      sourceField: "tradeoffs_notes",
    });
  }

  return questions;
}

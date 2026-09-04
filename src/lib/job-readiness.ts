import type { DsaProgressRow, RoleSkillRequirement, SkillWithFreshnessLike, TargetRole, CareerTrackerRow } from "@/types/database";

/**
 * Job Readiness Score — deliberately a plain, inspectable TypeScript
 * function rather than a single SQL expression. The spec requires the
 * score to be explainable ("never a mysterious arbitrary percentage");
 * a typed function with named intermediate values is much easier to
 * render back to the user as a breakdown (see ReadinessBreakdown type)
 * than reverse-engineering a SQL view's arithmetic would be.
 *
 * Every pillar here is computed from data that already has its own
 * verifiable source:
 *   - skills: role_skill_requirements (curated, weighted) x skill_evidence
 *     (real lesson-completion evidence, extended with project_count)
 *   - dsa: dsa_progress rows against roadmap_metadata's stated targets
 *   - projects: count of projects with any confirmed project_skills link
 *     and non-"not_started" status
 *   - resume: whether the person has actually used the app's own resume
 *     inputs (github_username set, at least one completed/in-progress
 *     project) — NOT a fabricated "95%"; a boolean-ish signal only
 *   - interview: pass rate across completed interview_rounds, when any
 *     exist; null (not 0%) when there's no interview history yet, so a
 *     genuine "no data" state isn't rendered as "you are bad at this"
 */

export interface ReadinessPillar {
  key: string;
  label: string;
  score: number | null; // null = not enough data yet, rendered distinctly from 0
  detail: string;
}

export interface SkillGapDetail {
  technologyId: string;
  name: string;
  pct: number;
  weight: number;
  // Same tiering the readiness score itself uses internally, exposed here
  // so the Career Gap page (spec section 18: Ready / Weak / Missing) can
  // categorize without re-deriving thresholds independently.
  status: "ready" | "weak" | "missing";
}

export interface ReadinessBreakdown {
  roleId: string;
  roleName: string;
  overallPct: number;
  pillars: ReadinessPillar[];
  weakestPillars: ReadinessPillar[];
  recommendedAction: string;
  // Full per-skill breakdown against the selected role's requirements,
  // sorted weakest-first (same ordering skillDetails already used
  // internally for the "Skills" pillar's detail string and the
  // recommendedAction) — previously computed but never returned.
  skillGaps: SkillGapDetail[];
}

interface ComputeReadinessInput {
  role: TargetRole;
  requirements: RoleSkillRequirement[];
  skillEvidence: SkillWithFreshnessLike[];
  dsaProgress: DsaProgressRow[];
  dsaEasyTarget: number | null;
  dsaMediumTarget: number | null;
  githubUsername: string | null;
  projectsWithEvidence: number;
  applications: CareerTrackerRow[];
  interviewPassRate: number | null; // null when no completed rounds exist
}

export function computeJobReadiness(input: ComputeReadinessInput): ReadinessBreakdown {
  const {
    role,
    requirements,
    skillEvidence,
    dsaProgress,
    dsaEasyTarget,
    dsaMediumTarget,
    githubUsername,
    projectsWithEvidence,
    applications,
    interviewPassRate,
  } = input;

  const evidenceByTech = new Map(skillEvidence.map((s) => [s.technology_id, s]));

  // --- Skills pillar: weighted average of knowledge_pct across the
  // role's required technologies. A required skill with zero evidence
  // rows counts as 0%, not skipped — that's the honest state.
  const totalWeight = requirements.reduce((s, r) => s + r.weight, 0);
  const weightedSkillPct =
    totalWeight === 0
      ? null
      : requirements.reduce((sum, r) => {
          const pct = evidenceByTech.get(r.technology_id)?.knowledge_pct ?? 0;
          return sum + pct * r.weight;
        }, 0) / totalWeight;

  const skillDetails: SkillGapDetail[] = requirements
    .map((r) => {
      const pct = evidenceByTech.get(r.technology_id)?.knowledge_pct ?? 0;
      const status: SkillGapDetail["status"] = pct === 0 ? "missing" : pct >= 70 ? "ready" : "weak";
      return {
        technologyId: r.technology_id,
        name: evidenceByTech.get(r.technology_id)?.technology_name ?? r.technology_id,
        pct,
        weight: r.weight,
        status,
      };
    })
    .sort((a, b) => a.pct - b.pct);

  // --- DSA pillar: against the roadmap's own stated targets, when set.
  const dsaCompleted = dsaProgress.filter((d) => d.completed);
  const easyDone = dsaCompleted.filter((d) => d.difficulty === "easy").length;
  const mediumDone = dsaCompleted.filter((d) => d.difficulty === "medium").length;
  const hasTargets = !!dsaEasyTarget && !!dsaMediumTarget && (dsaEasyTarget > 0 || dsaMediumTarget > 0);
  const dsaPct = hasTargets
    ? Math.round(
        100 *
          Math.min(
            1,
            (easyDone + mediumDone) / Math.max(1, (dsaEasyTarget ?? 0) + (dsaMediumTarget ?? 0))
          )
      )
    : dsaProgress.length > 0
      ? Math.min(100, dsaCompleted.length * 2) // no stated target: rough scale, capped
      : null;

  // --- Projects pillar: real projects (in the app's own two project
  // systems) that have at least one confirmed skill link and aren't
  // "not started" — see project_skills / skill_evidence.project_count
  // upstream. projectsWithEvidence is passed in pre-aggregated.
  const projectsPct = projectsWithEvidence === 0 ? 0 : Math.min(100, projectsWithEvidence * 34); // 3 solid projects ~ "portfolio-ready"

  // --- Git/GitHub pillar: presence signal only (real integration lands
  // with the GitHub Integration phase) — a connected username plus at
  // least one project with any evidence is treated as "set up", not a
  // fabricated commit-based score this app can't actually verify yet.
  const gitPct = githubUsername ? (projectsWithEvidence > 0 ? 90 : 60) : 0;

  // --- Resume pillar: same honesty constraint — no fabricated resume
  // quality score. Signals: at least one application has a resume_version
  // recorded (they've actually used the field) and there's real project
  // data to build a resume from.
  const hasResumeVersion = applications.some((a) => !!a.resume_version?.trim());
  const resumePct = hasResumeVersion && projectsWithEvidence > 0 ? 90 : hasResumeVersion || projectsWithEvidence > 0 ? 50 : 0;

  // --- Interview pillar: null (not 0) when there's no data, so the UI
  // can show "not enough interview history yet" instead of a punishing
  // false 0%.
  const interviewPct = interviewPassRate;

  const pillars: ReadinessPillar[] = [
    {
      key: "skills",
      label: "Skills",
      score: weightedSkillPct === null ? null : Math.round(weightedSkillPct),
      detail:
        skillDetails.length > 0
          ? skillDetails.map((s) => `${s.name} ${s.pct}%`).join(" · ")
          : `No required skills configured for ${role.name} in this deployment.`,
    },
    {
      key: "dsa",
      label: "DSA",
      score: dsaPct,
      detail: hasTargets
        ? `${easyDone}/${dsaEasyTarget} easy, ${mediumDone}/${dsaMediumTarget} medium completed`
        : `${dsaCompleted.length} problems completed`,
    },
    {
      key: "projects",
      label: "Projects",
      score: projectsPct,
      detail: `${projectsWithEvidence} project${projectsWithEvidence === 1 ? "" : "s"} with confirmed skill evidence`,
    },
    {
      key: "git",
      label: "Git/GitHub",
      score: gitPct,
      detail: githubUsername ? `Connected as ${githubUsername}` : "No GitHub username set in Settings",
    },
    {
      key: "resume",
      label: "Resume",
      score: resumePct,
      detail: hasResumeVersion ? "Resume version tracked on at least one application" : "No resume version recorded yet",
    },
    {
      key: "interview",
      label: "Interview",
      score: interviewPct,
      detail:
        interviewPct === null
          ? "No completed interview rounds yet"
          : `${Math.round(interviewPct)}% of completed rounds passed`,
    },
  ];

  const scored = pillars.filter((p) => p.score !== null) as (ReadinessPillar & { score: number })[];
  const overallPct = scored.length === 0 ? 0 : Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length);

  const weakestPillars = [...scored].sort((a, b) => a.score - b.score).slice(0, 3);

  const weakest = weakestPillars[0];
  const recommendedAction = weakest
    ? weakest.key === "skills" && skillDetails[0]
      ? `Focus on ${skillDetails[0].name} — currently ${skillDetails[0].pct}% and the lowest of your required skills.`
      : weakest.key === "dsa"
        ? "Log more DSA problems — this is your weakest readiness pillar right now."
        : weakest.key === "projects"
          ? "Link skills to a project (Projects/Portfolio page) or push one further — projects are your weakest pillar."
          : weakest.key === "interview"
            ? "Log interview round outcomes as they happen so this pillar reflects real performance."
            : `Improve ${weakest.label.toLowerCase()} — it's your weakest readiness pillar.`
    : "Add more evidence across skills, DSA, and projects to get a readiness score.";

  return {
    roleId: role.id,
    roleName: role.name,
    overallPct,
    pillars,
    weakestPillars,
    recommendedAction,
    skillGaps: skillDetails,
  };
}

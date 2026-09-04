/**
 * Career Milestones — spec section 21.
 *
 * Deliberately kept separate from achievements.ts. That file is genuine
 * gamification (streaks, "Century", "Grinder") which the master spec
 * explicitly asks to keep minimal (section 35: no excessive XP systems,
 * no badge spam) — appropriate for celebrating consistency, not for
 * representing real career-readiness gates. Section 21's list is a
 * different kind of thing entirely: "Foundation complete", "Resume
 * ready", "Readiness target reached" are checkpoints someone would
 * actually use to decide whether they're ready to start applying, not
 * collectibles. Mixing the two into one system would blur a distinction
 * the spec itself draws.
 *
 * Every threshold below is a stated default, not a fabricated precise
 * number — 70% is the same "ready" threshold job-readiness.ts and
 * job-description-analysis.ts already use elsewhere, so a person hitting
 * "Readiness target reached" here is consistent with what /job-readiness
 * and /career-gap would call ready. Nothing here invents a number that
 * doesn't already mean something elsewhere in the app.
 */

export interface MilestoneInput {
  phasesCompleted: number;
  totalPhases: number;
  projectsShipped: number; // deployed, not just marked complete
  dsaCompleted: number;
  overallReadinessPct: number | null; // from computeJobReadiness for the user's primary target role, null if no role selected/no requirements configured
  // Resume readiness has to come from something persisted. The /resume
  // page's bullet selection lives in local component state only — it
  // resets on every reload, so reporting a milestone from it would flip
  // "reached" on and off across sessions for no real reason. Whether the
  // person has actually used a resume version on a real application
  // (career_tracker.resume_version) is real, persisted signal that they
  // consider some version of their resume usable, not just drafted.
  hasUsedResumeVersion: boolean;
  applicationsSubmitted: number;
  mockInterviewAttempts: number;
  offersReceived: number;
}

export interface CareerMilestone {
  id: string;
  label: string;
  description: string;
  reached: boolean;
  // What it would take to reach this, shown so a not-yet-reached
  // milestone still explains itself instead of just sitting there locked
  // — same "empty states should explain what to do next" rule (section
  // 38) applied to a locked, not empty, state.
  progressLabel: string;
}

const DSA_TARGET = 100; // matches achievements.ts's "Century" threshold — not a new arbitrary number
const APPLICATION_TARGET = 20;
const MOCK_INTERVIEW_TARGET = 15;
const READINESS_TARGET_PCT = 70; // same threshold used as "ready" throughout job-readiness.ts/job-description-analysis.ts

export function computeCareerMilestones(input: MilestoneInput): CareerMilestone[] {
  const foundationPct = input.totalPhases > 0 ? input.phasesCompleted / input.totalPhases : 0;
  const foundationReached = input.totalPhases > 0 && foundationPct >= 0.25;

  const milestones: CareerMilestone[] = [
    {
      id: "foundation-complete",
      label: "Foundation complete",
      description: "At least 25% of the curriculum's phases finished",
      reached: foundationReached,
      progressLabel: `${input.phasesCompleted}/${input.totalPhases} phases`,
    },
    {
      id: "first-shipped-project",
      label: "First production project shipped",
      description: "A completed project with a live deployment or repo",
      reached: input.projectsShipped >= 1,
      progressLabel: `${input.projectsShipped} shipped`,
    },
    {
      id: "dsa-target",
      label: "DSA target reached",
      description: `${DSA_TARGET}+ problems solved`,
      reached: input.dsaCompleted >= DSA_TARGET,
      progressLabel: `${input.dsaCompleted}/${DSA_TARGET}`,
    },
    {
      id: "readiness-target",
      label: "Readiness target reached",
      description: `${READINESS_TARGET_PCT}%+ overall readiness for your target role`,
      reached: (input.overallReadinessPct ?? 0) >= READINESS_TARGET_PCT,
      progressLabel:
        input.overallReadinessPct === null ? "No target role selected yet" : `${Math.round(input.overallReadinessPct)}%`,
    },
    {
      id: "resume-ready",
      label: "Resume ready",
      description: "A resume version has been used on at least one real application",
      reached: input.hasUsedResumeVersion,
      progressLabel: input.hasUsedResumeVersion ? "Ready" : "Not started",
    },
    {
      id: "application-target",
      label: "Application target reached",
      description: `${APPLICATION_TARGET}+ applications submitted`,
      reached: input.applicationsSubmitted >= APPLICATION_TARGET,
      progressLabel: `${input.applicationsSubmitted}/${APPLICATION_TARGET}`,
    },
    {
      id: "mock-interview-target",
      label: "Mock interview target reached",
      description: `${MOCK_INTERVIEW_TARGET}+ interview practice attempts logged`,
      reached: input.mockInterviewAttempts >= MOCK_INTERVIEW_TARGET,
      progressLabel: `${input.mockInterviewAttempts}/${MOCK_INTERVIEW_TARGET}`,
    },
    {
      id: "offer-received",
      label: "Offer received",
      description: "At least one job offer",
      reached: input.offersReceived >= 1,
      progressLabel: input.offersReceived >= 1 ? `${input.offersReceived} offer(s)` : "None yet",
    },
  ];

  return milestones;
}

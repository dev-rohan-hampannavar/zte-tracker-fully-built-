export type CareerPlanTrack = "plan_a" | "sap" | "ba_pm" | "ops";

export type PlanTone = "blue" | "green" | "purple" | "amber";

export interface PlanPath {
  id: CareerPlanTrack;
  eyebrow: string;
  title: string;
  summary: string;
  tone: PlanTone;
  ceiling: string;
  ceilingLpa: number;
  actions: string[];
}

export interface PlanWindow {
  id: string;
  months: string;
  title: string;
  why: string;
  done: string;
  phaseHint: string;
}

export interface SalaryReference {
  track: CareerPlanTrack;
  label: string;
  /** Exit code key into EXIT_HOURS_REQUIRED. Null for non-plan_a tracks. */
  exitCode: string | null;
  range: string;
  evidence: string;
}

export const FULL_PLAN = {
  version: "2026-08-canonical",
  title: "The 24-month operating plan",
  subtitle:
    "Keep the Business Operations income, build engineering leverage in the evenings, and let evidence—not motivation—decide the next move.",
  deadlineMonths: 24,
  defaultWeeklyHours: 40,
  flagshipProject: "ClientSync",
  applicationWindow: "Months 7–8",
  decisionGate: "Month 24",
} as const;

export const PLAN_PATHS: PlanPath[] = [
  {
    id: "plan_a",
    eyebrow: "Plan A · primary",
    title: "Transition to SDE-1 (ZTE full-stack)",
    summary: "The core Zero to Elite plan: use the job to fund a serious engineering runway — learn, ship ClientSync, apply early, and improve from market feedback.",
    tone: "green",
    ceiling: "₹35–50L",
    ceilingLpa: 50,
    actions: [
      "Run the roadmap at a sustainable target, mostly nights and weekends.",
      "Ship one deployed flagship project instead of collecting half-finished demos.",
      "Start applications at the first credible exit; do not wait for perfection.",
    ],
  },
  {
    id: "sap",
    eyebrow: "Plan B · fork",
    title: "SAP SD/MM consultant",
    summary: "Build SD/MM exposure on the job now, then invest in certification — the hard gate that unlocks staffing-payroll consulting roles.",
    tone: "purple",
    ceiling: "₹35–45L",
    ceilingLpa: 45,
    actions: [
      "Shadow SD/MM transactions in the current ops role and log every transaction code touched.",
      "Budget ₹40–80k for SD/MM (or S/4HANA) certification — non-negotiable before Year 2.",
      "Target staffing-payroll seats at Deloitte, Accenture, TCS, or IBM once certified.",
    ],
  },
  {
    id: "ba_pm",
    eyebrow: "Plan B · fork",
    title: "BA → Product Manager",
    summary: "Turn stakeholder comms and process documentation into a PM career — the highest 10-year ceiling of the four tracks, but the least mechanical path.",
    tone: "amber",
    ceiling: "₹50–80L",
    ceilingLpa: 80,
    actions: [
      "Write lightweight PRDs for internal process changes now, unprompted — build the portfolio early.",
      "Learn SQL for metric self-service; volunteer for cross-functional projects.",
      "Target an APM/PM-associate seat at a Series A/B startup by Year 2–4.",
    ],
  },
  {
    id: "ops",
    eyebrow: "Plan B · fork",
    title: "Ops → Supply Chain leadership",
    summary: "Compound ground-floor execution experience into regional P&L ownership, then national supply-chain strategy.",
    tone: "blue",
    ceiling: "₹40–70L",
    ceilingLpa: 70,
    actions: [
      "Track your own dispatch/error-rate numbers as the Year 1–2 promotion case.",
      "Build cross-vendor coordination experience toward a senior analyst / SCM seat.",
      "Target regional ops-manager roles (Swiggy/Zomato/Meesho-tier) by Year 4–7.",
    ],
  },
];

export const PLAN_WINDOWS: PlanWindow[] = [
  {
    id: "foundation",
    months: "1–6",
    title: "Foundation",
    why: "Build programming fluency and small, complete projects before chasing impressive architecture.",
    done: "Consistent commits, a basic CRUD app you can explain, and fundamentals that are yours—not copied line by line.",
    phaseHint: "Core programming + first projects",
  },
  {
    id: "backend",
    months: "4–6",
    title: "Backend, databases, and auth",
    why: "Move from writing code to building a system: APIs, data modelling, authentication, and safe user flows.",
    done: "You can explain password handling, data access, and API boundaries and show the implementation in your project.",
    phaseHint: "Backend + persistence",
  },
  {
    id: "ship",
    months: "6–7",
    title: "Ship and start applying",
    why: "A live product and real applications create feedback that tutorials cannot provide.",
    done: "ClientSync (or its successor) is deployed, documented, CI/CD-backed, and your first applications are out.",
    phaseHint: "Flagship project + Exit A/B",
  },
  {
    id: "interviews",
    months: "8–10",
    title: "DSA and interview readiness",
    why: "Pair the ability to build with the ability to reason under interview pressure.",
    done: "You can solve an unfamiliar medium problem aloud in 25–35 minutes and explain complexity clearly.",
    phaseHint: "DSA + interview loops",
  },
  {
    id: "depth",
    months: "11–17",
    title: "Finish the curriculum and close gaps",
    why: "Use interview feedback to target the exact weakness—system design, debugging, communication, or depth.",
    done: "The core curriculum is complete and every rejection has been turned into a specific improvement loop.",
    phaseHint: "Advanced engineering + active interviews",
  },
  {
    id: "buffer",
    months: "18–24",
    title: "Buffer, volume, and the final push",
    why: "Polish proof, increase application volume, and preserve runway for interview cycles instead of starting new fundamentals.",
    done: "The Month-24 checklist is answered in writing and the decision is made on the evidence available.",
    phaseHint: "Applications + final evidence",
  },
];

export const WEEKLY_OPERATING_SYSTEM = [
  { label: "Engineering", target: "40h", detail: "Roadmap study and deliberate practice" },
  { label: "Flagship project", target: "4–8h", detail: "Ship a visible slice every week" },
  { label: "DSA", target: "3–6 sessions", detail: "Practice timed, explainable solutions" },
  { label: "Career evidence", target: "1+ update", detail: "Application, interview, portfolio, or proof" },
] as const;

export const DISCIPLINE_RULES = [
  "The job funds the plan; protect performance and sleep as carefully as study time.",
  "Every week ends with actual-versus-planned numbers and one adjustment.",
  "One flagship project gets the hard stretches; switching projects is not progress.",
  "Applications begin when an exit is credible, not when confidence feels perfect.",
] as const;

export const FAILURE_MODES = [
  { title: "Course hoarding", symptom: "Learning hours rise while shipped work stays flat.", fix: "Close the course and build the smallest independent version." },
  { title: "Project hopping", symptom: "Three or more projects get touched without one reaching a milestone.", fix: "Choose one project and finish a visible slice before switching." },
  { title: "Tutorial dependency", symptom: "Most tagged work follows a tutorial and little is built from a blank file.", fix: "Rebuild the concept without the tutorial open." },
  { title: "Perfectionism", symptom: "Readiness is high but applications remain at zero.", fix: "Send the application; the market is part of the curriculum." },
  { title: "Endless Plan B", symptom: "Month-24 evidence checks are repeatedly deferred.", fix: "Write the decision and the next action on the date you committed to." },
] as const;

export const MONTH_24_CHECKLIST = [
  "A deployed flagship project with a clear README and proof of ownership.",
  "A truthful record of applications, interviews, offers, and recurring weaknesses.",
  "Evidence that the core roadmap and the target exit requirements are complete.",
  "A written GO or NO-GO decision with a concrete next-quarter action.",
  "A protected Plan A fallback with operations tenure and automation wins intact.",
] as const;

/**
 * Canonical cumulative hours required to reach each plan_a exit point.
 * Source: career_tracker.xlsx (Exit Plan sheet) and career_timeline_zte.docx §8.
 * These values are also seeded into exit_ladder.exit_hours_required via
 * migration 0067_career_system_merge.sql.
 */
export const EXIT_HOURS_REQUIRED: Record<string, number> = {
  A:    1235, // Phase 06  — Junior Full-Stack
  A2:   1346, // Phase 06b — Mobile add-on
  B:    1417, // Phase 07  — Junior-to-Mid
  "★1": 1748, // Phase 08  — Interview-ready (DSA)
  C:    1949, // Phase 10  — Mid, production-grade
  "★2": 2113, // Phase 11  — Mid-level
  D:    2320, // Phase 12  — Mid-Senior, AI-capable
  "3":  2943, // Phase 17  — Senior
  E:    3034, // Phase 19  — Complete profile
};

const WEEKS_PER_MONTH = 4.33;

/**
 * Projected months to reach an exit at a given weekly hour pace.
 * Replaces the hardcoded ~N mo strings that assumed 40 h/wk.
 */
export function computeExitMonths(exitCode: string, weeklyHours: number): number | null {
  const hours = EXIT_HOURS_REQUIRED[exitCode];
  if (!hours || weeklyHours <= 0) return null;
  return hours / (weeklyHours * WEEKS_PER_MONTH);
}

/** Human-readable label: "9.5 mo" */
export function computeExitMonthsLabel(exitCode: string, weeklyHours: number): string {
  const months = computeExitMonths(exitCode, weeklyHours);
  if (months === null) return "—";
  return `${months.toFixed(1)} mo`;
}

export const SALARY_REFERENCE: SalaryReference[] = [
  { track: "plan_a", exitCode: "A",    label: "Exit A",   range: "₹6–10 LPA",   evidence: "Junior full-stack, deployed" },
  { track: "plan_a", exitCode: "B",    label: "Exit B",   range: "₹8–12 LPA",   evidence: "API-literate junior-to-mid" },
  { track: "plan_a", exitCode: "★1",   label: "Exit ★1",  range: "₹8–15 LPA",   evidence: "Interview-ready + DSA" },
  { track: "plan_a", exitCode: "C",    label: "Exit C",   range: "₹12–18 LPA",  evidence: "Production-grade + observability" },
  { track: "plan_a", exitCode: "★2",   label: "Exit ★2",  range: "₹15–25 LPA",  evidence: "Real-time + search" },
  { track: "plan_a", exitCode: "D",    label: "Exit D",   range: "₹20–30 LPA",  evidence: "AI-capable mid-senior" },
  { track: "plan_a", exitCode: "3",    label: "Exit 3",   range: "₹25–40 LPA",  evidence: "Senior distributed systems" },
  { track: "plan_a", exitCode: "E",    label: "Exit E",   range: "₹35–50 LPA",  evidence: "Complete profile / founding engineer" },

  { track: "sap", exitCode: null, label: "Now",       range: "₹4.6 LPA",   evidence: "Business ops associate, building SD/MM exposure" },
  { track: "sap", exitCode: null, label: "Year 2–4",  range: "₹6–10 LPA",  evidence: "Junior SAP consultant (Deloitte/Accenture/TCS/IBM)" },
  { track: "sap", exitCode: null, label: "Year 5–7",  range: "₹15–22 LPA", evidence: "Senior consultant, S/4HANA, client ownership" },
  { track: "sap", exitCode: null, label: "Year 8–10", range: "₹25–35 LPA", evidence: "Solution architect / PM, multi-module" },
  { track: "sap", exitCode: null, label: "Year 10+",  range: "₹35–45 LPA", evidence: "Principal / practice lead" },

  { track: "ba_pm", exitCode: null, label: "Now",       range: "₹4–6 LPA",   evidence: "Business analyst" },
  { track: "ba_pm", exitCode: null, label: "Year 2–4",  range: "₹10–18 LPA", evidence: "APM / PM associate, Series A/B" },
  { track: "ba_pm", exitCode: null, label: "Year 4–7",  range: "₹18–30 LPA", evidence: "Product manager, 0→1 builds" },
  { track: "ba_pm", exitCode: null, label: "Year 7–10", range: "₹30–50 LPA", evidence: "Senior / Group PM" },
  { track: "ba_pm", exitCode: null, label: "Year 10+",  range: "₹50–80 LPA", evidence: "Director / VP Product" },

  { track: "ops", exitCode: null, label: "Now",       range: "₹3–5 LPA",   evidence: "Operations executive" },
  { track: "ops", exitCode: null, label: "Year 2–4",  range: "₹8–14 LPA",  evidence: "Senior analyst / SCM" },
  { track: "ops", exitCode: null, label: "Year 4–7",  range: "₹14–22 LPA", evidence: "Operations manager (city/region P&L)" },
  { track: "ops", exitCode: null, label: "Year 7–10", range: "₹22–40 LPA", evidence: "Supply chain director" },
  { track: "ops", exitCode: null, label: "Year 10+",  range: "₹40–70 LPA", evidence: "VP Ops / COO track" },
];

// The ~19-month figure matches career-path-stages.ts's ZTE curriculum
// note ("21 phases · ~19 months") — the core-curriculum timeline the
// plan_a exit-point months below are plotted against, not FULL_PLAN's
// 24-month deadline (which includes buffer beyond the core curriculum).
const ZTE_CORE_CURRICULUM_MONTHS = 19;

export interface NextExitPoint {
  label: string;    // e.g. "Exit ★1"
  range: string;
  approxMonth: number;
}

/**
 * Given overall plan progress (0–100) and the user's weekly study hours,
 * returns the next plan_a exit point not yet reached.
 *
 * @param overallProgressPct - from computePlanPosition().overallProgressPct
 * @param weeklyHours        - from user_settings.career_plan_weekly_hours
 *                             Defaults to 40 for backward compatibility but
 *                             should always be passed explicitly.
 */
export function nextExitPoint(
  overallProgressPct: number,
  weeklyHours: number = 40
): NextExitPoint | null {
  const estimatedMonth = (overallProgressPct / 100) * ZTE_CORE_CURRICULUM_MONTHS;
  const exitRows = SALARY_REFERENCE.filter((r) => r.track === "plan_a" && r.exitCode);

  for (const row of exitRows) {
    const months = computeExitMonths(row.exitCode!, weeklyHours);
    if (months === null) continue;
    if (months > estimatedMonth) {
      return { label: row.label, range: row.range, approxMonth: months };
    }
  }
  return null;
}

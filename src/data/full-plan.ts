export type CareerPlanTrack = "plan_a" | "plan_b";

export interface PlanPath {
  id: CareerPlanTrack;
  eyebrow: string;
  title: string;
  summary: string;
  tone: "blue" | "green";
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
    eyebrow: "Plan A · stability",
    title: "Stay and climb in Operations",
    summary: "Protect the paycheck, automate the day job, and build toward Analyst/BI ownership or an internal move.",
    tone: "blue",
    actions: [
      "Automate repeatable work with Excel, SQL, and scripts.",
      "Collect measurable outcomes that strengthen the internal promotion case.",
      "Review an internal Analyst/BI move around months 12–18.",
    ],
  },
  {
    id: "plan_b",
    eyebrow: "Plan B · active sprint",
    title: "Transition to SDE-1",
    summary: "Use the job to fund a serious engineering runway: learn, ship ClientSync, apply early, and improve from market feedback.",
    tone: "green",
    actions: [
      "Run the roadmap at a sustainable target, mostly nights and weekends.",
      "Ship one deployed flagship project instead of collecting half-finished demos.",
      "Start applications at the first credible exit; do not wait for perfection.",
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

export const SALARY_REFERENCE: SalaryReference[] = [
  { track: "plan_a", label: "Entry · 0–2 yrs", range: "₹4.0–5.5 LPA", evidence: "Business Ops Associate / Analyst I" },
  { track: "plan_a", label: "Early · 2–4 yrs", range: "₹6.0–8.5 LPA", evidence: "Operations Analyst II + SQL/data skills" },
  { track: "plan_a", label: "Mid · 4–7 yrs", range: "₹8.0–12.5 LPA", evidence: "Senior Analyst / Specialist" },
  { track: "plan_a", label: "Experienced · 7+ yrs", range: "₹11.4–20 LPA", evidence: "Lead / Manager track" },
  { track: "plan_b", label: "Exit A · ~7 mo", range: "₹6–10 LPA", evidence: "Junior full-stack, deployed" },
  { track: "plan_b", label: "Exit B · ~7.5 mo", range: "₹8–12 LPA", evidence: "API-literate junior-to-mid" },
  { track: "plan_b", label: "Exit ★1 · ~9.5 mo", range: "₹8–15 LPA", evidence: "Interview-ready + DSA" },
  { track: "plan_b", label: "Exit C · ~10.6 mo", range: "₹12–18 LPA", evidence: "Production-grade + observability" },
  { track: "plan_b", label: "Exit ★2 · ~11.6 mo", range: "₹15–25 LPA", evidence: "Real-time + search" },
  { track: "plan_b", label: "Exit D · ~12.8 mo", range: "₹20–30 LPA", evidence: "AI-capable mid-senior" },
  { track: "plan_b", label: "Exit 3 · ~16.4 mo", range: "₹25–40 LPA", evidence: "Senior distributed systems" },
  { track: "plan_b", label: "Exit E · ~16.9 mo", range: "₹35–50 LPA", evidence: "Complete profile / founding engineer" },
];

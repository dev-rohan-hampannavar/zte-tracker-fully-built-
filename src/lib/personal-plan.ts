// Deterministic personal plan for shared-workspace users. It turns what a
// person told us in onboarding (goal, role, level, weekly hours, target date,
// DSA level, interview readiness, situation) plus their live progress into a
// plan written in the first person of *their* journey. No owner data, no
// hardcoded people, employers, salaries or projects: everything is derived
// from the inputs.

export type PlanPace = "on_track" | "tight" | "behind" | "no_target" | "no_data";

export interface PersonalPlanInput {
  firstName?: string | null;
  roleName?: string | null;
  goal?: string | null;
  goalOther?: string | null;
  experience?: string | null;
  weeklyHours?: number | null;
  targetDate?: string | null; // YYYY-MM-DD
  dsaLevel?: string | null;
  interviewReadiness?: string | null;
  careerSituation?: string | null;
  remainingHours?: number | null;
  completedTopics?: number | null;
  totalTopics?: number | null;
  nextTopicTitle?: string | null;
  today?: string; // YYYY-MM-DD, injectable for tests
}

export interface PlanCheckpoint {
  label: string;
  date: string; // YYYY-MM-DD
  targetPercent: number;
}

export interface RhythmBlock {
  id: "learn" | "practice" | "build" | "review";
  label: string;
  hours: number;
  what: string;
}

export interface PersonalPlan {
  rhythm: RhythmBlock[];
  headline: string;
  subhead: string;
  pace: PlanPace;
  paceMessage: string;
  weeksLeft: number | null;
  neededWeeklyHours: number | null;
  percentDone: number | null;
  checkpoints: PlanCheckpoint[];
  nextActions: string[];
}

const GOAL_HEADLINES: Record<string, string> = {
  first_job: "land your first developer job",
  get_better: "become a stronger developer",
  interview_prep: "get interview-ready",
  build_projects: "build projects you can show",
  career_switch: "switch into tech",
  upskill: "level up your skills",
};

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/**
 * Splits weekly study hours into learn / practice / build / review blocks,
 * weighted by the person's goal and DSA level. Hours are rounded to halves and
 * always sum to the weekly total.
 */
export function weeklyRhythm(weeklyHours: number, goal?: string | null, dsaLevel?: string | null): RhythmBlock[] {
  if (!(weeklyHours > 0)) return [];
  let split = { learn: 45, practice: 20, build: 25, review: 10 };
  if (goal === "interview_prep") split = { learn: 30, practice: 35, build: 15, review: 20 };
  else if (goal === "build_projects") split = { learn: 35, practice: 10, build: 40, review: 15 };
  else if (goal === "get_better" || goal === "upskill") split = { learn: 40, practice: 15, build: 35, review: 10 };
  if (dsaLevel === "none" || dsaLevel === "beginner") {
    split = { ...split, practice: split.practice + 5, learn: split.learn - 5 };
  }
  const half = (x: number) => Math.round(x * 2) / 2;
  const practice = half((weeklyHours * split.practice) / 100);
  const build = half((weeklyHours * split.build) / 100);
  const review = half((weeklyHours * split.review) / 100);
  const learn = Math.max(0, Math.round((weeklyHours - practice - build - review) * 2) / 2);
  return [
    { id: "learn", label: "Learn", hours: learn, what: "Work through the next roadmap topics. Read, watch, then close the tab and rebuild it from memory." },
    { id: "practice", label: "Practise", hours: practice, what: "Exercises and problems on what you just learned. Short, focused, timed." },
    { id: "build", label: "Build", hours: build, what: "Move your own project forward. Ship something small every week." },
    { id: "review", label: "Review", hours: review, what: "Revisit last week's notes and mistakes, and do one mock explanation out loud." },
  ];
}

export function buildPersonalPlan(input: PersonalPlanInput): PersonalPlan {
  const today = input.today ?? toIso(new Date());
  const name = input.firstName?.trim();
  const role = input.roleName?.trim();
  const goalText =
    input.goal === "other" && input.goalOther?.trim()
      ? input.goalOther.trim().replace(/[.!]+$/, "")
      : GOAL_HEADLINES[input.goal ?? ""] ?? "reach your goal";

  const headline = role
    ? `${name ? `${name}, your` : "Your"} path to ${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}`
    : `${name ? `${name}, your` : "Your"} plan to ${goalText}`;

  const total = input.totalTopics ?? 0;
  const done = input.completedTopics ?? 0;
  const percentDone = total > 0 ? Math.round((done / total) * 100) : null;

  const weekly = input.weeklyHours && input.weeklyHours > 0 ? input.weeklyHours : null;
  const remaining = input.remainingHours != null && input.remainingHours >= 0 ? input.remainingHours : null;

  let weeksLeft: number | null = null;
  let neededWeeklyHours: number | null = null;
  let pace: PlanPace = "no_target";
  let paceMessage = "Pick a target date in Settings and I'll pace your plan against it.";

  if (input.targetDate) {
    const days = Math.round((parseIso(input.targetDate).getTime() - parseIso(today).getTime()) / 86400000);
    if (days <= 0) {
      pace = "behind";
      weeksLeft = 0;
      paceMessage = "Your target date has passed. Move it out in Settings so the plan reflects reality.";
    } else {
      weeksLeft = Math.max(1, Math.ceil(days / 7));
      if (remaining == null || weekly == null) {
        pace = "no_data";
        paceMessage = `${weeksLeft} week${weeksLeft === 1 ? "" : "s"} until your target date.`;
      } else {
        neededWeeklyHours = Math.round((remaining / weeksLeft) * 10) / 10;
        if (neededWeeklyHours <= weekly) {
          pace = "on_track";
          paceMessage = `Studying ${weekly}h a week gets you there with room to spare (you need about ${neededWeeklyHours}h).`;
        } else if (neededWeeklyHours <= weekly * 1.25) {
          pace = "tight";
          paceMessage = `You need about ${neededWeeklyHours}h a week and you planned ${weekly}h. A small bump keeps the date realistic.`;
        } else {
          pace = "behind";
          paceMessage = `You need about ${neededWeeklyHours}h a week but planned ${weekly}h. Either add hours or move the date out.`;
        }
      }
    }
  }

  const checkpoints: PlanCheckpoint[] = [];
  if (input.targetDate && weeksLeft && weeksLeft > 0) {
    const start = percentDone ?? 0;
    const span = Math.round((parseIso(input.targetDate).getTime() - parseIso(today).getTime()) / 86400000);
    [0.25, 0.5, 0.75, 1].forEach((fraction, i) => {
      checkpoints.push({
        label: i === 3 ? "Target date" : `Checkpoint ${i + 1}`,
        date: i === 3 ? input.targetDate! : addDays(today, Math.round(span * fraction)),
        targetPercent: Math.min(100, Math.round(start + (100 - start) * fraction)),
      });
    });
  }

  const nextActions: string[] = [];
  if (input.nextTopicTitle) nextActions.push(`Start with “${input.nextTopicTitle}”. It's next on your path.`);
  if (weekly) {
    nextActions.push(`Block ${weekly}h in your calendar this week, ideally in sessions of 45–90 minutes.`);
  } else {
    nextActions.push("Set your weekly study hours in Settings so pacing can start.");
  }
  if (input.dsaLevel === "none" || input.dsaLevel === "beginner") {
    nextActions.push("Add two easy DSA problems a week. Small and steady beats cramming later.");
  } else if (input.dsaLevel === "advanced") {
    nextActions.push("Keep DSA warm with one medium problem a week and spend the rest on projects.");
  }
  if (input.interviewReadiness === "none" || input.interviewReadiness === "beginner") {
    nextActions.push("Write a 60-second intro about yourself now. You will refine it as you learn.");
  }
  if (input.goal === "build_projects" || input.goal === "first_job" || input.goal === "career_switch") {
    nextActions.push("Choose one project idea you care about. Every phase should push it forward.");
  }
  if (input.careerSituation === "student" || input.careerSituation === "recent_graduate") {
    nextActions.push("Put your college projects on GitHub with a README each. Recruiters look there first.");
  } else if (input.careerSituation === "career_switcher") {
    nextActions.push("List three skills from your previous work that transfer. They belong in your story.");
  }

  const levelNote =
    input.experience === "beginner" || input.experience === "foundation"
      ? "Starting from the fundamentals"
      : input.experience === "advanced"
        ? "Building on strong foundations"
        : "Building on what you already know";
  const subhead = `${levelNote}, aiming to ${goalText}${weekly ? ` at ${weekly}h a week` : ""}.`;

  return { rhythm: weekly ? weeklyRhythm(weekly, input.goal, input.dsaLevel) : [], headline, subhead, pace, paceMessage, weeksLeft, neededWeeklyHours, percentDone, checkpoints, nextActions: nextActions.slice(0, 6) };
}

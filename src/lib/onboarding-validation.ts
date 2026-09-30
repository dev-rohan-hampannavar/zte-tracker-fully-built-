// Pure, dependency-free onboarding validation + role search. Kept free of
// path aliases and app imports so the Node contract tests can import it
// directly. The page uses it to gate "Next"; completeOnboarding() reuses it
// so a bad draft can never reach the database.

export type OnboardingStep =
  | "goal"
  | "role"
  | "experience"
  | "hours"
  | "date"
  | "dsa"
  | "interview"
  | "situation"
  | "review";

export interface OnboardingAnswersLike {
  goal?: string | null;
  goal_other?: string | null;
  target_role_id?: string | null;
  experience_level?: string | null;
  weekly_hours?: number | null;
  target_date?: string | null;
  dsa_level?: string | null;
  interview_readiness?: string | null;
  career_situation?: string | null;
}

export const MIN_WEEKLY_HOURS = 1;
export const MAX_WEEKLY_HOURS = 80;

export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayIso(now: Date = new Date()): string {
  return toLocalIso(now);
}

/** Local-calendar date `months` ahead, clamped to month end (Aug 31 + 6mo = Feb 28, not Mar 3). */
export function addMonthsIso(now: Date, months: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(now.getDate(), lastDay));
  return toLocalIso(d);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Returns an error message for the step, or null when it may proceed. */
export function validateOnboardingStep(
  step: OnboardingStep,
  answers: OnboardingAnswersLike,
  opts: { validRoleIds?: ReadonlySet<string> | null; today?: string } = {}
): string | null {
  switch (step) {
    case "goal":
      if (!answers.goal) return "Pick your main goal to continue.";
      if (answers.goal === "other" && !(answers.goal_other ?? "").trim()) {
        return "Tell us briefly what your goal is.";
      }
      return null;
    case "role":
      if (!answers.target_role_id) {
        return "Choose a role from the list. Typing in the search box only filters the list; it doesn't select a role.";
      }
      if (opts.validRoleIds && !opts.validRoleIds.has(answers.target_role_id)) {
        return "That role is no longer available. Choose another one.";
      }
      return null;
    case "experience":
      return answers.experience_level ? null : "Pick your current level to continue.";
    case "hours": {
      const h = answers.weekly_hours;
      if (h == null || !Number.isFinite(h)) return "Choose or enter how many hours a week you can commit.";
      if (h < MIN_WEEKLY_HOURS || h > MAX_WEEKLY_HOURS) {
        return `Weekly hours must be between ${MIN_WEEKLY_HOURS} and ${MAX_WEEKLY_HOURS}.`;
      }
      return null;
    }
    case "date": {
      const date = answers.target_date;
      if (!date) return "Choose a target date.";
      if (!isValidIsoDate(date)) return "Enter a valid target date.";
      if (date < (opts.today ?? todayIso())) return "Target date can't be in the past.";
      return null;
    }
    case "dsa":
      return answers.dsa_level ? null : "Pick your data structures & algorithms level.";
    case "interview":
      return answers.interview_readiness ? null : "Pick your interview readiness.";
    case "situation":
      return answers.career_situation ? null : "Pick what best describes you right now.";
    default:
      return null;
  }
}

const STEP_ORDER: OnboardingStep[] = ["goal", "role", "experience", "hours", "date", "dsa", "interview", "situation"];

/** First failing step for the whole draft, used before the final submit. */
export function firstInvalidStep(
  answers: OnboardingAnswersLike,
  opts: { validRoleIds?: ReadonlySet<string> | null; today?: string } = {}
): { step: OnboardingStep; message: string } | null {
  for (const step of STEP_ORDER) {
    const message = validateOnboardingStep(step, answers, opts);
    if (message) return { step, message };
  }
  return null;
}

/** Clamp free-typed hours to a sane integer range; undefined for blank/NaN. */
export function parseWeeklyHours(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(MAX_WEEKLY_HOURS, Math.max(0, Math.round(n)));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ").trim();
}

function editDistanceAtMost(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/**
 * Typo-tolerant role search. Every query word must match some word of the
 * role name by prefix/substring, or (for words of 4+ letters) be within a
 * small edit distance, so "Data anlayst" still finds "Data Analyst" instead
 * of an empty list.
 */
export function roleMatchesQuery(name: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const n = normalize(name);
  if (n.includes(q)) return true;
  const nameWords = n.split(" ");
  return q.split(" ").every((word) => {
    if (nameWords.some((w) => w.includes(word))) return true;
    if (word.length < 4) return false;
    const max = word.length >= 7 ? 2 : 1;
    return nameWords.some((w) => w.length >= 4 && editDistanceAtMost(word, w.slice(0, word.length + max), max));
  });
}

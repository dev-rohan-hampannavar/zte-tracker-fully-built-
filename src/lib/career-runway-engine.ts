/**
 * Career Runway Engine — computes financial runway metrics and
 * surfaces the critical comparison: will the 6-month buffer be
 * ready before Exit A?
 *
 * All inputs come from existing tables:
 *   - financial_profiles (income, expenses, savings, emergency_months,
 *     notice_period_days, minimum_switch_salary)
 *   - user_settings (career_plan_start_date, career_plan_weekly_hours)
 *   - exit_ladder (exit_hours_required for Exit A / first applicable exit)
 *
 * This is a pure computation module — no DB calls. Fetch the inputs
 * upstream and pass them in. Keeps this unit-testable.
 *
 * The spreadsheet (career_tracker.xlsx, Start sheet) performs the
 * same calculations via Excel formulas. This module replaces those
 * formulas with verified TypeScript logic that surfaces in the app
 * instead of a separate file.
 */

export interface FinancialProfileInput {
  monthly_income: number;        // in-hand pay (INR)
  monthly_expenses: number;      // total monthly costs (INR)
  savings: number;               // current liquid savings (INR)
  emergency_months: number;      // target runway months (default 6)
  notice_period_days: number;    // from offer letter (default 60)
  minimum_switch_salary: number; // lowest acceptable first dev offer (INR/year)
}

export interface RunwayInputs {
  financialProfile: FinancialProfileInput;
  weeklyHours: number;           // from user_settings.career_plan_weekly_hours
  startDate: string;             // ISO date, from user_settings.career_plan_start_date
  exitAHoursRequired: number;    // from exit_ladder where exit_code matches Exit A
}

/** Severity of the runway warning, used to render appropriate UI state. */
export type RunwayWarningLevel = "ok" | "tight" | "critical";

export interface RunwayAnalysis {
  // --- Core financial metrics ---
  monthlySurplus: number;        // income − expenses; negative = deficit
  bufferTarget: number;          // emergency_months × monthly_expenses (INR)
  stillToSave: number;           // max(0, bufferTarget − savings)
  monthsToBuffer: number | null; // stillToSave / monthlySurplus; null if surplus ≤ 0
  bufferReadyDate: string | null;// ISO date when buffer will be funded

  // --- Exit A timing ---
  exitAMonths: number;           // exit_a_hours / (weekly_hours × 4.33)
  exitADate: string | null;      // ISO date for projected Exit A

  // --- The critical comparison ---
  // Positive = buffer ready BEFORE Exit A (good)
  // Negative = buffer ready AFTER Exit A (warning: applying while underfunded)
  bufferVsExitADeltaMonths: number | null;
  warningLevel: RunwayWarningLevel;

  // --- Notice period ---
  noticePeriodMonths: number;    // notice_period_days / 30.4

  // --- Summary messages for the UI ---
  summary: string;               // 1–2 sentences for a card header
  actionRequired: string | null; // specific action if warning or critical
}

const WEEKS_PER_MONTH = 4.33;
const DAYS_PER_MONTH = 30.4;

function addMonths(dateISO: string, months: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const d = new Date(year, month - 1 + Math.round(months), day);
  if (d.getDate() !== day) d.setDate(0); // clamp end-of-month
  return d.toISOString().slice(0, 10);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Main computation. Pass real values from the DB; all fields are
 * required — default them upstream if not yet set by the user.
 */
export function computeRunwayAnalysis(inputs: RunwayInputs): RunwayAnalysis {
  const { financialProfile: fp, weeklyHours, startDate, exitAHoursRequired } = inputs;

  // --- Core financial ---
  const monthlySurplus = fp.monthly_income - fp.monthly_expenses;
  const bufferTarget = fp.emergency_months * fp.monthly_expenses;
  const stillToSave = Math.max(0, bufferTarget - fp.savings);

  let monthsToBuffer: number | null = null;
  let bufferReadyDate: string | null = null;

  if (monthlySurplus > 0) {
    monthsToBuffer = stillToSave / monthlySurplus;
    bufferReadyDate = addMonths(isoToday(), monthsToBuffer);
  }

  // --- Exit A timing ---
  const exitAMonths = weeklyHours > 0
    ? exitAHoursRequired / (weeklyHours * WEEKS_PER_MONTH)
    : 0;

  const exitADate = weeklyHours > 0 && startDate
    ? addMonths(startDate, exitAMonths)
    : null;

  // --- Comparison ---
  let bufferVsExitADeltaMonths: number | null = null;
  if (monthsToBuffer !== null && exitAMonths > 0) {
    // Positive = buffer ready before Exit A (good)
    bufferVsExitADeltaMonths = exitAMonths - monthsToBuffer;
  }

  const noticePeriodMonths = fp.notice_period_days / DAYS_PER_MONTH;

  // --- Warning level ---
  let warningLevel: RunwayWarningLevel = "ok";
  let summary = "";
  let actionRequired: string | null = null;

  if (monthlySurplus <= 0) {
    // Can't save at all
    warningLevel = "critical";
    summary = "Monthly expenses exceed income — no savings buffer is possible at current spend.";
    actionRequired = "Reduce monthly expenses below ₹" + fp.monthly_income.toLocaleString("en-IN") + " to start building runway.";
  } else if (bufferVsExitADeltaMonths !== null && bufferVsExitADeltaMonths < 0) {
    // Buffer will be ready AFTER Exit A
    const lag = Math.abs(bufferVsExitADeltaMonths).toFixed(1);
    const bufferMonths = monthsToBuffer!.toFixed(1);
    if (Math.abs(bufferVsExitADeltaMonths) > 6) {
      warningLevel = "critical";
      summary = `Buffer will be ready ${lag} months AFTER Exit A. Applying without 6 months of runway is high-risk.`;
      actionRequired = `Save ₹${Math.round(stillToSave / 1000)}K before applying, or reduce expenses. At ₹${monthlySurplus.toLocaleString("en-IN")}/month surplus, buffer takes ${bufferMonths} months.`;
    } else {
      warningLevel = "tight";
      summary = `Buffer will be ready ${lag} months after Exit A (${bufferMonths} months to save). Keep the ops job until buffer is funded.`;
      actionRequired = `The plan already handles this — apply at Exit A, but don't resign until the buffer is in place.`;
    }
  } else if (fp.savings >= bufferTarget) {
    warningLevel = "ok";
    summary = `6-month buffer already funded (₹${fp.savings.toLocaleString("en-IN")} saved). Financial runway is clear.`;
  } else {
    const bufferMonths = monthsToBuffer!.toFixed(1);
    const lead = bufferVsExitADeltaMonths !== null ? bufferVsExitADeltaMonths.toFixed(1) : "?";
    warningLevel = "ok";
    summary = `Buffer funded ${lead} months before Exit A. Saving ₹${monthlySurplus.toLocaleString("en-IN")}/month; ready in ${bufferMonths} months.`;
  }

  return {
    monthlySurplus,
    bufferTarget,
    stillToSave,
    monthsToBuffer,
    bufferReadyDate,
    exitAMonths,
    exitADate,
    bufferVsExitADeltaMonths,
    warningLevel,
    noticePeriodMonths,
    summary,
    actionRequired,
  };
}

/**
 * Computes the minimum first-year dev salary needed to beat the
 * current ops income immediately. Used to evaluate whether a first
 * offer is worth accepting.
 *
 * The career docs note: "switch to dev only when an offer beats your
 * ops pay." This makes that threshold explicit and surfaceable.
 */
export function computeMinimumAcceptableOffer(
  monthlyIncome: number,
  minimumSwitchSalary: number
): {
  minimumAnnual: number;   // max(minimum_switch_salary, monthly_income × 12)
  monthlyEquivalent: number;
  exceedsCurrentPay: boolean;
} {
  const currentAnnual = monthlyIncome * 12;
  const minimumAnnual = Math.max(minimumSwitchSalary, currentAnnual);
  return {
    minimumAnnual,
    monthlyEquivalent: Math.round(minimumAnnual / 12),
    exceedsCurrentPay: minimumSwitchSalary > currentAnnual,
  };
}

/**
 * Returns the checkpoints from the career docs (section 15) as objects
 * with hours and dates derived from the user's start date and pace.
 * Used to seed milestones and to render kill-criteria tables.
 *
 * "On plan" is based on 30 h/wk (the baseline the doc uses for all
 * kill-criteria examples). Minimum is approximately 70% of plan.
 */
export interface CareerCheckpoint {
  month: number;
  onPlanHours: number;       // cumulative hours at 30 h/wk baseline
  minimumHours: number;      // ~70% of on-plan (the kill-criteria floor)
  targetDate: string;        // ISO date from start_date + month
  description: string;       // what should be true at this point
}

export function computeCareerCheckpoints(
  startDate: string,
  weeklyHours: number // user's actual pace, for computing target dates
): CareerCheckpoint[] {
  // From career_timeline_zte.docx §15. Hours are at 30 h/wk (the doc's
  // reference pace). Target dates are computed from the user's actual
  // start_date (not from 30 h/wk — the checkpoint months are milestone
  // markers, not pace-dependent).
  const checkpoints: Omit<CareerCheckpoint, "targetDate">[] = [
    {
      month: 3,
      onPlanHours: 390,
      minimumHours: 270,
      description: "Phases 01 and 01b done, Phase 02 ~60%. Two-week hours audit complete and tracker updated.",
    },
    {
      month: 6,
      onPlanHours: 780,
      minimumHours: 540,
      description: "Phases 01–04 done, CivicBoard deployed. If below minimum: pause and reassess whether it's interest or time.",
    },
    {
      month: 10,
      onPlanHours: 1235,
      minimumHours: 900,
      description: "Exit A reached: ClientSync live, green CI, Docker. Start applying. If missed, extend by 2 months once only.",
    },
    {
      month: 14,
      onPlanHours: 1748,
      minimumHours: 1270,
      description: "Exit ★1 reached: Phase 08 DSA done, first interview loops. If zero interviews after 60 tailored applications + 10 referral asks: fix portfolio first.",
    },
    {
      month: 18,
      onPlanHours: 2600,
      minimumHours: 0, // doc says "at least one offer above ops pay" — no hours floor
      description: "At least one dev offer above current ops pay. If not: stay in ops, treat dev as an internal/side skill, consider MBA.",
    },
  ];

  return checkpoints.map((c) => ({
    ...c,
    targetDate: addMonths(startDate, c.month),
  }));
}

/**
 * Evaluates a single checkpoint against actual logged hours and today's date.
 * Returns status and a brief message for the checkpoint widget.
 */
export function evaluateCheckpoint(
  checkpoint: CareerCheckpoint,
  totalHoursLogged: number
): {
  status: "not_reached" | "below_minimum" | "minimum" | "on_plan" | "exceeded";
  message: string;
} {
  const todayISO = new Date().toISOString().slice(0, 10);
  const isPast = todayISO >= checkpoint.targetDate;

  if (!isPast) {
    return { status: "not_reached", message: `Due ${checkpoint.targetDate}` };
  }

  if (totalHoursLogged < checkpoint.minimumHours && checkpoint.minimumHours > 0) {
    const gap = checkpoint.minimumHours - totalHoursLogged;
    return {
      status: "below_minimum",
      message: `${Math.round(gap)} hours below minimum — see kill criteria (§15).`,
    };
  }
  if (totalHoursLogged < checkpoint.onPlanHours) {
    return {
      status: "minimum",
      message: `Above minimum but below plan (${Math.round(totalHoursLogged)}/${checkpoint.onPlanHours} h).`,
    };
  }
  if (totalHoursLogged === checkpoint.onPlanHours) {
    return { status: "on_plan", message: "On plan." };
  }
  return {
    status: "exceeded",
    message: `${Math.round(totalHoursLogged - checkpoint.onPlanHours)} hours ahead of plan.`,
  };
}

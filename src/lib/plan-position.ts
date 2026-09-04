import type { DailyLog, MonthByMonthRow } from "@/types/database";

/**
 * Derives "where the user actually is" in the 24-month Zero to Elite plan
 * from data that already exists — month_by_month (static, parsed from the
 * plan doc) and daily_logs (real logged hours). No new table, no stored
 * "current month" field that could drift from reality: this is recomputed
 * every time from source data, same discipline as pace.ts and the
 * skill_evidence/goal_progress views.
 *
 * Approach: month_by_month rows are ordered checkpoints, each with a
 * realistic_hours budget (e.g. "185h"). Walking them in order and
 * accumulating that budget gives a cumulative-hours-to-reach-this-month
 * curve. The user's actual total logged hours are located on that curve
 * to find which checkpoint they've reached, and how far into the next one
 * they are.
 */

export interface WeeklyTargets {
  engineeringHours: number;
  projectHoursMin: number;
  projectHoursMax: number;
  dsaSessionsMin: number;
  dsaSessionsMax: number;
  careerUpdatesMin: number;
}

/**
 * Fixed targets from the Zero to Elite plan's own weekly operating system
 * (Section 12) — not user-configurable numbers pulled from thin air, but
 * the plan's own stated pace. If the user later wants these editable,
 * they belong in user_settings as new columns; kept as a constant for now
 * since no such column exists yet and inventing one is out of scope for
 * this pass.
 */
export const DEFAULT_WEEKLY_TARGETS: WeeklyTargets = {
  engineeringHours: 40,
  projectHoursMin: 4,
  projectHoursMax: 8,
  dsaSessionsMin: 3,
  dsaSessionsMax: 6,
  careerUpdatesMin: 1,
};

export interface WeeklyVarianceItem {
  label: string;
  planned: string;
  actual: number;
  variance: number; // actual - planned midpoint; positive = ahead
  status: "on-target" | "under" | "over";
}

/**
 * Planned-vs-actual-vs-variance for the weekly operating system, layered
 * on top of computeWeeklyReview's existing aggregation rather than
 * duplicating any of its queries — this only adds the "planned" side and
 * the delta, using WeeklyReview's already-computed actuals.
 */
export function computeWeeklyVariance(
  review: { actualHours: number; dsaSolved: number; projectsProgressed: number },
  careerUpdatesThisWeek: number,
  targets: WeeklyTargets = DEFAULT_WEEKLY_TARGETS
): WeeklyVarianceItem[] {
  const engineeringDelta = review.actualHours - targets.engineeringHours;
  const dsaMid = (targets.dsaSessionsMin + targets.dsaSessionsMax) / 2;
  const projectMid = (targets.projectHoursMin + targets.projectHoursMax) / 2;

  return [
    {
      label: "Engineering",
      planned: `${targets.engineeringHours}h`,
      actual: review.actualHours,
      variance: Math.round(engineeringDelta * 10) / 10,
      status: Math.abs(engineeringDelta) <= 3 ? "on-target" : engineeringDelta < 0 ? "under" : "over",
    },
    {
      label: "Project",
      planned: `${targets.projectHoursMin}–${targets.projectHoursMax}h`,
      actual: review.projectsProgressed,
      variance: Math.round((review.projectsProgressed - projectMid) * 10) / 10,
      status:
        review.projectsProgressed >= targets.projectHoursMin && review.projectsProgressed <= targets.projectHoursMax
          ? "on-target"
          : review.projectsProgressed < targets.projectHoursMin
            ? "under"
            : "over",
    },
    {
      label: "DSA",
      planned: `${targets.dsaSessionsMin}–${targets.dsaSessionsMax} sessions`,
      actual: review.dsaSolved,
      variance: Math.round((review.dsaSolved - dsaMid) * 10) / 10,
      status:
        review.dsaSolved >= targets.dsaSessionsMin && review.dsaSolved <= targets.dsaSessionsMax
          ? "on-target"
          : review.dsaSolved < targets.dsaSessionsMin
            ? "under"
            : "over",
    },
    {
      label: "Career Evidence",
      planned: `${targets.careerUpdatesMin}+ update`,
      actual: careerUpdatesThisWeek,
      variance: careerUpdatesThisWeek - targets.careerUpdatesMin,
      status: careerUpdatesThisWeek >= targets.careerUpdatesMin ? "on-target" : "under",
    },
  ];
}


export interface FailureSignal {
  code: "course_hoarding" | "project_hopping" | "tutorial_dependency" | "perfectionism" | "endless_plan_b" | "ignoring_day_job" | "skill_decay";
  message: string;
  recommendation: string;
}

/**
 * Failure-mode detection (Section 16). Deliberately conservative: every
 * signal here is derived directly from study_sessions.activity counts/
 * hours over a real trailing window, never a hand-set flag or a vibes-based
 * judgement. If a pattern's underlying evidence doesn't exist yet (e.g. no
 * sessions logged this window), it simply doesn't fire — silence, not a
 * fabricated "all clear."
 *
 * Only "course hoarding" and "project hopping" are implemented from real
 * signals available today (study_sessions activity mix, and project
 * switching via stage_project_id). "Tutorial dependency" and
 * "perfectionism" from the original spec need signals that don't exist in
 * this schema yet (a tutorial-vs-independent-build flag on sessions, and
 * an application-readiness-vs-actual-applications comparison) — rather
 * than fabricate those from a proxy, they're left undetected until real
 * data exists, per the "no fake analytics" rule.
 */
export function detectFailureSignals(sessions: { date: string; hours: number; activity: string; stage_project_id: string | null }[]): FailureSignal[] {
  const signals: FailureSignal[] = [];

  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recent = sessions.filter((s) => new Date(s.date) >= twoWeeksAgo);

  if (recent.length > 0) {
    const learnHours = recent.filter((s) => s.activity === "learn").reduce((sum, s) => sum + s.hours, 0);
    const projectHours = recent.filter((s) => s.activity === "project").reduce((sum, s) => sum + s.hours, 0);

    // Course hoarding: meaningful learning volume with ~no project output
    // to show for it, over a 2-week window (long enough that one busy
    // learning day doesn't trip a false positive).
    if (learnHours >= 10 && projectHours < 2) {
      signals.push({
        code: "course_hoarding",
        message: `${Math.round(learnHours)}h of learning logged in the last 2 weeks with almost no project output.`,
        recommendation: "Stop adding new material. Build the current concept before moving on.",
      });
    }

    // Project hopping: touched 3+ distinct stage projects in 2 weeks with
    // shallow time on each — a real switching pattern, not just working
    // across projects deliberately (which would show sustained hours per
    // project instead).
    const projectSessions = recent.filter((s) => s.activity === "project" && s.stage_project_id);
    const projectIds = new Set(projectSessions.map((s) => s.stage_project_id));
    if (projectIds.size >= 3) {
      const hoursPerProject = [...projectIds].map(
        (id) => projectSessions.filter((s) => s.stage_project_id === id).reduce((sum, s) => sum + s.hours, 0)
      );
      const maxHours = Math.max(...hoursPerProject);
      if (maxHours < 4) {
        signals.push({
          code: "project_hopping",
          message: `${projectIds.size} different projects touched in the last 2 weeks, none past ${Math.round(maxHours)}h.`,
          recommendation: "Pick one project and commit to finishing a milestone before starting another.",
        });
      }
    }
  }

  return signals;
}

/**
 * "Endless Plan B" detection: repeated deferral of a go/no-go-worthy
 * Month-24 assessment. Requires real logged history (career_decisions) —
 * cannot be inferred from hours or vibes. Fires only when the evidence
 * has clearly supported a real decision (not "insufficient-evidence")
 * at least 3 times and the user chose "deferred" every time — a genuine
 * repeated-avoidance pattern, not someone reasonably waiting for more data.
 */
export function detectEndlessPlanB(
  decisions: { decision: string; action_taken: string; created_at: string }[]
): FailureSignal | null {
  const decisive = decisions.filter((d) => d.decision !== "insufficient-evidence");
  if (decisive.length < 3) return null;

  const recentThree = decisive.slice(0, 3);
  const allDeferred = recentThree.every((d) => d.action_taken === "deferred");

  if (allDeferred) {
    return {
      code: "endless_plan_b",
      message: `The last ${recentThree.length} Month-24 evidence checks were all deferred without a decision.`,
      recommendation: "The evidence has been clear more than once. Make the call — GO or NO-GO — rather than deferring again.",
    };
  }

  return null;
}

/**
 * Tutorial dependency: high tutorial-tagged activity with little
 * independent (non-tutorial) building, over a real window. Only counts
 * sessions where is_tutorial was actually set — unset sessions are
 * excluded rather than assumed, so this stays silent until the user
 * starts tagging sessions rather than firing on incomplete data.
 */
export function detectTutorialDependency(
  sessions: { date: string; hours: number; activity: string; is_tutorial: boolean | null }[]
): FailureSignal | null {
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const tagged = sessions.filter((s) => new Date(s.date) >= twoWeeksAgo && s.is_tutorial !== null);
  if (tagged.length < 3) return null; // not enough tagged data to say anything real

  const tutorialHours = tagged.filter((s) => s.is_tutorial).reduce((sum, s) => sum + s.hours, 0);
  const independentHours = tagged.filter((s) => !s.is_tutorial).reduce((sum, s) => sum + s.hours, 0);

  if (tutorialHours >= 10 && independentHours < 2) {
    return {
      code: "tutorial_dependency",
      message: `${Math.round(tutorialHours)}h following tutorials in the last 2 weeks, only ${Math.round(independentHours)}h building independently.`,
      recommendation: "Close the tutorial. Rebuild the same thing from a blank file without it open.",
    };
  }
  return null;
}

/**
 * Perfectionism: exit readiness comfortably clears the bar but zero
 * applications went out in the same window. Reuses assessMonth24Decision's
 * own readiness threshold so "ready enough" is defined identically in one
 * place. Requires the readiness signal AND a real applications count —
 * never inferred from hours or sentiment.
 */
export function detectPerfectionism(
  exitReadinessPct: number,
  recentApplications: number
): FailureSignal | null {
  if (exitReadinessPct >= GO_READINESS_THRESHOLD_PCT && recentApplications === 0) {
    return {
      code: "perfectionism",
      message: `Exit readiness is at ${exitReadinessPct}%, above the ${GO_READINESS_THRESHOLD_PCT}% bar, but no applications went out recently.`,
      recommendation: "The prep is there. Submit applications now — readiness doesn't improve by waiting longer to apply.",
    };
  }
  return null;
}

/**
 * Ignoring day job: sustained engineering hours that would only be
 * possible by consistently shorting day-job hours, inferred only from
 * days where day_job_hours was actually logged — never assumed for
 * unlogged days. Fires only on a real, sustained pattern (5+ logged days)
 * to avoid flagging one rough week.
 */
export function detectIgnoringDayJob(
  logs: { date: string; hours: number; day_job_hours: number | null }[]
): FailureSignal | null {
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const tagged = logs.filter((l) => new Date(l.date) >= twoWeeksAgo && l.day_job_hours !== null) as (typeof logs[number] & {
    day_job_hours: number;
  })[];
  if (tagged.length < 5) return null;

  const lowDayJobDays = tagged.filter((l) => l.day_job_hours < 4 && l.hours >= 6).length;
  if (lowDayJobDays >= 4) {
    return {
      code: "ignoring_day_job",
      message: `${lowDayJobDays} of the last ${tagged.length} logged days show under 4h on the day job alongside 6h+ of engineering study.`,
      recommendation: "The day job is the financial foundation this plan depends on. Protect it — it funds the runway for the SDE transition.",
    };
  }
  return null;
}

/**
 * Skill decay warning: a skill that was genuinely strong (knowledge_pct
 * >= 70) but is now in the "stale" freshness bucket — reusing the exact
 * freshness classification already computed by skill_freshness, not a
 * new threshold invented here.
 */
export function detectSkillDecay(
  skills: { technology_name: string; knowledge_pct: number; freshness: "fresh" | "aging" | "stale" | "never" }[]
): FailureSignal | null {
  const decayed = skills.filter((s) => s.knowledge_pct >= 70 && s.freshness === "stale");
  if (decayed.length === 0) return null;

  const names = decayed.slice(0, 3).map((s) => s.technology_name).join(", ");
  return {
    code: "skill_decay",
    message: `${decayed.length} skill${decayed.length === 1 ? "" : "s"} you were strong in ${decayed.length === 1 ? "is" : "are"} now stale: ${names}${decayed.length > 3 ? ", …" : ""}.`,
    recommendation: "A quick review now is cheaper than relearning from scratch before an interview.",
  };
}

export interface StaleApplication {
  id: string;
  company: string;
  role: string | null;
  daysSinceApplied: number;
}

/**
 * Application follow-up detection (Feature 8): applications sitting in
 * "applied" status for N+ days with no status change since — a real
 * staleness signal from applied_at vs. today, not a fabricated one. Only
 * flags status "applied" specifically; "screening"/"interviewing" means
 * something already happened, so those are excluded on purpose.
 */
export function getStaleApplications(
  applications: { id: string; company: string; role: string | null; application_status: string; applied_at: string | null }[],
  staleDays = 10
): StaleApplication[] {
  const now = new Date();
  return applications
    .filter((a) => a.application_status === "applied" && a.applied_at)
    .map((a) => {
      const appliedDate = new Date(a.applied_at as string);
      const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      return { id: a.id, company: a.company, role: a.role, daysSinceApplied };
    })
    .filter((a) => a.daysSinceApplied >= staleDays)
    .sort((a, b) => b.daysSinceApplied - a.daysSinceApplied);
}

export type Month24Decision = "go" | "no-go" | "insufficient-evidence";

export interface Month24Assessment {
  decision: Month24Decision;
  reasons: string[];
  inputs: {
    exitReadinessPct: number; // topic completion at the highest-reached exit rung
    totalApplications: number;
    interviewsReached: number;
    offersReceived: number;
    openInterviewWeaknesses: number;
  };
}

/**
 * Month-24 decision gate (Section 15). Deliberately conservative and
 * evidence-only: never decides GO/NO-GO from hours logged or motivation,
 * only from real application/interview outcomes plus the exit ladder's
 * own topic-completion readiness (both already computed live elsewhere —
 * application_metrics view, exit ladder rungs). If there isn't enough
 * real application/interview volume to judge market response either way,
 * the honest answer is "insufficient evidence" — this function refuses to
 * force a GO or NO-GO out of thin data, matching the plan's own explicit
 * warning against basing the decision on hours or motivation alone.
 *
 * Thresholds are intentionally modest and named here in one place (not
 * scattered through the UI) so they can be revisited without hunting
 * through components: at least 15 applications and 3 interviews reached
 * is treated as enough market signal to judge; below that, the market
 * simply hasn't spoken yet regardless of how the technical prep looks.
 */
const MIN_APPLICATIONS_FOR_SIGNAL = 15;
const MIN_INTERVIEWS_FOR_SIGNAL = 3;
const GO_READINESS_THRESHOLD_PCT = 70;
const GO_INTERVIEW_RATE_PCT = 15;

export function assessMonth24Decision(inputs: {
  exitReadinessPct: number;
  totalApplications: number;
  interviewsReached: number;
  offersReceived: number;
  openInterviewWeaknesses: number;
}): Month24Assessment {
  const reasons: string[] = [];

  const hasMarketSignal =
    inputs.totalApplications >= MIN_APPLICATIONS_FOR_SIGNAL && inputs.interviewsReached >= MIN_INTERVIEWS_FOR_SIGNAL;

  if (inputs.offersReceived > 0) {
    reasons.push(`${inputs.offersReceived} offer${inputs.offersReceived > 1 ? "s" : ""} already received.`);
    return { decision: "go", reasons, inputs };
  }

  if (!hasMarketSignal) {
    reasons.push(
      `Only ${inputs.totalApplications} application${inputs.totalApplications === 1 ? "" : "s"} and ${inputs.interviewsReached} interview${inputs.interviewsReached === 1 ? "" : "s"} logged — not enough market response yet to judge either way.`
    );
    if (inputs.exitReadinessPct < GO_READINESS_THRESHOLD_PCT) {
      reasons.push(`Technical readiness is also at ${inputs.exitReadinessPct}%, below the ${GO_READINESS_THRESHOLD_PCT}% bar — apply more before this can be a real decision.`);
    }
    return { decision: "insufficient-evidence", reasons, inputs };
  }

  const interviewRatePct = Math.round((inputs.interviewsReached / inputs.totalApplications) * 100);
  const technicallyReady = inputs.exitReadinessPct >= GO_READINESS_THRESHOLD_PCT;
  const marketResponding = interviewRatePct >= GO_INTERVIEW_RATE_PCT;

  if (technicallyReady && marketResponding) {
    reasons.push(`Exit readiness at ${inputs.exitReadinessPct}%, and the market is responding — ${interviewRatePct}% of applications reach an interview.`);
    if (inputs.openInterviewWeaknesses > 0) {
      reasons.push(`${inputs.openInterviewWeaknesses} interview weakness${inputs.openInterviewWeaknesses === 1 ? "" : "es"} still open — worth closing before final rounds, but not a blocker to continuing.`);
    }
    return { decision: "go", reasons, inputs };
  }

  if (!technicallyReady) {
    reasons.push(`Exit readiness is ${inputs.exitReadinessPct}%, below the ${GO_READINESS_THRESHOLD_PCT}% bar.`);
  }
  if (!marketResponding) {
    reasons.push(`Only ${interviewRatePct}% of applications reach an interview, below the ${GO_INTERVIEW_RATE_PCT}% signal threshold — the market isn't responding to the current profile yet.`);
  }
  return { decision: "no-go", reasons, inputs };
}


export interface PlanPosition {
  /** Label from the matched month_by_month row, e.g. "4–6" or "8". */
  currentMonthLabel: string;
  /** Best-effort single number for display/math — first number in the label. */
  currentMonthNumber: number;
  focus: string;
  phasesActive: string;
  /** Cumulative hours the plan expects by the START of the current checkpoint. */
  cumulativeExpectedHours: number;
  /** Cumulative hours the plan expects by the END of the current checkpoint (i.e. start of next). */
  nextCheckpointHours: number | null;
  /** Actual total hours logged, all-time. */
  actualHours: number;
  /** Progress through the current checkpoint's own hour budget, 0-100. */
  checkpointProgressPct: number;
  /** Overall progress through the full plan's total hour budget, 0-100. */
  overallProgressPct: number;
  totalPlanHours: number;
  /** Rough month-24 style horizon: at current weekly pace, months remaining. Null if no pace signal yet. */
  projectedMonthsRemaining: number | null;
}

/** Parses "185h", "80 h", "—", "" etc. Returns null for anything unparseable — never fabricate a number. */
function parseHours(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/[\d,.]+/);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Parses a month label like "4–6", "1–2", "8", "—" into its first numeric value for display/ordering. Returns null if not derivable (e.g. "—"). */
function parseMonthNumber(label: string): number | null {
  const match = label.match(/\d+/);
  if (!match) return null;
  return Number(match[0]);
}

export interface PhaseScheduleStatus {
  phaseId: string;
  /** Cumulative hours expected by the start of this phase (sum of all prior phases' estimated_hours). */
  expectedStartHours: number;
  expectedEndHours: number;
  /** actual - expected position, in hours. Positive = ahead, negative = behind. */
  hoursDelta: number;
  status: "ahead" | "on-pace" | "behind";
}

const PHASE_SCHEDULE_TOLERANCE_HOURS = 15;

/**
 * Per-phase schedule status: is the user ahead/behind where the plan's own
 * hour budget says they should be, based on real logged hours vs. each
 * phase's estimated_hours (already on the Phase row — no new data needed).
 * Deliberately separate from computePhaseReadiness (phase-readiness.ts),
 * which scores mastery/confidence within a phase; this answers a different
 * question — calendar/pace position across the whole plan — and the two
 * are shown side by side, not merged, so neither number gets diluted.
 */
export function computePhaseScheduleStatus(
  phases: { id: string; order_index: number; estimated_hours: number | null }[],
  actualHours: number
): Map<string, PhaseScheduleStatus> {
  const ordered = [...phases].sort((a, b) => a.order_index - b.order_index);
  const result = new Map<string, PhaseScheduleStatus>();

  let cumulative = 0;
  for (const phase of ordered) {
    const hours = phase.estimated_hours ?? 0;
    const expectedStartHours = cumulative;
    const expectedEndHours = cumulative + hours;
    // Delta: how far actual hours are past (or short of) where this phase
    // ends. Using the phase's end (not midpoint) keeps "on pace" meaning
    // "you'd have finished this phase by now at the plan's own rate."
    const hoursDelta = actualHours - expectedEndHours;
    const status: PhaseScheduleStatus["status"] =
      Math.abs(hoursDelta) <= PHASE_SCHEDULE_TOLERANCE_HOURS ? "on-pace" : hoursDelta > 0 ? "ahead" : "behind";

    result.set(phase.id, { phaseId: phase.id, expectedStartHours, expectedEndHours, hoursDelta, status });
    cumulative = expectedEndHours;
  }

  return result;
}


export interface ExitEta {
  remainingHours: number;
  /** null when there's no recent logging pace to project from. */
  estimatedWeeks: number | null;
}

/**
 * How long until a given exit's remaining topics are done, at the user's
 * actual recent pace. Distinct from computePlanPosition's overall
 * projectedMonthsRemaining (that's for the whole 24-month plan; this is
 * scoped to just the topics between here and one specific exit rung).
 * Reuses the same "last 4 logged weeks" pace signal so the two numbers
 * are never computed two different ways.
 */
export function computeExitEta(remainingTopicHours: number, logs: DailyLog[]): ExitEta {
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentHours = logs
    .filter((l) => new Date(l.date) >= fourWeeksAgo)
    .reduce((sum, l) => sum + Number(l.hours), 0);
  const avgWeeklyHours = recentHours / 4;

  return {
    remainingHours: remainingTopicHours,
    estimatedWeeks: avgWeeklyHours > 0 ? Math.round((remainingTopicHours / avgWeeklyHours) * 10) / 10 : null,
  };
}

export function computePlanPosition(
  monthByMonth: MonthByMonthRow[],
  logs: DailyLog[]
): PlanPosition | null {
  const rows = [...monthByMonth]
    .sort((a, b) => a.order_index - b.order_index)
    .map((r) => ({ ...r, hours: parseHours(r.realistic_hours) }))
    .filter((r) => r.hours !== null) as (MonthByMonthRow & { hours: number })[];

  if (rows.length === 0) return null;

  const totalPlanHours = rows.reduce((sum, r) => sum + r.hours, 0);
  const actualHours = logs.reduce((sum, l) => sum + Number(l.hours), 0);

  // Walk checkpoints accumulating hours until we pass the user's actual total.
  let cumulative = 0;
  let matched: (MonthByMonthRow & { hours: number }) | null = null;
  let matchedStart = 0;
  let matchedEnd: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const start = cumulative;
    const end = cumulative + row.hours;
    if (actualHours < end || i === rows.length - 1) {
      matched = row;
      matchedStart = start;
      matchedEnd = end;
      break;
    }
    cumulative = end;
  }

  if (!matched) return null;

  const checkpointProgressPct =
    matched.hours > 0
      ? Math.min(100, Math.max(0, Math.round(((actualHours - matchedStart) / matched.hours) * 100)))
      : 0;

  const overallProgressPct =
    totalPlanHours > 0 ? Math.min(100, Math.round((actualHours / totalPlanHours) * 100)) : 0;

  // Pace projection: hours/week over the last 4 logged weeks, if any signal exists.
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentHours = logs
    .filter((l) => new Date(l.date) >= fourWeeksAgo)
    .reduce((sum, l) => sum + Number(l.hours), 0);
  const avgWeeklyHours = recentHours / 4;

  const remainingHours = Math.max(0, totalPlanHours - actualHours);
  const projectedMonthsRemaining =
    avgWeeklyHours > 0 ? Math.round((remainingHours / avgWeeklyHours / 4.33) * 10) / 10 : null;

  return {
    currentMonthLabel: matched.month,
    currentMonthNumber: parseMonthNumber(matched.month) ?? 0,
    focus: matched.focus,
    phasesActive: matched.phases_active,
    cumulativeExpectedHours: matchedStart,
    nextCheckpointHours: matchedEnd,
    actualHours,
    checkpointProgressPct,
    overallProgressPct,
    totalPlanHours,
    projectedMonthsRemaining,
  };
}

export interface SmartAction {
  title: string;
  reason: string;
  href: string;
  priority: number; // lower = more urgent, used only to pick the single top action
}

/**
 * Feature 10 — collapses everything the app already knows into a single
 * "do this now" recommendation. Every candidate here is backed by a real,
 * already-computed signal from elsewhere in this file or from data the
 * caller passes in — this function adds no new detection logic, it only
 * ranks existing signals and picks one. Ties are broken by priority order
 * below (roughly: acute failure signals > overdue revision > stale
 * applications > current-phase work), which mirrors the plan's own
 * stated priorities (Section 16's failure modes are framed as urgent,
 * revision-schedule.ts already treats overdue as time-sensitive, and
 * stale applications lose momentum the longer they sit).
 */
export function computeSmartAction(inputs: {
  failureSignals: FailureSignal[];
  overdueTopicCount: number;
  overdueDsaCount: number;
  staleApplications: StaleApplication[];
  currentPhaseTitle: string | null;
  currentPhaseIncompleteTopicTitle: string | null;
}): SmartAction | null {
  const candidates: SmartAction[] = [];

  if (inputs.failureSignals.length > 0) {
    const top = inputs.failureSignals[0];
    candidates.push({ title: top.message, reason: top.recommendation, href: "/dashboard", priority: 1 });
  }

  if (inputs.overdueTopicCount > 0) {
    candidates.push({
      title: `${inputs.overdueTopicCount} topic${inputs.overdueTopicCount === 1 ? "" : "s"} overdue for revision`,
      reason: "Spaced repetition works because reviews happen on schedule — overdue reviews lose their effect the longer they wait.",
      href: "/revision",
      priority: 2,
    });
  }

  if (inputs.overdueDsaCount > 0) {
    candidates.push({
      title: `${inputs.overdueDsaCount} DSA problem${inputs.overdueDsaCount === 1 ? "" : "s"} overdue for review`,
      reason: "Same spaced-repetition logic as topic revision — this pattern is at risk of fading from memory.",
      href: "/dsa",
      priority: 3,
    });
  }

  if (inputs.staleApplications.length > 0) {
    const oldest = inputs.staleApplications[0];
    candidates.push({
      title: `Follow up with ${oldest.company}`,
      reason: `${oldest.daysSinceApplied} days since applying with no update — a follow-up now costs little and can restart momentum.`,
      href: "/career",
      priority: 4,
    });
  }

  if (inputs.currentPhaseIncompleteTopicTitle && inputs.currentPhaseTitle) {
    candidates.push({
      title: `Continue: ${inputs.currentPhaseIncompleteTopicTitle}`,
      reason: `Next topic in ${inputs.currentPhaseTitle}, your current phase.`,
      href: "/roadmap",
      priority: 5,
    });
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.priority - b.priority)[0];
}

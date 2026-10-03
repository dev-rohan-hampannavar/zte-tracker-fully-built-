import type { CareerPlanSettings } from "@/lib/hooks/use-career-plan";
import type { DailyLog, ExitLadderRow, PhaseWithTopics } from "@/types/database";
import type { PlanPosition } from "@/lib/plan-position";

export interface CareerPlanSnapshot {
  startDate: string;
  deadlineDate: string;
  monthNumber: number;
  monthLabel: string;
  daysRemaining: number;
  actualHours: number;
  completedTopics: number;
  totalTopics: number;
  topicsPct: number;
  completedPhases: number;
  totalPhases: number;
  currentPhaseTitle: string | null;
  currentPhaseNumber: string | null;
  currentExitCode: string | null;
  currentExitName: string | null;
  currentExitReadinessPct: number;
  planPosition: PlanPosition | null;
}

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(dateISO: string, months: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setMonth(d.getMonth() + months);
  // Clamp dates such as 31 January when adding a month.
  if (d.getDate() !== day) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthsBetween(startISO: string, endISO: string) {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed < sd) months -= 1;
  return Math.max(0, months);
}

function daysBetween(startISO: string, endISO: string) {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function getEffectivePlanStart(settings: CareerPlanSettings | undefined, logs: DailyLog[]) {
  if (settings?.career_plan_start_date) return settings.career_plan_start_date;
  const earliestLog = [...logs].sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
  return earliestLog ?? isoToday();
}

export function deriveCurrentExit(phases: PhaseWithTopics[], exitLadder: ExitLadderRow[]) {
  const ordered = [...phases].sort((a, b) => a.order_index - b.order_index);
  const firstIncomplete = exitLadder.find((exit) => {
    const cutoff = ordered.findIndex((phase) => phase.id === exit.linked_phase);
    if (cutoff < 0) return false;
    return ordered.slice(0, cutoff + 1).some((phase) => phase.topics.some((topic) => !topic.progress?.completed));
  });
  const current = firstIncomplete ?? exitLadder[exitLadder.length - 1];
  if (!current) return { code: null, name: null, readinessPct: 0 };
  const cutoff = ordered.findIndex((phase) => phase.id === current.linked_phase);
  const upTo = cutoff >= 0 ? ordered.slice(0, cutoff + 1) : [];
  const total = upTo.reduce((sum, phase) => sum + phase.topics.length, 0);
  const completed = upTo.reduce((sum, phase) => sum + phase.topics.filter((topic) => topic.progress?.completed).length, 0);
  return {
    code: current.exit_code,
    name: current.name,
    readinessPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function computeCareerPlanSnapshot(input: {
  settings?: CareerPlanSettings;
  logs: DailyLog[];
  phases: PhaseWithTopics[];
  exitLadder: ExitLadderRow[];
  planPosition: PlanPosition | null;
  today?: string;
}): CareerPlanSnapshot {
  const today = input.today ?? isoToday();
  const startDate = getEffectivePlanStart(input.settings, input.logs);
  const deadlineDate = input.settings?.career_plan_deadline_date ?? addMonths(startDate, 24);
  const monthNumber = Math.min(24, monthsBetween(startDate, today) + 1);
  const ordered = [...input.phases].sort((a, b) => a.order_index - b.order_index);
  const totalTopics = ordered.reduce((sum, phase) => sum + phase.topics.length, 0);
  const completedTopics = ordered.reduce((sum, phase) => sum + phase.topics.filter((topic) => topic.progress?.completed).length, 0);
  const completedPhases = ordered.filter((phase) => phase.topics.length > 0 && phase.topics.every((topic) => topic.progress?.completed)).length;
  const currentPhase = ordered.find((phase) => phase.topics.some((topic) => !topic.progress?.completed)) ?? ordered[ordered.length - 1];
  const currentExit = deriveCurrentExit(ordered, input.exitLadder);
  return {
    startDate,
    deadlineDate,
    monthNumber,
    monthLabel: `Month ${monthNumber}`,
    daysRemaining: daysBetween(today, deadlineDate),
    actualHours: input.logs.reduce((sum, log) => sum + Number(log.hours), 0),
    completedTopics,
    totalTopics,
    topicsPct: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
    completedPhases,
    totalPhases: ordered.length,
    currentPhaseTitle: currentPhase?.title ?? null,
    currentPhaseNumber: currentPhase?.phase_number ?? null,
    currentExitCode: currentExit.code,
    currentExitName: currentExit.name,
    currentExitReadinessPct: currentExit.readinessPct,
    planPosition: input.planPosition,
  };
}

export function formatPlanDate(dateISO: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateISO}T00:00:00`));
}

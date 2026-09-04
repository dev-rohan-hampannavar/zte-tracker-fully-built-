import type { Goal, TopicWithProgress, SkillWithFreshnessLike, InterviewWeakness, CareerTrackerRow } from "@/types/database";

/**
 * Adaptive Daily Planner (master spec rule #7). Deliberately a pure
 * function over data every other feature in this build already fetches —
 * active goals (Phase 1), skill evidence/freshness (Phase 4), interview
 * weaknesses (Phase 6), the next roadmap topic (existing Daily Mission),
 * and applications with upcoming interviews (Phase 3) — rather than a new
 * "planner" table or service. There's nothing here that could disagree
 * with what /goals, /skills, /interview-prep, or Daily Mission already
 * show, because it's built from literally the same hook outputs.
 *
 * Priority order follows the spec directly: deadline-critical work >
 * weak skills > due revision > project work > interview prep > lower-
 * priority learning. Each generated task carries the real reason it was
 * included, so the plan is inspectable rather than a black box.
 */

export type PlanTaskKind = "goal_deadline" | "weak_skill" | "revision" | "project" | "interview_prep" | "learning";

export interface PlanTask {
  kind: PlanTaskKind;
  // Deterministic natural key within `kind` (a goal id, topic id, skill
  // name, etc.) — combined with `kind` and the plan date by the UI layer
  // to form the task_key that daily_plan_task_state rows are keyed on.
  // Two different renders of "today's plan" that both surface, say, the
  // same overdue topic must produce the same naturalKey so completion
  // state is recognized as the same task rather than a new one each time.
  naturalKey: string;
  title: string;
  reason: string;
  estimatedMinutes: number;
  href: string;
  // Present only when this task can be started as a real focus session
  // against a specific curriculum item — lets the UI wire a "Start" button
  // straight into startFocusSession() instead of just linking away.
  activity: StudySessionActivityLike | null;
  topicId: string | null;
  stageProjectId: string | null;
}

// Kept as a local literal union (not importing StudySessionActivity from
// types/database) so this module — a pure function with no Supabase
// dependency today — doesn't pick one up just for a type alias. Values
// must stay in sync with StudySessionActivity in types/database.ts.
type StudySessionActivityLike = "learn" | "practice" | "project" | "revision" | "dsa" | "other";

interface GeneratePlanInput {
  availableMinutes: number;
  goals: Goal[];
  overdueRevisionTopics: TopicWithProgress[];
  weakestSkills: SkillWithFreshnessLike[];
  staleSkillCount: number;
  interviewWeaknesses: InterviewWeakness[];
  applicationsWithUpcomingInterview: CareerTrackerRow[];
  currentProjectTitle: string | null;
  currentProjectStageProjectId: string | null;
  nextTopicTitle: string | null;
  nextTopicId: string | null;
  historicalCompletionRate: number | null; // 0-1, or null if not enough history
}

export interface GeneratedPlan {
  tasks: PlanTask[];
  totalPlannedMinutes: number;
  loadAdjusted: boolean; // true if availableMinutes was scaled down due to poor historical completion
  adjustmentNote: string | null;
  // true if the strict budget fill produced nothing and the Minimum
  // Viable Day fallback (single cheapest candidate) was used instead —
  // the only case where totalPlannedMinutes can exceed availableMinutes.
  minimumViableDay: boolean;
}

/**
 * If the person has a track record of not finishing what they plan
 * (historicalCompletionRate well under 1), scale down the minutes offered
 * to tasks rather than keep generating plans they won't finish — this is
 * the "adapt to reality rather than continually generating unrealistic
 * schedules" behavior from the spec. Only kicks in with a real, computed
 * rate; never assumed.
 */
function adjustedAvailableMinutes(availableMinutes: number, completionRate: number | null): { minutes: number; adjusted: boolean } {
  if (completionRate === null || completionRate >= 0.6) {
    return { minutes: availableMinutes, adjusted: false };
  }
  // Below 60% historical completion: scale toward what's actually been
  // achievable, floored at 50% of the ask so the plan is never trivial.
  const scale = Math.max(0.5, completionRate + 0.2);
  return { minutes: Math.round(availableMinutes * scale), adjusted: true };
}

export function generateDailyPlan(input: GeneratePlanInput): GeneratedPlan {
  const { minutes: budget, adjusted } = adjustedAvailableMinutes(input.availableMinutes, input.historicalCompletionRate);

  const candidates: PlanTask[] = [];

  // 1. Deadline-critical: goals due within 3 days
  const now = Date.now();
  for (const g of input.goals) {
    if (g.status !== "active" || !g.target_date) continue;
    const daysLeft = Math.ceil((new Date(g.target_date).getTime() - now) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 3) {
      candidates.push({
        kind: "goal_deadline",
        naturalKey: g.id,
        title: `Work on: ${g.title}`,
        reason: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        estimatedMinutes: 45,
        href: "/goals",
        activity: null,
        topicId: null,
        stageProjectId: null,
      });
    }
  }

  // 2. Weak skills (lowest knowledge_pct first, real evidence only)
  for (const s of input.weakestSkills.slice(0, 2)) {
    candidates.push({
      kind: "weak_skill",
      naturalKey: s.technology_name,
      title: `Strengthen ${s.technology_name}`,
      reason: `Currently ${s.technology_name} evidence is at ${s.knowledge_pct}%`,
      estimatedMinutes: 30,
      href: "/skills",
      activity: "practice",
      topicId: null,
      stageProjectId: null,
    });
  }

  // 3. Due revision (overdue topics)
  if (input.overdueRevisionTopics.length > 0) {
    const topic = input.overdueRevisionTopics[0];
    candidates.push({
      kind: "revision",
      naturalKey: topic.id,
      title: `Revise: ${topic.title}`,
      reason: `${input.overdueRevisionTopics.length} topic${input.overdueRevisionTopics.length === 1 ? " is" : "s are"} overdue for revision`,
      estimatedMinutes: 20,
      href: "/revision",
      activity: "revision",
      topicId: topic.id,
      stageProjectId: null,
    });
  }

  // 3b. Stale skills — same priority tier as due revision, since a stale
  // skill IS a form of due revision, just tracked via a different system.
  if (input.staleSkillCount > 0) {
    candidates.push({
      kind: "revision",
      naturalKey: "stale-skills",
      title: "Review stale skills",
      reason: `${input.staleSkillCount} skill${input.staleSkillCount === 1 ? " hasn't" : "s haven't"} been touched recently`,
      estimatedMinutes: 20,
      href: "/skills",
      activity: "revision",
      topicId: null,
      stageProjectId: null,
    });
  }

  // 4. Project work
  if (input.currentProjectTitle) {
    candidates.push({
      kind: "project",
      naturalKey: input.currentProjectStageProjectId ?? input.currentProjectTitle,
      title: `Continue: ${input.currentProjectTitle}`,
      reason: "Project currently in progress",
      estimatedMinutes: 60,
      href: "/projects",
      activity: "project",
      topicId: null,
      stageProjectId: input.currentProjectStageProjectId,
    });
  }

  // 5. Interview preparation — real weaknesses first, then upcoming
  // interviews as a general reminder to prep.
  for (const w of input.interviewWeaknesses.slice(0, 2)) {
    candidates.push({
      kind: "interview_prep",
      naturalKey: w.concept_tag,
      title: `Practice: ${w.concept_tag}`,
      reason: `${w.accuracy_pct}% accuracy over ${w.attempts} attempt${w.attempts === 1 ? "" : "s"}`,
      estimatedMinutes: 20,
      href: "/interview-prep",
      activity: "other",
      topicId: null,
      stageProjectId: null,
    });
  }
  for (const app of input.applicationsWithUpcomingInterview.slice(0, 1)) {
    candidates.push({
      kind: "interview_prep",
      naturalKey: app.id,
      title: `Prep for ${app.company} interview`,
      reason: "Interview scheduled soon",
      estimatedMinutes: 30,
      href: "/interviews",
      activity: "other",
      topicId: null,
      stageProjectId: null,
    });
  }

  // 6. Lower-priority learning: next curriculum topic, always last
  if (input.nextTopicTitle) {
    candidates.push({
      kind: "learning",
      naturalKey: input.nextTopicId ?? input.nextTopicTitle,
      title: `Learn: ${input.nextTopicTitle}`,
      reason: "Next topic in your roadmap",
      estimatedMinutes: 45,
      href: "/roadmap",
      activity: "learn",
      topicId: input.nextTopicId,
      stageProjectId: null,
    });
  }

  // Fill the budget in priority order (candidates are already pushed in
  // priority order above, so a stable greedy fill respects rule #7's
  // ordering without needing a separate sort/weight step).
  //
  // Must never generate a plan whose totalPlannedMinutes exceeds the
  // requested budget (master spec P0: "never generate tasks beyond
  // available capacity"). A naive "stop once remaining <= 0" loop admits
  // whatever candidate happens to be current when time runs out, even if
  // that candidate's own estimate overshoots what's left — e.g. budget=30
  // with a 45-minute top-priority candidate would still push all 45
  // minutes onto a 30-minute day. Instead: skip any candidate that
  // doesn't fit in what remains, and keep checking lower-priority (but
  // possibly smaller) candidates against the shrinking remainder, so a
  // short low-priority task can still fill a gap a long high-priority one
  // couldn't — without ever pushing the total over budget.
  const tasks: PlanTask[] = [];
  let remaining = budget;
  for (const c of candidates) {
    if (c.estimatedMinutes <= remaining) {
      tasks.push(c);
      remaining -= c.estimatedMinutes;
    }
  }

  // Minimum Viable Day (master spec section 8): a low-capacity budget
  // (e.g. 15 minutes) can leave every real candidate too big to fit,
  // producing an empty plan even though there's clearly something the
  // person could still do. Rather than show nothing, surface the single
  // cheapest candidate — still respecting priority order as the
  // tie-breaker — even though it slightly overshoots the stated budget.
  // This only fires when the strict fill above found nothing at all; a
  // budget that fit even one candidate never reaches this branch, so the
  // "never exceed budget" guarantee above still holds for every normal
  // day.
  let minimumViableDay = false;
  if (tasks.length === 0 && candidates.length > 0 && budget > 0) {
    const cheapest = [...candidates].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0];
    tasks.push(cheapest);
    minimumViableDay = true;
  }

  return {
    tasks,
    totalPlannedMinutes: tasks.reduce((s, t) => s + t.estimatedMinutes, 0),
    loadAdjusted: adjusted,
    adjustmentNote: adjusted
      ? "Your planned time was reduced based on how much you've actually completed on past plans — better a shorter list you finish than a long one you don't."
      : null,
    minimumViableDay,
  };
}

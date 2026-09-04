// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If the schema changes, regenerate with `supabase gen types typescript` and
// reconcile with this file.

export interface RoadmapMetadata {
  id: number;
  title: string;
  total_phases: number;
  total_topics: number;
  total_stages: number | null;
  total_capstones: number | null;
  total_stage_projects: number | null;
  total_stage_exercises: number | null;
  total_companies: number | null;
  total_technologies: number | null;
  total_advanced_projects: number | null;
  total_realistic_hours: number;
  source_stated_hours: number | null;
  months_at_40hrs_week: number | null;
  dsa_easy_target: number;
  dsa_medium_target: number;
  version: number;
  updated_at: string;
  part1_parsed: boolean;
  quick_start_checklist_items: number | null;
  why_this_works_rows: number | null;
  master_phase_table_rows: number | null;
  skill_track_count: number | null;
}

export interface Phase {
  id: string;
  phase_number: string;
  title: string;
  band: string | null;
  description: string | null;
  estimated_hours: number | null;
  exit_point_code: string | null;
  build_in_public_prompt: string | null;
  skip_build_in_public: boolean;
  order_index: number;
  created_at: string;
}

export interface Topic {
  id: string;
  phase_id: string;
  stage_id: string | null;
  order_index: number;
  title: string;
  estimated_hours: number | null;
  heading_number: number | null;
  intro: string | null;
  created_at: string;
}

export interface Stage {
  id: string;
  phase_id: string;
  stage_number: number;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  order_index: number;
  created_at: string;
}

export interface TopicGroup {
  id: string;
  topic_id: string;
  heading: string | null;
  order_index: number;
  created_at: string;
}

export interface TopicGroupBullet {
  id: string;
  topic_group_id: string;
  content: string;
  order_index: number;
}

export type ProjectDifficulty = "easy" | "medium" | "hard";

export interface StageProject {
  id: string;
  stage_id: string;
  name: string;
  difficulty: ProjectDifficulty;
  description: string;
  created_at: string;
}

export interface StageExercise {
  id: string;
  stage_id: string;
  description: string;
  created_at: string;
}

export interface Capstone {
  id: string;
  phase_id: string;
  name: string;
  title: string;
  description: string;
  created_at: string;
}

export interface ClientSyncMilestone {
  id: string;
  linked_phase: string | null;
  description: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  category: string | null;
  hiring_stage: string | null;
  typical_tech_stack: string[] | null;
  hiring_difficulty: "low" | "medium" | "high" | null;
  notes: string | null;
  created_at: string;
}

export interface Technology {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface TopicTechnology {
  topic_id: string;
  technology_id: string;
}

export interface AdvancedProjectSkillMapping {
  feature: string;
  phase: string;
}

export type AdvancedProjectStatus = "not_started" | "considering" | "in_progress" | "completed" | "abandoned";

export interface AdvancedProject {
  id: string;
  order_index: number;
  name: string;
  tagline: string;
  problem: string;
  who_exactly: string;
  what_exists: string;
  the_gap: string;
  core_features: string[];
  advanced_features: string[];
  skill_mapping: AdvancedProjectSkillMapping[];
  monetization: string;
  first_users: string;
  created_at: string;
}

export interface AdvancedProjectProgress {
  user_id: string;
  project_id: string;
  status: AdvancedProjectStatus;
  github_url: string | null;
  deployment_url: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface ExerciseProgress {
  user_id: string;
  exercise_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface ManualItemCheck {
  user_id: string;
  day_number: number;
  section_title: string;
  item_index: number;
  checked_at: string;
}

export interface PublicStreakSummary {
  user_id: string;
  current_streak: number;
  best_streak: number;
  total_days_logged: number;
  updated_at: string;
}

export interface ExitLadderRow {
  exit_code: string;
  linked_phase: string | null;
  name: string | null;
  job_level: string | null;
  salary_range: string | null;
  target_companies: string | null;
  highlights: string | null;
  order_index: number;
}

// ---------- Part I reference content (P7.0) ----------

export interface WhoIsThisForRow {
  category: string;
  details: string;
}

export interface QuickStartChecklistItem {
  step: string;
  text: string;
}

export interface WeeklyPaceOption {
  weekly_hours: string;
  timeline: string;
  best_fit: string;
}

export interface PhaseSummary {
  phase_title: string;
  weeks: string | null;
  tech: string | null;
}

export interface DecisionMatrixRow {
  if_you_want: string;
  build_this: string;
}

export interface Orientation {
  id: number;
  overview: string | null;
  who_is_this_for: WhoIsThisForRow[];
  key_note: string | null;
  job_market_case: string | null;
  build_in_public_guide: string | null;
  quick_start_checklist: QuickStartChecklistItem[];
  critical_advice: string | null;
  weekly_pace_options: WeeklyPaceOption[];
  phase_summaries: PhaseSummary[];
  decision_matrix: DecisionMatrixRow[];
  decision_rule: string | null;
  updated_at: string;
}

export interface WhyThisWorksRow {
  id: string;
  failure_mode: string;
  mechanism: string;
  order_index: number;
}

export interface MasterPhaseTableRow {
  phase: string;
  focus: string;
  weeks: string | null;
  header_hours: string | null;
  realistic_hours: string | null;
  band: string | null;
  track: string | null;
  order_index: number;
}

export interface HoursBreakdownRow {
  phase: string;
  learn: string | null;
  problems: string | null;
  project: string | null;
  clientsync: string | null;
  realistic_total: string | null;
  order_index: number;
}

export interface ProgramTotal {
  id: number;
  original_stated: string | null;
  raw_bottom_up_sum: string | null;
  realistic_total: string | null;
  net_change: string | null;
}

export interface DifficultyRampRow {
  id: string;
  band: string;
  phase: string;
  title: string;
  order_index: number;
}

export interface SourceDiscrepancyRow {
  id: string;
  phase: string;
  discrepancy: string;
  order_index: number;
}

export interface SkillTrackRow {
  id: string;
  track: string;
  phases: string[];
  order_index: number;
}

export interface NavigationNotes {
  id: number;
  dsa_spine_index: string | null;
  mvp_fast_path: string[];
}

export interface MonthByMonthRow {
  id: string;
  month: string;
  phases_active: string;
  focus: string;
  realistic_hours: string | null;
  order_index: number;
}

export interface PhaseChecklistRow {
  phase: string;
  title: string;
  hours: string | null;
  weeks: string | null;
  order_index: number;
}

// ---------- Roadmap versioning / diff (P7.6) ----------

export interface RoadmapSnapshot {
  id: string;
  version: number;
  created_at: string;
  source_hash: string;
  phase_count: number;
  stage_count: number;
  topic_count: number;
}

export type SnapshotEntityType = "phase" | "stage" | "topic";

export interface RoadmapSnapshotEntity {
  id: string;
  snapshot_id: string;
  entity_type: SnapshotEntityType;
  entity_id: string;
  parent_id: string | null;
  title: string;
  order_index: number;
  estimated_hours: number | null;
}

// ---------- Resource library (P7.6) ----------

export type ResourceType = "doc" | "video" | "article" | "link";

export interface TopicResource {
  id: string;
  user_id: string | null;
  topic_id: string;
  title: string;
  url: string;
  resource_type: ResourceType;
  notes: string | null;
  curated: boolean;
  created_at: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type RevisionStatus = "needs_revision" | "comfortable" | "mastered";

export interface TopicProgress {
  user_id: string;
  topic_id: string;
  completed: boolean;
  completed_at: string | null;
  actual_minutes_spent: number;
  last_reviewed: string | null;
  difficulty: Difficulty | null;
  bookmarked: boolean;
  revision_status: RevisionStatus | null;
  review_count: number;
  next_review_due: string | null;
  last_confidence_rating: 1 | 2 | 3 | 4 | 5 | null;
  updated_at: string;
  evidence_url: string | null;
}

export interface TopicNote {
  id: string;
  user_id: string;
  topic_id: string;
  note: string;
  created_at: string;
}

export interface DailyLog {
  user_id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  note: string | null;
  learned: string | null;
  mistakes: string | null;
  wins: string | null;
  tomorrow_goal: string | null;
  updated_at: string;
  day_job_hours: number | null;
}

export type StudySessionActivity = "learn" | "practice" | "project" | "revision" | "dsa" | "other";

export interface StudySession {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  activity: StudySessionActivity;
  topic_id: string | null;
  stage_project_id: string | null;
  notes: string | null;
  logged_at: string;
  goal_id: string | null;
  milestone_id: string | null;
  is_tutorial: boolean | null;
}

// ---------- Focus sessions (live timers — Career OS Phase 2) ----------

export type FocusSessionMode = "stopwatch" | "countdown" | "pomodoro";
export type FocusSessionStatus = "running" | "paused" | "completed" | "abandoned";

export interface FocusSession {
  id: string;
  user_id: string;
  mode: FocusSessionMode;
  status: FocusSessionStatus;
  planned_seconds: number | null;
  elapsed_seconds: number;
  activity: StudySessionActivity;
  goal_id: string | null;
  milestone_id: string | null;
  topic_id: string | null;
  stage_project_id: string | null;
  // Links this session back to the daily_plan_task_state row it was
  // started for (via PlanTaskRow's Start button), so completing the
  // timer can also complete that plan task in the same DB transaction —
  // see complete_focus_session in migration 0056. Null when the session
  // was started from the standalone FocusTimer with no plan task in
  // context.
  plan_task_key: string | null;
  notes: string | null;
  started_at: string;
  last_resumed_at: string;
  ended_at: string | null;
  logged_study_session_id: string | null;
  updated_at: string;
}

// ---------- Daily plan task state (Daily Operating System — Phase 1) ----------
// Tracks the outcome of a generated PlanTask "slot" for a given day. The
// PlanTask itself (src/lib/daily-planner.ts) stays a derived, in-memory
// object recomputed from live data every render — this table only records
// what happened to it (pending/in_progress/completed/skipped), never a
// second copy of the underlying goal/topic/skill data.

// "carried_forward" (added in migration 0057) marks a prior day's pending
// row as superseded once its task has a live row on a later day — it is
// NOT "still open" (unlike pending/in_progress) and should be excluded
// from any "incomplete"/"blockers" count, since the live copy on the
// later date is what represents that task now. It exists (rather than
// deleting the old row) purely so carried_from_date history stays
// queryable.
export type DailyPlanTaskStatus = "pending" | "in_progress" | "completed" | "skipped" | "carried_forward";

// Mirrors PlanTaskKind in src/lib/daily-planner.ts — duplicated as a
// literal union (not imported) since that module isn't part of the
// database type layer and this avoids a cross-layer import for one type.
export type DailyPlanTaskKind = "goal_deadline" | "weak_skill" | "revision" | "project" | "interview_prep" | "learning";

export interface DailyPlanTaskState {
  user_id: string;
  plan_date: string; // YYYY-MM-DD
  task_key: string; // `${kind}:${naturalKey}` — deterministic, client-computed
  kind: DailyPlanTaskKind;
  title: string;
  status: DailyPlanTaskStatus;
  estimated_minutes: number;
  actual_minutes: number | null;
  notes: string | null;
  study_session_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  carried_from_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionHistory {
  id: string;
  user_id: string;
  topic_id: string;
  confidence_rating: 1 | 2 | 3 | 4 | 5;
  reviewed_at: string;
  resulting_tier: string;
}

export type ProjectStatus = "not_started" | "in_progress" | "completed";

export interface ProjectProgress {
  user_id: string;
  phase_id: string;
  github_url: string | null;
  deployment_url: string | null;
  demo_url: string | null;
  screenshots: string[];
  status: ProjectStatus;
  notes: string | null;
  // Recruiter-facing evidence fields (migration 0061, spec section 31) —
  // separate structured fields rather than folding into notes, so they
  // can render as distinct labeled sections instead of one undifferentiated
  // paragraph.
  problem_statement: string | null;
  architecture_notes: string | null;
  contribution_notes: string | null;
  challenges_notes: string | null;
  tradeoffs_notes: string | null;
  metrics_notes: string | null;
  testing_notes: string | null;
  documentation_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface BuildInPublicStatus {
  user_id: string;
  phase_id: string;
  posted: boolean;
  proof_url: string | null;
  posted_at: string | null;
}

export interface DsaProgressRow {
  id: string;
  user_id: string;
  problem_name: string;
  difficulty: Difficulty;
  topic_tag: string | null;
  url: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  // ---- Phase 3: DSA Intelligence (0042_dsa_intelligence.sql) ----
  pattern: string | null;
  attempts: number;
  time_taken_minutes: number | null;
  hints_used: number;
  solution_viewed: boolean;
  mistakes: string | null;
  confidence: 1 | 2 | 3 | 4 | 5 | null;
  revision_status: RevisionStatus | null;
  review_count: number;
  next_review_due: string | null;
  last_reviewed_at: string | null;
}

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "screening"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface CareerTrackerRow {
  id: string;
  user_id: string;
  company: string;
  role: string | null;
  application_status: ApplicationStatus;
  interview_date: string | null;
  offer: boolean;
  resume_version: string | null;
  notes: string | null;
  applied_at: string | null;
  updated_at: string;
  job_url: string | null;
  location: string | null;
  salary_range: string | null;
  job_description: string | null;
  tech_stack: string[];
  recruiter_name: string | null;
  recruiter_contact: string | null;
  follow_up_date: string | null;
  rejection_reason: string | null;
  source: string | null;
  career_plan: "plan_a" | "plan_b";
}

export interface CareerDecision {
  id: string;
  user_id: string;
  decision: "go" | "no-go" | "insufficient-evidence";
  action_taken: "accepted_go" | "accepted_no_go" | "deferred";
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface ApplicationMetricsByPlan {
  user_id: string;
  career_plan: "plan_a" | "plan_b";
  total_applications: number;
  active_applications: number;
  responded_applications: number;
  reached_interview_count: number;
  offer_count: number;
  rejected_count: number;
  response_rate_pct: number;
  interview_rate_pct: number;
  offer_rate_pct: number;
}

export type InterviewRoundType =
  | "oa"
  | "recruiter_screen"
  | "technical"
  | "system_design"
  | "behavioral"
  | "hr"
  | "final"
  | "other";
export type InterviewRoundResult = "pending" | "passed" | "failed" | "cancelled";

export interface InterviewRound {
  id: string;
  application_id: string;
  user_id: string;
  round_type: InterviewRoundType;
  scheduled_at: string | null;
  completed: boolean;
  result: InterviewRoundResult;
  notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationMetrics {
  user_id: string;
  total_applications: number;
  active_applications: number;
  responded_applications: number;
  past_applied_count: number;
  reached_interview_count: number;
  offer_count: number;
  rejected_count: number;
  response_rate_pct: number;
  interview_rate_pct: number;
  offer_rate_pct: number;
  rejection_rate_pct: number;
}

// ---------- Skill evidence engine (Career OS Phase 4) ----------

export interface SkillFreshnessConfig {
  id: number;
  fresh_within_days: number;
  aging_within_days: number;
}

export interface UserSkill {
  id: string;
  user_id: string;
  technology_id: string | null;
  custom_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillEvidence {
  user_id: string;
  technology_id: string;
  technology_name: string;
  technology_category: string | null;
  lessons_total: number;
  lessons_completed: number;
  knowledge_pct: number;
  last_reviewed_at: string | null;
  last_completed_at: string | null;
  project_count: number;
}

// ---------- Project-Skill mapping (Career OS Phase 5) ----------

export interface ProjectSkill {
  id: string;
  user_id: string;
  phase_id: string | null;
  advanced_project_id: string | null;
  technology_id: string;
  created_at: string;
}

// ---------- Job Readiness Score (Career OS Phase 5) ----------

export interface TargetRole {
  id: string;
  name: string;
  description: string | null;
}

export interface RoleSkillRequirement {
  role_id: string;
  technology_id: string;
  weight: number;
}

// ---------- Interview Preparation Engine (Career OS Phase 6) ----------

export type InterviewAttemptResult = "correct" | "partial" | "incorrect";

export interface InterviewQuestion {
  id: string;
  technology_id: string | null;
  round_type: InterviewRoundType;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  concept_tag: string | null;
  linked_topic_id: string | null;
  created_at: string;
}

export interface InterviewAttempt {
  id: string;
  user_id: string;
  question_id: string;
  interview_round_id: string | null;
  result: InterviewAttemptResult;
  notes: string | null;
  attempted_at: string;
}

export interface InterviewWeakness {
  user_id: string;
  technology_id: string | null;
  technology_name: string | null;
  concept_tag: string;
  linked_topic_id: string | null;
  attempts: number;
  correct_count: number;
  accuracy_pct: number;
  last_attempted_at: string;
}

export interface InterviewReadinessByRole {
  user_id: string;
  role_id: string;
  attempts: number;
  accuracy_pct: number;
}

// ---------- Notification persistence (Career OS Phase 7) ----------

export type NotificationDismissAction = "read" | "snoozed" | "deleted";

export interface NotificationDismissal {
  id: string;
  user_id: string;
  notification_id: string;
  action: NotificationDismissAction;
  snoozed_until: string | null;
  created_at: string;
}

// ---------- Activity History / Undo (Career OS Phase 8) ----------

export type ActivityAction =
  | "topic_completed"
  | "goal_created"
  | "goal_updated"
  | "goal_completed"
  | "milestone_completed"
  | "project_started"
  | "project_completed"
  | "task_deleted"
  | "application_created"
  | "application_status_changed"
  | "application_deleted"
  | "interview_completed"
  | "skill_added"
  | "skill_removed"
  | "dsa_problem_solved"
  | "revision_completed"
  | "career_target_changed"
  | "weekly_commitment_created";

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string;
  summary: string;
  undo_payload: Record<string, unknown> | null;
  undone: boolean;
  created_at: string;
}

// ---------- Community Leaderboard (P2) ----------

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  public_profile_bio: string | null;
  public_profile_slug: string | null;
  phases_completed: number;
  current_streak: number;
  best_streak: number;
  total_days_logged: number;
}

export type SkillFreshnessState = "fresh" | "aging" | "stale" | "never";

/** Minimal shape job-readiness.ts needs from a skill-evidence row — kept
 * separate from the richer SkillWithFreshness hook type so the readiness
 * calculator doesn't couple to hook internals. */
export interface SkillWithFreshnessLike {
  technology_id: string;
  technology_name: string;
  knowledge_pct: number;
}

export interface SkillFreshness {
  user_id: string;
  technology_id: string;
  technology_name: string;
  last_activity_at: string | null;
  freshness: SkillFreshnessState;
}

// ---------- Goals / Milestones (Career OS Phase 1) ----------

export type GoalPriority = "low" | "medium" | "high" | "critical";
export type GoalStatus = "active" | "paused" | "completed" | "abandoned";
export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  deadline: string | null;
  order_index: number;
  linked_topic_id: string | null;
  linked_stage_project_id: string | null;
  linked_advanced_project_id: string | null;
  linked_skill_slugs: string[];
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface MilestoneDependency {
  milestone_id: string;
  depends_on_milestone_id: string;
}

export interface GoalProgress {
  goal_id: string;
  user_id: string;
  milestone_count: number;
  milestones_completed: number;
  progress_pct: number;
}

export interface GoalWithMilestones extends Goal {
  milestones: Milestone[];
  progress_pct: number;
}

export interface PinnedItem {
  type: "topic" | "project" | "clientsync_milestone";
  id: string;
  label: string;
  pinned_at: string;
}

export interface UserSettings {
  user_id: string;
  weekly_goal_type: "hours" | "topics";
  weekly_goal_value: number;
  theme: "light" | "dark" | "system";
  last_opened_page: string | null;
  last_opened_phase: string | null;
  last_expanded_accordion: string[] | null;
  public_profile_enabled: boolean;
  public_profile_slug: string | null;
  display_name: string | null;
  public_profile_bio: string | null;
  github_username: string | null;
  weekly_summary_enabled: boolean;
  weekly_summary_recipient_email: string | null;
  weekly_summary_recipient_name: string | null;
  weekly_summary_last_sent_at: string | null;
  developer_mode: boolean;
  topic_locking_disabled: boolean;
  pinned_items: PinnedItem[];
  dashboard_tour_seen: boolean;
  timezone: string;
  career_plan_version: string;
  career_plan_track: "plan_a" | "plan_b";
  career_plan_start_date: string | null;
  career_plan_deadline_date: string | null;
  career_plan_weekly_hours: number;
  career_plan_flagship_project: string;
  // Per-kind notification opt-out (migration 0059) — distinct from
  // per-instance dismiss/snooze in notification_dismissals.
  muted_notification_kinds: string[];
  updated_at: string;
}

// ---------- Execution OS (Career Strategy expansion) ----------

export type CommitmentDomain = "engineering" | "project" | "dsa" | "career" | "operations";
export type CommitmentStatus = "pending" | "completed" | "skipped";

export interface WeeklyCommitment {
  id: string;
  user_id: string;
  week_start: string;
  title: string;
  domain: CommitmentDomain;
  status: CommitmentStatus;
  notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type TimeBlockType = "engineering" | "project" | "dsa" | "career" | "operations" | "rest";
export type TimeBlockStatus = "planned" | "completed" | "skipped";

export interface TimeBlock {
  id: string;
  user_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  title: string;
  block_type: TimeBlockType;
  status: TimeBlockStatus;
  topic_id: string | null;
  phase_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EvidenceType = "github" | "deployment" | "certificate" | "screenshot" | "interview" | "resume" | "other";

export interface EvidenceItem {
  id: string;
  user_id: string;
  title: string;
  evidence_type: EvidenceType;
  url: string | null;
  description: string | null;
  tags: string[];
  topic_id: string | null;
  phase_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialProfile {
  user_id: string;
  monthly_income: number;
  monthly_expenses: number;
  savings: number;
  emergency_months: number;
  minimum_switch_salary: number;
  updated_at: string;
}

export type StudyEventActivity = "learn" | "practice" | "project" | "revision" | "dsa" | "other";
export type StudyEventSource = "MANUAL" | "FOCUS_TIMER" | "DAILY_PLAN" | "IMPORT" | "SYSTEM";

export interface StudyEvent {
  id: string;
  user_id: string;
  occurred_at: string;
  event_date: string;
  timezone: string;
  duration_minutes: number;
  activity_type: StudyEventActivity;
  topic_id: string | null;
  stage_project_id: string | null;
  dsa_problem_id: string | null;
  plan_task_key: string | null;
  source: StudyEventSource;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------- Derived / joined view models used by the UI ----------

export interface TopicGroupWithBullets extends TopicGroup {
  bullets: TopicGroupBullet[];
}

export interface TopicWithProgress extends Topic {
  progress: TopicProgress | null;
  groups?: TopicGroupWithBullets[];
}

export interface StageWithTopics extends Stage {
  topics: TopicWithProgress[];
  projects: StageProject[];
  exercises: StageExercise[];
}

export interface PhaseWithTopics extends Phase {
  topics: TopicWithProgress[];
  stages?: StageWithTopics[];
  capstone?: Capstone | null;
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      roadmap_metadata: {
        Row: RoadmapMetadata;
        Insert: Partial<RoadmapMetadata> & { id: number; title: string; total_phases: number; total_topics: number; total_realistic_hours: number };
        Update: Partial<RoadmapMetadata>;
        Relationships: [];
      };
      phases: {
        Row: Phase;
        Insert: Partial<Phase> & { id: string; phase_number: string; title: string; order_index: number };
        Update: Partial<Phase>;
        Relationships: [];
      };
      topics: {
        Row: Topic;
        Insert: Partial<Topic> & { id: string; phase_id: string; order_index: number; title: string };
        Update: Partial<Topic>;
        Relationships: [];
      };
      stages: {
        Row: Stage;
        Insert: Partial<Stage> & { id: string; phase_id: string; stage_number: number; title: string; order_index: number };
        Update: Partial<Stage>;
        Relationships: [];
      };
      topic_groups: {
        Row: TopicGroup;
        Insert: Partial<TopicGroup> & { topic_id: string; order_index: number };
        Update: Partial<TopicGroup>;
        Relationships: [];
      };
      topic_group_bullets: {
        Row: TopicGroupBullet;
        Insert: Partial<TopicGroupBullet> & { topic_group_id: string; content: string; order_index: number };
        Update: Partial<TopicGroupBullet>;
        Relationships: [];
      };
      stage_projects: {
        Row: StageProject;
        Insert: Partial<StageProject> & { id: string; stage_id: string; name: string; difficulty: ProjectDifficulty; description: string };
        Update: Partial<StageProject>;
        Relationships: [];
      };
      stage_exercises: {
        Row: StageExercise;
        Insert: Partial<StageExercise> & { id: string; stage_id: string; description: string };
        Update: Partial<StageExercise>;
        Relationships: [];
      };
      capstones: {
        Row: Capstone;
        Insert: Partial<Capstone> & { id: string; phase_id: string; name: string; title: string; description: string };
        Update: Partial<Capstone>;
        Relationships: [];
      };
      clientsync_milestones: {
        Row: ClientSyncMilestone;
        Insert: Partial<ClientSyncMilestone> & { id: string; description: string };
        Update: Partial<ClientSyncMilestone>;
        Relationships: [];
      };
      companies: {
        Row: Company;
        Insert: Partial<Company> & { id: string; name: string };
        Update: Partial<Company>;
        Relationships: [];
      };
      technologies: {
        Row: Technology;
        Insert: Partial<Technology> & { id: string; name: string };
        Update: Partial<Technology>;
        Relationships: [];
      };
      topic_technologies: {
        Row: TopicTechnology;
        Insert: TopicTechnology;
        Update: Partial<TopicTechnology>;
        Relationships: [];
      };
      advanced_projects: {
        Row: AdvancedProject;
        Insert: Partial<AdvancedProject> & { id: string; order_index: number; name: string; tagline: string };
        Update: Partial<AdvancedProject>;
        Relationships: [];
      };
      advanced_project_progress: {
        Row: AdvancedProjectProgress;
        Insert: Partial<AdvancedProjectProgress> & { user_id: string; project_id: string };
        Update: Partial<AdvancedProjectProgress>;
        Relationships: [];
      };
      exercise_progress: {
        Row: ExerciseProgress;
        Insert: Partial<ExerciseProgress> & { user_id: string; exercise_id: string };
        Update: Partial<ExerciseProgress>;
        Relationships: [];
      };
      exit_ladder: {
        Row: ExitLadderRow;
        Insert: Partial<ExitLadderRow> & { exit_code: string };
        Update: Partial<ExitLadderRow>;
        Relationships: [];
      };
      orientation: {
        Row: Orientation;
        Insert: Partial<Orientation> & { id: number };
        Update: Partial<Orientation>;
        Relationships: [];
      };
      why_this_works: {
        Row: WhyThisWorksRow;
        Insert: Partial<WhyThisWorksRow> & { failure_mode: string; mechanism: string };
        Update: Partial<WhyThisWorksRow>;
        Relationships: [];
      };
      master_phase_table: {
        Row: MasterPhaseTableRow;
        Insert: Partial<MasterPhaseTableRow> & { phase: string; focus: string };
        Update: Partial<MasterPhaseTableRow>;
        Relationships: [];
      };
      hours_breakdown: {
        Row: HoursBreakdownRow;
        Insert: Partial<HoursBreakdownRow> & { phase: string };
        Update: Partial<HoursBreakdownRow>;
        Relationships: [];
      };
      program_total: {
        Row: ProgramTotal;
        Insert: Partial<ProgramTotal> & { id: number };
        Update: Partial<ProgramTotal>;
        Relationships: [];
      };
      difficulty_ramp: {
        Row: DifficultyRampRow;
        Insert: Partial<DifficultyRampRow> & { band: string; phase: string; title: string };
        Update: Partial<DifficultyRampRow>;
        Relationships: [];
      };
      source_discrepancies: {
        Row: SourceDiscrepancyRow;
        Insert: Partial<SourceDiscrepancyRow> & { phase: string; discrepancy: string };
        Update: Partial<SourceDiscrepancyRow>;
        Relationships: [];
      };
      skill_tracks: {
        Row: SkillTrackRow;
        Insert: Partial<SkillTrackRow> & { track: string };
        Update: Partial<SkillTrackRow>;
        Relationships: [];
      };
      navigation_notes: {
        Row: NavigationNotes;
        Insert: Partial<NavigationNotes> & { id: number };
        Update: Partial<NavigationNotes>;
        Relationships: [];
      };
      month_by_month: {
        Row: MonthByMonthRow;
        Insert: Partial<MonthByMonthRow> & { month: string; phases_active: string; focus: string };
        Update: Partial<MonthByMonthRow>;
        Relationships: [];
      };
      phase_checklist: {
        Row: PhaseChecklistRow;
        Insert: Partial<PhaseChecklistRow> & { phase: string; title: string };
        Update: Partial<PhaseChecklistRow>;
        Relationships: [];
      };
      roadmap_snapshots: {
        Row: RoadmapSnapshot;
        Insert: Partial<RoadmapSnapshot> & { version: number; source_hash: string; phase_count: number; stage_count: number; topic_count: number };
        Update: Partial<RoadmapSnapshot>;
        Relationships: [];
      };
      roadmap_snapshot_entities: {
        Row: RoadmapSnapshotEntity;
        Insert: Partial<RoadmapSnapshotEntity> & { snapshot_id: string; entity_type: SnapshotEntityType; entity_id: string; title: string; order_index: number };
        Update: Partial<RoadmapSnapshotEntity>;
        Relationships: [];
      };
      topic_resources: {
        Row: TopicResource;
        Insert: Partial<TopicResource> & { user_id: string; topic_id: string; title: string; url: string };
        Update: Partial<TopicResource>;
        Relationships: [];
      };
      topic_progress: {
        Row: TopicProgress;
        Insert: Partial<TopicProgress> & { user_id: string; topic_id: string };
        Update: Partial<TopicProgress>;
        Relationships: [];
      };
      topic_notes: {
        Row: TopicNote;
        Insert: Partial<TopicNote> & { user_id: string; topic_id: string; note: string };
        Update: Partial<TopicNote>;
        Relationships: [];
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Partial<DailyLog> & { user_id: string; date: string };
        Update: Partial<DailyLog>;
        Relationships: [];
      };
      project_progress: {
        Row: ProjectProgress;
        Insert: Partial<ProjectProgress> & { user_id: string; phase_id: string };
        Update: Partial<ProjectProgress>;
        Relationships: [];
      };
      build_in_public_status: {
        Row: BuildInPublicStatus;
        Insert: Partial<BuildInPublicStatus> & { user_id: string; phase_id: string };
        Update: Partial<BuildInPublicStatus>;
        Relationships: [];
      };
      dsa_progress: {
        Row: DsaProgressRow;
        Insert: Partial<DsaProgressRow> & { user_id: string; problem_name: string; difficulty: Difficulty };
        Update: Partial<DsaProgressRow>;
        Relationships: [];
      };
      career_tracker: {
        Row: CareerTrackerRow;
        Insert: Partial<CareerTrackerRow> & { user_id: string; company: string };
        Update: Partial<CareerTrackerRow>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & { user_id: string };
        Update: Partial<UserSettings>;
        Relationships: [];
      };
      study_sessions: {
        Row: StudySession;
        Insert: Partial<StudySession> & { user_id: string; date: string; hours: number };
        Update: Partial<StudySession>;
        Relationships: [];
      };
      focus_sessions: {
        Row: FocusSession;
        Insert: Partial<FocusSession> & { user_id: string; mode: FocusSessionMode };
        Update: Partial<FocusSession>;
        Relationships: [];
      };
      daily_plan_task_state: {
        Row: DailyPlanTaskState;
        Insert: Partial<DailyPlanTaskState> & { user_id: string; plan_date: string; task_key: string; kind: DailyPlanTaskKind; title: string };
        Update: Partial<DailyPlanTaskState>;
        Relationships: [];
      };
      revision_history: {
        Row: RevisionHistory;
        Insert: Partial<RevisionHistory> & { user_id: string; topic_id: string; confidence_rating: 1 | 2 | 3 | 4 | 5; resulting_tier: string };
        Update: Partial<RevisionHistory>;
        Relationships: [];
      };
      interview_rounds: {
        Row: InterviewRound;
        Insert: Partial<InterviewRound> & { application_id: string; user_id: string; round_type: InterviewRoundType };
        Update: Partial<InterviewRound>;
        Relationships: [];
      };
      user_skills: {
        Row: UserSkill;
        Insert: Partial<UserSkill> & { user_id: string };
        Update: Partial<UserSkill>;
        Relationships: [];
      };
      skill_freshness_config: {
        Row: SkillFreshnessConfig;
        Insert: Partial<SkillFreshnessConfig> & { id: number };
        Update: Partial<SkillFreshnessConfig>;
        Relationships: [];
      };
      project_skills: {
        Row: ProjectSkill;
        Insert: Partial<ProjectSkill> & { user_id: string; technology_id: string };
        Update: Partial<ProjectSkill>;
        Relationships: [];
      };
      target_roles: {
        Row: TargetRole;
        Insert: Partial<TargetRole> & { id: string; name: string };
        Update: Partial<TargetRole>;
        Relationships: [];
      };
      role_skill_requirements: {
        Row: RoleSkillRequirement;
        Insert: RoleSkillRequirement;
        Update: Partial<RoleSkillRequirement>;
        Relationships: [];
      };
      interview_questions: {
        Row: InterviewQuestion;
        Insert: Partial<InterviewQuestion> & { round_type: InterviewRoundType; question: string };
        Update: Partial<InterviewQuestion>;
        Relationships: [];
      };
      interview_attempts: {
        Row: InterviewAttempt;
        Insert: Partial<InterviewAttempt> & { user_id: string; question_id: string; result: InterviewAttemptResult };
        Update: Partial<InterviewAttempt>;
        Relationships: [];
      };
      notification_dismissals: {
        Row: NotificationDismissal;
        Insert: Partial<NotificationDismissal> & { user_id: string; notification_id: string; action: NotificationDismissAction };
        Update: Partial<NotificationDismissal>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLogEntry;
        Insert: Partial<ActivityLogEntry> & { user_id: string; action: ActivityAction; entity_type: string; entity_id: string; summary: string };
        Update: Partial<ActivityLogEntry>;
        Relationships: [];
      };
      goals: {
        Row: Goal;
        Insert: Partial<Goal> & { user_id: string; title: string };
        Update: Partial<Goal>;
        Relationships: [];
      };
      milestones: {
        Row: Milestone;
        Insert: Partial<Milestone> & { goal_id: string; user_id: string; title: string };
        Update: Partial<Milestone>;
        Relationships: [];
      };
      milestone_dependencies: {
        Row: MilestoneDependency;
        Insert: MilestoneDependency;
        Update: Partial<MilestoneDependency>;
        Relationships: [];
      };
      weekly_commitments: {
        Row: WeeklyCommitment;
        Insert: Partial<WeeklyCommitment> & { user_id: string; week_start: string; title: string };
        Update: Partial<WeeklyCommitment>;
        Relationships: [];
      };
      time_blocks: {
        Row: TimeBlock;
        Insert: Partial<TimeBlock> & { user_id: string; block_date: string; start_time: string; end_time: string; title: string };
        Update: Partial<TimeBlock>;
        Relationships: [];
      };
      evidence_items: {
        Row: EvidenceItem;
        Insert: Partial<EvidenceItem> & { user_id: string; title: string };
        Update: Partial<EvidenceItem>;
        Relationships: [];
      };
      financial_profiles: {
        Row: FinancialProfile;
        Insert: Partial<FinancialProfile> & { user_id: string };
        Update: Partial<FinancialProfile>;
        Relationships: [];
      };
      study_events: {
        Row: StudyEvent;
        Insert: Partial<StudyEvent> & { user_id: string; duration_minutes: number };
        Update: Partial<StudyEvent>;
        Relationships: [];
      };
    };
    Views: {
      goal_progress: {
        Row: GoalProgress;
      };
      application_metrics: {
        Row: ApplicationMetrics;
      };
      skill_evidence: {
        Row: SkillEvidence;
      };
      skill_freshness: {
        Row: SkillFreshness;
      };
      interview_weaknesses: {
        Row: InterviewWeakness;
      };
      interview_readiness_by_role: {
        Row: InterviewReadinessByRole;
      };
      leaderboard: {
        Row: LeaderboardEntry;
      };
    };
    Functions: {
      ensure_profile_slug: {
        Args: Record<string, never>;
        Returns: string;
      };
      complete_milestone: {
        Args: { p_milestone_id: string };
        Returns: void;
      };
      record_study_activity: {
        Args: {
          p_duration_minutes: number;
          p_activity_type?: string;
          p_topic_id?: string | null;
          p_stage_project_id?: string | null;
          p_dsa_problem_id?: string | null;
          p_source?: string;
          p_occurred_at?: string;
          p_event_date?: string | null;
          p_plan_task_key?: string | null;
          p_metadata?: Record<string, unknown>;
          p_note?: string | null;
        };
        Returns: string;
      };
      record_study_session: {
        Args: {
          p_date: string;
          p_hours: number;
          p_activity?: string;
          p_topic_id?: string | null;
          p_stage_project_id?: string | null;
          p_note?: string | null;
          p_is_tutorial?: boolean | null;
        };
        Returns: string;
      };
      set_topic_completion: {
        Args: {
          p_topic_id: string;
          p_completed: boolean;
          p_completed_at?: string | null;
          p_next_review_due?: string | null;
          p_revision_status?: string | null;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

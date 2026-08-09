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
  updated_at: string;
}

export interface ExerciseProgress {
  user_id: string;
  exercise_id: string;
  completed: boolean;
  completed_at: string | null;
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
  updated_at: string;
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
  developer_mode: boolean;
  topic_locking_disabled: boolean;
  pinned_items: PinnedItem[];
  dashboard_tour_seen: boolean;
  updated_at: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile_slug: {
        Args: { uid: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

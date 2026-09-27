"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { buildLinkRegistry } from "@/lib/note-links";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { recordProductEvent } from "@/lib/product-analytics";
import { normalizeHttpUrl } from "@/lib/validate-url";
import type {
  Phase,
  Topic,
  Stage,
  StageProject,
  StageExercise,
  Capstone,
  Company,
  TopicProgress,
  TopicNote,
  ExitLadderRow,
  RoadmapMetadata,
  PhaseWithTopics,
  Orientation,
  WhyThisWorksRow,
  MasterPhaseTableRow,
  HoursBreakdownRow,
  ProgramTotal,
  DifficultyRampRow,
  SourceDiscrepancyRow,
  SkillTrackRow,
  NavigationNotes,
  MonthByMonthRow,
  PhaseChecklistRow,
  RoadmapSnapshot,
  RoadmapSnapshotEntity,
  TopicResource,
  ResourceType,
  Technology,
  ClientSyncMilestone,
  DetailedRoadmapPhase,
  DetailedRoadmapModule,
  DetailedRoadmapTopic,
  DetailedRoadmapProject,
  UserRoadmapProjectProgress,
  UserRoadmapTopicProgress,
  DetailedRoadmapTopicNote,
} from "@/types/database";

const supabase = createClient();

async function fetchRoadmap(userId: string) {
  const [{ data: settings, error: settingsError }, { data: activeEnrollments, error: activeError }] = await Promise.all([
    supabase
    .from("user_settings")
    .select("roadmap_id")
    .eq("user_id", userId)
    .maybeSingle(),
    supabase.from("user_roadmaps").select("roadmap_id").eq("user_id", userId).eq("status", "active").limit(1),
  ]);
  if (settingsError) throw settingsError;
  if (activeError) throw activeError;
  const roadmapId = ((activeEnrollments ?? [])[0] as { roadmap_id?: string } | undefined)?.roadmap_id
    ?? (settings as { roadmap_id?: string | null } | null)?.roadmap_id;
  const phaseQuery = supabase.from("phases").select("*").order("order_index");
  const scopedPhaseQuery = roadmapId ? phaseQuery.eq("roadmap_id", roadmapId) : phaseQuery;
  const [
    { data: phases, error: pErr },
    { data: topics, error: tErr },
    { data: stages, error: sErr },
    { data: stageProjects, error: spErr },
    { data: stageExercises, error: seErr },
    { data: capstones, error: cErr },
  ] = await Promise.all([
    scopedPhaseQuery,
    supabase.from("topics").select("*").order("phase_id").order("order_index"),
    supabase.from("stages").select("*").order("phase_id").order("order_index"),
    supabase.from("stage_projects").select("*"),
    supabase.from("stage_exercises").select("*"),
    supabase.from("capstones").select("*"),
  ]);
  if (pErr) throw pErr;
  if (tErr) throw tErr;
  if (sErr) throw sErr;
  if (spErr) throw spErr;
  if (seErr) throw seErr;
  if (cErr) throw cErr;
  if (roadmapId && phases?.length) void recordProductEvent("roadmap_viewed", { roadmapId });
  return {
    phases: (phases ?? []) as Phase[],
    topics: (topics ?? []) as Topic[],
    stages: (stages ?? []) as Stage[],
    stageProjects: (stageProjects ?? []) as StageProject[],
    stageExercises: (stageExercises ?? []) as StageExercise[],
    capstones: (capstones ?? []) as Capstone[],
  };
}

async function fetchProgress(userId: string) {
  const { data, error } = await supabase
    .from("topic_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as TopicProgress[];
}

export function useRoadmap(userId?: string) {
  return useSWR(userId ? ["roadmap", userId] : null, () => fetchRoadmap(userId!), { revalidateOnFocus: false });
}

export function useProgress(userId: string | undefined) {
  return useSWR(userId ? ["progress", userId] : null, () => fetchProgress(userId!));
}

export interface DetailedRoadmapPhaseView extends DetailedRoadmapPhase {
  modules: Array<DetailedRoadmapModule & { topics: Array<DetailedRoadmapTopic & { progress: UserRoadmapTopicProgress | null }> }>;
  projects: Array<DetailedRoadmapProject & { progress: UserRoadmapProjectProgress | null }>;
}

export function useDetailedRoadmap(userId: string | undefined) {
  return useSWR(userId ? ["detailed-roadmap", userId] : null, async () => {
    const [{ data: settings, error: settingsError }, { data: enrollments, error: enrollmentError }] = await Promise.all([
      supabase.from("user_settings").select("roadmap_id").eq("user_id", userId!).maybeSingle(),
      supabase.from("user_roadmaps").select("roadmap_id, roadmap_version_id").eq("user_id", userId!).eq("status", "active").limit(1),
    ]);
    if (settingsError) throw settingsError;
    if (enrollmentError) throw enrollmentError;
    const enrollment = (enrollments ?? [])[0] as { roadmap_id: string; roadmap_version_id: string | null } | undefined;
    const roadmapId = enrollment?.roadmap_id ?? (settings as { roadmap_id?: string | null } | null)?.roadmap_id;
    if (!roadmapId || roadmapId === "zte-core-v1") return null;

    let phaseQuery = supabase.from("roadmap_phases").select("*").eq("roadmap_id", roadmapId).order("order_index");
    if (enrollment?.roadmap_version_id) phaseQuery = phaseQuery.eq("roadmap_version_id", enrollment.roadmap_version_id);
    const { data: phases, error: phaseError } = await phaseQuery;
    if (phaseError) throw phaseError;
    const phaseRows = (phases ?? []) as DetailedRoadmapPhase[];
    const phaseIds = phaseRows.map((phase) => phase.id);
    if (!phaseIds.length) return [] as DetailedRoadmapPhaseView[];
    void recordProductEvent("roadmap_viewed", { roadmapId });

    const [{ data: modules, error: modulesError }, { data: projects, error: projectsError }] = await Promise.all([
      supabase.from("roadmap_modules").select("*").in("phase_id", phaseIds).order("order_index"),
      supabase.from("roadmap_projects").select("*").in("phase_id", phaseIds).order("order_index"),
    ]);
    if (modulesError) throw modulesError;
    if (projectsError) throw projectsError;
    const moduleRows = (modules ?? []) as DetailedRoadmapModule[];
    const projectRows = (projects ?? []) as DetailedRoadmapProject[];
    const { data: projectProgress, error: projectProgressError } = projectRows.length
      ? await supabase.from("user_roadmap_project_progress").select("*").eq("user_id", userId!).in("project_id", projectRows.map((project) => project.id))
      : { data: [], error: null };
    if (projectProgressError) throw projectProgressError;
    const progressByProject = new Map(((projectProgress ?? []) as UserRoadmapProjectProgress[]).map((row) => [row.project_id, row]));
    const moduleIds = moduleRows.map((module) => module.id);
    const { data: topics, error: topicsError } = moduleIds.length
      ? await supabase.from("roadmap_topics").select("*").in("module_id", moduleIds).order("order_index")
      : { data: [], error: null };
    if (topicsError) throw topicsError;
    const topicRows = (topics ?? []) as DetailedRoadmapTopic[];
    const { data: progress, error: progressError } = topicRows.length
      ? await supabase.from("user_roadmap_topic_progress").select("*").eq("user_id", userId!).in("topic_id", topicRows.map((topic) => topic.id))
      : { data: [], error: null };
    if (progressError) throw progressError;
    const progressByTopic = new Map(((progress ?? []) as UserRoadmapTopicProgress[]).map((row) => [row.topic_id, row]));

    return phaseRows.map((phase) => ({
      ...phase,
      modules: moduleRows.filter((module) => module.phase_id === phase.id).map((module) => ({
        ...module,
        topics: topicRows.filter((topic) => topic.module_id === module.id).map((topic) => ({ ...topic, progress: progressByTopic.get(topic.id) ?? null })),
      })),
      projects: projectRows.filter((project) => project.phase_id === phase.id).map((project) => ({ ...project, progress: progressByProject.get(project.id) ?? null })),
    })) as DetailedRoadmapPhaseView[];
  });
}

export async function setDetailedRoadmapTopicStatus(userId: string, topicId: string, status: UserRoadmapTopicProgress["status"]) {
  const intervals: Record<UserRoadmapTopicProgress["status"], number | null> = {
    not_started: null,
    learning: 1,
    practicing: 3,
    applied: 7,
    mastered: 30,
  };
  const interval = intervals[status];
  const reviewedAt = status === "not_started" ? null : new Date();
  const nextReviewAt = reviewedAt && interval ? new Date(reviewedAt.getTime() + interval * 24 * 60 * 60 * 1000).toISOString() : null;
  const { data: previous, error: readError } = await supabase
    .from("user_roadmap_topic_progress")
    .select("review_count,status")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();
  if (readError) throw readError;
  const previousStatus = (previous as { status?: UserRoadmapTopicProgress["status"] } | null)?.status ?? "not_started";
  const { error } = await supabase.from("user_roadmap_topic_progress").upsert({
    user_id: userId,
    topic_id: topicId,
    status,
    last_reviewed_at: reviewedAt?.toISOString() ?? null,
    next_review_at: nextReviewAt,
    review_interval_days: interval,
    review_count: ((previous as { review_count?: number } | null)?.review_count ?? 0) + (reviewedAt ? 1 : 0),
  } as never, { onConflict: "user_id,topic_id" });
  if (error) throw error;
  if (previousStatus === "not_started" && status !== "not_started") {
    void recordProductEvent("topic_started", { topicId });
  }
  if (status === "applied" || status === "mastered") {
    void recordProductEvent("topic_completed", { topicId });
  }
}

export async function setDetailedRoadmapProjectProgress(
  userId: string,
  projectId: string,
  values: Pick<UserRoadmapProjectProgress, "status" | "repository_url" | "deployed_url" | "notes">
) {
  const { error } = await supabase.from("user_roadmap_project_progress").upsert({
    user_id: userId,
    project_id: projectId,
    ...values,
    updated_at: new Date().toISOString(),
  } as never, { onConflict: "user_id,project_id" });
  if (error) throw error;
  if (values.status !== "not_started") void recordProductEvent("project_started", { projectId });
  if (values.deployed_url?.trim()) void recordProductEvent("project_deployed", { projectId });
}

export async function saveDetailedRoadmapTopicNote(userId: string, topicId: string, note: string) {
  const { error } = await supabase.from("roadmap_topic_notes").insert({ user_id: userId, topic_id: topicId, note } as never);
  if (error) throw error;
}

export function useDetailedRoadmapTopicNotes(userId: string | undefined, topicIds: string[]) {
  const key = userId && topicIds.length ? ["detailed-roadmap-notes", userId, ...topicIds] : null;
  return useSWR(key, async () => {
    const { data, error } = await supabase.from("roadmap_topic_notes").select("*").eq("user_id", userId!).in("topic_id", topicIds).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DetailedRoadmapTopicNote[];
  });
}

/** Combine static roadmap with per-user progress into phases-with-topics view models. */
export function usePhasesWithProgress(userId: string | undefined) {
  const { data: roadmap, isLoading: roadmapLoading, mutate: mutateRoadmap } = useRoadmap(userId);
  const { data: progress, isLoading: progressLoading, mutate: mutateProgress } = useProgress(userId);

  const progressMap = new Map((progress ?? []).map((p) => [p.topic_id, p]));

  const phasesWithTopics: PhaseWithTopics[] = (roadmap?.phases ?? []).map((phase) => {
    const phaseTopics = (roadmap?.topics ?? [])
      .filter((t) => t.phase_id === phase.id)
      .map((t) => ({ ...t, progress: progressMap.get(t.id) ?? null }));

    const phaseStages = (roadmap?.stages ?? [])
      .filter((s) => s.phase_id === phase.id)
      .map((stage) => ({
        ...stage,
        topics: phaseTopics.filter((t) => t.stage_id === stage.id),
        projects: (roadmap?.stageProjects ?? []).filter((p) => p.stage_id === stage.id),
        exercises: (roadmap?.stageExercises ?? []).filter((e) => e.stage_id === stage.id),
      }));

    return {
      ...phase,
      topics: phaseTopics,
      stages: phaseStages,
      capstone: (roadmap?.capstones ?? []).find((c) => c.phase_id === phase.id) ?? null,
    };
  });

  return {
    phases: phasesWithTopics,
    isLoading: roadmapLoading || progressLoading,
    mutateProgress,
    mutateRoadmap,
  };
}

export function useCompanies() {
  return useSWR("companies", async () => {
    const { data, error } = await supabase.from("companies").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Company[];
  });
}

export function useCompany(id: string | undefined) {
  return useSWR(id ? ["company", id] : null, async () => {
    const { data, error } = await supabase.from("companies").select("*").eq("id", id as string).single();
    if (error) throw error;
    return data as Company;
  });
}

export function useTechnologies() {
  return useSWR("technologies", async () => {
    const { data, error } = await supabase.from("technologies").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Technology[];
  });
}

export function useTechnology(id: string | undefined) {
  return useSWR(id ? ["technology", id] : null, async () => {
    const { data, error } = await supabase.from("technologies").select("*").eq("id", id as string).single();
    if (error) throw error;
    return data as Technology;
  });
}

export function useRoleRoadmapIds() {
  return useSWR("role-roadmap-catalog", async () => {
    const { data, error } = await supabase.from("role_roadmap_assignments").select("role_id, roadmap_id");
    if (error) throw error;
    return (data ?? []) as Array<{ role_id: string; roadmap_id: string }>;
  });
}

/** Every topic (id + title + phase_id) a given technology appears in, via the join table. */
export function useTopicsForTechnology(technologyId: string | undefined) {
  return useSWR(technologyId ? ["topics-for-technology", technologyId] : null, async () => {
    const { data, error } = await supabase
      .from("topic_technologies")
      .select("topic_id, topics(id, title, phase_id, stage_id)")
      .eq("technology_id", technologyId as string);
    if (error) throw error;
    type JoinRow = { topic_id: string; topics: Pick<Topic, "id" | "title" | "phase_id" | "stage_id"> | null };
    return ((data ?? []) as unknown as JoinRow[])
      .map((row) => row.topics)
      .filter((t): t is NonNullable<typeof t> => !!t);
  });
}

export function useStageDetail(id: string | undefined) {
  return useSWR(id ? ["stage-detail", id] : null, async () => {
    const stageId = id as string;
    const [
      { data: stage, error: sErr },
      { data: topics, error: tErr },
      { data: projects, error: pErr },
      { data: exercises, error: eErr },
    ] = await Promise.all([
      supabase.from("stages").select("*").eq("id", stageId).single(),
      supabase.from("topics").select("*").eq("stage_id", stageId).order("order_index"),
      supabase.from("stage_projects").select("*").eq("stage_id", stageId),
      supabase.from("stage_exercises").select("*").eq("stage_id", stageId),
    ]);
    if (sErr) throw sErr;
    if (tErr) throw tErr;
    if (pErr) throw pErr;
    if (eErr) throw eErr;
    return {
      stage: stage as Stage,
      topics: (topics ?? []) as Topic[],
      projects: (projects ?? []) as StageProject[],
      exercises: (exercises ?? []) as StageExercise[],
    };
  });
}

export function useTopicDetail(id: string | undefined) {
  return useSWR(id ? ["topic-detail", id] : null, async () => {
    const { data, error } = await supabase.from("topics").select("*").eq("id", id as string).single();
    if (error) throw error;
    return data as Topic;
  });
}

export function useClientSyncMilestones() {
  return useSWR("clientsync-milestones", async () => {
    const { data, error } = await supabase
      .from("clientsync_milestones")
      .select("*")
      .order("linked_phase");
    if (error) throw error;
    return (data ?? []) as ClientSyncMilestone[];
  });
}

/**
 * All of a user's notes, across every topic — not the per-topic fetch the
 * note-editing UI already does. Needed for computing [[...]] backlinks
 * (P7.6): showing "linked from" on a topic requires scanning every note
 * the user has written, not just this topic's own notes.
 */
export function useAllTopicNotes(userId: string | undefined) {
  return useSWR(userId ? ["all-topic-notes", userId] : null, async () => {
    const { data, error } = await supabase
      .from("topic_notes")
      .select("*")
      .eq("user_id", userId as string)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TopicNote[];
  });
}

/**
 * Stage 4 — Item 25: the combined [[...]] link registry (topics + stage
 * projects + ClientSync milestones + stage exercises), built once from data
 * every consumer already fetches elsewhere via useRoadmap/
 * useClientSyncMilestones — this just re-shapes it via buildLinkRegistry
 * rather than re-fetching. Exercises added as a follow-up fix: they were
 * named in the original spec ("topics, exercises, projects, and ClientSync
 * features all mutually linked") but missing from the registry — `roadmap`
 * already carries `stageExercises`, so no new fetch was needed here either.
 */
export function useLinkRegistry(userId?: string) {
  const { data: roadmap } = useRoadmap(userId);
  const { data: milestones } = useClientSyncMilestones();
  return buildLinkRegistry(
    roadmap?.topics ?? [],
    roadmap?.stageProjects ?? [],
    milestones ?? [],
    roadmap?.stageExercises ?? []
  );
}

export function useExitLadder() {
  return useSWR("exit-ladder", async () => {
    const { data, error } = await supabase
      .from("exit_ladder")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return (data ?? []) as ExitLadderRow[];
  });
}

export function useRoadmapMetadata() {
  return useSWR("roadmap-metadata", async () => {
    const { data, error } = await supabase
      .from("roadmap_metadata")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return data as RoadmapMetadata;
  });
}

// ---------- Part I reference content (P7.0) ----------

export function useOrientation() {
  return useSWR("orientation", async () => {
    const { data, error } = await supabase.from("orientation").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as Orientation;
  });
}

export function useWhyThisWorks() {
  return useSWR("why-this-works", async () => {
    const { data, error } = await supabase.from("why_this_works").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as WhyThisWorksRow[];
  });
}

export function useMasterPhaseTable() {
  return useSWR("master-phase-table", async () => {
    const { data, error } = await supabase.from("master_phase_table").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as MasterPhaseTableRow[];
  });
}

export function useHoursBreakdown() {
  return useSWR("hours-breakdown", async () => {
    const { data, error } = await supabase.from("hours_breakdown").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as HoursBreakdownRow[];
  });
}

export function useProgramTotal() {
  return useSWR("program-total", async () => {
    const { data, error } = await supabase.from("program_total").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as ProgramTotal;
  });
}

export function useDifficultyRamp() {
  return useSWR("difficulty-ramp", async () => {
    const { data, error } = await supabase.from("difficulty_ramp").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as DifficultyRampRow[];
  });
}

export function useSourceDiscrepancies() {
  return useSWR("source-discrepancies", async () => {
    const { data, error } = await supabase.from("source_discrepancies").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as SourceDiscrepancyRow[];
  });
}

export function useSkillTracks() {
  return useSWR("skill-tracks", async () => {
    const { data, error } = await supabase.from("skill_tracks").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as SkillTrackRow[];
  });
}

export function useNavigationNotes() {
  return useSWR("navigation-notes", async () => {
    const { data, error } = await supabase.from("navigation_notes").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as NavigationNotes;
  });
}

export function useMonthByMonth() {
  return useSWR("month-by-month", async () => {
    const { data, error } = await supabase.from("month_by_month").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as MonthByMonthRow[];
  });
}

export function usePhaseChecklist() {
  return useSWR("phase-checklist", async () => {
    const { data, error } = await supabase.from("phase_checklist").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as PhaseChecklistRow[];
  });
}

// ---------- Roadmap versioning / diff (P7.6) ----------

export function useRoadmapSnapshots() {
  return useSWR("roadmap-snapshots", async () => {
    const { data, error } = await supabase.from("roadmap_snapshots").select("*").order("version");
    if (error) throw error;
    return (data ?? []) as RoadmapSnapshot[];
  });
}

export function useSnapshotEntities(snapshotId: string | undefined) {
  return useSWR(snapshotId ? ["snapshot-entities", snapshotId] : null, async () => {
    const { data, error } = await supabase
      .from("roadmap_snapshot_entities")
      .select("*")
      .eq("snapshot_id", snapshotId as string);
    if (error) throw error;
    return (data ?? []) as RoadmapSnapshotEntity[];
  });
}

// ---------- Resource library (P7.6) ----------
// roadmap.md has no curated docs/videos per topic anywhere in its source
// content, so there's nothing to seed. This lets each person build their
// own per-topic library as they study — real, user-added resources rather
// than fabricated links no one has verified.

export function useTopicResources(userId: string | undefined, topicId: string | undefined) {
  return useSWR(topicId ? ["topic-resources", userId ?? "anon", topicId] : null, async () => {
    // Curated (system-owned, curated=true, user_id null) rows are visible to
    // everyone; user-added rows are visible only to their owner. Fetching
    // both together (rather than a plain .eq("user_id", ...)) is what
    // actually surfaces the curated set — the RLS policies already scope
    // each row set correctly, this just doesn't over-filter with user_id.
    let query = supabase
      .from("topic_resources")
      .select("*")
      .eq("topic_id", topicId as string);
    query = userId ? query.or(`curated.eq.true,user_id.eq.${userId}`) : query.eq("curated", true);
    const { data, error } = await query
      .order("curated", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TopicResource[];
  });
}

export async function addTopicResource(
  userId: string,
  topicId: string,
  resource: { title: string; url: string; resource_type: ResourceType; notes?: string }
) {
  const { error } = await supabase.from("topic_resources").insert({
    user_id: userId,
    topic_id: topicId,
    title: resource.title,
    url: normalizeHttpUrl(resource.url),
    resource_type: resource.resource_type,
    notes: resource.notes || null,
  } as never);
  if (error) throw error;
}

export async function deleteTopicResource(id: string) {
  const { error } = await supabase.from("topic_resources").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleTopicComplete(
  userId: string,
  topicId: string,
  completed: boolean,
  topicTitle?: string
) {
  // Completing a topic seeds its first spaced-repetition due date (the
  // schedule's day-1 interval) and marks it needs_revision, since a just-
  // completed, never-reviewed topic is exactly what that status means —
  // Statistics' multi-axis revision breakdown (P7.2) buckets by this same
  // field, so leaving it null here would undercount "needs revision" as
  // "unset" instead. Un-completing clears both since an incomplete topic
  // has nothing to revise yet. review_count is left alone — the actual
  // review tiers only advance when the person marks a review done on
  // /revision, not on initial completion.
  // Known edge case: toggling complete -> incomplete -> complete again
  // re-seeds the due date even if review_count had already progressed past
  // 0, since this is a blind upsert rather than a read-modify-write. That
  // only affects someone who un-checks and re-checks a topic they'd already
  // started reviewing, which resets their schedule by a few days at most —
  // an acceptable tradeoff against the complexity/latency of a read before
  // every checkbox click.
  // Completion state is authorized and written atomically by the database
  // RPC. This prevents direct table writes from bypassing completion rules;
  // the RPC also owns the activity-log insert so there is no partial
  // "completed but not recorded" state. `topicTitle` remains accepted for
  // source compatibility with existing callers; the server reads the
  // canonical title itself.
  void topicTitle;
  const { error } = await supabase.rpc("set_topic_completion" as never, {
    p_topic_id: topicId,
    p_completed: completed,
  } as never);
  if (error) throw error;
  if (completed) void recordProductEvent("topic_started", { legacyTopicId: topicId });
}

/** Restore a historical completion during a validated Settings import. */
export async function setTopicCompletion(
  userId: string,
  topicId: string,
  completed: boolean,
  completedAt?: string | null,
  nextReviewDue?: string | null,
  revisionStatus?: TopicProgress["revision_status"]
) {
  void userId;
  const { error } = await supabase.rpc("set_topic_completion" as never, {
    p_topic_id: topicId,
    p_completed: completed,
    p_completed_at: completedAt ?? null,
    p_next_review_due: nextReviewDue ?? null,
    p_revision_status: revisionStatus ?? null,
  } as never);
  if (error) throw error;
}

export async function updateTopicProgress(
  userId: string,
  topicId: string,
  patch: Partial<TopicProgress>
) {
  const safePatch = { ...patch } as Partial<TopicProgress>;
  if ("evidence_url" in safePatch) safePatch.evidence_url = normalizeHttpUrl(safePatch.evidence_url);
  const { error } = await supabase
    .from("topic_progress")
    .upsert({ user_id: userId, topic_id: topicId, ...safePatch } as never, { onConflict: "user_id,topic_id" });
  if (error) throw error;
}

/**
 * Marks a revision review done: applies the nextReviewPatch() the caller
 * already computed and logs the activity. A separate function from the
 * generic updateTopicProgress() above rather than adding logging there,
 * since that function is used for many unrelated patches (bookmark,
 * notes, difficulty) that shouldn't all generate activity_log rows —
 * this one is specific to the one semantic action (revision-schedule.ts's
 * comment on nextReviewPatch already documents what the patch means).
 */
export async function markTopicReviewed(
  userId: string,
  topicId: string,
  topicTitle: string,
  patch: Partial<TopicProgress>,
  confidenceRating?: 1 | 2 | 3 | 4 | 5
) {
  await updateTopicProgress(userId, topicId, patch);
  await logActivity(userId, {
    action: "revision_completed",
    entityType: "topic",
    entityId: topicId,
    summary: `Reviewed: ${topicTitle}`,
  });
  // Confidence history is optional (older callers, if any, can keep
  // marking a review without a rating) — only logged when one is given,
  // so revision_history stays a clean record of rated reviews only.
  if (confidenceRating) {
    const supabase = createClient();
    await supabase.from("revision_history").insert({
      user_id: userId,
      topic_id: topicId,
      confidence_rating: confidenceRating,
      resulting_tier: patch.revision_status ?? "comfortable",
    } as never);
  }
}

export interface HoursApplyResult {
  // Topics that crossed their estimated_hours threshold and were
  // auto-completed by this application of hours, in the order they were
  // completed. Empty if the logged hours didn't fill up the current topic.
  completedTopics: { id: string; title: string }[];
  // The topic still in progress after applying all the hours (partially
  // filled, or untouched if there was nothing to apply to). Null only if
  // every topic in the chain got completed (no more topics left to spill
  // into) — the roadmap is finished.
  remainingTopic: { id: string; title: string; minutesSpent: number; estimatedMinutes: number } | null;
}

/**
 * Records study time against the topic Daily Mission is currently pointing at.
 * Time is evidence of activity only; explicit completion and validation remain
 * separate workflows, so estimates never auto-complete a topic.
 */
export async function applyHoursToNextTopic(
  userId: string,
  orderedTopics: { id: string; title: string; estimated_hours: number | null; progress: { actual_minutes_spent: number } | null }[],
  hoursLogged: number
): Promise<HoursApplyResult> {
  // Time is activity evidence only. It must never imply completion or
  // mastery; explicit validation remains a separate workflow.
  const minutesLogged = Math.max(0, Math.round(hoursLogged * 60));
  const activeTopic = orderedTopics[0];
  if (!activeTopic || minutesLogged === 0) return { completedTopics: [], remainingTopic: null };
  const minutesSpent = (activeTopic.progress?.actual_minutes_spent ?? 0) + minutesLogged;
  await updateTopicProgress(userId, activeTopic.id, { actual_minutes_spent: minutesSpent });
  return {
    completedTopics: [],
    remainingTopic: {
      id: activeTopic.id,
      title: activeTopic.title,
      minutesSpent,
      estimatedMinutes: activeTopic.estimated_hours ? Math.round(activeTopic.estimated_hours * 60) : 0,
    },
  };

}

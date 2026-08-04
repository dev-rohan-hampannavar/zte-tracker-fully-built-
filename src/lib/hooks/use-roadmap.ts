"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { buildLinkRegistry } from "@/lib/note-links";
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
} from "@/types/database";

const supabase = createClient();

async function fetchRoadmap() {
  const [
    { data: phases, error: pErr },
    { data: topics, error: tErr },
    { data: stages, error: sErr },
    { data: stageProjects, error: spErr },
    { data: stageExercises, error: seErr },
    { data: capstones, error: cErr },
  ] = await Promise.all([
    supabase.from("phases").select("*").order("order_index"),
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

export function useRoadmap() {
  return useSWR("roadmap", fetchRoadmap, { revalidateOnFocus: false });
}

export function useProgress(userId: string | undefined) {
  return useSWR(userId ? ["progress", userId] : null, () => fetchProgress(userId!));
}

/** Combine static roadmap with per-user progress into phases-with-topics view models. */
export function usePhasesWithProgress(userId: string | undefined) {
  const { data: roadmap, isLoading: roadmapLoading, mutate: mutateRoadmap } = useRoadmap();
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
export function useLinkRegistry() {
  const { data: roadmap } = useRoadmap();
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
    url: resource.url,
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
  completed: boolean
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
  const dueDate = completed ? new Date(Date.now() + 86400000).toISOString() : null;
  const { error } = await supabase.from("topic_progress").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      next_review_due: dueDate,
      revision_status: completed ? "needs_revision" : null,
    } as never,
    { onConflict: "user_id,topic_id" }
  );
  if (error) throw error;
}

export async function updateTopicProgress(
  userId: string,
  topicId: string,
  patch: Partial<TopicProgress>
) {
  const { error } = await supabase
    .from("topic_progress")
    .upsert({ user_id: userId, topic_id: topicId, ...patch } as never, { onConflict: "user_id,topic_id" });
  if (error) throw error;
}

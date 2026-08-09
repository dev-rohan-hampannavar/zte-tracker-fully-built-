"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, updateTopicProgress, toggleTopicComplete, useTechnologies } from "@/lib/hooks/use-roadmap";
import { useBuildInPublicStatus, upsertBuildInPublic } from "@/lib/hooks/use-projects";
import { useDeveloperMode } from "@/lib/hooks/use-developer-mode";
import { useDisplayName } from "@/lib/hooks/use-display-name";
import { downloadCertificate } from "@/lib/certificate";
import { generateBuildInPublicDraft } from "@/lib/build-in-public-draft";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TopicDetailSheet } from "@/components/roadmap/topic-detail-sheet";
import { formatHours, pct, cn } from "@/lib/utils";
import { DOMAINS, inferDomains } from "@/lib/domain-taxonomy";
import { KanbanView } from "@/components/roadmap/kanban-view";
import { CalendarView } from "@/components/roadmap/calendar-view";
import { LearningPathView } from "@/components/roadmap/learning-path-view";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useTopicLockingDisabled } from "@/lib/hooks/use-topic-locking";
import { computeStageTopicLocks, type TopicLockInfo } from "@/lib/topic-prerequisites";
import { matchTechnologiesInText } from "@/lib/project-dependencies";
import {
  Megaphone,
  Bookmark,
  Star,
  Clock,
  Layers,
  Dumbbell,
  FolderGit2,
  Trophy,
  ExternalLink,
  Lock,
  Search,
  X,
  Award,
  LayoutGrid,
  List,
  ChevronRight,
  ArrowLeft,
  Columns3,
  Calendar,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import type { TopicWithProgress, StageWithTopics, PhaseWithTopics, Difficulty, Technology } from "@/types/database";

const BANDS = ["Foundation", "Core", "Advanced", "Expert"] as const;
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];


function TopicRow({
  topic,
  onToggle,
  onOpen,
  onBookmark,
  devMode,
  lockInfo,
}: {
  topic: TopicWithProgress;
  onToggle: (id: string, completed: boolean) => void;
  onOpen: (t: TopicWithProgress) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  devMode?: boolean;
  lockInfo?: TopicLockInfo;
}) {
  const isLocked = !!lockInfo?.locked;
  const isCompleted = !!topic.progress?.completed;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-standard hover:bg-surface-2 group",
        isLocked && "opacity-60",
        isCompleted && "bg-success/[0.03]"
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(v) => onToggle(topic.id, v === true)}
        disabled={isLocked}
      />
      <button
        onClick={() => !isLocked && onOpen(topic)}
        disabled={isLocked}
        className={cn(
          "flex-1 text-left text-sm transition-standard",
          isCompleted && "text-muted line-through",
          isLocked && "cursor-not-allowed"
        )}
      >
        {topic.title}
        {devMode && <span className="ml-2 text-[10px] text-muted font-mono-tabular">{topic.id}</span>}
      </button>
      {isLocked && (
        <span
          className="flex items-center gap-1 text-[10px] text-muted shrink-0"
          title={`Requires: ${lockInfo?.requiredTitle}`}
        >
          <Lock className="h-3 w-3" />
          <span className="hidden sm:inline">Requires: {lockInfo?.requiredTitle}</span>
        </span>
      )}
      {topic.progress?.difficulty && (
        <Badge
          variant={
            topic.progress.difficulty === "hard"
              ? "danger"
              : topic.progress.difficulty === "medium"
              ? "warning"
              : "success"
          }
          className="hidden sm:inline-flex"
        >
          {topic.progress.difficulty}
        </Badge>
      )}
      {topic.estimated_hours && (
        <span className="text-xs text-muted font-mono-tabular hidden sm:inline">
          {formatHours(topic.estimated_hours)}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Link href={`/roadmap/topic/${topic.id}`} title="Open full page">
          <ExternalLink className="h-3.5 w-3.5 text-muted hover:text-accent" />
        </Link>
      </button>
      <button
        onClick={() => onBookmark(topic.id, !topic.progress?.bookmarked)}
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          topic.progress?.bookmarked && "opacity-100 text-accent"
        )}
      >
        <Bookmark className={cn("h-3.5 w-3.5", topic.progress?.bookmarked && "fill-accent")} />
      </button>
    </div>
  );
}

function StageBlock({
  stage,
  phaseId,
  onToggle,
  onOpen,
  onBookmark,
  devMode,
  topicLockingDisabled,
  technologies,
}: {
  stage: StageWithTopics;
  phaseId: string;
  onToggle: (id: string, completed: boolean) => void;
  onOpen: (t: TopicWithProgress) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  devMode?: boolean;
  topicLockingDisabled?: boolean;
  technologies?: Technology[];
}) {
  const completedCount = stage.topics.filter((t) => t.progress?.completed).length;
  const topicLocks = topicLockingDisabled ? null : computeStageTopicLocks(stage.topics);
  return (
    <AccordionItem value={`${phaseId}__${stage.id}`} className="border-dashed">
      <AccordionTrigger className="py-2.5">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Layers className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="text-xs font-mono-tabular text-muted shrink-0">
            Stage {stage.stage_number}
          </span>
          <p className="text-sm font-medium truncate flex-1">{stage.title}</p>
          <Link
            href={`/roadmap/stage/${stage.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-accent hover:underline shrink-0 hidden sm:inline"
          >
            Open page
          </Link>
          <span className="text-xs text-muted font-mono-tabular shrink-0">
            {completedCount}/{stage.topics.length}
          </span>
          {stage.estimated_hours && (
            <span className="text-xs text-muted font-mono-tabular shrink-0 hidden sm:inline">
              {formatHours(stage.estimated_hours)}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {stage.description && (
          <p className="text-xs text-muted mb-2 px-2">{stage.description}</p>
        )}
        <div className="flex flex-col gap-1">
          {stage.topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              onToggle={onToggle}
              onOpen={onOpen}
              onBookmark={onBookmark}
              devMode={devMode}
              lockInfo={topicLocks?.get(topic.id)}
            />
          ))}
        </div>

        {stage.exercises.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5" /> Exercises ({stage.exercises.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {stage.exercises.map((ex) => (
                <li key={ex.id} className="text-xs text-foreground/80 pl-2 border-l-2 border-border">
                  {ex.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage.projects.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5" /> Stage projects ({stage.projects.length})
            </p>
            <ul className="flex flex-col gap-2">
              {stage.projects.map((p) => {
                const projectTech = matchTechnologiesInText(p.description, technologies ?? []);
                return (
                  <li key={p.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge
                        variant={p.difficulty === "hard" ? "danger" : p.difficulty === "medium" ? "warning" : "success"}
                      >
                        {p.difficulty}
                      </Badge>
                    </div>
                    <p className="text-muted mt-0.5">{p.description}</p>
                    {projectTech.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-muted mr-0.5">Tech stack:</span>
                        {projectTech.map((tech) => (
                          <Badge key={tech.id} variant="accent" className="text-[10px] font-normal">
                            {tech.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Stage 2 — Item 27: Visual Roadmap — card-based view.
 *
 * Career Ladder → Phase Cards → Stage Cards → Topic Cards, as an
 * alternative presentation to the accordion (List) view above. Reuses the
 * same `usePhasesWithProgress` data and the same `TopicRow` component for
 * the innermost level — only the presentation/navigation layer differs, so
 * this is additive, not a rewrite. Drill-down state (which phase/stage is
 * open) lives here, scoped to card mode only.
 */
function PhaseCardGrid({
  phases,
  onToggle,
  onOpen,
  onBookmark,
  devMode,
  isPhaseLocked,
  unlockedOverride,
  onUnlock,
  prereqThreshold,
  topicLockingDisabled,
}: {
  phases: PhaseWithTopics[];
  onToggle: (id: string, completed: boolean) => void;
  onOpen: (t: TopicWithProgress) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  devMode?: boolean;
  isPhaseLocked: (index: number) => { locked: boolean; prevTitle?: string; prevPct?: number };
  unlockedOverride: Set<string>;
  onUnlock: (phaseId: string) => void;
  prereqThreshold: number;
  topicLockingDisabled?: boolean;
}) {
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [openStageId, setOpenStageId] = useState<string | null>(null);

  const openPhase = phases.find((p) => p.id === openPhaseId) ?? null;
  const openStage = openPhase?.stages?.find((s) => s.id === openStageId) ?? null;

  // Stage Cards drill-down: a phase is open, showing its stages as cards.
  if (openPhase && !openStage) {
    const completedCount = openPhase.topics.filter((t) => t.progress?.completed).length;
    const totalCount = openPhase.topics.length;
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setOpenPhaseId(null)}
          className="text-xs text-muted hover:text-foreground flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3 w-3" /> All phases
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono-tabular">
              {openPhase.phase_number}
            </Badge>
            <h2 className="text-lg font-semibold tracking-tight">{openPhase.title}</h2>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={pct(completedCount, totalCount)} className="h-1.5 w-40" />
            <span className="text-xs text-muted font-mono-tabular">
              {completedCount}/{totalCount} topics
            </span>
          </div>
        </div>
        {openPhase.stages && openPhase.stages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openPhase.stages.map((stage) => {
              const sCompleted = stage.topics.filter((t) => t.progress?.completed).length;
              const sTotal = stage.topics.length;
              return (
                <Card
                  key={stage.id}
                  className="cursor-pointer transition-standard hover:border-accent/40"
                  onClick={() => setOpenStageId(stage.id)}
                >
                  <CardContent noHeader className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate flex-1">
                        Stage {stage.stage_number} — {stage.title}
                      </p>
                      <ChevronRight className="h-3.5 w-3.5 text-muted shrink-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct(sCompleted, sTotal)} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted font-mono-tabular shrink-0">
                        {sCompleted}/{sTotal}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Phases with no stage breakdown render their topics directly, same as the List view.
          <div className="flex flex-col gap-1">
            {openPhase.topics.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onToggle={onToggle}
                onOpen={onOpen}
                onBookmark={onBookmark}
                devMode={devMode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Topic Cards drill-down: a stage is open, showing its topics.
  if (openPhase && openStage) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setOpenStageId(null)}
          className="text-xs text-muted hover:text-foreground flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3 w-3" /> {openPhase.title}
        </button>
        <h2 className="text-lg font-semibold tracking-tight">
          Stage {openStage.stage_number} — {openStage.title}
        </h2>
        <div className="flex flex-col gap-1">
          {(() => {
            const topicLocks = topicLockingDisabled ? null : computeStageTopicLocks(openStage.topics);
            return openStage.topics.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onToggle={onToggle}
                onOpen={onOpen}
                onBookmark={onBookmark}
                devMode={devMode}
                lockInfo={topicLocks?.get(topic.id)}
              />
            ));
          })()}
        </div>
      </div>
    );
  }

  // Top level: Career Ladder — Phase Cards.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {phases.map((phase) => {
        const phaseIndex = phases.findIndex((p) => p.id === phase.id);
        const completedCount = phase.topics.filter((t) => t.progress?.completed).length;
        const totalCount = phase.topics.length;
        const lockInfo = isPhaseLocked(phaseIndex);
        const isLocked = lockInfo.locked && !unlockedOverride.has(phase.id);

        return (
          <Card
            key={phase.id}
            className={cn(
              "transition-standard",
              isLocked ? "opacity-60" : "cursor-pointer hover:border-accent/40"
            )}
            onClick={() => !isLocked && setOpenPhaseId(phase.id)}
          >
            <CardContent noHeader className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono-tabular shrink-0">
                  {phase.phase_number}
                </Badge>
                {isLocked ? (
                  <Lock className="h-3.5 w-3.5 text-muted shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted shrink-0" />
                )}
              </div>
              <p className="text-sm font-medium">{phase.title}</p>
              <div className="flex items-center gap-2">
                <Progress value={pct(completedCount, totalCount)} className="h-1.5 flex-1" />
                <span className="text-xs text-muted font-mono-tabular shrink-0">
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {phase.band && (
                  <Badge variant="accent" className="shrink-0 text-[10px]">
                    {phase.band}
                  </Badge>
                )}
                {inferDomains(phase.title).map((d) => (
                  <Badge key={d} variant="outline" className="shrink-0 text-[10px]">
                    {d}
                  </Badge>
                ))}
              </div>
              {isLocked && (
                <p
                  className="text-[11px] text-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  Requires {lockInfo.prevTitle} at {prereqThreshold}%+ (currently {lockInfo.prevPct}%) —{" "}
                  <button className="text-accent hover:underline" onClick={() => onUnlock(phase.id)}>
                    unlock anyway
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function RoadmapPage() {
  const { user } = useUser();
  const { data: displayName } = useDisplayName(user?.id);
  const { data: userSettings } = useUserSettings(user?.id);
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: technologies } = useTechnologies();
  const { data: bipStatus, mutate: mutateBip } = useBuildInPublicStatus(user?.id);
  const [activeTopic, setActiveTopic] = useState<TopicWithProgress | null>(null);
  const { enabled: devMode } = useDeveloperMode(user?.id);
  const { disabled: topicLockingDisabled } = useTopicLockingDisabled(user?.id);
  const [unlockedOverride, setUnlockedOverride] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "cards" | "kanban" | "calendar" | "path">("list");

  const hasActiveFilters =
    search.trim() !== "" || bandFilter !== "all" || difficultyFilter !== "all" || domainFilter !== "all";

  function clearFilters() {
    setSearch("");
    setBandFilter("all");
    setDifficultyFilter("all");
    setDomainFilter("all");
  }

  // Filtering happens at three levels: a phase survives if its band matches
  // (when set), AND if a difficulty filter is active it must have at least
  // one topic the user rated at that difficulty, AND if there's search text
  // either the phase title matches or at least one of its topics does. When
  // a phase survives on title-match alone, all its topics still render —
  // filtering narrows which *phases* are worth opening, not which topics
  // inside a matched phase disappear. Difficulty is a user-rated field on
  // topic_progress (only set once someone has actually rated a topic), so
  // filtering by it narrows to topics you've engaged with and tagged — not
  // an inherent roadmap attribute. Band is a real, sourced grouping field.
  // Domain is a *separate*, client-derived heuristic tag (see
  // lib/domain-taxonomy.ts) — no domain field exists in the source data, so
  // this filters against an inferred label, not sourced data, and is
  // clearly labeled as such in the UI.
  const filteredPhases = useMemo(() => {
    if (!hasActiveFilters) return phases;
    const q = search.trim().toLowerCase();

    return phases
      .map((phase) => {
        if (bandFilter !== "all" && phase.band !== bandFilter) return null;
        if (domainFilter !== "all" && !inferDomains(phase.title).includes(domainFilter as (typeof DOMAINS)[number]))
          return null;

        const matchesDifficulty = (t: TopicWithProgress) =>
          difficultyFilter === "all" || t.progress?.difficulty === difficultyFilter;
        const matchesSearch = (t: TopicWithProgress) => !q || t.title.toLowerCase().includes(q);

        if (difficultyFilter !== "all" && !phase.topics.some(matchesDifficulty)) return null;

        const titleMatches = q !== "" && phase.title.toLowerCase().includes(q);
        const hasMatchingTopic = phase.topics.some((t) => matchesDifficulty(t) && matchesSearch(t));
        if (q && !titleMatches && !hasMatchingTopic) return null;

        // Narrow the visible topic list only when the difficulty filter is
        // active, or when search matched specific topics rather than the
        // phase title as a whole.
        const shouldNarrowTopics = difficultyFilter !== "all" || (q && !titleMatches);
        const narrowedTopics = shouldNarrowTopics
          ? phase.topics.filter((t) => matchesDifficulty(t) && matchesSearch(t))
          : phase.topics;

        const narrowedStages = shouldNarrowTopics
          ? (phase.stages ?? [])
              .map((stage) => ({
                ...stage,
                topics: stage.topics.filter((t) => matchesDifficulty(t) && matchesSearch(t)),
              }))
              .filter((stage) => stage.topics.length > 0)
          : phase.stages;

        return { ...phase, topics: narrowedTopics, stages: narrowedStages };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [phases, hasActiveFilters, search, bandFilter, difficultyFilter, domainFilter]);

  const PREREQ_THRESHOLD = 50; // % of previous phase's topics that must be complete

  function isPhaseLocked(index: number): { locked: boolean; prevTitle?: string; prevPct?: number } {
    if (index === 0) return { locked: false };
    const prev = phases[index - 1];
    if (!prev || prev.topics.length === 0) return { locked: false };
    const prevDone = prev.topics.filter((t) => t.progress?.completed).length;
    const prevPct = pct(prevDone, prev.topics.length);
    return { locked: prevPct < PREREQ_THRESHOLD, prevTitle: prev.title, prevPct };
  }

  const bipMap = useMemo(() => new Map((bipStatus ?? []).map((b) => [b.phase_id, b])), [bipStatus]);

  // The phase containing the next incomplete topic, walked in the same
  // phase -> stage -> topic order as Dashboard's nextTopic — this is
  // "the phase you're currently on," used to visually distinguish its
  // badge (accent) from every other listed phase's badge (outline),
  // which otherwise all look identical regardless of relevance.
  const currentPhaseId = useMemo(() => {
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phase, phaseIdx, stageIdx, topicIdx }))
      )
    );
    const next = candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => {
        if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
        if (a.stageIdx !== b.stageIdx) return a.stageIdx - b.stageIdx;
        return a.topicIdx - b.topicIdx;
      })[0];
    return next?.phase.id ?? null;
  }, [phases]);

  async function handleToggle(topicId: string, completed: boolean) {
    if (!user) return;
    try {
      await toggleTopicComplete(user.id, topicId, completed);
      await mutateProgress();
    } catch {
      toast.error("Couldn't update topic.");
    }
  }

  async function handleBookmark(topicId: string, bookmarked: boolean) {
    if (!user) return;
    try {
      await updateTopicProgress(user.id, topicId, { bookmarked });
      await mutateProgress();
    } catch {
      toast.error("Couldn't update bookmark.");
    }
  }

  async function handleBipToggle(phaseId: string, posted: boolean) {
    if (!user) return;
    try {
      await upsertBuildInPublic(user.id, phaseId, { posted });
      await mutateBip();
      toast.success(posted ? "Marked as posted" : "Marked as not posted");
    } catch {
      toast.error("Couldn't update.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Roadmap</h1>
        <p className="text-sm text-muted mt-1">21 phases · stages · topics · exercises · projects · capstones</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Search topics and phases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bandFilter} onValueChange={setBandFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Band" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bands</SelectItem>
            {BANDS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulty</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-1 shrink-0 flex-wrap">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-standard",
              viewMode === "list" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-standard",
              viewMode === "cards" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
            title="Card view"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-standard",
              viewMode === "kanban" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
            title="Kanban view"
          >
            <Columns3 className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-standard",
              viewMode === "calendar" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
            title="Calendar view"
          >
            <Calendar className="h-3.5 w-3.5" /> Calendar
          </button>
          <button
            onClick={() => setViewMode("path")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-standard",
              viewMode === "path" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
            title="Learning Path view"
          >
            <Workflow className="h-3.5 w-3.5" /> Path
          </button>
        </div>
      </div>
      {hasActiveFilters && (
        <p className="text-xs text-muted -mt-3">
          {filteredPhases.length} of {phases.length} phases match
          {difficultyFilter !== "all" && " — difficulty filters only topics you've rated"}
          {domainFilter !== "all" && " — domain is inferred from phase titles, not sourced data"}
        </p>
      )}

      {viewMode === "cards" ? (
        <PhaseCardGrid
          phases={filteredPhases}
          onToggle={handleToggle}
          onOpen={setActiveTopic}
          onBookmark={handleBookmark}
          devMode={devMode}
          isPhaseLocked={isPhaseLocked}
          unlockedOverride={unlockedOverride}
          onUnlock={(phaseId) => setUnlockedOverride((prev) => new Set(prev).add(phaseId))}
          prereqThreshold={PREREQ_THRESHOLD}
          topicLockingDisabled={topicLockingDisabled}
        />
      ) : viewMode === "kanban" ? (
        <KanbanView phases={filteredPhases} onToggle={handleToggle} onOpen={setActiveTopic} />
      ) : viewMode === "calendar" ? (
        <CalendarView phases={filteredPhases} onOpen={setActiveTopic} settings={userSettings} />
      ) : viewMode === "path" ? (
        <LearningPathView phases={filteredPhases} />
      ) : (
      <Accordion type="multiple" className="flex flex-col gap-3">
        {filteredPhases.map((phase) => {
          const phaseIndex = phases.findIndex((p) => p.id === phase.id);
          const completedCount = phase.topics.filter((t) => t.progress?.completed).length;
          const totalCount = phase.topics.length;
          const bip = bipMap.get(phase.id);
          const lockInfo = isPhaseLocked(phaseIndex);
          const isLocked = lockInfo.locked && !unlockedOverride.has(phase.id);

          return (
            <AccordionItem key={phase.id} value={isLocked ? `locked-${phase.id}` : phase.id} id={phase.id}>
              <AccordionTrigger disabled={isLocked} className={cn(isLocked && "opacity-60")}>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <Badge
                    variant={phase.id === currentPhaseId ? "accent" : "outline"}
                    className={cn(
                      "shrink-0 font-mono-tabular",
                      phase.id === currentPhaseId && "shadow-sm shadow-accent/30"
                    )}
                  >
                    {phase.phase_number}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{phase.title}</p>
                    {devMode && (
                      <p className="text-[10px] text-muted font-mono-tabular truncate">{phase.id}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={pct(completedCount, totalCount)} className="h-1.5 w-32" />
                      <span className="text-xs text-muted font-mono-tabular shrink-0">
                        {completedCount}/{totalCount}
                      </span>
                      <Link
                        href={`/roadmap/phase/${phase.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-accent hover:underline shrink-0 hidden sm:inline"
                      >
                        Open page
                      </Link>
                    </div>
                  </div>
                  {isLocked && (
                    <Badge variant="warning" className="shrink-0 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </Badge>
                  )}
                  {totalCount > 0 && completedCount === totalCount && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 gap-1 text-xs hidden sm:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadCertificate({
                          displayName: displayName ?? null,
                          milestoneTitle: phase.title,
                          milestoneSubtitle: `Phase ${phase.phase_number}`,
                        });
                      }}
                    >
                      <Award className="h-3.5 w-3.5" /> Certificate
                    </Button>
                  )}
                  {phase.band && (
                    <Badge variant="accent" className="shrink-0 hidden sm:inline-flex">
                      {phase.band}
                    </Badge>
                  )}
                  {inferDomains(phase.title).map((d) => (
                    <Badge
                      key={d}
                      variant="outline"
                      className="shrink-0 hidden lg:inline-flex"
                      title={`Domain tag inferred from phase title, not sourced data`}
                    >
                      {d}
                    </Badge>
                  ))}
                  {phase.estimated_hours && (
                    <span className="text-xs text-muted font-mono-tabular shrink-0 hidden sm:flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatHours(phase.estimated_hours)}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              {isLocked && (
                <div className="px-4 pb-3 pt-0 flex items-center gap-3 text-xs text-muted">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Get {lockInfo.prevTitle} to at least {PREREQ_THRESHOLD}% (currently {lockInfo.prevPct}%)
                    before this phase, or
                  </span>
                  <button
                    className="text-accent hover:underline shrink-0"
                    onClick={() => setUnlockedOverride((prev) => new Set(prev).add(phase.id))}
                  >
                    unlock anyway
                  </button>
                </div>
              )}
              <AccordionContent>
                {phase.stages && phase.stages.length > 0 ? (
                  <Accordion type="multiple" className="flex flex-col gap-2 mt-2">
                    {phase.stages.map((stage) => (
                      <StageBlock
                        key={stage.id}
                        stage={stage}
                        phaseId={phase.id}
                        onToggle={handleToggle}
                        onOpen={setActiveTopic}
                        onBookmark={handleBookmark}
                        devMode={devMode}
                        topicLockingDisabled={topicLockingDisabled}
                        technologies={technologies}
                      />
                    ))}
                  </Accordion>
                ) : (
                  <div className="flex flex-col gap-1 mt-2">
                    {phase.topics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        topic={topic}
                        onToggle={handleToggle}
                        onOpen={setActiveTopic}
                        onBookmark={handleBookmark}
                        devMode={devMode}
                      />
                    ))}
                  </div>
                )}

                {phase.capstone && (
                  <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-3">
                    <div className="flex items-start gap-2">
                      <Trophy className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-warning mb-1">
                          Capstone — {phase.capstone.title}
                        </p>
                        <p className="text-sm text-foreground/90">{phase.capstone.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ship It section */}
                {!phase.skip_build_in_public && phase.build_in_public_prompt && (
                  <div className="mt-4 rounded-md border border-accent/25 bg-accent/5 p-3">
                    <div className="flex items-start gap-2">
                      <Megaphone className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-accent mb-1">Ship it — Build in Public</p>
                        <p className="text-sm text-foreground/90">{phase.build_in_public_prompt}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={bip?.posted ? "secondary" : "outline"}
                            onClick={() => handleBipToggle(phase.id, !bip?.posted)}
                          >
                            {bip?.posted ? "✓ Posted" : "Mark as posted"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const draft = generateBuildInPublicDraft(phase, phase.capstone ?? null);
                              navigator.clipboard.writeText(draft);
                              toast.success("Draft post copied — paste it wherever you post.");
                            }}
                          >
                            Copy draft post
                          </Button>
                          <Input
                            placeholder="Proof URL (tweet, post, etc.)"
                            defaultValue={bip?.proof_url ?? ""}
                            onBlur={(e) =>
                              user &&
                              upsertBuildInPublic(user.id, phase.id, { proof_url: e.target.value }).then(() =>
                                mutateBip()
                              )
                            }
                            className="h-8 text-xs flex-1 max-w-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {phase.skip_build_in_public && (
                  <div className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-xs text-muted flex items-center gap-2">
                    <Star className="h-3.5 w-3.5" />
                    Skip public posting this phase — {phase.build_in_public_prompt}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      )}

      <TopicDetailSheet
        topic={activeTopic}
        onClose={() => setActiveTopic(null)}
        onUpdated={mutateProgress}
      />
    </div>
  );
}
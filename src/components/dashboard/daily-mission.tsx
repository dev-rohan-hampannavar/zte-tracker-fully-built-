"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Target, Clock, CheckCircle2, Loader2, Dumbbell, FolderGit2, Plus, ListChecks, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toggleTopicComplete, applyHoursToNextTopic } from "@/lib/hooks/use-roadmap";
import { upsertProjectProgress } from "@/lib/hooks/use-projects";
import { toggleExerciseComplete } from "@/lib/hooks/use-exercises";
import { logStudySession } from "@/lib/hooks/use-daily-logs";
import { logStudySessionEntry, useTodaysSessions } from "@/lib/hooks/use-study-sessions";
import { formatHours, cn } from "@/lib/utils";
import type {
  StageWithTopics,
  PhaseWithTopics,
  ExerciseProgress,
  ProjectProgress,
  StudySessionActivity,
} from "@/types/database";

const ACTIVITY_LABELS: Record<StudySessionActivity, string> = {
  learn: "Learn",
  practice: "Practice",
  project: "Project",
  revision: "Revision",
  dsa: "DSA",
  other: "Other",
};

interface DailyMissionProps {
  userId: string | undefined;
  nextTopic: { topic: StageWithTopics["topics"][number]; phase: PhaseWithTopics } | null;
  currentStage: StageWithTopics | null;
  exerciseProgress: ExerciseProgress[];
  projectProgress: ProjectProgress[] | undefined;
  orderedIncompleteTopics: { id: string; title: string; estimated_hours: number | null; progress: { actual_minutes_spent: number } | null }[];
  onMutateProgress: () => Promise<unknown>;
  onMutateLogs: () => Promise<unknown>;
}

export function DailyMission({
  userId,
  nextTopic,
  currentStage,
  exerciseProgress,
  projectProgress,
  orderedIncompleteTopics,
  onMutateProgress,
  onMutateLogs,
}: DailyMissionProps) {
  const [completing, setCompleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [minutesInput, setMinutesInput] = useState("");
  const [activity, setActivity] = useState<StudySessionActivity>("learn");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: todaysSessions, mutate: mutateSessions } = useTodaysSessions(userId);

  const exerciseProgressMap = useMemo(
    () => new Map(exerciseProgress.map((e) => [e.exercise_id, e])),
    [exerciseProgress]
  );

  const currentProject = useMemo(() => {
    if (!currentStage) return null;
    const project = currentStage.projects[0];
    if (!project) return null;
    const progress = (projectProgress ?? []).find((p) => p.phase_id === nextTopic?.phase.id);
    return { project, progress };
  }, [currentStage, projectProgress, nextTopic]);

  // Remaining topics in the current stage — nextTopic is already the first
  // incomplete one, so this is everything else in currentStage.topics that
  // isn't done yet, in curriculum order (checklist, toggle-able).
  const remainingStageTopics = useMemo(() => {
    if (!currentStage) return [];
    return currentStage.topics.filter((t) => !t.progress?.completed);
  }, [currentStage]);

  // Preview of what comes after this stage — orderedIncompleteTopics is
  // already the full cross-stage remaining chain in curriculum order, so
  // everything past this stage's own topics is "up next" (read-only, no
  // toggling — that only happens once a topic becomes the current one).
  const upcomingTopics = useMemo(() => {
    const remainingIds = new Set(remainingStageTopics.map((t) => t.id));
    return orderedIncompleteTopics.filter((t) => !remainingIds.has(t.id)).slice(0, 5);
  }, [orderedIncompleteTopics, remainingStageTopics]);

  // Curriculum allocation is the STAGE's total hours (the actual source-of-
  // truth unit per the spec), not a single topic's. Logged is the sum of
  // every topic's actual_minutes_spent within this stage — real recorded
  // time, never capped, so overruns show as a positive "over" delta rather
  // than being silently absorbed.
  const stageHours = useMemo(() => {
    if (!currentStage) return null;
    const allocated = currentStage.estimated_hours ?? null;
    const loggedMinutes = currentStage.topics.reduce(
      (sum, t) => sum + (t.progress?.actual_minutes_spent ?? 0),
      0
    );
    const loggedHours = loggedMinutes / 60;
    return { allocated, loggedHours };
  }, [currentStage]);

  // Current topic's own hours — separate from the stage roll-up above, so
  // an overrun on just this topic is visible instead of being invisibly
  // absorbed into the stage total (applyHoursToNextTopic already rolls
  // overflow minutes into the next topic in the DB; this just surfaces
  // that it happened).
  const topicHours = useMemo(() => {
    if (!nextTopic?.topic.estimated_hours) return null;
    const allocated = nextTopic.topic.estimated_hours;
    const loggedMinutes = nextTopic.topic.progress?.actual_minutes_spent ?? 0;
    const loggedHours = loggedMinutes / 60;
    return { allocated, loggedHours, overrun: Math.max(0, loggedHours - allocated) };
  }, [nextTopic]);

  const todaysTotal = (todaysSessions ?? []).reduce((s, sess) => s + Number(sess.hours), 0);

  // One-line "what to do right now" — answers the spec's "5 second" test
  // without making the person read the whole checklist first.
  const missionSummary = useMemo(() => {
    if (!nextTopic) return null;
    const parts: string[] = [`finish "${nextTopic.topic.title}"`];
    const pendingExercises = (currentStage?.exercises ?? []).filter(
      (ex) => !exerciseProgressMap.get(ex.id)?.completed
    ).length;
    if (pendingExercises > 0) {
      parts.push(`${pendingExercises} exercise${pendingExercises === 1 ? "" : "s"}`);
    }
    if (currentProject && currentProject.progress?.status !== "completed") {
      parts.push(`push "${currentProject.project.name}" forward`);
    }
    return parts.join(", ") + ".";
  }, [nextTopic, currentStage, exerciseProgressMap, currentProject]);


  async function handleCompleteTopic() {
    if (!userId || !nextTopic) return;
    await handleCompleteTopicById(nextTopic.topic.id, true);
  }

  async function handleCompleteTopicById(topicId: string, checked: boolean) {
    if (!userId) return;
    setCompleting(true);
    try {
      await toggleTopicComplete(userId, topicId, checked);
      await onMutateProgress();
      const title = topicId === nextTopic?.topic.id ? nextTopic.topic.title : topicId;
      toast.success(`Marked "${title}" complete`);
    } catch {
      toast.error("Couldn't update. Try again.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleExerciseToggle(exerciseId: string, checked: boolean) {
    if (!userId) return;
    try {
      await toggleExerciseComplete(userId, exerciseId, checked);
      await onMutateProgress();
    } catch {
      toast.error("Couldn't update exercise.");
    }
  }

  async function handleProjectStatusToggle() {
    if (!userId || !currentProject || !nextTopic) return;
    const current = currentProject.progress?.status ?? "not_started";
    const next = current === "not_started" ? "in_progress" : current === "in_progress" ? "completed" : "not_started";
    try {
      await upsertProjectProgress(userId, nextTopic.phase.id, { status: next });
      await onMutateProgress();
    } catch {
      toast.error("Couldn't update project status.");
    }
  }

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const h = parseFloat(hoursInput || "0");
    const m = parseFloat(minutesInput || "0");
    const totalHours = h + m / 60;
    if (!totalHours || totalHours <= 0) {
      toast.error("Enter a duration.");
      return;
    }
    setSubmitting(true);
    try {
      // Existing systems (daily_logs -> streak/heatmap, topic_progress via
      // applyHoursToNextTopic) stay exactly as they were — this only adds
      // the new session-level record alongside them, it doesn't replace
      // either.
      await logStudySession(totalHours, notes || undefined);
      await logStudySessionEntry(userId, {
        hours: totalHours,
        activity,
        topicId: nextTopic?.topic.id ?? null,
        stageProjectId: currentProject?.project.id ?? null,
        notes: notes || undefined,
      });
      await onMutateLogs();
      await mutateSessions();

      if (orderedIncompleteTopics.length > 0) {
        const result = await applyHoursToNextTopic(userId, orderedIncompleteTopics, totalHours);
        await onMutateProgress();
        if (result.completedTopics.length > 0) {
          const names = result.completedTopics.map((t) => t.title).join(", ");
          toast.success(
            result.completedTopics.length === 1
              ? `Logged ${formatHours(totalHours)} — completed "${names}"!`
              : `Logged ${formatHours(totalHours)} — completed ${result.completedTopics.length} topics: ${names}!`
          );
        } else {
          toast.success(`Logged ${formatHours(totalHours)}.`);
        }
      } else {
        toast.success(`Logged ${formatHours(totalHours)}.`);
      }

      setHoursInput("");
      setMinutesInput("");
      setNotes("");
      setActivity("learn");
      setDialogOpen(false);
    } catch {
      toast.error("Couldn't save session. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!nextTopic) {
    return (
      <Card className="relative overflow-hidden border-accent/30 shadow-lg shadow-accent/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <CardTitle size="lg">Daily Mission</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">All topics complete. You&apos;ve finished the roadmap. 🎉</p>
        </CardContent>
      </Card>
    );
  }

  const stageProgressPct = stageHours?.allocated
    ? Math.min(100, (stageHours.loggedHours / stageHours.allocated) * 100)
    : 0;
  const overrun = stageHours?.allocated ? Math.max(0, stageHours.loggedHours - stageHours.allocated) : 0;

  return (
    <Card className="relative overflow-hidden border-accent/30 shadow-lg shadow-accent/5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
      />
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <CardTitle size="lg">Daily Mission</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-5">
        {missionSummary && (
          <p className="text-sm">
            <span className="font-medium text-foreground">Today: </span>
            <span className="text-muted">{missionSummary}</span>
          </p>
        )}

        {/* Position */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="accent">Phase {nextTopic.phase.phase_number}</Badge>
            {currentStage && <Badge variant="outline">Stage {currentStage.stage_number} — {currentStage.title}</Badge>}
          </div>
          <p className="text-card-title font-semibold mt-1">{nextTopic.topic.title}</p>
          <p className="text-xs text-muted">
            Continue where you left off — the next incomplete task in this topic.
          </p>
          {topicHours && (
            <p className="text-xs font-mono-tabular mt-1">
              <span className="text-muted">
                {formatHours(topicHours.loggedHours)} / {formatHours(topicHours.allocated)} logged
              </span>
              {topicHours.overrun > 0 && (
                <span className="text-warning"> · +{formatHours(topicHours.overrun)} over</span>
              )}
            </p>
          )}
        </div>

        {/* Topics to cover: rest of this stage, plus a preview of what's next */}
        {(remainingStageTopics.length > 0 || upcomingTopics.length > 0) && (
          <div className="flex flex-col gap-3 pt-1 border-t border-border">
            {remainingStageTopics.length > 0 && (
              <div className="pt-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  <ListChecks className="h-3 w-3" /> Topics to cover in this stage
                </p>
                <ul className="flex flex-col gap-1.5">
                  {remainingStageTopics.map((t) => {
                    const isCurrent = t.id === nextTopic.topic.id;
                    return (
                      <li key={t.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={false}
                          disabled={!isCurrent}
                          onCheckedChange={(v) => isCurrent && handleCompleteTopicById(t.id, v === true)}
                          className="mt-0.5"
                        />
                        <span className={cn("text-sm", isCurrent && "font-medium text-accent")}>
                          {t.title}
                          {isCurrent && <span className="text-muted font-normal"> — current</span>}
                        </span>
                        {t.estimated_hours && (
                          <span className="ml-auto text-xs text-muted font-mono-tabular shrink-0">
                            {formatHours(t.estimated_hours)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {upcomingTopics.length > 0 && (
              <div className="pt-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  <ArrowRight className="h-3 w-3" /> Up next
                </p>
                <ul className="flex flex-col gap-1">
                  {upcomingTopics.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm text-muted">
                      <span>{t.title}</span>
                      {t.estimated_hours && (
                        <span className="text-xs font-mono-tabular shrink-0">{formatHours(t.estimated_hours)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Checklist: exercises + project, scoped to the current stage */}
        {currentStage && (currentStage.exercises.length > 0 || currentProject) && (
          <div className="flex flex-col gap-3 pt-1 border-t border-border">
            {currentStage.exercises.length > 0 && (
              <div className="pt-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  <Dumbbell className="h-3 w-3" /> Practice exercises
                </p>
                <ul className="flex flex-col gap-1.5">
                  {currentStage.exercises.map((ex) => {
                    const done = !!exerciseProgressMap.get(ex.id)?.completed;
                    return (
                      <li key={ex.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={done}
                          onCheckedChange={(v) => handleExerciseToggle(ex.id, v === true)}
                          className="mt-0.5"
                        />
                        <span className={cn("text-sm", done && "text-muted line-through")}>{ex.description}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {currentProject && (
              <div className="pt-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  <FolderGit2 className="h-3 w-3" /> Project
                </p>
                <button
                  onClick={handleProjectStatusToggle}
                  className="flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2 transition-standard"
                >
                  <span className="text-sm font-medium">{currentProject.project.name}</span>
                  <Badge
                    variant={
                      currentProject.progress?.status === "completed"
                        ? "success"
                        : currentProject.progress?.status === "in_progress"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {currentProject.progress?.status === "completed"
                      ? "Done"
                      : currentProject.progress?.status === "in_progress"
                        ? "In progress"
                        : "Not started"}
                  </Badge>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Curriculum allocation vs actual logged — never capped */}
        {stageHours?.allocated != null && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" /> Curriculum allocation: {formatHours(stageHours.allocated)}
              </span>
              <span className="font-mono-tabular">
                {formatHours(stageHours.loggedHours)} logged
                {overrun > 0 && <span className="text-warning"> · +{formatHours(overrun)} over</span>}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-standard"
                style={{ width: `${stageProgressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={() => setDialogOpen(true)} size="lg">
            <Plus className="h-4 w-4" /> Log study time
          </Button>
          <Button onClick={handleCompleteTopic} disabled={completing} variant="secondary">
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark topic complete
          </Button>
        </div>

        {/* Today's sessions */}
        {(todaysSessions?.length ?? 0) > 0 && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 pt-3">
              Today&apos;s sessions · {formatHours(todaysTotal)} total
            </p>
            <div className="flex flex-col gap-1.5">
              {todaysSessions!.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/90">
                    {ACTIVITY_LABELS[s.activity]}
                    {s.notes && <span className="text-muted"> — {s.notes}</span>}
                  </span>
                  <span className="text-xs text-muted font-mono-tabular shrink-0">
                    {formatHours(Number(s.hours))} ·{" "}
                    {new Date(s.logged_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log study time</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogSession} className="flex flex-col gap-4">
            <div>
              <Label>Duration</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Hours"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    placeholder="Minutes"
                    value={minutesInput}
                    onChange={(e) => setMinutesInput(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Activity</Label>
              <Select value={activity} onValueChange={(v) => setActivity(v as StudySessionActivity)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you work on?"
                className="mt-1"
              />
            </div>
            <DialogFooter className="justify-between">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Log session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
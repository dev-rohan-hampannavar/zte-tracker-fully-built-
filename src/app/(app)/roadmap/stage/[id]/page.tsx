"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useDisplayName } from "@/lib/hooks/use-display-name";
import { useStageDetail, useRoadmap } from "@/lib/hooks/use-roadmap";
import { useProgress, toggleTopicComplete } from "@/lib/hooks/use-roadmap";
import { useExerciseProgress, toggleExerciseComplete } from "@/lib/hooks/use-exercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/roadmap/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCertificate } from "@/lib/certificate";
import { formatHours, pct, cn } from "@/lib/utils";
import { Award, Dumbbell, FolderGit2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function StageDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const { data, isLoading } = useStageDetail(params.id);
  const { data: roadmap } = useRoadmap();
  const { data: displayName } = useDisplayName(user?.id);
  const { data: progress, mutate: mutateProgress } = useProgress(user?.id);
  const { data: exerciseProgress, mutate: mutateExerciseProgress } = useExerciseProgress(user?.id);

  const progressMap = new Map((progress ?? []).map((p) => [p.topic_id, p]));
  const exerciseProgressMap = new Map((exerciseProgress ?? []).map((e) => [e.exercise_id, e]));

  async function handleExerciseToggle(exerciseId: string, completed: boolean) {
    if (!user) return;
    try {
      await toggleExerciseComplete(user.id, exerciseId, completed);
      await mutateExerciseProgress();
    } catch {
      toast.error("Couldn't update exercise.");
    }
  }

  async function handleToggle(topicId: string, completed: boolean) {
    if (!user) return;
    try {
      await toggleTopicComplete(user.id, topicId, completed);
      await mutateProgress();
    } catch {
      toast.error("Couldn't update topic.");
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-sm text-muted">Stage not found.</p>;

  const { stage, topics, projects, exercises } = data;
  const completedCount = topics.filter((t) => progressMap.get(t.id)?.completed).length;
  const parentPhase = (roadmap?.phases ?? []).find((p) => p.id === stage.phase_id) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          ...(parentPhase
            ? [{ label: `Phase ${parentPhase.phase_number} — ${parentPhase.title}`, href: `/roadmap/phase/${parentPhase.id}` }]
            : []),
          { label: `Stage ${stage.stage_number} — ${stage.title}` },
        ]}
      />

      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono-tabular">
            Stage {stage.stage_number}
          </Badge>
          {stage.estimated_hours && (
            <span className="text-xs text-muted font-mono-tabular flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatHours(stage.estimated_hours)}
            </span>
          )}
        </div>
        <h1 className="text-page-title font-semibold tracking-tight mt-1">{stage.title}</h1>
        {stage.description && <p className="text-sm text-muted mt-1">{stage.description}</p>}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2 max-w-xs flex-1">
            <Progress value={pct(completedCount, topics.length)} className="h-1.5 flex-1" />
            <span className="text-xs text-muted font-mono-tabular shrink-0">
              {completedCount}/{topics.length}
            </span>
          </div>
          {topics.length > 0 && completedCount === topics.length && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-7 gap-1 text-xs"
              onClick={() =>
                downloadCertificate({
                  displayName: displayName ?? null,
                  milestoneTitle: stage.title,
                  milestoneSubtitle: `Stage ${stage.stage_number}`,
                })
              }
            >
              <Award className="h-3.5 w-3.5" /> Certificate
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {topics.map((topic) => {
              const p = progressMap.get(topic.id);
              return (
                <Link key={topic.id} href={`/roadmap/topic/${topic.id}`}>
                  <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                    <Checkbox
                      checked={!!p?.completed}
                      onCheckedChange={(v) => handleToggle(topic.id, v === true)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={cn("flex-1 text-sm", p?.completed && "text-muted line-through")}>
                      {topic.title}
                    </span>
                    {topic.estimated_hours && (
                      <span className="text-xs text-muted font-mono-tabular">
                        {formatHours(topic.estimated_hours)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
            {topics.length === 0 && <p className="text-sm text-muted">No topics in this stage.</p>}
          </div>
        </CardContent>
      </Card>

      {exercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Exercises ({exercises.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {exercises.map((ex) => {
                const done = !!exerciseProgressMap.get(ex.id)?.completed;
                return (
                  <li key={ex.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={done}
                      onCheckedChange={(v) => handleExerciseToggle(ex.id, v === true)}
                      className="mt-0.5"
                    />
                    <span className={cn("text-sm pl-1 border-l-2 border-border", done && "text-muted line-through")}>
                      {ex.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4" /> Projects ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.name}</span>
                    <Badge
                      variant={p.difficulty === "hard" ? "danger" : p.difficulty === "medium" ? "warning" : "success"}
                    >
                      {p.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{p.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
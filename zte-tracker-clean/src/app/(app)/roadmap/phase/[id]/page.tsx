"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { RecordNotFound } from "@/components/ui/record-not-found";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, toggleTopicComplete, useExitLadder, useClientSyncMilestones, useMasterPhaseTable, useSkillTracks } from "@/lib/hooks/use-roadmap";
import { useBuildInPublicStatus } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/roadmap/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours, pct, cn } from "@/lib/utils";
import { Clock, Layers, Trophy, Megaphone, IndianRupee, GitCommitHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ClientSyncMilestone } from "@/types/database";
import { FadeUp } from "@/components/motion/primitives";

export default function PhaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: exitLadder } = useExitLadder();
  const { data: milestones } = useClientSyncMilestones();
  const { data: bipStatus } = useBuildInPublicStatus(user?.id);
  const { data: masterTable } = useMasterPhaseTable();
  const { data: skillTracks } = useSkillTracks();

  const phase = phases.find((p) => p.id === params.id);
  const exitRow = phase?.exit_point_code ? (exitLadder ?? []).find((e) => e.exit_code === phase.exit_point_code) : null;
  const linkedMilestones = (milestones ?? []).filter(
    (m) => m.linked_phase === params.id
  ) as ClientSyncMilestone[];
  const bip = (bipStatus ?? []).find((b) => b.phase_id === params.id);

  // "Track" is the closest honest equivalent to a phase objective — roadmap.md
  // has no per-phase Objectives/Prerequisites prose, but it does group phases
  // into named skill tracks (Frontend Core, Backend, etc.), and that grouping
  // doubles as a real, source-backed "Related Phases" relationship.
  const tableRow = phase ? (masterTable ?? []).find((r) => r.phase === phase.phase_number) : null;
  const track = tableRow?.track ?? null;
  const relatedPhaseNumbers = track
    ? (skillTracks ?? []).find((t) => t.track === track)?.phases.filter((n) => n !== phase?.phase_number) ?? []
    : [];
  const relatedPhases = relatedPhaseNumbers
    .map((num) => phases.find((p) => p.phase_number === num))
    .filter((p): p is NonNullable<typeof p> => !!p);

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
  if (!phase) return <RecordNotFound label="Phase" backHref="/roadmap" backLabel="Back to roadmap" />;

  const completedCount = phase.topics.filter((t) => t.progress?.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: `Phase ${phase.phase_number} — ${phase.title}` }]} />

      <FadeUp>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono-tabular">
            Phase {phase.phase_number}
          </Badge>
          {phase.band && <Badge variant="accent">{phase.band}</Badge>}
          {track && <Badge variant="outline">{track}</Badge>}
          {phase.estimated_hours && (
            <span className="text-xs text-muted font-mono-tabular flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatHours(phase.estimated_hours)}
            </span>
          )}
          {bip?.posted && (
            <Badge variant="success" className="flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Shipped in public
            </Badge>
          )}
        </div>
        <h1 className="text-page-title font-semibold tracking-tight mt-1">{phase.title}</h1>
        {phase.description && <p className="text-sm text-muted mt-1">{phase.description}</p>}
        <div className="flex items-center gap-2 mt-3 max-w-xs">
          <Progress value={pct(completedCount, phase.topics.length)} className="h-1.5 flex-1" glow={completedCount === phase.topics.length && phase.topics.length > 0} />
          <span className="text-xs text-muted font-mono-tabular shrink-0">
            {completedCount}/{phase.topics.length}
          </span>
        </div>
      </div>
      </FadeUp>

      {(exitRow || linkedMilestones.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {exitRow && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Exit point
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono-tabular">{exitRow.exit_code}</Badge>
                  <span className="text-sm font-medium">{exitRow.job_level}</span>
                </div>
                {exitRow.salary_range && (
                  <p className="text-sm text-accent font-mono-tabular flex items-center gap-1 mt-1">
                    <IndianRupee className="h-3.5 w-3.5" /> {exitRow.salary_range}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {linkedMilestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommitHorizontal className="h-4 w-4" /> ClientSync milestone
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {linkedMilestones.map((m) => (
                  <p key={m.id} className="text-sm text-muted">{m.description}</p>
                ))}
                <Link href="/clientsync" className="text-xs text-accent hover:underline w-fit">
                  Open ClientSync tracker
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Stages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(phase.stages ?? []).map((stage) => {
            const stageCompleted = stage.topics.filter((t) => t.progress?.completed).length;
            return (
              <div key={stage.id} className="border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono-tabular text-muted shrink-0">
                    Stage {stage.stage_number}
                  </span>
                  <Link href={`/roadmap/stage/${stage.id}`} className="text-sm font-medium hover:text-accent flex-1">
                    {stage.title}
                  </Link>
                  <span className="text-xs text-muted font-mono-tabular shrink-0">
                    {stageCompleted}/{stage.topics.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {stage.topics.map((topic) => (
                    <div key={topic.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2">
                      <Checkbox
                        checked={!!topic.progress?.completed}
                        onCheckedChange={(v) => handleToggle(topic.id, v === true)}
                      />
                      <Link
                        href={`/roadmap/topic/${topic.id}`}
                        className={cn(
                          "flex-1 text-sm",
                          topic.progress?.completed && "text-muted line-through"
                        )}
                      >
                        {topic.title}
                      </Link>
                      {topic.estimated_hours && (
                        <span className="text-xs text-muted font-mono-tabular">
                          {formatHours(topic.estimated_hours)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {(phase.stages ?? []).length === 0 && (
            <p className="text-sm text-muted">No stages in this phase.</p>
          )}
        </CardContent>
      </Card>

      {relatedPhases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related phases</CardTitle>
            <p className="text-xs text-muted mt-1">Other phases in the {track} track.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {relatedPhases.map((p) => (
              <Link key={p.id} href={`/roadmap/phase/${p.id}`}>
                <Badge variant="outline" className="hover:border-accent/40">
                  {p.phase_number} · {p.title}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {phase.capstone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Capstone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{phase.capstone.title}</p>
            <p className="text-sm text-muted mt-1">{phase.capstone.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
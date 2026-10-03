"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveUserRoadmap } from "@/lib/hooks/use-user-roadmap";
import { setDetailedRoadmapTopicStatus, useDetailedRoadmap } from "@/lib/hooks/use-roadmap";
import { todayISO } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const TIME_OPTIONS = [30, 60, 90, 120, 180, 240];
const STATUSES = ["not_started", "learning", "practicing", "applied", "mastered"] as const;
type TopicStatus = (typeof STATUSES)[number];

export function DetailedTrackDailyPlan({ userId }: { userId: string }) {
  const { data: enrollment } = useActiveUserRoadmap(userId);
  const { data: phases, isLoading, mutate } = useDetailedRoadmap(userId);
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const today = todayISO();

  const plan = useMemo(() => {
    const rows = phases ?? [];
    const startIndex = rows.findIndex((phase) => phase.id === enrollment?.starting_detailed_phase_id);
    const touchedBeforeStart = startIndex > 0 && rows.slice(0, startIndex).some((phase) =>
      phase.modules.some((module) => module.topics.some((topic) => topic.progress && topic.progress.status !== "not_started"))
    );
    const eligible = startIndex > 0 && !touchedBeforeStart ? rows.slice(startIndex) : rows;
    const candidates = eligible.flatMap((phase) => phase.modules.flatMap((module) =>
      module.topics
        .filter((topic) => topic.progress?.status !== "mastered" || (!!topic.progress?.next_review_at && topic.progress.next_review_at.slice(0, 10) <= today))
        .map((topic) => ({ topic, phase }))
    ));
    candidates.sort((left, right) => {
      const leftDue = left.topic.progress?.next_review_at ? left.topic.progress.next_review_at.slice(0, 10) <= today : false;
      const rightDue = right.topic.progress?.next_review_at ? right.topic.progress.next_review_at.slice(0, 10) <= today : false;
      return Number(rightDue) - Number(leftDue);
    });
    const tasks: typeof candidates = [];
    let minutes = 0;
    for (const candidate of candidates) {
      const duration = candidate.topic.estimated_minutes;
      if (tasks.length && minutes + duration > availableMinutes) break;
      tasks.push(candidate);
      minutes += duration;
      if (minutes >= availableMinutes) break;
    }
    return { tasks, minutes };
  }, [phases, enrollment?.starting_detailed_phase_id, availableMinutes, today]);

  async function updateTopic(topicId: string, status: TopicStatus) {
    setSavingTopicId(topicId);
    try {
      await setDetailedRoadmapTopicStatus(userId, topicId, status);
      await mutate();
      toast.success("Learning progress saved");
    } catch {
      toast.error("Could not save learning progress");
    } finally {
      setSavingTopicId(null);
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-page-title font-semibold tracking-tight"><CalendarClock className="size-5" /> Daily Plan</h1>
        <p className="mt-1 text-sm text-muted">A focused set of topics from your selected learning track. Mark what you worked on to keep your next plan current.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">How much time do you have today?</p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((minutes) => <Button key={minutes} size="sm" variant={minutes === availableMinutes ? "default" : "outline"} onClick={() => setAvailableMinutes(minutes)}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? "" : "s"}`}</Button>)}
          </div>
        </CardContent>
      </Card>

      {!phases?.length ? (
        <Card><CardHeader><CardTitle>Your learning plan is not available yet</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">The selected track has no published topics. Visit your <Link className="text-accent hover:underline" href="/learning-path">learning path</Link> or contact support.</CardContent></Card>
      ) : plan.tasks.length ? (
        <Card>
          <CardHeader><CardTitle>Today&apos;s plan · {plan.minutes} of {availableMinutes} minutes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {plan.tasks.map(({ topic, phase }, index) => (
              <article key={topic.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div><p className="text-xs text-muted-foreground">{phase.phase_number} · {phase.title}</p><h2 className="mt-1 font-medium">{topic.title}</h2><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{topic.estimated_minutes} min · {topic.difficulty}</p></div>
                  </div>
                  <Select value={topic.progress?.status ?? "not_started"} onValueChange={(value) => void updateTopic(topic.id, value as TopicStatus)}>
                    <SelectTrigger className="w-40" aria-label={`Progress for ${topic.title}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <ul className="ml-12 mt-3 list-disc space-y-1 pl-4 text-sm">{topic.practice_tasks.slice(0, 3).map((task) => <li key={task}>{task}</li>)}</ul>
                {savingTopicId === topic.id && <p className="ml-12 mt-2 text-xs text-muted-foreground"><Loader2 className="mr-1 inline size-3 animate-spin" />Saving progress</p>}
              </article>
            ))}
            <Button asChild variant="outline"><Link href="/learning-path"><BookOpen className="mr-2 size-4" />Open the full learning path</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="flex items-center gap-3 p-6 text-sm"><CheckCircle2 className="size-5 text-success" />You have mastered every topic in your current learning path.</CardContent></Card>
      )}
    </div>
  );
}

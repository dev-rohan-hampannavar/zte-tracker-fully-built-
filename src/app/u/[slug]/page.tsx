import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trophy, Code2, FolderGit2, Flame } from "lucide-react";
import type { Phase, Topic, TopicProgress, DsaProgressRow, ProjectProgress, Capstone } from "@/types/database";
import { computeAchievements } from "@/lib/achievements";
import { EmptyState } from "@/components/ui/empty-state";

export const revalidate = 300; // 5 min cache — public pages don't need to be live-live

async function getProfileData(slug: string) {
  const supabase = await createClient();

  const { data: settings } = (await supabase
    .from("user_settings")
    .select("user_id, public_profile_enabled, display_name")
    .eq("public_profile_slug", slug)
    .single()) as {
    data: { user_id: string; public_profile_enabled: boolean; display_name: string | null } | null;
  };

  if (!settings || !settings.public_profile_enabled) return null;

  const userId = settings.user_id;

  const [
    { data: phases },
    { data: topics },
    { data: capstones },
    { data: progress },
    { data: dsa },
    { data: projects },
  ] = await Promise.all([
    supabase.from("phases").select("*").order("order_index"),
    supabase.from("topics").select("*"),
    supabase.from("capstones").select("*"),
    supabase.from("topic_progress").select("*").eq("user_id", userId),
    supabase.from("dsa_progress").select("*").eq("user_id", userId),
    supabase.from("project_progress").select("*").eq("user_id", userId),
  ]);

  return {
    displayName: settings.display_name,
    phases: (phases ?? []) as Phase[],
    topics: (topics ?? []) as Topic[],
    capstones: (capstones ?? []) as Capstone[],
    progress: (progress ?? []) as TopicProgress[],
    dsa: (dsa ?? []) as DsaProgressRow[],
    projects: (projects ?? []) as ProjectProgress[],
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProfileData(slug);
  if (!data) notFound();

  const { displayName, phases, topics, capstones, progress, dsa, projects } = data;
  const progressMap = new Map(progress.map((p) => [p.topic_id, p]));

  const phaseCompletion = phases.map((phase) => {
    const phaseTopics = topics.filter((t) => t.phase_id === phase.id);
    const done = phaseTopics.filter((t) => progressMap.get(t.id)?.completed).length;
    return {
      phase,
      total: phaseTopics.length,
      done,
      complete: phaseTopics.length > 0 && done === phaseTopics.length,
      capstone: capstones.find((c) => c.phase_id === phase.id) ?? null,
    };
  });

  const totalTopics = topics.length;
  const totalDone = progress.filter((p) => p.completed).length;
  const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

  const dsaDone = dsa.filter((d) => d.completed);
  const dsaStats = {
    total: dsaDone.length,
    easy: dsaDone.filter((d) => d.difficulty === "easy").length,
    medium: dsaDone.filter((d) => d.difficulty === "medium").length,
    hard: dsaDone.filter((d) => d.difficulty === "hard").length,
  };

  const shippedProjects = projects.filter((p) => p.status === "completed" && (p.github_url || p.deployment_url));

  const achievements = computeAchievements({
    phasesCompleted: phaseCompletion.filter((p) => p.complete).length,
    totalPhases: phases.length,
    topicsCompleted: totalDone,
    dsaCompleted: dsaStats.total,
    dsaHard: dsaStats.hard,
    projectsShipped: shippedProjects.length,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Public progress profile</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            {displayName || "Zero to Elite — Engineering Roadmap"}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="accent">{overallPct}% complete</Badge>
            <Badge variant="outline">{totalDone}/{totalTopics} topics</Badge>
          </div>
        </div>

        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <Badge key={a.id} variant="success" className="gap-1">
                  {a.label}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Flame className="h-4 w-4 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold font-mono-tabular">
                {phaseCompletion.filter((p) => p.complete).length}/{phases.length}
              </p>
              <p className="text-[11px] text-muted">Phases done</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Code2 className="h-4 w-4 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold font-mono-tabular">{dsaStats.total}</p>
              <p className="text-[11px] text-muted">DSA solved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <FolderGit2 className="h-4 w-4 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold font-mono-tabular">{shippedProjects.length}</p>
              <p className="text-[11px] text-muted">Projects shipped</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Completed phases</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {phaseCompletion
              .filter((p) => p.done > 0)
              .map(({ phase, done, total, complete, capstone }) => (
                <div key={phase.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <span className="text-xs text-muted font-mono-tabular w-4 text-center shrink-0">
                      {Math.round((done / total) * 100)}%
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{phase.title}</p>
                    {capstone && complete && (
                      <p className="text-xs text-muted truncate">Capstone: {capstone.title}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted font-mono-tabular">
                    {done}/{total}
                  </span>
                </div>
              ))}
            {phaseCompletion.every((p) => p.done === 0) && (
              <EmptyState message="No progress logged yet." />
            )}
          </CardContent>
        </Card>

        {shippedProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shipped projects</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {shippedProjects.map((p) => {
                const phase = phases.find((ph) => ph.id === p.phase_id);
                const capstone = capstones.find((c) => c.phase_id === p.phase_id);
                return (
                  <div key={p.phase_id} className="rounded-md border border-border px-3 py-2.5">
                    <p className="text-sm font-medium">{capstone?.title ?? phase?.title ?? p.phase_id}</p>
                    <div className="flex gap-3 mt-1">
                      {p.deployment_url && (
                        <a href={p.deployment_url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                          Live demo
                        </a>
                      )}
                      {p.github_url && (
                        <a href={p.github_url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted text-center pt-4">
          Built with ZTE Tracker — a self-directed engineering execution tracker.
        </p>
      </div>
    </div>
  );
}

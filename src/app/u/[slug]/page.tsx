import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trophy, Code2, FolderGit2, Flame, Megaphone, ExternalLink } from "lucide-react";
import type {
  Phase,
  Topic,
  TopicProgress,
  DsaProgressRow,
  ProjectProgress,
  Capstone,
  BuildInPublicStatus,
  ExitLadderRow,
} from "@/types/database";
import { computeAchievements } from "@/lib/achievements";
import { EmptyState } from "@/components/ui/empty-state";
import { DownloadProfilePdfButton } from "@/components/profile/download-profile-pdf-button";
import { getGithubActivity } from "@/lib/github-activity";
import { PLAN_PATHS } from "@/data/full-plan";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";

export const revalidate = 300; // 5 min cache — public pages don't need to be live-live

async function getProfileData(slug: string) {
  // Public profiles cross the server-side projection boundary only. The
  // service role is never exposed to the browser and direct table access is
  // kept owner-only by RLS.
  const supabase = createAdminClient();

  const { data: settings } = (await supabase
    .from("user_settings")
    .select("user_id, public_profile_enabled, display_name, public_profile_bio, github_username, career_plan_track")
    .eq("public_profile_slug", slug)
    .single()) as {
    data: {
      user_id: string;
      public_profile_enabled: boolean;
      display_name: string | null;
      public_profile_bio: string | null;
      github_username: string | null;
      career_plan_track: "plan_a" | "plan_b" | null;
    } | null;
  };

  if (!settings || !settings.public_profile_enabled) return null;

  const userId = settings.user_id;

  // Kicked off here (as soon as github_username is known) rather than
  // after this function returns, so it runs concurrently with the 8
  // Supabase queries below instead of blocking behind all of them —
  // see the call site in PublicProfilePage for why this matters.
  const githubActivityPromise = getGithubActivity(settings.github_username);

  const [
    { data: phases },
    { data: topics },
    { data: capstones },
    { data: progress },
    { data: dsa },
    { data: projects },
    { data: bip },
    { data: streakSummary },
    { data: exitLadder },
  ] = await Promise.all([
    supabase.from("phases").select("id, phase_number, title, order_index").order("order_index"),
    supabase.from("topics").select("id, phase_id"),
    supabase.from("capstones").select("phase_id, title, description"),
    supabase.from("topic_progress").select("topic_id, completed").eq("user_id", userId),
    supabase.from("dsa_progress").select("completed, difficulty").eq("user_id", userId),
    supabase.from("project_progress").select("phase_id, status, github_url, deployment_url, problem_statement, documentation_url").eq("user_id", userId),
    supabase.from("build_in_public_status").select("phase_id, posted, proof_url, posted_at").eq("user_id", userId).eq("posted", true),
    supabase
      .from("public_streak_summary")
      .select("current_streak, best_streak, total_days_logged")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("exit_ladder").select("exit_code, linked_phase, name, job_level, order_index").order("order_index"),
  ]);

  return {
    displayName: settings.display_name,
    bio: settings.public_profile_bio,
    githubUsername: settings.github_username,
    careerPlanTrack: settings.career_plan_track,
    phases: (phases ?? []) as Phase[],
    topics: (topics ?? []) as Topic[],
    capstones: (capstones ?? []) as Capstone[],
    progress: (progress ?? []) as TopicProgress[],
    dsa: (dsa ?? []) as DsaProgressRow[],
    projects: (projects ?? []) as ProjectProgress[],
    buildInPublic: (bip ?? []) as BuildInPublicStatus[],
    streak: streakSummary as { current_streak: number; best_streak: number; total_days_logged: number } | null,
    exitLadder: (exitLadder ?? []) as ExitLadderRow[],
    githubActivity: await githubActivityPromise,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // getGithubActivity() is now kicked off inside getProfileData() as soon
  // as github_username is known (see there), running concurrently with
  // the 8 Supabase queries instead of being awaited sequentially after
  // all of them resolved. Previously that sequential chain meant a slow
  // or rate-limited GitHub response blocked the entire page from
  // rendering, even though GitHub failures were already handled
  // gracefully — the latency wasn't.
  const data = await getProfileData(slug);
  if (!data) notFound();

  const { displayName, bio, githubUsername, careerPlanTrack, phases, topics, capstones, progress, dsa, projects, buildInPublic, streak, exitLadder, githubActivity } = data;
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

  // "Currently building" — first phase with some but not all topics done,
  // falling back to the first phase with zero progress if every started
  // phase is actually complete (i.e. they're between phases). Mirrors the
  // same "what's the active one" logic Daily Mission uses internally, just
  // at phase granularity since that's what's meaningful to show publicly.
  const currentlyBuilding =
    phaseCompletion.find((p) => p.done > 0 && !p.complete) ??
    phaseCompletion.find((p) => p.done === 0 && p.total > 0) ??
    null;

  const dsaDone = dsa.filter((d) => d.completed);
  const dsaStats = {
    total: dsaDone.length,
    easy: dsaDone.filter((d) => d.difficulty === "easy").length,
    medium: dsaDone.filter((d) => d.difficulty === "medium").length,
    hard: dsaDone.filter((d) => d.difficulty === "hard").length,
  };

  const shippedProjects = projects.filter((p) => p.status === "completed" && (p.github_url || p.deployment_url));

  // Exit ladder readiness (Feature 7): the furthest exit rung reached and
  // how ready the profile is for it, computed the same way as the
  // authenticated exit-ladder page — real topic completion counts, not a
  // vibes-based score.
  const orderedPhasesForExit = [...phases].sort((a, b) => a.order_index - b.order_index);
  const highestReachedExit = (() => {
    for (const exit of [...exitLadder].sort((a, b) => a.order_index - b.order_index)) {
      const cutoffIndex = orderedPhasesForExit.findIndex((p) => p.phase_number === exit.linked_phase);
      const upToPhaseIds = new Set(cutoffIndex >= 0 ? orderedPhasesForExit.slice(0, cutoffIndex + 1).map((p) => p.id) : []);
      const topicsUpTo = topics.filter((t) => upToPhaseIds.has(t.phase_id));
      if (topicsUpTo.length === 0) continue;
      const completedCount = topicsUpTo.filter((t) => progressMap.get(t.id)?.completed).length;
      const readinessPct = Math.round((completedCount / topicsUpTo.length) * 100);
      if (readinessPct < 100) {
        return { exit, readinessPct };
      }
    }
    return null;
  })();

  const achievements = computeAchievements({
    phasesCompleted: phaseCompletion.filter((p) => p.complete).length,
    totalPhases: phases.length,
    topicsCompleted: totalDone,
    dsaCompleted: dsaStats.total,
    dsaHard: dsaStats.hard,
    projectsShipped: shippedProjects.length,
  });

  // Build-in-public posts, newest first, joined against phase titles for
  // context (a bare proof_url with no phase name attached tells a visitor
  // nothing about what was being built when it was posted).
  const buildInPublicTimeline = buildInPublic
    .filter((b) => b.proof_url)
    .map((b) => ({ ...b, phase: phases.find((p) => p.id === b.phase_id) ?? null }))
    .sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));

  // A profile with genuinely nothing logged yet (fresh opt-in, day one) —
  // distinct from "started but nothing shipped", which still has useful
  // content to show (phase progress bars, currently-building banner).
  const isEmptyProfile =
    totalDone === 0 &&
    dsaStats.total === 0 &&
    shippedProjects.length === 0 &&
    buildInPublicTimeline.length === 0 &&
    !streak?.total_days_logged;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
        <FadeUp>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Public progress profile</p>
              <h1 className="text-2xl font-semibold tracking-tight mt-1 text-gradient-accent">
                {displayName || "Zero to Elite — Engineering Roadmap"}
              </h1>
            </div>
            <DownloadProfilePdfButton />
          </div>
          {bio && <p className="text-sm text-foreground/90 mt-2 leading-relaxed max-w-xl">{bio}</p>}
          {careerPlanTrack && (
            <Badge variant="outline" className="mt-2 gap-1.5 w-fit">
              Career target: {PLAN_PATHS.find((p) => p.id === careerPlanTrack)?.title ?? careerPlanTrack}
            </Badge>
          )}
          {currentlyBuilding && (
            <p className="text-sm text-accent mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
              Currently building: {currentlyBuilding.phase.title}
              {currentlyBuilding.total > 0 && ` (${currentlyBuilding.done}/${currentlyBuilding.total})`}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge variant="accent">{overallPct}% complete</Badge>
            <Badge variant="outline">{totalDone}/{totalTopics} topics</Badge>
            {streak && streak.current_streak > 0 && (
              <Badge variant="outline" className="gap-1">
                <Flame className="h-3 w-3 text-accent" /> {streak.current_streak}-day streak
              </Badge>
            )}
          </div>
        </div>
        </FadeUp>

        {achievements.length > 0 && (
          <Card className="print-surface glow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> Achievements
              </CardTitle>
            </CardHeader>
            <StaggerContainer className="contents">
            <CardContent className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <StaggerItem key={a.id}>
                <Badge variant="success" className="gap-1">
                  {a.label}
                </Badge>
                </StaggerItem>
              ))}
            </CardContent>
            </StaggerContainer>
          </Card>
        )}

        {isEmptyProfile ? (
          <Card className="print-surface">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-sm text-foreground/90">Just getting started — check back soon.</p>
              <p className="text-xs text-muted mt-1">
                {displayName || "This person"} opted in to a public profile before logging any progress yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="print-surface">
              <CardContent className="pt-3 pb-3 text-center">
                <Flame className="h-4 w-4 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold font-mono-tabular">
                  {phaseCompletion.filter((p) => p.complete).length}/{phases.length}
                </p>
                <p className="text-[11px] text-muted">Phases done</p>
              </CardContent>
            </Card>
            <Card className="print-surface">
              <CardContent className="pt-3 pb-3 text-center">
                <Code2 className="h-4 w-4 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold font-mono-tabular">{dsaStats.total}</p>
                <p className="text-[11px] text-muted">DSA solved</p>
              </CardContent>
            </Card>
            <Card className="print-surface">
              <CardContent className="pt-3 pb-3 text-center">
                <FolderGit2 className="h-4 w-4 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold font-mono-tabular">{shippedProjects.length}</p>
                <p className="text-[11px] text-muted">Projects shipped</p>
              </CardContent>
            </Card>
            <Card className="print-surface">
              <CardContent className="pt-3 pb-3 text-center">
                <Megaphone className="h-4 w-4 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold font-mono-tabular">{buildInPublicTimeline.length}</p>
                <p className="text-[11px] text-muted">Public posts</p>
              </CardContent>
            </Card>
          </div>
        )}

        {streak && streak.total_days_logged > 0 && (
          <Card className="print-surface">
            <CardContent className="pt-4 pb-4 flex items-center justify-around text-center">
              <div>
                <p className="text-lg font-bold font-mono-tabular text-accent">{streak.current_streak}</p>
                <p className="text-[11px] text-muted">Current streak</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-tabular">{streak.best_streak}</p>
                <p className="text-[11px] text-muted">Best streak</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-tabular">{streak.total_days_logged}</p>
                <p className="text-[11px] text-muted">Total days studied</p>
              </div>
            </CardContent>
          </Card>
        )}

        {githubUsername && githubActivity && (
          <Card className="print-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <FolderGit2 className="h-4 w-4" /> GitHub activity
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline w-fit"
              >
                @{githubUsername}
              </a>
              {githubActivity.publicEventCount > 0 ? (
                <>
                  <p className="text-xs text-muted">
                    {githubActivity.publicEventCount} public events in the last ~90 days
                    {githubActivity.lastActiveAt &&
                      ` · last active ${new Date(githubActivity.lastActiveAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}`}
                  </p>
                  {githubActivity.recentRepos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {githubActivity.recentRepos.map((repo) => (
                        <a
                          key={repo}
                          href={`https://github.com/${repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs rounded-full bg-accent/10 text-accent px-2.5 py-1 hover:bg-accent/20 transition-standard"
                        >
                          {repo.split("/")[1] ?? repo}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted">No recent public activity.</p>
              )}
            </CardContent>
          </Card>
        )}

        {buildInPublicTimeline.length > 0 && (
          <Card className="print-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Megaphone className="h-4 w-4" /> Build in public
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {buildInPublicTimeline.map((b) => (
                <a
                  key={b.phase_id}
                  href={b.proof_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 hover:border-accent/50 transition-standard group"
                >
                  <Megaphone className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{b.phase?.title ?? b.phase_id}</p>
                    {b.posted_at && (
                      <p className="text-xs text-muted">
                        {new Date(b.posted_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted group-hover:text-accent shrink-0" />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="print-surface">
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

        {highestReachedExit && (
          <Card className="print-surface">
            <CardHeader>
              <CardTitle>
                Next milestone — {highestReachedExit.exit.exit_code}
                {highestReachedExit.exit.name ? `: ${highestReachedExit.exit.name}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${highestReachedExit.readinessPct}%` }} />
                </div>
                <span className="text-sm font-mono-tabular font-semibold">{highestReachedExit.readinessPct}%</span>
              </div>
              {highestReachedExit.exit.job_level && (
                <p className="text-xs text-muted">Target level: {highestReachedExit.exit.job_level}</p>
              )}
            </CardContent>
          </Card>
        )}

        {shippedProjects.length > 0 && (
          <Card className="print-surface">
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
                    {(p.problem_statement || capstone?.description) && (
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        {p.problem_statement || capstone?.description}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2">
                      {p.deployment_url && (
                        <a href={p.deployment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          Live demo
                        </a>
                      )}
                      {p.github_url && (
                        <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          Source
                        </a>
                      )}
                      {p.documentation_url && (
                        <a href={p.documentation_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          Docs
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

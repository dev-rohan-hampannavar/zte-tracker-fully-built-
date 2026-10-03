import { createClient } from "@/lib/supabase/server";
import { getGithubEventBreakdown } from "@/lib/github-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, GitCommitHorizontal, GitPullRequest, ListChecks, Briefcase, Trophy, FolderGit2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";

export const revalidate = 0; // authenticated, per-user data — always fresh

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * A combined "this week" view across every domain this app tracks, per
 * the spec's Developer Activity Dashboard requirement. Deliberately a
 * server component — getGithubEventBreakdown relies on Next's fetch
 * `revalidate` cache option, which only applies server-side, and doing
 * this data assembly server-side also means one clean page load instead
 * of 6+ client-side SWR waterfalls for a page that's read-heavy and
 * doesn't need the interactivity the rest of the app's client components
 * provide. Every number here comes from a real table already used
 * elsewhere (study_sessions/daily_logs, dsa_progress, project_progress,
 * career_tracker, interview_rounds) — nothing is synthesized for this
 * page specifically.
 */
export default async function DeveloperActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <EmptyState message="Sign in to see your developer activity." />;
  }

  const since = daysAgoISO(7);

  const [
    { data: settings },
    { data: dailyLogs },
    { data: dsaRows },
    { data: projectMilestones },
    { data: applications },
    { data: interviewRounds },
  ] = await Promise.all([
    supabase.from("user_settings").select("github_username").eq("user_id", user.id).maybeSingle(),
    supabase.from("daily_logs").select("date, hours").eq("user_id", user.id).gte("date", since),
    supabase.from("dsa_progress").select("completed, completed_at, difficulty").eq("user_id", user.id).gte("completed_at", since),
    supabase.from("project_progress").select("phase_id, status, updated_at").eq("user_id", user.id).gte("updated_at", since),
    supabase.from("career_tracker").select("id, applied_at").eq("user_id", user.id).gte("applied_at", since),
    supabase.from("interview_rounds").select("id, completed, scheduled_at").eq("user_id", user.id).gte("scheduled_at", since),
  ]);

  const githubUsername = (settings as { github_username: string | null } | null)?.github_username ?? null;
  const github = await getGithubEventBreakdown(githubUsername, 7);

  const learningHours = ((dailyLogs ?? []) as { date: string; hours: number }[]).reduce(
    (sum, log) => sum + Number(log.hours ?? 0),
    0
  );
  const dsaCompleted = ((dsaRows ?? []) as { completed: boolean }[]).filter((r) => r.completed).length;
  const projectsTouched = new Set(((projectMilestones ?? []) as { phase_id: string }[]).map((p) => p.phase_id)).size;
  const applicationsThisWeek = (applications ?? []).length;
  const interviewsThisWeek = ((interviewRounds ?? []) as { completed: boolean }[]).filter((r) => r.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5" /> Developer Activity
        </h1>
        <p className="text-sm text-muted mt-1">
          This week, across learning, coding, projects, and career — real activity, not vanity metrics.
        </p>
      </div>
      </FadeUp>

      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StaggerItem><StatCard icon={Clock} label="Learning hours" numericValue={learningHours} decimals={1} /></StaggerItem>
        <StaggerItem><StatCard icon={ListChecks} label="DSA problems" numericValue={dsaCompleted} /></StaggerItem>
        <StaggerItem><StatCard icon={FolderGit2} label="Projects touched" numericValue={projectsTouched} /></StaggerItem>
        <StaggerItem><StatCard icon={Briefcase} label="Applications" numericValue={applicationsThisWeek} /></StaggerItem>
        <StaggerItem><StatCard icon={Trophy} label="Interview rounds" numericValue={interviewsThisWeek} /></StaggerItem>
      </StaggerContainer>

      <FadeUp delay={0.1}>
      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4" /> GitHub activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!githubUsername && (
            <p className="text-sm text-muted">
              No GitHub username set — add one in{" "}
              <a href="/settings" className="text-accent hover:underline">
                Settings
              </a>{" "}
              to see real commit/PR activity here.
            </p>
          )}
          {githubUsername && !github && (
            <p className="text-sm text-muted">
              Couldn&apos;t reach GitHub&apos;s API right now — this section only shows when data is actually
              available, never a fabricated number.
            </p>
          )}
          {githubUsername && github && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={github.pushEvents} /></p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <GitCommitHorizontal className="h-3 w-3" /> Push events
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={github.pullRequestEvents} /></p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <GitPullRequest className="h-3 w-3" /> Pull requests
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={github.issueEvents} /></p>
                <p className="text-xs text-muted">Issue activity</p>
              </div>
            </div>
          )}
          {githubUsername && (
            <p className="text-[11px] text-muted mt-3">
              From GitHub&apos;s public events API for @{githubUsername} — public activity only, last 7 days. Not
              the full private contribution graph (that needs an authenticated token this app doesn&apos;t request).
            </p>
          )}
        </CardContent>
      </Card>
      </FadeUp>

      <p className="text-xs text-muted">
        Every number above is pulled directly from the same tables the rest of the app uses — Learning hours from
        Daily Logs, DSA from your problem log, Projects from Project Progress, Applications and Interview rounds from
        Career Tracker. Nothing here is a separate or fabricated metric.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  numericValue,
  decimals = 0,
}: {
  icon: typeof Clock;
  label: string;
  numericValue: number;
  decimals?: number;
}) {
  return (
    <Card className="glow-card h-full">
      <CardContent noHeader>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs text-muted">{label}</p>
        </div>
        <p className="text-2xl font-bold font-mono-tabular leading-none">
          <AnimatedCounter value={numericValue} decimals={decimals} />
        </p>
      </CardContent>
    </Card>
  );
}

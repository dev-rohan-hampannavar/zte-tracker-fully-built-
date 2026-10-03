"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useCareerTracker, useInterviewRounds } from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, GitCommitHorizontal, GitPullRequest, ListChecks, Briefcase, Trophy, FolderGit2 } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Skeleton } from "@/components/ui/skeleton";

interface GithubBreakdown {
  pushEvents: number;
  pullRequestEvents: number;
  issueEvents: number;
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Client-component rewrite of what used to be a standalone server-
 * component page (/developer-activity). Converted so it can live as a tab
 * inside /statistics — a client component can't directly render an async
 * server component as conditional tab content, so this now uses the same
 * client hooks (useDailyLogs, useDsaProgress, etc.) every other page in
 * this app already uses, plus a small /api/github-activity route for the
 * one piece (GitHub's events API) that needs server-side fetch caching.
 * Every number here still comes from the same real tables as before —
 * only the fetch mechanism changed, not what's shown or how it's computed.
 */
export function DeveloperActivityTab() {
  const { user } = useUser();
  const since = daysAgoISO(7);

  const { data: dailyLogs, isLoading: logsLoading } = useDailyLogs(user?.id);
  const { data: dsaRows, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: projectProgress, isLoading: projectsLoading } = useProjectProgress(user?.id);
  const { data: applications, isLoading: appsLoading } = useCareerTracker(user?.id);
  const { data: interviewRounds, isLoading: roundsLoading } = useInterviewRounds(user?.id);

  const [github, setGithub] = useState<{ githubUsername: string | null; breakdown: GithubBreakdown | null } | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/github-activity")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setGithub(data);
      })
      .catch(() => {
        if (!cancelled) setGithub(null);
      })
      .finally(() => {
        if (!cancelled) setGithubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isLoading = logsLoading || dsaLoading || projectsLoading || appsLoading || roundsLoading;
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const learningHours = (dailyLogs ?? [])
    .filter((l) => l.date >= since)
    .reduce((sum, log) => sum + Number(log.hours ?? 0), 0);
  const dsaCompleted = (dsaRows ?? []).filter((r) => r.completed && r.completed_at && r.completed_at >= since).length;
  const projectsTouched = new Set(
    (projectProgress ?? []).filter((p) => p.updated_at && p.updated_at >= since).map((p) => p.phase_id)
  ).size;
  const applicationsThisWeek = (applications ?? []).filter((a) => a.applied_at && a.applied_at >= since).length;
  const interviewsThisWeek = (interviewRounds ?? []).filter(
    (r) => r.completed && r.scheduled_at && r.scheduled_at >= since
  ).length;

  const githubUsername = github?.githubUsername ?? null;
  const breakdown = github?.breakdown ?? null;

  return (
    <div className="flex flex-col gap-6">
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StaggerItem><StatCard icon={Clock} label="Learning hours" numericValue={learningHours} decimals={1} /></StaggerItem>
        <StaggerItem><StatCard icon={ListChecks} label="DSA problems" numericValue={dsaCompleted} /></StaggerItem>
        <StaggerItem><StatCard icon={FolderGit2} label="Projects touched" numericValue={projectsTouched} /></StaggerItem>
        <StaggerItem><StatCard icon={Briefcase} label="Applications" numericValue={applicationsThisWeek} /></StaggerItem>
        <StaggerItem><StatCard icon={Trophy} label="Interview rounds" numericValue={interviewsThisWeek} /></StaggerItem>
      </StaggerContainer>

      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4" /> GitHub activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {githubLoading && <Skeleton className="h-16 w-full" />}
          {!githubLoading && !githubUsername && (
            <p className="text-sm text-muted">
              No GitHub username set — add one in{" "}
              <a href="/settings" className="text-accent hover:underline">
                Settings
              </a>{" "}
              to see real commit/PR activity here.
            </p>
          )}
          {!githubLoading && githubUsername && !breakdown && (
            <p className="text-sm text-muted">
              Couldn&apos;t reach GitHub&apos;s API right now — this section only shows when data is actually
              available, never a fabricated number.
            </p>
          )}
          {!githubLoading && githubUsername && breakdown && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={breakdown.pushEvents} /></p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <GitCommitHorizontal className="h-3 w-3" /> Push events
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={breakdown.pullRequestEvents} /></p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <GitPullRequest className="h-3 w-3" /> Pull requests
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={breakdown.issueEvents} /></p>
                <p className="text-xs text-muted">Issue activity</p>
              </div>
            </div>
          )}
          {!githubLoading && githubUsername && (
            <p className="text-[11px] text-muted mt-3">
              From GitHub&apos;s public events API for @{githubUsername} — public activity only, last 7 days. Not
              the full private contribution graph (that needs an authenticated token this app doesn&apos;t request).
            </p>
          )}
        </CardContent>
      </Card>

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

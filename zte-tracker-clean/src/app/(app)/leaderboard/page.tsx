"use client";

import { useUser } from "@/lib/hooks/use-user";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Users, Flame, Trophy } from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const { user } = useUser();
  const { data: settings } = useUserSettings(user?.id);
  const { data: entries, isLoading } = useLeaderboard();

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5" /> Community Leaderboard
        </h1>
        <p className="text-sm text-muted mt-1">
          Ranked by phases completed, then current streak — from people who&apos;ve opted into a public profile.
        </p>
      </div>
      </FadeUp>

      {settings && !settings.public_profile_enabled && (
        <Card className="border-accent/30 glow-card">
          <CardContent noHeader className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted">
              You&apos;re not on the leaderboard yet — enable your public profile in Settings to show up here.
            </p>
            <Link href="/settings" className="text-sm text-accent hover:underline shrink-0">
              Open Settings →
            </Link>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && (
        <Card>
          <CardContent className="flex flex-col gap-1 py-2">
          <StaggerContainer className="flex flex-col gap-1">
            {(entries ?? []).length === 0 && (
              <EmptyState message="No one on the leaderboard yet." hint="Be the first — enable your public profile in Settings." />
            )}
            {(entries ?? []).map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              const RankIcon = i === 0 ? Trophy : null;
              return (
                <StaggerItem key={entry.user_id}>
                <div
                  className={cn(
                    "flex items-center gap-3 py-2.5 px-4 border-b border-border last:border-0",
                    isMe && "bg-accent/5 rounded-md",
                    i === 0 && "bg-reward/5 rounded-md shadow-[0_0_20px_rgb(var(--reward-glow)/0.15)]"
                  )}
                >
                  <span className="w-6 text-sm font-mono-tabular text-muted text-center shrink-0 flex items-center justify-center">
                    {RankIcon ? <RankIcon className="h-4 w-4 text-reward drop-shadow-[0_0_6px_rgb(var(--reward-glow)/0.7)]" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {entry.public_profile_slug ? (
                      <Link href={`/u/${entry.public_profile_slug}`} className="text-sm font-medium hover:underline">
                        {entry.display_name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{entry.display_name}</span>
                    )}
                    {isMe && <Badge variant="accent" className="ml-2 text-[10px]">You</Badge>}
                    {entry.public_profile_bio && (
                      <p className="text-xs text-muted truncate">{entry.public_profile_bio}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted font-mono-tabular">{entry.phases_completed} phases</span>
                    <span className="text-xs text-warning font-mono-tabular flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {entry.current_streak}
                    </span>
                  </div>
                </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted">
        Only curriculum progress and streaks are shown here — applications, salary, and other career-search data
        stay private regardless of your public profile setting.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useUserSettings, unpinItem, MAX_PINNED_ITEMS } from "@/lib/hooks/use-user-settings";
import { usePhasesWithProgress, useClientSyncMilestones } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Pin, PinOff, BookOpen, FolderGit2, Layers } from "lucide-react";
import type { PinnedItem } from "@/types/database";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";

const TYPE_ICON: Record<PinnedItem["type"], typeof BookOpen> = {
  topic: BookOpen,
  project: FolderGit2,
  clientsync_milestone: Layers,
};

const TYPE_LABEL: Record<PinnedItem["type"], string> = {
  topic: "Topic",
  project: "Project",
  clientsync_milestone: "ClientSync milestone",
};

/**
 * Item 51 — Workspace panel. Pinned items live as a small JSON array on
 * user_settings (0016_pinned_items.sql); this page just resolves each
 * pin's id against data other pages already fetch (phases/topics for
 * topics and projects — a project is really a phase's project_progress
 * row, milestones for ClientSync) to build a quick-link href and a
 * current-state badge, rather than storing derived state that could go
 * stale.
 */
export default function WorkspacePage() {
  const { user } = useUser();
  const { data: settings, isLoading: settingsLoading, mutate: mutateSettings } = useUserSettings(user?.id);
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: projectProgress } = useProjectProgress(user?.id);
  const { data: milestones } = useClientSyncMilestones();

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  // Memoized for the same reason as allTopics/projectMap fixes elsewhere:
  // `settings?.pinned_items ?? []` creates a new array reference on every
  // render while settings is still loading, which was silently defeating
  // the memoization of `resolved` below (it recomputes — including
  // rebuilding <Badge> elements — on every render regardless of whether
  // the actual pinned items changed).
  const pinned = useMemo(() => settings?.pinned_items ?? [], [settings]);

  const resolved = useMemo(() => {
    return pinned.map((p) => {
      if (p.type === "topic") {
        const topic = allTopics.find((t) => t.id === p.id);
        return {
          pin: p,
          href: `/roadmap/topic/${p.id}`,
          exists: !!topic,
          statusBadge: topic?.progress?.completed ? (
            <Badge variant="success">Complete</Badge>
          ) : (
            <Badge variant="accent">In progress</Badge>
          ),
        };
      }
      if (p.type === "project") {
        const phase = phases.find((ph) => ph.id === p.id);
        const progress = (projectProgress ?? []).find((pp) => pp.phase_id === p.id);
        return {
          pin: p,
          href: "/projects",
          exists: !!phase,
          statusBadge: progress ? (
            <Badge
              variant={
                progress.status === "completed" ? "success" : progress.status === "in_progress" ? "accent" : "outline"
              }
            >
              {progress.status.replace("_", " ")}
            </Badge>
          ) : null,
        };
      }
      const milestone = (milestones ?? []).find((m) => m.id === p.id);
      return {
        pin: p,
        href: "/clientsync",
        exists: !!milestone,
        statusBadge: null,
      };
    });
  }, [pinned, allTopics, phases, projectProgress, milestones]);

  async function handleUnpin(type: PinnedItem["type"], id: string) {
    if (!user) return;
    try {
      await unpinItem(user.id, type, id);
      await mutateSettings();
      toast.success("Unpinned");
    } catch {
      toast.error("Couldn't unpin. Try again.");
    }
  }

  const isLoading = settingsLoading || phasesLoading;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
          <Pin className="h-6 w-6 text-accent" /> Workspace
        </h1>
        <p className="text-sm text-muted mt-1">
          Pin the topic, project, or ClientSync milestone you&apos;re actively working on for quick access.
          {pinned.length > 0 && ` ${pinned.length}/${MAX_PINNED_ITEMS} pinned.`}
        </p>
      </div>
      </FadeUp>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : resolved.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-muted">
              Nothing pinned yet. Open a topic, project, or ClientSync milestone and pin it to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resolved.map(({ pin, href, exists, statusBadge }) => {
            const Icon = TYPE_ICON[pin.type];
            return (
              <StaggerItem key={`${pin.type}-${pin.id}`}>
              <Card className={!exists ? "opacity-60" : "glow-card"}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <Link href={href} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <Icon className="h-4 w-4 text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-accent transition-standard">
                        {pin.label}
                      </p>
                      <p className="text-xs text-muted">
                        {TYPE_LABEL[pin.type]}
                        {!exists && " · no longer found"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleUnpin(pin.type, pin.id)}
                      aria-label="Unpin"
                      title="Unpin"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
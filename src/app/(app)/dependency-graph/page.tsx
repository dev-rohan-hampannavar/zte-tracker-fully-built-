"use client";

import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { Skeleton } from "@/components/ui/skeleton";
import { LearningPathView } from "@/components/roadmap/learning-path-view";

export default function DependencyGraphPage() {
  const { user } = useUser();
  const { phases, isLoading } = usePhasesWithProgress(user?.id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Learning Path</h1>
        <p className="text-sm text-muted">
          The sequential order phases unlock in, grouped by band. Diamond nodes are exit points —
          real off-ramps to apply, not just checkpoints.
        </p>
      </div>
      <LearningPathView phases={phases} />
    </div>
  );
}

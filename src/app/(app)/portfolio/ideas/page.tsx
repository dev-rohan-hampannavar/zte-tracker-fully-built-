"use client";

import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useAdvancedProjects, useAdvancedProjectProgress } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { AdvancedProjectStatus } from "@/types/database";

const STATUS_VARIANT: Record<AdvancedProjectStatus, "default" | "warning" | "success" | "accent" | "danger"> = {
  not_started: "default",
  considering: "accent",
  in_progress: "warning",
  completed: "success",
  abandoned: "danger",
};

const STATUS_LABEL: Record<AdvancedProjectStatus, string> = {
  not_started: "Not started",
  considering: "Considering",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};

export default function PortfolioIdeasPage() {
  const { user } = useUser();
  const { data: projects, isLoading } = useAdvancedProjects();
  const { data: progress } = useAdvancedProjectProgress(user?.id);

  const progressMap = new Map((progress ?? []).map((p) => [p.project_id, p]));

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-5 w-5" /> Portfolio Projects
        </h1>
        <p className="text-sm text-muted">
          The 10 advanced SaaS project ideas from Part VII — pick one to build after ClientSync.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(projects ?? []).map((p) => {
          const status = progressMap.get(p.id)?.status ?? "not_started";
          return (
            <Link key={p.id} href={`/portfolio/ideas/${p.id}`}>
              <Card className="h-full transition-standard hover:border-accent/40">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <p className="text-xs text-muted mt-0.5">{p.tagline}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted line-clamp-2">{p.the_gap}</p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{p.core_features.length} core + {p.advanced_features.length} advanced features</span>
                    <span className="inline-flex items-center gap-1 text-accent">
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

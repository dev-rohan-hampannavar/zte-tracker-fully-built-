"use client";

import { useMemo, useState } from "react";
import { useRoadmapSnapshots, useSnapshotEntities } from "@/lib/hooks/use-roadmap";
import { computeRoadmapDiff } from "@/lib/roadmap-diff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, Pencil, Move, History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function RoadmapDiffPage() {
  const { data: snapshots, isLoading } = useRoadmapSnapshots();
  const [versionA, setVersionA] = useState<string>("");
  const [versionB, setVersionB] = useState<string>("");

  const sortedSnapshots = useMemo(
    () => (snapshots ?? []).slice().sort((a, b) => a.version - b.version),
    [snapshots]
  );

  const snapA = sortedSnapshots.find((s) => String(s.version) === versionA);
  const snapB = sortedSnapshots.find((s) => String(s.version) === versionB);

  const { data: entitiesA } = useSnapshotEntities(snapA?.id);
  const { data: entitiesB } = useSnapshotEntities(snapB?.id);

  const diff = useMemo(() => {
    if (!entitiesA || !entitiesB) return null;
    return computeRoadmapDiff(entitiesA, entitiesB);
  }, [entitiesA, entitiesB]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Roadmap Diff</h1>
        <p className="text-sm text-muted mt-1">
          Compare two snapshots of the roadmap&apos;s structure — what was added, removed, changed, or
          reordered between them.
        </p>
      </div>

      {sortedSnapshots.length === 0 && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-2 py-10">
            <History className="h-8 w-8 text-muted" />
            <p className="text-sm font-medium">No snapshots yet</p>
            <p className="text-xs text-muted max-w-sm">
              Run <code className="bg-surface-2 px-1 py-0.5 rounded">scripts/snapshot_roadmap.py</code> after
              parsing roadmap.md to create the first one. Diffing needs at least two.
            </p>
          </CardContent>
        </Card>
      )}

      {sortedSnapshots.length === 1 && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-2 py-10">
            <History className="h-8 w-8 text-muted" />
            <p className="text-sm font-medium">Only one snapshot so far — v{sortedSnapshots[0].version}</p>
            <p className="text-xs text-muted max-w-sm">
              {sortedSnapshots[0].phase_count} phases, {sortedSnapshots[0].stage_count} stages,{" "}
              {sortedSnapshots[0].topic_count} topics, captured{" "}
              {new Date(sortedSnapshots[0].created_at).toLocaleDateString("en-IN")}. Re-run the snapshot
              script after the next roadmap.md update to enable a diff.
            </p>
          </CardContent>
        </Card>
      )}

      {sortedSnapshots.length >= 2 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={versionA} onValueChange={setVersionA}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="From version" />
              </SelectTrigger>
              <SelectContent>
                {sortedSnapshots.map((s) => (
                  <SelectItem key={s.id} value={String(s.version)}>
                    v{s.version} — {new Date(s.created_at).toLocaleDateString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted text-sm">→</span>
            <Select value={versionB} onValueChange={setVersionB}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="To version" />
              </SelectTrigger>
              <SelectContent>
                {sortedSnapshots.map((s) => (
                  <SelectItem key={s.id} value={String(s.version)}>
                    v{s.version} — {new Date(s.created_at).toLocaleDateString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {diff && (
            <>
              {snapA?.source_hash === snapB?.source_hash && (
                <p className="text-xs text-warning">
                  These two snapshots have the same source hash — roadmap.md didn&apos;t change between
                  them, so this diff should be empty.
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent noHeader>
                    <p className="text-xs text-muted mb-1 flex items-center gap-1">
                      <Plus className="h-3 w-3 text-success" /> Added
                    </p>
                    <p className="text-2xl font-bold font-mono-tabular text-success">{diff.added.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent noHeader>
                    <p className="text-xs text-muted mb-1 flex items-center gap-1">
                      <Minus className="h-3 w-3 text-danger" /> Removed
                    </p>
                    <p className="text-2xl font-bold font-mono-tabular text-danger">{diff.removed.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent noHeader>
                    <p className="text-xs text-muted mb-1 flex items-center gap-1">
                      <Pencil className="h-3 w-3 text-warning" /> Changed
                    </p>
                    <p className="text-2xl font-bold font-mono-tabular text-warning">{diff.changed.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent noHeader>
                    <p className="text-xs text-muted mb-1 flex items-center gap-1">
                      <Move className="h-3 w-3 text-accent" /> Moved
                    </p>
                    <p className="text-2xl font-bold font-mono-tabular text-accent">{diff.moved.length}</p>
                  </CardContent>
                </Card>
              </div>

              {diff.added.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-success">Added</CardTitle></CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {diff.added.map((e) => (
                      <div key={e.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.entity_type}</Badge>
                        <span className="text-sm">{e.title}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {diff.removed.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-danger">Removed</CardTitle></CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {diff.removed.map((e) => (
                      <div key={e.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.entity_type}</Badge>
                        <span className="text-sm line-through text-muted">{e.title}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {diff.changed.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-warning">Changed</CardTitle></CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {diff.changed.map((c) => (
                      <div key={c.entityId} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{c.entityType}</Badge>
                        </div>
                        {c.before.title !== c.after.title && (
                          <p className="text-sm">
                            <span className="text-muted line-through">{c.before.title}</span>{" "}
                            <span>→ {c.after.title}</span>
                          </p>
                        )}
                        {c.before.estimatedHours !== c.after.estimatedHours && (
                          <p className="text-xs text-muted font-mono-tabular">
                            {c.before.estimatedHours ?? "—"}h → {c.after.estimatedHours ?? "—"}h
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {diff.moved.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-accent">Moved</CardTitle></CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {diff.moved.map((m) => (
                      <div key={m.entityId} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{m.entityType}</Badge>
                        <span className="text-sm font-mono-tabular">{m.entityId}</span>
                        <span className="text-xs text-muted">
                          position {m.before.orderIndex} → {m.after.orderIndex}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {diff.added.length === 0 &&
                diff.removed.length === 0 &&
                diff.changed.length === 0 &&
                diff.moved.length === 0 && (
                  <EmptyState message="No differences between these versions." />
                )}
            </>
          )}
        </>
      )}
    </div>
  );
}

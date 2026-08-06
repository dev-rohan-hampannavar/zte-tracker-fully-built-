"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDsaProgress, addDsaProblem, toggleDsaComplete, deleteDsaProblem } from "@/lib/hooks/use-dsa";
import { useRoadmapMetadata } from "@/lib/hooks/use-roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { pct } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Loader2, LayoutList, Layers } from "lucide-react";
import type { Difficulty, DsaProgressRow } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

export default function DsaTrackerPage() {
  const { user } = useUser();
  const { data: problems, mutate, isLoading } = useDsaProgress(user?.id);
  const { data: metadata } = useRoadmapMetadata();

  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [tag, setTag] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const easyDone = (problems ?? []).filter((p) => p.difficulty === "easy" && p.completed).length;
  const mediumDone = (problems ?? []).filter((p) => p.difficulty === "medium" && p.completed).length;
  const hardDone = (problems ?? []).filter((p) => p.difficulty === "hard" && p.completed).length;
  const easyTarget = metadata?.dsa_easy_target ?? 75;
  const mediumTarget = metadata?.dsa_medium_target ?? 50;

  const filtered = useMemo(() => {
    return (problems ?? []).filter((p) => {
      if (search && !p.problem_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDifficulty !== "all" && p.difficulty !== filterDifficulty) return false;
      if (filterStatus === "completed" && !p.completed) return false;
      if (filterStatus === "pending" && p.completed) return false;
      return true;
    });
  }, [problems, search, filterDifficulty, filterStatus]);

  // Sub-dashboard by pattern (P7.5 item 19). topic_tag is free text the
  // person types when adding a problem ("two-pointers", "Arrays", "dp" —
  // whatever they call it), not a fixed taxonomy anywhere in the schema.
  // Hardcoding "arrays/trees/graphs/DP/greedy" as literal buckets would
  // silently drop or misfile any problem tagged with a variant spelling, a
  // different pattern name, or nothing at all — so this groups by whatever
  // tags actually exist (normalized only for casing/whitespace so "Arrays"
  // and "arrays " collapse into one bucket), sorted by problem count, with
  // an explicit "Untagged" bucket rather than silently excluding those
  // problems from the pattern view.
  const patternGroups = useMemo(() => {
    const groups = new Map<string, { label: string; problems: DsaProgressRow[] }>();
    for (const p of problems ?? []) {
      const raw = p.topic_tag?.trim();
      const key = raw ? raw.toLowerCase() : "__untagged__";
      const label = raw || "Untagged";
      if (!groups.has(key)) groups.set(key, { label, problems: [] });
      groups.get(key)!.problems.push(p);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.label === "Untagged") return 1;
      if (b.label === "Untagged") return -1;
      return b.problems.length - a.problems.length;
    });
  }, [problems]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setAdding(true);
    try {
      await addDsaProblem(user.id, {
        problem_name: name.trim(),
        difficulty,
        topic_tag: tag || undefined,
        url: url || undefined,
      });
      await mutate();
      setName("");
      setTag("");
      setUrl("");
      toast.success("Problem added");
    } catch {
      toast.error("Couldn't add problem.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    try {
      await toggleDsaComplete(id, completed);
      await mutate();
    } catch {
      toast.error("Couldn't update.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDsaProblem(id);
      await mutate();
    } catch {
      toast.error("Couldn't delete.");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">DSA Tracker</h1>
        <p className="text-sm text-muted">Phase 08 spine — independent of the main roadmap checklist.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Easy</p>
            <p className="text-2xl font-bold font-mono-tabular">
              {easyDone}
              <span className="text-sm text-muted font-normal"> / {easyTarget}</span>
            </p>
            <Progress value={pct(easyDone, easyTarget)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Medium</p>
            <p className="text-2xl font-bold font-mono-tabular">
              {mediumDone}
              <span className="text-sm text-muted font-normal"> / {mediumTarget}</span>
            </p>
            <Progress value={pct(mediumDone, mediumTarget)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Hard (untracked target)</p>
            <p className="text-2xl font-bold font-mono-tabular">{hardDone}</p>
            <p className="text-xs text-muted mt-2">Bonus — no fixed gate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add problem</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
            <Input
              placeholder="Problem name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[180px]"
              required
            />
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Tag (e.g. two-pointers)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-44"
            />
            <Input
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-44"
            />
            <Button type="submit" disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <LayoutList className="h-3.5 w-3.5" /> By list
          </TabsTrigger>
          <TabsTrigger value="pattern" className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> By pattern
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-2 group">
                <Checkbox checked={p.completed} onCheckedChange={(v) => handleToggle(p.id, v === true)} />
                <span className={p.completed ? "line-through text-muted flex-1 text-sm" : "flex-1 text-sm"}>
                  {p.problem_name}
                </span>
                {p.topic_tag && <Badge variant="outline">{p.topic_tag}</Badge>}
                <Badge
                  variant={p.difficulty === "hard" ? "danger" : p.difficulty === "medium" ? "warning" : "success"}
                >
                  {p.difficulty}
                </Badge>
                {p.url && (
                  <a href={p.url} target="_blank" className="text-muted hover:text-accent">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <EmptyState message="No matches." hint="Try adjusting your filters." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="pattern" className="flex flex-col gap-3 mt-4">
          <p className="text-xs text-muted -mt-1">
            Grouped by the tag you gave each problem — not a fixed pattern list, since tagging style
            varies. Untagged problems get their own group instead of disappearing from this view.
          </p>
          {patternGroups.map((group) => {
            const done = group.problems.filter((p) => p.completed).length;
            return (
              <Card key={group.label}>
                <CardContent noHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{group.label}</span>
                      <Badge variant="outline" className="font-mono-tabular text-xs">
                        {done}/{group.problems.length}
                      </Badge>
                    </div>
                    <Progress value={pct(done, group.problems.length)} className="w-24 h-1.5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.problems.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2">
                        <Checkbox checked={p.completed} onCheckedChange={(v) => handleToggle(p.id, v === true)} />
                        <span className={p.completed ? "line-through text-muted flex-1 text-sm" : "flex-1 text-sm"}>
                          {p.problem_name}
                        </span>
                        <Badge
                          variant={p.difficulty === "hard" ? "danger" : p.difficulty === "medium" ? "warning" : "success"}
                        >
                          {p.difficulty}
                        </Badge>
                        {p.url && (
                          <a href={p.url} target="_blank" className="text-muted hover:text-accent">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {patternGroups.length === 0 && (
            <EmptyState message="No problems yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
import { Plus, Trash2, ExternalLink, Loader2, LayoutList, Layers, Sparkles, Target, Clock, AlertTriangle } from "lucide-react";
import type { Difficulty, DsaProgressRow } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { weakestPatterns, accuracyByDifficulty, averageSolveTimeMinutes, recentMistakes, recommendNextDsaProblems } from "@/lib/dsa-analytics";
import { rateDsaConfidence } from "@/lib/hooks/use-dsa";
import { ConfidencePicker } from "@/components/revision/confidence-picker";
import { CONFIDENCE_LABEL, isOverdue, type ConfidenceRating } from "@/lib/revision-schedule";

export default function DsaTrackerPage() {
  const { user } = useUser();
  const { data: problems, mutate, isLoading } = useDsaProgress(user?.id);
  const { data: metadata } = useRoadmapMetadata();

  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [tag, setTag] = useState("");
  const [pattern, setPattern] = useState("");
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

  // Weak areas (P8 gap-fill): surfaces tags with the lowest completion
  // rate among tags with enough problems logged to be meaningful. This is
  // deliberately completion-rate, not "accuracy" — dsa_progress only
  // tracks a boolean completed/not, with no attempt or wrong-answer
  // history (unlike interview_attempts, which does track results per
  // attempt). Fabricating an accuracy % here would misrepresent data that
  // doesn't exist. A tag needs at least 3 problems logged before it's
  // eligible, so a single unsolved problem in a brand-new tag doesn't
  // read as a "weak area" — that's just not enough signal yet.
  const WEAK_AREA_MIN_PROBLEMS = 3;
  const weakAreas = useMemo(() => {
    return patternGroups
      .filter((g) => g.label !== "Untagged" && g.problems.length >= WEAK_AREA_MIN_PROBLEMS)
      .map((g) => {
        const done = g.problems.filter((p) => p.completed).length;
        return { label: g.label, done, total: g.problems.length, completionPct: pct(done, g.problems.length) };
      })
      .filter((g) => g.completionPct < 60)
      .sort((a, b) => a.completionPct - b.completionPct)
      .slice(0, 5);
  }, [patternGroups]);

  // Phase 3 — DSA Intelligence analytics, computed from the richer fields
  // added in 0042_dsa_intelligence.sql. These sit alongside the existing
  // completion-rate-based weakAreas above rather than replacing it: once
  // enough problems carry a `pattern` value, weakestPatterns below gives
  // real accuracy; until then it simply returns fewer/no results (its own
  // minProblems threshold), so nothing here fabricates numbers ahead of
  // the underlying data existing.
  const [ratingId, setRatingId] = useState<string | null>(null);
  const accuracyByDiff = useMemo(() => accuracyByDifficulty(problems ?? []), [problems]);
  const avgSolveTime = useMemo(() => averageSolveTimeMinutes(problems ?? []), [problems]);
  const weakestByAccuracy = useMemo(() => weakestPatterns(problems ?? []), [problems]);
  const mistakes = useMemo(() => recentMistakes(problems ?? []), [problems]);
  const recommendations = useMemo(() => recommendNextDsaProblems(problems ?? []), [problems]);
  const overdueForRevisionCount = useMemo(
    () => (problems ?? []).filter((p) => p.completed && isOverdue(p.next_review_due)).length,
    [problems]
  );

  async function handleRateConfidence(p: DsaProgressRow, rating: ConfidenceRating) {
    try {
      await rateDsaConfidence(p.id, p.review_count, rating);
      await mutate();
      setRatingId(null);
      toast.success(`${CONFIDENCE_LABEL[rating]} — scheduled for review.`);
    } catch {
      toast.error("Couldn't save confidence rating.");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setAdding(true);
    try {
      await addDsaProblem(user.id, {
        problem_name: name.trim(),
        difficulty,
        topic_tag: tag || undefined,
        pattern: pattern || undefined,
        url: url || undefined,
      });
      await mutate();
      setName("");
      setTag("");
      setPattern("");
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
      const problem = (problems ?? []).find((p) => p.id === id);
      await toggleDsaComplete(id, completed, user?.id, problem?.problem_name);
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
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">DSA Tracker</h1>
        <p className="text-sm text-muted mt-1">Phase 08 spine — independent of the main roadmap checklist.</p>
      </div>
      </FadeUp>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StaggerItem>
        <Card className="glow-card">
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Easy</p>
            <p className="text-2xl font-bold font-mono-tabular">
              <AnimatedCounter value={easyDone} />
              <span className="text-sm text-muted font-normal"> / {easyTarget}</span>
            </p>
            <Progress value={pct(easyDone, easyTarget)} className="mt-2" glow={easyDone >= easyTarget && easyTarget > 0} />
          </CardContent>
        </Card>
        </StaggerItem>
        <StaggerItem>
        <Card className="glow-card">
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Medium</p>
            <p className="text-2xl font-bold font-mono-tabular">
              <AnimatedCounter value={mediumDone} />
              <span className="text-sm text-muted font-normal"> / {mediumTarget}</span>
            </p>
            <Progress value={pct(mediumDone, mediumTarget)} className="mt-2" glow={mediumDone >= mediumTarget && mediumTarget > 0} />
          </CardContent>
        </Card>
        </StaggerItem>
        <StaggerItem>
        <Card className="glow-card">
          <CardContent noHeader>
            <p className="text-xs text-muted mb-1">Hard (untracked target)</p>
            <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={hardDone} /></p>
            <p className="text-xs text-muted mt-2">Bonus — no fixed gate</p>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerContainer>

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
              placeholder="Tag (e.g. Arrays)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Pattern (e.g. two-pointers)"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-48"
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
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Analytics
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
              <div key={p.id} className="flex flex-col gap-1.5 rounded-md px-3 py-2 hover:bg-surface-2 group">
                <div className="flex items-center gap-3">
                  <Checkbox checked={p.completed} onCheckedChange={(v) => handleToggle(p.id, v === true)} />
                  <span className={p.completed ? "line-through text-muted flex-1 text-sm" : "flex-1 text-sm"}>
                    {p.problem_name}
                  </span>
                  {p.pattern && <Badge variant="outline">{p.pattern}</Badge>}
                  {p.topic_tag && <Badge variant="outline">{p.topic_tag}</Badge>}
                  <Badge
                    variant={p.difficulty === "hard" ? "danger" : p.difficulty === "medium" ? "warning" : "success"}
                  >
                    {p.difficulty}
                  </Badge>
                  {p.completed && p.confidence && (
                    <Badge variant={isOverdue(p.next_review_due) ? "danger" : "default"} className="text-[10px]">
                      {isOverdue(p.next_review_due) ? "Review due" : CONFIDENCE_LABEL[p.confidence]}
                    </Badge>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {p.completed && ratingId !== p.id && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setRatingId(p.id)}>
                      {p.confidence ? "Re-rate" : "Rate confidence"}
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {ratingId === p.id && (
                  <div className="pl-8">
                    <ConfidencePicker onRate={(r) => handleRateConfidence(p, r)} onCancel={() => setRatingId(null)} />
                  </div>
                )}
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
          {weakAreas.length > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-sm">Weak areas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted mb-3">
                  Tags with the lowest completion rate, among tags with at least {WEAK_AREA_MIN_PROBLEMS} problems
                  logged. This is completion rate, not accuracy — there&apos;s no per-attempt history to compute
                  a real accuracy from.
                </p>
                <div className="flex flex-col gap-2">
                  {weakAreas.map((w) => (
                    <div key={w.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{w.label}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={w.completionPct} className="w-24 h-1.5" />
                        <Badge variant="warning" className="font-mono-tabular text-xs w-14 justify-center">
                          {w.done}/{w.total}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent">
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

        <TabsContent value="analytics" className="flex flex-col gap-4 mt-4">
          {recommendations.length > 0 && (
            <Card className="border-accent/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" /> Practice next
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {recommendations.map((r) => (
                  <div key={r.row.id} className="flex items-center gap-3">
                    <Badge
                      variant={r.row.difficulty === "hard" ? "danger" : r.row.difficulty === "medium" ? "warning" : "success"}
                    >
                      {r.row.difficulty}
                    </Badge>
                    <span className="text-sm flex-1 truncate">{r.row.problem_name}</span>
                    <span className="text-xs text-muted">{r.reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent noHeader>
                <p className="text-xs text-muted mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Avg solve time
                </p>
                <p className="text-2xl font-bold font-mono-tabular">
                  {avgSolveTime !== null ? `${avgSolveTime}m` : "—"}
                </p>
                {avgSolveTime === null && <p className="text-xs text-muted mt-1">Log time taken to see this.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent noHeader>
                <p className="text-xs text-muted mb-2">Accuracy by difficulty</p>
                <div className="flex flex-col gap-1.5">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <div key={d} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{d}</span>
                      <span className="font-mono-tabular text-muted">
                        {accuracyByDiff[d].pct !== null ? `${accuracyByDiff[d].pct}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent noHeader>
                <p className="text-xs text-muted mb-2">Due for revision</p>
                <p className="text-2xl font-bold font-mono-tabular">
                  <AnimatedCounter value={overdueForRevisionCount} />
                </p>
                <p className="text-xs text-muted mt-1">Solved problems overdue for review</p>
              </CardContent>
            </Card>
          </div>

          {weakestByAccuracy.length > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-sm">Weakest patterns by accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted mb-3">
                  Real solved/logged accuracy per pattern, among patterns with at least 3 problems logged.
                </p>
                <div className="flex flex-col gap-2">
                  {weakestByAccuracy.map((w) => (
                    <div key={w.pattern} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{w.pattern}</span>
                      <div className="flex items-center gap-2">
                        {w.avgAttempts !== null && (
                          <span className="text-xs text-muted">{w.avgAttempts} avg attempts</span>
                        )}
                        <Progress value={w.accuracyPct} className="w-24 h-1.5" />
                        <Badge variant="warning" className="font-mono-tabular text-xs w-14 justify-center">
                          {w.solved}/{w.total}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {mistakes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Recent mistakes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {mistakes.map((m, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{m.problem}:</span>{" "}
                    <span className="text-muted">{m.mistake}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {weakestByAccuracy.length === 0 && mistakes.length === 0 && avgSolveTime === null && (
            <EmptyState
              message="Not enough data yet."
              hint="Log a pattern, time taken, or a mistake note when you solve problems to unlock real accuracy analytics."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

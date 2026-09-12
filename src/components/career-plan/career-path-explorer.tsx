"use client";

import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronRight, ListChecks, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PLAN_PATHS, type CareerPlanTrack } from "@/data/full-plan";
import { CAREER_PATH_STAGES, type CareerStage } from "@/data/career-path-stages";
import { seedCareerPathGoal } from "@/lib/hooks/use-career-plan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Only tracks with a full stage-by-stage breakdown appear in the explorer
// — currently all four that exist. plan_a is the primary ZTE full-stack
// plan; the other three are the alternative forks.
const EXPLORER_TRACKS: CareerPlanTrack[] = ["plan_a", "sap", "ba_pm", "ops"];

const TONE_HEX: Record<string, string> = {
  plan_a: "#22C55E",
  sap: "#8B5CF6",
  ba_pm: "#F59E0B",
  ops: "#38BDF8",
};

interface CareerPathExplorerProps {
  userId: string | undefined;
  activeTrack: CareerPlanTrack;
  onSelectTrack: (track: CareerPlanTrack) => void;
}

export function CareerPathExplorer({ userId, activeTrack, onSelectTrack }: CareerPathExplorerProps) {
  const [openStage, setOpenStage] = useState<CareerStage | null>(null);
  const [tracking, setTracking] = useState(false);
  // goalId per track, once seeded this session — lets the button flip to
  // "View goal" without a refetch. Not persisted client-side beyond the
  // session; seedCareerPathGoal itself is idempotent server-side, so a
  // page refresh just re-seeds-and-finds the same goal rather than
  // duplicating it.
  const [seededGoalId, setSeededGoalId] = useState<Record<string, string>>({});

  const explorerTrack = EXPLORER_TRACKS.includes(activeTrack) ? activeTrack : "plan_a";
  const entry = useMemo(
    () => CAREER_PATH_STAGES.find((item) => item.track === explorerTrack),
    [explorerTrack]
  );
  const path = PLAN_PATHS.find((item) => item.id === explorerTrack);
  const color = TONE_HEX[explorerTrack] ?? "#22C55E";

  if (!entry || !path) return null;

  const trackedGoalId = seededGoalId[explorerTrack];

  async function handleTrackPath() {
    if (!userId) {
      toast.error("Sign in to start tracking a path.");
      return;
    }
    setTracking(true);
    try {
      const result = await seedCareerPathGoal(userId, explorerTrack);
      setSeededGoalId((prev) => ({ ...prev, [explorerTrack]: result.goal.id }));
      toast.success(
        result.created
          ? `Now tracking "${path!.title}" — ${entry!.stages.length} milestones added to Goals`
          : `Already tracking "${path!.title}" — opening your existing goal`
      );
    } catch {
      toast.error("Couldn't start tracking this path. Try again in a moment.");
    } finally {
      setTracking(false);
    }
  }

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-5 p-5">
        <Tabs
          value={explorerTrack}
          onValueChange={(value) => onSelectTrack(value as CareerPlanTrack)}
        >
          <TabsList className="flex w-full flex-wrap h-auto gap-1.5 bg-transparent p-0">
            {EXPLORER_TRACKS.map((trackId) => {
              const trackPath = PLAN_PATHS.find((item) => item.id === trackId);
              if (!trackPath) return null;
              const isActive = trackId === explorerTrack;
              const trackColor = TONE_HEX[trackId] ?? "#22C55E";
              return (
                <TabsTrigger
                  key={trackId}
                  value={trackId}
                  className="flex-1 min-w-[130px] flex-col items-start gap-0.5 rounded-lg border border-border/60 px-3 py-2 text-left data-[state=active]:shadow-none"
                  style={isActive ? { borderColor: `${trackColor}80`, backgroundColor: `${trackColor}14` } : undefined}
                >
                  <span className="text-[13px] font-semibold text-foreground truncate w-full">{trackPath.title}</span>
                  <span className="text-[11px] font-mono-tabular" style={{ color: trackColor }}>
                    Ceiling: {trackPath.ceiling}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between gap-3 -mt-1">
          <p className="text-[13px] text-muted">{path.summary}</p>
          {trackedGoalId ? (
            <Link href="/goals">
              <Button variant="outline" size="sm" className="shrink-0">
                <ListChecks className="h-4 w-4" /> View goal
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleTrackPath} disabled={tracking}>
              {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
              Track this path
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
          {/* Stage timeline */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted">Tap any stage for the full breakdown.</p>
            <div className="relative pl-7">
              <div
                className="absolute left-[9px] top-2 bottom-6 w-px"
                style={{ background: `linear-gradient(to bottom, ${color}80, transparent)` }}
              />
              {entry.stages.map((stage) => (
                <div key={stage.id} className="relative mb-2.5 last:mb-0">
                  <div
                    className="absolute -left-7 top-3.5 flex h-4 w-4 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: stage.isNow ? color : "var(--border)",
                      background: stage.isNow ? color : "var(--surface)",
                    }}
                  >
                    {stage.isNow && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenStage(stage)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors hover:border-accent/50 hover:bg-surface-hover",
                      stage.isNow ? "border-current" : "border-border/60"
                    )}
                    style={stage.isNow ? { borderColor: `${color}80`, backgroundColor: `${color}0d` } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted">{stage.time}</p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          {stage.title}
                          <ChevronRight className="h-3.5 w-3.5 text-muted shrink-0" />
                        </p>
                        <p className="text-xs text-muted mt-1">{stage.note}</p>
                      </div>
                      {(stage.salary || stage.monthly) && (
                        <div className="text-right shrink-0">
                          {stage.salary && (
                            <p className="text-sm font-semibold font-mono-tabular" style={{ color }}>
                              {stage.salary}
                            </p>
                          )}
                          {stage.monthly && <p className="text-[11px] text-muted whitespace-nowrap">{stage.monthly}</p>}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chart + ceiling comparison */}
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-2">Salary arc · ₹L / yr</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={entry.chart} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id={`grad-${explorerTrack}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="yr" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const lo = payload.find((p) => p.dataKey === "lo")?.value;
                      const hi = payload.find((p) => p.dataKey === "hi")?.value;
                      return (
                        <div className="rounded-lg bg-[#0F172A] px-3 py-2 text-xs text-white shadow-lg">
                          <div className="text-muted">{label}</div>
                          <div className="font-semibold" style={{ color }}>
                            {lo === hi ? `₹${lo}L` : `₹${lo}L – ₹${hi}L`}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="hi" stroke={color} strokeWidth={2} fill={`url(#grad-${explorerTrack})`} dot={false} />
                  <Area type="monotone" dataKey="lo" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" fill="transparent" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-3">10-yr ceiling · all paths</p>
              <div className="flex flex-col gap-2.5">
                {PLAN_PATHS.filter((p) => EXPLORER_TRACKS.includes(p.id)).map((p) => {
                  const pct = (p.ceilingLpa / 80) * 100;
                  const isActive = p.id === explorerTrack;
                  const pColor = TONE_HEX[p.id] ?? "#22C55E";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectTrack(p.id)}
                      className="text-left"
                    >
                      <div className="flex justify-between mb-1">
                        <span className={cn("text-[11px]", isActive ? "text-foreground font-medium" : "text-muted")}>
                          {p.title}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: pColor }}>
                          {p.ceiling}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: pColor, opacity: isActive ? 1 : 0.35 }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!openStage} onOpenChange={(open) => !open && setOpenStage(null)}>
        <DialogContent>
          {openStage && (
            <>
              <DialogHeader>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
                  {openStage.time}
                </p>
                <DialogTitle>{openStage.title}</DialogTitle>
                {(openStage.salary || openStage.monthly) && (
                  <div className="flex gap-2 mt-1">
                    {openStage.salary && <Badge style={{ borderColor: `${color}50`, backgroundColor: `${color}1a`, color }}>{openStage.salary} / yr</Badge>}
                    {openStage.monthly && <Badge variant="outline">{openStage.monthly}</Badge>}
                  </div>
                )}
                <DialogDescription className="pt-2 text-[13.5px] leading-relaxed text-foreground/80">
                  {openStage.detail.summary}
                </DialogDescription>
              </DialogHeader>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  What this actually looks like
                </p>
                <ul className="flex flex-col gap-2">
                  {openStage.detail.points.map((point) => (
                    <li key={point} className="flex gap-2 text-[13px] leading-relaxed text-muted">
                      <span className="shrink-0 font-semibold" style={{ color }}>
                        →
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {openStage.detail.companies.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                    Target companies / roles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {openStage.detail.companies.map((company) => (
                      <Badge key={company} variant="outline">
                        {company}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flag,
  Gauge,
  Rocket,
  Save,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerPlanSettings, saveCareerPlanSettings } from "@/lib/hooks/use-career-plan";
import { usePhasesWithProgress, useExitLadder, useMonthByMonth } from "@/lib/hooks/use-roadmap";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker, useApplicationMetrics } from "@/lib/hooks/use-career";
import { useInterviewWeaknesses } from "@/lib/hooks/use-interview-prep";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useAllStudySessions } from "@/lib/hooks/use-study-sessions";
import { useDailyPlanTaskStateRange } from "@/lib/hooks/use-daily-plan-task-state";
import { saveFinancialProfile, useFinancialProfile } from "@/lib/hooks/use-execution-os";
import { computeWeeklyReview } from "@/lib/weekly-review";
import {
  assessMonth24Decision,
  computePlanPosition,
  computeWeeklyVariance,
} from "@/lib/plan-position";
import { computeCareerPlanSnapshot, formatPlanDate } from "@/lib/career-plan";
import {
  DISCIPLINE_RULES,
  FAILURE_MODES,
  FULL_PLAN,
  MONTH_24_CHECKLIST,
  PLAN_PATHS,
  PLAN_WINDOWS,
  SALARY_REFERENCE,
  WEEKLY_OPERATING_SYSTEM,
} from "@/data/full-plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn, localDateISO } from "@/lib/utils";

function mondayOfToday() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateISO(d);
}

function todayISO() {
  return localDateISO(new Date());
}

function sectionTone(tone: "blue" | "green") {
  return tone === "green" ? "border-success/30 bg-success/5" : "border-info/30 bg-info/5";
}

export default function CareerPlanPage() {
  const { user } = useUser();
  const { data: settings, mutate: mutateSettings, isLoading: settingsLoading } = useCareerPlanSettings(user?.id);
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: exitLadder } = useExitLadder();
  const { data: monthByMonth } = useMonthByMonth();
  const { data: logs } = useDailyLogs(user?.id);
  const { data: dsaRows } = useDsaProgress(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: applicationMetrics } = useApplicationMetrics(user?.id);
  const { data: interviewWeaknesses } = useInterviewWeaknesses(user?.id);
  const { data: targetRoles } = useTargetRoles();
  const targetRole = targetRoles?.find((role) => /sde|full.?stack|backend/i.test(role.name)) ?? targetRoles?.[0];
  const { breakdown: roleReadiness } = useJobReadiness(user?.id, targetRole);
  const { data: projectProgress } = useProjectProgress(user?.id);
  const { data: studySessions } = useAllStudySessions(user?.id);
  const { data: financialProfile, mutate: mutateFinancialProfile } = useFinancialProfile(user?.id);
  const weekStart = useMemo(() => mondayOfToday(), []);
  const { data: weekTaskRows } = useDailyPlanTaskStateRange(user?.id, weekStart, todayISO());

  const [track, setTrack] = useState<"plan_a" | "plan_b">("plan_b");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [flagshipProject, setFlagshipProject] = useState<string>(FULL_PLAN.flagshipProject);
  const [monthlyIncome, setMonthlyIncome] = useState("0");
  const [monthlyExpenses, setMonthlyExpenses] = useState("0");
  const [savings, setSavings] = useState("0");
  const [emergencyMonths, setEmergencyMonths] = useState("6");
  const [minimumSwitchSalary, setMinimumSwitchSalary] = useState("0");
  const [saving, setSaving] = useState<"settings" | "runway" | null>(null);

  useEffect(() => {
    if (!settings) return;
    // These fields are controlled form values; syncing them after the remote
    // row arrives avoids a flash of defaults without creating a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrack(settings.career_plan_track);
    setStartDate(settings.career_plan_start_date ?? "");
    setDeadlineDate(settings.career_plan_deadline_date ?? "");
    setWeeklyHours(String(settings.career_plan_weekly_hours));
    setFlagshipProject(settings.career_plan_flagship_project);
  }, [settings]);

  useEffect(() => {
    if (!financialProfile) return;
    // Controlled inputs are populated after the user-owned row arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthlyIncome(String(financialProfile.monthly_income));
    setMonthlyExpenses(String(financialProfile.monthly_expenses));
    setSavings(String(financialProfile.savings));
    setEmergencyMonths(String(financialProfile.emergency_months));
    setMinimumSwitchSalary(String(financialProfile.minimum_switch_salary));
  }, [financialProfile]);

  const planPosition = useMemo(
    () => (monthByMonth && logs ? computePlanPosition(monthByMonth, logs) : null),
    [monthByMonth, logs]
  );
  const snapshot = useMemo(
    () => (exitLadder && logs ? computeCareerPlanSnapshot({ settings, logs, phases, exitLadder, planPosition }) : null),
    [settings, logs, phases, exitLadder, planPosition]
  );
  const weeklyReview = useMemo(
    () => (weekTaskRows && dsaRows && logs ? computeWeeklyReview(weekTaskRows, dsaRows, logs) : null),
    [weekTaskRows, dsaRows, logs]
  );
  const weeklyProjectHours = useMemo(
    () => (studySessions ?? [])
      .filter((session) => session.activity === "project" && session.date >= weekStart && session.date <= todayISO())
      .reduce((sum, session) => sum + Number(session.hours), 0),
    [studySessions, weekStart]
  );
  const recentApplications = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return (applications ?? []).filter((entry) => entry.applied_at && new Date(entry.applied_at) >= cutoff).length;
  }, [applications]);
  const followUpsDue = useMemo(() => {
    const today = todayISO();
    return (applications ?? [])
      .filter((entry) => entry.follow_up_date && entry.follow_up_date.slice(0, 10) <= today && !["rejected", "withdrawn", "offer"].includes(entry.application_status))
      .sort((a, b) => (a.follow_up_date ?? "").localeCompare(b.follow_up_date ?? ""))
      .slice(0, 5);
  }, [applications]);
  const weeklyVariance = useMemo(
    () => (weeklyReview ? computeWeeklyVariance({ ...weeklyReview, projectsProgressed: weeklyProjectHours }, recentApplications > 0 ? 1 : 0, {
      engineeringHours: Number(weeklyHours) || FULL_PLAN.defaultWeeklyHours,
      projectHoursMin: 4,
      projectHoursMax: 8,
      dsaSessionsMin: 3,
      dsaSessionsMax: 6,
      careerUpdatesMin: 1,
    }) : []),
    [weeklyReview, weeklyProjectHours, recentApplications, weeklyHours]
  );
  const assessment = useMemo(() => (snapshot ? assessMonth24Decision({
    exitReadinessPct: snapshot.currentExitReadinessPct,
    totalApplications: applicationMetrics?.total_applications ?? 0,
    interviewsReached: applicationMetrics?.reached_interview_count ?? 0,
    offersReceived: applicationMetrics?.offer_count ?? 0,
    openInterviewWeaknesses: interviewWeaknesses?.length ?? 0,
  }) : null), [snapshot, applicationMetrics, interviewWeaknesses]);
  const projectCount = (projectProgress ?? []).filter((project) => project.status === "completed").length;
  const isLoading = settingsLoading || phasesLoading || !snapshot;

  async function saveSettings() {
    if (!user) return;
    const parsedHours = Number(weeklyHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 1 || parsedHours > 168) {
      toast.error("Weekly hours must be between 1 and 168.");
      return;
    }
    setSaving("settings");
    try {
      await saveCareerPlanSettings(user.id, {
        career_plan_track: track,
        career_plan_start_date: startDate || null,
        career_plan_deadline_date: deadlineDate || null,
        career_plan_weekly_hours: parsedHours,
        career_plan_flagship_project: flagshipProject.trim() || FULL_PLAN.flagshipProject,
      });
      await mutateSettings();
      toast.success("Career plan settings saved");
    } catch {
      toast.error("Couldn't save plan settings. Apply migration 0051 in Supabase and try again.");
    } finally {
      setSaving(null);
    }
  }

  async function saveRunway() {
    if (!user) return;
    const values = [monthlyIncome, monthlyExpenses, savings, emergencyMonths, minimumSwitchSalary].map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 0) || values[3] > 36) {
      toast.error("Enter non-negative financial values; emergency months must be 0–36.");
      return;
    }
    setSaving("runway");
    try {
      await saveFinancialProfile(user.id, {
        monthly_income: values[0],
        monthly_expenses: values[1],
        savings: values[2],
        emergency_months: values[3],
        minimum_switch_salary: values[4],
      });
      await mutateFinancialProfile();
      toast.success("Runway plan saved");
    } catch {
      toast.error("Couldn’t save runway data. Apply migration 0052 first.");
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return <div className="flex flex-col gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-56 w-full" /></div>;
  }

  const activeWindow = PLAN_WINDOWS.find((window) => {
    const first = Number(window.months.match(/\d+/)?.[0] ?? 1);
    const last = Number(window.months.match(/\d+$/)?.[0] ?? first);
    return snapshot.monthNumber >= first && snapshot.monthNumber <= last;
  }) ?? PLAN_WINDOWS[PLAN_WINDOWS.length - 1];
  const trackPath = PLAN_PATHS.find((path) => path.id === track) ?? PLAN_PATHS[1];
  const completedProjects = projectCount;
  const runwayExpenses = Number(monthlyExpenses) || 0;
  const runwayMonths = runwayExpenses > 0 ? Number(savings) / runwayExpenses : 0;
  const targetSavings = runwayExpenses * (Number(emergencyMonths) || 0);
  const runwayReady = runwayExpenses > 0 && Number(savings) >= targetSavings && Number(minimumSwitchSalary) > 0;
  const formatRupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
  const paceOptions = [20, 30, 40, 50].map((hours) => ({
    hours,
    months: snapshot.planPosition && snapshot.planPosition.totalPlanHours > snapshot.actualHours
      ? Math.round(((snapshot.planPosition.totalPlanHours - snapshot.actualHours) / hours / 4.33) * 10) / 10
      : 0,
  }));

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent"><Rocket className="h-4 w-4" /> Zero to Elite · Career Strategy</div>
          <h1 className="text-page-title font-semibold tracking-tight mt-2">{FULL_PLAN.title}</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">{FULL_PLAN.subtitle}</p>
        </div>
        <Link href="/weekly-digest" className="inline-flex items-center gap-2 text-sm text-accent hover:underline"><CalendarDays className="h-4 w-4" /> Open weekly review <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface">
        <CardContent noHeader className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="accent">{trackPath.eyebrow}</Badge><Badge variant="outline">{snapshot.monthLabel}</Badge><Badge variant="outline">{snapshot.currentExitCode ? `Exit ${snapshot.currentExitCode}` : "Build phase"}</Badge></div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-3">{trackPath.title}</h2>
              <p className="text-sm text-muted mt-2 leading-6">{trackPath.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
              <div className="rounded-xl border border-border/50 bg-surface/60 p-3"><p className="text-[10px] uppercase text-muted">Roadmap</p><p className="text-xl font-semibold mt-1">{snapshot.topicsPct}%</p><p className="text-xs text-muted">{snapshot.completedTopics}/{snapshot.totalTopics} topics</p></div>
              <div className="rounded-xl border border-border/50 bg-surface/60 p-3"><p className="text-[10px] uppercase text-muted">Hours</p><p className="text-xl font-semibold mt-1">{snapshot.actualHours.toFixed(0)}</p><p className="text-xs text-muted">logged total</p></div>
              <div className="rounded-xl border border-border/50 bg-surface/60 p-3"><p className="text-[10px] uppercase text-muted">Next exit</p><p className="text-xl font-semibold mt-1">{snapshot.currentExitCode ?? "—"}</p><p className="text-xs text-muted">{snapshot.currentExitReadinessPct}% ready</p></div>
              <div className="rounded-xl border border-border/50 bg-surface/60 p-3"><p className="text-[10px] uppercase text-muted">Deadline</p><p className="text-xl font-semibold mt-1">{snapshot.daysRemaining > 0 ? `${snapshot.daysRemaining}d` : "Due"}</p><p className="text-xs text-muted">{formatPlanDate(snapshot.deadlineDate)}</p></div>
            </div>
          </div>
          <Progress value={snapshot.topicsPct} className="h-2 mt-6" glow />
          <p className="text-xs text-muted mt-2">Current focus: {snapshot.currentPhaseTitle ?? "Roadmap complete"}{snapshot.planPosition ? ` · ${snapshot.planPosition.focus}` : ""}</p>
        </CardContent>
      </Card>

      {!settings?.career_plan_start_date && (
        <Card className="border-warning/35 bg-warning/5">
          <CardContent noHeader className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Target className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">Set your clock before you start</p><p className="text-xs text-muted mt-1">Choose the date, weekly target, and flagship project that make this plan measurable.</p></div>
            <a href="#plan-settings"><Button variant="outline" size="sm">Configure plan <ArrowRight className="h-4 w-4" /></Button></a>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PLAN_PATHS.map((path) => (
          <Card key={path.id} className={cn("h-full", sectionTone(path.tone), path.id === track && "ring-1 ring-accent/60")}>
            <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle size="lg">{path.title}</CardTitle>{path.id === track && <Badge variant="accent">Selected</Badge>}</div><CardDescription>{path.summary}</CardDescription></CardHeader>
            <CardContent><ul className="flex flex-col gap-2 text-sm text-muted">{path.actions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />{action}</li>)}</ul></CardContent>
          </Card>
        ))}
      </div>

      <Card className={cn(followUpsDue.length > 0 && "border-warning/35 bg-warning/5")}><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-warning" /> Application follow-ups</CardTitle><CardDescription>Keep the market feedback loop moving; these dates come directly from Career Tracker.</CardDescription></CardHeader><CardContent>{followUpsDue.length === 0 ? <p className="text-sm text-muted">No follow-ups due. Add a follow-up date to an active application when you need to circle back.</p> : <div className="flex flex-col gap-2">{followUpsDue.map((entry) => <Link key={entry.id} href="/career" className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 hover:border-accent/40 transition-colors"><div className="min-w-0"><p className="text-sm font-medium truncate">{entry.company}{entry.role ? ` · ${entry.role}` : ""}</p><p className="text-xs text-muted capitalize">{entry.application_status}</p></div><Badge variant="warning">{formatPlanDate(entry.follow_up_date!.slice(0, 10))}</Badge></Link>)}</div>}</CardContent></Card>

      <Card id="plan-settings">
        <CardHeader><CardTitle>Make the plan yours</CardTitle><CardDescription>These preferences personalize the playbook. Progress, readiness, and evidence remain live from the existing tracker.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div className="space-y-2"><Label>Active fork</Label><Select value={track} onValueChange={(value) => setTrack(value as "plan_a" | "plan_b")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="plan_b">Plan B · SDE sprint</SelectItem><SelectItem value="plan_a">Plan A · Operations climb</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="plan-start">Clock starts</Label><Input id="plan-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="plan-deadline">Hard deadline</Label><Input id="plan-deadline" type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="plan-hours">Weekly target</Label><Input id="plan-hours" type="number" min={1} max={168} step={1} value={weeklyHours} onChange={(event) => setWeeklyHours(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="plan-project">Flagship project</Label><Input id="plan-project" value={flagshipProject} onChange={(event) => setFlagshipProject(event.target.value)} /></div>
          <Button onClick={saveSettings} disabled={saving === "settings"} className="xl:col-start-5"><Save className="h-4 w-4" />{saving === "settings" ? "Saving…" : "Save settings"}</Button>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-end justify-between gap-3 mb-3"><div><p className="text-xs uppercase tracking-[0.16em] text-muted">Operating timeline</p><h2 className="text-section-title font-semibold mt-1">What this window is for</h2></div><Badge variant="outline">Now: {activeWindow.months}</Badge></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLAN_WINDOWS.map((window) => {
            const active = window.id === activeWindow.id;
            return <Card key={window.id} className={cn("h-full", active && "border-accent/50 bg-accent/5")}><CardHeader><div className="flex items-center gap-2"><span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", active ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted")}>{PLAN_WINDOWS.indexOf(window) + 1}</span><div><p className="text-xs text-muted">Months {window.months}</p><CardTitle size="sm">{window.title}</CardTitle></div></div></CardHeader><CardContent className="flex flex-col gap-3 text-sm"><p className="text-muted">{window.why}</p><div className="rounded-lg border border-border/50 bg-surface-2/50 p-3"><p className="text-[10px] uppercase tracking-wider text-accent">Done looks like</p><p className="text-xs text-muted mt-1">{window.done}</p></div><p className="text-[11px] text-muted">{window.phaseHint}</p></CardContent></Card>;
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-accent" /> This week: planned vs actual</CardTitle><CardDescription>Uses the same weekly review totals shown in Daily Plan and Weekly Digest.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-3">{WEEKLY_OPERATING_SYSTEM.map((item, index) => { const variance = weeklyVariance[index]; return <div key={item.label} className="rounded-lg border border-border/50 p-3"><p className="text-xs text-muted">{item.label}</p><p className="text-lg font-semibold font-mono-tabular mt-1">{variance ? variance.actual : "—"}</p><p className="text-[11px] text-muted">target {item.target}</p>{variance && <Badge variant={variance.status === "on-target" ? "success" : variance.status === "under" ? "danger" : "outline"} className="mt-2">{variance.variance >= 0 ? "+" : ""}{variance.variance}</Badge>}</div>; })}</div><Link href="/daily-plan" className="inline-flex items-center gap-1 text-sm text-accent mt-4 hover:underline">Open today&apos;s plan <ArrowRight className="h-4 w-4" /></Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> Month-24 evidence gate</CardTitle><CardDescription>Evidence is deliberately conservative: technical readiness plus actual market response.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex items-center gap-2"><Badge variant={assessment?.decision === "go" ? "success" : assessment?.decision === "no-go" ? "danger" : "warning"}>{assessment?.decision ?? "insufficient-evidence"}</Badge><span className="text-sm text-muted">{applicationMetrics?.total_applications ?? 0} applications · {applicationMetrics?.reached_interview_count ?? 0} interviews · {applicationMetrics?.offer_count ?? 0} offers</span></div><ul className="text-xs text-muted flex flex-col gap-1">{(assessment?.reasons ?? ["Keep logging applications and interview outcomes before making the call."]).map((reason) => <li key={reason}>• {reason}</li>)}</ul><Link href="/exit-ladder" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">Review exit evidence <ArrowRight className="h-4 w-4" /></Link></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-accent" /> Non-negotiables</CardTitle><CardDescription>{completedProjects} completed project{completedProjects === 1 ? "" : "s"} logged. Keep the proof visible.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">{DISCIPLINE_RULES.map((rule) => <div key={rule} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />{rule}</div>)}</CardContent></Card>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleAlert className="h-5 w-5 text-warning" /> Failure modes to watch</CardTitle><CardDescription>These are coaching prompts; live warnings appear on Dashboard and Weekly Digest when the tracker has enough evidence.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{FAILURE_MODES.map((mode) => <div key={mode.title} className="rounded-lg border border-border/50 p-3"><p className="text-sm font-medium">{mode.title}</p><p className="text-xs text-muted mt-1">{mode.symptom}</p><p className="text-xs text-accent mt-2">Fix · {mode.fix}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> Month-24 checklist</CardTitle><CardDescription>Answer these in writing on the deadline—whatever the decision.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{MONTH_24_CHECKLIST.map((item) => <div key={item} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />{item}</div>)}</CardContent></Card>
      </section>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" /> Salary planning reference</CardTitle><CardDescription>Indicative ranges from the supplied playbook, not promises or compensation advice. Validate current market data before making a decision.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{(["plan_a", "plan_b"] as const).map((pathId) => <div key={pathId}><p className="text-sm font-semibold mb-2">{pathId === "plan_a" ? "Plan A · Operations" : "Plan B · Engineering exits"}</p><div className="flex flex-col divide-y divide-border/50">{SALARY_REFERENCE.filter((row) => row.track === pathId).map((row) => <div key={row.label} className="flex items-center justify-between gap-4 py-2"><div><p className="text-xs font-medium">{row.label}</p><p className="text-[11px] text-muted">{row.evidence}</p></div><span className="text-sm font-mono-tabular text-accent whitespace-nowrap">{row.range}</span></div>)}</div></div>)}</div><p className="text-[11px] text-muted mt-5">Source context: the supplied Zero to Elite playbook and its internal exit ladder. Ranges are planning inputs; offers depend on role, company, location, interview performance, and market conditions.</p></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> Role readiness</CardTitle><CardDescription>Same explainable readiness breakdown as Job Readiness, surfaced here so the career plan has a market-facing signal.</CardDescription></CardHeader><CardContent>{roleReadiness ? <div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={roleReadiness.overallPct >= 75 ? "success" : roleReadiness.overallPct >= 45 ? "warning" : "outline"}>{roleReadiness.overallPct}% ready</Badge><span className="text-sm text-muted">{roleReadiness.roleName}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">{roleReadiness.pillars.map((pillar) => <div key={pillar.key} className="rounded-lg border border-border/50 p-2"><p className="text-[10px] text-muted truncate">{pillar.label}</p><p className="text-sm font-semibold mt-1">{pillar.score === null ? "—" : `${pillar.score}%`}</p></div>)}</div><Link href="/job-readiness" className="text-sm text-accent hover:underline">Open full role breakdown <ArrowRight className="inline h-3.5 w-3.5" /></Link></div> : <p className="text-sm text-muted">Choose a target role in Job Readiness to see the explainable score here.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> Financial runway</CardTitle><CardDescription>Use this to decide when a career switch is financially safe—not to predict an offer.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div className="space-y-1"><Label htmlFor="income">Monthly income</Label><Input id="income" type="number" min={0} value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="expenses">Monthly expenses</Label><Input id="expenses" type="number" min={0} value={monthlyExpenses} onChange={(event) => setMonthlyExpenses(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="savings">Savings</Label><Input id="savings" type="number" min={0} value={savings} onChange={(event) => setSavings(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="emergency">Safety months</Label><Input id="emergency" type="number" min={0} max={36} step={0.5} value={emergencyMonths} onChange={(event) => setEmergencyMonths(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="switch-salary">Minimum switch salary</Label><Input id="switch-salary" type="number" min={0} value={minimumSwitchSalary} onChange={(event) => setMinimumSwitchSalary(event.target.value)} /></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-lg border border-border/50 p-3"><p className="text-[10px] uppercase text-muted">Runway</p><p className="text-xl font-semibold mt-1">{runwayMonths > 0 ? `${runwayMonths.toFixed(1)} mo` : "—"}</p><p className="text-xs text-muted">at current expenses</p></div><div className="rounded-lg border border-border/50 p-3"><p className="text-[10px] uppercase text-muted">Safety target</p><p className="text-xl font-semibold mt-1">{runwayExpenses > 0 ? formatRupees(targetSavings) : "—"}</p><p className="text-xs text-muted">{emergencyMonths || 0} months saved</p></div><div className={cn("rounded-lg border p-3", runwayReady ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5")}><p className="text-[10px] uppercase text-muted">Switch readiness</p><p className="text-xl font-semibold mt-1">{runwayReady ? "Ready" : "Build buffer"}</p><p className="text-xs text-muted">keep Plan A until evidence + runway align</p></div></div><Button onClick={saveRunway} disabled={saving === "runway"}><Save className="h-4 w-4" />{saving === "runway" ? "Saving…" : "Save runway plan"}</Button></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-accent" /> Pace simulator</CardTitle><CardDescription>Use the live remaining roadmap hours to compare sustainable weekly targets. This is a projection, not a promise.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{paceOptions.map((option) => <div key={option.hours} className={cn("rounded-lg border p-3", option.hours === Number(weeklyHours) && "border-accent/50 bg-accent/5")}><p className="text-xs text-muted">{option.hours}h / week</p><p className="text-xl font-semibold mt-1">{option.months > 0 ? `${option.months} mo` : "Complete"}</p><p className="text-[11px] text-muted">remaining roadmap</p></div>)}</div><div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted"><Link href="/job-readiness" className="text-accent hover:underline">Check role readiness <ArrowRight className="inline h-3.5 w-3.5" /></Link><span>Current target: {weeklyHours}h/week</span></div></CardContent></Card>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Clock: {formatPlanDate(snapshot.startDate)} → {formatPlanDate(snapshot.deadlineDate)}</span><span className="inline-flex items-center gap-1"><Rocket className="h-3.5 w-3.5" />Flagship: {flagshipProject || FULL_PLAN.flagshipProject}</span><Link href="/execution" className="inline-flex items-center gap-1 text-accent hover:underline"><CalendarClock className="h-3.5 w-3.5" />Open Execution OS <ArrowRight className="h-3.5 w-3.5" /></Link><Link href="/career" className="inline-flex items-center gap-1 text-accent hover:underline">Open Career Tracker <ArrowRight className="h-3.5 w-3.5" /></Link></div>
    </div>
  );
}

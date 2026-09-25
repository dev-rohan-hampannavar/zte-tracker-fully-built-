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
import type { CareerPlanTrack, PlanTone } from "@/data/full-plan";
import { CareerPathExplorer } from "@/components/career-plan/career-path-explorer";
import {
  DISCIPLINE_RULES,
  EXIT_HOURS_REQUIRED,
  FAILURE_MODES,
  FULL_PLAN,
  MONTH_24_CHECKLIST,
  PLAN_PATHS,
  PLAN_WINDOWS,
  SALARY_REFERENCE,
  WEEKLY_OPERATING_SYSTEM,
  computeExitMonthsLabel,
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

function sectionTone(tone: PlanTone) {
  switch (tone) {
    case "green":
      return "border-success/30 bg-success/5";
    case "purple":
      return "border-accent/30 bg-accent/5";
    case "amber":
      return "border-warning/30 bg-warning/5";
    default:
      return "border-info/30 bg-info/5";
  }
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

  const [track, setTrack] = useState<CareerPlanTrack>("plan_a");
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {PLAN_PATHS.map((path) => (
          <Card key={path.id} interactive className={cn("h-full", sectionTone(path.tone), path.id === track && "ring-1 ring-accent/60")} onClick={() => setTrack(path.id)}>
            <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle size="lg">{path.title}</CardTitle>{path.id === track && <Badge variant="accent">Selected</Badge>}</div><CardDescription>{path.summary}</CardDescription><Badge variant="outline" className="w-fit mt-1">10-yr ceiling: {path.ceiling}</Badge></CardHeader>
            <CardContent><ul className="flex flex-col gap-2 text-sm text-muted">{path.actions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />{action}</li>)}</ul></CardContent>
          </Card>
        ))}
      </div>

      <Card className={cn(followUpsDue.length > 0 && "border-warning/35 bg-warning/5")}><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-warning" /> Application follow-ups</CardTitle><CardDescription>Keep the market feedback loop moving; these dates come directly from Career Tracker.</CardDescription></CardHeader><CardContent>{followUpsDue.length === 0 ? <p className="text-sm text-muted">No follow-ups due. Add a follow-up date to an active application when you need to circle back.</p> : <div className="flex flex-col gap-2">{followUpsDue.map((entry) => <Link key={entry.id} href="/career" className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 hover:border-accent/40 transition-colors"><div className="min-w-0"><p className="text-sm font-medium truncate">{entry.company}{entry.role ? ` · ${entry.role}` : ""}</p><p className="text-xs text-muted capitalize">{entry.application_status}</p></div><Badge variant="warning">{formatPlanDate(entry.follow_up_date!.slice(0, 10))}</Badge></Link>)}</div>}</CardContent></Card>

      <Card id="plan-settings">
        <CardHeader><CardTitle>Make the plan yours</CardTitle><CardDescription>These preferences personalize the playbook. Progress, readiness, and evidence remain live from the existing tracker.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div className="space-y-2"><Label>Active fork</Label><Select value={track} onValueChange={(value) => setTrack(value as CareerPlanTrack)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLAN_PATHS.map((path) => <SelectItem key={path.id} value={path.id}>{path.eyebrow.replace(" · ", " · ").concat(" — ").concat(path.title)}</SelectItem>)}</SelectContent></Select></div>
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

      <section>
        <div className="flex items-end justify-between gap-3 mb-3"><div><p className="text-xs uppercase tracking-[0.16em] text-muted">Career Strategy</p><h2 className="text-section-title font-semibold mt-1">Compare every fork</h2></div><Badge variant="outline">{PLAN_PATHS.length} paths</Badge></div>
        <CareerPathExplorer userId={user?.id} activeTrack={track} onSelectTrack={(id) => setTrack(id)} />
      </section>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" /> Salary planning reference</CardTitle><CardDescription>Indicative ranges from the supplied playbook, not promises or compensation advice. Validate current market data before making a decision.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{PLAN_PATHS.map((path) => <div key={path.id}><p className="text-sm font-semibold mb-2">{path.title}</p><div className="flex flex-col divide-y divide-border/50">{SALARY_REFERENCE.filter((row) => row.track === path.id).map((row) => <div key={row.label} className="flex items-center justify-between gap-4 py-2"><div><p className="text-xs font-medium">{row.label}{row.exitCode ? <span className="text-muted font-normal"> · {computeExitMonthsLabel(row.exitCode, Number(weeklyHours) || 30)}</span> : null}</p><p className="text-[11px] text-muted">{row.evidence}</p></div><span className="text-sm font-mono-tabular text-accent whitespace-nowrap">{row.range}</span></div>)}</div></div>)}</div><p className="text-[11px] text-muted mt-5">Source context: the supplied Zero to Elite playbook and its internal exit ladder. Ranges are planning inputs; offers depend on role, company, location, interview performance, and market conditions.</p></CardContent></Card>

      {/* ── Pay reality check ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-warning" /> Pay reality check
          </CardTitle>
          <CardDescription>
            Three numbers for the same thing: your own estimate, the market average, and ZTE's band. Plan on the lowest. Source: career_timeline_zte.docx §9 and §14.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
              <p className="text-[10px] uppercase text-muted">Your own estimate</p>
              <p className="text-2xl font-semibold mt-1">₹2.5–4L</p>
              <p className="text-xs text-muted mt-1">First junior frontend role in Bangalore. <span className="text-danger font-medium">Plan finances on this number.</span> Treat anything above it as upside.</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] uppercase text-muted">Market average (2026)</p>
              <p className="text-2xl font-semibold mt-1">₹3–8L</p>
              <p className="text-xs text-muted mt-1">Freshers across all company types. Average near ₹5L. IT-services ₹3.5–5L; Bangalore product startups ₹6–9L.</p>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-[10px] uppercase text-muted">ZTE Exit A band</p>
              <p className="text-2xl font-semibold mt-1">₹6–10L</p>
              <p className="text-xs text-muted mt-1">Upper half of the market. Needs a product-company offer, not IT-services. <span className="text-success font-medium">Treat as target, not baseline.</span></p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <p className="text-xs font-medium mb-2">Who leads at age 26 depending on first dev offer</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">First dev offer</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Ops pay at 26 (base)</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Dev pay at 26</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">Who leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {([
                  { offer: "₹4L (your own low estimate)", ops: "₹7L (5.5–8.5)", dev: "₹4L", leader: "Ops by ₹3L", danger: true },
                  { offer: "₹8L (mid case)", ops: "₹7L (5.5–8.5)", dev: "₹8L", leader: "Dev by ₹1L", danger: false },
                  { offer: "₹12L (high case, product/GCC)", ops: "₹7L (5.5–8.5)", dev: "₹12L", leader: "Dev by ₹5L", danger: false },
                ] as const).map((row) => (
                  <tr key={row.offer}>
                    <td className="py-2 pr-4 text-xs">{row.offer}</td>
                    <td className="py-2 pr-4 text-right font-mono-tabular text-xs">{row.ops}</td>
                    <td className="py-2 pr-4 text-right font-mono-tabular text-xs">{row.dev}</td>
                    <td className={cn("py-2 text-right text-xs font-medium", row.danger ? "text-warning" : "text-success")}>{row.leader}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            At ₹4L (your own estimate), ops leads at 26. Dev only pulls ahead in the base case if the first offer is ₹8L+, which needs Exit ★1 (DSA done) plus a funded startup or product company — not an IT-services role. This is why the plan says apply at Exit A as a test, but expect ★1 to be where the real offers come.
          </p>
          <div className="rounded-lg border border-border/50 p-3 bg-surface-2/30">
            <p className="text-xs font-medium">Negotiation rules</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
              <li>• Never give a number first. Ask: <span className="text-foreground">"What is the budgeted range for this role?"</span></li>
              <li>• Compare fixed pay, not CTC. Variable and ESOPs are not spendable.</li>
              <li>• Use ops experience explicitly: <span className="text-foreground">"I have 2 years of professional experience and ship production code in ClientSync."</span></li>
              <li>• Get it in writing: base, variable, joining bonus, notice period, probation length.</li>
              <li>• ESOPs: value them at zero when comparing offers. Anything above is a bonus.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ── Exit schedule ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-accent" /> Exit schedule at your pace
          </CardTitle>
          <CardDescription>
            Cumulative hours to each exit, and how long that takes at your current weekly target ({weeklyHours}h/wk). Change the target above to update all months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Exit</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Level</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Hours</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Target date</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">25h/wk</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">30h/wk</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">40h/wk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(
                  [
                    { code: "A",   label: "Exit A",   level: "Junior Full-Stack",        salary: "₹6–10L"  },
                    { code: "B",   label: "Exit B",   level: "Junior-to-Mid",             salary: "₹8–12L"  },
                    { code: "★1",  label: "Exit ★1",  level: "Interview-ready (DSA)",     salary: "₹8–15L"  },
                    { code: "C",   label: "Exit C",   level: "Mid, production-grade",     salary: "₹12–18L" },
                    { code: "★2",  label: "Exit ★2",  level: "Mid-level",                 salary: "₹15–25L" },
                    { code: "D",   label: "Exit D",   level: "Mid-Senior, AI-capable",    salary: "₹20–30L" },
                    { code: "3",   label: "Exit 3",   level: "Senior",                    salary: "₹25–40L" },
                    { code: "E",   label: "Exit E",   level: "Complete profile",           salary: "₹35–50L" },
                  ] as const
                ).map((exit) => {
                  const hours = EXIT_HOURS_REQUIRED[exit.code];
                  const mo = (h: number) => `${(hours / (h * 4.33)).toFixed(1)} mo`;
                  const userWeekly = Number(weeklyHours) || 30;
                  const isUserPace = userWeekly === 25 || userWeekly === 30 || userWeekly === 40;
                  const targetDate = (() => {
                    if (!settings?.career_plan_start_date || userWeekly <= 0) return null;
                    const start = new Date(`${settings.career_plan_start_date}T00:00:00`);
                    const weeksNeeded = hours / userWeekly;
                    start.setDate(start.getDate() + Math.ceil(weeksNeeded * 7));
                    return start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  })();
                  return (
                    <tr key={exit.code} className="group">
                      <td className="py-2 pr-4 font-medium text-accent">{exit.label}</td>
                      <td className="py-2 pr-4 text-muted text-xs">{exit.level}</td>
                      <td className="py-2 pr-4 text-right font-mono-tabular">{hours.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right text-xs text-muted font-mono-tabular">{targetDate ?? "—"}</td>
                      <td className={cn("py-2 pr-4 text-right font-mono-tabular", !isUserPace && userWeekly === 25 ? "text-accent font-semibold" : "text-muted")}>{mo(25)}</td>
                      <td className={cn("py-2 pr-4 text-right font-mono-tabular", !isUserPace && userWeekly === 30 ? "text-accent font-semibold" : userWeekly === 30 ? "text-accent font-semibold" : "text-muted")}>{mo(30)}</td>
                      <td className={cn("py-2 text-right font-mono-tabular", userWeekly === 40 ? "text-accent font-semibold" : "text-muted")}>{mo(40)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted mt-4">
            At {weeklyHours}h/wk, Exit A is{" "}
            <span className="text-accent font-medium">{computeExitMonthsLabel("A", Number(weeklyHours) || 30)}</span> away and
            Exit ★1 is{" "}
            <span className="text-accent font-medium">{computeExitMonthsLabel("★1", Number(weeklyHours) || 30)}</span> away from today.
            Source: career_timeline_zte.docx §8.
          </p>
        </CardContent>
      </Card>

      {/* ── Career ladders: ops path and dev path ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Career ladders
          </CardTitle>
          <CardDescription>
            Step-by-step progression for each path with what you need to move up. CTC is the base case; low–high range in brackets. Ages 38+ are carried from the original timeline with no sourced data — treat as rough. Source: career_timeline_zte.docx §4 and §12.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold text-warning mb-2 uppercase tracking-wide">Pure Ops path</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Age</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Title</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">CTC (₹L)</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2">What moves you up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    { age: 24, title: "Biz Ops Associate", ctc: "4.6", what: "Reliable execution; get on cross-functional projects early" },
                    { age: 26, title: "Sr. Order Mgmt / Ops Exec", ctc: "7 (5.5–8.5)", what: "Own a process end to end; measurable improvement (cost, time, error rate)" },
                    { age: 28, title: "SC / Biz Ops Analyst", ctc: "11 (8–14)", what: "SQL, Excel, BI tools; a case with numbers you can quote" },
                    { age: 31, title: "Sr. SC Analyst / Asst. Manager", ctc: "18 (12.5–24)", what: "Lead projects across teams; start managing people or vendors" },
                    { age: 34, title: "Ops / SC Manager", ctc: "26 (17–36)", what: "People management; budget ownership; often needs MBA or strong internal sponsor" },
                    { age: "38*", title: "Senior Manager", ctc: "42–60*", what: "Run multiple teams; visibility to senior leadership" },
                    { age: "44*", title: "Director (Operations)", ctc: "70–100*", what: "Director seat opening at your company; rare in product startups" },
                  ] as const).map((row) => (
                    <tr key={row.age} className={String(row.age).includes("*") ? "opacity-60" : ""}>
                      <td className="py-2 pr-3 text-xs text-muted">{row.age}</td>
                      <td className="py-2 pr-3 text-xs">{row.title}</td>
                      <td className="py-2 pr-3 text-right font-mono-tabular text-xs">{row.ctc}</td>
                      <td className="py-2 text-xs text-muted">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-1">* Rows marked with asterisk have no sourced data — treat as directional only. MBA or a strong internal sponsor is the gate to director level.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-success mb-2 uppercase tracking-wide">Hybrid (Dev) path</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Age</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Title</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">CTC (₹L)</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2">What moves you up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    { age: 26, title: "Junior Full-Stack", ctc: "7 (4–12)", what: "ZTE Exit A/B: deployed ClientSync, green CI, Docker, API docs; DSA (Exit ★1) widens the pool" },
                    { age: 28, title: "Full-Stack Dev (1–2 yrs)", ctc: "11 (6.5–20)", what: "Own features end to end; ZTE Phases 09–11 (payments, monitoring, real-time)" },
                    { age: 31, title: "Senior Full-Stack", ctc: "17 (10.5–32)", what: "System design, mentoring, influence on product; ZTE Phases 12–17 (AI, infra, architecture)" },
                    { age: 34, title: "Senior / Tech Lead", ctc: "25 (15–45)", what: "Own a whole product surface; lead architecture or a small team; no MBA needed" },
                    { age: "38*", title: "Principal / Eng Manager", ctc: "70–120*", what: "High-leverage technical decisions, or manage 15–30 engineers" },
                    { age: "44*", title: "Director Eng / VP", ctc: "1.2–2Cr*", what: "Company-wide technical direction; needs leadership, not just technical skill" },
                  ] as const).map((row) => (
                    <tr key={row.age} className={String(row.age).includes("*") ? "opacity-60" : ""}>
                      <td className="py-2 pr-3 text-xs text-muted">{row.age}</td>
                      <td className="py-2 pr-3 text-xs">{row.title}</td>
                      <td className="py-2 pr-3 text-right font-mono-tabular text-xs">{row.ctc}</td>
                      <td className="py-2 text-xs text-muted">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-1">* No sourced data at ages 38+. Dev IC track to Staff does not require an MBA — this is the structural advantage over the ops path past Manager.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Two-path comparison ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Two-path salary comparison
          </CardTitle>
          <CardDescription>
            Pure Ops vs Hybrid (ops job + ZTE, switch when an offer beats ops pay). CTC in ₹ lakh/year.
            Low = IT-services / analyst track. Base = startup or analyst-to-manager. High = product company or GCC / fast manager track.
            Source: career_timeline_zte.docx §3 and §25.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Age / metric</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Ops low</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Ops base</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-6">Ops high</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Dev low</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-3">Dev base</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">Dev high</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(
                  [
                    { label: "Age 24 (now)", ops: [4.6, 4.6, 4.6], dev: [4.6, 4.6, 4.6] },
                    { label: "Age 26",       ops: [5.5, 7.0, 8.5],  dev: [4.0, 7.0, 12.0] },
                    { label: "Age 28",       ops: [8.0, 11.0, 14.0], dev: [6.5, 11.0, 20.0] },
                    { label: "Age 31",       ops: [12.5, 18.0, 24.0], dev: [10.5, 17.0, 32.0] },
                    { label: "Age 34",       ops: [17.0, 26.0, 36.0], dev: [15.0, 25.0, 45.0] },
                  ] as const
                ).map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-4 text-xs text-muted">{row.label}</td>
                    {row.ops.map((v, i) => <td key={i} className="py-2 pr-3 text-right font-mono-tabular text-xs">{v}</td>)}
                    <td className="pr-3" />
                    {row.dev.map((v, i) => <td key={i} className={cn("py-2 pr-3 text-right font-mono-tabular text-xs", i === 2 ? "text-success font-semibold" : "")}>{v}</td>)}
                  </tr>
                ))}
                <tr className="border-t-2 border-border/70 font-semibold">
                  <td className="py-2 pr-4 text-xs">10yr total (₹L, ages 24–34)</td>
                  <td className="py-2 pr-3 text-right font-mono-tabular text-xs">109</td>
                  <td className="py-2 pr-3 text-right font-mono-tabular text-xs">154</td>
                  <td className="py-2 pr-3 text-right font-mono-tabular text-xs">203</td>
                  <td className="pr-3" />
                  <td className="py-2 pr-3 text-right font-mono-tabular text-xs">93</td>
                  <td className="py-2 pr-3 text-right font-mono-tabular text-xs">149</td>
                  <td className="py-2 text-right font-mono-tabular text-xs text-success">267</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] uppercase text-muted">Base cases</p>
              <p className="text-sm font-semibold mt-1">Tie</p>
              <p className="text-xs text-muted mt-1">Ops ₹154L vs Dev ₹149L over 10 years. Within margin of uncertainty.</p>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-3">
              <p className="text-[10px] uppercase text-muted">Dev high case edge</p>
              <p className="text-sm font-semibold mt-1 text-success">+₹64L</p>
              <p className="text-xs text-muted mt-1">Product company or GCC after Exit ★1. The entire case for hybrid.</p>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] uppercase text-muted">Dev downside</p>
              <p className="text-sm font-semibold mt-1">−₹17L</p>
              <p className="text-xs text-muted mt-1">IT-services or agency (low case). You still keep your ops job until an offer beats it.</p>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            The base cases tie. Dev's edge is the high case only (+₹64L over 10 yrs). Hybrid's floor is ops income — you switch only when a dev offer beats your ops pay, so the worst case is lost study time, not lost income.
          </p>
        </CardContent>
      </Card>

      {/* ── Sensitivity table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Scenario sensitivity: when does hybrid beat ops?
          </CardTitle>
          <CardDescription>
            How the hybrid expected value changes as you vary your belief in the dev high case (product company or GCC offer after Exit ★1). Source: career_timeline_zte.docx §25.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] uppercase text-muted">Ops expected total</p>
              <p className="text-2xl font-semibold mt-1">₹155.3L</p>
              <p className="text-xs text-muted mt-1">25% low + 50% base + 25% high. Ten years, ages 24–34.</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="text-[10px] uppercase text-muted">Hybrid expected total</p>
              <p className="text-2xl font-semibold mt-1">₹174.9L</p>
              <p className="text-xs text-muted mt-1">40% stay-in-ops + 40% dev-base + 20% dev-high. Edge: +₹19.6L (~₹2L/year).</p>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-[10px] uppercase text-muted">Breakeven point</p>
              <p className="text-2xl font-semibold mt-1 text-success">~3%</p>
              <p className="text-xs text-muted mt-1">Hybrid beats ops in expected value once P(dev high) &gt; ~3%. That is a very low bar — the case for hybrid is asymmetry, not average pay.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <p className="text-xs font-medium mb-2">Hybrid expected total as P(dev high) varies</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">P(dev high case)</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">P(stay in ops)</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Hybrid EV (₹L)</th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">vs ops (₹155.3L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {([
                  { pHigh: "0%",  pOps: "60%", ev: 152, delta: -3,  breakeven: false },
                  { pHigh: "5%",  pOps: "55%", ev: 158, delta: +3,  breakeven: true  },
                  { pHigh: "10%", pOps: "50%", ev: 164, delta: +8,  breakeven: false },
                  { pHigh: "20%", pOps: "40%", ev: 175, delta: +20, breakeven: false },
                  { pHigh: "30%", pOps: "30%", ev: 186, delta: +31, breakeven: false },
                ] as const).map((row) => (
                  <tr key={row.pHigh} className={cn(row.breakeven && "bg-accent/5")}>
                    <td className="py-2 pr-4 text-xs font-medium">{row.pHigh}{row.breakeven && <Badge variant="accent" className="ml-2 text-[10px]">≈ breakeven</Badge>}</td>
                    <td className="py-2 pr-4 text-xs text-muted">{row.pOps}</td>
                    <td className="py-2 pr-4 text-right font-mono-tabular text-xs">₹{row.ev}L</td>
                    <td className={cn("py-2 text-right font-mono-tabular text-xs font-semibold", row.delta >= 0 ? "text-success" : "text-warning")}>
                      {row.delta >= 0 ? "+" : ""}₹{row.delta}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border/50 p-3 bg-surface-2/30">
            <p className="text-xs font-medium mb-1">What the model leaves out</p>
            <p className="text-xs text-muted">Cost of study time, tax (pay up to ~₹12.75L is effectively tax-free under new regime), ESOPs and variable pay, MBA or MCA fees, and the pivot options (§26–28) which could improve either path. At 10% P(high), the edge is ~₹8L over ten years — under ₹1L/year. A GCC or FAANG offer often filters BCA, so 10% may be generous. The stronger argument for hybrid is <span className="text-foreground font-medium">asymmetry and cheap information</span>, not average pay — by Exit A you'll know if you can sustain 30h/wk and if you like the work.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Pivot ranking ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-accent" /> Career pivot ranking
          </CardTitle>
          <CardDescription>
            Ranked by pay-to-barrier ratio for your specific situation. Ops pivots (O1–O6) build on your current domain knowledge; dev pivots (D1–D5) build on ZTE skills. Source: career_timeline_zte.docx §26–28.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {([
              { rank: 1,  code: "O1→O2", path: "Ops",    title: "Supply-chain analytics → Business systems / ERP",        midPay: "₹8–22L",          barrier: "Low",         why: "Lowest barrier; best use of current domain knowledge. Builds on ZTE Phase 01 SQL. Reachable from inside Applied Materials. First step: automate one recurring report with SQL and a dashboard." },
              { rank: 2,  code: "D1",    path: "Dev",    title: "DevOps / SRE / Platform engineering",                    midPay: "₹12–28L (2–4 yr)", barrier: "Medium",      why: "Best pay-to-barrier on the dev side. Natural after ZTE Phases 06 and 16. Cloud certs (AWS DevOps Pro, CKA) add 20–35% to offers. First step: ship ClientSync through a real pipeline, write up one failure incident-style." },
              { rank: 3,  code: "D4",    path: "Dev→PM", title: "Technical product management",                            midPay: "₹28L (2–5 yr)",   barrier: "High",        why: "Top pay bands after 2–3 years as a dev, using your ops context as a differentiator. Engineer-to-PM inside one company is the most realistic route. Needs 3–5 years of dev first." },
              { rank: 4,  code: "D2",    path: "Dev",    title: "AI / GenAI application engineering",                     midPay: "₹12–30L",         barrier: "Medium-High", why: "High headline pay but many roles filter by degree at GCCs. ZTE Phase 12 (207h) is the entry point. Add one RAG feature to ClientSync after Phase 12. Treat as an option after Exit D, not the plan." },
              { rank: 5,  code: "D3",    path: "Dev",    title: "Data engineering",                                        midPay: "₹8.8–9.8L avg",   barrier: "Medium",      why: "Good ceiling (₹80L+ at GCCs) with a real skills gap outside ZTE. SQL (Phase 01) and PostgreSQL (Phase 11) help; Spark and orchestration are outside ZTE. Best if you land in supply-chain analytics first." },
              { rank: 6,  code: "O3",    path: "Ops→PM", title: "Product management (ops-heavy and B2B)",                 midPay: "₹22–42L (2–5 yr)", barrier: "High",       why: "Highest ceiling on the ops side. APM programs accept 1–3%. Realistic as a 4–6 year target, not a first move. First step: write one product-style proposal for an internal ops problem." },
              { rank: 7,  code: "D5",    path: "Dev",    title: "Senior IC track (backend depth → Staff engineer)",        midPay: "₹16–28L (senior)", barrier: "Medium",     why: "The default dev ladder, not a pivot. Depth in backend, data modelling and system design is what lifts pay from base to high case. ZTE Phases 05, 11, and 17 are the accelerators." },
              { rank: 8,  code: "O4",    path: "Ops",    title: "Procurement and strategic sourcing",                     midPay: "₹10–18L",         barrier: "Low",         why: "Close to order and supply operations. Safe move with a lower ceiling than O1–O3. Supply-chain certificate helps." },
              { rank: 9,  code: "O6",    path: "Ops",    title: "Stay in ops and grow into management (baseline)",        midPay: "₹12–22L",         barrier: "Medium",      why: "The comparison baseline. ₹25–45L for managers at 7+ years is competitive with the mid-level dev base case. Needs people management and often an MBA or strong sponsor past Manager." },
              { rank: 10, code: "O5",    path: "Both",   title: "Technical program management (mid-career target)",       midPay: "₹50.9L median",   barrier: "High",        why: "Not an entry role; expect it after 5+ years through a business-systems or automation role first. Ops delivery experience counts; ZTE Phases 01–07 add technical credibility." },
              { rank: 11, code: "O2↑",   path: "Ops→IT", title: "SAP / ERP consultant (Oracle, SAP supply chain)",        midPay: "₹10–22L",         barrier: "Medium",      why: "Vendor certification (SAP or Oracle) is the gate. Pay data rests on one weak source. Ties you to a vendor stack. Low confidence rating." },
            ] as const).map((pivot) => (
              <div key={pivot.code} className="flex gap-3 rounded-lg border border-border/50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
                  {pivot.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{pivot.title}</p>
                    <Badge variant="outline" className="text-[10px]">{pivot.code}</Badge>
                    <Badge variant={pivot.barrier === "Low" ? "success" : pivot.barrier === "Medium" ? "warning" : "danger"} className="text-[10px]">
                      {pivot.barrier} barrier
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted">{pivot.path}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">{pivot.why}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted">Mid-level</p>
                  <p className="text-sm font-mono-tabular text-accent">{pivot.midPay}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Senior-level ceiling table */}
          <div className="mt-4">
            <p className="text-xs font-medium mb-2">Senior-level pay ceiling (7+ years) by pivot</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Pivot</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Senior pay (7+ yr)</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    { pivot: "Product manager",         pay: "₹40–70L (5–8 yr); Group PM ₹65L–1.2Cr", source: "Instahyre, May 2026" },
                    { pivot: "AI / GenAI engineer",     pay: "₹25–50L (EICTA); ₹30–70L (Second Talent)", source: "EICTA, Second Talent" },
                    { pivot: "Data engineer",           pay: "Up to ₹80L+ at product and GCC",           source: "Futurense, Aug 2026" },
                    { pivot: "DevOps / SRE / Platform", pay: "₹25–55L; Staff up to ₹1.5–1.8Cr",         source: "Second Talent, Instahyre" },
                    { pivot: "Technical PM",            pay: "₹47L (5–8 yr), ₹68L (8+)",                 source: "Recrew, 2026" },
                    { pivot: "Ops manager",             pay: "₹22–45L",                                  source: "EICTA, Apr 2026" },
                    { pivot: "Senior full-stack / lead",pay: "₹16–28L; leads ₹28–50L+",                  source: "Codegnan, Jul 2026" },
                    { pivot: "Technical program mgmt",  pay: "P75 ₹74L; P90 ₹101L",                      source: "Levels.fyi, Jul 2026" },
                  ] as const).map((row) => (
                    <tr key={row.pivot}>
                      <td className="py-2 pr-4 text-xs font-medium">{row.pivot}</td>
                      <td className="py-2 pr-4 text-right font-mono-tabular text-xs text-accent">{row.pay}</td>
                      <td className="py-2 text-xs text-muted">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-muted mt-2">
            Third strategy — hybrid-pivot: use ZTE Phases 01 and 05–07 (SQL, backend, testing, APIs) to move into an analytics or business-systems role at or near Applied Materials. Lowers the risk of hybrid because you don't need a pure dev offer. Pay trajectory not modelled; treat it as a fourth path between ops and hybrid.</p>
        </CardContent>
      </Card>

      {/* ── Hybrid-pivot: the third strategy ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Third strategy: hybrid-pivot
          </CardTitle>
          <CardDescription>
            Not ops. Not dev. Use ZTE SQL and backend skills to move into an analytics or systems role at or near Applied Materials — then grow from there. Source: career_timeline_zte.docx §17 and §28.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] uppercase text-muted">What it is</p>
              <p className="text-xs mt-1">Use ZTE Phases 01 (SQL), 03 (APIs), 05 (DB schema), 07 (testing) to qualify for an internal analytics or systems analyst role. No dev offer needed. No ops plateau either.</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-[10px] uppercase text-muted">Why it matters</p>
              <p className="text-xs mt-1">Lowers the risk of hybrid: the floor is not "lost study time" — it's a salary step-up inside or near your current employer, reachable by Phase 05 (month 4–5).</p>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] uppercase text-muted">What it doesn't do</p>
              <p className="text-xs mt-1">Doesn't model the salary trajectory (not included in the scenario table). Treat it as a hedge, not the plan. If the IT Systems Analyst role opens up, take it — it doesn't close the dev path.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Execution steps</p>
            {([
              { step: "Phase 01 (month 1–2)", action: "Automate one recurring report using SQL. Show your manager. Frame it as a process improvement, not a career signal." },
              { step: "Phase 03–05 (month 3–5)", action: "Build Ledger (personal finance tracker with PostgreSQL + REST API). This is your portfolio proof for an analyst or systems role." },
              { step: "Month 3", action: "Ask your manager which internal teams hire ex-ops with SQL skills. Get a name. Ask to shadow one meeting." },
              { step: "Month 6", action: "Apply to IT Systems Analyst, QA Automation, or SCM Data Analyst roles — internally first, then externally. Continue ZTE in parallel." },
              { step: "If offer arrives", action: "Take it if the pay beats current ops pay. You're still building ClientSync. The roles above are stepping stones to DevOps or platform engineering, not dead ends." },
            ] as const).map((r) => (
              <div key={r.step} className="flex gap-3 rounded-lg border border-border/50 p-3">
                <span className="text-xs font-medium text-accent shrink-0 w-36">{r.step}</span>
                <p className="text-xs text-muted">{r.action}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            Pay trajectory: supply-chain analytics mid-level ₹8–16L, business systems ₹10–22L, SAP/ERP ₹10–22L (low-confidence source). This path feeds naturally into DevOps or data engineering after 2–3 years — see pivot O1→O2 and D3 in the pivot ranking above.
          </p>
        </CardContent>
      </Card>

      {/* ── 90-day plan ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" /> 90-day execution plan
          </CardTitle>
          <CardDescription>
            Week-by-week breakdown for the first 13 weeks. After week 13, the roadmap and daily plan take over. Source: career_timeline_zte.docx §31.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {([
            { weeks: "1–2",  hours: "30h/wk", phase: "Phase 01", deliverable: "Dev environment working: VS Code, Node, Git, npm, terminal. First CLI script that reads a file and outputs a result. Commit it.", note: "If you can't do 30h in week 1, log what you actually did and set the real weekly target from that." },
            { weeks: "3–4",  hours: "30h/wk", phase: "Phase 01", deliverable: "JavaScript fundamentals done (functions, arrays, objects, async/await). Smallest possible to-do app without a tutorial — blank file only.", note: null },
            { weeks: "5–6",  hours: "30h/wk", phase: "Phase 01b", deliverable: "TypeScript basics. Rewrite the to-do app in TypeScript. One file, proper types, no any.", note: "Week 6 is lighter week 1. Review and consolidate — no new material." },
            { weeks: "7–8",  hours: "30h/wk", phase: "Phase 02", deliverable: "React fundamentals. CivicBoard started: issue list, add-issue form, basic routing with Next.js App Router.", note: null },
            { weeks: "9–10", hours: "30h/wk", phase: "Phase 02", deliverable: "CivicBoard live: deployed to Vercel, SQLite persistence, auth with NextAuth. README with screenshot. First deployed project.", note: null },
            { weeks: "11–12", hours: "30h/wk", phase: "Phase 03 start", deliverable: "REST API fundamentals. Build a simple API (Atlas note-taking tool) with Express, GET/POST/PUT/DELETE routes, manual testing with Postman or curl.", note: "Week 12 is lighter week 2. Re-solve 3 problems from earlier. Review TypeScript types you found confusing." },
            { weeks: "13",   hours: "30h/wk", phase: "Phase 03", deliverable: "Day-90 gate: 390h logged (minimum 270h), CivicBoard live and working, React basics solid, API concepts understood. Two-week hours audit completed and real weekly target set.", note: "Month 3 kill-criteria checkpoint. If below 270h, assess: is it time or interest? Fix the cause." },
          ] as const).map((row) => (
            <div key={row.weeks} className="rounded-lg border border-border/50 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-accent">Weeks {row.weeks}</span>
                <Badge variant="outline" className="text-[10px]">{row.phase}</Badge>
                <span className="text-[10px] text-muted">{row.hours}</span>
              </div>
              <p className="text-xs">{row.deliverable}</p>
              {row.note && <p className="text-[11px] text-warning mt-1.5">{row.note}</p>}
            </div>
          ))}
          <p className="text-[11px] text-muted mt-1">
            After week 13: the roadmap page drives the plan. Daily plan page shows the next topic. Monthly review tracks the quarterly checkpoints. The 90-day plan's job is to get you to a consistent habit — the roadmap does the rest.
          </p>
        </CardContent>
      </Card>

      {/* ── Financial planning: full picture ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-warning" /> Financial planning: the full picture
          </CardTitle>
          <CardDescription>Everything that affects the switch decision beyond the salary numbers. Source: career_timeline_zte.docx §19 and §20.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
              <p className="text-xs font-semibold text-danger mb-1">Three rules — never break these</p>
              <ul className="text-xs text-muted flex flex-col gap-1">
                <li>1. Apply while employed. Resign only when you hold a signed offer that beats ops pay.</li>
                <li>2. Build 6 months of expenses as a buffer before resigning — not before applying, before resigning.</li>
                <li>3. Emergency fund order: (1) fund 6 months → (2) health cover → (3) invest. The switch is the priority use of the surplus.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs font-semibold mb-1">Notice period timing</p>
              <p className="text-xs text-muted">Check your Applied Materials offer letter for: notice period, any buyout clause, service bond, joining-bonus clawback. If notice is 90 days, start applying 3+ months before your target resign date, not 1.</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">In-hand take-home by CTC (new tax regime, FY 2026-27)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">CTC</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Tax (new regime)</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">Approx in-hand/month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    { ctc: "₹4.6L (now)", tax: "Nil",                   inhand: "~₹28,000" },
                    { ctc: "₹8L",          tax: "Nil",                   inhand: "~₹55–60,000" },
                    { ctc: "₹12L",         tax: "Nil",                   inhand: "~₹80–85,000" },
                    { ctc: "₹15L",         tax: "~₹1.55L (incl. cess)", inhand: "~₹90–95,000" },
                    { ctc: "₹25L",         tax: "~₹4.5–5L",             inhand: "~₹1.4–1.5L" },
                  ] as const).map((row) => (
                    <tr key={row.ctc}>
                      <td className="py-2 pr-4 text-xs font-medium">{row.ctc}</td>
                      <td className="py-2 pr-4 text-xs text-success">{row.tax}</td>
                      <td className="py-2 text-right font-mono-tabular text-xs text-accent">{row.inhand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-2">₹12.75L gross is effectively tax-free under the new regime (₹12L nil-tax slab + ₹75K standard deduction). ZTE Exits A to B land fully in this zone. CTC includes variable and stock — ask for the fixed/variable split before comparing offers. ESOPs: value at ₹0.</p>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">Bangalore cost of living note</p>
            <p className="text-xs text-muted">Bangalore pays a 15–20% premium over other cities but has higher rent and commute costs. A ₹40L Hyderabad offer can beat a ₹45L Bangalore one after rent and commute. Remote roles decouple pay from city rent — worth factoring for any remote-first offer.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Company type comparison ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-accent" /> Company type comparison
          </CardTitle>
          <CardDescription>Which company type to target at which exit. BCA filter varies significantly. Source: career_timeline_zte.docx §19.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Type</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Upside</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Downside</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2">Fit for you</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {([
                  { type: "Startup (seed–Series B)", up: "Fast learning, no degree filter, ESOP upside", down: "Instability, uneven pay, long hours", fit: "Good at Exit A/B — BCA-friendly, referral-accessible" },
                  { type: "Product company", up: "Best pay and growth, strong engineering culture", down: "Harder interviews, often want DSA and system design", fit: "Target at Exit ★1 and above" },
                  { type: "Service company (TCS etc.)", up: "Stability, easy entry", down: "₹3.5–5L, BCA filter at campus level, slow growth", fit: "Only as a fallback — keep studying to the next exit" },
                  { type: "GCC (global capability centre)", up: "Rising pay, stability, global exposure", down: "Often wants CS degree or campus; late-career filter", fit: "Hard without B.Tech; try at Exit 3 or later, or via referral" },
                ] as const).map((row) => (
                  <tr key={row.type}>
                    <td className="py-2 pr-4 text-xs font-medium">{row.type}</td>
                    <td className="py-2 pr-4 text-xs text-success">{row.up}</td>
                    <td className="py-2 pr-4 text-xs text-warning">{row.down}</td>
                    <td className="py-2 text-xs text-muted">{row.fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Weekly rhythm + 20h floor + what changes the advice ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-accent" /> Weekly rhythm and when to stop
          </CardTitle>
          <CardDescription>Sustainable study patterns and the conditions that change the advice. Source: career_timeline_zte.docx §16, §20, §6.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium mb-2">Weekly rhythm templates (weekday + weekend split)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Pattern</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Weekday</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">Weekend (each day)</th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    { pattern: "25h/wk (minimum floor)", weekday: "2h × 5 = 10h", weekend: "7.5h × 2 = 15h", total: "25h" },
                    { pattern: "30h/wk (plan target)", weekday: "2.5h × 5 = 12.5h", weekend: "8.75h × 2 = 17.5h", total: "30h", highlight: true },
                    { pattern: "40h/wk (sprint, not baseline)", weekday: "3h × 5 = 15h", weekend: "12.5h × 2 = 25h", total: "40h" },
                  ] as const).map((row) => (
                    <tr key={row.pattern} className={"highlight" in row && row.highlight ? "bg-accent/5" : ""}>
                      <td className="py-2 pr-4 text-xs font-medium">{row.pattern}</td>
                      <td className="py-2 pr-4 text-right text-xs text-muted font-mono-tabular">{row.weekday}</td>
                      <td className="py-2 pr-4 text-right text-xs text-muted font-mono-tabular">{row.weekend}</td>
                      <td className="py-2 text-right text-xs font-mono-tabular text-accent">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-2">20h/wk is the absolute floor. Below that the plan drifts past the ops catch-up point — Exit A slips from month 9.5 to month 15+. Do the 2-week hours audit first: log every free block of 45+ minutes for 14 days, then set your target from what is real, not hoped-for. 40h alongside a job leads to burnout within months — treat it as a sprint, not a baseline.</p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="text-xs font-semibold text-warning mb-2">What would change the advice</p>
            <ul className="text-xs text-muted flex flex-col gap-1.5">
              <li>• <span className="text-foreground">Can't sustain 25–30h/week alongside the job</span> → ops with an MBA or a systems/analytics pivot is equally sound. No shame in this — it is the honest signal.</li>
              <li>• <span className="text-foreground">Dislike coding by the end of Phase 03</span> → stop. Three phases is enough data. The plan has no value if the work itself is the problem.</li>
              <li>• <span className="text-foreground">CS degree filter looks insurmountable</span> → GCCs and FAANG India often filter BCA at the ATS stage. If the high case (product company / GCC) looks unrealistic, the expected gain vs ops shrinks and an MCA or MBA starts making more sense. See the MBA/MCA card below.</li>
              <li>• <span className="text-foreground">Ops promotion arrives mid-plan</span> → compare the new ops pay against the dev low case. Don't decline an ops raise to keep the plan. Pause and re-decide at the next checkpoint.</li>
              <li>• <span className="text-foreground">Market bad at Exit A</span> → widen to QA/automation, systems analyst, or implementation roles. These are not dead ends — they are closer to dev than ops and keep the path open. Keep studying to Exit ★1 in parallel.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ── MBA vs MCA ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-accent" /> Third path: MBA or MCA
          </CardTitle>
          <CardDescription>
            If hybrid stalls (can't do 25h/wk, dislike coding by Phase 3, degree filter is a hard block), ops + MBA or ops + MCA is an equally sound alternative. Source: career_timeline_zte.docx §23.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-6 w-1/3"></th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2 pr-4">MBA</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted pb-2">MCA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {([
                  { label: "Cost", mba: "₹10–30L (top schools ₹15–30L)", mca: "Govt ₹30K–1L; private up to ₹8L; typical ₹50K–5L" },
                  { label: "Duration", mba: "2 years; part-time / online options", mca: "2 years; IGNOU/BITS Workex part-time options" },
                  { label: "Fresher salary", mba: "₹6–12L average; ₹20–25L at IIMs/ISB", mca: "₹3–8L; some product offers up to ₹15L" },
                  { label: "Mid-career", mba: "₹12–30L", mca: "₹8–20L" },
                  { label: "Removes", mba: "The management ceiling in ops (MBA = director-level odds)", mca: "BCA filter at FAANG India, IT services, PSUs" },
                  { label: "Best if", mba: "You choose ops and want director-level odds without internal sponsor", mca: "You choose dev and want big-tech or GCC options later" },
                  { label: "Decide when", mba: "Month 18 checkpoint (ops branch)", mca: "After Exit ★1, if FAANG/GCC is a goal" },
                ] as const).map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-6 text-xs font-medium text-muted">{row.label}</td>
                    <td className="py-2 pr-4 text-xs">{row.mba}</td>
                    <td className="py-2 text-xs">{row.mca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            MCA fresher pay overlaps general junior-dev pay (₹3–8L). The degree doesn't obviously raise the first offer — it mostly removes a filter. MBA cost is high relative to the ops ceiling: a mid-tier MBA at ₹8–15L while earning ₹4.6L is a big bet. Compare it against staying in ops and reaching ~₹18L by 31 in the base case. MCA is the cheaper hedge. Decide at the relevant checkpoint, not now.
          </p>
          <p className="text-[11px] text-muted">Note: most salary sources for MBA and MCA are college or edtech marketing pages — treat as directional, not precise.</p>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> Role readiness</CardTitle><CardDescription>Same explainable readiness breakdown as Job Readiness, surfaced here so the career plan has a market-facing signal.</CardDescription></CardHeader><CardContent>{roleReadiness ? <div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={roleReadiness.overallPct >= 75 ? "success" : roleReadiness.overallPct >= 45 ? "warning" : "outline"}>{roleReadiness.overallPct}% ready</Badge><span className="text-sm text-muted">{roleReadiness.roleName}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">{roleReadiness.pillars.map((pillar) => <div key={pillar.key} className="rounded-lg border border-border/50 p-2"><p className="text-[10px] text-muted truncate">{pillar.label}</p><p className="text-sm font-semibold mt-1">{pillar.score === null ? "—" : `${pillar.score}%`}</p></div>)}</div><Link href="/job-readiness" className="text-sm text-accent hover:underline">Open full role breakdown <ArrowRight className="inline h-3.5 w-3.5" /></Link></div> : <p className="text-sm text-muted">Choose a target role in Job Readiness to see the explainable score here.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> Financial runway</CardTitle><CardDescription>Use this to decide when a career switch is financially safe—not to predict an offer.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div className="space-y-1"><Label htmlFor="income">Monthly income</Label><Input id="income" type="number" min={0} value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="expenses">Monthly expenses</Label><Input id="expenses" type="number" min={0} value={monthlyExpenses} onChange={(event) => setMonthlyExpenses(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="savings">Savings</Label><Input id="savings" type="number" min={0} value={savings} onChange={(event) => setSavings(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="emergency">Safety months</Label><Input id="emergency" type="number" min={0} max={36} step={0.5} value={emergencyMonths} onChange={(event) => setEmergencyMonths(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="switch-salary">Minimum switch salary</Label><Input id="switch-salary" type="number" min={0} value={minimumSwitchSalary} onChange={(event) => setMinimumSwitchSalary(event.target.value)} /></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-lg border border-border/50 p-3"><p className="text-[10px] uppercase text-muted">Runway</p><p className="text-xl font-semibold mt-1">{runwayMonths > 0 ? `${runwayMonths.toFixed(1)} mo` : "—"}</p><p className="text-xs text-muted">at current expenses</p></div><div className="rounded-lg border border-border/50 p-3"><p className="text-[10px] uppercase text-muted">Safety target</p><p className="text-xl font-semibold mt-1">{runwayExpenses > 0 ? formatRupees(targetSavings) : "—"}</p><p className="text-xs text-muted">{emergencyMonths || 0} months saved</p></div><div className={cn("rounded-lg border p-3", runwayReady ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5")}><p className="text-[10px] uppercase text-muted">Switch readiness</p><p className="text-xl font-semibold mt-1">{runwayReady ? "Ready" : "Build buffer"}</p><p className="text-xs text-muted">keep Plan A until evidence + runway align</p></div></div><Button onClick={saveRunway} disabled={saving === "runway"}><Save className="h-4 w-4" />{saving === "runway" ? "Saving…" : "Save runway plan"}</Button></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-accent" /> Pace simulator</CardTitle><CardDescription>Use the live remaining roadmap hours to compare sustainable weekly targets. This is a projection, not a promise.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{paceOptions.map((option) => <div key={option.hours} className={cn("rounded-lg border p-3", option.hours === Number(weeklyHours) && "border-accent/50 bg-accent/5")}><p className="text-xs text-muted">{option.hours}h / week</p><p className="text-xl font-semibold mt-1">{option.months > 0 ? `${option.months} mo` : "Complete"}</p><p className="text-[11px] text-muted">remaining roadmap</p></div>)}</div><div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted"><Link href="/job-readiness" className="text-accent hover:underline">Check role readiness <ArrowRight className="inline h-3.5 w-3.5" /></Link><span>Current target: {weeklyHours}h/week</span></div></CardContent></Card>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Clock: {formatPlanDate(snapshot.startDate)} → {formatPlanDate(snapshot.deadlineDate)}</span><span className="inline-flex items-center gap-1"><Rocket className="h-3.5 w-3.5" />Flagship: {flagshipProject || FULL_PLAN.flagshipProject}</span><Link href="/execution" className="inline-flex items-center gap-1 text-accent hover:underline"><CalendarClock className="h-3.5 w-3.5" />Open Execution OS <ArrowRight className="h-3.5 w-3.5" /></Link><Link href="/career" className="inline-flex items-center gap-1 text-accent hover:underline">Open Career Tracker <ArrowRight className="h-3.5 w-3.5" /></Link></div>
    </div>
  );
}

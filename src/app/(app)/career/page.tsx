"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useCareerTracker,
  useApplicationMetrics,
  useApplicationMetricsByPlan,
  upsertCareerEntry,
  deleteCareerEntry,
  APPLICATION_STATUSES,
} from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Briefcase, TrendingUp, CircleCheckBig, Link as LinkIcon, MapPin, IndianRupee, Info } from "lucide-react";
import type { ApplicationStatus, CareerTrackerRow } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getStaleApplications } from "@/lib/plan-position";
import { StaggerContainer, StaggerItem, FadeUp } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";

const STATUS_VARIANT: Record<ApplicationStatus, "default" | "warning" | "success" | "danger" | "accent" | "outline"> = {
  wishlist: "outline",
  applied: "default",
  screening: "warning",
  interviewing: "accent",
  offer: "success",
  rejected: "danger",
  withdrawn: "outline",
};

export default function CareerTrackerPage() {
  const { user } = useUser();
  const { data: entries, mutate, isLoading } = useCareerTracker(user?.id);
  const staleApplications = useMemo(() => getStaleApplications(entries ?? []), [entries]);
  const { data: metrics } = useApplicationMetrics(user?.id);
  const { data: planMetrics } = useApplicationMetricsByPlan(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CareerTrackerRow> | null>(null);
  const [originalEntry, setOriginalEntry] = useState<CareerTrackerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");

  function openNew() {
    setEditing({ company: "", application_status: "wishlist", offer: false, tech_stack: [] });
    setOriginalEntry(null);
    setTechInput("");
    setDialogOpen(true);
  }

  function openEdit(entry: CareerTrackerRow) {
    setEditing(entry);
    setOriginalEntry(entry);
    setTechInput((entry.tech_stack ?? []).join(", "));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!user || !editing?.company?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const tech_stack = techInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await upsertCareerEntry(
        user.id,
        { ...editing, tech_stack } as CareerTrackerRow & { company: string },
        originalEntry ?? undefined
      );
      await mutate();
      setDialogOpen(false);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: CareerTrackerRow) {
    if (!user) return;
    try {
      await deleteCareerEntry(user.id, entry);
      await mutate();
      setDialogOpen(false);
    } catch {
      toast.error("Couldn't delete.");
    }
  }

  const counts = APPLICATION_STATUSES.map((s) => ({
    ...s,
    count: (entries ?? []).filter((e) => e.application_status === s.value).length,
  }));

  const activeCount = (entries ?? []).filter((e) =>
    ["applied", "screening", "interviewing"].includes(e.application_status)
  ).length;
  const offerCount = (entries ?? []).filter((e) => e.offer).length;
  const totalCount = (entries ?? []).length;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Career Tracker</h1>
          <p className="text-sm text-muted mt-1">Applications, interviews, offers — one source of truth.</p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="h-4 w-4" /> Add application
        </Button>
      </div>
      </FadeUp>

      {staleApplications.length > 0 && (
        <FadeUp>
          <div className="rounded-card border border-warning/30 bg-warning/5 p-3 flex flex-col gap-1.5">
            <p className="text-xs font-medium text-warning">
              {staleApplications.length} application{staleApplications.length === 1 ? "" : "s"} with no update in 10+ days
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {staleApplications.slice(0, 5).map((a) => (
                <span key={a.id}>
                  {a.company}
                  {a.role ? ` — ${a.role}` : ""} ({a.daysSinceApplied}d)
                </span>
              ))}
              {staleApplications.length > 5 && <span>+{staleApplications.length - 5} more</span>}
            </div>
          </div>
        </FadeUp>
      )}

      <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glow-card">
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Total applications</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={totalCount} /></p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Active pipeline</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={activeCount} /></p>
          </CardContent>
        </Card>
        <Card className={cn("glow-card", offerCount > 0 && "border-success/30")}>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                <CircleCheckBig className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Offers</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={offerCount} /></p>
          </CardContent>
        </Card>
      </div>
      </StaggerItem>

      <StaggerItem>
      {/* Response/interview/offer/rejection rates — computed live in the DB
          from career_tracker rows (application_metrics view), never a
          hardcoded/cached number. Only shown once there's at least one
          non-wishlist application, since a 0% rate on zero data is noise. */}
      {metrics && metrics.total_applications - counts.find((c) => c.value === "wishlist")!.count > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RateStat label="Response rate" value={metrics.response_rate_pct} />
          <RateStat label="Interview rate" value={metrics.interview_rate_pct} />
          <RateStat label="Offer rate" value={metrics.offer_rate_pct} />
          <RateStat label="Rejection rate" value={metrics.rejection_rate_pct} />
        </div>
      )}
      </StaggerItem>

      {/* ── Search conversion benchmarks ── */}
      <StaggerItem>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" /> Search conversion benchmarks
            </CardTitle>
            <CardDescription>
              Industry figures for career switchers. Use to plan weekly application volume, not to judge your own rates until you have 20+ applications. Source: career_timeline_zte.docx §18.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: "Cold apply → interview", value: "~3%", sub: "≈42 apps per interview", accent: false },
                { label: "Tailored vs generic resume", value: "5.75% vs 2.68%", sub: "Tailor every application", accent: true },
                { label: "Referral → interview", value: "40–65%", sub: "vs 3% cold — 4–18× higher", accent: true },
                { label: "Normal career-switcher volume", value: "200–400", sub: "tailored applications total", accent: false },
              ] as const).map((stat) => (
                <div key={stat.label} className={cn("rounded-lg border p-3", stat.accent ? "border-accent/30 bg-accent/5" : "border-border/50")}>
                  <p className="text-[10px] uppercase text-muted">{stat.label}</p>
                  <p className="text-lg font-semibold font-mono-tabular mt-1">{stat.value}</p>
                  <p className="text-[11px] text-muted mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs font-medium mb-1">What this means for your plan</p>
                <ul className="text-xs text-muted flex flex-col gap-1">
                  <li>• At ~3%: need 30–40 well-tailored applications per interview. Plan 200+ across the full search.</li>
                  <li>• Referrals are the best-supported lever — one strong voucher is worth ~15 cold applications.</li>
                  <li>• A vague referral from a distant contact converts little better than cold. Quality of the vouch matters.</li>
                  <li>• Search alone takes 3–6 months after Exit A/★1. Budget time, not just applications.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs font-medium mb-1">Referral plan (10 names, refresh quarterly)</p>
                <ul className="text-xs text-muted flex flex-col gap-1">
                  <li>• Applied Materials colleagues who moved into tech</li>
                  <li>• BCA batchmates now in dev roles</li>
                  <li>• People met through dev.to / LinkedIn posts</li>
                  <li>• Message template: ask for advice or a 15-min call, not a job. Short and specific.</li>
                  <li>• ZTE: BCA is a hard ATS filter at FAANG / IT-services / PSUs — referrals bypass it.</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-medium text-warning">Market context (2026)</p>
              <p className="text-xs text-muted mt-1">Fresher share of new hires in India fell from ~19% to ~14% in one year — structural squeeze. Junior hiring is recovering slowly at some large firms. Budget 3–6 months of job search after Exit A/★1 and do not read early rejections as failure. 200+ applications is normal for a career switcher, not a red flag.</p>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── Referral message templates ── */}
      <StaggerItem>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" /> Referral message templates
            </CardTitle>
            <CardDescription>
              Three types. Keep them short. Ask for advice, not a job. Refresh the list of 10 names every quarter. Source: career_timeline_zte.docx §33.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {([
              {
                to: "A colleague who moved into tech",
                message: "Hi [name], I am at Applied Materials in ops and learning full-stack development with a project called ClientSync. I noticed you moved into [role]. Could I ask you two questions about how you did it? Ten minutes whenever suits you.",
              },
              {
                to: "A BCA batchmate now in a dev role",
                message: "Hi [name], congrats on [role at company]. I am building toward my first dev role: [one line on your project, live link]. Would you look at my portfolio for five minutes and tell me what a hiring manager at your company would miss?",
              },
              {
                to: "After a post or project you published",
                message: "Hi [name], I built [thing] using [tech] after reading your [post or talk]. Live here: [link]. If your team is hiring juniors, I would value your view on what is missing.",
              },
            ] as const).map((t) => (
              <div key={t.to} className="rounded-lg border border-border/50 p-3">
                <p className="text-xs font-semibold text-accent mb-1">To: {t.to}</p>
                <p className="text-xs text-muted italic leading-relaxed">"{t.message}"</p>
              </div>
            ))}
            <p className="text-[11px] text-muted">Replace every bracket before sending. A vague referral from a distant contact converts little better than a cold application — quality of the vouch matters more than the number of asks. Referrals bypass the BCA ATS filter, which matters at companies that explicitly list B.Tech in job requirements.</p>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── If the market is bad at Exit A ── */}
      <StaggerItem>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-warning" /> If the market is bad at Exit A
            </CardTitle>
            <CardDescription>
              The junior market is cyclical. A slow market at Exit A is not a stop signal — it is a widen signal. Source: career_timeline_zte.docx §18.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  situation: "Low response rate after 30+ tailored apps",
                  action: "Fix portfolio and resume first. At ~3% cold rate, 30 applications gives under 1 interview — that is expected, not failure. Check: is the live URL working? Is the README clear? Does the CI badge show green?",
                },
                {
                  situation: "Zero callbacks after 60 tailored apps + 10 referral asks",
                  action: "The problem is the portfolio or resume, not the market. Stop applying and fix the highest-friction item first. Get one person in a dev role to review the resume and portfolio honestly.",
                },
                {
                  situation: "Market genuinely slow (layoffs, hiring freeze cycle)",
                  action: "Widen the search to: QA/Automation engineer, implementation/solutions engineer, systems analyst, ops-tech roles. These are not dead ends — they are adjacent to dev and keep the path open. Keep studying to Exit ★1 in parallel.",
                },
                {
                  situation: "No offer after Exit ★1 (1,748h, month 14)",
                  action: "Check: 60 tailored applications sent? 10 referral asks made? If yes, portfolio and resume need work before volume. If no, increase volume first. The job search alone takes 3–6 months — start at Exit A, not ★1.",
                },
              ] as const).map((row) => (
                <div key={row.situation} className="rounded-lg border border-border/50 p-3">
                  <p className="text-xs font-semibold text-warning">{row.situation}</p>
                  <p className="text-xs text-muted mt-1">{row.action}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/50 bg-surface-2/30 p-3">
              <p className="text-xs font-medium mb-1">Roles to widen to if junior dev market is slow</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left text-[10px] uppercase text-muted pb-1.5 pr-3">Role</th>
                      <th className="text-left text-[10px] uppercase text-muted pb-1.5 pr-3">Skills used</th>
                      <th className="text-left text-[10px] uppercase text-muted pb-1.5">Why it helps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {([
                      { role: "QA / Automation engineer", skills: "Selenium, Playwright, scripting", why: "ZTE Phase 06 (testing) directly applies. BCA-friendly." },
                      { role: "Implementation / Solutions engineer", skills: "APIs, integrations, client comms", why: "Common step for ops people moving toward SaaS." },
                      { role: "Business / Data Analyst", skills: "SQL, Excel, BI, some Python", why: "Pays above ops; keeps the tech direction; reachable at Phase 01." },
                      { role: "RPA / Low-code developer", skills: "UiPath, Power Automate, scripting", why: "Faster entry; leads to full dev later. BCA is not a filter." },
                    ] as const).map((row) => (
                      <tr key={row.role}>
                        <td className="py-1.5 pr-3 font-medium">{row.role}</td>
                        <td className="py-1.5 pr-3 text-muted">{row.skills}</td>
                        <td className="py-1.5 text-muted">{row.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── Post-offer checklist ── */}
      <StaggerItem>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheckBig className="h-5 w-5 text-success" /> Post-offer checklist
            </CardTitle>
            <CardDescription>
              What to verify before signing. Never accept or decline on a verbal — get everything in writing. Source: career_timeline_zte.docx §19.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">Before accepting</p>
                <ul className="text-xs text-muted flex flex-col gap-1">
                  <li>☐ Fixed base salary (monthly, not CTC)</li>
                  <li>☐ Variable component: how is it measured, who decides, historical payout rate</li>
                  <li>☐ Joining bonus: clawback terms if you leave within X months</li>
                  <li>☐ Notice period during probation (often 1–2 weeks, not 60–90 days)</li>
                  <li>☐ Probation length and what happens at the end</li>
                  <li>☐ ESOP: strike price, vesting schedule, cliff, what happens if you leave</li>
                  <li>☐ Role title and team — confirm it is an engineering role, not ops/support</li>
                  <li>☐ Tech stack confirmed (avoid offers that say "full-stack" but mean legacy Java or COBOL)</li>
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">Before resigning from Applied Materials</p>
                <ul className="text-xs text-muted flex flex-col gap-1">
                  <li>☐ Offer letter is signed and dated — not just a verbal</li>
                  <li>☐ Start date confirmed and far enough out for your notice period</li>
                  <li>☐ 6-month expense buffer exists in your savings account</li>
                  <li>☐ Health insurance gap: Applied Materials cover ends, new cover starts when?</li>
                  <li>☐ PF transfer process initiated</li>
                  <li>☐ Check Applied Materials offer letter: any bond or clawback that applies?</li>
                  <li>☐ The new fixed salary beats your current ops in-hand (₹28,000/month)</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-3">
              <p className="text-xs font-medium text-success">The switch criteria</p>
              <p className="text-xs text-muted mt-1">Switch only when: (1) signed offer in hand, (2) fixed salary beats current ops pay, (3) 6-month buffer exists, (4) you've done the checklist above. All four. Not three out of four.</p>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {planMetrics && planMetrics.length > 0 && (
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["plan_a", "plan_b"] as const).map((plan) => {
              const m = planMetrics.find((p) => p.career_plan === plan);
              const label = plan === "plan_a" ? "Plan A — SDE Sprint" : "Plan B — Alternative fork";
              return (
                <Card key={plan} className={cn(plan === "plan_b" && "border-info/30")}>
                  <CardContent noHeader className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono uppercase tracking-wide text-muted">{label}</p>
                      {plan === "plan_a" && <Badge variant="accent">Active</Badge>}
                      {plan === "plan_b" && <Badge variant="outline">Fallback</Badge>}
                    </div>
                    {m ? (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.total_applications}</p>
                          <p className="text-[10px] text-muted">Applications</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.reached_interview_count}</p>
                          <p className="text-[10px] text-muted">Interviews</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.offer_count}</p>
                          <p className="text-[10px] text-muted">Offers</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No applications tagged to this plan yet.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </StaggerItem>
      )}


      <StaggerItem>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {counts.map((c) => (
          <Card key={c.value} className="glow-card">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold font-mono-tabular">{c.count}</p>
              <p className="text-[11px] text-muted">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      </StaggerItem>

      <StaggerItem>
      <div className="flex flex-col gap-2">
        {(entries ?? []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => openEdit(entry)}
            className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition-standard hover:bg-surface-hover hover:border-muted-2/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20 glow-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.company}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {entry.role && <p className="text-xs text-muted truncate">{entry.role}</p>}
                {entry.location && (
                  <span className="text-xs text-muted flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" /> {entry.location}
                  </span>
                )}
                {entry.salary_range && (
                  <span className="text-xs text-muted flex items-center gap-0.5">
                    <IndianRupee className="h-2.5 w-2.5" /> {entry.salary_range}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[entry.application_status]}>{entry.application_status}</Badge>
            {entry.career_plan === "plan_a" && (
              <Badge variant="outline" className="text-[10px]">
                Plan A
              </Badge>
            )}
            {entry.offer && <Badge variant="success">Offer</Badge>}
            {entry.follow_up_date && (
              <span className="text-xs text-warning font-mono-tabular hidden sm:inline">
                follow up {new Date(entry.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </button>
        ))}
        {(entries ?? []).length === 0 && (
          <EmptyState message="No applications yet." hint="Add your first one." />
        )}
      </div>
      </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit application" : "New application"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company</Label>
                  <Input
                    className="mt-1"
                    value={editing.company ?? ""}
                    onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    className="mt-1"
                    value={editing.role ?? ""}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.application_status ?? "wishlist"}
                    onValueChange={(v) => setEditing({ ...editing, application_status: v as ApplicationStatus })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Input
                    className="mt-1"
                    placeholder="Referral, LinkedIn, cold apply…"
                    value={editing.source ?? ""}
                    onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Career plan</Label>
                <Select
                  value={editing.career_plan ?? "plan_a"}
                  onValueChange={(v) => setEditing({ ...editing, career_plan: v as "plan_a" | "plan_b" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_a">Plan A — SDE Sprint</SelectItem>
                    <SelectItem value="plan_b">Plan B — Alternative fork</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Job URL</Label>
                <Input
                  className="mt-1"
                  placeholder="https://…"
                  value={editing.job_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, job_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input
                    className="mt-1"
                    value={editing.location ?? ""}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Salary range</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. 8-12 LPA"
                    value={editing.salary_range ?? ""}
                    onChange={(e) => setEditing({ ...editing, salary_range: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Tech stack (comma separated)</Label>
                <Input
                  className="mt-1"
                  placeholder="React, Node.js, PostgreSQL"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Recruiter name</Label>
                  <Input
                    className="mt-1"
                    value={editing.recruiter_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, recruiter_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Recruiter contact</Label>
                  <Input
                    className="mt-1"
                    value={editing.recruiter_contact ?? ""}
                    onChange={(e) => setEditing({ ...editing, recruiter_contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Next interview date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.interview_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, interview_date: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label>Follow-up date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.follow_up_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, follow_up_date: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <Label>Resume version</Label>
                <Input
                  className="mt-1"
                  value={editing.resume_version ?? ""}
                  onChange={(e) => setEditing({ ...editing, resume_version: e.target.value })}
                />
              </div>

              {editing.application_status === "rejected" && (
                <div>
                  <Label>Rejection reason</Label>
                  <Input
                    className="mt-1"
                    value={editing.rejection_reason ?? ""}
                    onChange={(e) => setEditing({ ...editing, rejection_reason: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label>Job description</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editing.job_description ?? ""}
                  onChange={(e) => setEditing({ ...editing, job_description: e.target.value })}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>

              <DialogFooter className="justify-between">
                {editing.id ? (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(editing as CareerTrackerRow)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RateStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent noHeader className="pt-3 pb-3">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-bold font-mono-tabular mt-0.5">{value}%</p>
      </CardContent>
    </Card>
  );
}

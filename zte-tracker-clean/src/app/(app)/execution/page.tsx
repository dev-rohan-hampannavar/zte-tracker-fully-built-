"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Plus,
  Trash2,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useDailyPlan } from "@/lib/hooks/use-daily-plan";
import {
  createEvidenceItem,
  createTimeBlock,
  createWeeklyCommitment,
  deleteEvidenceItem,
  deleteTimeBlock,
  deleteWeeklyCommitment,
  updateTimeBlock,
  updateWeeklyCommitment,
  useEvidenceItems,
  useTimeBlocks,
  useWeeklyCommitments,
} from "@/lib/hooks/use-execution-os";
import type { CommitmentDomain, EvidenceType, TimeBlockType } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, localDateISO } from "@/lib/utils";
import { buildTimeBlocksIcs } from "@/lib/calendar-ics";

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

function mondayISO(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  return localDateISO(d);
}

function prettyDate(dateISO: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${dateISO}T00:00:00`));
}

function formatTime(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function ExecutionPage() {
  const { user } = useUser();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => mondayISO(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const { data: commitments, mutate: mutateCommitments, isLoading: commitmentsLoading } = useWeeklyCommitments(user?.id, weekStart);
  const { data: blocks, mutate: mutateBlocks, isLoading: blocksLoading } = useTimeBlocks(user?.id, weekStart, weekEnd);
  const { data: evidence, mutate: mutateEvidence, isLoading: evidenceLoading } = useEvidenceItems(user?.id);

  // Read-only cross-visibility into the system-generated daily plan (see
  // ExecutionContextCard's counterpart on /daily-plan) — 120 min is just a
  // default preview budget; this page never writes daily_plan_task_state,
  // only links out to /daily-plan which remains the single place that does.
  const { plan: todaysPlan } = useDailyPlan(120);

  const [commitmentTitle, setCommitmentTitle] = useState("");
  const [commitmentDomain, setCommitmentDomain] = useState<CommitmentDomain>("engineering");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockDate, setBlockDate] = useState(weekStart);
  const [blockStart, setBlockStart] = useState("19:00");
  const [blockEnd, setBlockEnd] = useState("20:00");
  const [blockType, setBlockType] = useState<TimeBlockType>("engineering");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("deployment");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const effectiveBlockDate = useMemo(() => {
    const current = new Date(`${blockDate}T00:00:00`).getTime();
    const start = new Date(`${weekStart}T00:00:00`).getTime();
    const end = new Date(`${weekEnd}T23:59:59`).getTime();
    return current < start || current > end ? weekStart : blockDate;
  }, [weekStart, weekEnd, blockDate]);

  async function addCommitment() {
    if (!user || !commitmentTitle.trim()) return;
    if ((commitments?.length ?? 0) >= 3) {
      toast.error("Keep this week to three commitments. Complete or remove one before adding another.");
      return;
    }
    setSaving("commitment");
    try {
      await createWeeklyCommitment(user.id, { week_start: weekStart, title: commitmentTitle, domain: commitmentDomain, order_index: commitments?.length ?? 0 });
      setCommitmentTitle("");
      await mutateCommitments();
      toast.success("Weekly commitment added");
    } catch { toast.error("Couldn’t add commitment. Apply migration 0052 first."); }
    finally { setSaving(null); }
  }

  async function addBlock() {
    if (!user || !blockTitle.trim()) return;
    setSaving("block");
    try {
      await createTimeBlock(user.id, { block_date: effectiveBlockDate, start_time: blockStart, end_time: blockEnd, title: blockTitle, block_type: blockType });
      setBlockTitle("");
      await mutateBlocks();
      toast.success("Time block scheduled");
    } catch { toast.error("Couldn’t save that block. Check the times and apply migration 0052."); }
    finally { setSaving(null); }
  }

  async function addEvidence() {
    if (!user || !evidenceTitle.trim()) return;
    setSaving("evidence");
    try {
      await createEvidenceItem(user.id, { title: evidenceTitle, evidence_type: evidenceType, url: evidenceUrl || null, description: evidenceDescription || null });
      setEvidenceTitle(""); setEvidenceUrl(""); setEvidenceDescription("");
      await mutateEvidence();
      toast.success("Evidence saved");
    } catch { toast.error("Couldn’t save evidence. Links must begin with http:// or https://."); }
    finally { setSaving(null); }
  }

  async function toggleCommitment(id: string, status: "pending" | "completed") {
    try { await updateWeeklyCommitment(id, { status }); await mutateCommitments(); }
    catch { toast.error("Couldn’t update commitment"); }
  }

  async function toggleBlock(id: string, status: "planned" | "completed") {
    try { await updateTimeBlock(id, { status }); await mutateBlocks(); }
    catch { toast.error("Couldn’t update time block"); }
  }

  async function remove(kind: "commitment" | "block" | "evidence", id: string) {
    if (!window.confirm("Remove this item?")) return;
    try {
      if (kind === "commitment") { await deleteWeeklyCommitment(id); await mutateCommitments(); }
      if (kind === "block") { await deleteTimeBlock(id); await mutateBlocks(); }
      if (kind === "evidence") { await deleteEvidenceItem(id); await mutateEvidence(); }
      toast.success("Removed");
    } catch { toast.error("Couldn’t remove item"); }
  }

  function downloadCalendar() {
    if (!blocks || blocks.length === 0) return;
    const blob = new Blob([buildTimeBlocksIcs(blocks)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zte-execution-${weekStart}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar file downloaded");
  }

  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, typeof blocks>();
    for (const block of blocks ?? []) grouped.set(block.block_date, [...(grouped.get(block.block_date) ?? []), block]);
    return [...grouped.entries()];
  }, [blocks]);

  const loading = commitmentsLoading || blocksLoading || evidenceLoading;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent"><CalendarClock className="h-4 w-4" /> Execution OS</div><h1 className="text-page-title font-semibold tracking-tight mt-2">Turn the plan into a week you can execute.</h1><p className="text-sm text-muted mt-1 max-w-2xl">Time blocks protect your evenings. Three commitments keep the week honest. Evidence turns completed work into career proof.</p></div>
        <Link href="/career-plan" className="text-sm text-accent hover:underline">Back to Career Strategy</Link>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/50 px-3 py-2"><Button variant="ghost" size="sm" onClick={() => setWeekOffset((value) => value - 1)}><ArrowLeft className="h-4 w-4" /> Previous</Button><div className="text-center"><p className="text-sm font-medium">{prettyDate(weekStart)} – {prettyDate(weekEnd)}</p><p className="text-[11px] text-muted">{weekOffset === 0 ? "This week" : weekOffset > 0 ? `${weekOffset} week${weekOffset === 1 ? "" : "s"} ahead` : `${Math.abs(weekOffset)} week${weekOffset === -1 ? "" : "s"} ago`}</p></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={downloadCalendar} disabled={!blocks?.length}><Download className="h-4 w-4" /> Export .ics</Button><Button variant="ghost" size="sm" onClick={() => setWeekOffset((value) => value + 1)}>Next <ArrowRight className="h-4 w-4" /></Button></div></div>

      {(todaysPlan?.tasks.length ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-surface/50 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted mb-1.5">Today&apos;s system-generated plan</p>
            <div className="flex flex-wrap gap-1.5">
              {todaysPlan!.tasks.map((t) => (
                <span
                  key={`${t.kind}:${t.naturalKey}`}
                  className="text-xs rounded-full border border-border/60 px-2 py-0.5 text-foreground/80"
                >
                  {t.title}
                </span>
              ))}
            </div>
          </div>
          <Link href="/daily-plan" className="text-xs text-accent hover:underline shrink-0 mt-0.5">
            Open Daily Plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card><CardHeader><CardTitle>Three commitments</CardTitle><CardDescription>Choose outcomes, not vague intentions.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex gap-2"><Input value={commitmentTitle} onChange={(event) => setCommitmentTitle(event.target.value)} placeholder="e.g. Ship auth flow" onKeyDown={(event) => { if (event.key === "Enter") void addCommitment(); }} /><Button size="icon" onClick={addCommitment} disabled={saving === "commitment" || !commitmentTitle.trim() || (commitments?.length ?? 0) >= 3} aria-label="Add commitment"><Plus className="h-4 w-4" /></Button></div><Select value={commitmentDomain} onValueChange={(value) => setCommitmentDomain(value as CommitmentDomain)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="project">Flagship project</SelectItem><SelectItem value="dsa">DSA</SelectItem><SelectItem value="career">Career</SelectItem><SelectItem value="operations">Operations</SelectItem></SelectContent></Select>{(commitments ?? []).length === 0 ? <p className="text-xs text-muted py-4">No commitments yet. Add the three outcomes that would make this week a win.</p> : <div className="flex flex-col gap-2">{(commitments ?? []).map((item) => <div key={item.id} className={cn("flex items-start gap-2 rounded-lg border border-border/50 p-2", item.status === "completed" && "opacity-60")}><button className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", item.status === "completed" ? "border-success bg-success/15 text-success" : "border-border text-transparent hover:border-accent")} onClick={() => void toggleCommitment(item.id, item.status === "completed" ? "pending" : "completed")} aria-label={item.status === "completed" ? "Mark pending" : "Mark complete"}><Check className="h-3 w-3" /></button><div className="min-w-0 flex-1"><p className={cn("text-sm", item.status === "completed" && "line-through")}>{item.title}</p><p className="text-[11px] text-muted capitalize">{item.domain}</p></div><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove("commitment", item.id)} aria-label="Remove commitment"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}</CardContent></Card>

        <Card><CardHeader><CardTitle>Time blocks</CardTitle><CardDescription>Reserve realistic evening/weekend windows.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="block-date">Date</Label><Input id="block-date" type="date" value={effectiveBlockDate} min={weekStart} max={weekEnd} onChange={(event) => setBlockDate(event.target.value)} /></div><div className="space-y-1"><Label>Type</Label><Select value={blockType} onValueChange={(value) => setBlockType(value as TimeBlockType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["engineering", "project", "dsa", "career", "operations", "rest"] as TimeBlockType[]).map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></div></div><Input value={blockTitle} onChange={(event) => setBlockTitle(event.target.value)} placeholder="Block title" /><div className="grid grid-cols-2 gap-2"><Input type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} /><Input type="time" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} /></div><Button onClick={addBlock} disabled={saving === "block" || !blockTitle.trim()}><Plus className="h-4 w-4" /> Schedule block</Button>{blocksByDate.length === 0 ? <p className="text-xs text-muted py-3">No blocks planned for this week.</p> : <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">{blocksByDate.map(([date, items]) => <div key={date}><p className="text-xs font-medium text-muted mb-1">{prettyDate(date)}</p>{items?.map((item) => <div key={item.id} className="flex items-center gap-2 border-b border-border/40 py-2 last:border-0"><button className={cn("flex h-5 w-5 items-center justify-center rounded-full border", item.status === "completed" ? "border-success bg-success/15 text-success" : "border-border text-transparent hover:border-accent")} onClick={() => void toggleBlock(item.id, item.status === "completed" ? "planned" : "completed")} aria-label={item.status === "completed" ? "Mark planned" : "Mark complete"}><Check className="h-3 w-3" /></button><div className="min-w-0 flex-1"><p className={cn("text-xs truncate", item.status === "completed" && "line-through text-muted")}>{item.title}</p><p className="text-[10px] text-muted">{formatTime(item.start_time)}–{formatTime(item.end_time)} · <span className="capitalize">{item.block_type}</span></p></div><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove("block", item.id)} aria-label="Remove time block"><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>)}</div>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-accent" /> Evidence vault</CardTitle><CardDescription>Save proof a future recruiter can verify.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><Input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="e.g. ClientSync deployment" /><Select value={evidenceType} onValueChange={(value) => setEvidenceType(value as EvidenceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["github", "deployment", "certificate", "screenshot", "interview", "resume", "other"] as EvidenceType[]).map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select><Input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://… (optional)" /><Textarea value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="What does this prove?" rows={2} /><Button onClick={addEvidence} disabled={saving === "evidence" || !evidenceTitle.trim()}><Plus className="h-4 w-4" /> Save evidence</Button>{(evidence ?? []).length === 0 ? <p className="text-xs text-muted py-3">Nothing captured yet. Add the first proof item after your next shipped slice.</p> : <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">{(evidence ?? []).map((item) => <div key={item.id} className="rounded-lg border border-border/50 p-2"><div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm truncate">{item.title}</p><p className="text-[11px] text-muted capitalize">{item.evidence_type}{item.description ? ` · ${item.description}` : ""}</p>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-1">Open proof <ExternalLink className="h-3 w-3" /></a>}</div><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove("evidence", item.id)} aria-label="Remove evidence"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div>}</CardContent></Card>
      </div>

      {loading && <Skeleton className="h-4 w-32" />}
    </div>
  );
}

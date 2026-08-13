"use client";

import Link from "next/link";
import {
  Terminal,
  ArrowRight,
  Map,
  Code2,
  FolderGit2,
  Briefcase,
  Flame,
  Layers,
  Radar,
  Repeat,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasterPhaseTable, useOrientation } from "@/lib/hooks/use-roadmap";

// Same "tracker, not curriculum" pitch points already used on /login — kept
// in sync deliberately rather than duplicated with drift, since both pages
// are answering the same question ("why this over a checklist?") for two
// different audiences (first-time visitor here, returning-but-signed-out
// user there).
const PITCH_POINTS = [
  {
    icon: Layers,
    title: "A dependency graph, not a checklist",
    body: "It knows the prerequisite structure of the roadmap and locks what you're not ready for, instead of letting you feel productive while building on a gap.",
  },
  {
    icon: Radar,
    title: "One page instead of eight tabs",
    body: "Roadmap, DSA, projects, applications, and revision schedule — all reading from the same progress data instead of eight disconnected spreadsheets.",
  },
  {
    icon: Repeat,
    title: "Spaced revision, not a one-and-done checkbox",
    body: "Completing a topic schedules its own review. Forgetting isn't a surprise you discover in an interview.",
  },
];

// Feature highlights map to the app's actual sections (sidebar nav), not
// invented marketing categories — someone who signs up sees exactly these
// four areas on day one.
const FEATURES = [
  {
    icon: Map,
    title: "Interactive roadmap",
    body: "Phases, stages, and topics laid out as a dependency graph you actually progress through — not a static markdown file.",
  },
  {
    icon: Code2,
    title: "DSA tracker",
    body: "Easy/medium/hard targets pulled straight from the roadmap's own numbers, with your solved count against them.",
  },
  {
    icon: FolderGit2,
    title: "Project workspaces",
    body: "Every build has a home: requirements, milestones, and progress in one place instead of scattered notes.",
  },
  {
    icon: Briefcase,
    title: "Career tracker",
    body: "Applications, interviews, and exit-ladder job levels tracked alongside the learning that gets you there.",
  },
];

export function LandingPage() {
  const { data: orientation } = useOrientation();
  const { data: phases, isLoading: phasesLoading } = useMasterPhaseTable();

  // Trust indicators are the roadmap's own metadata — no invented stats.
  const phaseCount = phases?.length ?? null;
  const totalHours = phases?.reduce((sum, p) => {
    const parsed = parseFloat(p.realistic_hours ?? "");
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  const statsLoading = phasesLoading && phaseCount === null;

  return (
    <div className="min-h-full bg-background">
      {/* ---------- Nav ---------- */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm shadow-accent/30">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">ZTE Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/welcome" className="text-sm text-muted hover:text-foreground transition-standard hidden sm:block">
              How it works
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="sm">Sign in</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 800px 500px at 50% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            <Flame className="h-3 w-3 text-accent" />
            The Developer Operating System
          </div>
          <h1 className="text-hero font-bold tracking-tight leading-[1.05]">
            Become Interview Ready.
            <br />
            <span className="text-accent">Master Development.</span>
            <br />
            Get Hired.
          </h1>
          <p className="text-body text-muted max-w-xl">
            {orientation?.overview ??
              "A structured, phase-based path from beginner to job-ready full-stack engineer — with a tracker that actually knows what you've done and what's next."}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link href="/welcome">
              <Button size="lg" className="gap-2">
                Start the roadmap <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>

          {/* Trust indicators — real numbers from roadmap_metadata via
              master_phase_table, not placeholder marketing figures. */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-8 text-sm text-muted">
            {statsLoading ? (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : (
              <>
                {phaseCount !== null && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="font-mono-tabular font-medium text-foreground">{phaseCount}</span> phases
                  </span>
                )}
                {totalHours ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="font-mono-tabular font-medium text-foreground">{Math.round(totalHours)}h</span> realistic curriculum
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Dependency-aware progress
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Feature highlights ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-section-title font-semibold tracking-tight">Everything lives in one place</h2>
          <p className="text-sm text-muted mt-2">Four sections, all reading from the same progress data.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="text-left">
              <CardContent noHeader className="flex flex-col gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted leading-relaxed">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- Why this works (pitch points) ---------- */}
      <section className="border-y border-border bg-surface-2/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-section-title font-semibold tracking-tight">Why this over a spreadsheet</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PITCH_POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center flex flex-col items-center gap-5">
        <h2 className="text-page-title font-semibold tracking-tight">Ship the roadmap. One topic at a time.</h2>
        <p className="text-sm text-muted max-w-md">
          Walk through what this is and how it works, or jump straight to signing in if you already know.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/welcome">
            <Button size="lg" className="gap-2">
              Start the roadmap <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-foreground transition-standard">
            I already have an account
          </Link>
        </div>
      </section>
    </div>
  );
}

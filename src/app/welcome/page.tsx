import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  ArrowRight,
  Target,
  Flame,
  LayoutGrid,
  Clock,
  Route,
  ShieldCheck,
  GitBranch,
  CheckCircle2,
  TrendingUp,
  Zap,
} from "lucide-react";

const stats = [
  { label: "Phases", value: "21", icon: LayoutGrid },
  { label: "Topics", value: "363", icon: CheckCircle2 },
  { label: "Est. hours", value: "3,034", icon: Clock },
  { label: "Capstone", value: "ClientSync", icon: GitBranch },
];

const problems = [
  {
    title: "Roadmaps you abandon by week 3",
    body: "A PDF or a Notion doc has no memory of what you did yesterday. Nothing tracks streaks, nothing tells you what's overdue, nothing shows you the 3,000-hour mountain broken into a single next step.",
  },
  {
    title: "No sense of real progress",
    body: "Watching tutorials feels like progress. It isn't. Without a system logging completed topics, hours studied, and projects shipped, you can't tell momentum from motion.",
  },
  {
    title: "Scattered tools, scattered focus",
    body: "A spreadsheet for topics, a notebook for revision, a doc for interview prep, a folder for resumes — four places to update means none of them stay updated.",
  },
];

const features = [
  {
    icon: Target,
    title: "One curriculum, sequenced by real dependency",
    body: "21 phases, 108 stages, 363 topics — ordered so foundations actually come before what depends on them, not just alphabetically or by chapter number.",
  },
  {
    icon: Flame,
    title: "Streaks and daily missions",
    body: "Every study session gets logged. Your streak, your weekly hours, and today's next topic are always the first thing you see — no digging required.",
  },
  {
    icon: GitBranch,
    title: "ClientSync as the anchor build",
    body: "A multi-tenant B2B CRM/onboarding SaaS you build in parallel with the curriculum, tracked milestone by milestone, so theory turns into a real product in your GitHub.",
  },
  {
    icon: Route,
    title: "A spaced revision system",
    body: "Topics you've marked complete resurface on a schedule, so what you learned in Phase 3 is still solid by the time you're interviewing in Phase 18.",
  },
  {
    icon: TrendingUp,
    title: "Interview and career tracking",
    body: "Companies, applications, and interview rounds live next to your curriculum progress — because the whole point of Phase 1 is Phase 21: getting hired.",
  },
  {
    icon: ShieldCheck,
    title: "Built for one person, tuned for the job market",
    body: "No generic bootcamp filler. The curriculum is weighted toward what Bangalore product startups — Razorpay, Groww, Setu, Chargebee and similar — actually screen for.",
  },
];

const checklist = [
  "Sign in and land straight on your dashboard",
  "See today's next topic and your current streak",
  "Log study hours as you go — no separate spreadsheet",
  "Mark topics complete and watch phase progress move",
  "Check revision-due items before they go stale",
];

export default function WelcomePage() {
  return (
    <div className="min-h-full bg-background">
      {/* Hero */}
      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="mx-auto max-w-3xl flex flex-col items-center text-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Terminal className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ZTE Tracker</span>
          </div>

          <h1 className="text-hero font-semibold tracking-tight text-balance">
            Zero to Elite.
            <br />
            <span className="text-accent">Tracked, not just planned.</span>
          </h1>

          <p className="text-xl text-muted leading-relaxed max-w-2xl text-balance">
            A self-built system for going from BCA graduate to hired full-stack
            engineer — every phase, topic, streak, and shipped project in one
            place, so 3,000+ hours of self-study never feels directionless.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link href="/login">
              <Button size="lg" className="text-base px-8 h-12">
                Sign in to start <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href="#what-it-is">
              <Button size="lg" variant="outline" className="text-base px-8 h-12">
                See how it works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-2">
                <s.icon className="h-5 w-5 text-accent" />
                <span className="text-3xl font-semibold font-mono-tabular tracking-tight">
                  {s.value}
                </span>
                <span className="text-sm text-muted">{s.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* What it is / why it was built */}
      <section id="what-it-is" className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">
          <Badge variant="outline" className="w-fit text-xs">
            Why this exists
          </Badge>
          <h2 className="text-page-title font-semibold tracking-tight text-balance">
            Built because the plan kept living in five different places
          </h2>
          <p className="text-xl text-muted leading-relaxed">
            ZTE Tracker started as a personal problem: a full-stack curriculum
            worth following for a year, and no single place to see whether
            today actually moved the needle. So it got built — Next.js,
            Supabase, deployed on Vercel — the same way every phase in the
            roadmap will eventually get shipped: as a real, working product,
            not a plan about one.
          </p>
        </div>
      </section>

      {/* Problems */}
      <section className="px-6 py-16 border-t border-border bg-surface-2/40">
        <div className="mx-auto max-w-4xl flex flex-col gap-10">
          <h2 className="text-page-title font-semibold tracking-tight text-center text-balance">
            What self-study without a system actually looks like
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {problems.map((p) => (
              <Card key={p.title}>
                <CardContent className="pt-6 pb-6 flex flex-col gap-3">
                  <h3 className="text-card-title font-semibold leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-base text-muted leading-relaxed">
                    {p.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features / how it helps efficiency */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-5xl flex flex-col gap-12">
          <div className="flex flex-col gap-4 text-center items-center">
            <Badge variant="outline" className="w-fit text-xs">
              How it helps
            </Badge>
            <h2 className="text-page-title font-semibold tracking-tight text-balance max-w-2xl">
              Every feature exists to close the gap between studying and shipping
            </h2>
            <p className="text-xl text-muted leading-relaxed max-w-2xl text-balance">
              Less time deciding what to do next, less time re-learning what
              you forgot, more visible proof of how far you've actually come.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6 pb-6 flex flex-col gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-card-title font-semibold leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-base text-muted leading-relaxed">
                    {f.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Efficiency callout */}
      <section className="px-6 py-16 border-t border-border bg-surface-2/40">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col md:flex-row items-start gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Zap className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-section-title font-semibold tracking-tight">
                  What it actually saves you
                </h3>
                <p className="text-xl text-muted leading-relaxed">
                  No more re-deciding your plan every morning, no more losing
                  track of what's due for revision, no more separate resume
                  and interview docs that drift out of sync with reality.
                  Every hour you log, every topic you finish, and every
                  project you ship rolls straight into one number: how close
                  you are to job-ready.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick start checklist */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-2xl flex flex-col gap-8">
          <h2 className="text-page-title font-semibold tracking-tight text-center text-balance">
            The first five minutes
          </h2>
          <ol className="flex flex-col gap-4">
            {checklist.map((item, i) => (
              <li key={item} className="flex items-start gap-4">
                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-mono-tabular font-semibold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xl leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-2xl flex flex-col items-center text-center gap-6">
          <h2 className="text-page-title font-semibold tracking-tight text-balance">
            Zero to Elite starts with today's next topic
          </h2>
          <p className="text-xl text-muted leading-relaxed">
            Sign in and your dashboard, your streak, and your next step are
            already waiting.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-8 h-12">
              Sign in to start <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login" className="text-base text-muted hover:text-foreground">
            Skip — I already have an account
          </Link>
        </div>
      </section>
    </div>
  );
}
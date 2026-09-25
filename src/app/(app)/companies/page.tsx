"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCompanies, useExitLadder } from "@/lib/hooks/use-roadmap";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeUp } from "@/components/motion/primitives";

// Item 3 follow-up: the schema/seed data for category, hiring_stage,
// typical_tech_stack, hiring_difficulty, and notes has existed since Stage 0,
// but this list (and the detail page) never surfaced anything past `name`.
// hiring_difficulty maps to a badge variant so it's scannable across a grid
// without reading each card's text.
const DIFFICULTY_VARIANT: Record<NonNullable<Company["hiring_difficulty"]>, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const { data: exitLadder } = useExitLadder();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return companies ?? [];
    const q = query.toLowerCase();
    return (companies ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  // A company is loosely "linked" to an exit tier if its name appears in that
  // tier's target_companies free-text field. Best-effort — the source roadmap
  // doesn't have a normalized company<->exit join.
  function linkedExit(companyName: string) {
    return (exitLadder ?? []).find((e) =>
      e.target_companies?.toLowerCase().includes(companyName.toLowerCase())
    );
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted mt-1">
          {companies?.length ?? 0} companies referenced across the roadmap, with category, hiring stage, and
          typical tech stack where known.
        </p>
      </div>
      </FadeUp>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Search companies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Applied Materials internal bridge ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent" /> Applied Materials — internal bridge plan
          </CardTitle>
          <CardDescription>
            Use your current employer as a first step. Source: career_timeline_zte.docx §29.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs font-semibold mb-2">Internal roles found at Applied Materials India</p>
              <ul className="text-xs text-muted flex flex-col gap-1">
                <li>• Software Engineer (Java, Spring Boot)</li>
                <li>• QA / Automation Engineer (Selenium, Python)</li>
                <li>• AI/ML Engineer (Python, TensorFlow)</li>
                <li>• IT Systems Analyst (SAP, Oracle)</li>
                <li>• Java Tech Lead</li>
                <li>• Data Scientist (B.E./B.Tech/MCA filter on most listings)</li>
              </ul>
              <p className="text-[11px] text-warning mt-2">⚠ Data Scientist and many AI/ML roles explicitly require B.E./B.Tech/M.Tech/MCA. BCA blocks these ATS filters. IT Systems Analyst and QA/Automation are open.</p>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs font-semibold mb-2">4-week action plan (start in month 1)</p>
              <div className="flex flex-col gap-1.5 text-xs text-muted">
                {([
                  { week: "Weeks 1–2", action: "Pick one recurring manual report in your ops role. Automate it with SQL + a simple dashboard (ZTE Phase 01 output)." },
                  { week: "Weeks 3–4", action: "Show it to your manager in a 10-min demo. Frame it as a process improvement, not a career pivot." },
                  { week: "Month 3", action: "Ask your manager which internal teams hire ex-ops with SQL skills. Get a name if possible." },
                  { week: "Month 6", action: "Apply to IT Systems Analyst or QA/Automation roles internally — or to external companies if internal door stays closed." },
                ] as const).map((r) => (
                  <div key={r.week}>
                    <span className="text-accent font-medium">{r.week}:</span> {r.action}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs font-semibold mb-2">How to check a company's degree policy in 15 minutes</p>
            <ol className="text-xs text-muted flex flex-col gap-1 list-decimal list-inside">
              <li>Search the company's LinkedIn jobs page for "software engineer fresher" or "SDE 1".</li>
              <li>Open 3 listings. Look for "B.E./B.Tech" or "degree in CS" in the requirements section.</li>
              <li>If all 3 say B.Tech: referral-only or skip. If 1 of 3 says "equivalent": apply with a strong project.</li>
              <li>Check their engineering blog or careers page — companies that post on dev.to/Medium rarely ATS-filter hard.</li>
              <li>Ask anyone who works there on LinkedIn: "Do you screen on degree?" — most people reply honestly.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs font-semibold mb-2">Where to search (Bangalore dev roles)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted">
              {([
                { site: "Wellfound (AngelList)", note: "Best for early-stage startups. Filter: Bangalore, full-stack, 0–2 yrs." },
                { site: "WorkAtAStartup", note: "Y Combinator companies. High quality, BCA-friendly." },
                { site: "LinkedIn", note: "Best for referrals. Apply directly after a referral intro." },
                { site: "Instahyre", note: "Good mid-stage startups. Direct recruiter contact." },
                { site: "Naukri", note: "High volume, low signal. Use only after Exit ★1." },
                { site: "Company careers pages", note: "Direct apply — avoids ATS. ZTE company list above." },
              ] as const).map((s) => (
                <div key={s.site} className="rounded-md border border-border/30 p-2">
                  <p className="font-medium text-foreground">{s.site}</p>
                  <p className="mt-0.5">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Company shortlist by exit point ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent" /> Target company shortlist by exit
          </CardTitle>
          <CardDescription>
            Specific Bangalore companies worth targeting at each exit point. Check each for degree filters before applying (guide above). Source: career_timeline_zte.docx §30.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {([
            {
              exit: "Exit A",      hours: "1,235h", label: "Junior Full-Stack · ₹6–10L",      borderCls: "border-success/30",  textCls: "text-success",
              companies: ["Seed-stage startups on Wellfound and WorkAtAStartup", "Any company that posts 'fresher' or '0–1 yr exp' roles with a specific tech stack listed", "Ex-Applied Materials contacts' companies — referral is the key lever at this stage"],
              note: "Volume is the strategy here: 30–40 well-tailored applications per interview at ~3% cold rate. Focus on companies with a technical blog post — they value craft.",
            },
            {
              exit: "Exit A–B",    hours: "1,235–1,417h", label: "Junior-to-Mid · ₹8–12L",   borderCls: "border-accent/30",   textCls: "text-accent",
              companies: ["Postman", "Hasura", "ToolJet", "AppSmith", "Plane", "Hoppscotch"],
              note: "Developer-tool companies appreciate ZTE-grade portfolio work — open source contributions to their repos (even docs or bug fixes) outperform cold applications.",
            },
            {
              exit: "Exit ★1",     hours: "1,748h", label: "Interview-ready · ₹8–15L",        borderCls: "border-accent/30",   textCls: "text-accent",
              companies: ["Chargebee", "BrowserStack", "Juspay", "Setu (by Pine Labs)", "Multiplier", "Leegality", "Dezerv", "Smallcase", "Finbox"],
              note: "These are product-first B2B companies where ops context is a hiring plus. Referral conversion is 40–65% vs 3% cold — find one connection per company before applying.",
            },
            {
              exit: "Exit C–★2",   hours: "1,949–2,113h", label: "Mid, production-grade · ₹12–25L", borderCls: "border-warning/30",  textCls: "text-warning",
              companies: ["Razorpay", "CRED (early round)", "Zepto (tech team)", "Groww", "Fi Money", "Slice", "Jupiter", "Open Financial"],
              note: "These companies run multi-stage loops including system design at the mid level. Phase 10 (monitoring/observability) and Phase 11 (DB optimisation) are the differentiators.",
            },
            {
              exit: "Exit D–3",    hours: "2,320–2,943h", label: "Mid-Senior · ₹20–40L",      borderCls: "border-warning/30",  textCls: "text-warning",
              companies: ["Sarvam AI", "Krutrim", "Glance / InMobi", "Meesho platform team", "Swiggy engineering", "Zomato", "PhonePe", "Flipkart platform"],
              note: "At this level the BCA filter is mostly gone — companies care about what you've shipped. GitHub profile + ClientSync + TaxStack should carry the interview to the technical round.",
            },
            {
              exit: "Exit 3–E",    hours: "2,943–3,034h", label: "Senior / Founding · ₹25–50L", borderCls: "border-danger/30",   textCls: "text-danger",
              companies: ["Walmart Global Tech India", "Target India", "JPMC India", "Goldman Sachs India", "Adobe India", "Salesforce India", "Atlassian India"],
              note: "GCCs often require a B.Tech/MCA degree at this level. These are reachable after 3–5 years at a product company — not a direct-from-fresher target. FAANG India falls in the same bucket.",
            },
          ] as const).map((tier) => (
            <div key={tier.exit} className={cn("rounded-lg border p-3", tier.borderCls)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-semibold", tier.textCls)}>{tier.exit}</span>
                <Badge variant="outline" className="text-[10px] font-mono-tabular">{tier.hours}</Badge>
                <span className="text-xs text-muted">{tier.label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tier.companies.map((c) => (
                  <span key={c} className="text-[11px] bg-surface-2 border border-border/50 rounded px-2 py-0.5">{c}</span>
                ))}
              </div>
              <p className="text-[11px] text-muted">{tier.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

          <p className="text-[11px] text-muted">
            <span className="text-accent font-semibold">BCA filter note:</span> Referrals bypass the ATS filter. At companies that list "B.Tech/B.E." in requirements, a referral from someone inside the team is the most reliable way in — the recruiter sees the application differently when it comes with a vouch. Quality of the referral matters more than the company's stated policy.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => {
          const exit = linkedExit(c.name);
          return (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="h-full" interactive>
                <CardContent noHeader className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted shrink-0" />
                      <p className="text-sm font-medium truncate">{c.name}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                  </div>
                  {(c.category || c.hiring_difficulty) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {c.category}
                        </Badge>
                      )}
                      {c.hiring_difficulty && (
                        <Badge variant={DIFFICULTY_VARIANT[c.hiring_difficulty]} className="text-[10px] capitalize">
                          {c.hiring_difficulty} to hire
                        </Badge>
                      )}
                    </div>
                  )}
                  {c.hiring_stage && (
                    <p className="text-xs text-muted">{c.hiring_stage}</p>
                  )}
                  {exit && (
                    <p className={cn("text-xs text-muted", !c.category && !c.hiring_stage && "pt-0")}>
                      Referenced at Exit {exit.exit_code} — {exit.job_level}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState message="No matches." />
        )}
      </div>
    </div>
  );
}
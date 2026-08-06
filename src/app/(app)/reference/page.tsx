"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useExitLadder,
  useRoadmapMetadata,
  useCompanies,
  useOrientation,
  useWhyThisWorks,
  useMasterPhaseTable,
  useHoursBreakdown,
  useProgramTotal,
  useDifficultyRamp,
  useSourceDiscrepancies,
  useSkillTracks,
  useNavigationNotes,
  useMonthByMonth,
  usePhaseChecklist,
  usePhasesWithProgress,
} from "@/lib/hooks/use-roadmap";
import { useUser } from "@/lib/hooks/use-user";
import { HoursCalculator } from "@/components/roadmap/hours-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  Building2,
  Layers,
  FolderGit2,
  Dumbbell,
  Trophy,
  ListChecks,
  Compass,
  ShieldCheck,
  LayoutGrid,
  Route,
  CalendarDays,
  Briefcase,
  GraduationCap,
  IndianRupee,
} from "lucide-react";

const BAND_ORDER = ["Foundation", "Core", "Advanced", "Expert"];
const BAND_COLOR: Record<string, string> = {
  Foundation: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Core: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Advanced: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Expert: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function ReferencePage() {
  const { user } = useUser();
  const { data: exitLadder, isLoading } = useExitLadder();
  const { data: metadata } = useRoadmapMetadata();
  const { data: companies } = useCompanies();
  const { data: orientation } = useOrientation();
  const { data: whyThisWorks } = useWhyThisWorks();
  const { data: masterPhaseTable } = useMasterPhaseTable();
  const { data: hoursBreakdown } = useHoursBreakdown();
  const { data: programTotal } = useProgramTotal();
  const { data: difficultyRamp } = useDifficultyRamp();
  const { data: sourceDiscrepancies } = useSourceDiscrepancies();
  const { data: skillTracks } = useSkillTracks();
  const { data: navigationNotes } = useNavigationNotes();
  const { data: monthByMonth } = useMonthByMonth();
  const { data: phaseChecklist } = usePhaseChecklist();
  const { phases: userPhases } = usePhasesWithProgress(user?.id);

  const [query, setQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");

  const filteredCompanies = useMemo(() => {
    if (!companyQuery) return companies ?? [];
    const q = companyQuery.toLowerCase();
    return (companies ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, companyQuery]);

  const companiesByCategory = useMemo(() => {
    const map = new Map<string, NonNullable<typeof companies>>();
    filteredCompanies.forEach((c) => {
      const key = c.category ?? "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCompanies]);

  // Stage 3 — Item 22: totals feeding the interactive Hours Calculator.
  // Falls back to roadmap_metadata.total_realistic_hours (source-stated,
  // works even signed out) when no per-topic hours have loaded yet;
  // otherwise sums the person's own topic estimated_hours, same computation
  // Statistics already uses for its "Completed hours"/"Remaining hours" figures.
  const allUserTopics = useMemo(() => userPhases.flatMap((p) => p.topics), [userPhases]);
  const totalHours =
    allUserTopics.length > 0
      ? allUserTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)
      : metadata?.total_realistic_hours ?? 0;
  const completedHours = allUserTopics
    .filter((t) => t.progress?.completed)
    .reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

  const filtered = useMemo(() => {
    if (!query) return exitLadder ?? [];
    const q = query.toLowerCase();
    return (exitLadder ?? []).filter(
      (e) =>
        e.exit_code.toLowerCase().includes(q) ||
        e.name?.toLowerCase().includes(q) ||
        e.target_companies?.toLowerCase().includes(q) ||
        e.job_level?.toLowerCase().includes(q)
    );
  }, [exitLadder, query]);

  const rampByBand = useMemo(() => {
    const map = new Map<string, NonNullable<typeof difficultyRamp>>();
    (difficultyRamp ?? []).forEach((r) => {
      if (!map.has(r.band)) map.set(r.band, []);
      map.get(r.band)!.push(r);
    });
    return map;
  }, [difficultyRamp]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reference</h1>
        <p className="text-sm text-muted">
          The roadmap&apos;s full Part I — orientation, dashboards, navigation layers, and
          pacing views — not just a stats summary.
        </p>
      </div>

      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1">Total phases</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_phases}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><Layers className="h-3 w-3" /> Total stages</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_stages ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1">Total topics</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_topics}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1">Total hours</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_realistic_hours}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><FolderGit2 className="h-3 w-3" /> Stage projects</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_stage_projects ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Stage exercises</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_stage_exercises ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><Trophy className="h-3 w-3" /> Capstones</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_capstones ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Companies referenced</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.total_companies ?? companies?.length ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1">~Months @ 40h/wk</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.months_at_40hrs_week}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><ListChecks className="h-3 w-3" /> DSA Easy target</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.dsa_easy_target}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent noHeader>
              <p className="text-xs text-muted mb-1 flex items-center gap-1"><ListChecks className="h-3 w-3" /> DSA Medium target</p>
              <p className="text-2xl font-bold font-mono-tabular">{metadata.dsa_medium_target}</p>
            </CardContent>
          </Card>
          {metadata.source_stated_hours && (
            <Card>
              <CardContent noHeader>
                <p className="text-xs text-muted mb-1">Source-stated hours</p>
                <p className="text-2xl font-bold font-mono-tabular">{metadata.source_stated_hours}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="orientation" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orientation" className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" /> Orientation
          </TabsTrigger>
          <TabsTrigger value="why" className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Why This Works
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Dashboards
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5" /> Navigation
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="career" className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> Career Guidance
          </TabsTrigger>
          <TabsTrigger value="degree" className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Degree Filter
          </TabsTrigger>
          <TabsTrigger value="exits">Exit Ladder</TabsTrigger>
          <TabsTrigger value="salary" className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" /> Salary Reference
          </TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        {/* ---------------- ORIENTATION ---------------- */}
        <TabsContent value="orientation" className="flex flex-col gap-6 mt-4">
          {!orientation ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{orientation.overview}</p>
                </CardContent>
              </Card>

              {orientation.who_is_this_for.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Who is this for?</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="grid sm:grid-cols-2 gap-4">
                      {orientation.who_is_this_for.map((row) => (
                        <div key={row.category}>
                          <dt className="text-xs text-muted mb-0.5">{row.category}</dt>
                          <dd className="text-sm">{row.details}</dd>
                        </div>
                      ))}
                    </dl>
                    {orientation.key_note && (
                      <p className="text-xs text-muted mt-4 pt-4 border-t border-border">
                        <span className="font-medium text-foreground">Key note: </span>
                        {orientation.key_note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {orientation.job_market_case && (
                <Card>
                  <CardHeader><CardTitle>How this will get you a job in a fierce market</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{orientation.job_market_case}</p>
                  </CardContent>
                </Card>
              )}

              {orientation.build_in_public_guide && (
                <Card>
                  <CardHeader><CardTitle>How to build in public</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{orientation.build_in_public_guide}</p>
                  </CardContent>
                </Card>
              )}

              {orientation.quick_start_checklist.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Quick start checklist</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="flex flex-col gap-2">
                      {orientation.quick_start_checklist.map((item) => (
                        <li key={item.step} className="flex items-start gap-3 text-sm">
                          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-mono-tabular font-semibold mt-0.5">
                            {item.step}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ol>
                    {orientation.critical_advice && (
                      <p className="text-xs text-muted mt-4 pt-4 border-t border-border italic leading-relaxed">
                        &ldquo;{orientation.critical_advice}&rdquo;
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {orientation.weekly_pace_options.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Choose your timeline</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted">
                          <th className="py-2 pr-4">Weekly hours</th>
                          <th className="py-2 pr-4">Realistic timeline</th>
                          <th className="py-2 pr-4">Best fit for</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orientation.weekly_pace_options.map((row) => (
                          <tr key={row.weekly_hours} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-4 font-mono-tabular">{row.weekly_hours}</td>
                            <td className="py-2.5 pr-4 text-accent font-mono-tabular">{row.timeline}</td>
                            <td className="py-2.5 pr-4 text-muted">{row.best_fit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <HoursCalculator totalHours={totalHours} completedHours={completedHours} />

              {orientation.decision_matrix.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Decision matrix — which project to build</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted">
                          <th className="py-2 pr-4">If you want...</th>
                          <th className="py-2 pr-4">Build this</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orientation.decision_matrix.map((row) => (
                          <tr key={row.if_you_want} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-4 text-muted">{row.if_you_want}</td>
                            <td className="py-2.5 pr-4 font-medium">{row.build_this}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {orientation.decision_rule && (
                      <p className="text-xs text-muted mt-4 pt-4 border-t border-border">
                        <span className="font-medium text-foreground">The rule: </span>
                        {orientation.decision_rule}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------- WHY THIS WORKS ---------------- */}
        <TabsContent value="why" className="mt-4">
          {!whyThisWorks ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Every roadmap fails the same handful of ways</CardTitle>
                <p className="text-xs text-muted mt-1">
                  The specific mechanism already built into this curriculum that prevents each one.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {whyThisWorks.map((row) => (
                  <div key={row.id} className="py-4 first:pt-0 last:pb-0 grid sm:grid-cols-2 gap-2 sm:gap-6">
                    <p className="text-sm font-medium">{row.failure_mode}</p>
                    <p className="text-sm text-muted">{row.mechanism}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- DASHBOARDS ---------------- */}
        <TabsContent value="dashboards" className="flex flex-col gap-6 mt-4">
          {!masterPhaseTable ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle>Master phase table</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="py-2 pr-4">Phase</th>
                        <th className="py-2 pr-4">Focus</th>
                        <th className="py-2 pr-4">Weeks</th>
                        <th className="py-2 pr-4">Header hrs</th>
                        <th className="py-2 pr-4">Realistic hrs</th>
                        <th className="py-2 pr-4">Band</th>
                        <th className="py-2 pr-4">Track</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterPhaseTable.map((row) => (
                        <tr key={row.phase} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4"><Badge variant="outline" className="font-mono-tabular">{row.phase}</Badge></td>
                          <td className="py-2 pr-4">{row.focus}</td>
                          <td className="py-2 pr-4 text-muted font-mono-tabular">{row.weeks}</td>
                          <td className="py-2 pr-4 text-muted font-mono-tabular">{row.header_hours}</td>
                          <td className="py-2 pr-4 text-accent font-mono-tabular">{row.realistic_hours}</td>
                          <td className="py-2 pr-4">
                            {row.band && (
                              <Badge variant="outline" className={`text-xs font-normal ${BAND_COLOR[row.band] ?? ""}`}>
                                {row.band}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-muted text-xs">{row.track}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {programTotal && (
                <Card>
                  <CardHeader><CardTitle>Realistic hours — methodology & recalculation</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted mb-1">Original stated</p>
                        <p className="font-mono-tabular font-semibold">{programTotal.original_stated}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Raw bottom-up sum</p>
                        <p className="font-mono-tabular font-semibold">{programTotal.raw_bottom_up_sum}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Realistic total</p>
                        <p className="font-mono-tabular font-semibold text-accent">{programTotal.realistic_total}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Net change</p>
                        <p className="font-mono-tabular font-semibold">{programTotal.net_change}</p>
                      </div>
                    </div>
                    {hoursBreakdown && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted">
                              <th className="py-2 pr-4">Phase</th>
                              <th className="py-2 pr-4">Learn</th>
                              <th className="py-2 pr-4">Problems</th>
                              <th className="py-2 pr-4">Project</th>
                              <th className="py-2 pr-4">ClientSync</th>
                              <th className="py-2 pr-4">Realistic total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hoursBreakdown.map((row) => (
                              <tr key={row.phase} className="border-b border-border last:border-0">
                                <td className="py-2 pr-4 font-mono-tabular">{row.phase}</td>
                                <td className="py-2 pr-4 text-muted font-mono-tabular">{row.learn}</td>
                                <td className="py-2 pr-4 text-muted font-mono-tabular">{row.problems}</td>
                                <td className="py-2 pr-4 text-muted font-mono-tabular">{row.project}</td>
                                <td className="py-2 pr-4 text-muted font-mono-tabular">{row.clientsync}</td>
                                <td className="py-2 pr-4 text-accent font-mono-tabular font-medium">{row.realistic_total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {rampByBand.size > 0 && (
                <Card>
                  <CardHeader><CardTitle>Difficulty ramp</CardTitle></CardHeader>
                  <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {BAND_ORDER.filter((b) => rampByBand.has(b)).map((band) => (
                      <div key={band}>
                        <Badge variant="outline" className={`mb-2 text-xs font-normal ${BAND_COLOR[band] ?? ""}`}>
                          {band}
                        </Badge>
                        <ul className="flex flex-col gap-1.5">
                          {rampByBand.get(band)!.map((row) => (
                            <li key={row.id} className="text-xs text-muted">
                              <span className="font-mono-tabular text-foreground">{row.phase}</span> — {row.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {sourceDiscrepancies && sourceDiscrepancies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Source discrepancies flagged in the document</CardTitle>
                    <p className="text-xs text-muted mt-1">
                      Several phases show a mismatch between the header&apos;s stated hours and the phase&apos;s own topic-table total.
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y divide-border">
                    {sourceDiscrepancies.map((row) => (
                      <div key={row.id} className="py-3 first:pt-0 last:pb-0 flex gap-3">
                        <Badge variant="outline" className="font-mono-tabular shrink-0">{row.phase}</Badge>
                        <p className="text-sm text-muted">{row.discrepancy}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------- NAVIGATION ---------------- */}
        <TabsContent value="navigation" className="flex flex-col gap-6 mt-4">
          {!skillTracks ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle>Skill-track index</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {skillTracks.map((track) => (
                    <div key={track.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium mb-2">{track.track}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {track.phases.map((p) => (
                          <Badge key={p} variant="outline" className="font-mono-tabular text-xs font-normal">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {navigationNotes?.dsa_spine_index && (
                <Card>
                  <CardHeader><CardTitle>DSA-spine index (Phase 08)</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
                      {navigationNotes.dsa_spine_index}
                    </p>
                  </CardContent>
                </Card>
              )}

              {navigationNotes?.mvp_fast_path && navigationNotes.mvp_fast_path.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>MVP fast-path index</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {navigationNotes.mvp_fast_path.map((line, i) => (
                      <p key={i} className="text-sm text-muted">{line}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------- TIMELINE ---------------- */}
        <TabsContent value="timeline" className="flex flex-col gap-6 mt-4">
          {!monthByMonth ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Month-by-month view</CardTitle>
                  <p className="text-xs text-muted mt-1">@ 40 hrs/wk baseline — recalculated realistic hours, not the source document&apos;s header figures.</p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="py-2 pr-4">Month</th>
                        <th className="py-2 pr-4">Phase(s) active</th>
                        <th className="py-2 pr-4">Focus</th>
                        <th className="py-2 pr-4">Realistic hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthByMonth.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 font-mono-tabular">{row.month}</td>
                          <td className="py-2 pr-4"><Badge variant="outline" className="font-mono-tabular text-xs font-normal">{row.phases_active}</Badge></td>
                          <td className="py-2 pr-4 text-muted">{row.focus}</td>
                          <td className="py-2 pr-4 text-accent font-mono-tabular">{row.realistic_hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {phaseChecklist && (
                <Card>
                  <CardHeader><CardTitle>Phase checklist — tick sheet</CardTitle></CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-2">
                    {phaseChecklist.map((row) => (
                      <div key={row.phase} className="flex items-center gap-3 text-sm py-1.5">
                        <span className="h-4 w-4 rounded border border-border shrink-0" />
                        <span className="font-mono-tabular text-xs text-muted w-10 shrink-0">{row.phase}</span>
                        <span className="flex-1 truncate">{row.title}</span>
                        <span className="text-xs text-muted font-mono-tabular shrink-0">{row.hours}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------- CAREER GUIDANCE ---------------- */}
        <TabsContent value="career" className="flex flex-col gap-6 mt-4">
          {!orientation ? (
            <Skeleton className="h-64 w-full" />
          ) : orientation.job_market_case ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> How this will get you a job in a fierce market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
                  {orientation.job_market_case}
                </p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState message="No career guidance found." />
          )}
        </TabsContent>

        {/* ---------------- DEGREE FILTER ---------------- */}
        <TabsContent value="degree" className="flex flex-col gap-6 mt-4">
          {!orientation ? (
            <Skeleton className="h-64 w-full" />
          ) : orientation.key_note ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Degree filter — BCA vs. MCA
                </CardTitle>
                <p className="text-xs text-muted mt-1">
                  Which target companies gate on degree, and which don&apos;t.
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
                  {orientation.key_note}
                </p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState message="No degree filter guidance found." />
          )}
        </TabsContent>

        {/* ---------------- EXIT LADDER ---------------- */}
        <TabsContent value="exits" className="flex flex-col gap-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Search exit points, companies, roles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Exit ladder & salary bands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 pr-4">Exit</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Salary range</th>
                      <th className="py-2 pr-4">Target companies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.exit_code} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="font-mono-tabular">
                            {e.exit_code}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 font-medium">{e.job_level}</td>
                        <td className="py-3 pr-4 font-mono-tabular text-accent">{e.salary_range}</td>
                        <td className="py-3 pr-4 text-muted text-xs max-w-xs">{e.target_companies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <EmptyState message="No matches." />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- SALARY REFERENCE ---------------- */}
        <TabsContent value="salary" className="flex flex-col gap-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4" /> Salary reference by exit point
              </CardTitle>
              <p className="text-xs text-muted mt-1">
                Same salary_range data as the Exit Ladder, presented as its own quick-reference table.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 pr-4">Exit</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Salary range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(exitLadder ?? []).map((e) => (
                      <tr key={e.exit_code} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="font-mono-tabular">
                            {e.exit_code}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 font-medium">{e.job_level}</td>
                        <td className="py-3 pr-4 font-mono-tabular text-accent">{e.salary_range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!exitLadder || exitLadder.length === 0) && (
                  <EmptyState message="No exit ladder data." />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- COMPANY REFERENCE ---------------- */}
        <TabsContent value="companies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Company reference
              </CardTitle>
              <p className="text-xs text-muted mt-1">
                Every company referenced in the roadmap, grouped by category.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  placeholder="Filter companies…"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {!companies ? (
                <Skeleton className="h-24 w-full" />
              ) : companiesByCategory.length === 0 ? (
                <EmptyState message="No matches." />
              ) : (
                <div className="flex flex-col gap-4">
                  {companiesByCategory.map(([category, group]) => (
                    <div key={category}>
                      <p className="text-xs text-muted mb-2">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.map((c) => (
                          <Link key={c.id} href={`/companies/${c.id}`}>
                            <Badge variant="outline" className="text-xs font-normal hover:border-accent/40">
                              {c.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
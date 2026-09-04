"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutDashboard, Timer, Target, Briefcase, NotebookPen, Gauge, Sun, Download, Brain, CalendarClock } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { useTheme } from "@/lib/hooks/use-theme";
import {
  useRoadmap,
  useExitLadder,
  useCompanies,
  useClientSyncMilestones,
  useSkillTracks,
  useAllTopicNotes,
  useTechnologies,
} from "@/lib/hooks/use-roadmap";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useGoals } from "@/lib/hooks/use-goals";
import { useInterviewQuestions } from "@/lib/hooks/use-interview-prep";
import type { ClientSyncMilestone, DailyLog } from "@/types/database";

// Groups whose full lists render unconditionally are fine at their real
// sizes (phases: 21, exit points: 9, companies: 14, ClientSync: 7, projects:
// ~179, skills: skill-track count) — cmdk needs every Command.Item mounted
// to score it against the query, filtering happens after mount, not before.
// Topics (375) and exercises (358) are the two groups big enough that
// mounting all of them before the person has typed anything would be real
// DOM weight for no benefit, so those two are capped only in the
// *empty-query* state; once there's a query, the full set is searched
// (cmdk filters what's visible, not what's mounted).
const EMPTY_QUERY_PREVIEW_LIMIT = 30;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { user } = useUser();
  const { data: roadmap } = useRoadmap();
  const { data: exitLadder } = useExitLadder();
  const { data: companies } = useCompanies();
  const { data: milestonesRaw } = useClientSyncMilestones();
  const milestones = (milestonesRaw ?? []) as ClientSyncMilestone[];
  const { data: skillTracks } = useSkillTracks();
  const { data: dailyLogs } = useDailyLogs(user?.id);
  const { data: topicNotes } = useAllTopicNotes(user?.id);
  const { data: technologies } = useTechnologies();
  const { data: applications } = useCareerTracker(user?.id);
  const { data: goals } = useGoals(user?.id);
  const { data: interviewQuestions } = useInterviewQuestions();
  const { theme, setTheme } = useTheme(user?.id);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const phases = roadmap?.phases ?? [];
  const topics = useMemo(() => roadmap?.topics ?? [], [roadmap]);
  const exercises = roadmap?.stageExercises ?? [];
  const stageProjects = roadmap?.stageProjects ?? [];
  const stages = useMemo(() => roadmap?.stages ?? [], [roadmap]);

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const hasQuery = query.trim() !== "";
  const visibleTopics = hasQuery ? topics : topics.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);
  const visibleExercises = hasQuery ? exercises : exercises.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);
  const visibleProjects = hasQuery ? stageProjects : stageProjects.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);

  // Journal entries only ever show once there's an actual query — unlike
  // the other groups (which preview a capped slice with nothing typed),
  // listing personal journal content by default would put private
  // learned/mistakes/wins text on screen just from opening ⌘K. cmdk's
  // built-in filtering can't search across a log's four separate text
  // fields as one signal, so each field is folded into a single `value`
  // string per entry and matched against the query manually here instead.
  const matchingLogs = useMemo(() => {
    if (!hasQuery || !dailyLogs) return [];
    const q = query.trim().toLowerCase();
    return dailyLogs
      .filter((l: DailyLog) => {
        const haystack = [l.learned, l.mistakes, l.wins, l.tomorrow_goal, l.note]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [hasQuery, dailyLogs, query]);

  const matchingNotes = useMemo(() => {
    if (!hasQuery || !topicNotes) return [];
    const q = query.trim().toLowerCase();
    const topicTitleById = new Map(topics.map((t) => [t.id, t.title]));
    return topicNotes
      .filter((n) => n.note.toLowerCase().includes(q))
      .map((n) => ({ ...n, topicTitle: topicTitleById.get(n.topic_id) ?? "Topic" }))
      .slice(0, 8);
  }, [hasQuery, topicNotes, query, topics]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-standard w-full max-w-xs"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search roadmap…</span>
        <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono-tabular">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-lg border border-border glass-panel shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Global search" shouldFilter>
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="h-4 w-4 text-muted" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search phases, topics, projects, exercises, exit points, salary, companies, skills…"
                  className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted">
                  No results found.
                </Command.Empty>

                {/* Actions — the genuinely missing piece per the Command
                    Palette spec (search/navigation already existed). Each
                    action routes to a real, working page/feature; nothing
                    here is a fake shortcut that doesn't actually do
                    anything — e.g. "Export data" navigates to Settings
                    rather than firing a half-working export with no data
                    loaded in this component's scope. */}
                <Command.Group heading="Actions" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1">
                  <Command.Item
                    value="go to dashboard start today's mission"
                    onSelect={() => { router.push("/dashboard"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-muted" /> Go to Dashboard
                  </Command.Item>
                  <Command.Item
                    value="start focus session timer pomodoro"
                    onSelect={() => { router.push("/dashboard#focus"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Timer className="h-3.5 w-3.5 text-muted" /> Start focus session
                  </Command.Item>
                  <Command.Item
                    value="open daily plan adaptive planner"
                    onSelect={() => { router.push("/daily-plan"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <CalendarClock className="h-3.5 w-3.5 text-muted" /> Open daily plan
                  </Command.Item>
                  <Command.Item
                    value="add goal new goal"
                    onSelect={() => { router.push("/goals"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Target className="h-3.5 w-3.5 text-muted" /> Add goal
                  </Command.Item>
                  <Command.Item
                    value="add job application career tracker"
                    onSelect={() => { router.push("/career"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-muted" /> Add job application
                  </Command.Item>
                  <Command.Item
                    value="add journal entry"
                    onSelect={() => { router.push("/journal"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <NotebookPen className="h-3.5 w-3.5 text-muted" /> Add journal entry
                  </Command.Item>
                  <Command.Item
                    value="review skills skill evidence"
                    onSelect={() => { router.push("/skills"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Gauge className="h-3.5 w-3.5 text-muted" /> Review skills
                  </Command.Item>
                  <Command.Item
                    value="open revision"
                    onSelect={() => { router.push("/revision"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Gauge className="h-3.5 w-3.5 text-muted" /> Open revision
                  </Command.Item>
                  <Command.Item
                    value="open interview prep practice questions"
                    onSelect={() => { router.push("/interview-prep"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Brain className="h-3.5 w-3.5 text-muted" /> Open interview prep
                  </Command.Item>
                  <Command.Item
                    value="open career job readiness"
                    onSelect={() => { router.push("/job-readiness"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Gauge className="h-3.5 w-3.5 text-muted" /> Open job readiness
                  </Command.Item>
                  <Command.Item
                    value="toggle theme dark light mode"
                    onSelect={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Sun className="h-3.5 w-3.5 text-muted" /> Toggle theme
                  </Command.Item>
                  <Command.Item
                    value="export data backup settings"
                    onSelect={() => { router.push("/settings"); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                  >
                    <Download className="h-3.5 w-3.5 text-muted" /> Export data
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Phases" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1">
                  {phases.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`${p.phase_number} ${p.title}`}
                      onSelect={() => {
                        router.push(`/roadmap#${p.id}`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      <span className="font-mono-tabular text-xs text-muted">{p.phase_number}</span>
                      {p.title}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Topics" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {visibleTopics.map((t) => (
                    <Command.Item
                      key={t.id}
                      value={t.title}
                      onSelect={() => {
                        router.push(`/roadmap/topic/${t.id}`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {t.title}
                    </Command.Item>
                  ))}
                  {!hasQuery && topics.length > EMPTY_QUERY_PREVIEW_LIMIT && (
                    <p className="px-2 py-1.5 text-xs text-muted">
                      +{topics.length - EMPTY_QUERY_PREVIEW_LIMIT} more — type to search all {topics.length}
                    </p>
                  )}
                </Command.Group>

                <Command.Group heading="Exercises" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {visibleExercises.map((ex) => {
                    const stage = stageById.get(ex.stage_id);
                    return (
                      <Command.Item
                        key={ex.id}
                        value={ex.description}
                        onSelect={() => {
                          router.push(`/roadmap/stage/${ex.stage_id}`);
                          setOpen(false);
                        }}
                        className="flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                      >
                        <span className="line-clamp-1">{ex.description}</span>
                        {stage && <span className="text-[11px] text-muted">{stage.title}</span>}
                      </Command.Item>
                    );
                  })}
                  {!hasQuery && exercises.length > EMPTY_QUERY_PREVIEW_LIMIT && (
                    <p className="px-2 py-1.5 text-xs text-muted">
                      +{exercises.length - EMPTY_QUERY_PREVIEW_LIMIT} more — type to search all {exercises.length}
                    </p>
                  )}
                </Command.Group>

                <Command.Group heading="Projects" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {visibleProjects.map((p) => {
                    const stage = stageById.get(p.stage_id);
                    return (
                      <Command.Item
                        key={p.id}
                        value={p.name}
                        onSelect={() => {
                          router.push(`/projects`);
                          setOpen(false);
                        }}
                        className="flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                      >
                        <span className="line-clamp-1">{p.name}</span>
                        {stage && <span className="text-[11px] text-muted">{stage.title}</span>}
                      </Command.Item>
                    );
                  })}
                  {!hasQuery && stageProjects.length > EMPTY_QUERY_PREVIEW_LIMIT && (
                    <p className="px-2 py-1.5 text-xs text-muted">
                      +{stageProjects.length - EMPTY_QUERY_PREVIEW_LIMIT} more — type to search all {stageProjects.length}
                    </p>
                  )}
                </Command.Group>

                <Command.Group heading="Exit points & salary" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(exitLadder ?? []).map((e) => (
                    <Command.Item
                      key={e.exit_code}
                      value={`Exit ${e.exit_code} ${e.name ?? ""} ${e.job_level ?? ""} ${e.salary_range ?? ""}`}
                      onSelect={() => {
                        router.push(`/exit-ladder`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      <span className="font-mono-tabular text-xs text-accent shrink-0">{e.exit_code}</span>
                      <span className="flex-1">{e.name ?? e.job_level}</span>
                      {e.salary_range && (
                        <span className="text-xs text-muted font-mono-tabular shrink-0">{e.salary_range}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="ClientSync milestones" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {milestones.map((m) => (
                    <Command.Item
                      key={m.id}
                      value={m.description}
                      onSelect={() => {
                        router.push(`/clientsync`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {m.description}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Companies" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(companies ?? []).map((c) => (
                    <Command.Item
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        router.push(`/companies/${c.id}`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {c.name}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Skills" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(skillTracks ?? []).map((s) => (
                    <Command.Item
                      key={s.id}
                      value={s.track}
                      onSelect={() => {
                        router.push(`/reference`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {s.track}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Technologies" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(hasQuery ? technologies ?? [] : (technologies ?? []).slice(0, EMPTY_QUERY_PREVIEW_LIMIT)).map((t) => (
                    <Command.Item
                      key={t.id}
                      value={t.name}
                      onSelect={() => {
                        router.push(`/technologies/${t.id}`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {t.name}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Goals" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(goals ?? []).map((g) => (
                    <Command.Item
                      key={g.id}
                      value={g.title}
                      onSelect={() => {
                        router.push(`/goals`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {g.title}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Jobs" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                  {(applications ?? []).map((a) => (
                    <Command.Item
                      key={a.id}
                      value={[a.company, a.role].filter(Boolean).join(" ")}
                      onSelect={() => {
                        router.push(`/career`);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                    >
                      {a.company}
                      {a.role ? ` — ${a.role}` : ""}
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Interview questions only render once there's a query,
                    same privacy-conscious reasoning as journal entries
                    above — the full question bank listed by default on
                    every ⌘K open would be noisy, and unlike phases/topics
                    there's no natural small subset to preview. */}
                {hasQuery && (
                  <Command.Group heading="Interview questions" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                    {(interviewQuestions ?? []).slice(0, 8).map((q) => (
                      <Command.Item
                        key={q.id}
                        value={q.question}
                        onSelect={() => {
                          router.push(`/interview-prep`);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                      >
                        {q.question}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {matchingLogs.length > 0 && (
                  <Command.Group heading="Journal" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                    {matchingLogs.map((l) => {
                      // Matching already happened in matchingLogs above
                      // (manual substring check, not cmdk's filter) — the
                      // Command.Item `value` is set to the current query
                      // itself so cmdk's own filtering never re-excludes an
                      // item this component already decided belongs here.
                      const snippet = [l.wins, l.learned, l.mistakes].find(Boolean) ?? l.note ?? "";
                      return (
                        <Command.Item
                          key={l.date}
                          value={query}
                          onSelect={() => {
                            router.push(`/journal`);
                            setOpen(false);
                          }}
                          className="flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                        >
                          <span className="line-clamp-1">{snippet}</span>
                          <span className="text-[11px] text-muted">
                            {new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {matchingNotes.length > 0 && (
                  <Command.Group heading="Topic notes" className="text-[11px] uppercase tracking-wide text-muted px-2 py-1 mt-2">
                    {matchingNotes.map((n) => (
                      <Command.Item
                        key={n.id}
                        value={query}
                        onSelect={() => {
                          router.push(`/roadmap`);
                          setOpen(false);
                        }}
                        className="flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-surface-2"
                      >
                        <span className="line-clamp-1">{n.note}</span>
                        <span className="text-[11px] text-muted">{n.topicTitle}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}

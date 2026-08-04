"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useRoadmap,
  useExitLadder,
  useCompanies,
  useClientSyncMilestones,
  useSkillTracks,
} from "@/lib/hooks/use-roadmap";
import type { ClientSyncMilestone } from "@/types/database";

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
  const topics = roadmap?.topics ?? [];
  const exercises = roadmap?.stageExercises ?? [];
  const stageProjects = roadmap?.stageProjects ?? [];
  const stages = useMemo(() => roadmap?.stages ?? [], [roadmap]);

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const hasQuery = query.trim() !== "";
  const visibleTopics = hasQuery ? topics : topics.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);
  const visibleExercises = hasQuery ? exercises : exercises.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);
  const visibleProjects = hasQuery ? stageProjects : stageProjects.slice(0, EMPTY_QUERY_PREVIEW_LIMIT);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors w-full max-w-xs"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search roadmap…</span>
        <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono-tabular">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl overflow-hidden"
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
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}

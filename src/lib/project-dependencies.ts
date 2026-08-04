/**
 * Stage 3 — Item 19: Project Dependencies Display.
 *
 * No direct project<->technology link exists in the schema (confirmed
 * during Stage 2's Technology Pages work — stage_projects has no join
 * table to technologies). Rather than add a second, hand-authored
 * allowlist duplicating scripts/parse_roadmap.py's KNOWN_TECHNOLOGIES in
 * TypeScript, this matches a project's own `description` text against the
 * live `technologies.name` list already fetched via useTechnologies() —
 * the same seeded set Technology Pages renders. One source of truth: if a
 * technology is added to the allowlist and re-seeded, project dependency
 * badges pick it up automatically with no second edit.
 *
 * Matching is whole-word, case-insensitive, longest-name-first (so "Next.js"
 * matches before a hypothetical shorter "JS"-style entry could steal the
 * substring) — same ordering precaution the Python parser uses for its own
 * regex alternation.
 */

import type { Technology } from "@/types/database";

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Given a project's free-text description and the full live technologies
 * list, return the subset of technologies mentioned in that description —
 * in original casing, deduped, in the order they first appear.
 */
export function matchTechnologiesInText(text: string, technologies: Technology[]): Technology[] {
  if (!text || technologies.length === 0) return [];

  const sorted = [...technologies].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp("\\b(" + sorted.map((t) => escapeRegExp(t.name)).join("|") + ")\\b", "gi");

  const seen = new Set<string>();
  const matches: Technology[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const found = sorted.find((t) => t.name.toLowerCase() === m![1].toLowerCase());
    if (found && !seen.has(found.id)) {
      seen.add(found.id);
      matches.push(found);
    }
  }
  return matches;
}

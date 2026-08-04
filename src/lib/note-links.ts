import type { TopicNote, Topic, StageProject, ClientSyncMilestone, StageExercise } from "@/types/database";

// Stage 4 — Item 25: [[...]] links resolve against four entity kinds now,
// not just topics. A single flat registry (title/name -> entity) keeps the
// matching logic in parseNoteLinks entity-agnostic — it doesn't need to know
// there are four kinds, just that bracketed text either resolves to some
// entity or doesn't.
//
// Follow-up fix: "exercise" was named explicitly in the original plan
// ("topics, exercises, projects, and ClientSync features all mutually
// linked") but was missing from this type entirely — topics/projects/
// milestones were wired, exercises weren't. Added here using the same
// pattern as ClientSync milestones: exercises have no short title field,
// so their full `description` is the matchable text.
export type LinkableEntityType = "topic" | "project" | "clientsync_milestone" | "exercise";

export interface LinkableEntity {
  type: LinkableEntityType;
  id: string;
  /** Human-readable label shown in "Linked from" / "Referenced in" panels. */
  label: string;
}

/**
 * Builds the combined lookup used by parseNoteLinks: topic titles, stage
 * project names, ClientSync milestone descriptions, and stage exercise
 * descriptions, all keyed lowercase. Milestones and exercises don't have a
 * short title field, so their full description is the matchable text (same
 * as how projects match on `name`, which is short/title-like already,
 * unlike a project's `description`).
 */
export function buildLinkRegistry(
  topics: Topic[],
  projects: StageProject[],
  milestones: ClientSyncMilestone[],
  exercises: StageExercise[] = []
): Map<string, LinkableEntity> {
  const registry = new Map<string, LinkableEntity>();
  for (const t of topics) {
    registry.set(t.title.toLowerCase(), { type: "topic", id: t.id, label: t.title });
  }
  for (const p of projects) {
    registry.set(p.name.toLowerCase(), { type: "project", id: p.id, label: p.name });
  }
  for (const m of milestones) {
    registry.set(m.description.toLowerCase(), {
      type: "clientsync_milestone",
      id: m.id,
      label: m.description,
    });
  }
  for (const ex of exercises) {
    registry.set(ex.description.toLowerCase(), {
      type: "exercise",
      id: ex.id,
      label: ex.description,
    });
  }
  return registry;
}

export interface ParsedNoteSegment {
  text: string;
  linkedEntity: LinkableEntity | null; // null if the [[...]] text didn't match any real entity
}

const LINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Splits note text into plain-text and link segments. A [[Name]] only
 * becomes a real link if it exact-matches (case-insensitive) an actual
 * topic title, stage project name, ClientSync milestone description, or
 * stage exercise description — no fuzzy matching, since silently linking
 * to the "closest" entity could point at the wrong one without the person
 * noticing. An unmatched [[...]] renders as plain bracketed text instead
 * of a broken link.
 */
export function parseNoteLinks(text: string, registry: Map<string, LinkableEntity>): ParsedNoteSegment[] {
  const segments: ParsedNoteSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), linkedEntity: null });
    }
    const name = match[1].trim();
    const target = registry.get(name.toLowerCase());
    segments.push({
      text: match[0],
      linkedEntity: target ?? null,
    });
    lastIndex = LINK_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), linkedEntity: null });
  }
  return segments;
}

export interface Backlink {
  note: TopicNote;
  sourceTopic: Topic;
}

/**
 * Finds every note (across all topics, not just the current one) whose
 * text contains a [[...]] link that resolves to the given target entity.
 * Requires the full note set and link registry up front — this is why
 * backlinks need a user-wide notes fetch, not the per-topic fetch the note
 * UI already does. Generalized beyond topics (Stage 4 — Item 25): pass any
 * LinkableEntity (a topic, a stage project, or a ClientSync milestone) as
 * the target, and this finds every note anywhere that references it.
 */
export function computeBacklinks(
  target: LinkableEntity,
  allNotes: TopicNote[],
  allTopics: Topic[],
  registry: Map<string, LinkableEntity>
): Backlink[] {
  const topicsById = new Map(allTopics.map((t) => [t.id, t]));

  const result: Backlink[] = [];
  for (const note of allNotes) {
    // A note doesn't "backlink" the topic it's already attached to.
    if (target.type === "topic" && note.topic_id === target.id) continue;
    const segments = parseNoteLinks(note.note, registry);
    const linksToTarget = segments.some(
      (s) => s.linkedEntity?.type === target.type && s.linkedEntity.id === target.id
    );
    if (linksToTarget) {
      const sourceTopic = topicsById.get(note.topic_id);
      if (sourceTopic) result.push({ note, sourceTopic });
    }
  }
  return result;
}

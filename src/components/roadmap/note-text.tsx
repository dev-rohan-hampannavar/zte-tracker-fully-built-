"use client";

import Link from "next/link";
import { parseNoteLinks, type LinkableEntity } from "@/lib/note-links";

/**
 * Where a [[...]] link points, by entity type. Stage projects and
 * ClientSync milestones don't have their own detail routes — a project
 * lives inline on /projects and a milestone opens as a dialog on
 * /clientsync — so both link to their parent page rather than a 404.
 * Exercises follow the same pattern: they render inline inside a stage's
 * accordion panel on /roadmap with no dedicated route, so a linked
 * exercise opens /roadmap rather than a 404.
 */
function hrefForEntity(entity: LinkableEntity): string {
  switch (entity.type) {
    case "topic":
      return `/roadmap/topic/${entity.id}`;
    case "project":
      return "/projects";
    case "clientsync_milestone":
      return "/clientsync";
    case "exercise":
      return "/roadmap";
  }
}

/**
 * Renders note text with [[Name]] segments as clickable links, when the
 * bracketed text exact-matches (case-insensitive) a real topic title,
 * stage project name, ClientSync milestone description, or stage exercise
 * description. Unmatched brackets render as plain text — never a broken
 * link.
 */
export function NoteText({
  text,
  registry,
}: {
  text: string;
  registry: Map<string, LinkableEntity>;
}) {
  const segments = parseNoteLinks(text, registry);

  return (
    <>
      {segments.map((seg, i) =>
        seg.linkedEntity ? (
          <Link
            key={i}
            href={hrefForEntity(seg.linkedEntity)}
            className="text-accent hover:underline font-medium"
          >
            {seg.text}
          </Link>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

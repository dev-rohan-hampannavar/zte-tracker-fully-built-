"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import type { Backlink } from "@/lib/note-links";

/**
 * Stage 4 — Item 25: the "Referenced in" mirror of the topic detail page's
 * "Linked from" panel, for entities that don't have their own detail
 * route (stage projects, ClientSync milestones) — so it renders inline
 * wherever that entity is shown, rather than on a page of its own.
 */
export function ReferencedInPanel({ backlinks }: { backlinks: Backlink[] }) {
  if (backlinks.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <p className="text-[10px] text-muted flex items-center gap-1">
        <Link2 className="h-2.5 w-2.5" /> Referenced in:
      </p>
      <div className="flex flex-col gap-1">
        {backlinks.map(({ note, sourceTopic }) => (
          <Link
            key={note.id}
            href={`/roadmap/topic/${sourceTopic.id}`}
            className="block rounded-md bg-surface-2 px-2 py-1 text-[11px] hover:bg-surface-2/70 transition-colors"
          >
            <span className="text-accent font-medium">{sourceTopic.title}</span>
            <span className="text-muted"> — {note.note.length > 80 ? `${note.note.slice(0, 80)}…` : note.note}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

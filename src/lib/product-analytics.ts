import { createClient } from "@/lib/supabase/client";
import type { ProductFunnelRow } from "@/types/database";

export type ProductEventName =
  | "roadmap_viewed"
  | "topic_started"
  | "topic_completed"
  | "project_started"
  | "project_deployed"
  | "return_usage";

/** Best-effort telemetry: an analytics outage must never block a learning action. */
export async function recordProductEvent(
  eventName: ProductEventName,
  references: { roadmapId?: string; topicId?: string; legacyTopicId?: string; projectId?: string } = {}
) {
  const supabase = createClient();
  try {
    const { error } = await supabase.rpc("record_product_event" as never, {
      p_event_name: eventName,
      p_roadmap_id: references.roadmapId ?? null,
      p_topic_id: references.topicId ?? null,
      p_project_id: references.projectId ?? null,
      p_legacy_topic_id: references.legacyTopicId ?? null,
    } as never);
    if (error) return;
  } catch {
    // Analytics is deliberately best-effort and has no effect on user work.
  }
}

export function formatFunnelLabel(name: string) {
  return name.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function getFunnelConversion(rows: ProductFunnelRow[], previousEvent: string, nextEvent: string) {
  const previous = rows.find((row) => row.event_name === previousEvent)?.user_count ?? 0;
  const next = rows.find((row) => row.event_name === nextEvent)?.user_count ?? 0;
  return previous > 0 ? Math.round((next / previous) * 100) : null;
}

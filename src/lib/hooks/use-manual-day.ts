"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import manualDays from "@/data/manual-days.json";

const supabase = createClient();

export interface ManualDaySection {
  title: string;
  content: string;
}

export interface ManualDay {
  day: number;
  title: string;
  phase: { number: string; title: string };
  sections: ManualDaySection[];
}

// public.topic_day_map isn't in the generated Supabase Database type (that
// file is regenerated from the schema and this migration — 0018 — hasn't
// been run through codegen), so this row shape is declared by hand and the
// query result cast to it below.
interface TopicDayMapRow {
  topic_id: string;
  day_number: number;
}

const manualDaysById = manualDays as unknown as Record<string, ManualDay>;

// public.topic_day_map is small (one row per mapped topic, ~hundreds of
// rows at most) — fetched whole and cached, rather than querying per topic,
// since Daily Mission needs this lookup on every dashboard load.
export function useTopicDayMap() {
  return useSWR("topic-day-map", async () => {
    const { data, error } = await supabase.from("topic_day_map").select("topic_id, day_number");
    if (error) throw error;
    const rows = (data ?? []) as unknown as TopicDayMapRow[];
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.topic_id, row.day_number);
    return map;
  });
}

// Looks up the manual's "Day N" content for a topic, if that topic has been
// mapped (see supabase/seed_topic_day_map.sql). Returns null if the topic
// isn't mapped or the day number doesn't exist in manual-days.json.
export function getManualDayForTopic(
  topicId: string | undefined,
  dayMap: Map<string, number> | undefined
): ManualDay | null {
  if (!topicId || !dayMap) return null;
  const dayNumber = dayMap.get(topicId);
  if (dayNumber == null) return null;
  return manualDaysById[String(dayNumber)] ?? null;
}

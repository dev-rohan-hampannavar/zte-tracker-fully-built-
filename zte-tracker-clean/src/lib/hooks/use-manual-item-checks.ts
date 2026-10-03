"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface ManualItemCheckRow {
  day_number: number;
  section_title: string;
  item_index: number;
}

// Checked items for one specific day — keyed as "sectionTitle::itemIndex"
// for O(1) lookup from the UI. Only fetched for the day currently being
// viewed (Daily Mission's current day, or whatever day the Roadmap browser
// has open) rather than the whole table, since a user could eventually have
// thousands of these rows across a full 324-day manual.
export function useManualItemChecks(userId: string | undefined, dayNumber: number | undefined) {
  return useSWR(
    userId && dayNumber != null ? ["manual-item-checks", userId, dayNumber] : null,
    async () => {
      const { data, error } = await supabase
        .from("manual_item_checks")
        .select("section_title, item_index")
        .eq("user_id", userId!)
        .eq("day_number", dayNumber!);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ManualItemCheckRow[];
      return new Set(rows.map((r) => `${r.section_title}::${r.item_index}`));
    }
  );
}

export async function setManualItemChecked(
  userId: string,
  dayNumber: number,
  sectionTitle: string,
  itemIndex: number,
  checked: boolean
) {
  if (checked) {
    const { error } = await supabase.from("manual_item_checks").upsert(
      { user_id: userId, day_number: dayNumber, section_title: sectionTitle, item_index: itemIndex } as never,
      { onConflict: "user_id,day_number,section_title,item_index" }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("manual_item_checks")
      .delete()
      .eq("user_id", userId)
      .eq("day_number", dayNumber)
      .eq("section_title", sectionTitle)
      .eq("item_index", itemIndex);
    if (error) throw error;
  }
}

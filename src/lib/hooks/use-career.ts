"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { CareerTrackerRow, ApplicationStatus } from "@/types/database";

const supabase = createClient();

export function useCareerTracker(userId: string | undefined) {
  return useSWR(userId ? ["career", userId] : null, async () => {
    const { data, error } = await supabase
      .from("career_tracker")
      .select("*")
      .eq("user_id", userId!)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerTrackerRow[];
  });
}

export async function upsertCareerEntry(
  userId: string,
  entry: Partial<CareerTrackerRow> & { company: string }
) {
  const { error } = await supabase.from("career_tracker").upsert({
    user_id: userId,
    ...entry,
  } as never);
  if (error) throw error;
}

export async function deleteCareerEntry(id: string) {
  const { error } = await supabase.from("career_tracker").delete().eq("id", id);
  if (error) throw error;
}

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

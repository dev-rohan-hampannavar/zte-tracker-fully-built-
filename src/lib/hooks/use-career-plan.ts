"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import type { CareerPlanTrack } from "@/data/full-plan";

export interface CareerPlanSettings {
  career_plan_version: string;
  career_plan_track: CareerPlanTrack;
  career_plan_start_date: string | null;
  career_plan_deadline_date: string | null;
  career_plan_weekly_hours: number;
  career_plan_flagship_project: string;
}

export const DEFAULT_CAREER_PLAN_SETTINGS: CareerPlanSettings = {
  career_plan_version: "2026-08-canonical",
  career_plan_track: "plan_b",
  career_plan_start_date: null,
  career_plan_deadline_date: null,
  career_plan_weekly_hours: 40,
  career_plan_flagship_project: "ClientSync",
};

export function useCareerPlanSettings(userId: string | undefined) {
  const base = useUserSettings(userId);
  const baseData = base.data;
  const settings = useMemo<CareerPlanSettings | undefined>(() => {
    if (!baseData) return undefined;
    const row = baseData as typeof baseData & Partial<CareerPlanSettings>;
    return {
      career_plan_version: row.career_plan_version ?? DEFAULT_CAREER_PLAN_SETTINGS.career_plan_version,
      career_plan_track: row.career_plan_track === "plan_a" ? "plan_a" : "plan_b",
      career_plan_start_date: row.career_plan_start_date ?? null,
      career_plan_deadline_date: row.career_plan_deadline_date ?? null,
      career_plan_weekly_hours: Number(row.career_plan_weekly_hours ?? DEFAULT_CAREER_PLAN_SETTINGS.career_plan_weekly_hours),
      career_plan_flagship_project: row.career_plan_flagship_project ?? DEFAULT_CAREER_PLAN_SETTINGS.career_plan_flagship_project,
    };
  }, [baseData]);

  return { ...base, data: settings };
}

export async function saveCareerPlanSettings(
  userId: string,
  patch: Partial<CareerPlanSettings>
) {
  const supabase = createClient();
  // Fetch the current track only when the patch actually touches it, so
  // this doesn't add a read to every settings save — most calls here
  // (e.g. bumping career_plan_version after acknowledging a plan update)
  // don't change the track at all and shouldn't trigger a fetch just to
  // compare a value that isn't changing.
  let previousTrack: CareerPlanTrack | null = null;
  if (patch.career_plan_track !== undefined) {
    const { data: current } = await supabase
      .from("user_settings")
      .select("career_plan_track")
      .eq("user_id", userId)
      .single();
    previousTrack = (current as { career_plan_track: CareerPlanTrack } | null)?.career_plan_track ?? null;
  }

  const { error } = await supabase
    .from("user_settings")
    .update(patch as never)
    .eq("user_id", userId);
  if (error) throw error;

  if (patch.career_plan_track !== undefined && patch.career_plan_track !== previousTrack) {
    await logActivity(userId, {
      action: "career_target_changed",
      entityType: "career_plan",
      entityId: userId,
      summary: `Changed career track to ${patch.career_plan_track}${previousTrack ? ` (from ${previousTrack})` : ""}`,
    });
  }
}

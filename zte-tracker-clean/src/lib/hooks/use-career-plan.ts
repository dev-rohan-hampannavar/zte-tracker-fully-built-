"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { createGoal, createMilestone } from "@/lib/hooks/use-goals";
import { getCareerPathStages } from "@/data/career-path-stages";
import { PLAN_PATHS, type CareerPlanTrack } from "@/data/full-plan";
import type { Goal } from "@/types/database";

const VALID_TRACKS = new Set<string>(PLAN_PATHS.map((path) => path.id));

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
  career_plan_track: "plan_a",
  career_plan_start_date: null,
  career_plan_deadline_date: null,
  career_plan_weekly_hours: 40,
  career_plan_flagship_project: "ClientSync",
};

function coerceTrack(value: unknown): CareerPlanTrack {
  return typeof value === "string" && VALID_TRACKS.has(value)
    ? (value as CareerPlanTrack)
    : DEFAULT_CAREER_PLAN_SETTINGS.career_plan_track;
}

export function useCareerPlanSettings(userId: string | undefined) {
  const base = useUserSettings(userId);
  const baseData = base.data;
  const settings = useMemo<CareerPlanSettings | undefined>(() => {
    if (!baseData) return undefined;
    const row = baseData as typeof baseData & Partial<CareerPlanSettings>;
    return {
      career_plan_version: row.career_plan_version ?? DEFAULT_CAREER_PLAN_SETTINGS.career_plan_version,
      career_plan_track: coerceTrack(row.career_plan_track),
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
    previousTrack = current ? coerceTrack((current as { career_plan_track: string }).career_plan_track) : null;
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

// A goal's category identifies it as machine-seeded from a career track,
// so seedCareerPathGoal can find and skip re-seeding one that already
// exists, and the Goals page can (optionally) badge it as coming from the
// Career Strategy explorer rather than being hand-authored.
function careerTrackGoalCategory(track: CareerPlanTrack) {
  return `career_track:${track}`;
}

export interface SeedCareerPathGoalResult {
  goal: Goal;
  created: boolean; // false if an existing goal for this track was reused
}

/**
 * Turns a career path's stage ladder (career-path-stages.ts) into a real
 * Goal + ordered Milestones, using the existing goals/milestones system —
 * no new tables. Idempotent: if a goal already exists for this track
 * (identified by category, not title, since the user could rename the
 * goal), it's returned as-is rather than duplicated.
 */
export async function seedCareerPathGoal(
  userId: string,
  track: CareerPlanTrack
): Promise<SeedCareerPathGoalResult> {
  const path = PLAN_PATHS.find((p) => p.id === track);
  const entry = getCareerPathStages(track);
  if (!path || !entry) {
    throw new Error(`No stage breakdown available to seed a goal for track "${track}".`);
  }

  const supabase = createClient();
  const category = careerTrackGoalCategory(track);
  const { data: existing, error: findError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    return { goal: existing as Goal, created: false };
  }

  const goal = await createGoal(userId, {
    title: path.title,
    description: path.summary,
    category,
    priority: "high",
  });

  await Promise.all(
    entry.stages.map((stage, index) =>
      createMilestone(userId, goal.id, {
        title: stage.title,
        description: [stage.note, stage.detail.summary].filter(Boolean).join("\n\n"),
        order_index: index,
      })
    )
  );

  return { goal, created: true };
}

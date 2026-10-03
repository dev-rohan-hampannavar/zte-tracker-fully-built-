"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseProgress } from "@/types/database";

const supabase = createClient();

export function useExerciseProgress(userId: string | undefined) {
  return useSWR(userId ? ["exercise-progress", userId] : null, async () => {
    const { data, error } = await supabase
      .from("exercise_progress")
      .select("*")
      .eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ExerciseProgress[];
  });
}

export async function toggleExerciseComplete(userId: string, exerciseId: string, completed: boolean) {
  const { error } = await supabase
    .from("exercise_progress")
    .upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      } as never,
      { onConflict: "user_id,exercise_id" }
    );
  if (error) throw error;
}

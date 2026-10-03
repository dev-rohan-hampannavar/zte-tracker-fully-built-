"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { LessonProgress } from "@/types/database";

/** Completed lessons for the signed-in learner, keyed by lesson id. */
export function useLessonProgress(userId: string | undefined) {
  const swr = useSWR(userId ? ["lesson-progress", userId] : null, async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("lesson_progress").select("*").eq("user_id", userId as string);
    if (error) throw error;
    return Object.fromEntries(((data ?? []) as LessonProgress[]).map((row) => [row.lesson_id, row]));
  });

  async function markComplete(lessonId: string, quizCorrect: number, quizTotal: number) {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: userId, lesson_id: lessonId, quiz_correct: quizCorrect, quiz_total: quizTotal, completed_at: new Date().toISOString() } as never,
      { onConflict: "user_id,lesson_id" }
    );
    if (error) throw error;
    await swr.mutate();
  }

  return { progress: swr.data ?? {}, isLoading: swr.isLoading, markComplete };
}

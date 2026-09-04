"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type {
  InterviewQuestion,
  InterviewAttempt,
  InterviewWeakness,
  InterviewAttemptResult,
  InterviewRoundType,
} from "@/types/database";

const supabase = createClient();

export function useInterviewQuestions(roundType?: InterviewRoundType, technologyId?: string | null) {
  return useSWR(["interview-questions", roundType, technologyId], async () => {
    let query = supabase.from("interview_questions").select("*");
    if (roundType) query = query.eq("round_type", roundType);
    if (technologyId) query = query.eq("technology_id", technologyId);
    const { data, error } = await query.order("difficulty");
    if (error) throw error;
    return (data ?? []) as InterviewQuestion[];
  });
}

export function useInterviewAttempts(userId: string | undefined) {
  return useSWR(userId ? ["interview-attempts", userId] : null, async () => {
    const { data, error } = await supabase
      .from("interview_attempts")
      .select("*")
      .eq("user_id", userId!)
      .order("attempted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InterviewAttempt[];
  });
}

export function useInterviewWeaknesses(userId: string | undefined) {
  return useSWR(userId ? ["interview-weaknesses", userId] : null, async () => {
    const { data, error } = await supabase
      .from("interview_weaknesses")
      .select("*")
      .eq("user_id", userId!)
      .order("accuracy_pct", { ascending: true });
    if (error) throw error;
    return (data ?? []) as InterviewWeakness[];
  });
}

/**
 * Logs an attempt via the atomic log_interview_attempt RPC, which also
 * nudges the linked topic's revision_status to 'needs_revision' server-
 * side when running accuracy on that topic's concept is weak — see 0034.
 * This is the one write path for attempts; there is no separate client-
 * side revision_status update anywhere, so the two systems can't drift.
 */
export async function logInterviewAttempt(
  questionId: string,
  result: InterviewAttemptResult,
  opts?: { interviewRoundId?: string; notes?: string }
) {
  const { data, error } = await supabase.rpc(
    "log_interview_attempt" as never,
    {
      p_question_id: questionId,
      p_result: result,
      p_interview_round_id: opts?.interviewRoundId ?? null,
      p_notes: opts?.notes ?? null,
    } as never
  );
  if (error) throw error;
  return data as string | null;
}

export const ATTEMPT_RESULT_LABELS: Record<InterviewAttemptResult, string> = {
  correct: "Nailed it",
  partial: "Partially right",
  incorrect: "Missed it",
};

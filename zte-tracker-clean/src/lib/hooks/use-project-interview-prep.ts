"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { InterviewAttemptResult } from "@/types/database";
import type { GeneratedProjectQuestion } from "@/lib/project-interview-prompts";

const supabase = createClient();

export interface ProjectInterviewQuestionRow {
  id: string;
  user_id: string;
  phase_id: string | null;
  advanced_project_id: string | null;
  category: GeneratedProjectQuestion["category"];
  question: string;
  source_field: string | null;
  created_at: string;
}

export interface ProjectInterviewAttemptRow {
  id: string;
  user_id: string;
  question_id: string;
  result: InterviewAttemptResult;
  notes: string | null;
  attempted_at: string;
}

export function useAllProjectInterviewQuestions(userId: string | undefined) {
  return useSWR(userId ? ["all-project-interview-questions", userId] : null, async () => {
    const { data, error } = await supabase.from("project_interview_questions").select("*").eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ProjectInterviewQuestionRow[];
  });
}

export function useAllProjectInterviewAttempts(userId: string | undefined) {
  return useSWR(userId ? ["all-project-interview-attempts", userId] : null, async () => {
    const { data, error } = await supabase.from("project_interview_attempts").select("*").eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ProjectInterviewAttemptRow[];
  });
}

export function useProjectInterviewQuestions(userId: string | undefined, phaseId?: string, advancedProjectId?: string) {
  return useSWR(
    userId && (phaseId || advancedProjectId) ? ["project-interview-questions", userId, phaseId, advancedProjectId] : null,
    async () => {
      let query = supabase.from("project_interview_questions").select("*").eq("user_id", userId!);
      if (phaseId) query = query.eq("phase_id", phaseId);
      if (advancedProjectId) query = query.eq("advanced_project_id", advancedProjectId);
      const { data, error } = await query.order("created_at");
      if (error) throw error;
      return (data ?? []) as ProjectInterviewQuestionRow[];
    }
  );
}

export function useProjectInterviewAttempts(userId: string | undefined, questionIds: string[]) {
  return useSWR(
    userId && questionIds.length > 0 ? ["project-interview-attempts", userId, questionIds.join(",")] : null,
    async () => {
      const { data, error } = await supabase
        .from("project_interview_attempts")
        .select("*")
        .eq("user_id", userId!)
        .in("question_id", questionIds)
        .order("attempted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectInterviewAttemptRow[];
    }
  );
}

/**
 * Persists generated questions that don't already exist for this project
 * (matched on question text, so regenerating after editing project notes
 * doesn't create duplicates of questions that haven't actually changed).
 * Existing questions untouched by this call are left alone, including any
 * saved answers/attempts against them.
 */
export async function syncGeneratedQuestions(
  userId: string,
  target: { phaseId?: string; advancedProjectId?: string },
  generated: GeneratedProjectQuestion[],
  existing: ProjectInterviewQuestionRow[]
) {
  const existingQuestionTexts = new Set(existing.map((q) => q.question));
  const toInsert = generated.filter((q) => !existingQuestionTexts.has(q.question));
  if (toInsert.length === 0) return;
  const { error } = await supabase.from("project_interview_questions").insert(
    toInsert.map((q) => ({
      user_id: userId,
      phase_id: target.phaseId ?? null,
      advanced_project_id: target.advancedProjectId ?? null,
      category: q.category,
      question: q.question,
      source_field: q.sourceField,
    })) as never
  );
  if (error) throw error;
}

export async function logProjectInterviewAttempt(
  userId: string,
  questionId: string,
  result: InterviewAttemptResult,
  notes?: string
) {
  const { error } = await supabase.from("project_interview_attempts").insert({
    user_id: userId,
    question_id: questionId,
    result,
    notes: notes ?? null,
  } as never);
  if (error) throw error;
}

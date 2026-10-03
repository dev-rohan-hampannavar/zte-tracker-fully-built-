"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import type { ExitLadderRowWithHours } from "@/types/career-merge";

/**
 * Fetches exit_ladder rows with exit_hours_required included.
 * Used by the career-plan page and any component that needs to compute
 * exit point status or dynamic month labels.
 *
 * The hook returns the rows sorted by order_index, filtering out any
 * rows where exit_hours_required is null (unseeded rows won't render
 * useful exit status anyway).
 */
export function useExitLadderWithHours() {
  const { user } = useUser();
  const supabase = createClient();

  return useSWR(
    user ? ["exit-ladder-hours", user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from("exit_ladder")
        .select(
          "exit_code, linked_phase, name, job_level, salary_range, target_companies, highlights, order_index, exit_hours_required"
        )
        .order("order_index");

      if (error) throw error;

      return (data as ExitLadderRowWithHours[]).filter(
        (row) => row.exit_hours_required !== null
      );
    },
    { revalidateOnFocus: false }
  );
}

/**
 * Fetches the financial profile extended with notice_period_days.
 * Returns null if the user hasn't set up their financial profile yet.
 */
import type { FinancialProfileExtended } from "@/types/career-merge";

export function useFinancialProfileExtended(userId: string | undefined) {
  const supabase = createClient();

  return useSWR(
    userId ? ["financial-profile-extended", userId] : null,
    async () => {
      const { data, error } = await supabase
        .from("financial_profiles")
        .select(
          "user_id, monthly_income, monthly_expenses, savings, emergency_months, minimum_switch_salary, notice_period_days, updated_at"
        )
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return data as FinancialProfileExtended | null;
    },
    { revalidateOnFocus: false }
  );
}

/**
 * Fetches the career_scenarios reference table — all 6 rows
 * (ops low/base/high, dev low/base/high).
 * Shared across all users; cached aggressively.
 */
import type { CareerScenario } from "@/types/career-merge";

export function useCareerScenarios() {
  const supabase = createClient();

  return useSWR(
    "career-scenarios",
    async () => {
      const { data, error } = await supabase
        .from("career_scenarios")
        .select("*")
        .order("path")
        .order("scenario");

      if (error) throw error;
      return data as CareerScenario[];
    },
    {
      // Reference data; revalidate at most once per session.
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 3_600_000, // 1 hour
    }
  );
}

/**
 * Fetches the career_pivots reference table.
 * Shared across all users.
 */
import type { CareerPivot } from "@/types/career-merge";

export function useCareerPivots() {
  const supabase = createClient();

  return useSWR(
    "career-pivots",
    async () => {
      const { data, error } = await supabase
        .from("career_pivots")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as CareerPivot[];
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 3_600_000,
    }
  );
}

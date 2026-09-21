/**
 * Types for the new entities introduced in migration 0067
 * (career system merge). These extend database.ts without modifying
 * the existing hand-written types file — import from here and from
 * database.ts as needed.
 *
 * After regenerating types with `supabase gen types typescript`,
 * reconcile these with the auto-generated output and then consolidate
 * into database.ts as the canonical file.
 */

// ---- career_scenarios ----------------------------------------

/** Low / base / high CTC projection for a single path. */
export interface CareerScenario {
  id: number;
  path: "ops" | "dev";
  scenario: "low" | "base" | "high";
  /** Array of {age, ctc_lpa} objects at canonical ages 24, 26, 28, 31, 34. */
  age_points: Array<{ age: number; ctc_lpa: number }>;
  anchor: string | null;
  created_at: string;
}

/** All six scenarios (3 per path) grouped by path for easy chart rendering. */
export interface CareerScenarioGroup {
  path: "ops" | "dev";
  low: CareerScenario;
  base: CareerScenario;
  high: CareerScenario;
}

// ---- career_pivots -------------------------------------------

export type PivotPath = "ops" | "dev" | "both" | "product";
export type PivotConfidence = "H" | "M" | "L";

export interface CareerPivot {
  id: number;
  code: string;           // 'O1', 'O2', ..., 'D1', ..., 'D5'
  path: PivotPath;
  title: string;
  entry_range: string | null;
  mid_range: string | null;
  mid_experience_note: string | null;
  senior_range: string | null;
  confidence: PivotConfidence | null;
  source: string | null;
  why_it_fits: string | null;
  barrier: string | null;   // 'Low' | 'Medium' | 'High'
  first_step: string | null;
  order_index: number;
  created_at: string;
}

// ---- Extended exit_ladder ------------------------------------

/**
 * exit_ladder row extended with exit_hours_required from migration 0067.
 * Use this instead of the base ExitLadderRow from database.ts when
 * computing exit point statuses.
 */
export interface ExitLadderRowWithHours {
  exit_code: string;
  linked_phase: string | null;
  name: string | null;
  job_level: string | null;
  salary_range: string | null;
  target_companies: string | null;
  highlights: string | null;
  order_index: number;
  /** Cumulative study hours required to reach this exit. Null if not seeded. */
  exit_hours_required: number | null;
}

// ---- Extended financial_profiles ----------------------------

/**
 * financial_profiles row extended with notice_period_days from migration 0067.
 * Use this instead of the base FinancialProfile from database.ts.
 */
export interface FinancialProfileExtended {
  user_id: string;
  monthly_income: number;
  monthly_expenses: number;
  savings: number;
  emergency_months: number;
  minimum_switch_salary: number;
  /** Days of notice required by employer before resignation. Default 60. */
  notice_period_days: number;
  updated_at: string;
}

// ---- Database table extension map ---------------------------

/**
 * Augments the existing Database type from database.ts.
 * Import alongside Database when you need the new tables.
 *
 * Usage:
 *   import type { Database } from "@/types/database";
 *   import type { CareerMergeExtensions } from "@/types/career-merge";
 *   type FullDatabase = Database & CareerMergeExtensions;
 */
export interface CareerMergeExtensions {
  public: {
    Tables: {
      career_scenarios: {
        Row: CareerScenario;
        Insert: Omit<CareerScenario, "id" | "created_at"> & Partial<Pick<CareerScenario, "id" | "created_at">>;
        Update: Partial<CareerScenario>;
        Relationships: [];
      };
      career_pivots: {
        Row: CareerPivot;
        Insert: Omit<CareerPivot, "id" | "created_at"> & Partial<Pick<CareerPivot, "id" | "created_at">>;
        Update: Partial<CareerPivot>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

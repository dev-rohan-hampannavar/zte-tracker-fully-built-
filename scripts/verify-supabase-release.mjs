#!/usr/bin/env node

/**
 * Read-only release gate for the feature migrations. It uses PostgREST with
 * a service-role key and `limit=0`, so it verifies relations and columns
 * without reading or mutating user rows. Keep the key in the shell/CI secret
 * store; this script never prints it or response bodies.
 */

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase release check needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const checks = [
  ["roadmap metadata", "/rest/v1/roadmap_metadata?select=id&limit=0"],
  ["career plan settings columns", "/rest/v1/user_settings?select=career_plan_track,career_plan_start_date,career_plan_deadline_date,career_plan_weekly_hours,career_plan_flagship_project&limit=0"],
  ["weekly commitments", "/rest/v1/weekly_commitments?select=id,user_id,week_start,title,status&limit=0"],
  ["time blocks", "/rest/v1/time_blocks?select=id,user_id,block_date,start_time,end_time,status&limit=0"],
  ["evidence items", "/rest/v1/evidence_items?select=id,user_id,evidence_type,title,url&limit=0"],
  ["financial profiles", "/rest/v1/financial_profiles?select=user_id,monthly_income,monthly_expenses,savings,emergency_months,minimum_switch_salary&limit=0"],
  ["study events", "/rest/v1/study_events?select=id,user_id,date,duration_minutes,source&limit=0"],
  ["target roles", "/rest/v1/target_roles?select=id,name&limit=0"],
  ["role skill requirements", "/rest/v1/role_skill_requirements?select=role_id,technology_id&limit=0"],
  // migration 0069 — personalization/onboarding config on user_settings
  ["personalization profile columns", "/rest/v1/user_settings?select=roadmap_id,is_personalized,onboarding_completed,onboarding_completed_at&limit=0"],
  ["admin role column", "/rest/v1/user_settings?select=is_admin&limit=0"],
  // migration 0072 — onboarding
  ["onboarding responses", "/rest/v1/onboarding_responses?select=user_id,goal,target_role_id,completed_at&limit=0"],
  // migration 0070 — roadmap catalog tables
  ["roadmaps catalog", "/rest/v1/roadmaps?select=id,title,track,is_public&limit=0"],
  // migration 0074 — role-to-roadmap assignment
  ["role roadmap assignments", "/rest/v1/role_roadmap_assignments?select=role_id,roadmap_id,priority&limit=0"],
  ["roadmap version workflow", "/rest/v1/roadmap_versions?select=id,roadmap_id,version_number,is_current,status,created_by,published_at&limit=0"],
  ["roadmap version events", "/rest/v1/roadmap_version_events?select=id,roadmap_version_id,to_status,changed_at&limit=0"],
  ["privacy-safe product events", "/rest/v1/product_events?select=id,user_id,event_name,topic_id,legacy_topic_id,event_day,occurred_at&limit=0"],
  ["admin feature flags", "/rest/v1/feature_flags?select=key,enabled,updated_at&limit=0"],
  ["phases roadmap linkage", "/rest/v1/phases?select=id,roadmap_id,roadmap_version_id&limit=0"],
  // migration 0071 — enrollment
  ["user roadmaps", "/rest/v1/user_roadmaps?select=id,user_id,roadmap_id,status,starting_phase_id,dsa_easy_target,dsa_medium_target&limit=0"],
];

const headers = {
  Accept: "application/json",
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "X-Client-Info": "zte-release-check",
};
const failures = [];

for (const [label, path] of checks) {
  try {
    const response = await fetch(`${supabaseUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      failures.push(`${label}: HTTP ${response.status}`);
      continue;
    }
    console.log(`supabase ${label}: ${response.status}`);
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error("Supabase release check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Supabase release check passed: ${checks.length} read-only relation/column probes`);

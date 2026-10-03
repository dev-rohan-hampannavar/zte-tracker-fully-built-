import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses RLS entirely. Only ever import this from
 * server-only code (API routes, cron handlers) that has already verified
 * the caller some other way (e.g. the cron secret check in
 * /api/cron/weekly-summary). Never import this from a Server Component
 * that renders based on the request's own session, and never from
 * anything that could run client-side — SUPABASE_SERVICE_ROLE_KEY has
 * full read/write access to every table regardless of RLS policy.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

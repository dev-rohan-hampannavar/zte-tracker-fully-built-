"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { CareerFamily, CareerRole, CareerRoleProfile } from "@/types/database";

/** Role profile (skills, projects, interview focus) for a target role, or null. */
export function useRoleProfile(targetRoleId: string | null | undefined) {
  return useSWR(targetRoleId ? ["role-profile", targetRoleId] : null, async () => {
    const supabase = createClient();
    const { data: role, error } = await supabase
      .from("career_roles")
      .select("*")
      .eq("target_role_id", targetRoleId as string)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!role) return null;
    const careerRole = role as CareerRole;
    const [profile, family] = await Promise.all([
      supabase.from("career_role_profiles").select("*").eq("id", careerRole.profile_id).maybeSingle(),
      supabase.from("career_families").select("*").eq("id", careerRole.family_id).maybeSingle(),
    ]);
    if (profile.error) throw profile.error;
    return {
      role: careerRole,
      profile: (profile.data ?? null) as CareerRoleProfile | null,
      family: (family.data ?? null) as CareerFamily | null,
    };
  });
}

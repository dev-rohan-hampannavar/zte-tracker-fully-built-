"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { roleMatchesQuery } from "@/lib/onboarding-validation";
import { cn } from "@/lib/utils";
import type { CareerFamily, CareerRole, CareerRoleProfile } from "@/types/database";

interface RoleOption {
  id: string;
  name: string;
}

/**
 * Inline role browser for onboarding.
 *
 * Why this exists: onboarding used a Radix dropdown plus a link to /careers.
 * /careers lives behind the (app) layout, which redirects every account that
 * hasn't finished onboarding straight back to /onboarding, so "Browse role
 * profiles" bounced people to the first question. The dropdown also rendered
 * as an empty popper whenever the search box filtered every role out. This
 * keeps search, family filtering and profile details on the same page, and
 * selecting a role is always an explicit click.
 */
export function RolePicker({
  roles,
  value,
  onSelect,
}: {
  roles: RoleOption[] | undefined;
  value: string | undefined;
  onSelect: (roleId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");

  // Profiles/families are enrichment only: if this fetch fails the plain role
  // list still works.
  const { data: catalog } = useSWR("onboarding-career-catalog", async () => {
    const supabase = createClient();
    const [families, profiles, careerRoles] = await Promise.all([
      supabase.from("career_families").select("*").order("sort_order"),
      supabase.from("career_role_profiles").select("*").eq("is_active", true),
      supabase.from("career_roles").select("*").eq("is_active", true),
    ]);
    if (families.error || profiles.error || careerRoles.error) return null;
    return {
      families: (families.data ?? []) as CareerFamily[],
      profiles: (profiles.data ?? []) as CareerRoleProfile[],
      careerRoles: (careerRoles.data ?? []) as CareerRole[],
    };
  });

  const byTargetId = useMemo(
    () => new Map((catalog?.careerRoles ?? []).map((r) => [r.target_role_id, r])),
    [catalog]
  );
  const profileById = useMemo(() => new Map((catalog?.profiles ?? []).map((p) => [p.id, p])), [catalog]);
  const familyById = useMemo(() => new Map((catalog?.families ?? []).map((f) => [f.id, f.name])), [catalog]);

  const visible = useMemo(() => {
    return (roles ?? []).filter((role) => {
      const career = byTargetId.get(role.id);
      if (family !== "all" && career?.family_id !== family) return false;
      if (!query.trim()) return true;
      const profile = career ? profileById.get(career.profile_id) : undefined;
      return [role.name, career?.role_focus, profile?.name].some(
        (text) => text && roleMatchesQuery(text, query)
      );
    });
  }, [roles, byTargetId, profileById, family, query]);

  const selectedCareer = value ? byTargetId.get(value) : undefined;
  const selectedProfile = selectedCareer ? profileById.get(selectedCareer.profile_id) : undefined;
  const selectedName = (roles ?? []).find((r) => r.id === value)?.name;

  if (!roles) return <p className="text-sm text-muted">Loading roles…</p>;
  if (roles.length === 0) {
    return (
      <p role="alert" className="text-sm text-danger">
        No target roles are available. Apply database migration 0087 and reload this page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" aria-hidden />
        <Input
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${roles.length} role titles`}
          aria-label="Search role titles"
        />
      </div>

      {catalog && catalog.families.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by career family">
          {[{ id: "all", name: "All" }, ...catalog.families].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamily(f.id)}
              aria-pressed={family === f.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                family === f.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-surface-2"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div
        role="listbox"
        aria-label="Target roles"
        className="max-h-64 overflow-y-auto rounded-md border border-border bg-surface p-1"
      >
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted">
            {query.trim() ? `No roles match “${query.trim()}”.` : "No roles in this family."} Clear the search or pick
            another family.
          </p>
        ) : (
          visible.map((role) => {
            const selected = role.id === value;
            const career = byTargetId.get(role.id);
            return (
              <button
                key={role.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(role.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-surface-2",
                  selected && "bg-surface-2 font-medium"
                )}
              >
                <span>
                  {role.name}
                  {career && familyById.get(career.family_id) && (
                    <span className="ml-2 text-xs font-normal text-muted">{familyById.get(career.family_id)}</span>
                  )}
                </span>
                {selected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
              </button>
            );
          })
        )}
      </div>

      {selectedName ? (
        <div className="rounded-md border border-border bg-surface-2 p-3 text-sm" aria-live="polite">
          <p className="font-medium">Selected: {selectedName}</p>
          {selectedProfile && (
            <>
              <p className="mt-1 text-muted">{selectedProfile.summary}</p>
              {selectedProfile.core_skills.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Core skills: {selectedProfile.core_skills.slice(0, 6).join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">Pick a role from the list to continue.</p>
      )}
    </div>
  );
}

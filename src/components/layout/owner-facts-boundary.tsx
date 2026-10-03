"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useOwnerMode } from "@/lib/hooks/use-owner-mode";
import { factsFromRows, GENERIC_FACTS, setOwnerFacts } from "@/lib/owner-facts";

/**
 * Loads the owner's private facts before rendering owner-only content. Shared
 * accounts never query the table (and row-level security would return nothing),
 * so for them this renders children immediately with generic wording.
 */
export function OwnerFactsBoundary({ children }: { children: React.ReactNode }) {
  const { ownerMode, loading } = useOwnerMode();

  const { data: facts, error } = useSWR(ownerMode ? "owner-private-facts" : null, async () => {
    const { data, error: queryError } = await createClient()
      .from("owner_private_facts" as never)
      .select("key, value");
    if (queryError) throw queryError;
    return factsFromRows((data ?? []) as { key: string; value: string }[]);
  });

  if (loading) return null;
  if (ownerMode && !facts && !error) return null;

  // Set before children render so fillFacts() sees the right values in the same pass.
  setOwnerFacts(ownerMode && facts ? facts : GENERIC_FACTS);
  return <>{children}</>;
}

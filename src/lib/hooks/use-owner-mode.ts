"use client";

import { useUser } from "@/lib/hooks/use-user";
import { useUserSettings } from "@/lib/hooks/use-user-settings";

/**
 * True only for the private owner workspace (is_personalized). Shared
 * accounts, and any state where the mode isn't known yet, are NOT owner:
 * anything owner-specific must fail closed.
 */
export function useOwnerMode() {
  const { user, loading: userLoading } = useUser();
  const { data: settings, isLoading } = useUserSettings(user?.id);
  return {
    ownerMode: settings?.is_personalized === true,
    loading: userLoading || (!!user && isLoading),
  };
}

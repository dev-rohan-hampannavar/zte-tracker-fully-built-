"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { parseAuthHashError } from "@/lib/auth-hash-error";

/** Surfaces Supabase auth errors from the URL hash once, then removes them. */
export function AuthHashErrorNotice() {
  useEffect(() => {
    const message = parseAuthHashError(window.location.hash);
    if (!message) return;
    toast.error(message, { id: "auth-hash-error" });
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);
  return null;
}

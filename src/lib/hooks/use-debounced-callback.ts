"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Stage 6 — Item 30: Production Polish (autosave).
 *
 * Returns a stable function that delays invoking `callback` until `delayMs`
 * has passed since the last call — the standard debounce shape, used here
 * so the Journal's autosave doesn't fire a Supabase upsert on every
 * keystroke. `callback` is read from a ref on each call rather than being a
 * direct dependency, so callers don't need to memoize it themselves (a
 * fresh inline arrow function on every render is fine to pass in).
 *
 * Deliberately just a timer ref, not a data-derivation effect — this
 * doesn't run afoul of the same setState-in-effect lint category flagged
 * elsewhere in the codebase (STAGE_5_CHANGELOG), since nothing here reads
 * component state to set other component state; it only schedules a
 * side-effecting call.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}

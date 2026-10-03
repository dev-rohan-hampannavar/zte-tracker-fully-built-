"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Wraps page content with the app's standard max-width, except for routes
 * that opt into a wider layout (currently just the dashboard, which has a
 * two-column grid that looks cramped/gappy at the default max-w-6xl on
 * larger screens). Add more paths to WIDE_ROUTES as needed.
 */
const WIDE_ROUTES = ["/dashboard"];

export function MainContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = WIDE_ROUTES.some((route) => pathname?.startsWith(route));

  return (
    <div
      className={cn(
        "mx-auto px-4 py-6 md:px-8 md:py-8",
        isWide ? "max-w-none" : "max-w-6xl"
      )}
    >
      {children}
    </div>
  );
}
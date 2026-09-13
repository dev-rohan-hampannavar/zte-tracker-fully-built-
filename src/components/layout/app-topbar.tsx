"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./sidebar";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { QuickCaptureButton } from "./quick-capture-button";
import { useUser } from "@/lib/hooks/use-user";
import { useTrackLastOpenedPage } from "@/lib/hooks/use-continuity";

// Keep in sync with PINNED_HREFS in sidebar.tsx — that's what hides these
// same items from the sidebar. Order here controls the left-to-right
// order shown in the top bar.
const PINNED_HREFS = ["/dashboard", "/roadmap", "/dsa", "/career", "/journal"];
const PINNED_NAV = PINNED_HREFS.map((href) => NAV.find((item) => item.href === href)).filter(
  (item): item is (typeof NAV)[number] => Boolean(item)
);

export function AppTopbar() {
  const pathname = usePathname();
  const { user } = useUser();
  // Item 20 — records this route as "last opened" for the cross-device
  // continuity nudge shown on Dashboard. Mounted here (rendered on every
  // authenticated page) rather than per-page so no page has to remember
  // to call it.
  useTrackLastOpenedPage(user?.id);

  return (
    <div className="hidden md:flex items-center justify-between h-14 px-8 border-b border-border bg-background gap-6">
      <nav className="flex items-center gap-1">
        {PINNED_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-standard",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-4 flex-1 justify-end">
        <GlobalSearch />
        <QuickCaptureButton />
        <NotificationBell />
      </div>
    </div>
  );
}
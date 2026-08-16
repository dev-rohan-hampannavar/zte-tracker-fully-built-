"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  FolderGit2,
  Code2,
  TrendingUp,
  Briefcase,
  BarChart3,
  RotateCcw,
  BookOpen,
  Settings,
  LogOut,
  Building2,
  Layers,
  Workflow,
  Gauge,
  CalendarClock,
  FileText,
  FolderKanban,
  Boxes,
  Trophy,
  NotebookPen,
  History,
  Cpu,
  Pin,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Workspace", icon: Pin },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/roadmap-diff", label: "Roadmap Diff", icon: History },
  { href: "/dependency-graph", label: "Learning Path", icon: Workflow },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/portfolio", label: "Portfolio", icon: FolderKanban },
  { href: "/clientsync", label: "ClientSync", icon: Layers },
  { href: "/architecture", label: "Architecture", icon: Boxes },
  { href: "/skills", label: "Skills", icon: Gauge },
  { href: "/dsa", label: "DSA Tracker", icon: Code2 },
  { href: "/exit-ladder", label: "Exit Ladder", icon: TrendingUp },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/technologies", label: "Technologies", icon: Cpu },
  { href: "/career", label: "Career Tracker", icon: Briefcase },
  { href: "/interviews", label: "Interviews", icon: CalendarClock },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/revision", label: "Revision", icon: RotateCcw },
  { href: "/reference", label: "Reference", icon: BookOpen },
];

// Items pinned to the top bar (see app-topbar.tsx) are hidden from the
// sidebar here to actually reduce clutter, rather than just duplicating
// them in both places. To change what's pinned, edit PINNED_HREFS in
// app-topbar.tsx — this set just needs to match so the sidebar excludes
// the same items.
const PINNED_HREFS = new Set(["/dashboard", "/roadmap", "/dsa", "/career", "/journal"]);

// Sidebar sections — same NAV items, just visually grouped so scanning 17
// items reads faster than one flat list. Grouping is purely presentational
// (no route/behavior change); Workspace and Roadmap Diff don't fit any
// category cleanly so they stay ungrouped at the top, close to their
// pinned siblings (Dashboard/Roadmap).
const SIDEBAR_SECTIONS: { label: string | null; hrefs: string[] }[] = [
  { label: null, hrefs: ["/workspace", "/roadmap-diff"] },
  { label: "Learning", hrefs: ["/dependency-graph", "/skills", "/exit-ladder", "/revision"] },
  { label: "Build", hrefs: ["/projects", "/portfolio", "/clientsync", "/architecture"] },
  { label: "Career", hrefs: ["/companies", "/technologies", "/interviews", "/resume", "/achievements"] },
  { label: "Data", hrefs: ["/statistics", "/reference"] },
];

// Collapsible nav per the redesign spec: icons-only by default, expands to
// icons+labels on hover (or when pinned open via the toggle). All 20+
// existing routes/sections are preserved as-is — only the presentation
// (width, label visibility, active-state treatment) changes. Persists the
// pinned/expanded preference across sessions like the theme toggle does.
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  // Lazy initializer reads localStorage synchronously on first render instead
  // of via a post-mount effect — avoids both an extra render pass and the
  // set-state-in-effect lint rule. Safe under SSR since this component is
  // "use client" and the initializer only runs client-side after hydration
  // triggers the first render.
  const [pinned, setPinned] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("zte-sidebar-pinned") === "true";
    } catch {
      return false;
    }
  });
  const [hovering, setHovering] = React.useState(false);

  function togglePinned() {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("zte-sidebar-pinned", String(next));
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  }

  const expanded = pinned || hovering;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "group/sidebar relative flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        expanded ? "w-60" : "w-[68px]",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border overflow-hidden">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Image
            src="/icons/logo-mark.png"
            alt="ZTE Tracker"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg object-contain"
          />
        </div>
        <span
          className={cn(
            "text-sm font-semibold tracking-tight whitespace-nowrap transition-standard",
            expanded ? "opacity-100" : "opacity-0"
          )}
        >
          ZTE Tracker
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-3">
        {SIDEBAR_SECTIONS.map((section, i) => {
          const items = section.hrefs
            .filter((href) => !PINNED_HREFS.has(href))
            .map((href) => NAV.find((item) => item.href === href))
            .filter((item): item is (typeof NAV)[number] => Boolean(item));
          if (items.length === 0) return null;
          return (
            <div key={i} className="flex flex-col gap-0.5">
              {section.label && (
                <p
                  className={cn(
                    "px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-2 whitespace-nowrap transition-standard",
                    expanded ? "opacity-100" : "opacity-0"
                  )}
                >
                  {section.label}
                </p>
              )}
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={expanded ? undefined : label}
                    className={cn(
                      // border-l on a transparent border keeps layout width stable when
                      // switching between active/inactive — only the color toggles, so
                      // links don't shift horizontally as you navigate. Active state adds
                      // a soft accent glow behind the icon per the design spec.
                      "relative flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm font-medium transition-standard",
                      active
                        ? "border-accent bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                        : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={cn(
                        "whitespace-nowrap transition-standard",
                        expanded ? "opacity-100" : "opacity-0"
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 flex flex-col gap-0.5">
        <button
          onClick={togglePinned}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-standard hover:bg-surface-2 hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4 shrink-0" />
          <span className={cn("whitespace-nowrap transition-standard", expanded ? "opacity-100" : "opacity-0")}>
            {pinned ? "Collapse" : "Keep open"}
          </span>
        </button>
        <Link
          href="/settings"
          title={expanded ? undefined : "Settings"}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-standard",
            pathname === "/settings"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className={cn("whitespace-nowrap transition-standard", expanded ? "opacity-100" : "opacity-0")}>
            Settings
          </span>
        </Link>
        <button
          onClick={signOut}
          title={expanded ? undefined : "Sign out"}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-standard hover:bg-surface-2 hover:text-danger"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn("whitespace-nowrap transition-standard", expanded ? "opacity-100" : "opacity-0")}>
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}

export { NAV, PINNED_HREFS, SIDEBAR_SECTIONS };
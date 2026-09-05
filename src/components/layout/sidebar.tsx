"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Map,
  Users,
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
  Home,
  Zap,
  GraduationCap,
  Hammer,
  Rocket,
  Library,
  ChevronDown,
} from "lucide-react";
import { NotebookText } from "lucide-react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Flat item registry — same shape as before so app-topbar.tsx and
// mobile-nav.tsx (which both import NAV directly) keep working unchanged.
// 4 items were REMOVED from here vs. the old NAV, not just re-labeled:
// /dependency-graph, /interview-prep, and /developer-activity are now tabs
// inside /roadmap, /interviews, and /statistics respectively, per the IA
// consolidation. Old URLs still resolve via redirects in next.config, so
// no bookmark/link breaks.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-plan", label: "Daily Plan", icon: CalendarClock },
  { href: "/execution", label: "Execution OS", icon: CalendarClock },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/workspace", label: "Workspace", icon: Pin },
  { href: "/activity", label: "Activity History", icon: History },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/roadmap-diff", label: "Roadmap Diff", icon: History },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/portfolio", label: "Portfolio", icon: FolderKanban },
  { href: "/clientsync", label: "ClientSync", icon: Layers },
  { href: "/architecture", label: "Architecture", icon: Boxes },
  { href: "/skills", label: "Skills", icon: Gauge },
  { href: "/dsa", label: "DSA Tracker", icon: Code2 },
  { href: "/exit-ladder", label: "Exit Ladder", icon: TrendingUp },
  { href: "/weekly-digest", label: "Weekly Digest", icon: NotebookText },
  { href: "/monthly-review", label: "Monthly Review", icon: CalendarRange },
  { href: "/career-plan", label: "Career Plan", icon: Rocket },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/technologies", label: "Technologies", icon: Cpu },
  { href: "/career", label: "Career Tracker", icon: Briefcase },
  { href: "/job-readiness", label: "Job Readiness", icon: Gauge },
  { href: "/career-gap", label: "Career Gap", icon: TrendingUp },
  { href: "/milestones", label: "Milestones", icon: Trophy },
  { href: "/interviews", label: "Interviews", icon: CalendarClock },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: Users },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/revision", label: "Revision", icon: RotateCcw },
  { href: "/reference", label: "Reference", icon: BookOpen },
];

const PINNED_HREFS = new Set(["/dashboard", "/roadmap", "/dsa", "/career", "/journal"]);

// Real IA — 7 named, iconed, independently collapsible sections instead of
// 5 sections (one with a null label) covering 28 flat links. Each section
// remembers its own open/closed state in localStorage.
const NAV_SECTIONS: { id: string; label: string; icon: typeof Home; hrefs: string[] }[] = [
  { id: "home", label: "Home", icon: Home, hrefs: ["/dashboard", "/daily-plan", "/weekly-digest", "/monthly-review"] },
  { id: "execute", label: "Execute", icon: Zap, hrefs: ["/goals", "/execution", "/workspace", "/journal", "/activity"] },
  { id: "learn", label: "Learn", icon: GraduationCap, hrefs: ["/roadmap", "/skills", "/dsa", "/revision", "/exit-ladder", "/roadmap-diff"] },
  { id: "build", label: "Build", icon: Hammer, hrefs: ["/projects", "/portfolio", "/clientsync", "/architecture"] },
  { id: "career", label: "Career", icon: Rocket, hrefs: ["/career-plan", "/job-readiness", "/career-gap", "/milestones", "/career", "/interviews", "/resume", "/achievements", "/leaderboard"] },
  { id: "progress", label: "Progress", icon: BarChart3, hrefs: ["/statistics"] },
  { id: "reference", label: "Reference", icon: Library, hrefs: ["/companies", "/technologies", "/reference"] },
];

// Kept for mobile-nav.tsx's existing consumption pattern (it flattens
// SIDEBAR_SECTIONS into one list) — same underlying data as NAV_SECTIONS,
// reshaped to the old { label, hrefs }[] contract so that file doesn't
// need its own rewrite to keep working.
const SIDEBAR_SECTIONS = NAV_SECTIONS.map((s) => ({ label: s.label, hrefs: s.hrefs }));

const DEFAULT_OPEN_SECTIONS = ["home", "execute", "career"];

export function Sidebar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pinned, setPinned] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const asideRef = React.useRef<HTMLElement>(null);

  function activeSectionSet() {
    const active = NAV_SECTIONS.find((s) => s.hrefs.some((h) => pathname === h || pathname.startsWith(h + "/")));
    return new Set([...DEFAULT_OPEN_SECTIONS, ...(active ? [active.id] : [])]);
  }

  const [openSections, setOpenSections] = React.useState<Set<string>>(() => activeSectionSet());

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePinned() {
    setPinned((prev) => !prev);
  }

  function closeDrawer() {
    setPinned(false);
    setHovering(false);
  }

  const expanded = pinned || hovering;

  // Collapse back to the default/active-page section whenever the sidebar
  // closes (mouse leaves and it isn't pinned open) — don't remember manually
  // opened submenus across hovers.
  React.useEffect(() => {
    if (!expanded) {
      setOpenSections(activeSectionSet());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside
      ref={asideRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "group/sidebar relative flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        expanded ? "w-64" : "w-[68px]",
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

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-1">
        {NAV_SECTIONS.map((section) => {
          const items = section.hrefs
            .filter((href) => !PINNED_HREFS.has(href))
            .map((href) => NAV.find((item) => item.href === href))
            .filter((item): item is (typeof NAV)[number] => Boolean(item));
          if (items.length === 0) return null;

          const isOpen = openSections.has(section.id);
          const hasActiveChild = items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
          const SectionIcon = section.icon;

          return (
            <div key={section.id} className="flex flex-col">
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider transition-standard",
                  hasActiveChild ? "text-accent" : "text-muted hover:text-foreground"
                )}
              >
                <SectionIcon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "flex-1 text-left whitespace-nowrap transition-standard",
                    expanded ? "opacity-100" : "opacity-0"
                  )}
                >
                  {section.label}
                </span>
                {expanded && (
                  <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </motion.span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {(isOpen || !expanded) && (
                  <motion.div
                    initial={expanded ? { height: 0, opacity: 0 } : false}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-0.5 pb-1">
                      {items.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={closeDrawer}
                            title={expanded ? undefined : label}
                            className={cn(
                              "relative flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 ml-1 text-sm font-medium transition-standard",
                              active
                                ? "border-accent text-accent"
                                : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground"
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId="sidebar-active-pill"
                                className="absolute inset-0 rounded-lg bg-accent/15 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)] -z-10"
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                              />
                            )}
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
                  </motion.div>
                )}
              </AnimatePresence>
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
          onClick={closeDrawer}
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
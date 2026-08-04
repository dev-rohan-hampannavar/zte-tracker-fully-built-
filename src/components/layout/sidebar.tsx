"use client";

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
  Terminal,
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

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Terminal className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">ZTE Tracker</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 flex flex-col gap-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export { NAV };

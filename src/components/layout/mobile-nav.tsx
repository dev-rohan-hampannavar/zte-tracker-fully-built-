"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NAV, SIDEBAR_SECTIONS } from "./sidebar";

// Mobile has no top bar, so unlike the desktop sidebar it shows every item
// — nothing is hidden as "already pinned elsewhere." Pinned items just get
// their own section up top (same order as the desktop top bar) since
// they're still the most-visited pages; everything else follows in the
// same Learning/Build/Career/Data grouping the desktop sidebar uses, so
// the two navs stay conceptually in sync.
const PINNED_ORDER = ["/dashboard", "/roadmap", "/dsa", "/career", "/journal"];
const MOBILE_SECTIONS: { label: string | null; hrefs: string[] }[] = [
  { label: "Pinned", hrefs: PINNED_ORDER },
  ...SIDEBAR_SECTIONS,
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Settings and Sign out live in a footer block on the desktop sidebar,
  // outside NAV entirely — so they were unreachable on mobile since this
  // drawer only ever rendered items from NAV. Mirrored here directly.
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <div className="flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md">
            <Image
              src="/icons/logo-mark.png"
              alt="ZTE Tracker"
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-sm font-semibold">ZTE Tracker</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 text-muted">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-64 bg-surface border-l border-border p-3 flex flex-col overflow-y-auto">
            <button onClick={() => setOpen(false)} className="self-end p-2 text-muted">
              <X className="h-5 w-5" />
            </button>
            <nav className="flex flex-col gap-3 mt-2">
              {MOBILE_SECTIONS.map((section, i) => {
                const items = section.hrefs
                  .map((href) => NAV.find((item) => item.href === href))
                  .filter((item): item is (typeof NAV)[number] => Boolean(item));
                if (items.length === 0) return null;
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    {section.label && (
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
                        {section.label}
                      </p>
                    )}
                    {items.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium",
                            active ? "bg-accent/15 text-accent" : "text-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-border pt-2 flex flex-col gap-0.5">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium",
                  pathname === "/settings" ? "bg-accent/15 text-accent" : "text-muted"
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-muted hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
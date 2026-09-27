"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";

const PATH_FLAGS: Array<{ path: string; key: string; fallback: boolean }> = [
  { path: "/portfolio", key: "portfolio_builder", fallback: true },
  { path: "/developer-activity", key: "github_integration", fallback: true },
  { path: "/leaderboard", key: "social", fallback: false },
];

export function FeatureFlagGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const requiredFlag = PATH_FLAGS.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
  const { data: enabled, isLoading, error } = useFeatureFlag(requiredFlag?.key, requiredFlag?.fallback ?? true);

  if (!requiredFlag || error) return children;
  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center" aria-label="Checking feature availability"><Loader2 className="size-5 animate-spin text-muted" /></div>;
  if (enabled) return children;

  return <div className="mx-auto flex min-h-[40vh] max-w-xl items-center p-6">
    <Card className="w-full">
      <CardHeader><CardTitle>This feature is turned off</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted">
        <p>The app administrator has disabled this area for now. Your saved data is still kept with your account.</p>
        <Link className="text-primary underline underline-offset-4" href="/dashboard">Return to your dashboard</Link>
      </CardContent>
    </Card>
  </div>;
}

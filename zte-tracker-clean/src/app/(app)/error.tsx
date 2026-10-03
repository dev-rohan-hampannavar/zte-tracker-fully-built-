"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// There was no error.tsx anywhere under (app) — and every page in this
// section is a "use client" component (dashboard, roadmap, settings, all
// of them), meaning a render-time exception (bad .map on undefined data,
// a null-deref after an unexpected API shape, etc.) had nothing catching
// it and would white-screen the page inside the app shell with no
// recovery path except a manual refresh.
//
// Placed at the (app) route-group root so it inherits for every nested
// page without needing one per route. Next keeps the surrounding layout
// (sidebar/topbar) mounted and only swaps this in for the failed segment,
// so navigation and sign-out remain usable even when one page's content
// throws.
export default function AppSectionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-muted" />
          <div>
            <p className="text-sm font-medium">Something went wrong on this page</p>
            <p className="text-xs text-muted mt-1">
              Your data is safe — this is just a display error. Try again, or head back to the dashboard.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => reset()}>
              Try again
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

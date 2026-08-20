"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// Previously there was no error.tsx here, so a genuine failure fetching
// this page (Supabase temporarily unreachable, an unexpected exception in
// getProfileData) fell through to Next's default unstyled error screen —
// jarring for what's meant to be a shareable public link. This keeps the
// same page chrome and gives visitors something actionable instead of a
// dead end.
export default function PublicProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-muted" />
          <div>
            <p className="text-sm font-medium">Couldn&apos;t load this profile</p>
            <p className="text-xs text-muted mt-1">
              Something went wrong on our end. This isn&apos;t anything wrong with the link.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

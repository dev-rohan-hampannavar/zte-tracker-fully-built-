import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";

// getProfileData() in page.tsx deliberately returns null (→ notFound())
// for both "this slug was never registered" and "this profile exists but
// the owner disabled public sharing" — distinguishing the two would leak
// which slugs are real accounts to anyone probing URLs, which is worse
// than a slightly generic message. This page's copy reflects that
// ambiguity honestly instead of confidently claiming "not found" when the
// profile might just be private.
//
// Previously there was no not-found.tsx here (or anywhere in the app),
// so this fell through to Next's bare default 404 with no styling and no
// path back into the app.
export default function PublicProfileNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
          <UserX className="h-8 w-8 text-muted" />
          <div>
            <p className="text-sm font-medium">No public profile here</p>
            <p className="text-xs text-muted mt-1">
              This link doesn&apos;t point to an active public profile — it may not exist, or the owner
              may have turned off sharing.
            </p>
          </div>
          <Link href="/" className="text-xs text-accent hover:underline">
            Go to ZTE Tracker
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

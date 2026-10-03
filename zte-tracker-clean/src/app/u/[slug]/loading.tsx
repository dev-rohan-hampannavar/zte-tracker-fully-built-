import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Next.js renders this automatically while the async PublicProfilePage
// server component is fetching (8 parallel Supabase queries + a GitHub
// API call, see page.tsx). Previously there was no loading.tsx anywhere
// under /u/[slug], so a slow load — or GitHub's API being sluggish — just
// showed a blank white screen with no feedback.
//
// Shapes here mirror the real page's structure (header, badges, stat
// grid, streak card, phase list) so there's minimal layout shift when
// real content swaps in.
export default function PublicProfileLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-7 w-56" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="print-surface">
              <CardContent className="pt-3 pb-3 flex flex-col items-center gap-1.5">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="print-surface">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { SearchX } from "lucide-react";
import { FadeUp } from "@/components/motion/primitives";

// Previously the 5 dynamic-ID pages (topic/phase/stage/company/technology)
// each independently rendered a single bare sentence — "Topic not found.",
// "Company not found.", etc — with no path back into the app. That's a
// dead-end screen: the sidebar/topbar chrome is still there, but the
// content area just stops. This gives all 5 the same look and an actual
// next step, instead of five slightly-different one-off strings.
export function RecordNotFound({ label, backHref, backLabel }: { label: string; backHref: string; backLabel: string }) {
  return (
    <FadeUp className="flex flex-col items-center text-center gap-2 py-16">
      <SearchX className="h-6 w-6 text-muted" />
      <p className="text-sm text-foreground/90">{label} not found.</p>
      <Link href={backHref} className="text-xs text-accent hover:underline">
        {backLabel}
      </Link>
    </FadeUp>
  );
}

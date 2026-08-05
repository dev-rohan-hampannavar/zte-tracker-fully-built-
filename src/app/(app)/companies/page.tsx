"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCompanies, useExitLadder } from "@/lib/hooks/use-roadmap";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/database";

// Item 3 follow-up: the schema/seed data for category, hiring_stage,
// typical_tech_stack, hiring_difficulty, and notes has existed since Stage 0,
// but this list (and the detail page) never surfaced anything past `name`.
// hiring_difficulty maps to a badge variant so it's scannable across a grid
// without reading each card's text.
const DIFFICULTY_VARIANT: Record<NonNullable<Company["hiring_difficulty"]>, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const { data: exitLadder } = useExitLadder();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return companies ?? [];
    const q = query.toLowerCase();
    return (companies ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  // A company is loosely "linked" to an exit tier if its name appears in that
  // tier's target_companies free-text field. Best-effort — the source roadmap
  // doesn't have a normalized company<->exit join.
  function linkedExit(companyName: string) {
    return (exitLadder ?? []).find((e) =>
      e.target_companies?.toLowerCase().includes(companyName.toLowerCase())
    );
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted">
          {companies?.length ?? 0} companies referenced across the roadmap, with category, hiring stage, and
          typical tech stack where known.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Search companies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => {
          const exit = linkedExit(c.name);
          return (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <CardContent className="pt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted shrink-0" />
                      <p className="text-sm font-medium truncate">{c.name}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                  </div>
                  {(c.category || c.hiring_difficulty) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {c.category}
                        </Badge>
                      )}
                      {c.hiring_difficulty && (
                        <Badge variant={DIFFICULTY_VARIANT[c.hiring_difficulty]} className="text-[10px] capitalize">
                          {c.hiring_difficulty} to hire
                        </Badge>
                      )}
                    </div>
                  )}
                  {c.hiring_stage && (
                    <p className="text-xs text-muted">{c.hiring_stage}</p>
                  )}
                  {exit && (
                    <p className={cn("text-xs text-muted", !c.category && !c.hiring_stage && "pt-0")}>
                      Referenced at Exit {exit.exit_code} — {exit.job_level}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted col-span-full text-center py-8">No matches.</p>
        )}
      </div>
    </div>
  );
}
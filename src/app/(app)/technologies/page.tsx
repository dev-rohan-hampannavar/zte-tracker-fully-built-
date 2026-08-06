"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTechnologies } from "@/lib/hooks/use-roadmap";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Cpu, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function TechnologiesPage() {
  const { data: technologies, isLoading } = useTechnologies();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return technologies ?? [];
    const q = query.toLowerCase();
    return (technologies ?? []).filter((t) => t.name.toLowerCase().includes(q));
  }, [technologies, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const tech of filtered) {
      const key = tech.category ?? "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(tech);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Technologies</h1>
        <p className="text-sm text-muted mt-1">
          {technologies?.length ?? 0} technologies referenced across the roadmap — grouped by category.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Search technologies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {grouped.length === 0 && (
        <EmptyState message="No matches." />
      )}

      <div className="flex flex-col gap-6">
        {grouped.map(([category, techs]) => (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {techs.map((t) => (
                <Link key={t.id} href={`/technologies/${t.id}`}>
                  <Card className="h-full" interactive>
                    <CardContent noHeader className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Cpu className="h-4 w-4 text-muted shrink-0" />
                        <p className="text-sm font-medium truncate">{t.name}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
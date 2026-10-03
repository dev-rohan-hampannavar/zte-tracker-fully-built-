"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Playbook, PlaybookBlock } from "@/content/shared/types";

function Block({ block }: { block: PlaybookBlock }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{block.title}</CardTitle>
        {block.intro && <p className="text-sm text-muted">{block.intro}</p>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {block.steps && (
          <ol className="list-decimal space-y-1.5 pl-5">
            {block.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        )}
        {block.items?.map((item) => (
          <div key={item.heading} className="rounded-lg border border-border/60 p-3">
            <p className="font-medium">{item.heading}</p>
            {item.body && <p className="mt-1 text-muted">{item.body}</p>}
            {item.bullets && (
              <ul className="mt-2 space-y-1 text-muted">
                {item.bullets.map((b) => <li key={b} className="flex gap-2"><span className="text-accent">•</span><span>{b}</span></li>)}
              </ul>
            )}
            {item.example && <p className="mt-2 rounded-md bg-surface-2 p-2 text-xs italic text-muted">{item.example}</p>}
          </div>
        ))}
        {block.table && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  {block.table.headers.map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {block.table.rows.map((row) => (
                  <tr key={row[0]} className="border-b border-border/40 align-top">
                    {row.map((cell, i) => <td key={i} className={i === 0 ? "py-2 pr-4 font-medium" : "py-2 pr-4 text-muted"}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {block.callout && (
          <p className="flex gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span>{block.callout}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Renders a Playbook as a tabbed, searchable-by-section reference. */
export function PlaybookView({ playbook, header }: { playbook: Playbook; header?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">{playbook.title}</h1>
        <p className="mt-1 text-sm text-muted">{playbook.subtitle}</p>
      </div>
      {header}
      <Tabs defaultValue={playbook.sections[0].id}>
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {playbook.sections.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
        </TabsList>
        {playbook.sections.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted">{s.summary}</p>
            {s.blocks.map((b) => <Block key={b.title} block={b} />)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

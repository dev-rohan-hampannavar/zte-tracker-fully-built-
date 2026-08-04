"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import manifest from "@/data/architecture_manifest.json";
import { ClientSyncArchitectureDiagram } from "@/components/architecture/clientsync-architecture-diagram";
import {
  Database,
  Route as RouteIcon,
  ArrowRight,
  GitBranch,
  AlertTriangle,
  FileCode2,
  Globe,
  Lock,
  Code2,
  Boxes,
} from "lucide-react";

type ManifestTable = {
  name: string;
  columns: number;
  references: string[];
  migration: string;
};

type ManifestRoute = {
  path: string;
  file: string;
  client_component: boolean;
  hooks_imported: string[];
  hook_functions_called: string[];
  tables_touched: string[];
  queries_directly: string[];
};

const typedManifest = manifest as {
  generated_from: {
    migrations: string[];
    hook_files_scanned: string[];
    hook_functions_scanned: number;
    routes_scanned: number;
  };
  tables: ManifestTable[];
  hook_functions: Record<string, { tables: string[]; module: string }>;
  routes: ManifestRoute[];
};

export default function ArchitecturePage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const tablesByName = useMemo(
    () => new Map(typedManifest.tables.map((t) => [t.name, t])),
    []
  );

  // A table is "referenced by" every other table whose FK list contains it.
  const referencedBy = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of typedManifest.tables) {
      for (const ref of t.references) {
        if (!map.has(ref)) map.set(ref, []);
        map.get(ref)!.push(t.name);
      }
    }
    return map;
  }, []);

  const routesForTable = useMemo(() => {
    const map = new Map<string, ManifestRoute[]>();
    for (const r of typedManifest.routes) {
      for (const t of r.tables_touched) {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push(r);
      }
    }
    return map;
  }, []);

  const orphanTables = typedManifest.tables.filter(
    (t) => !typedManifest.routes.some((r) => r.tables_touched.includes(t.name))
  );

  const dataRoutes = typedManifest.routes.filter((r) => r.tables_touched.length > 0);
  const routesTouchingSelected = selectedTable ? routesForTable.get(selectedTable) ?? [] : [];
  const selected = selectedTable ? tablesByName.get(selectedTable) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Architecture Explorer</h1>
        <p className="text-sm text-muted">
          Two views: the app&apos;s own codebase (auto-generated from migrations and hooks), and
          ClientSync&apos;s own architecture (the anchor portfolio project, hand-drawn).
        </p>
      </div>

      <Tabs defaultValue="codebase">
        <TabsList>
          <TabsTrigger value="codebase">
            <Code2 className="h-3.5 w-3.5 mr-1.5" /> This app&apos;s codebase
          </TabsTrigger>
          <TabsTrigger value="clientsync">
            <Boxes className="h-3.5 w-3.5 mr-1.5" /> ClientSync architecture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codebase" className="flex flex-col gap-6 mt-4">
      <p className="text-sm text-muted">
          Derived from the actual codebase — every table below comes from parsing{" "}
          <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">supabase/migrations/*.sql</code>,
          and every route&apos;s table list comes from tracing which hook functions it calls in{" "}
          <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">src/lib/hooks/</code>. Nothing here
          is hand-typed. Regenerate with{" "}
          <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">
            scripts/generate_architecture_manifest.py
          </code>{" "}
          whenever the schema or routes change.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <Database className="h-3 w-3" /> Tables
            </p>
            <p className="text-2xl font-bold font-mono-tabular">{typedManifest.tables.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <RouteIcon className="h-3 w-3" /> Routes
            </p>
            <p className="text-2xl font-bold font-mono-tabular">{typedManifest.generated_from.routes_scanned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <FileCode2 className="h-3 w-3" /> Hook functions
            </p>
            <p className="text-2xl font-bold font-mono-tabular">
              {typedManifest.generated_from.hook_functions_scanned}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Migrations
            </p>
            <p className="text-2xl font-bold font-mono-tabular">
              {typedManifest.generated_from.migrations.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {orphanTables.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {orphanTables.length} table{orphanTables.length === 1 ? "" : "s"} defined but never queried
              </p>
              <p className="text-xs text-muted mt-1">
                {orphanTables.map((t) => t.name).join(", ")} exist{orphanTables.length === 1 ? "s" : ""} in
                the schema but no route in the app reads from{" "}
                {orphanTables.length === 1 ? "it" : "them"} — a real gap the roadmap-only seed pipeline
                left behind (topic groups/bullets are embedded directly in the seeded topic JSON instead of
                being queried relationally).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Routes → tables</CardTitle>
          <p className="text-xs text-muted mt-1">
            Every page that queries data, and exactly which tables it touches — traced through its actual
            hook calls, not the whole hook file&apos;s surface.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {dataRoutes.map((route) => (
            <div key={route.path} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-medium font-mono-tabular">{route.path}</code>
                <Badge variant={route.client_component ? "accent" : "outline"} className="text-[10px]">
                  {route.client_component ? (
                    <span className="flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> client
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> server
                    </span>
                  )}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {route.tables_touched.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTable(t)}
                    className={cn(
                      "text-[11px] rounded-full border px-2 py-0.5 transition-colors",
                      selectedTable === t
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted hover:border-accent/40 hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Schema</CardTitle>
            <p className="text-xs text-muted mt-1">
              {typedManifest.tables.length} tables across {typedManifest.generated_from.migrations.length}{" "}
              migrations. Click a table to see who reads it.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border max-h-[32rem] overflow-y-auto">
            {typedManifest.tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={cn(
                  "py-2 first:pt-0 last:pb-0 text-left flex items-center justify-between gap-2 group",
                  selectedTable === t.name && "text-accent"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-mono-tabular truncate group-hover:text-accent transition-colors">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t.columns} columns · {t.migration}
                    {t.references.length > 0 && ` · → ${t.references.join(", ")}`}
                  </p>
                </div>
                {!typedManifest.routes.some((r) => r.tables_touched.includes(t.name)) && (
                  <Badge variant="warning" className="text-[10px] shrink-0">
                    unused
                  </Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? selected.name : "Select a table"}</CardTitle>
            {selected && (
              <p className="text-xs text-muted mt-1">
                {selected.columns} columns · added in {selected.migration}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted">
                Click any table on the left, or any pill above, to see its foreign keys and which routes
                actually read from it.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {selected.references.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1.5">References (foreign keys out)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.references.map((ref) => (
                        <button
                          key={ref}
                          onClick={() => setSelectedTable(ref)}
                          className="flex items-center gap-1 text-[11px] rounded-full border border-border px-2 py-0.5 text-muted hover:border-accent/40 hover:text-foreground transition-colors"
                        >
                          {ref} <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(referencedBy.get(selected.name) ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1.5">Referenced by (foreign keys in)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(referencedBy.get(selected.name) ?? []).map((ref) => (
                        <button
                          key={ref}
                          onClick={() => setSelectedTable(ref)}
                          className="flex items-center gap-1 text-[11px] rounded-full border border-border px-2 py-0.5 text-muted hover:border-accent/40 hover:text-foreground transition-colors"
                        >
                          <ArrowRight className="h-2.5 w-2.5 rotate-180" /> {ref}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted mb-1.5">
                    Routes that read this table ({routesTouchingSelected.length})
                  </p>
                  {routesTouchingSelected.length === 0 ? (
                    <p className="text-xs text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> No route queries this table.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {routesTouchingSelected.map((r) => (
                        <code key={r.path} className="text-xs font-mono-tabular text-accent">
                          {r.path}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="clientsync" className="flex flex-col gap-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Frontend → API → DB → auth → deployment</CardTitle>
              <p className="text-xs text-muted mt-1">
                Hand-drawn from the concrete integrations named across the ClientSync milestone
                index — this is the target architecture for the project itself, not something
                derivable from the roadmap&apos;s own schema. See the{" "}
                <a href="/clientsync" className="text-accent hover:underline">
                  ClientSync page
                </a>{" "}
                for live milestone progress.
              </p>
            </CardHeader>
            <CardContent>
              <ClientSyncArchitectureDiagram />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

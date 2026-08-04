#!/usr/bin/env python3
"""
P7.2 item 9 — Real architecture explorer.

The old /architecture page rendered a hand-typed constant (LAYERS) that had
no connection to the actual codebase. This script replaces that by deriving
the real graph from source:

  1. Every Postgres table across supabase/migrations/*.sql, with its column
     count and foreign-key edges to other tables.
  2. Every app route (src/app/**/page.tsx) and which tables it actually
     queries — either directly (`.from("...")` in the route file itself,
     e.g. the public profile page) or transitively through a
     src/lib/hooks/use-*.ts module it imports.

Nothing here is invented: every table, every column count, every FK edge,
and every route-to-table edge is regex-extracted from the files that are
actually in this repository. Re-run whenever migrations, hooks, or routes
change — this is a build-time derivation, not a runtime introspection,
since Postgres schema and Next.js routes are both static at build time.

Run: python3 scripts/generate_architecture_manifest.py
Writes: src/data/architecture_manifest.json
"""
import re
import json
import glob
import os

MIGRATIONS_DIR = "supabase/migrations"
HOOKS_DIR = "src/lib/hooks"
APP_DIR = "src/app"

# ---------- 1. Tables, columns, foreign keys from migrations ----------

TABLE_RE = re.compile(r"create table if not exists public\.(\w+)\s*\(", re.IGNORECASE)
FK_RE = re.compile(r"references public\.(\w+)\s*\(")

tables = {}  # name -> {"columns": int, "references": set(), "migration": str}

migration_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))

for path in migration_files:
    migration_name = os.path.basename(path)
    with open(path, encoding="utf-8") as f:
        text = f.read()

    for m in TABLE_RE.finditer(text):
        table_name = m.group(1)
        start = m.end()
        depth = 1
        i = start
        while i < len(text) and depth > 0:
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
            i += 1
        block = text[start:i]

        col_lines = [
            l.strip()
            for l in block.split("\n")
            if l.strip() and not l.strip().lower().startswith("constraint")
        ]
        column_count = len(col_lines)

        refs = set(FK_RE.findall(block))

        if table_name not in tables:
            tables[table_name] = {"columns": column_count, "references": set(), "migration": migration_name}
        else:
            tables[table_name]["columns"] = max(tables[table_name]["columns"], column_count)
        tables[table_name]["references"] |= refs

    for alter_match in re.finditer(r"alter table public\.(\w+)\s+([\s\S]*?);", text, re.IGNORECASE):
        alt_table = alter_match.group(1)
        alt_body = alter_match.group(2)
        alt_refs = set(FK_RE.findall(alt_body))
        if alt_refs:
            if alt_table not in tables:
                tables[alt_table] = {"columns": 0, "references": set(), "migration": migration_name}
            tables[alt_table]["references"] |= alt_refs

table_list = [
    {
        "name": name,
        "columns": info["columns"],
        "references": sorted(info["references"]),
        "migration": info["migration"],
    }
    for name, info in sorted(tables.items())
]

# ---------- 2. Hook functions -> tables they query (call-graph resolved) ----------
# A hook file often layers helpers: an exported hook calls another exported
# hook, which calls a private `fetchX` helper, which is where the actual
# `.from()` call lives. A shallow per-function regex would miss tables that
# are 2-3 calls deep (e.g. usePhasesWithProgress -> useRoadmap -> fetchRoadmap
# -> .from("phases")). So: parse every function in the file (exported AND
# private `async function` helpers), record each one's own direct `.from()`
# calls plus which *other* functions-in-this-file it calls, then resolve
# transitively until every function's table set is the union of everything
# reachable from it.

ANY_FUNC_RE = re.compile(r"^((?:export )?(?:async )?function (\w+)\s*\()", re.MULTILINE)

hook_functions = {}       # exported hook name -> {"tables": [...], "module": str}
hook_file_all_tables = {}  # module -> set of every table anything in it touches

for path in sorted(glob.glob(os.path.join(HOOKS_DIR, "use-*.ts"))):
    module_name = os.path.splitext(os.path.basename(path))[0]
    with open(path, encoding="utf-8") as f:
        text = f.read()

    matches = list(ANY_FUNC_RE.finditer(text))
    func_names = [m.group(2) for m in matches]
    is_exported = {m.group(2): m.group(1).startswith("export") for m in matches}

    # direct tables + direct calls-to-other-local-functions, per function
    direct_tables = {}
    direct_calls = {}
    for idx, m in enumerate(matches):
        name = m.group(2)
        body_start = m.end()
        body_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = text[body_start:body_end]
        direct_tables[name] = set(re.findall(r'\.from\("([a-z_]+)"\)', body))
        # a call to another function defined in this same file — either
        # invoked directly (fetchX()) or passed by reference (useSWR(key, fetchX))
        direct_calls[name] = {
            other for other in func_names
            if other != name and re.search(r"\b" + re.escape(other) + r"\b", body)
        }

    # resolve transitively (simple fixed-point iteration; file sizes here are tiny)
    resolved = {name: set(direct_tables[name]) for name in func_names}
    changed = True
    while changed:
        changed = False
        for name in func_names:
            before = len(resolved[name])
            for callee in direct_calls[name]:
                resolved[name] |= resolved.get(callee, set())
            if len(resolved[name]) > before:
                changed = True

    file_tables = set()
    for name in func_names:
        file_tables |= resolved[name]
        if is_exported.get(name):
            hook_functions[name] = {"tables": sorted(resolved[name]), "module": module_name}
    hook_file_all_tables[module_name] = file_tables

# ---------- 3. Routes -> specific hook functions called + direct .from() calls ----------

route_files = sorted(glob.glob(os.path.join(APP_DIR, "**", "page.tsx"), recursive=True))

routes = []
for path in route_files:
    with open(path, encoding="utf-8") as f:
        text = f.read()

    rel = os.path.relpath(path, APP_DIR)
    rel = rel[: -len("/page.tsx")] if rel != "page.tsx" else ""
    segments = [s for s in rel.split(os.sep) if s and not (s.startswith("(") and s.endswith(")"))]
    route_path = "/" + "/".join(segments) if segments else "/"

    imported_hooks = set(re.findall(r'from "@/lib/hooks/(use-[a-z-]+)"', text))
    direct_tables = set(re.findall(r'\.from\("([a-z_]+)"\)', text))

    # Which specific exported hook functions does this route actually call?
    # (A function is "called" if its name appears anywhere in the route
    # source outside the import line — a simple but accurate-enough check
    # since hook function names are distinctive, e.g. useClientSyncMilestones.)
    called_functions = sorted(
        name for name in hook_functions if re.search(r"\b" + re.escape(name) + r"\s*\(", text)
    )
    transitive_tables = set(direct_tables)
    for fname in called_functions:
        transitive_tables |= set(hook_functions[fname]["tables"])

    is_client = '"use client"' in text[:200]

    routes.append(
        {
            "path": route_path,
            "file": path.replace("\\", "/"),
            "client_component": is_client,
            "hooks_imported": sorted(imported_hooks),
            "hook_functions_called": called_functions,
            "tables_touched": sorted(transitive_tables),
            "queries_directly": sorted(direct_tables),
        }
    )

routes.sort(key=lambda r: r["path"])

# ---------- 4. Assemble + write ----------

manifest = {
    "generated_from": {
        "migrations": [os.path.basename(p) for p in migration_files],
        "hook_files_scanned": sorted(hook_file_all_tables.keys()),
        "hook_functions_scanned": len(hook_functions),
        "routes_scanned": len(routes),
    },
    "tables": table_list,
    "hook_functions": {
        name: info for name, info in sorted(hook_functions.items())
    },
    "routes": routes,
}

with open("src/data/architecture_manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"Tables discovered: {len(table_list)}")
print(f"Hook files scanned: {len(hook_file_all_tables)}")
print(f"Hook functions scanned: {len(hook_functions)}")
print(f"Routes scanned: {len(routes)}")
all_touched = {t for r in routes for t in r["tables_touched"]}
orphan_tables = set(tables.keys()) - all_touched
if orphan_tables:
    print(f"Tables with no route reference found: {sorted(orphan_tables)}")
else:
    print("Every table is queried by at least one route.")
print("Wrote src/data/architecture_manifest.json")

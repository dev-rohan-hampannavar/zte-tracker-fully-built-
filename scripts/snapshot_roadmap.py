#!/usr/bin/env python3
"""
P7.6 — Roadmap diff / versioning: snapshot generator.

Reads data/seed.json (produced by parse_roadmap.py + parse_roadmap_part1.py
+ merge_seed.py) and roadmap.md, and writes a new versioned snapshot to
data/roadmap_snapshot_v{N}.json plus a matching SQL insert file. Intended
to run once per re-parse of roadmap.md — comparing consecutive snapshots
via diff_roadmap_snapshots.py is what "roadmap diff" actually means.

This does NOT auto-increment against Supabase (no live DB connection in
this environment) — it looks at the highest existing
data/roadmap_snapshot_v*.json file on disk and picks the next number, so
re-running it locally multiple times produces v1, v2, v3, ... in order.

Run: python3 scripts/snapshot_roadmap.py
Writes: data/roadmap_snapshot_v{N}.json, supabase/seed_data_snapshot_v{N}.sql
"""
import json
import glob
import hashlib
import re
import sys
from datetime import datetime, timezone

with open("data/seed.json", encoding="utf-8") as f:
    seed = json.load(f)

with open("roadmap.md", "rb") as f:
    source_hash = hashlib.sha256(f.read()).hexdigest()

existing = sorted(glob.glob("data/roadmap_snapshot_v*.json"))
existing_versions = [int(m.group(1)) for p in existing if (m := re.search(r"_v(\d+)\.json$", p))]
next_version = (max(existing_versions) + 1) if existing_versions else 1

entities = []

for p in seed["phases"]:
    entities.append({
        "entity_type": "phase",
        "entity_id": p["id"],
        "parent_id": None,
        "title": p["title"],
        "order_index": p["order_index"],
        "estimated_hours": p.get("estimated_hours"),
    })

for s in seed["stages"]:
    entities.append({
        "entity_type": "stage",
        "entity_id": s["id"],
        "parent_id": s["phase_id"],
        "title": s["title"],
        "order_index": s["order_index"],
        "estimated_hours": s.get("estimated_hours"),
    })

for t in seed["topics"]:
    entities.append({
        "entity_type": "topic",
        "entity_id": t["id"],
        "parent_id": t.get("stage_id") or t.get("phase_id"),
        "title": t["title"],
        "order_index": t["order_index"],
        "estimated_hours": t.get("estimated_hours"),
    })

snapshot = {
    "version": next_version,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "source_hash": source_hash,
    "phase_count": len(seed["phases"]),
    "stage_count": len(seed["stages"]),
    "topic_count": len(seed["topics"]),
    "entities": entities,
}

out_path = f"data/roadmap_snapshot_v{next_version}.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(snapshot, f, indent=2, ensure_ascii=False)

if existing_versions:
    prev_path = f"data/roadmap_snapshot_v{next_version - 1}.json"
    with open(prev_path, encoding="utf-8") as f:
        prev = json.load(f)
    if prev["source_hash"] == source_hash:
        print(
            f"WARNING: source_hash matches v{next_version - 1} — roadmap.md hasn't changed. "
            f"Snapshot v{next_version} was still written, but a diff against v{next_version - 1} will show no changes.",
            file=sys.stderr,
        )


def esc(v):
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


sql = []
sql.append("begin;")
sql.append(
    f"insert into public.roadmap_snapshots (version, source_hash, phase_count, stage_count, topic_count) "
    f"values ({next_version}, {esc(source_hash)}, {len(seed['phases'])}, {len(seed['stages'])}, {len(seed['topics'])});"
)
sql.append("")
for e in entities:
    sql.append(
        "insert into public.roadmap_snapshot_entities "
        "(snapshot_id, entity_type, entity_id, parent_id, title, order_index, estimated_hours) values ("
        f"(select id from public.roadmap_snapshots where version = {next_version}), "
        f"{esc(e['entity_type'])}, {esc(e['entity_id'])}, {esc(e['parent_id'])}, {esc(e['title'])}, "
        f"{esc(e['order_index'])}, {esc(e['estimated_hours'])});"
    )
sql.append("")
sql.append("commit;")

sql_path = f"supabase/seed_data_snapshot_v{next_version}.sql"
with open(sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print(f"Wrote {out_path} (version {next_version})")
print(f"  {len(seed['phases'])} phases, {len(seed['stages'])} stages, {len(seed['topics'])} topics")
print(f"Wrote {sql_path}")

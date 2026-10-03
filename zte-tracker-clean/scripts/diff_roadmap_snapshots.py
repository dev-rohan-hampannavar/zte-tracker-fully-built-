#!/usr/bin/env python3
"""
P7.6 — Roadmap diff / versioning: diff computation.

Compares two snapshot JSON files (data/roadmap_snapshot_v{A}.json and
data/roadmap_snapshot_v{B}.json) and reports, per entity_type (phase /
stage / topic):
  - added: entity_id exists in B but not A
  - removed: entity_id exists in A but not B
  - changed: same entity_id, but title or estimated_hours differs
  - moved: same entity_id, same title/hours, but order_index or parent_id differs

Run: python3 scripts/diff_roadmap_snapshots.py <version_a> <version_b>
Writes: data/roadmap_diff_v{A}_v{B}.json
"""
import json
import sys

if len(sys.argv) != 3:
    print("Usage: python3 scripts/diff_roadmap_snapshots.py <version_a> <version_b>", file=sys.stderr)
    sys.exit(1)

va, vb = sys.argv[1], sys.argv[2]

with open(f"data/roadmap_snapshot_v{va}.json", encoding="utf-8") as f:
    snap_a = json.load(f)
with open(f"data/roadmap_snapshot_v{vb}.json", encoding="utf-8") as f:
    snap_b = json.load(f)


def by_id(snapshot):
    return {e["entity_id"]: e for e in snapshot["entities"]}


a_entities = by_id(snap_a)
b_entities = by_id(snap_b)

added = []
removed = []
changed = []
moved = []

for entity_id, b in b_entities.items():
    if entity_id not in a_entities:
        added.append(b)

for entity_id, a in a_entities.items():
    if entity_id not in b_entities:
        removed.append(a)

for entity_id in set(a_entities) & set(b_entities):
    a, b = a_entities[entity_id], b_entities[entity_id]
    content_changed = a["title"] != b["title"] or a.get("estimated_hours") != b.get("estimated_hours")
    position_changed = a["order_index"] != b["order_index"] or a.get("parent_id") != b.get("parent_id")

    if content_changed:
        changed.append({
            "entity_id": entity_id,
            "entity_type": b["entity_type"],
            "before": {"title": a["title"], "estimated_hours": a.get("estimated_hours")},
            "after": {"title": b["title"], "estimated_hours": b.get("estimated_hours")},
        })
    elif position_changed:
        moved.append({
            "entity_id": entity_id,
            "entity_type": b["entity_type"],
            "before": {"order_index": a["order_index"], "parent_id": a.get("parent_id")},
            "after": {"order_index": b["order_index"], "parent_id": b.get("parent_id")},
        })

diff = {
    "from_version": int(va),
    "to_version": int(vb),
    "from_hash": snap_a["source_hash"],
    "to_hash": snap_b["source_hash"],
    "unchanged_source": snap_a["source_hash"] == snap_b["source_hash"],
    "added": sorted(added, key=lambda e: (e["entity_type"], e["order_index"])),
    "removed": sorted(removed, key=lambda e: (e["entity_type"], e["order_index"])),
    "changed": sorted(changed, key=lambda e: e["entity_type"]),
    "moved": sorted(moved, key=lambda e: e["entity_type"]),
}

out_path = f"data/roadmap_diff_v{va}_v{vb}.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(diff, f, indent=2, ensure_ascii=False)

print(f"v{va} -> v{vb}: {len(added)} added, {len(removed)} removed, {len(changed)} changed, {len(moved)} moved")
print(f"Wrote {out_path}")

#!/usr/bin/env python3
"""
P7.0 — Merges data/seed_part1.json (Orientation/Dashboards/Navigation/Timeline)
into data/seed.json produced by parse_roadmap.py. Run parse_roadmap.py and
parse_roadmap_part1.py first.

Run: python3 scripts/merge_seed.py
Writes: data/seed.json (updated in place)
"""
import json

with open("data/seed.json", encoding="utf-8") as f:
    seed = json.load(f)

with open("data/seed_part1.json", encoding="utf-8") as f:
    part1 = json.load(f)

seed["orientation"] = part1["orientation"]
seed["why_this_works"] = part1["why_this_works"]
seed["dashboards"] = part1["dashboards"]
seed["navigation"] = part1["navigation"]
seed["timeline"] = part1["timeline"]

seed["metadata"]["part1_parsed"] = True
seed["metadata"]["quick_start_checklist_items"] = len(part1["orientation"]["quick_start_checklist"])
seed["metadata"]["why_this_works_rows"] = len(part1["why_this_works"])
seed["metadata"]["master_phase_table_rows"] = len(part1["dashboards"]["master_phase_table"])
seed["metadata"]["skill_track_count"] = len(part1["navigation"]["skill_tracks"])

with open("data/seed.json", "w", encoding="utf-8") as f:
    json.dump(seed, f, indent=2, ensure_ascii=False)

print("Merged Part I content into data/seed.json")
print(f"  orientation.quick_start_checklist: {len(part1['orientation']['quick_start_checklist'])} items")
print(f"  why_this_works: {len(part1['why_this_works'])} rows")
print(f"  dashboards.master_phase_table: {len(part1['dashboards']['master_phase_table'])} rows")
print(f"  dashboards.hours_breakdown: {len(part1['dashboards']['hours_breakdown'])} rows")
print(f"  dashboards.difficulty_ramp: {len(part1['dashboards']['difficulty_ramp'])} rows")
print(f"  dashboards.source_discrepancies: {len(part1['dashboards']['source_discrepancies'])} rows")
print(f"  navigation.skill_tracks: {len(part1['navigation']['skill_tracks'])} tracks")
print(f"  timeline.month_by_month: {len(part1['timeline']['month_by_month'])} rows")
print(f"  timeline.phase_checklist: {len(part1['timeline']['phase_checklist'])} rows")

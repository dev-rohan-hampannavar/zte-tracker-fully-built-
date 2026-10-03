#!/usr/bin/env python3
import json

with open("data/seed.json", encoding="utf-8") as f:
    d = json.load(f)

def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def num(n):
    return "NULL" if n is None else str(n)

def bool_(b):
    return "true" if b else "false"

lines = []
lines.append("-- Auto-generated from roadmap markdown. Do not edit by hand — regenerate via scripts/generate_seed_sql.py")
lines.append("begin;")
lines.append("")

# roadmap_metadata
m = d["metadata"]
lines.append("insert into public.roadmap_metadata (id, title, total_phases, total_topics, total_realistic_hours, source_stated_hours, months_at_40hrs_week, dsa_easy_target, dsa_medium_target)")
lines.append(f"values (1, {esc(m['title'])}, {num(m['total_phases'])}, {num(m['total_topics'])}, {num(m['total_realistic_hours'])}, {num(m['source_stated_hours'])}, {num(m['months_at_40hrs_week'])}, {num(d['dsa_gates']['easy_target'])}, {num(d['dsa_gates']['medium_target'])})")
lines.append("on conflict (id) do update set title=excluded.title, total_phases=excluded.total_phases, total_topics=excluded.total_topics, total_realistic_hours=excluded.total_realistic_hours, source_stated_hours=excluded.source_stated_hours, months_at_40hrs_week=excluded.months_at_40hrs_week, dsa_easy_target=excluded.dsa_easy_target, dsa_medium_target=excluded.dsa_medium_target, updated_at=now();")
lines.append("")

# phases
lines.append("delete from public.phases;")  # topics cascade
skip_bip_phases = {"phase-08", "phase-15"}
for p in d["phases"]:
    skip = p["id"] in skip_bip_phases
    lines.append(
        "insert into public.phases (id, phase_number, title, band, estimated_hours, exit_point_code, build_in_public_prompt, skip_build_in_public, order_index) values ("
        f"{esc(p['id'])}, {esc(p['phase_number'])}, {esc(p['title'])}, {esc(p['band'])}, {num(p['estimated_hours'])}, {esc(p['exit_point_code'])}, {esc(p['build_in_public_prompt'])}, {bool_(skip)}, {num(p['order_index'])});"
    )
lines.append("")

# topics
for t in d["topics"]:
    lines.append(
        "insert into public.topics (id, phase_id, order_index, title, estimated_hours) values ("
        f"{esc(t['id'])}, {esc(t['phase_id'])}, {num(t['order_index'])}, {esc(t['title'])}, {num(t['estimated_hours'])});"
    )
lines.append("")

# exit_ladder
lines.append("delete from public.exit_ladder;")
for i, e in enumerate(d["exit_ladder"]):
    lines.append(
        "insert into public.exit_ladder (exit_code, linked_phase, name, job_level, salary_range, target_companies, highlights, order_index) values ("
        f"{esc(e['exit_code'])}, {esc(e['linked_phase'])}, {esc(e.get('name'))}, {esc(e.get('job_level'))}, {esc(e.get('salary_range'))}, {esc(e.get('target_companies'))}, {esc(e.get('highlights'))}, {num(i)});"
    )

lines.append("")
lines.append("commit;")

with open("supabase/seed_data.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Wrote supabase/seed_data.sql ({len(lines)} lines)")

# ============================================================================
# P7.0 — Part I reference content (orientation, dashboards, navigation, timeline)
# Written to a separate file since it's new in this pass; the tables above
# were not all covered by this script before P7.0 either (stages/projects/
# exercises/capstones/clientsync/companies are seeded via a different path —
# out of scope here, left untouched).
# ============================================================================
def jsonb(v):
    return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"

p1_lines = []
p1_lines.append("-- Auto-generated from roadmap.md Part I. Do not edit by hand — regenerate via scripts/generate_seed_sql.py")
p1_lines.append("begin;")
p1_lines.append("")

o = d.get("orientation")
if o:
    p1_lines.append(
        "insert into public.orientation (id, overview, who_is_this_for, key_note, job_market_case, "
        "build_in_public_guide, quick_start_checklist, critical_advice, weekly_pace_options, "
        "phase_summaries, decision_matrix, decision_rule) values ("
        f"1, {esc(o.get('overview'))}, {jsonb(o.get('who_is_this_for', []))}, {esc(o.get('key_note'))}, "
        f"{esc(o.get('job_market_case'))}, {esc(o.get('build_in_public_guide'))}, "
        f"{jsonb(o.get('quick_start_checklist', []))}, {esc(o.get('critical_advice'))}, "
        f"{jsonb(o.get('weekly_pace_options', []))}, {jsonb(o.get('phase_summaries', []))}, "
        f"{jsonb(o.get('decision_matrix', []))}, {esc(o.get('decision_rule'))})"
    )
    p1_lines.append(
        "on conflict (id) do update set overview=excluded.overview, who_is_this_for=excluded.who_is_this_for, "
        "key_note=excluded.key_note, job_market_case=excluded.job_market_case, "
        "build_in_public_guide=excluded.build_in_public_guide, quick_start_checklist=excluded.quick_start_checklist, "
        "critical_advice=excluded.critical_advice, weekly_pace_options=excluded.weekly_pace_options, "
        "phase_summaries=excluded.phase_summaries, decision_matrix=excluded.decision_matrix, "
        "decision_rule=excluded.decision_rule, updated_at=now();"
    )
    p1_lines.append("")

wtw = d.get("why_this_works", [])
if wtw:
    p1_lines.append("delete from public.why_this_works;")
    for i, row in enumerate(wtw):
        p1_lines.append(
            "insert into public.why_this_works (failure_mode, mechanism, order_index) values ("
            f"{esc(row['failure_mode'])}, {esc(row['mechanism'])}, {num(i)});"
        )
    p1_lines.append("")

dash = d.get("dashboards", {})
mpt = dash.get("master_phase_table", [])
if mpt:
    p1_lines.append("delete from public.master_phase_table;")
    for i, row in enumerate(mpt):
        p1_lines.append(
            "insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ("
            f"{esc(row['phase'])}, {esc(row['focus'])}, {esc(row.get('weeks'))}, {esc(row.get('header_hours'))}, "
            f"{esc(row.get('realistic_hours'))}, {esc(row.get('band'))}, {esc(row.get('track'))}, {num(i)});"
        )
    p1_lines.append("")

hb = dash.get("hours_breakdown", [])
if hb:
    p1_lines.append("delete from public.hours_breakdown;")
    for i, row in enumerate(hb):
        p1_lines.append(
            "insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ("
            f"{esc(row['phase'])}, {esc(row.get('learn'))}, {esc(row.get('problems'))}, {esc(row.get('project'))}, "
            f"{esc(row.get('clientsync'))}, {esc(row.get('realistic_total'))}, {num(i)});"
        )
    p1_lines.append("")

pt = dash.get("program_total")
if pt:
    p1_lines.append(
        "insert into public.program_total (id, original_stated, raw_bottom_up_sum, realistic_total, net_change) values ("
        f"1, {esc(pt.get('original_stated'))}, {esc(pt.get('raw_bottom_up_sum'))}, {esc(pt.get('realistic_total'))}, {esc(pt.get('net_change'))})"
    )
    p1_lines.append(
        "on conflict (id) do update set original_stated=excluded.original_stated, "
        "raw_bottom_up_sum=excluded.raw_bottom_up_sum, realistic_total=excluded.realistic_total, "
        "net_change=excluded.net_change;"
    )
    p1_lines.append("")

dr = dash.get("difficulty_ramp", [])
if dr:
    p1_lines.append("delete from public.difficulty_ramp;")
    for i, row in enumerate(dr):
        p1_lines.append(
            "insert into public.difficulty_ramp (band, phase, title, order_index) values ("
            f"{esc(row['band'])}, {esc(row['phase'])}, {esc(row['title'])}, {num(i)});"
        )
    p1_lines.append("")

sd = dash.get("source_discrepancies", [])
if sd:
    p1_lines.append("delete from public.source_discrepancies;")
    for i, row in enumerate(sd):
        p1_lines.append(
            "insert into public.source_discrepancies (phase, discrepancy, order_index) values ("
            f"{esc(row['phase'])}, {esc(row['discrepancy'])}, {num(i)});"
        )
    p1_lines.append("")

nav = d.get("navigation", {})
st = nav.get("skill_tracks", [])
if st:
    p1_lines.append("delete from public.skill_tracks;")
    for i, row in enumerate(st):
        p1_lines.append(
            "insert into public.skill_tracks (track, phases, order_index) values ("
            f"{esc(row['track'])}, {jsonb(row.get('phases', []))}, {num(i)});"
        )
    p1_lines.append("")

if nav:
    p1_lines.append(
        "insert into public.navigation_notes (id, dsa_spine_index, mvp_fast_path) values ("
        f"1, {esc(nav.get('dsa_spine_index'))}, {jsonb(nav.get('mvp_fast_path', []))})"
    )
    p1_lines.append(
        "on conflict (id) do update set dsa_spine_index=excluded.dsa_spine_index, mvp_fast_path=excluded.mvp_fast_path;"
    )
    p1_lines.append("")

tl = d.get("timeline", {})
mbm = tl.get("month_by_month", [])
if mbm:
    p1_lines.append("delete from public.month_by_month;")
    for i, row in enumerate(mbm):
        p1_lines.append(
            "insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ("
            f"{esc(row['month'])}, {esc(row['phases_active'])}, {esc(row['focus'])}, {esc(row.get('realistic_hours'))}, {num(i)});"
        )
    p1_lines.append("")

pc = tl.get("phase_checklist", [])
if pc:
    p1_lines.append("delete from public.phase_checklist;")
    for i, row in enumerate(pc):
        p1_lines.append(
            "insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ("
            f"{esc(row['phase'])}, {esc(row['title'])}, {esc(row.get('hours'))}, {esc(row.get('weeks'))}, {num(i)});"
        )
    p1_lines.append("")

# roadmap_metadata rollup columns added in 0004
p1_lines.append(
    "update public.roadmap_metadata set part1_parsed = true, "
    f"quick_start_checklist_items = {num(m.get('quick_start_checklist_items'))}, "
    f"why_this_works_rows = {num(m.get('why_this_works_rows'))}, "
    f"master_phase_table_rows = {num(m.get('master_phase_table_rows'))}, "
    f"skill_track_count = {num(m.get('skill_track_count'))} "
    "where id = 1;"
)

p1_lines.append("")
p1_lines.append("commit;")

with open("supabase/seed_data_part1.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(p1_lines))

print(f"Wrote supabase/seed_data_part1.sql ({len(p1_lines)} lines)")

# ============================================================================
# Stage 0 — structural + entity tables: stages, stage_projects, stage_exercises,
# capstones, clientsync_milestones, companies (with profile fields), and the
# new technologies / topic_technologies tables.
#
# These were all present in data/seed.json's output but had no SQL emission
# path anywhere in this script before now — the comment above (removed) said
# they were "seeded via a different path", but no such path exists in this
# repo. This closes that gap alongside the Stage 0 schema work.
# ============================================================================
def sql_array(items):
    if not items:
        return "NULL"
    return "ARRAY[" + ",".join(esc(i) for i in items) + "]::text[]"

import uuid
NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
def deterministic_uuid(key):
    return str(uuid.uuid5(NAMESPACE, key))

s3_lines = []
s3_lines.append("-- Auto-generated from roadmap markdown. Do not edit by hand — regenerate via scripts/generate_seed_sql.py")
s3_lines.append("begin;")
s3_lines.append("")

stages = d.get("stages", [])
if stages:
    s3_lines.append("delete from public.stages;")  # topic_groups/stage_projects/stage_exercises cascade where FK'd
    for s in stages:
        s3_lines.append(
            "insert into public.stages (id, phase_id, stage_number, title, description, estimated_hours, order_index) values ("
            f"{esc(s['id'])}, {esc(s['phase_id'])}, {num(s['stage_number'])}, {esc(s['title'])}, "
            f"{esc(s.get('description'))}, {num(s.get('estimated_hours'))}, {num(s['order_index'])});"
        )
    s3_lines.append("")

    # topics.stage_id / heading_number / intro (columns added in 0002, populated here)
    for t in d.get("topics", []):
        if t.get("stage_id") or t.get("heading_number") is not None or t.get("intro"):
            s3_lines.append(
                f"update public.topics set stage_id = {esc(t.get('stage_id'))}, "
                f"heading_number = {num(t.get('heading_number'))}, intro = {esc(t.get('intro'))} "
                f"where id = {esc(t['id'])};"
            )
    s3_lines.append("")

    # topic_groups + topic_group_bullets — source groups have no stable id/order_index
    # of their own, so both are derived from position within the topic.
    for t in d.get("topics", []):
        for gi, g in enumerate(t.get("groups", []) or []):
            gid = deterministic_uuid(f"{t['id']}-grp-{gi}")
            s3_lines.append(
                "insert into public.topic_groups (id, topic_id, heading, order_index) values ("
                f"{esc(gid)}, {esc(t['id'])}, {esc(g.get('heading'))}, {num(gi)}) "
                "on conflict (id) do nothing;"
            )
            for bi, b in enumerate(g.get("bullets", []) or []):
                content = b["content"] if isinstance(b, dict) else b
                order_i = b.get("order_index", bi) if isinstance(b, dict) else bi
                s3_lines.append(
                    "insert into public.topic_group_bullets (topic_group_id, content, order_index) values ("
                    f"{esc(gid)}, {esc(content)}, {num(order_i)});"
                )
    s3_lines.append("")

stage_projects = d.get("stage_projects", [])
if stage_projects:
    s3_lines.append("delete from public.stage_projects;")
    for p in stage_projects:
        s3_lines.append(
            "insert into public.stage_projects (id, stage_id, name, difficulty, description) values ("
            f"{esc(p['id'])}, {esc(p['stage_id'])}, {esc(p['name'])}, {esc(p['difficulty'])}, {esc(p['description'])});"
        )
    s3_lines.append("")

stage_exercises = d.get("stage_exercises", [])
if stage_exercises:
    s3_lines.append("delete from public.stage_exercises;")
    for e in stage_exercises:
        s3_lines.append(
            "insert into public.stage_exercises (id, stage_id, description) values ("
            f"{esc(e['id'])}, {esc(e['stage_id'])}, {esc(e['description'])});"
        )
    s3_lines.append("")

capstones = d.get("capstones", [])
if capstones:
    s3_lines.append("delete from public.capstones;")
    for c in capstones:
        s3_lines.append(
            "insert into public.capstones (id, phase_id, name, title, description) values ("
            f"{esc(c['id'])}, {esc(c['phase_id'])}, {esc(c['name'])}, {esc(c['title'])}, {esc(c['description'])});"
        )
    s3_lines.append("")

clientsync = d.get("clientsync_milestones", [])
if clientsync:
    s3_lines.append("delete from public.clientsync_milestones;")
    for c in clientsync:
        s3_lines.append(
            "insert into public.clientsync_milestones (id, linked_phase, description) values ("
            f"{esc(c['id'])}, {esc(c.get('linked_phase'))}, {esc(c['description'])});"
        )
    s3_lines.append("")

companies = d.get("companies", [])
if companies:
    s3_lines.append("delete from public.companies;")
    for c in companies:
        s3_lines.append(
            "insert into public.companies (id, name, category, hiring_stage, typical_tech_stack, hiring_difficulty) values ("
            f"{esc(c['id'])}, {esc(c['name'])}, {esc(c.get('category'))}, {esc(c.get('hiring_stage'))}, "
            f"{sql_array(c.get('typical_tech_stack'))}, {esc(c.get('hiring_difficulty'))});"
        )
    s3_lines.append("")

technologies = d.get("technologies", [])
if technologies:
    s3_lines.append("delete from public.topic_technologies;")  # FK to technologies, clear first
    s3_lines.append("delete from public.technologies;")
    for t in technologies:
        s3_lines.append(
            "insert into public.technologies (id, name, category) values ("
            f"{esc(t['id'])}, {esc(t['name'])}, {esc(t.get('category'))});"
        )
    s3_lines.append("")

    topic_technologies = d.get("topic_technologies", [])
    for tt in topic_technologies:
        s3_lines.append(
            "insert into public.topic_technologies (topic_id, technology_id) values ("
            f"{esc(tt['topic_id'])}, {esc(tt['technology_id'])}) on conflict do nothing;"
        )
    s3_lines.append("")

advanced_projects = d.get("advanced_projects", [])
if advanced_projects:
    s3_lines.append("delete from public.advanced_projects;")
    for p in advanced_projects:
        s3_lines.append(
            "insert into public.advanced_projects (id, order_index, name, tagline, problem, who_exactly, "
            "what_exists, the_gap, core_features, advanced_features, skill_mapping, monetization, first_users) values ("
            f"{esc(p['id'])}, {num(p['order_index'])}, {esc(p['name'])}, {esc(p['tagline'])}, "
            f"{esc(p['problem'])}, {esc(p['who_exactly'])}, {esc(p['what_exists'])}, {esc(p['the_gap'])}, "
            f"{sql_array(p['core_features'])}, {sql_array(p['advanced_features'])}, "
            f"{esc(json.dumps(p['skill_mapping']))}::jsonb, {esc(p['monetization'])}, {esc(p['first_users'])});"
        )
    s3_lines.append("")

# roadmap_metadata rollups for this file's tables
s3_lines.append(
    "update public.roadmap_metadata set total_stages = "
    f"{num(m.get('total_stages'))}, total_capstones = {num(m.get('total_capstones'))}, "
    f"total_stage_projects = {num(m.get('total_stage_projects'))}, "
    f"total_stage_exercises = {num(m.get('total_stage_exercises'))}, "
    f"total_companies = {num(m.get('total_companies'))}, "
    f"total_technologies = {num(m.get('total_technologies'))}, "
    f"total_advanced_projects = {num(m.get('total_advanced_projects'))} where id = 1;"
)

s3_lines.append("")
s3_lines.append("commit;")

with open("supabase/seed_data_structural.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(s3_lines))

print(f"Wrote supabase/seed_data_structural.sql ({len(s3_lines)} lines)")

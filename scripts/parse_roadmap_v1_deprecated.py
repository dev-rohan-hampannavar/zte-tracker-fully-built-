#!/usr/bin/env python3
"""
Parses Zero_to_Elite roadmap markdown into structured JSON seed data:
- phases (with hours, exit code, build-in-public prompt)
- topics (per phase, ordered)
- exit_ladder
- dsa_gates / roadmap_metadata
"""
import re, json, sys

SRC = "roadmap.md"
with open(SRC, encoding="utf-8") as f:
    text = f.read()

lines = text.split("\n")

# ---------- Locate phase section boundaries (the "# **Phase NN — Title**" headers, second occurrence set = full detail sections) ----------
phase_header_re = re.compile(r"^#\s+\*\*Phase\s+([0-9]+b?)\s+—\s+(.+?)\*\*\s*$")

headers = []
for i, l in enumerate(lines):
    m = phase_header_re.match(l.strip())
    if m:
        headers.append((i, m.group(1), m.group(2).strip()))

# Filter: keep only headers that are followed within ~5 lines by a "Band:" line (i.e. the real detail section, not TOC)
detail_headers = []
for (i, num, title) in headers:
    window = "\n".join(lines[i:i+6])
    if "Band:" in window or "Realistic hours" in window:
        detail_headers.append((i, num, title))

print(f"Found {len(detail_headers)} phase detail sections", file=sys.stderr)

phase_order = ["01","01b","02","03","04","05","06","06b","07","08","09","10","11","12","13","14","15","16","17","18","19"]

phases = []
topics = []

def clean_cell(s):
    s = s.strip()
    s = s.replace("\\#", "#").replace("\\+", "+").replace("\\~", "~").replace("\\<", "<").replace("\\>", ">").replace("\\-", "-").replace("\\.", ".")
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    return s.strip()

for idx, (start, num, title) in enumerate(detail_headers):
    end = detail_headers[idx+1][0] if idx+1 < len(detail_headers) else len(lines)
    block = lines[start:end]
    block_text = "\n".join(block)

    # Band / realistic hours
    band_m = re.search(r"Band:\s*([^\u00b7\n]+?)\s*(?:\u00b7|·)", block_text)
    band = band_m.group(1).strip() if band_m else None

    hours_m = re.search(r"Realistic hours:\s*([0-9]+)h", block_text)
    realistic_hours = int(hours_m.group(1)) if hours_m else None

    exit_m = re.search(r"Exit\s*(★?\d*[A-Za-z0-9]*)\s*:\s*([^\n)]+?)(?:\s*\(([^)]+)\))?\s*$", block_text.split("\n")[2] if len(block_text.split("\n"))>2 else "", re.MULTILINE)
    exit_code = None
    exit_line_m = re.search(r"Exit\s+([★\w\d]+):", block_text[:1500])
    if exit_line_m:
        exit_code = exit_line_m.group(1)

    # Build in public prompt
    bip_m = re.search(r"📣\s*BUILD IN PUBLIC Post:\s*(.+?)\s*(?:GitHub:)?\s*\|\s*\n\s*\|\s*:----\s*\|", block_text)
    bip = clean_cell(bip_m.group(1)) if bip_m else None
    if bip:
        bip = re.sub(r"\\\*\\\*\s*$", "", bip).strip()

    # Topic table: find the "| # | TOPIC | LEARN | PROBLEMS | PROJECT | TOTAL |" table
    table_start = None
    for j, l in enumerate(block):
        if re.match(r"\|\s*\\?#\s*\|\s*TOPIC\s*\|", l.strip()):
            table_start = j
            break

    phase_topics = []
    if table_start is not None:
        k = table_start + 2  # skip header + separator row
        while k < len(block):
            row = block[k].strip()
            if not row.startswith("|"):
                break
            cells = [c.strip() for c in row.strip("|").split("|")]
            if len(cells) < 2:
                k += 1
                continue
            num_cell = clean_cell(cells[0])
            topic_cell = clean_cell(cells[1]) if len(cells) > 1 else ""
            if not num_cell or not re.match(r"^\d+$", num_cell):
                # hit PHASE TOTAL row or footnote row
                if "PHASE TOTAL" in row.upper() or "of which" in row:
                    k += 1
                    continue
                else:
                    break
            total_h = None
            if len(cells) >= 6:
                th_m = re.search(r"([0-9]+)h", clean_cell(cells[5]))
                if th_m:
                    total_h = int(th_m.group(1))
            phase_topics.append({
                "order_index": int(num_cell),
                "title": topic_cell,
                "estimated_hours": total_h
            })
            k += 1

    if not phase_topics:
        stage_item_re = re.compile(r"^##\s+\*\*▌\s*(\d+)\\?\.\s*(.+?)\*\*\s*$")
        for l in block:
            sm = stage_item_re.match(l.strip())
            if sm:
                phase_topics.append({
                    "order_index": int(sm.group(1)),
                    "title": clean_cell(sm.group(2)),
                    "estimated_hours": None
                })

    phases.append({
        "id": f"phase-{num}",
        "phase_number": num,
        "title": clean_cell(title),
        "band": band,
        "estimated_hours": realistic_hours,
        "exit_point_code": exit_code,
        "build_in_public_prompt": bip,
        "order_index": phase_order.index(num) if num in phase_order else idx,
    })

    for t in phase_topics:
        topics.append({
            "id": f"topic-{num}-{t['order_index']:02d}",
            "phase_id": f"phase-{num}",
            "order_index": t["order_index"],
            "title": t["title"],
            "estimated_hours": t["estimated_hours"],
        })

phases.sort(key=lambda p: p["order_index"])

# ---------- Exit Ladder ----------
ladder_start = text.find("▌ Exit Point Ladder")
ladder_block = text[ladder_start:ladder_start+3000]
exit_ladder = []
ladder_row_re = re.compile(
    r"\|\s*([★\w\d]+)\s*\|\s*(\d+b?)\s*\|\s*[^\|]*\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|"
)
for m in ladder_row_re.finditer(ladder_block):
    exit_code, after_phase, job_level, salary = m.groups()
    if exit_code.upper() == "EXIT":
        continue
    exit_ladder.append({
        "exit_code": clean_cell(exit_code),
        "linked_phase": f"phase-{after_phase}",
        "job_level": clean_cell(job_level),
        "salary_range": clean_cell(salary),
    })

# Target companies / highlights per exit (from the description rows below the table)
highlight_re = re.compile(r"Exit\s+([★\w\d]+)\s+—\s+([^\n]+?)\s*Target:\s*([^\n]+?)\s*Highlights:\s*([^\n|]+?)\s*\|")
highlights = {}
for m in highlight_re.finditer(ladder_block):
    code, name, target, hl = m.groups()
    highlights[clean_cell(code)] = {
        "name": clean_cell(name),
        "target_companies": clean_cell(target),
        "highlights": clean_cell(hl),
    }

for row in exit_ladder:
    h = highlights.get(row["exit_code"])
    if h:
        row.update(h)

# ---------- DSA gates (no explicit counts in doc; use documented convention) ----------
dsa_gates = {
    "easy_target": 75,
    "medium_target": 50,
    "note": "Roadmap document does not specify exact Easy/Medium counts; defaults used, editable in roadmap_metadata."
}

# ---------- Metadata ----------
total_topics = len(topics)
total_hours = sum(p["estimated_hours"] or 0 for p in phases)

metadata = {
    "title": "Zero to Elite — The Complete Engineering Roadmap",
    "total_phases": len(phases),
    "total_topics": total_topics,
    "total_realistic_hours": total_hours,
    "source_stated_hours": 2700,
    "months_at_40hrs_week": round(total_hours / (40*4.345), 1) if total_hours else None,
}

out = {
    "metadata": metadata,
    "phases": phases,
    "topics": topics,
    "exit_ladder": exit_ladder,
    "dsa_gates": dsa_gates,
}

with open("data/seed.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print(f"Phases: {len(phases)}", file=sys.stderr)
print(f"Topics: {total_topics}", file=sys.stderr)
print(f"Total hours: {total_hours}", file=sys.stderr)
print(f"Exit ladder rows: {len(exit_ladder)}", file=sys.stderr)
for p in phases:
    tcount = len([t for t in topics if t["phase_id"] == p["id"]])
    print(f"  {p['phase_number']:>4} {p['title'][:40]:40} topics={tcount:3} hours={p['estimated_hours']}", file=sys.stderr)

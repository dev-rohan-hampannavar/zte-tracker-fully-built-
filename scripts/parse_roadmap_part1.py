#!/usr/bin/env python3
"""
P7.0 — Parses Part I of roadmap.md (Orientation through Timeline & Pacing Views,
lines ~1254-2491) into structured JSON. This is the section the original P0-P6
parser (parse_roadmap.py) never touched — everything downstream (Reference page,
Onboarding sequence) was blocked on this.

Scope: ONLY Part I -> Part V content (before "Part VI - The 19 Phases" begins,
i.e. before the per-phase detail that parse_roadmap.py already owns).

Run: python3 scripts/parse_roadmap_part1.py
Writes: data/seed_part1.json  (merged into data/seed.json by merge_seed.py)
"""
import re, json, sys

SRC = "docs/roadmap.md"
with open(SRC, encoding="utf-8") as f:
    text = f.read()
lines = text.split("\n")


def clean(s):
    if s is None:
        return None
    s = s.strip()
    s = s.replace("\\#", "#").replace("\\+", "+").replace("\\~", "~") \
         .replace("\\<", "<").replace("\\>", ">").replace("\\-", "-").replace("\\.", ".")
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = s.replace("\\", "")
    return s.strip()


def find_line(pattern, start=0):
    rx = re.compile(pattern)
    for i in range(start, len(lines)):
        if rx.match(lines[i].strip()):
            return i
    return None


# ============================================================
# Locate the canonical (non-TOC, non-duplicate) Part I..Part VI boundaries.
# The doc contains a front-matter duplicate of some Orientation content;
# we anchor on "Part I — Orientation" itself, which occurs exactly once
# outside the TOC (TOC entries are wrapped in [...](#bookmark=...) links).
# ============================================================
def find_section_header(label, start=0):
    """Find a '# **Part N — Label**' style header, skipping TOC entries
    (TOC lines start with '[' and contain '#bookmark=')."""
    rx = re.compile(r"^#\s+\*\*" + re.escape(label) + r"\*\*\s*$")
    for i in range(start, len(lines)):
        l = lines[i].strip()
        if rx.match(l):
            return i
    return None


part1_start = find_section_header("Part I — Orientation")
part2_start = find_section_header("Part II — Why This Works", part1_start)
part3_start = find_section_header("Part III — Roadmap Dashboards", part2_start)
part4_start = find_section_header("Part IV — Navigation Layers", part3_start)
part5_start = find_section_header("Part V — Timeline & Pacing Views", part4_start)
part6_start = find_section_header("Part VI — The 20 Phases", part5_start)

assert part1_start and part2_start and part3_start and part4_start and part5_start and part6_start, \
    "Could not locate all Part I-VI section boundaries — roadmap.md structure changed."

print(f"Part I:  line {part1_start}", file=sys.stderr)
print(f"Part II: line {part2_start}", file=sys.stderr)
print(f"Part III:line {part3_start}", file=sys.stderr)
print(f"Part IV: line {part4_start}", file=sys.stderr)
print(f"Part V:  line {part5_start}", file=sys.stderr)
print(f"Part VI: line {part6_start}", file=sys.stderr)


def slice_lines(a, b):
    return lines[a:b]


# ============================================================
# PART I — Orientation
# ============================================================
p1 = slice_lines(part1_start, part2_start)


def section_text(block, start_marker, end_markers):
    """Grab prose between a '## **▌ X**' header and the next header of any kind."""
    start = None
    for i, l in enumerate(block):
        if re.match(r"^##?\s+\*\*.*" + re.escape(start_marker) + r".*\*\*\s*$", l.strip()):
            start = i + 1
            break
    if start is None:
        return ""
    end = len(block)
    for j in range(start, len(block)):
        if re.match(r"^#{1,2}\s+\*\*", block[j].strip()) or re.match(r"^#\s+$", block[j].strip()):
            end = j
            break
    return "\n".join(block[start:end]).strip()


def clean_block(s):
    if not s:
        return s
    s = re.sub(r"\n+##\s*$", "", s.strip())
    return s.strip()


overview_text = clean_block(section_text(p1, "OVERVIEW", None))

who_is_this_for_table = []
who_start = None
for i, l in enumerate(p1):
    if "Who Is This For?" in l and l.strip().startswith("##"):
        who_start = i
        break
if who_start is not None:
    for l in p1[who_start:who_start + 20]:
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("CATEGORY", ":----"):
            who_is_this_for_table.append({"category": clean(m.group(1)), "details": clean(m.group(2))})

key_note_match = re.search(
    r"\*\*KEY NOTE:\*\*\n\n(.+?)\n\n#", "\n".join(p1), re.S
)
key_note = clean(key_note_match.group(1)) if key_note_match else None

# "How This Will Get You a Job in a Fierce Market" — take the FIRST canonical
# occurrence within Part I (not the duplicate inside Part VI's front-matter repeat).
job_market_start = None
for i, l in enumerate(p1):
    if l.strip() == "# **How This Will Get You a Job in a Fierce Market**":
        job_market_start = i
        break
job_market_text = ""
if job_market_start is not None:
    end = len(p1)
    for j in range(job_market_start + 1, len(p1)):
        if p1[j].strip().startswith("## **▌ How to Build in Public**"):
            end = j
            break
    job_market_text = "\n".join(p1[job_market_start + 1:end]).strip()

build_in_public_text = section_text(p1, "How to Build in Public", None)

# Quick Start Checklist — numbered list (01..10)
checklist_items = []
qs_start = None
for i, l in enumerate(p1):
    if "Summary: Quick Start Checklist" in l:
        qs_start = i
        break
if qs_start is not None:
    for l in p1[qs_start:qs_start + 40]:
        m = re.match(r"^\*\*(\d\d)\*\*\s+(.+)$", l.strip())
        if m:
            checklist_items.append({"step": m.group(1), "text": clean(m.group(2))})

critical_advice_match = re.search(
    r'\*\*CRITICAL ADVICE FROM THE DOCUMENT:\*\*\n\n"(.+?)"\s*Build in public',
    "\n".join(p1), re.S
)
critical_advice = clean(critical_advice_match.group(1)) if critical_advice_match else None

# Weekly hours / timeline table
weekly_pace = []
wp_start = None
for i, l in enumerate(p1):
    if "Choose Your Timeline" in l:
        wp_start = i
        break
if wp_start is not None:
    for l in p1[wp_start:wp_start + 20]:
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("WEEKLY HOURS", ":----"):
            weekly_pace.append({
                "weekly_hours": clean(m.group(1)),
                "timeline": clean(m.group(2)),
                "best_fit": clean(m.group(3)),
            })

# The 19 phases mini-summary (Step 3) — phase title + weeks + tech list
phase_summaries = []
step3_start = None
for i, l in enumerate(p1):
    if l.strip() == "**STEP 3**":
        step3_start = i
        break
step4_start = None
for i, l in enumerate(p1):
    if l.strip() == "**STEP 4**":
        step4_start = i
        break
if step3_start and step4_start:
    block = p1[step3_start:step4_start]
    i = 0
    phase_hdr_re = re.compile(r"^\*\*(Phase [\dA-Za-z][^*]*?)\*\*\s*$")
    week_re = re.compile(r"^\*\*(WEEKS?\s+.+?)\*\*\s*$")
    while i < len(block):
        m = phase_hdr_re.match(block[i].strip())
        if m and not block[i].strip().startswith("**Exit"):
            title = clean(m.group(1))
            weeks = None
            tech = None
            j = i + 1
            while j < len(block) and j < i + 6:
                wm = week_re.match(block[j].strip())
                if wm:
                    weeks = clean(wm.group(1))
                elif block[j].strip() and not block[j].strip().startswith("**") and tech is None:
                    tech = clean(block[j].strip())
                    break
                j += 1
            phase_summaries.append({"phase_title": title, "weeks": weeks, "tech": tech})
            i = j
        else:
            i += 1

# Decision matrix (which project to build)
decision_matrix = []
dm_start = None
for i, l in enumerate(p1):
    if "Decision Matrix" in l and "Which Project" in l:
        dm_start = i
        break
if dm_start is not None:
    for l in p1[dm_start:dm_start + 12]:
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("IF YOU WANT...", ":----"):
            decision_matrix.append({"if_you_want": clean(m.group(1)), "build_this": clean(m.group(2))})

decision_rule_match = re.search(r"\*\*The Rule: (.+?)\*\*", "\n".join(p1))
decision_rule = clean(decision_rule_match.group(1)) if decision_rule_match else None

orientation = {
    "overview": clean(overview_text) or None,
    "who_is_this_for": who_is_this_for_table,
    "key_note": key_note,
    "job_market_case": clean(job_market_text) or None,
    "build_in_public_guide": clean(build_in_public_text) or None,
    "quick_start_checklist": checklist_items,
    "critical_advice": critical_advice,
    "weekly_pace_options": weekly_pace,
    "phase_summaries": phase_summaries,
    "decision_matrix": decision_matrix,
    "decision_rule": decision_rule,
}

# ============================================================
# PART II — Why This Works (failure-mode table)
# ============================================================
p2 = slice_lines(part2_start, part3_start)
why_this_works = []
for l in p2:
    m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
    if m and m.group(1) not in ("COMMON FAILURE MODE", ":----"):
        why_this_works.append({"failure_mode": clean(m.group(1)), "mechanism": clean(m.group(2))})

# ============================================================
# PART III — Roadmap Dashboards
# ============================================================
p3 = slice_lines(part3_start, part4_start)

master_phase_table = []
mpt_start = None
for i, l in enumerate(p3):
    if "Master Phase Table" in l:
        mpt_start = i
        break
if mpt_start is not None:
    for l in p3[mpt_start:mpt_start + 30]:
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("PHASE", ":----"):
            master_phase_table.append({
                "phase": clean(m.group(1)), "focus": clean(m.group(2)), "weeks": clean(m.group(3)),
                "header_hours": clean(m.group(4)), "realistic_hours": clean(m.group(5)),
                "band": clean(m.group(6)), "track": clean(m.group(7)),
            })

hours_breakdown = []
hb_start = None
for i, l in enumerate(p3):
    if l.strip().startswith("| PHASE | LEARN | PROBLEMS"):
        hb_start = i
        break
if hb_start is not None:
    for l in p3[hb_start:hb_start + 25]:
        m = re.match(r"^\|\s*(\S+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("PHASE", ":----"):
            hours_breakdown.append({
                "phase": clean(m.group(1)), "learn": clean(m.group(2)), "problems": clean(m.group(3)),
                "project": clean(m.group(4)), "clientsync": clean(m.group(5)), "realistic_total": clean(m.group(6)),
            })

program_total_match = re.search(
    r"Original stated total \(cover page, source document\): (.+?)\s*Raw bottom-up sum.+?: (.+?)\s*Realistic total after higher-side buffer.+?: (.+?)\s*Net change from stated total: (.+?)\s*\|",
    "\n".join(p3), re.S
)
program_total = None
if program_total_match:
    program_total = {
        "original_stated": clean(program_total_match.group(1)),
        "raw_bottom_up_sum": clean(program_total_match.group(2)),
        "realistic_total": clean(program_total_match.group(3)),
        "net_change": clean(program_total_match.group(4)),
    }

difficulty_ramp = []
dr_start = None
for i, l in enumerate(p3):
    if "Difficulty Ramp" in l and l.strip().startswith("##"):
        dr_start = i
        break
if dr_start is not None:
    current_band = None
    for l in p3[dr_start:dr_start + 60]:
        ls = l.strip()
        bm = re.match(r"^\*\*(FOUNDATION|CORE|ADVANCED|EXPERT)\*\*\s*$", ls)
        if bm:
            current_band = bm.group(1).title()
            continue
        pm = re.match(r"^\*\s+(\d\d b?)\s*—\s*(.+)$", ls)
        if pm and current_band:
            difficulty_ramp.append({"band": current_band, "phase": clean(pm.group(1)), "title": clean(pm.group(2))})
        if ls.startswith("## **▌ Source Discrepancies"):
            break

source_discrepancies = []
sd_start = None
for i, l in enumerate(p3):
    if "Source Discrepancies Flagged" in l:
        sd_start = i
        break
if sd_start is not None:
    for l in p3[sd_start:sd_start + 20]:
        m = re.match(r"^\|\s*(\d\d)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m:
            source_discrepancies.append({"phase": clean(m.group(1)), "discrepancy": clean(m.group(2))})

dashboards = {
    "master_phase_table": master_phase_table,
    "hours_breakdown": hours_breakdown,
    "program_total": program_total,
    "difficulty_ramp": difficulty_ramp,
    "source_discrepancies": source_discrepancies,
}

# ============================================================
# PART IV — Navigation Layers
# ============================================================
p4 = slice_lines(part4_start, part5_start)

skill_tracks = []
st_start = None
for i, l in enumerate(p4):
    if "Skill-Track Index" in l:
        st_start = i
        break
if st_start is not None:
    current_track = None
    for l in p4[st_start:st_start + 40]:
        ls = l.strip()
        tm = re.match(r"^\*\*([A-Z][A-Z0-9 &/()\-]+)\*\*\s*$", ls)
        if tm and "PHASES:" not in ls.upper()[:7]:
            raw = tm.group(1).strip()
            OVERRIDES = {
                "FRONTEND CORE": "Frontend Core",
                "BACKEND": "Backend",
                "INFRA & DEVOPS": "Infra & DevOps",
                "MOBILE (OPTIONAL)": "Mobile (Optional)",
                "INTERVIEW PREP": "Interview Prep",
                "AI/ML": "AI/ML",
                "CAREER & CRAFT": "Career & Craft",
            }
            current_track = OVERRIDES.get(raw, raw.title())
            continue
        pm = re.match(r"^Phases:\s*(.+)$", ls)
        if pm and current_track:
            phase_list = [p.strip() for p in pm.group(1).split(",")]
            skill_tracks.append({"track": current_track, "phases": phase_list})
            current_track = None
        if ls.startswith("## **▌ ClientSync"):
            break

dsa_spine_index = section_text(p4, "DSA-Spine Index", None)
dsa_spine_index = re.sub(r"\(Phase 08\\?\)", "", dsa_spine_index).strip()

mvp_fast_path_lines = []
mvp_start = None
for i, l in enumerate(p4):
    if "MVP Fast-Path Index" in l:
        mvp_start = i
        break
if mvp_start is not None:
    for l in p4[mvp_start:mvp_start + 10]:
        m = re.match(r"^\*\s+(.+)$", l.strip())
        if m:
            mvp_fast_path_lines.append(clean(m.group(1)))

navigation = {
    "skill_tracks": skill_tracks,
    "dsa_spine_index": dsa_spine_index or None,
    "mvp_fast_path": mvp_fast_path_lines,
}

# ============================================================
# PART V — Timeline & Pacing Views
# ============================================================
p5 = slice_lines(part5_start, part6_start)

month_by_month = []
mbm_start = None
for i, l in enumerate(p5):
    if l.strip().startswith("| MONTH | PHASE(S)"):
        mbm_start = i
        break
if mbm_start is not None:
    for l in p5[mbm_start:mbm_start + 25]:
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", l.strip())
        if m and m.group(1) not in ("MONTH", ":----"):
            month_by_month.append({
                "month": clean(m.group(1)), "phases_active": clean(m.group(2)),
                "focus": clean(m.group(3)), "realistic_hours": clean(m.group(4)),
            })

phase_checklist = []
pc_start = None
for i, l in enumerate(p5):
    if "Phase Checklist" in l:
        pc_start = i
        break
if pc_start is not None:
    for l in p5[pc_start:pc_start + 70]:
        m = re.match(r"^\*\s+☐\s+Phase\s+(\S+)\s*—\s*(.+?)\s*\(([\d.]+h) realistic,\s*(.+?)\\?\)$", l.strip())
        if m:
            phase_checklist.append({
                "phase": clean(m.group(1)), "title": clean(m.group(2)),
                "hours": clean(m.group(3)), "weeks": clean(m.group(4)),
            })

timeline = {
    "month_by_month": month_by_month,
    "phase_checklist": phase_checklist,
}

# ============================================================
# Assemble
# ============================================================
out = {
    "orientation": orientation,
    "why_this_works": why_this_works,
    "dashboards": dashboards,
    "navigation": navigation,
    "timeline": timeline,
}

with open("data/seed_part1.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print("---- Validation ----", file=sys.stderr)
print(f"Who is this for rows: {len(who_is_this_for_table)}", file=sys.stderr)
print(f"Quick start checklist items: {len(checklist_items)}", file=sys.stderr)
print(f"Weekly pace options: {len(weekly_pace)}", file=sys.stderr)
print(f"Phase summaries (Step 3): {len(phase_summaries)}", file=sys.stderr)
print(f"Decision matrix rows: {len(decision_matrix)}", file=sys.stderr)
print(f"Why this works rows: {len(why_this_works)}", file=sys.stderr)
print(f"Master phase table rows: {len(master_phase_table)}", file=sys.stderr)
print(f"Hours breakdown rows: {len(hours_breakdown)}", file=sys.stderr)
print(f"Difficulty ramp rows: {len(difficulty_ramp)}", file=sys.stderr)
print(f"Source discrepancies: {len(source_discrepancies)}", file=sys.stderr)
print(f"Skill tracks: {len(skill_tracks)}", file=sys.stderr)
print(f"MVP fast path lines: {len(mvp_fast_path_lines)}", file=sys.stderr)
print(f"Month by month rows: {len(month_by_month)}", file=sys.stderr)
print(f"Phase checklist rows: {len(phase_checklist)}", file=sys.stderr)
print("Wrote data/seed_part1.json", file=sys.stderr)

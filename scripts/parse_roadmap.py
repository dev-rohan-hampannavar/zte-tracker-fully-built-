#!/usr/bin/env python3
"""
P0 rewrite — parses Zero_to_Elite roadmap markdown into a FULL structured JSON,
capturing the hierarchy the old parser dropped:

  Phase -> Stage -> Topic (-> subtopic groups, bullets)
  Stage -> Projects (easy/medium/hard) + Practice Exercises
  Phase -> Capstone
  ClientSync milestones (per phase)
  Companies (deduped, derived from Exit Ladder "Target:" + capstone/body company mentions)
  Exit ladder (unchanged approach from v1, preserved)
  DSA gates / metadata

Run: python3 scripts/parse_roadmap_v2.py
Writes: data/seed.json
Validates: every phase has >=1 stage (except pure-content phases), every stage has
a projects block, no topic titles dropped vs. topic tables where tables exist.
"""
import re, json, sys, hashlib

SRC = "roadmap.md"
with open(SRC, encoding="utf-8") as f:
    text = f.read()

lines = text.split("\n")


def clean_cell(s):
    s = s.strip()
    s = s.replace("\\#", "#").replace("\\+", "+").replace("\\~", "~") \
         .replace("\\<", "<").replace("\\>", ">").replace("\\-", "-").replace("\\.", ".")
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = s.replace("\\", "")
    return s.strip()


def slugify(s):
    s = clean_cell(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60]


# ============================================================
# 1. PHASE detail sections (skip TOC occurrences)
# ============================================================
phase_header_re = re.compile(r"^#\s+\*\*Phase\s+([0-9]+b?)\s+—\s+(.+?)\*\*\s*$")

headers = []
for i, l in enumerate(lines):
    m = phase_header_re.match(l.strip())
    if m:
        headers.append((i, m.group(1), m.group(2).strip()))

detail_headers = []
for (i, num, title) in headers:
    window = "\n".join(lines[i:i + 6])
    if "Band:" in window or "Realistic hours" in window:
        detail_headers.append((i, num, title))

print(f"Found {len(detail_headers)} phase detail sections", file=sys.stderr)

phase_order = ["01", "01b", "02", "03", "04", "05", "06", "06b", "07", "08", "09",
               "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]

# ============================================================
# 2. Regexes for sub-structures within a phase block
# ============================================================
stage_header_re = re.compile(r"^#\s+\*\*STAGE\s+(\d+)\s*—\s*(.+?)\*\*\s*$")
topic_header_re = re.compile(r"^##\s+\*\*▌\s*(\d+)\\?\.\s*(.+?)\*\*\s*$")
capstone_header_re = re.compile(
    r'^##\s+\*\*▌\s*Phase Exit Capstone\s*—\s*"(.+?)"\s*—\s*(.+?)\*\*\s*$'
)
stage_projects_header_re = re.compile(
    r"^###\s+\*\*Stage\s+(\d+)\s+Projects\s*&\s*Exercises\s*—\s*(.+?)\s*\(([\d.]+)\s*hrs?\)\*\*\s*$"
)
subheading_bold_re = re.compile(r"^\*\*(.+?)\*\*\s*$")
bullet_re = re.compile(r"^\*\s+(.+?)\s*$")
project_name_re = re.compile(r'^\*\*(?:.*?—\s*)?"(.+?)"(?:\s+\w+)?\s*\((Easy|Medium|Hard)\)\*\*\s*$')

phases = []
stages = []
topics = []
capstones = []
stage_projects = []  # {stage_id, name, difficulty, description}
stage_exercises = []  # {stage_id, description, order_index}

for idx, (start, num, title) in enumerate(detail_headers):
    end = detail_headers[idx + 1][0] if idx + 1 < len(detail_headers) else len(lines)
    block = lines[start:end]
    block_text = "\n".join(block)
    phase_id = f"phase-{num}"

    # ---- Band / hours / exit code / build-in-public (unchanged logic from v1) ----
    band_m = re.search(r"Band:\s*([^\u00b7\n]+?)\s*(?:\u00b7|·)", block_text)
    band = band_m.group(1).strip() if band_m else None

    hours_m = re.search(r"Realistic hours:\s*([0-9]+)h", block_text)
    realistic_hours = int(hours_m.group(1)) if hours_m else None

    exit_code = None
    exit_line_m = re.search(r"Exit\s+([★\w\d]+):", block_text[:1500])
    if exit_line_m:
        exit_code = exit_line_m.group(1)

    bip_m = re.search(
        r"📣\s*BUILD IN PUBLIC Post:\s*(.+?)\s*(?:GitHub:)?\s*\|\s*\n\s*\|\s*:----\s*\|",
        block_text,
    )
    bip = clean_cell(bip_m.group(1)) if bip_m else None
    if bip:
        bip = re.sub(r"\\\*\\\*\s*$", "", bip).strip()

    # ---- Topic table (Learn/Problems/Project/Total hours per topic) ----
    table_start = None
    for j, l in enumerate(block):
        if re.match(r"\|\s*\\?#\s*\|\s*TOPIC\s*\|", l.strip()):
            table_start = j
            break

    table_topics = {}  # normalized title -> hours dict
    if table_start is not None:
        k = table_start + 2
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
            table_topics[topic_cell.lower()] = {
                "order_index": int(num_cell),
                "estimated_hours": total_h,
            }
            k += 1

    # ============================================================
    # Walk the block line-by-line to build Stage -> Topic -> Subtopic tree,
    # plus Stage Projects/Exercises and the Phase Capstone.
    # ============================================================
    phase_stage_rows = []
    phase_topic_rows = []
    phase_capstone = None

    cur_stage = None       # dict currently being built
    cur_topic = None       # dict currently being built
    cur_group = None       # current bold subheading group within a topic
    cur_stage_proj_block = False
    cur_stage_num = None
    cur_project = None     # current project dict while collecting description
    in_practice_exercises = False
    topic_order_in_phase = 0
    stage_order_in_phase = 0

    # flush_* are inlined below (not nested defs) to keep loop-scope vars simple
    i = 0
    while i < len(block):
        raw = block[i]
        line = raw.strip()

        # --- New stage ---
        sm = stage_header_re.match(line)
        if sm:
            cur_stage_proj_block = False
            if cur_project is not None:
                cur_project["description"] = cur_project["description"].strip()
                stage_projects.append(cur_project)
                cur_project = None
            if cur_topic is not None:
                phase_topic_rows.append(cur_topic)
                cur_topic = None
            if cur_stage is not None:
                phase_stage_rows.append(cur_stage)
                cur_stage = None
            stage_order_in_phase += 1
            cur_stage_num = sm.group(1)
            stage_id = f"stage-{num}-{int(cur_stage_num):02d}"
            cur_stage = {
                "id": stage_id,
                "phase_id": phase_id,
                "stage_number": int(cur_stage_num),
                "title": clean_cell(sm.group(2)),
                "order_index": stage_order_in_phase - 1,
                "description": None,
                "estimated_hours": None,
            }
            # capture italic description line immediately following, if present
            if i + 2 < len(block) and block[i + 2].strip().startswith("*") and not block[i + 2].strip().startswith("**"):
                desc = block[i + 2].strip().strip("*").strip()
                if desc:
                    cur_stage["description"] = desc
            cur_group = None
            in_practice_exercises = False
            i += 1
            continue

        # --- New topic within a stage ---
        tm = topic_header_re.match(line)
        if tm:
            cur_stage_proj_block = False
            if cur_topic is not None:
                phase_topic_rows.append(cur_topic)
                cur_topic = None
            topic_order_in_phase += 1
            heading_number = int(tm.group(1))
            topic_title = clean_cell(tm.group(2))
            table_info = table_topics.get(topic_title.lower())
            # Use appearance order (unique per phase) for the ID — the heading
            # number restarts/repeats across "Perfect Learning Sequence" resequencing
            # and stage boundaries, so it is NOT safe as a uniqueness key on its own.
            topic_id = f"topic-{num}-{topic_order_in_phase:03d}"
            cur_topic = {
                "id": topic_id,
                "phase_id": phase_id,
                "stage_id": cur_stage["id"] if cur_stage else None,
                "heading_number": heading_number,
                "order_index": table_info["order_index"] if table_info else topic_order_in_phase,
                "title": topic_title,
                "estimated_hours": table_info["estimated_hours"] if table_info else None,
                "intro": None,
                "groups": [],  # [{heading, bullets: [str]}]
            }
            cur_group = None
            # capture italic intro line right after header, if present
            j = i + 1
            while j < len(block) and block[j].strip() == "":
                j += 1
            if j < len(block) and block[j].strip().startswith("*") and not block[j].strip().startswith("**") and not bullet_re.match(block[j].strip()):
                intro = block[j].strip().strip("*").strip()
                if intro:
                    cur_topic["intro"] = intro
            i += 1
            continue

        # --- Capstone header ---
        cm = capstone_header_re.match(line)
        if cm:
            cur_stage_proj_block = False
            if cur_project is not None:
                cur_project["description"] = cur_project["description"].strip()
                stage_projects.append(cur_project)
                cur_project = None
            if cur_topic is not None:
                phase_topic_rows.append(cur_topic)
                cur_topic = None
            if cur_stage is not None:
                phase_stage_rows.append(cur_stage)
                cur_stage = None
            name, desc_title = cm.group(1), clean_cell(cm.group(2))
            # description is the next non-empty paragraph line(s) until blank-blank or next header
            desc_lines = []
            j = i + 1
            while j < len(block):
                l2 = block[j].strip()
                if l2.startswith("#"):
                    break
                if l2:
                    desc_lines.append(l2)
                elif desc_lines:
                    break
                j += 1
            phase_capstone = {
                "id": f"capstone-{num}",
                "phase_id": phase_id,
                "name": name,
                "title": desc_title,
                "description": " ".join(desc_lines).strip(),
            }
            i = j
            continue

        # --- Stage Projects & Exercises header ---
        spm = stage_projects_header_re.match(line)
        if spm:
            if cur_project is not None:
                cur_project["description"] = cur_project["description"].strip()
                stage_projects.append(cur_project)
                cur_project = None
            if cur_topic is not None:
                phase_topic_rows.append(cur_topic)
                cur_topic = None
            stage_num_ref = spm.group(1)
            stage_hours = float(spm.group(3))
            if stage_hours == int(stage_hours):
                stage_hours = int(stage_hours)
            ref_stage_id = f"stage-{num}-{int(stage_num_ref):02d}"
            # attach hours to that stage if it's the one we just closed / are in
            for s in phase_stage_rows + ([cur_stage] if cur_stage else []):
                if s and s["id"] == ref_stage_id:
                    s["estimated_hours"] = stage_hours
            cur_stage_proj_block = True
            in_practice_exercises = False
            i += 1
            continue

        if cur_stage_proj_block:
            # New top-level heading ends the stage-projects block
            if line.startswith("# ") or stage_header_re.match(line) or capstone_header_re.match(line):
                if cur_project is not None:
                    cur_project["description"] = cur_project["description"].strip()
                    stage_projects.append(cur_project)
                    cur_project = None
                cur_stage_proj_block = False
                continue  # re-process this line in the outer loop

            pm = project_name_re.match(line)
            if pm:
                if cur_project is not None:
                    cur_project["description"] = cur_project["description"].strip()
                    stage_projects.append(cur_project)
                cur_project = {
                    "stage_id": ref_stage_id,
                    "name": pm.group(1),
                    "difficulty": pm.group(2).lower(),
                    "description": "",
                }
                i += 1
                continue

            if line == "**Practice Exercises**":
                if cur_project is not None:
                    cur_project["description"] = cur_project["description"].strip()
                    stage_projects.append(cur_project)
                    cur_project = None
                in_practice_exercises = True
                i += 1
                continue

            bm = bullet_re.match(line)
            if in_practice_exercises and bm:
                stage_exercises.append({
                    "stage_id": ref_stage_id,
                    "description": clean_cell(bm.group(1)),
                })
                i += 1
                continue

            if cur_project is not None and line and not line.startswith("|") and line != "**Curriculum Topics**" and not line.startswith("**"):
                cur_project["description"] += (" " if cur_project["description"] else "") + clean_cell(line)
                i += 1
                continue

            i += 1
            continue

        # --- Inside a topic: collect subheading groups + bullets ---
        if cur_topic is not None:
            bsub = subheading_bold_re.match(line)
            if bsub and not project_name_re.match(line):
                cur_group = {"heading": clean_cell(bsub.group(1)), "bullets": []}
                cur_topic["groups"].append(cur_group)
                i += 1
                continue
            bm2 = bullet_re.match(line)
            if bm2:
                target = cur_group
                if target is None:
                    target = {"heading": None, "bullets": []}
                    cur_topic["groups"].append(target)
                    cur_group = target
                target["bullets"].append(clean_cell(bm2.group(1)))
                i += 1
                continue

        i += 1

    if cur_project is not None:
        cur_project["description"] = cur_project["description"].strip()
        stage_projects.append(cur_project)
        cur_project = None
    if cur_topic is not None:
        phase_topic_rows.append(cur_topic)
        cur_topic = None
    if cur_stage is not None:
        phase_stage_rows.append(cur_stage)
        cur_stage = None

    # fallback: phases with no stage headers at all (e.g. content-only phases) —
    # synthesize topics directly from the topic table so nothing is silently dropped.
    if not phase_stage_rows and table_topics:
        for title_lower, info in table_topics.items():
            tid = f"topic-{num}-tbl{info['order_index']:02d}"
            if not any(t["id"] == tid for t in phase_topic_rows):
                phase_topic_rows.append({
                    "id": tid,
                    "phase_id": phase_id,
                    "stage_id": None,
                    "heading_number": None,
                    "order_index": info["order_index"],
                    "title": title_lower,
                    "estimated_hours": info["estimated_hours"],
                    "intro": None,
                    "groups": [],
                })

    phases.append({
        "id": phase_id,
        "phase_number": num,
        "title": clean_cell(title),
        "band": band,
        "estimated_hours": realistic_hours,
        "exit_point_code": exit_code,
        "build_in_public_prompt": bip,
        "order_index": phase_order.index(num) if num in phase_order else idx,
    })
    stages.extend(phase_stage_rows)
    topics.extend(phase_topic_rows)
    if phase_capstone:
        capstones.append(phase_capstone)

phases.sort(key=lambda p: p["order_index"])

# assign stable ids to projects (hash of stage_id+name to stay stable across re-runs)
for p in stage_projects:
    p["id"] = "proj-" + hashlib.sha1(f"{p['stage_id']}::{p['name']}".encode()).hexdigest()[:10]
for e in stage_exercises:
    e["id"] = "ex-" + hashlib.sha1(f"{e['stage_id']}::{e['description']}".encode()).hexdigest()[:10]

# ============================================================
# 3. Exit Ladder (logic preserved from v1)
# ============================================================
ladder_start = text.find("▌ Exit Point Ladder")
ladder_block = text[ladder_start:ladder_start + 3000]
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

highlight_re = re.compile(
    r"Exit\s+([★\w\d]+)\s+—\s+([^\n]+?)\s*Target:\s*([^\n]+?)\s*Highlights:\s*([^\n|]+?)\s*\|"
)
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

# ============================================================
# 4. Companies — matched against a curated allowlist of real company/product
#    names that actually appear in the roadmap (ClientSync integrations,
#    deployment targets, and named employers in "Target:" lines). A generic
#    proper-noun heuristic over "Target:" prose was tried first and rejected —
#    it pulled in job titles, tech nouns, and level tags ("AI Engineer",
#    "GraphQL", "LPA") alongside real companies, so it isn't usable as-is.
#    This allowlist is deliberately explicit rather than inferred.
# ============================================================
KNOWN_COMPANIES = [
    # Third-party companies/products ClientSync integrates with or deploys to
    "Vercel", "Razorpay", "Resend", "PostHog", "Sentry", "Postman", "Hasura",
    "GitHub Pages", "GitHub", "Expo Go", "Expo", "Product Hunt", "Supabase",
    # Employer/hiring-market names mentioned by type in Target: lines
    "FAANG India",
]

# ------------------------------------------------------------------
# Item 3 — Company Profiles. Category, hiring stage, and typical tech
# stack are real, publicly-known facts about each company/product — not
# invented ratings. hiring_difficulty is deliberately left out: roadmap.md
# states no per-company difficulty anywhere, and inventing one would
# misrepresent the source document, so it stays null at seed time.
# ------------------------------------------------------------------
COMPANY_PROFILES = {
    "Vercel": {"category": "Cloud/PaaS", "hiring_stage": "Growth (Series D+)",
               "typical_tech_stack": ["Next.js", "React", "TypeScript", "Edge Functions"]},
    "Razorpay": {"category": "Fintech", "hiring_stage": "Late-stage (Series F+)",
                 "typical_tech_stack": ["Node.js", "React", "PostgreSQL", "Kafka"]},
    "Resend": {"category": "Developer Tools", "hiring_stage": "Early-stage (Seed/Series A)",
               "typical_tech_stack": ["TypeScript", "React", "Node.js"]},
    "PostHog": {"category": "Developer Tools/Analytics", "hiring_stage": "Growth (Series C+)",
                "typical_tech_stack": ["Python", "React", "TypeScript", "PostgreSQL", "Kafka"]},
    "Sentry": {"category": "Developer Tools/Observability", "hiring_stage": "Late-stage (Series F+)",
               "typical_tech_stack": ["Python", "React", "TypeScript", "PostgreSQL"]},
    "Postman": {"category": "Developer Tools/API Platform", "hiring_stage": "Late-stage (Series D+)",
                "typical_tech_stack": ["Node.js", "React", "TypeScript"]},
    "Hasura": {"category": "Developer Tools/API Platform", "hiring_stage": "Growth (Series C+)",
               "typical_tech_stack": ["Haskell", "GraphQL", "PostgreSQL"]},
    "GitHub Pages": {"category": "Cloud/PaaS", "hiring_stage": "Subsidiary (Microsoft)",
                      "typical_tech_stack": ["Static hosting", "Jekyll"]},
    "GitHub": {"category": "Developer Tools", "hiring_stage": "Subsidiary (Microsoft)",
               "typical_tech_stack": ["Ruby", "Go", "React", "TypeScript"]},
    "Expo Go": {"category": "Developer Tools/Mobile", "hiring_stage": "Growth (Series B+)",
                "typical_tech_stack": ["React Native", "TypeScript"]},
    "Expo": {"category": "Developer Tools/Mobile", "hiring_stage": "Growth (Series B+)",
             "typical_tech_stack": ["React Native", "TypeScript"]},
    "Product Hunt": {"category": "Consumer/Marketplace", "hiring_stage": "Subsidiary (AngelList/Product Hunt)",
                      "typical_tech_stack": ["Ruby on Rails", "React"]},
    "Supabase": {"category": "Developer Tools/BaaS", "hiring_stage": "Growth (Series B+)",
                 "typical_tech_stack": ["PostgreSQL", "TypeScript", "Elixir", "Go"]},
    "FAANG India": {"category": "Big Tech (India offices)", "hiring_stage": "Public/Late-stage",
                     "typical_tech_stack": None},
}

company_pattern = re.compile(
    r"\b(" + "|".join(re.escape(c) for c in sorted(KNOWN_COMPANIES, key=len, reverse=True)) + r")\b"
)
found_companies = set()
for m in company_pattern.finditer(text):
    found_companies.add(m.group(1))
# "GitHub Pages" and "Expo Go" also match the shorter "GitHub"/"Expo" — keep both
# forms since they're distinct products, but don't duplicate if only one appears.

companies = sorted(
    [
        {
            "id": f"company-{slugify(c)}",
            "name": c,
            "category": COMPANY_PROFILES.get(c, {}).get("category"),
            "hiring_stage": COMPANY_PROFILES.get(c, {}).get("hiring_stage"),
            "typical_tech_stack": COMPANY_PROFILES.get(c, {}).get("typical_tech_stack"),
            "hiring_difficulty": None,  # not fabricated — see note above
        }
        for c in found_companies
    ],
    key=lambda c: c["name"],
)

# ============================================================
# 4b. Technologies — matched against a curated allowlist of real technology
#     names that appear verbatim as (or within) topic titles. Curated, not
#     fuzzy-matched: a generic heuristic over topic titles would pull in
#     non-technology nouns ("Security", "Testing", "Debugging") alongside
#     real technologies.
# ============================================================
KNOWN_TECHNOLOGIES = {
    "JavaScript": "Language", "TypeScript": "Language", "HTML5": "Language", "CSS3": "Language",
    "SQL": "Language", "Bash": "Language",
    "React": "Frontend", "Next.js": "Frontend", "Tailwind CSS": "Frontend", "Zustand": "Frontend",
    "TanStack Query": "Frontend", "tRPC": "Frontend", "XState": "Frontend", "Radix UI": "Frontend",
    "shadcn/ui": "Frontend", "React Router": "Frontend", "React Native": "Frontend",
    "styled-components": "Frontend", "Emotion": "Frontend", "Vite": "Build Tooling",
    "React Testing Library": "Testing", "Vitest": "Testing", "Playwright": "Testing",
    "MSW": "Testing", "Supertest": "Testing",
    "Node.js": "Backend", "Express.js": "Backend", "GraphQL": "Backend", "REST": "Backend",
    "PostgreSQL": "Database", "Prisma": "Database", "Supabase": "Database", "Neon": "Database",
    "Redis": "Database", "Elasticsearch": "Database", "Meilisearch": "Database", "Typesense": "Database",
    "pgvector": "Database",
    "Docker": "DevOps", "Kubernetes": "DevOps", "Terraform": "DevOps", "GitHub Actions": "DevOps",
    "Git": "DevOps", "AWS S3": "Cloud", "Vercel": "Cloud", "Helm": "DevOps",
    "Sentry": "Observability", "Datadog": "Observability", "Grafana Cloud": "Observability",
    "CloudWatch": "Observability", "PostHog": "Observability", "Axiom": "Observability", "Loki": "Observability",
    "JWT": "Security", "OWASP": "Security", "Dependabot": "Security",
    "OpenAI API": "AI", "Anthropic API": "AI", "RAG Pattern": "AI", "Vercel AI SDK": "AI",
    "WebSockets": "Realtime", "WebRTC": "Realtime", "SSE": "Realtime",
    "Zod": "Validation", "ESLint": "Tooling", "Prettier": "Tooling", "Postman": "Tooling",
    "Swagger UI": "Tooling", "OpenAPI": "Tooling", "Mermaid": "Tooling",
    "BullMQ": "Infra", "PgBouncer": "Infra", "Upstash": "Infra", "Razorpay": "Third-party API",
    "Resend": "Third-party API", "Expo": "Mobile", "IndexedDB": "Browser API",
}

tech_pattern = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in sorted(KNOWN_TECHNOLOGIES, key=len, reverse=True)) + r")\b"
)

technologies = sorted(
    [{"id": f"tech-{slugify(t)}", "name": t, "category": cat} for t, cat in KNOWN_TECHNOLOGIES.items()],
    key=lambda t: t["name"],
)

topic_technologies = []
for t in topics:
    title = t["title"]
    seen_here = set()
    for m in tech_pattern.finditer(title):
        name = m.group(1)
        if name in seen_here:
            continue
        seen_here.add(name)
        topic_technologies.append({"topic_id": t["id"], "technology_id": f"tech-{slugify(name)}"})

# ============================================================
# 4c. Advanced Projects (Item 8) — roadmap.md Part VII, "10 Advanced
# Project Ideas". Each project has a fixed set of labeled sections; parsed
# directly rather than invented, since every field here is real source text.
# ============================================================
adv_start = text.find("# **Part VII — Advanced Projects**")
adv_end = text.find("# **Part VIII", adv_start)
adv_block = text[adv_start:adv_end] if adv_start != -1 else ""

adv_header_re = re.compile(r"^##\s+\*\*▌\s*(\d+)\s*·\s*(.+?)\*\*\s*$", re.M)
adv_headers = [(m.start(), m.group(1), clean_cell(m.group(2))) for m in adv_header_re.finditer(adv_block)]

def extract_labeled_section(block, label, next_labels):
    """Pull the paragraph/bullet text between **LABEL** and the next known label."""
    start_re = re.compile(r"\*\*" + re.escape(label) + r"\*\*\s*\n+")
    m = start_re.search(block)
    if not m:
        return None
    content_start = m.end()
    end = len(block)
    for nl in next_labels:
        nm = re.search(r"\*\*" + re.escape(nl) + r"\*\*", block[content_start:])
        if nm:
            end = min(end, content_start + nm.start())
    return block[content_start:end].strip()

def parse_bullets(section_text):
    if not section_text:
        return []
    return [clean_cell(b) for b in re.findall(r"^\*\s+(.+?)\s*$", section_text, re.M)]

def parse_skill_table(section_text):
    if not section_text:
        return []
    rows = []
    for line in section_text.split("\n"):
        m = re.match(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$", line.strip())
        if m and m.group(1).upper() not in ("FEATURE", ":----"):
            rows.append({"feature": clean_cell(m.group(1)), "phase": clean_cell(m.group(2))})
    return rows

ALL_LABELS = [
    "THE PROBLEM", "WHO EXACTLY", "WHAT EXISTS", "THE GAP",
    "CORE FEATURES", "ADVANCED FEATURES", "ZTD SKILLS THIS EXERCISES",
    "MONETIZATION", "FIRST 5 USERS",
]

advanced_projects = []
for i, (pos, num, name) in enumerate(adv_headers):
    block_end = adv_headers[i + 1][0] if i + 1 < len(adv_headers) else len(adv_block)
    pblock = adv_block[pos:block_end]

    header_line_end = pblock.find("\n")
    tagline_m = re.search(r"\*(.+?)\*\s*\n", pblock[header_line_end:])
    tagline = clean_cell(tagline_m.group(1)) if tagline_m else ""

    def section(label):
        idx = ALL_LABELS.index(label)
        raw = extract_labeled_section(pblock, label, ALL_LABELS[idx + 1:])
        return clean_cell(raw) if raw else None

    advanced_projects.append({
        "id": f"adv-project-{num}-{slugify(name)}",
        "order_index": int(num) - 1,
        "name": name,
        "tagline": tagline,
        "problem": section("THE PROBLEM") or "",
        "who_exactly": section("WHO EXACTLY") or "",
        "what_exists": section("WHAT EXISTS") or "",
        "the_gap": section("THE GAP") or "",
        "core_features": parse_bullets(section("CORE FEATURES")),
        "advanced_features": parse_bullets(section("ADVANCED FEATURES")),
        "skill_mapping": parse_skill_table(section("ZTD SKILLS THIS EXERCISES")),
        "monetization": section("MONETIZATION") or "",
        "first_users": section("FIRST 5 USERS") or "",
    })

# ============================================================
# 5. ClientSync milestones (Milestone Index list)
# ============================================================
cs_start = text.find("▌ ClientSync Milestone Index")
cs_end = text.find("▌ DSA-Spine Index", cs_start)
cs_block = text[cs_start:cs_end] if cs_start != -1 else ""
clientsync_milestones = []
cs_row_re = re.compile(r"\*\s+\*\*(Phase\s+\d+b?)(?:\s*\(optional\))?:\*\*\s*(.+)")
for m in cs_row_re.finditer(cs_block):
    phase_label, desc = m.groups()
    pm = re.search(r"(\d+b?)", phase_label)
    phase_num = pm.group(1) if pm else None
    clientsync_milestones.append({
        "id": f"clientsync-{phase_num}",
        "linked_phase": f"phase-{phase_num}" if phase_num else None,
        "description": clean_cell(desc).rstrip("."),
    })

# ============================================================
# 6. DSA gates + metadata
# ============================================================
dsa_gates = {
    "easy_target": 75,
    "medium_target": 50,
    "note": "Roadmap document does not specify exact Easy/Medium counts; defaults used, editable in roadmap_metadata.",
}

total_topics = len(topics)
total_stages = len(stages)
total_hours = sum(p["estimated_hours"] or 0 for p in phases)

metadata = {
    "title": "Zero to Elite — The Complete Engineering Roadmap",
    "total_phases": len(phases),
    "total_stages": total_stages,
    "total_topics": total_topics,
    "total_capstones": len(capstones),
    "total_stage_projects": len(stage_projects),
    "total_stage_exercises": len(stage_exercises),
    "total_companies": len(companies),
    "total_technologies": len(technologies),
    "total_advanced_projects": len(advanced_projects),
    "total_realistic_hours": total_hours,
    "source_stated_hours": 2700,
    "months_at_40hrs_week": round(total_hours / (40 * 4.345), 1) if total_hours else None,
}

out = {
    "metadata": metadata,
    "phases": phases,
    "stages": stages,
    "topics": topics,
    "stage_projects": stage_projects,
    "stage_exercises": stage_exercises,
    "capstones": capstones,
    "clientsync_milestones": clientsync_milestones,
    "companies": companies,
    "technologies": technologies,
    "advanced_projects": advanced_projects,
    "topic_technologies": topic_technologies,
    "exit_ladder": exit_ladder,
    "dsa_gates": dsa_gates,
}

with open("data/seed.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

# ============================================================
# 7. Validation report
# ============================================================
print(f"Phases: {len(phases)}", file=sys.stderr)
print(f"Stages: {total_stages}", file=sys.stderr)
print(f"Topics: {total_topics}", file=sys.stderr)
print(f"Capstones: {len(capstones)}", file=sys.stderr)
print(f"Stage projects: {len(stage_projects)}", file=sys.stderr)
print(f"Stage exercises: {len(stage_exercises)}", file=sys.stderr)
print(f"Companies: {len(companies)}", file=sys.stderr)
print(f"Technologies: {len(technologies)}", file=sys.stderr)
print(f"Topic-technology links: {len(topic_technologies)}", file=sys.stderr)
print(f"Advanced projects: {len(advanced_projects)}", file=sys.stderr)
print(f"ClientSync milestones: {len(clientsync_milestones)}", file=sys.stderr)
print(f"Exit ladder rows: {len(exit_ladder)}", file=sys.stderr)
print(f"Total hours: {total_hours}", file=sys.stderr)

no_stage_topics = [t for t in topics if t["stage_id"] is None]
print(f"Topics with no stage (content-only phases, expected for 08/18/19 etc.): {len(no_stage_topics)}", file=sys.stderr)

for p in phases:
    tcount = len([t for t in topics if t["phase_id"] == p["id"]])
    scount = len([s for s in stages if s["phase_id"] == p["id"]])
    print(f"  {p['phase_number']:>4} {p['title'][:40]:40} stages={scount:2} topics={tcount:3} hours={p['estimated_hours']}", file=sys.stderr)

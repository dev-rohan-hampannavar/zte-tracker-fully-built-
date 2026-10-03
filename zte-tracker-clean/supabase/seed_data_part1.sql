-- Auto-generated from roadmap.md Part I. Do not edit by hand — regenerate via scripts/generate_seed_sql.py
begin;

insert into public.orientation (id, overview, who_is_this_for, key_note, job_market_case, build_in_public_guide, quick_start_checklist, critical_advice, weekly_pace_options, phase_summaries, decision_matrix, decision_rule) values (1, 'What This Document Is

This is a ~17.5-month, 290-topic, phase-based software engineering curriculum totaling 3034 realistic hours, designed to take you from a beginner to a job-ready full-stack engineer — with salaries at each Exit Point ranging ₹6–10 LPA at the earliest exit up to ₹35–50 LPA at the final one. It''s structured as a self-study roadmap with built-in "Exit Points" — specific milestones where you''re ready to start applying for jobs at different salary levels.', '[{"category": "Primary audience", "details": "Aspiring software engineers in India, especially those with a BCA degree (addressed explicitly in the doc)"}, {"category": "Career stage", "details": "Complete beginners to those wanting to level up to senior/staff roles"}, {"category": "Time commitment", "details": "Flexible: 25-70 hrs/week depending on how fast you want to finish"}, {"category": "Goal", "details": "Fastest path to employment at product companies, startups, and scale-ups"}, {"category": "Companies targeted", "details": "Early-stage startups → Series A/B → Unicorns → Global remote (Vercel, Supabase, etc.)"}]'::jsonb, 'The document explicitly addresses BCA graduates. It says BCA is fine for most target companies (startups, product companies, dev agencies) but becomes a hard filter at FAANG India and large IT services. It suggests MCA as a path if FAANG is a long-term goal.', 'Especially if you''re a BCA graduate from a Tier‑2 college with zero projects and no work experience.

THE HONEST TRUTH – AND THE PLAN

The market is tough, but it''s not closed. Companies still hire – they hire people who can ship code, not people with fancy degrees. This curriculum is designed to turn you into that person.

Here''s how it works for you:

— You build a real, deployable project (ClientSync) in the first 6 months — this becomes your portfolio, your proof of skill, and your conversation starter in interviews.

— You publish your work publicly — every phase gives you something to show on GitHub, dev.to, or LinkedIn. Recruiters see your progress, not your college name.

— You don''t wait until the end to apply — the ''Exit Points'' let you start applying as early as Phase 06, when you have a live app and a CI/CD pipeline. That''s often enough for early-stage startups.

— The curriculum explicitly addresses the BCA degree filter — it tells you which companies don''t care about your degree (most startups, product companies, dev agencies) and which do (FAANG, large IT services). You focus your energy where it matters.

— You learn exactly what''s needed for the job — no fluff, no outdated theory. Every topic is chosen because it''s used in production at top startups. You''re job-ready, not just ''certified''.

— You build in public — by the time you finish, you have a network, a trail of content, and often inbound interest from founders. That''s how you beat the ''no experience'' trap.

THE BOTTOM LINE

Your BCA degree is not a blocker – it''s a starting point. What gets you hired is your ability to build and ship. This roadmap gives you the exact path to do that, with clear milestones to keep you on track.

If you follow it consistently, you will have a portfolio, a GitHub history, and the confidence to walk into any interview. The jobs are there – you just need to be visible and credible. This document shows you how.', '"Build in public" gets said so often it''s stopped meaning anything. Here''s what it actually means for this roadmap: at the end of most phases (not every day, not every commit), you post one specific, concrete thing you built or learned — not a status update, not "day 47 of my coding journey." Each phase in this document has a compact BUILD IN PUBLIC callout telling you exactly what to post, what to commit, and where. This section is the reasoning behind that system.

WHY THIS MATTERS MORE THAN YOUR DEGREE

A recruiter or hiring manager cannot verify "I know React." They can verify a GitHub repo with real commit history, a deployed URL, a green CI badge, and a dev.to post that explains a real decision you made. Visibility isn''t vanity here — it''s the only evidence a stranger can check in 90 seconds. Silence is the default; everyone in this roadmap is building the same 20 phases. The difference between two people with identical skills is which one has proof.

GITHUB

* Commit as you go, not in one dump at the end of a phase. A commit history with 3 commits on the last day of every phase reads as fabricated. It probably is.

* Use Conventional Commits from Phase 04 onward (feat:, fix:, refactor:, etc.) — it''s a topic in the curriculum for a reason; a recruiter who opens your commit log should see discipline, not noise.

* Every repo gets a real README: what it does, how to run it, what you learned. "TODO: add README" sitting untouched for months is a worse signal than no README at all.

* Pin your 2–3 best repos on your GitHub profile. Don''t make someone dig through 40 repos to find the one that matters.

LINKEDIN

* Post when you ship something visible — a deployed feature, a working demo, a hard bug you fixed. Not "studying TypeScript today," which nobody can evaluate.

* Lead with what it does or looks like (a screenshot, a short screen-recording), not with the tech stack. Recruiters skim; a visual gets 2 seconds of attention, a paragraph of jargon gets zero.

* One post per phase is enough. A LinkedIn feed with 40 low-effort posts is worse than one with 15 real ones — frequency without substance reads as noise, not progress.

DEV.TO / HASHNODE

* Write about a specific decision or a specific bug, never a tutorial recap of something already covered better elsewhere ("What is React?" gets you nothing — 500,000 of those already exist).

* The BUILD IN PUBLIC callouts flag which phases are worth a dev.to post and which aren''t (Phase 08''s DSA grind and Phase 15''s build tooling aren''t — skip posting, keep building).

* A post that says "here''s a mistake I made and how I fixed it" outperforms one that says "here''s how to do X correctly" — the former is credible because it''s specific and honest; the latter reads as copied.

The rule underneath all of it: post less than you think you should, and make sure what you do post could survive someone actually clicking through. A thin GitHub history with real commits beats a loud one with none.', '[{"step": "01", "text": "Decide your weekly hours (30 hrs/week recommended for full-time job)"}, {"step": "02", "text": "Set up Phase 01 dev environment (VS Code, nvm, Git, SSH)"}, {"step": "03", "text": "Start Phase 02 → Build Next.js app, deploy to Vercel"}, {"step": "04", "text": "Continue phases sequentially"}, {"step": "05", "text": "At Exit A (Phase 06) → Start applying to startups"}, {"step": "06", "text": "At Exit ★1 (Phase 08) → Pass DSA rounds, get SDE-1 roles"}, {"step": "07", "text": "After Phase 12 → Build an AI project"}, {"step": "08", "text": "After Phase 17 → Senior-level roles"}, {"step": "09", "text": "After Phase 19 → Complete profile, publish npm package"}, {"step": "10", "text": "Choose an advanced project from the 10 listed"}]'::jsonb, 'The gap between Exit 3 and Exit E is not technical — it''s visibility and credibility. If you''ve been posting on dev.to, building in public, and engaging with the community throughout the 17 months, Exit E is a natural inbound moment. If you''ve done the curriculum silently with no public presence, the salary range is the same but you''ll have to work harder.', '[{"weekly_hours": "85 hrs/week", "timeline": "~8.2 months", "best_fit": "All-in sprint, no other commitments"}, {"weekly_hours": "70 hrs/week", "timeline": "~10.0 months", "best_fit": "No job, no college"}, {"weekly_hours": "40 hrs/week", "timeline": "~17.5 months", "best_fit": "Serious part-time"}, {"weekly_hours": "40 → 70 hrs/week (ramp after 6 mo)", "timeline": "~12.6 months", "best_fit": "Start part-time, ramp later"}, {"weekly_hours": "30 hrs/week", "timeline": "~23.4 months", "best_fit": "Full-time job + study"}, {"weekly_hours": "25 hrs/week", "timeline": "~28.0 months (~2.3 yrs)", "best_fit": "Casual evenings/weekends"}]'::jsonb, '[{"phase_title": "Phase 01–01b — Developer Environment & TypeScript Mastery", "weeks": "WEEKS 1–5", "tech": "HTML, CSS, JavaScript, TypeScript, Git, GitHub, Bash, SSH, SQL fundamentals; TypeScript: Generics, Discriminated Unions, Utility Types, Zod"}, {"phase_title": "Phase 02 — React + Next.js Core", "weeks": "WEEKS 6–9", "tech": "React 18, Next.js 15 App Router, Route Groups, Parallel Routes, Vercel deployment"}, {"phase_title": "Phase 03 — UI System & Styling", "weeks": "WEEKS 10–12", "tech": "Tailwind CSS, shadcn/ui, react-hook-form, Zod, BEM, Style Dictionary"}, {"phase_title": "Phase 04 — State & Data Fetching", "weeks": "WEEKS 13–16", "tech": "Zustand, TanStack Query v5, tRPC v11, XState v5, React.lazy, Suspense, Intersection Observer"}, {"phase_title": "Phase 05 — Backend + Database + Auth (Major Phase)", "weeks": "WEEKS 17–22", "tech": "Node.js/Express, REST APIs, PostgreSQL, Prisma, Supabase, bcrypt, JWT, httpOnly Cookies"}, {"phase_title": "Phase 06 — Testing + CI/CD + Deployment", "weeks": "WEEKS 23–27", "tech": "Vitest, React Testing Library, Playwright, Docker, GitHub Actions, Render"}, {"phase_title": "Phase 07 — API Documentation & Developer Tooling", "weeks": "WEEK 28", "tech": "OpenAPI 3.0, Swagger UI, Postman, GraphQL, Mermaid"}, {"phase_title": "Phase 08 — DSA & Interview Preparation", "weeks": "WEEKS 29–32", "tech": "Two Pointers, Sliding Window, Binary Search, BFS/DFS, DP, HashMap patterns, Tree Traversal, Heap"}, {"phase_title": "Phase 09 — Caching + Email + Payments", "weeks": "WEEKS 33–34", "tech": "Redis, Upstash, rate limiting, Resend, React Email, Razorpay"}, {"phase_title": "Phase 10 — Monitoring + Product Analytics", "weeks": "WEEKS 35–39", "tech": "pino, Sentry, UptimeRobot, PostHog, feature flags, A/B testing"}, {"phase_title": "Phase 11 — Real-Time + Search + PostgreSQL Internals", "weeks": "WEEKS 40–43", "tech": "WebSockets, SSE, WebRTC, B-Tree/Composite/Partial Indexes, MVCC, WAL, Read Replicas; PostgreSQL Full Text Search, Meilisearch, Typesense"}, {"phase_title": "Phase 12 — AI/RAG + Production AI Patterns", "weeks": "WEEKS 44–47", "tech": "OpenAI API, GPT-4o, pgvector, IVFFlat/HNSW, RAG Pattern, BullMQ; Anthropic Claude, prompt caching, tool calling, multi-model routing, cost tracking, evals"}, {"phase_title": "Phase 13 — Advanced Browser APIs + Collaboration", "weeks": "WEEKS 48–51", "tech": "IndexedDB, Web Workers, Broadcast Channel API, Yjs, Hocuspocus, Tiptap"}, {"phase_title": "Phase 14 — Load Testing + Security Deep Dive", "weeks": "WEEKS 52–54", "tech": "k6 load testing, OWASP Top 10, OWASP ZAP, JWT algorithm pinning, trufflehog, Dependabot"}, {"phase_title": "Phase 15 — Build Tooling + CSS-in-JS", "weeks": "WEEKS 55–56", "tech": "Vite, tsup, bundle analyzers, styled-components, Emotion"}, {"phase_title": "Phase 16 — Infrastructure", "weeks": "WEEKS 57–58", "tech": "AWS S3, Terraform, Kubernetes, kind, kubectl, Helm, HPA"}, {"phase_title": "Phase 17 — Architectural Patterns", "weeks": "WEEKS 59–62", "tech": "Saga Pattern, Outbox Pattern, Circuit Breaker, CQRS, Multi-Tenancy, Blue-Green Deployments"}, {"phase_title": "Phase 18 — Engineering Craft + Package Publishing", "weeks": "WEEKS 63–66", "tech": "Changesets, ADRs, RFCs, DORA Metrics, Blameless Post-Mortems, technical debt tracking"}, {"phase_title": "Phase 19 — Career & Community", "weeks": "WEEKS 67–68", "tech": "Wellfound, Instahyre, LinkedIn, Product Hunt, dev.to, Hashnode"}]'::jsonb, '[{"if_you_want": "Highest number of potential users", "build_this": "TiffinOS or BatchIQ"}, {"if_you_want": "Dev audience that converts fast", "build_this": "LLMeter or VaultEnv"}, {"if_you_want": "Most technically interesting", "build_this": "MeetMind or SocietyOS"}, {"if_you_want": "Easiest path to paying customers", "build_this": "OfferLens or TaxStack"}, {"if_you_want": "Best interview story", "build_this": "HireKit"}, {"if_you_want": "Solve a problem you personally faced", "build_this": "OfferLens"}]'::jsonb, 'Build the project where you can find 5 real users within 48 hours of launching.')
on conflict (id) do update set overview=excluded.overview, who_is_this_for=excluded.who_is_this_for, key_note=excluded.key_note, job_market_case=excluded.job_market_case, build_in_public_guide=excluded.build_in_public_guide, quick_start_checklist=excluded.quick_start_checklist, critical_advice=excluded.critical_advice, weekly_pace_options=excluded.weekly_pace_options, phase_summaries=excluded.phase_summaries, decision_matrix=excluded.decision_matrix, decision_rule=excluded.decision_rule, updated_at=now();

delete from public.why_this_works;
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('Silent grinding with no public presence', 'Build in Public system — a required post/commit/README artifact at the end of every phase, not optional polish.', 0);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('Waiting until the very end to apply for jobs', 'Exit Points (A, B, ★1, C, ★2, D, 3, E) — real job-readiness milestones seeded from Phase 06 onward, each with its own target roles and salary band.', 1);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('Learning topics before their prerequisites are solid', 'Dependency-ordered resequencing — explicitly reasoned in-document (e.g. Type Narrowing before Discriminated Unions, HMAC-SHA256 before JWT, curl before Postman) rather than following the original curriculum’s grouping.', 2);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('Burnout from unsustainable pace', 'Weekly-hours-based timeline options (25–85 hrs/wk) with an explicit daily schedule and "track hours weekly, not daily" rule — a rough day doesn’t derail the plan.', 3);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('A portfolio with no depth — one demo, no real product', 'ClientSync — a single real, deployable, two-sided SaaS product built feature-by-feature across every phase, rather than 19 disconnected toy projects.', 4);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('Degree/college filtering you out before anyone sees your work', 'The document explicitly separates companies that gate on degree (FAANG India, large IT services) from those that don’t (most startups, product companies, dev agencies) — so effort is targeted, not wasted.', 5);
insert into public.why_this_works (failure_mode, mechanism, order_index) values ('GitHub history that looks fabricated (a dump of commits at the last minute)', 'Conventional Commits from Phase 04 onward + explicit guidance to commit as you go, not in one end-of-phase dump.', 6);

delete from public.master_phase_table;
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('01', 'Developer Environment & Foundations', '1–5', '123', '185', 'Foundation', 'Frontend Core', 0);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('01b', 'TypeScript Mastery', '1–2 (concurrent)', '72', '80', 'Foundation', 'Frontend Core', 1);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('02', 'React + Next.js Core', '6–10', '146', '213', 'Foundation', 'Frontend Core', 2);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('03', 'UI System & Styling', '11–13', '141', '135', 'Foundation', 'Frontend Core', 3);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('04', 'State, Data Fetching & Advanced React', '14–17', '169', '153', 'Core', 'Frontend Core', 4);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('05', 'Backend + Database + Auth', '18–25', '229', '314', 'Core', 'Backend', 5);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('06', 'Testing + CI/CD + Deployment', '26–29', '182', '155', 'Core', 'Infra & DevOps', 6);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('06b', 'React Native (Mobile)', 'concurrent w/ 07', '—', '111', 'Core', 'Mobile', 7);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('07', 'API Documentation & Developer Tooling', '30–31', '68', '71', 'Core', 'Backend', 8);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('08', 'DSA & Interview Preparation', '32–39', '160', '331', 'Core', 'Interview Prep', 9);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('09', 'Caching + Email + Payments', '40–41', '86', '98', 'Advanced', 'Backend', 10);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('10', 'Monitoring + Product Analytics', '42–44', '179', '103', 'Advanced', 'Infra & DevOps', 11);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('11', 'Real-Time + Search + PostgreSQL Internals', '45–48', '167', '164', 'Advanced', 'Backend', 12);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('12', 'AI/RAG + Production AI Patterns', '49–53', '172', '207', 'Advanced', 'AI/ML', 13);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('13', 'Advanced Browser APIs + Collaboration', '54–57', '152', '137', 'Advanced', 'Frontend Core', 14);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('14', 'Load Testing + Security Deep Dive', '58–59', '119', '89', 'Advanced', 'Infra & DevOps', 15);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('15', 'Build Tooling + CSS-in-JS', '60', '70', '44', 'Advanced', 'Frontend Core', 16);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('16', 'Infrastructure', '61–64', '100', '175', 'Expert', 'Infra & DevOps', 17);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('17', 'Architectural Patterns', '65–69', '161', '178', 'Expert', 'Backend', 18);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('18', 'Engineering Craft + Package Publishing', '70', '136', '62', 'Expert', 'Career & Craft', 19);
insert into public.master_phase_table (phase, focus, weeks, header_hours, realistic_hours, band, track, order_index) values ('19', 'Career & Community', '71', '68', '29', 'Expert', 'Career & Craft', 20);

delete from public.hours_breakdown;
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('01', '128h', '29h', '24h', '4h', '185h', 0);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('01b', '57h', '20h', '3h', '0h', '80h', 1);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('02', '132h', '13h', '36h', '32h', '213h', 2);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('03', '92h', '6h', '18h', '19h', '135h', 3);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('04', '98h', '12h', '24h', '19h', '153h', 4);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('05', '179h', '41h', '44h', '50h', '314h', 5);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('06', '102h', '13h', '21h', '19h', '155h', 6);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('06b', '73h', '6h', '32h', '0h', '111h', 7);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('07', '47h', '7h', '11h', '6h', '71h', 8);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('08', '150h', '178h', '3h', '0h', '331h', 9);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('09', '60h', '7h', '12h', '19h', '98h', 10);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('10', '77h', '3h', '10h', '13h', '103h', 11);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('11', '104h', '18h', '17h', '25h', '164h', 12);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('12', '138h', '20h', '24h', '25h', '207h', 13);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('13', '88h', '9h', '21h', '19h', '137h', 14);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('14', '59h', '12h', '5h', '13h', '89h', 15);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('15', '32h', '2h', '4h', '6h', '44h', 16);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('16', '110h', '14h', '26h', '25h', '175h', 17);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('17', '102h', '21h', '23h', '32h', '178h', 18);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('18', '47h', '0h', '2h', '13h', '62h', 19);
insert into public.hours_breakdown (phase, learn, problems, project, clientsync, realistic_total, order_index) values ('19', '25h', '2h', '2h', '0h', '29h', 20);

delete from public.difficulty_ramp;
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Foundation', '01', 'Developer Environment & Foundations', 0);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Foundation', '02', 'React + Next.js Core', 1);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Foundation', '03', 'UI System & Styling', 2);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Core', '04', 'State, Data Fetching & Advanced React', 3);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Core', '05', 'Backend + Database + Auth', 4);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Core', '06', 'Testing + CI/CD + Deployment', 5);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Core', '07', 'API Documentation & Developer Tooling', 6);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Core', '08', 'DSA & Interview Preparation', 7);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '09', 'Caching + Email + Payments', 8);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '10', 'Monitoring + Product Analytics', 9);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '11', 'Real-Time + Search + PostgreSQL Internals', 10);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '12', 'AI/RAG + Production AI Patterns', 11);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '13', 'Advanced Browser APIs + Collaboration', 12);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '14', 'Load Testing + Security Deep Dive', 13);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Advanced', '15', 'Build Tooling + CSS-in-JS', 14);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Expert', '16', 'Infrastructure', 15);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Expert', '17', 'Architectural Patterns', 16);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Expert', '18', 'Engineering Craft + Package Publishing', 17);
insert into public.difficulty_ramp (band, phase, title, order_index) values ('Expert', '19', 'Career & Community', 18);

delete from public.source_discrepancies;
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('09', 'Header says 86h; topic-table PHASE TOTAL row sums to 80h.', 0);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('10', 'Header says 179h; topic-table PHASE TOTAL row sums to 82h.', 1);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('11', 'Header says 167h; topic-table PHASE TOTAL row sums to 133h.', 2);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('12', 'Header says 172h; topic-table PHASE TOTAL row sums to 168h.', 3);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('13', 'Header says 152h; topic-table PHASE TOTAL row sums to 110h.', 4);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('14', 'Header says 119h; topic-table PHASE TOTAL row sums to 72h.', 5);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('15', 'Header says 70h; topic-table PHASE TOTAL row sums to 34h — largest proportional mismatch (~2x).', 6);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('16', 'Header says 100h; topic-table PHASE TOTAL row sums to 142h — the only phase where the table total EXCEEDS the header figure.', 7);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('17', 'Header says 161h; the table’s own PHASE TOTAL row states 145h; the table’s per-topic columns sum to 118h. None of the three figures agree.', 8);
insert into public.source_discrepancies (phase, discrepancy, order_index) values ('18', 'Header says 136h; topic-table PHASE TOTAL row sums to 49h — largest proportional mismatch of any phase (header nearly triple the table).', 9);

delete from public.skill_tracks;
insert into public.skill_tracks (track, phases, order_index) values ('Frontend Core', '["01", "01b", "02", "03", "04", "13", "15"]'::jsonb, 0);
insert into public.skill_tracks (track, phases, order_index) values ('Backend', '["05", "07", "09", "11", "17"]'::jsonb, 1);
insert into public.skill_tracks (track, phases, order_index) values ('Infra & DevOps', '["06", "10", "14", "16"]'::jsonb, 2);
insert into public.skill_tracks (track, phases, order_index) values ('Mobile (Optional)', '["06b"]'::jsonb, 3);
insert into public.skill_tracks (track, phases, order_index) values ('Interview Prep', '["08"]'::jsonb, 4);
insert into public.skill_tracks (track, phases, order_index) values ('AI/ML', '["12"]'::jsonb, 5);
insert into public.skill_tracks (track, phases, order_index) values ('Career & Craft', '["18", "19"]'::jsonb, 6);

insert into public.navigation_notes (id, dsa_spine_index, mvp_fast_path) values (1, 'Phase 08 (DSA & Interview Preparation) is the single highest-leverage exit gate in the roadmap — the first point where you’re competitive in a full interview loop, not just portfolio review.

* **Precedes it:** Phases 01–07 (dev fundamentals, React/Next.js, UI, state management, backend/DB/auth, testing/CI/CD/deployment, API docs) — everything DSA patterns get layered onto.

* **Follows it:** Exit ★ 1 unlocked (Series A/B startups, product companies) — then Phases 09 onward build production-grade breadth (caching, payments, monitoring, real-time, AI, infra, architecture).', '["Phases 01, 01b, 02, 03, 04, 05, 06 — in that order — reach Exit A at ~7.1 months (@40 hrs/wk).", "Everything from Phase 07 onward extends the profile toward higher exits (B, ★ 1, C, ★ 2, D, 3, E) — not required to start applying."]'::jsonb)
on conflict (id) do update set dsa_spine_index=excluded.dsa_spine_index, mvp_fast_path=excluded.mvp_fast_path;

delete from public.month_by_month;
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('1', '01', 'Developer Environment & Foundations', '185h', 0);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('1–2', '01b', 'TypeScript Mastery', '80h', 1);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('2–3', '02', 'React + Next.js Core', '213h', 2);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('3–4', '03', 'UI System & Styling', '135h', 3);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('4', '04', 'State, Data Fetching & Advanced React', '153h', 4);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('4–6', '05', 'Backend + Database + Auth', '314h', 5);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('6–7', '06', 'Testing + CI/CD + Deployment', '155h', 6);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('—', '06b', 'React Native (Mobile)', '111h', 7);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('7', '07', 'API Documentation & Developer Tooling', '71h', 8);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('7–8', '08', 'DSA & Interview Preparation', '331h', 9);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('8–9', '09', 'Caching + Email + Payments', '98h', 10);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('9–10', '10', 'Monitoring + Product Analytics', '103h', 11);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('10–11', '11', 'Real-Time + Search + PostgreSQL Internals', '164h', 12);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('11–12', '12', 'AI/RAG + Production AI Patterns', '207h', 13);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('12–13', '13', 'Advanced Browser APIs + Collaboration', '137h', 14);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('13', '14', 'Load Testing + Security Deep Dive', '89h', 15);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('13–14', '15', 'Build Tooling + CSS-in-JS', '44h', 16);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('14', '16', 'Infrastructure', '175h', 17);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('14–15', '17', 'Architectural Patterns', '178h', 18);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('15–16', '18', 'Engineering Craft + Package Publishing', '62h', 19);
insert into public.month_by_month (month, phases_active, focus, realistic_hours, order_index) values ('16', '19', 'Career & Community', '29h', 20);

delete from public.phase_checklist;
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('01', 'Developer Environment & Foundations', '185h', 'weeks 1–5', 0);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('01b', 'TypeScript Mastery', '80h', 'weeks 1–2 (concurrent)', 1);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('02', 'React + Next.js Core', '213h', 'weeks 6–9', 2);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('03', 'UI System & Styling', '135h', 'weeks 10–12', 3);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('04', 'State, Data Fetching & Advanced React', '153h', 'weeks 13–16', 4);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('05', 'Backend + Database + Auth', '314h', 'weeks 17–22', 5);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('06', 'Testing + CI/CD + Deployment', '155h', 'weeks 23–27', 6);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('06b', 'React Native (Mobile)', '111h', 'weeks concurrent w/ 07', 7);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('07', 'API Documentation & Developer Tooling', '71h', 'weeks 28', 8);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('08', 'DSA & Interview Preparation', '331h', 'weeks 29–32', 9);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('09', 'Caching + Email + Payments', '98h', 'weeks 33–34', 10);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('10', 'Monitoring + Product Analytics', '103h', 'weeks 35–39', 11);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('11', 'Real-Time + Search + PostgreSQL Internals', '164h', 'weeks 40–43', 12);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('12', 'AI/RAG + Production AI Patterns', '207h', 'weeks 44–47', 13);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('13', 'Advanced Browser APIs + Collaboration', '137h', 'weeks 48–51', 14);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('14', 'Load Testing + Security Deep Dive', '89h', 'weeks 52–54', 15);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('15', 'Build Tooling + CSS-in-JS', '44h', 'weeks 55–56', 16);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('16', 'Infrastructure', '175h', 'weeks 57–58', 17);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('17', 'Architectural Patterns', '178h', 'weeks 59–62', 18);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('18', 'Engineering Craft + Package Publishing', '62h', 'weeks 63–66', 19);
insert into public.phase_checklist (phase, title, hours, weeks, order_index) values ('19', 'Career & Community', '29h', 'weeks 67–68', 20);

update public.roadmap_metadata set part1_parsed = true, quick_start_checklist_items = 10, why_this_works_rows = 7, master_phase_table_rows = 21, skill_track_count = 7 where id = 1;

commit;
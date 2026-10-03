import type { CareerPlanTrack } from "@/data/full-plan";

export interface CareerStageDetail {
  summary: string;
  points: string[];
  companies: string[];
}

export interface CareerStage {
  id: string;
  title: string;
  time: string;
  salary: string | null;
  monthly: string | null;
  note: string;
  isNow?: boolean;
  detail: CareerStageDetail;
}

export interface CareerChartPoint {
  yr: string;
  lo: number;
  hi: number;
}

export interface CareerPathExplorerEntry {
  track: CareerPlanTrack;
  stages: CareerStage[];
  chart: CareerChartPoint[];
}

// All four CareerPlanTrack values get a full tappable stage breakdown here:
// plan_a (ZTE full-stack, the primary plan), sap, ba_pm, and ops. There is
// no separate "Operations climb" entry — the old flat Plan A was
// superseded by the richer `ops` track (see migration 0065).
export const CAREER_PATH_STAGES: CareerPathExplorerEntry[] = [
  {
    track: "sap",
    chart: [
      { yr: "Now", lo: 4.6, hi: 4.6 },
      { yr: "Y2", lo: 4.6, hi: 5 },
      { yr: "Y4", lo: 6, hi: 10 },
      { yr: "Y7", lo: 15, hi: 22 },
      { yr: "Y10", lo: 25, hi: 35 },
      { yr: "Y10+", lo: 35, hi: 45 },
    ],
    stages: [
      {
        id: "sap-now",
        title: "Business ops associate",
        time: "Now",
        salary: "₹4.6L",
        monthly: "₹28k/mo",
        note: "Build SAP SD/MM exposure on the job daily",
        isNow: true,
        detail: {
          summary:
            "Your current ops role is the cheapest possible way to get real SAP exposure — you're already inside a system that's normally locked behind expensive certifications.",
          points: [
            "Shadow whoever owns SD (Sales & Distribution) or MM (Materials Management) transactions in your current workflow.",
            "Document every transaction code you touch — this becomes interview material later.",
            "Treat every ticket or process gap as a mini case study for how SAP configuration would solve it.",
          ],
          companies: [],
        },
      },
      {
        id: "sap-cert",
        title: "SAP SD/MM certified",
        time: "Year 1–2",
        salary: null,
        monthly: "Invest ₹40–80k",
        note: "Non-negotiable unlock — the cert is the gate",
        detail: {
          summary:
            "Unlike full-stack, SAP consulting has a hard credential gate. Without SD or MM certification, staffing agencies and the big consultancies won't put you in front of a client, regardless of on-the-job exposure.",
          points: [
            "SD or MM are the standard entry modules — pick based on which matches your current ops exposure.",
            "Budget ₹40–80k and treat it as a direct investment in unlocking the Year 2 salary jump, not a side expense.",
            "S/4HANA-specific certification is increasingly what's asked for, since it's replacing ECC at most large implementations.",
          ],
          companies: [],
        },
      },
      {
        id: "sap-junior",
        title: "Junior SAP consultant",
        time: "Year 2–4",
        salary: "₹6–10L",
        monthly: "₹40–62k/mo",
        note: "Deloitte, Accenture, TCS, IBM — off staffing payroll",
        detail: {
          summary:
            "First consulting seat — usually on a staffing/bench model at one of the big system integrators, rotating across client implementations.",
          points: [
            "Expect to be staffed on a live client implementation within your first few months post-certification.",
            "Bench time between projects is where you build your second module — most SAP consultants become multi-module by Year 4.",
            "Client-facing soft skills (status updates, requirement gathering) start mattering as much as configuration knowledge.",
          ],
          companies: ["Deloitte", "Accenture", "TCS", "IBM"],
        },
      },
      {
        id: "sap-senior",
        title: "Senior SAP consultant",
        time: "Year 5–7",
        salary: "₹15–22L",
        monthly: "₹90–134k/mo",
        note: "Lead implementations, S/4HANA, client ownership",
        detail: {
          summary:
            "You now lead a workstream on an implementation rather than executing tickets — client ownership, not just configuration.",
          points: [
            "S/4HANA migration experience specifically commands a premium, since most large enterprises are mid-migration from ECC.",
            "You're expected to own a module end-to-end on a client engagement, including go-live support.",
            "International travel or short-term overseas postings typically start being offered at this level.",
          ],
          companies: ["Deloitte", "Accenture", "IBM", "Capgemini"],
        },
      },
      {
        id: "sap-architect",
        title: "Solution architect / PM",
        time: "Year 8–10",
        salary: "₹25–35L",
        monthly: "₹148–202k/mo",
        note: "Multi-module, pre-sales, overseas postings",
        detail: {
          summary:
            "Cross-module architecture role — designing how SD, MM, FI, and other modules interlock for a client's business, and often supporting pre-sales conversations.",
          points: [
            "Multi-module fluency (typically 3+) is expected at this level.",
            "Pre-sales involvement means translating a prospective client's business problem into a solution scope before the deal is signed.",
            "Overseas postings (Europe, Middle East, US) become common at this tier.",
          ],
          companies: [],
        },
      },
      {
        id: "sap-principal",
        title: "Principal / practice lead",
        time: "Year 10+",
        salary: "₹35–45L",
        monthly: "₹200–256k/mo",
        note: "Regional leadership, practice building, global scope",
        detail: {
          summary:
            "Practice leadership — building and staffing a regional SAP practice, owning P&L for a service line rather than a single client engagement.",
          points: [
            "Responsible for staffing pyramids, not just personal utilization.",
            "Global scope: coordinating delivery across multiple geographies and client accounts simultaneously.",
          ],
          companies: [],
        },
      },
    ],
  },
  {
    track: "ba_pm",
    chart: [
      { yr: "Now", lo: 4, hi: 6 },
      { yr: "Y2", lo: 6, hi: 10 },
      { yr: "Y4", lo: 10, hi: 18 },
      { yr: "Y7", lo: 18, hi: 30 },
      { yr: "Y10", lo: 30, hi: 50 },
      { yr: "Y10+", lo: 50, hi: 80 },
    ],
    stages: [
      {
        id: "bapm-now",
        title: "Business analyst",
        time: "Now",
        salary: "₹4–6L",
        monthly: "₹25–37k/mo",
        note: "Process docs, ops reports, stakeholder comms",
        isNow: true,
        detail: {
          summary:
            "Your foundation is stakeholder communication and process documentation — the exact muscle product managers use daily, just not yet applied to product decisions.",
          points: [
            "Start writing lightweight PRDs for internal process changes, even if nobody asked — it's a portfolio piece.",
            "Learn basic SQL now; it's the single highest-leverage skill for the Year 1–2 jump.",
            "Volunteer for any cross-functional project — that's the credibility bridge to APM roles.",
          ],
          companies: [],
        },
      },
      {
        id: "bapm-senior-ba",
        title: "Senior BA",
        time: "Year 1–2",
        salary: "₹6–10L",
        monthly: "₹40–62k/mo",
        note: "Cross-functional projects, SQL, metric ownership",
        detail: {
          summary:
            "You now own a metric, not just a report — the shift from documenting what happened to being accountable for a number moving in the right direction.",
          points: [
            "SQL fluency lets you self-serve data instead of waiting on analytics teams — this alone speeds up your APM transition.",
            "Cross-functional project ownership (working directly with eng + design) is the main signal APM hiring managers look for.",
          ],
          companies: [],
        },
      },
      {
        id: "bapm-apm",
        title: "APM / PM associate",
        time: "Year 2–4",
        salary: "₹10–18L",
        monthly: "₹62–112k/mo",
        note: "Ship features, write PRDs — Series A/B startups",
        detail: {
          summary:
            "First formal PM seat — you write PRDs, run sprint prioritization, and ship features, usually under a senior PM's mentorship.",
          points: [
            "Series A/B startups are the typical entry point since they need PM hands without needing 5+ years of experience.",
            "Building a track record of 2–3 shipped features with measurable outcomes is what gets you promoted to full PM.",
          ],
          companies: ["Series A/B startups"],
        },
      },
      {
        id: "bapm-pm",
        title: "Product manager",
        time: "Year 4–7",
        salary: "₹18–30L",
        monthly: "₹112–187k/mo",
        note: "0→1 builds, P&L ownership — Razorpay, Groww tier",
        detail: {
          summary:
            "Full ownership of a product area — 0→1 builds, roadmap prioritization, and increasingly P&L accountability for the feature or product line.",
          points: [
            "0→1 experience (launching something from scratch) is the resume line that separates PM from senior PM candidates later.",
            "Growth-stage fintech/consumer companies at this tier expect direct revenue or engagement-metric ownership.",
          ],
          companies: ["Razorpay", "Groww", "Growth-stage fintech/consumer apps"],
        },
      },
      {
        id: "bapm-senior-pm",
        title: "Senior PM / Group PM",
        time: "Year 7–10",
        salary: "₹30–50L",
        monthly: "₹187–312k/mo",
        note: "Platform or growth lead, manages PMs",
        detail: {
          summary:
            "People management enters the picture — you're leading a platform or growth pillar and managing a small team of PMs, not just ICs.",
          points: [
            "Cross-team roadmap negotiation becomes the core skill, more than feature-level execution.",
            "Platform PM roles (internal tooling, infra-facing products) diverge from growth PM roles here — pick a lane.",
          ],
          companies: [],
        },
      },
      {
        id: "bapm-vp",
        title: "Director / VP Product",
        time: "Year 10+",
        salary: "₹50–80L",
        monthly: "₹312–500k/mo",
        note: "Product org head, board visibility, equity upside",
        detail: {
          summary:
            "Head of the product organization — board-level visibility, company-wide product strategy, and meaningful equity upside.",
          points: [
            "Compensation at this tier is increasingly equity-weighted — the cash band understates total comp.",
            "Board reporting and company strategy input are now part of the role, not just product execution.",
          ],
          companies: [],
        },
      },
    ],
  },
  {
    track: "ops",
    chart: [
      { yr: "Now", lo: 3, hi: 5 },
      { yr: "Y2", lo: 5, hi: 8 },
      { yr: "Y4", lo: 8, hi: 14 },
      { yr: "Y7", lo: 14, hi: 22 },
      { yr: "Y10", lo: 22, hi: 40 },
      { yr: "Y10+", lo: 40, hi: 70 },
    ],
    stages: [
      {
        id: "ops-now",
        title: "Operations executive",
        time: "Now",
        salary: "₹3–5L",
        monthly: "₹20–31k/mo",
        note: "Execution-layer — warehouse, vendor, dispatch",
        isNow: true,
        detail: {
          summary:
            "Ground-floor execution — warehouse, vendor, and dispatch coordination. This is the layer where you build the operational intuition that's hard to fake later.",
          points: [
            "Track your own performance numbers (dispatch times, error rates) — this becomes your Year 1–2 promotion case.",
            "Start learning basic spreadsheet analysis on top of execution — it's the fastest differentiator into the analyst tier.",
          ],
          companies: [],
        },
      },
      {
        id: "ops-analyst",
        title: "Operations analyst",
        time: "Year 1–2",
        salary: "₹5–8L",
        monthly: "₹31–50k/mo",
        note: "Process improvement, data, cross-vendor coordination",
        detail: {
          summary:
            "Shift from executing process to improving it — spotting inefficiencies across vendors and proposing fixes backed by data.",
          points: [
            "Cross-vendor coordination experience is what separates this from pure execution roles.",
            "A documented process improvement, even a small one, with a measurable before/after is strong resume material.",
          ],
          companies: [],
        },
      },
      {
        id: "ops-scm",
        title: "Senior analyst / SCM",
        time: "Year 2–4",
        salary: "₹8–14L",
        monthly: "₹50–87k/mo",
        note: "Supply chain design, inventory, 3PL management",
        detail: {
          summary:
            "Full supply chain design ownership — inventory strategy and managing third-party logistics (3PL) relationships, not just internal ops.",
          points: [
            "3PL contract negotiation and SLA management become part of the role.",
            "Inventory forecasting accuracy is a metric you'll increasingly be judged on.",
          ],
          companies: [],
        },
      },
      {
        id: "ops-manager",
        title: "Operations manager",
        time: "Year 4–7",
        salary: "₹14–22L",
        monthly: "₹87–137k/mo",
        note: "City/region P&L, team of 5–15 — Swiggy, Zomato, Meesho",
        detail: {
          summary:
            "P&L ownership for a city or region, managing a team of 5–15 — the first genuine people-management and budget-accountability role in the ladder.",
          points: [
            "Consumer/delivery platforms specifically hire heavily at this tier for regional ops leadership.",
            "You're now accountable for a cost line, not just a process metric.",
          ],
          companies: ["Swiggy", "Zomato", "Meesho"],
        },
      },
      {
        id: "ops-director",
        title: "Supply chain director",
        time: "Year 7–10",
        salary: "₹22–40L",
        monthly: "₹137–250k/mo",
        note: "National strategy, vendor negotiations, CapEx",
        detail: {
          summary:
            "National-level strategy — vendor negotiation at scale and capital expenditure decisions (warehouses, fleet, infrastructure).",
          points: [
            "CapEx decision authority is new at this level — you're weighing multi-crore infrastructure investments.",
            "National vendor negotiations require a different skill set than regional 3PL management.",
          ],
          companies: [],
        },
      },
      {
        id: "ops-vp",
        title: "VP Ops / COO track",
        time: "Year 10+",
        salary: "₹40–70L",
        monthly: "₹250–437k/mo",
        note: "Org head, board reporting, equity trajectory",
        detail: {
          summary:
            "Organization-wide ops leadership with board reporting responsibility and a meaningful equity trajectory — the ceiling of the individual-contributor-to-executive ops path.",
          points: [
            "Board-level reporting on operational metrics becomes routine.",
            "Equity compensation typically becomes a significant portion of total comp at this tier.",
          ],
          companies: [],
        },
      },
    ],
  },
  {
    track: "plan_a",
    chart: [
      { yr: "Now", lo: 0, hi: 0 },
      { yr: "Y1", lo: 6, hi: 10 },
      { yr: "Y2", lo: 8, hi: 15 },
      { yr: "Y4", lo: 12, hi: 25 },
      { yr: "Y6", lo: 20, hi: 35 },
      { yr: "Y8+", lo: 35, hi: 50 },
    ],
    stages: [
      {
        id: "fs-now",
        title: "ZTE curriculum",
        time: "Now",
        salary: null,
        monthly: null,
        note: "21 phases · ~19 months · 40 hrs/wk",
        isNow: true,
        detail: {
          summary:
            "290 topics across 21 phases, ~3,086 realistic hours, run at 40 hrs/week. Every phase ends in a shipped capstone project, not a quiz — the portfolio is the credential.",
          points: [
            "Phases 1–4: JS/TS core, React 19, Next.js 16 App Router, styling systems, and advanced state management.",
            "Phases 5–7: Node/Express backend, PostgreSQL + Prisma, auth, testing/CI/CD with Docker, API docs. React Native as an optional add-on.",
            "Phase 8: DSA & interview prep — this is Exit Point ★1.",
            "Phases 9–14: caching, payments, monitoring, real-time, search, and AI/RAG with tool calling.",
            "Phases 15–21: advanced system design, security hardening, a capstone SaaS build, and career prep.",
          ],
          companies: [],
        },
      },
      {
        id: "fs-junior",
        title: "Junior developer",
        time: "Year 1",
        salary: "₹6–10L",
        monthly: "₹40–62k/mo",
        note: "Early-stage startups — portfolio does the work",
        detail: {
          summary:
            "Exit Point A: a junior full-stack developer who can ship features independently in a modern JS/TS stack. A strong GitHub + deployed projects outweigh the degree at this stage.",
          points: [
            "Target roles: junior/associate full-stack developer at seed-to-Series-B startups and dev agencies.",
            "What gets you hired: a deployed, tested, CI/CD'd project a hiring manager can click through in 2 minutes.",
            "BCA is fine here — early-stage startups, agencies, and most Indian product companies don't hard-filter on degree at this level.",
          ],
          companies: ["Early-stage startups (seed–Series A)", "Dev agencies", "Remote/global startups via Wellfound"],
        },
      },
      {
        id: "fs-mid-junior",
        title: "Junior-to-mid",
        time: "Year 2",
        salary: "₹8–15L",
        monthly: "₹50–93k/mo",
        note: "API-first companies — Postman, Hasura, fintech",
        detail: {
          summary:
            "Exit Point B / ★1: API documentation depth plus DSA/system-design fluency means you're now interview-ready for product companies, not just agencies.",
          points: [
            "DSA fluency plus STAR/REACTO interview framing opens product-company interview loops.",
            "API-first companies specifically value someone who can design and document a public-facing API, not just consume one.",
          ],
          companies: ["Postman", "Hasura", "Fintech startups", "Series A/B product companies"],
        },
      },
      {
        id: "fs-mid",
        title: "Mid full-stack",
        time: "Year 3–4",
        salary: "₹12–25L",
        monthly: "₹75–155k/mo",
        note: "Fintech, e-commerce, B2B SaaS",
        detail: {
          summary:
            "Exit Point C/★2: production-grade skills — caching, payments, full observability, real-time systems, and enterprise-grade search. You can own a feature end-to-end in a high-traffic system.",
          points: [
            "PostgreSQL internals fluency is the difference between 'uses a database' and 'can debug a slow query in production'.",
            "Can build real-time features and wire up analytics-driven features like A/B tests and feature flags.",
          ],
          companies: ["Fintech (Razorpay-tier)", "E-commerce platforms", "B2B SaaS", "High-traffic / real-time platforms"],
        },
      },
      {
        id: "fs-senior",
        title: "AI-capable senior",
        time: "Year 5–6",
        salary: "₹20–35L",
        monthly: "₹125–218k/mo",
        note: "AI-native startups, LLM-powered products",
        detail: {
          summary:
            "Exit Point D: production AI patterns layered on the full-stack base — RAG pipelines, embeddings, tool calling, cost governance, and eval-driven development.",
          points: [
            "RAG pattern + vector search is the core differentiator — most senior full-stack engineers haven't shipped this in production.",
            "Cost/token governance is what separates 'used an LLM API' from 'runs an AI feature at scale without a runaway bill'.",
          ],
          companies: ["AI-native startups", "LLM-powered product teams", "Late-stage unicorns (Swiggy, Zomato, Meesho, CRED)"],
        },
      },
      {
        id: "fs-staff",
        title: "Staff / Principal",
        time: "Year 7+",
        salary: "₹35–50L",
        monthly: "₹218–312k/mo",
        note: "Founding engineer · global remote · equity roles",
        detail: {
          summary:
            "Exit Point E: the complete profile — architecture ownership, mentorship, and enough breadth to be the first engineering hire or a staff-level IC at a global remote company.",
          points: [
            "At this level the degree filter mostly stops mattering outside FAANG ATS screens — portfolio and track record dominate.",
            "Global remote roles become realistic and often pay above the local band once equity is factored in.",
          ],
          companies: ["Founding engineer roles", "FAANG India (Google, Microsoft, Amazon, Adobe, Atlassian)", "Global remote SaaS"],
        },
      },
    ],
  },
];

export function getCareerPathStages(track: CareerPlanTrack): CareerPathExplorerEntry | undefined {
  return CAREER_PATH_STAGES.find((entry) => entry.track === track);
}

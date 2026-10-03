import type { Playbook } from "./types";

export const JOB_SEARCH_PLAYBOOK: Playbook = {
  title: "Job search playbook",
  subtitle:
    "A weekly system for finding roles, reaching people, and learning from the numbers, so your search doesn't depend on luck or motivation.",
  sections: [
    {
      id: "system",
      label: "Weekly system",
      summary: "Consistent, measurable effort beats sporadic bursts.",
      blocks: [
        {
          title: "A sustainable weekly pipeline",
          table: {
            headers: ["Activity", "Target per week", "Why it matters"],
            rows: [
              ["Tailored applications", "8–12", "Quality over volume: each one customised to the job description"],
              ["Referral or direct outreach", "5–8 messages", "Warm introductions convert many times better than cold applications"],
              ["Follow-ups", "All applications after 5–7 days", "A short nudge often moves you to the top of the pile"],
              ["Interview practice", "2 mock sessions", "Fluency under pressure is a trainable skill"],
              ["Learning and projects", "Your planned hours", "Keeps your proof of work growing while you apply"],
            ],
          },
          callout: "Track every application and message in the Career page. You can't improve a funnel you don't measure.",
        },
        {
          title: "Read your funnel",
          table: {
            headers: ["What you see", "Likely cause", "What to change"],
            rows: [
              ["Many applications, no replies", "Resume or targeting", "Tighten the resume to the job, apply to better-matched roles, add referrals"],
              ["Recruiter screens, no technical rounds", "Pitch or expectations", "Sharpen your intro, your salary range and why this company"],
              ["Technical rounds, no onsite", "Problem solving or communication", "Mock interviews; practise thinking aloud; review failed questions"],
              ["Onsite, no offer", "Depth or fit", "Project deep-dives, system-design basics and behavioural stories"],
              ["Offers below expectations", "Leverage or scripts", "Apply to more companies in parallel and use the negotiation scripts"],
            ],
          },
        },
      ],
    },
    {
      id: "companies",
      label: "Company types",
      summary: "Different employers hire differently. Target a mix, and tailor your approach to each.",
      blocks: [
        {
          title: "What to expect from each type",
          table: {
            headers: ["Type", "Hiring style", "Good for", "Watch for"],
            rows: [
              ["Early-stage startup", "Fast, informal; values proof of work and ownership", "Breadth, rapid growth, wearing many hats", "Less mentoring, changing priorities, runway risk"],
              ["Growth-stage product company", "Structured loops; coding plus project deep dive", "Strong engineering culture with real scale", "More competitive; clear bar for juniors"],
              ["Large tech or multinational", "Standardised process; DSA heavy", "Brand, structured training, compensation bands", "Slower hiring; narrower scope early on"],
              ["IT services and consulting", "Volume hiring, campus and assessments", "Entry point, broad exposure, training", "Work varies by client; choose the team carefully"],
              ["Agencies and studios", "Portfolio-driven; practical tasks", "Shipping many projects quickly", "Deadlines and context-switching"],
              ["Global capability centres (GCCs)", "Mix of product-style loops and process", "Product-quality work with stability", "Varies widely by centre; research the team"],
            ],
          },
        },
        {
          title: "Ten-minute company brief",
          steps: [
            "What do they sell, to whom, and how do they make money?",
            "Who are the competitors, and what is distinctive about this company?",
            "What stack do they use? Check job posts and the engineering blog.",
            "Recent news: funding, launches, layoffs, leadership changes.",
            "Who is on the team? Look up the hiring manager and two engineers on LinkedIn.",
            "Reviews on Glassdoor or AmbitionBox, read with care for interview-process patterns.",
            "Write one specific question and one idea you could contribute.",
          ],
        },
      ],
    },
    {
      id: "outreach",
      label: "Outreach",
      summary: "Short, specific, easy to say yes to. Adapt the wording, never copy it verbatim.",
      blocks: [
        {
          title: "Templates",
          items: [
            { heading: "Asking for a referral", example: "Hi [Name], I'm applying for [role] at [Company] and saw you work on [team]. I've built [relevant project] using [stack]. Would you be open to referring me, or sharing what the team looks for? Happy to send my resume and a two-line summary." },
            { heading: "Cold message to an engineer", example: "Hi [Name], I read your post on [topic] and tried [something specific]. I'm a developer building [project] and exploring roles like yours at [Company]. Could I ask two quick questions about how your team works?" },
            { heading: "Message to a recruiter", example: "Hi [Name], I'm interested in the [role] opening. My background: [one line]. Key fit: [two skills or results]. My resume is attached; I'd welcome a short call this week." },
            { heading: "Following up after an application", example: "Hi [Name], I applied for [role] on [date] and wanted to reaffirm my interest. I recently [shipped or learned something relevant]. Is there anything else I can share that would help?" },
            { heading: "After a rejection", example: "Thank you for considering me. I'd value any feedback, and I'd like to stay in touch for future openings on [team]." },
          ],
          callout: "Personalise the first line, keep it under 80 words, make one clear ask, and offer something (a resume, a project link) they can open in a click.",
        },
      ],
    },
    {
      id: "channels",
      label: "Where to look",
      summary: "Use several channels; most roles are filled before they're widely posted.",
      blocks: [
        {
          title: "Channels and how to use them",
          items: [
            { heading: "Company career pages", body: "Best for accuracy and freshness. Make a list of 30 target companies and check weekly." },
            { heading: "Job boards and startup boards", body: "Set alerts for your role keywords and apply within 48 hours of posting." },
            { heading: "Referrals and networks", body: "Alumni groups, open-source communities, meetups and former colleagues. Give help first." },
            { heading: "Build in public", body: "Share what you ship and learn. Recruiters and founders find people who make their work visible." },
            { heading: "Recruiters and staffing partners", body: "Useful for volume and market intelligence. Be clear about your target role and range." },
          ],
        },
        {
          title: "Protect your time and money",
          items: [
            { heading: "Red flags", bullets: ["Asks you to pay for training, equipment or a placement", "No company email domain, vague role and salary", "Offers that arrive without any interview", "Pressure to decide within hours"] },
          ],
        },
      ],
    },
  ],
};

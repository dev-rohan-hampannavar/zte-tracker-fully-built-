import type { Playbook } from "./types";

export const RESUME_STUDIO: Playbook = {
  title: "Resume studio",
  subtitle:
    "Build a one-page resume that passes automated screens and gets a human to say yes, then turn it into a LinkedIn profile and GitHub that back it up.",
  sections: [
    {
      id: "structure",
      label: "Structure",
      summary: "Recruiters spend seconds on a first pass. Make the order match what they look for.",
      blocks: [
        {
          title: "The one-page layout that works",
          steps: [
            "Header: name, city, phone, email, GitHub, LinkedIn, and a live project link. No photo, no date of birth, no full address.",
            "Headline and summary: two lines naming your target role, your strongest stack and one proof point.",
            "Skills: grouped (Languages, Frontend, Backend, Data, Tools). Only list what you'd be comfortable being interviewed on.",
            "Projects (for early-career): 2–3 entries, each with a live link, repo link, stack and 2–3 result-focused bullets.",
            "Experience: most recent first, bullets that show impact; translate non-tech work into transferable outcomes.",
            "Education and certifications: short; one line each. Move above projects only if it's your strongest asset.",
          ],
          callout: "One page until you have about ten years of experience. If a line doesn't support the role you're applying for, cut it.",
        },
        {
          title: "Format rules for automated screens",
          items: [
            { heading: "Do", bullets: ["Single column, standard fonts, 10–11 pt body", "Plain headings: Experience, Projects, Skills, Education", "Export as PDF with selectable text, named Firstname-Lastname-Role.pdf", "Spell out acronyms once, for example Continuous Integration (CI)"] },
            { heading: "Don't", bullets: ["Tables, text boxes, icons or skill-level bars", "Images of text, or headers and footers holding contact details", "Keyword lists pasted in white text", "Claims you can't back up in an interview"] },
          ],
        },
      ],
    },
    {
      id: "bullets",
      label: "Bullets",
      summary: "Bullets carry your resume. Use the formula, then check each one with the bullet checker above.",
      blocks: [
        {
          title: "The formula",
          intro: "Action verb + what you built or changed + how (tools or method) + result you can measure.",
          items: [
            { heading: "Weak", example: "Responsible for the website's backend and database." },
            { heading: "Strong", example: "Built a REST API with Node.js and PostgreSQL serving 2,000 monthly users; added indexes that cut the slowest query from 1.8s to 120ms." },
          ],
        },
        {
          title: "Before and after",
          items: [
            { heading: "Project", body: "Before: Made a to-do app with React.", example: "After: Built a task manager in React and TypeScript with offline support and 40 unit tests; deployed on Vercel with CI running on every pull request." },
            { heading: "Operations or support background", body: "Before: Handled customer queries.", example: "After: Resolved 35+ customer tickets a week and wrote 12 help articles, reducing repeat questions by 20%." },
            { heading: "Internship or freelance", body: "Before: Worked on the company dashboard.", example: "After: Implemented filtering and CSV export in the admin dashboard with React and SQL, saving the support team about 4 hours a week." },
            { heading: "Automation", body: "Before: Used Excel for reports.", example: "After: Automated the weekly sales report with a Python script, replacing 3 hours of manual work with a 5-minute scheduled job." },
          ],
        },
        {
          title: "No numbers yet? Here's where to find them",
          items: [
            { heading: "Time", bullets: ["How long did it take before and after?", "How often does it run, and how much manual work did it replace?"] },
            { heading: "Scale", bullets: ["Users, requests, records, pages, test count, team size", "Lines of code are the weakest number; prefer outcomes"] },
            { heading: "Quality", bullets: ["Bugs found, errors reduced, test coverage, Lighthouse score, uptime"] },
          ],
          callout: "Estimates are fine when honest: 'about 3 hours a week' or 'roughly 500 users'. Never invent a number you can't explain.",
        },
      ],
    },
    {
      id: "projects",
      label: "Projects",
      summary: "For early-career candidates, projects are your experience. Each one should prove a skill the job asks for.",
      blocks: [
        {
          title: "A project entry that gets read",
          steps: [
            "Name and one-line purpose: who it's for and what problem it solves.",
            "Live link and repo link in the header line.",
            "Stack in one line, chosen to match the job description.",
            "Bullet 1: the hardest technical decision and why.",
            "Bullet 2: a measurable outcome (performance, users, tests, deployment).",
            "Bullet 3: what you did beyond tutorials, such as auth, payments, background jobs, or CI.",
          ],
        },
        {
          title: "Make the repository match the resume",
          items: [
            { heading: "README checklist", bullets: ["What it does and a screenshot or short GIF", "How to run it locally in under five commands", "Architecture in one diagram or paragraph", "Decisions and trade-offs, and what you'd do next", "A live demo link that actually works"] },
            { heading: "Signals of quality", bullets: ["Meaningful commit messages and small pull requests", "Tests and a CI badge", "No secrets in the repo, environment variables documented"] },
          ],
        },
      ],
    },
    {
      id: "situations",
      label: "Your situation",
      summary: "The same facts can be framed very differently depending on where you're starting from.",
      blocks: [
        {
          title: "Headline and summary templates",
          items: [
            { heading: "Student or recent graduate", example: "Full-stack developer (React, Node.js, PostgreSQL) with three deployed projects and a focus on clean, tested code. Seeking a junior developer role on a product team." },
            { heading: "Career switcher", example: "Former [field] professional turned full-stack developer. Combines [X] years of [domain] experience with hands-on React, Node.js and SQL projects. Seeking a junior role where domain knowledge matters." },
            { heading: "Experienced developer", example: "Backend engineer with [X] years building [kind of systems]. Led [outcome] and improved [metric]. Looking for a senior role with ownership of [area]." },
          ],
        },
        {
          title: "Translating non-tech experience",
          table: {
            headers: ["Experience", "Transferable strength", "How to phrase it"],
            rows: [
              ["Customer support or success", "Empathy, debugging users' problems, documentation", "Diagnosed and resolved 30+ issues weekly; turned recurring questions into 12 help articles"],
              ["Operations or analytics", "Process thinking, SQL or Excel, stakeholder reporting", "Automated weekly reporting, saving 4 hours a week; defined metrics used by 3 teams"],
              ["Sales or marketing", "Understanding users, experimentation, communication", "Ran 15 A/B tests and shipped landing pages that improved sign-ups by 18%"],
              ["Teaching or training", "Explaining clearly, structuring learning", "Designed a 6-week curriculum used by 40 learners; mentored 5 to first jobs"],
            ],
          },
        },
      ],
    },
    {
      id: "profiles",
      label: "LinkedIn & GitHub",
      summary: "Your resume gets you a screen; your profiles confirm what it says.",
      blocks: [
        {
          title: "LinkedIn",
          items: [
            { heading: "Headline formula", example: "Full-stack developer | React, Node.js, PostgreSQL | Building [what] in public" },
            { heading: "About section (four short paragraphs)", bullets: ["What you do and who you help", "Your strongest projects with results", "Your stack and what you're learning next", "What you're looking for and how to reach you"] },
            { heading: "Featured", body: "Pin your best project, your GitHub and a short write-up that shows how you think. Keep it current." },
          ],
        },
        {
          title: "GitHub",
          items: [
            { heading: "Pinned repositories", body: "Pin 3–6: each with a clear README, a live link and a short description. Archive or hide abandoned experiments." },
            { heading: "Profile README", body: "One screen: who you are, what you're building, your stack and how to contact you." },
            { heading: "Activity", body: "Consistency beats bursts. A few commits every week tell a better story than a flurry before applying." },
          ],
        },
      ],
    },
    {
      id: "checklist",
      label: "Final checklist",
      summary: "Run this before every application.",
      blocks: [
        {
          title: "Before you hit send",
          steps: [
            "Tailored the headline and top skills to this job description.",
            "Every bullet passes the checker: verb, number, tool, 8–30 words.",
            "All links work in an incognito window and the demo loads quickly.",
            "No typos: read it aloud, then run a spell checker.",
            "Saved as PDF with a clear filename; text is selectable.",
            "Contact details are correct and your email address is professional.",
            "Everything on the page is something you can discuss for five minutes.",
          ],
        },
      ],
    },
  ],
};

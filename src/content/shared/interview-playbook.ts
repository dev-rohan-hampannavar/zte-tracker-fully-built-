import type { Playbook } from "./types";

export const INTERVIEW_PLAYBOOK: Playbook = {
  title: "Interview playbook",
  subtitle:
    "Everything you need to go from first call to signed offer: what each round tests, how to answer, and what to practise each week.",
  sections: [
    {
      id: "process",
      label: "The process",
      summary: "Know what each stage is really testing so you prepare for the right thing.",
      blocks: [
        {
          title: "Typical stages for a developer role",
          table: {
            headers: ["Stage", "What they test", "How to prepare"],
            rows: [
              ["Recruiter screen (15–30 min)", "Motivation, communication, salary range, notice period, basic fit", "60-second intro, why this company, a salary range you've researched"],
              ["Online assessment", "Speed and accuracy on DSA or a small build", "Timed practice, read constraints first, handle edge cases"],
              ["Technical screen (45–60 min)", "Problem solving out loud, code quality, basics of your stack", "Pattern practice, think-aloud method, stack fundamentals"],
              ["Take-home or pair session", "How you structure real code and communicate", "Small, clean, tested solution with a README, not a big one"],
              ["Onsite or final loop (3–5 rounds)", "Coding, design, a deep dive on your projects, behavioural", "Project walkthrough, system design basics, STAR stories"],
              ["Hiring manager / HR", "Ownership, growth mindset, expectations, offer details", "Stories, questions for them, negotiation scripts"],
            ],
          },
          callout: "Most rejections happen at the screen. Treat the first 30 minutes with a recruiter as a real interview, not a formality.",
        },
        {
          title: "What interviewers score, whatever the round",
          items: [
            { heading: "Problem solving", body: "Do you clarify, plan, and recover when stuck, rather than freezing or guessing?" },
            { heading: "Communication", body: "Can they follow your thinking? Narrate decisions, trade-offs, and what you'd check next." },
            { heading: "Code quality", body: "Readable names, small functions, sensible edge-case handling, a quick test of your own." },
            { heading: "Ownership and learning", body: "Do you take responsibility, ask good questions, and show what you learned from mistakes?" },
          ],
        },
      ],
    },
    {
      id: "behavioural",
      label: "Intro & behavioural",
      summary: "Stories win offers when skills are close. Build a bank of them once, then reuse them everywhere.",
      blocks: [
        {
          title: "Your 60-second introduction",
          intro: "Use the present → past → future shape and end on why you're in the room.",
          steps: [
            "Present: who you are right now and what you're building or learning (one sentence, with a concrete project).",
            "Past: the one or two experiences that led here (emphasise skills you can transfer).",
            "Future: the kind of role you want and why this company is a good next step.",
          ],
          items: [
            {
              heading: "Template",
              example:
                "I'm a [role/background] who's been building [project] with [stack]. Before that I [relevant past], which taught me [transferable skill]. I'm looking for a [role] where I can [what you want to do], and [company] stands out because [specific reason].",
            },
          ],
        },
        {
          title: "The STAR+ method",
          intro: "Situation, Task, Action, Result, plus a Reflection. The reflection is what most candidates skip and what interviewers remember.",
          items: [
            { heading: "Situation and Task (15%)", body: "Two sentences: the context and what you were responsible for. Skip the backstory." },
            { heading: "Action (50%)", body: "What YOU did, step by step, in the first person. 'We' hides your contribution." },
            { heading: "Result (25%)", body: "A number or a concrete outcome: time saved, errors reduced, users helped, a lesson adopted by others." },
            { heading: "Reflection (10%)", body: "What you would do differently, or what you now do by default because of it." },
          ],
          callout: "Prepare 6 stories and map each to several questions: a hard technical problem, a conflict, a failure, a time you led, a time you learned fast, a time you disagreed and committed.",
        },
        {
          title: "Questions you should expect, and how to answer them",
          items: [
            { heading: "Tell me about a project you're proud of", body: "Pick one you can go deep on. Structure: problem → why you chose the approach → hardest bug or decision → result → what you'd change." },
            { heading: "Tell me about a time you failed", body: "Choose a real, contained failure. Own it in one sentence, spend most of the time on what you changed afterwards." },
            { heading: "Describe a conflict with a teammate", body: "Show that you listened first, separated the person from the problem, and reached a decision you both could act on." },
            { heading: "Why do you want to leave your current role or field?", body: "Move towards something rather than away from something. Name what you want to build and the skills you're growing." },
            { heading: "How do you handle a task you don't know how to do?", body: "Break it down, time-box research, ask a specific question after you've tried, document what you learned." },
            { heading: "What's your biggest weakness?", body: "Pick a real, non-fatal one and show a system you use to manage it, for example estimation or asking for help earlier." },
            { heading: "Where do you see yourself in three years?", body: "Growing technical depth and scope of ownership in this kind of work. Avoid naming a title." },
            { heading: "Do you have questions for us?", body: "Always. Ask about how the team ships, what a great first 90 days looks like, and how feedback works. See the questions list below." },
          ],
        },
        {
          title: "Questions to ask them",
          items: [
            { heading: "About the work", bullets: ["What does a typical week look like for someone in this role?", "What's the hardest technical problem the team is working on now?", "How do you decide what to build next?"] },
            { heading: "About growth", bullets: ["What does success look like in the first 90 days?", "How do code reviews and mentoring work here?", "Can you describe someone who grew quickly on this team and how?"] },
            { heading: "About the company", bullets: ["How do you measure whether a release went well?", "What are the biggest risks to the team's goals this year?"] },
          ],
        },
      ],
    },
    {
      id: "dsa",
      label: "DSA patterns",
      summary: "Don't memorise 500 problems. Learn about a dozen patterns, then recognise which one a new problem is wearing.",
      blocks: [
        {
          title: "The six-step method for any coding question",
          steps: [
            "Clarify: restate the problem, ask about input size, duplicates, negative numbers, empty input.",
            "Examples: walk one normal and one edge case by hand, out loud.",
            "Brute force: say the simplest solution and its time and space cost, even if you won't code it.",
            "Improve: name the bottleneck and the pattern that removes it.",
            "Code: write small, well-named pieces; narrate as you go.",
            "Test: run your examples through the code line by line, then try an edge case.",
          ],
          callout: "If you're stuck, say what you've ruled out and what you'd try next. Interviewers give hints to people who think out loud.",
        },
        {
          title: "Twelve patterns and when to reach for them",
          table: {
            headers: ["Pattern", "Reach for it when", "Practice problems"],
            rows: [
              ["Hash map / set", "You need fast lookup, counting, or de-duplication", "Two Sum, Valid Anagram, Group Anagrams"],
              ["Two pointers", "Sorted array or pair/triplet conditions, in-place edits", "3Sum, Container With Most Water, Remove Duplicates"],
              ["Sliding window", "Longest or shortest subarray/substring with a constraint", "Longest Substring Without Repeating, Minimum Window Substring"],
              ["Binary search", "Sorted data, or a monotonic yes/no answer over a range", "Search in Rotated Array, Koko Eating Bananas"],
              ["Stack / monotonic stack", "Matching pairs, next greater element, nested structure", "Valid Parentheses, Daily Temperatures"],
              ["BFS", "Shortest path in unweighted graph, level-by-level traversal", "Binary Tree Level Order, Rotting Oranges"],
              ["DFS / backtracking", "Explore all paths, combinations, permutations, grids", "Number of Islands, Subsets, Word Search"],
              ["Heap / priority queue", "Top K, streaming min/max, merging sorted lists", "Top K Frequent Elements, Merge K Sorted Lists"],
              ["Intervals", "Overlapping ranges, scheduling, merging", "Merge Intervals, Meeting Rooms II"],
              ["Dynamic programming", "Overlapping subproblems with an optimal substructure", "Climbing Stairs, Coin Change, Longest Common Subsequence"],
              ["Graphs / union-find", "Connectivity, cycles, components, dependency order", "Course Schedule, Number of Provinces"],
              ["Trees and tries", "Hierarchical data, prefix search, recursion on structure", "Lowest Common Ancestor, Implement Trie"],
            ],
          },
        },
        {
          title: "A 12-week practice plan (about 5 problems a week)",
          items: [
            { heading: "Weeks 1–3: fundamentals", body: "Arrays, strings, hash maps, two pointers. Aim for clean solutions to easy problems in under 20 minutes." },
            { heading: "Weeks 4–6: core patterns", body: "Sliding window, binary search, stacks, linked lists, basic trees. Start mixing in medium problems." },
            { heading: "Weeks 7–9: traversals and search", body: "BFS, DFS, backtracking, heaps, intervals. Explain each solution aloud as if to an interviewer." },
            { heading: "Weeks 10–12: depth and mocks", body: "Dynamic programming basics, graphs, and two timed mock interviews a week. Redo problems you missed after a week." },
          ],
          callout: "After each problem, write one line in a notebook: the pattern, the trap, and the complexity. Review the notebook, not the problems.",
        },
      ],
    },
    {
      id: "fundamentals",
      label: "Web & backend basics",
      summary: "Short, correct answers to the questions that come up again and again. Practise saying them in your own words.",
      blocks: [
        {
          title: "JavaScript and the browser",
          items: [
            { heading: "What is a closure?", body: "A function that remembers the variables from the scope where it was created, even after that scope has finished. It's how private state, callbacks and factories work." },
            { heading: "Explain the event loop", body: "JavaScript runs one call stack. Async work (timers, network) is handled outside it; finished callbacks queue up and run when the stack is empty, with promise callbacks (microtasks) running before timer callbacks (macrotasks)." },
            { heading: "let vs const vs var", body: "var is function-scoped and hoisted; let and const are block-scoped. Use const by default, let when you must reassign." },
            { heading: "What is debouncing vs throttling?", body: "Debounce waits until activity stops before running once; throttle runs at most once per interval. Search boxes debounce, scroll handlers throttle." },
          ],
        },
        {
          title: "React",
          items: [
            { heading: "Why do lists need keys?", body: "Keys let React match items between renders so it updates, moves or removes the right DOM nodes and preserves component state. Use stable IDs, not array indexes, for dynamic lists." },
            { heading: "When does a component re-render?", body: "When its state changes, its props change, or its parent re-renders (unless memoised). Measure before optimising." },
            { heading: "useEffect: what is the dependency array for?", body: "It lists the values the effect reads. The effect re-runs when they change. Missing dependencies cause stale values; an empty array means run once after the first render." },
            { heading: "State vs props", body: "Props come from a parent and are read-only; state is owned by the component and changes over time. Lift state up when siblings need the same data." },
          ],
        },
        {
          title: "HTTP, APIs and security",
          items: [
            { heading: "REST basics", body: "Resources are nouns in URLs; HTTP verbs express actions (GET read, POST create, PUT/PATCH update, DELETE remove). Status codes: 2xx success, 3xx redirect, 4xx client error, 5xx server error." },
            { heading: "PUT vs PATCH", body: "PUT replaces the whole resource; PATCH changes only the fields you send. PUT should be idempotent." },
            { heading: "Sessions vs JWT", body: "Sessions store state on the server and send a cookie; JWTs carry signed claims the server can verify without a lookup. JWTs are hard to revoke, so keep them short-lived and pair them with refresh tokens." },
            { heading: "What is CORS?", body: "A browser rule that blocks a page from reading responses from another origin unless that server allows it with headers. It protects users; it isn't an API authentication mechanism." },
            { heading: "XSS and CSRF", body: "XSS injects script into your page: escape output and use a content security policy. CSRF tricks a logged-in browser into sending a request: use SameSite cookies and anti-CSRF tokens." },
          ],
        },
        {
          title: "Databases and backend",
          items: [
            { heading: "What is an index and what does it cost?", body: "A data structure (usually a B-tree) that lets the database find rows without scanning the table. It speeds reads and slows writes and uses storage, so index columns you filter, join and sort on." },
            { heading: "Explain SQL joins", body: "INNER returns matching rows from both tables; LEFT returns all rows from the left plus matches; FULL returns all rows from both. Always say what you'd expect when there's no match." },
            { heading: "What is a transaction (ACID)?", body: "A group of operations that succeed or fail together. Atomic, Consistent, Isolated, Durable. Use one when money moves or several rows must change together." },
            { heading: "What is the N+1 query problem?", body: "Running one query for a list and then one more per item. Fix with a join, batch loading, or eager loading." },
            { heading: "How would you cache this?", body: "Decide what's read often and changes rarely, where to cache (browser, CDN, application, database), how long, and how you'll invalidate it. Stale data is the price of speed." },
          ],
        },
      ],
    },
    {
      id: "design",
      label: "System design",
      summary: "For early-career roles the goal is structured thinking, not drawing a giant distributed system.",
      blocks: [
        {
          title: "A five-step framework",
          steps: [
            "Requirements: who uses it, the 3–4 core features, scale you should assume, what's out of scope.",
            "API: list the main endpoints or events with inputs and outputs.",
            "Data model: the main entities, their relationships, and the queries you need to be fast.",
            "High-level design: client, API, database, and then only the extra pieces you can justify (cache, queue, object storage).",
            "Bottlenecks: what breaks first as usage grows, and how you'd measure and fix it.",
          ],
        },
        {
          title: "Building blocks to know",
          table: {
            headers: ["Block", "Use it for", "Trade-off"],
            rows: [
              ["Relational database", "Structured data with relationships and transactions", "Harder to scale writes horizontally"],
              ["Cache (e.g. Redis)", "Hot reads, rate limits, sessions", "Invalidation and staleness"],
              ["Message queue", "Slow or bursty work: emails, image processing", "Eventual results, retries and duplicates"],
              ["Object storage + CDN", "Files, images, static assets", "Cost and cache control"],
              ["Load balancer", "Spreading traffic across app servers", "Needs stateless servers or sticky sessions"],
              ["Search index", "Full-text and filtered search", "Sync lag with the primary database"],
            ],
          },
        },
        {
          title: "Practice prompts (talk through each in 30 minutes)",
          items: [
            { heading: "Design a URL shortener", bullets: ["Key generation and collisions", "Read-heavy traffic and caching", "Analytics without slowing redirects"] },
            { heading: "Design a notifications system", bullets: ["Channels: email, push, in-app", "Queues, retries and rate limits", "User preferences and deduplication"] },
            { heading: "Design a simple chat app", bullets: ["WebSockets vs polling", "Message ordering and delivery", "Storing history and unread counts"] },
            { heading: "Design a job board", bullets: ["Data model for jobs, companies and applications", "Search and filters", "Email alerts for saved searches"] },
            { heading: "Design a file upload service", bullets: ["Direct-to-storage uploads with signed URLs", "Virus scanning and size limits", "Access control and expiry"] },
            { heading: "Design a rate limiter", bullets: ["Token bucket vs sliding window", "Per-user vs per-IP limits", "Where to store counters"] },
          ],
        },
      ],
    },
    {
      id: "offers",
      label: "Offers & negotiation",
      summary: "A calm, prepared conversation is worth more than another month of studying.",
      blocks: [
        {
          title: "Before you negotiate",
          steps: [
            "Get the full breakdown in writing: base, variable, joining bonus, equity, benefits, notice period, probation length.",
            "Compare on take-home after tax and on growth: learning, mentorship, scope, brand, not just headline pay.",
            "Decide your walk-away number and your target number before the call.",
            "Take 24–48 hours. A good employer respects a considered answer.",
          ],
        },
        {
          title: "Scripts you can adapt",
          items: [
            { heading: "Asking for time", example: "Thank you, I'm excited about this. I'd like to review the details properly. Could I get back to you by Thursday?" },
            { heading: "Countering on pay", example: "I'm keen to join. Based on the scope of the role and what I'd bring in [skills], I was hoping for something closer to [number]. Is there flexibility there?" },
            { heading: "If pay is fixed", example: "I understand the base is set. Could we look at the joining bonus, a review after six months, or a learning budget instead?" },
            { heading: "Declining gracefully", example: "Thank you for the offer and for the time your team invested. I've decided to go in a different direction, and I'd like to stay in touch." },
          ],
          callout: "Never share a number first if you can avoid it. Ask for the range, then answer with a range that sits at the top of what you'd accept.",
        },
      ],
    },
    {
      id: "checklist",
      label: "Interview-day checklist",
      summary: "The boring things that decide close calls.",
      blocks: [
        {
          title: "The day before",
          steps: [
            "Re-read the job description and pick the three requirements you can speak to with a story.",
            "Skim the company's product, recent news and engineering blog for one thing you genuinely find interesting.",
            "Test your laptop, camera, microphone, internet and code editor; have a backup hotspot.",
            "Prepare three questions to ask and your 60-second introduction.",
            "Sleep. Last-minute cramming helps much less than being clear-headed.",
          ],
        },
        {
          title: "During and after",
          steps: [
            "Join five minutes early, water nearby, notifications off, a blank page for notes.",
            "Think out loud, ask clarifying questions, and say what you'd do with more time.",
            "If you don't know something, say so, reason from what you do know, and ask how they'd approach it.",
            "Send a short thank-you within 24 hours that mentions one specific thing you discussed.",
            "Write down every question you were asked while it's fresh. That's your best study material.",
          ],
        },
      ],
    },
  ],
};

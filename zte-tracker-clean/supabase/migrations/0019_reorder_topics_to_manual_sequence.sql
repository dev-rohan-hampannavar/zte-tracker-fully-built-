-- Reorders public.topics.order_index within each phase to match the
-- execution manual's Day 1/2/3... sequence, so Daily Mission progresses
-- through topics in the same order as the manual's lesson days.
-- Topics with no corresponding manual day (all of phase-06b / React
-- Native, which the manual doesn't cover) keep their original relative
-- order, placed after the mapped topics in that phase.

begin;

update public.topics set order_index = 1 where id = 'topic-01-001'; -- VS Code
update public.topics set order_index = 2 where id = 'topic-01-002'; -- Bash
update public.topics set order_index = 3 where id = 'topic-01-003'; -- nvm + npm
update public.topics set order_index = 4 where id = 'topic-01-004'; -- SSH Keys
update public.topics set order_index = 6 where id = 'topic-01-006'; -- HTML5
update public.topics set order_index = 7 where id = 'topic-01-007'; -- CSS3
update public.topics set order_index = 8 where id = 'topic-01-016'; -- Collections
update public.topics set order_index = 9 where id = 'topic-01-011'; -- Regular Expressions
update public.topics set order_index = 10 where id = 'topic-01-012'; -- Prototypes & Inheritance
update public.topics set order_index = 11 where id = 'topic-01-013'; -- Classes
update public.topics set order_index = 12 where id = 'topic-01-014'; -- Iterators & Generators
update public.topics set order_index = 13 where id = 'topic-01-015'; -- Symbols
update public.topics set order_index = 14 where id = 'topic-01-017'; -- Property Descriptors & Object Internals
update public.topics set order_index = 15 where id = 'topic-01-018'; -- Reflect API
update public.topics set order_index = 16 where id = 'topic-01-019'; -- Proxy
update public.topics set order_index = 17 where id = 'topic-01-020'; -- Meta Programming
update public.topics set order_index = 18 where id = 'topic-01-021'; -- Modules
update public.topics set order_index = 19 where id = 'topic-01-022'; -- Event Loop
update public.topics set order_index = 20 where id = 'topic-01-023'; -- Asynchronous JavaScript
update public.topics set order_index = 21 where id = 'topic-01-024'; -- Advanced Promises
update public.topics set order_index = 22 where id = 'topic-01-025'; -- Advanced Async
update public.topics set order_index = 23 where id = 'topic-01-026'; -- HTTP & APIs
update public.topics set order_index = 24 where id = 'topic-01-010'; -- Error Handling
update public.topics set order_index = 25 where id = 'topic-01-027'; -- DOM
update public.topics set order_index = 26 where id = 'topic-01-028'; -- Events
update public.topics set order_index = 27 where id = 'topic-01-029'; -- Forms (JS side)
update public.topics set order_index = 28 where id = 'topic-01-030'; -- Browser Storage
update public.topics set order_index = 29 where id = 'topic-01-031'; -- Timing Functions
update public.topics set order_index = 30 where id = 'topic-01-032'; -- Browser APIs
update public.topics set order_index = 31 where id = 'topic-01-033'; -- Advanced Browser APIs (Observers & Performance)
update public.topics set order_index = 32 where id = 'topic-01-037'; -- Internationalization
update public.topics set order_index = 33 where id = 'topic-01-034'; -- Networking (Realtime)
update public.topics set order_index = 34 where id = 'topic-01-035'; -- Binary Data
update public.topics set order_index = 35 where id = 'topic-01-036'; -- Workers
update public.topics set order_index = 36 where id = 'topic-01-038'; -- Security
update public.topics set order_index = 37 where id = 'topic-01-039'; -- Browser Rendering & Performance
update public.topics set order_index = 38 where id = 'topic-01-040'; -- Frontend Performance Techniques
update public.topics set order_index = 39 where id = 'topic-01-041'; -- Memory Leaks
update public.topics set order_index = 40 where id = 'topic-01-042'; -- Functional Programming
update public.topics set order_index = 41 where id = 'topic-01-043'; -- Advanced Functional Programming
update public.topics set order_index = 42 where id = 'topic-01-044'; -- Design Patterns
update public.topics set order_index = 43 where id = 'topic-01-008'; -- JavaScript — Language Core
update public.topics set order_index = 44 where id = 'topic-01-009'; -- Core Data Structures
update public.topics set order_index = 45 where id = 'topic-01-046'; -- Algorithms & Problem Solving in JavaScript
update public.topics set order_index = 46 where id = 'topic-01-047'; -- Advanced Algorithms
update public.topics set order_index = 47 where id = 'topic-01-048'; -- Testing
update public.topics set order_index = 48 where id = 'topic-01-049'; -- Debugging
update public.topics set order_index = 49 where id = 'topic-01-050'; -- Package Ecosystem & Tooling
update public.topics set order_index = 50 where id = 'topic-01-051'; -- JavaScript Best Practices
update public.topics set order_index = 51 where id = 'topic-01-052'; -- JavaScript Engine Internals
update public.topics set order_index = 52 where id = 'topic-01-053'; -- JavaScript Specifications
update public.topics set order_index = 53 where id = 'topic-01-054'; -- Modern JavaScript Features (ES6+) — Consolidation Checkpoint
update public.topics set order_index = 54 where id = 'topic-01-055'; -- TypeScript — Introduction
update public.topics set order_index = 55 where id = 'topic-01-056'; -- tsconfig.json (Deep Dive)
update public.topics set order_index = 56 where id = 'topic-01-057'; -- Type Narrowing (Deep Dive)
update public.topics set order_index = 57 where id = 'topic-01-058'; -- Discriminated Unions
update public.topics set order_index = 58 where id = 'topic-01-059'; -- Generics
update public.topics set order_index = 59 where id = 'topic-01-060'; -- as const & satisfies
update public.topics set order_index = 60 where id = 'topic-01-061'; -- Utility Types
update public.topics set order_index = 61 where id = 'topic-01-062'; -- Mapped Types
update public.topics set order_index = 62 where id = 'topic-01-063'; -- Conditional Types
update public.topics set order_index = 63 where id = 'topic-01-064'; -- Template Literal Types
update public.topics set order_index = 64 where id = 'topic-01-065'; -- Declaration Files
update public.topics set order_index = 65 where id = 'topic-01-066'; -- Zod
update public.topics set order_index = 66 where id = 'topic-01-067'; -- SQL Fundamentals
update public.topics set order_index = 67 where id = 'topic-01-068'; -- Git + GitHub (Collaboration Deep Dive)
update public.topics set order_index = 68 where id = 'topic-01-069'; -- Conventional Commits
update public.topics set order_index = 69 where id = 'topic-01-070'; -- ESLint
update public.topics set order_index = 70 where id = 'topic-01-071'; -- Prettier
update public.topics set order_index = 71 where id = 'topic-01-045'; -- JavaScript Architecture
update public.topics set order_index = 1 where id = 'topic-01b-tbl02'; -- discriminated unions
update public.topics set order_index = 2 where id = 'topic-01b-tbl09'; -- type narrowing
update public.topics set order_index = 3 where id = 'topic-01b-tbl10'; -- tsconfig.json
update public.topics set order_index = 4 where id = 'topic-01b-tbl01'; -- generics
update public.topics set order_index = 5 where id = 'topic-01b-tbl07'; -- satisfies operator
update public.topics set order_index = 6 where id = 'topic-01b-tbl08'; -- as const
update public.topics set order_index = 7 where id = 'topic-01b-tbl03'; -- conditional types
update public.topics set order_index = 8 where id = 'topic-01b-tbl04'; -- mapped types
update public.topics set order_index = 9 where id = 'topic-01b-tbl05'; -- utility types
update public.topics set order_index = 10 where id = 'topic-01b-tbl06'; -- template literal types
update public.topics set order_index = 17 where id = 'topic-02-017'; -- Route Groups
update public.topics set order_index = 18 where id = 'topic-02-019'; -- Parallel Routes
update public.topics set order_index = 19 where id = 'topic-02-020'; -- Intercepting Routes
update public.topics set order_index = 20 where id = 'topic-02-018'; -- notFound()
update public.topics set order_index = 21 where id = 'topic-02-021'; -- revalidatePath()
update public.topics set order_index = 22 where id = 'topic-02-022'; -- revalidateTag()
update public.topics set order_index = 25 where id = 'topic-02-026'; -- HydrationBoundary and dehydrate()
update public.topics set order_index = 26 where id = 'topic-02-025'; -- Client-Side Data Fetching Libraries (Conceptual Prerequisite)
update public.topics set order_index = 27 where id = 'topic-02-027'; -- Vercel
update public.topics set order_index = 28 where id = 'topic-02-028'; -- Vercel Edge Functions
update public.topics set order_index = 29 where id = 'topic-02-029'; -- Vercel Edge Runtime
update public.topics set order_index = 1 where id = 'topic-03-002'; -- CSS @layer (Cascade Layers)
update public.topics set order_index = 4 where id = 'topic-03-004'; -- BEM (Block Element Modifier)
update public.topics set order_index = 5 where id = 'topic-03-005'; -- Tailwind CSS
update public.topics set order_index = 6 where id = 'topic-03-006'; -- clsx
update public.topics set order_index = 7 where id = 'topic-03-007'; -- tailwind-merge
update public.topics set order_index = 8 where id = 'topic-03-008'; -- CVA (Class Variance Authority)
update public.topics set order_index = 9 where id = 'topic-03-009'; -- Radix UI
update public.topics set order_index = 10 where id = 'topic-03-010'; -- shadcn/ui
update public.topics set order_index = 11 where id = 'topic-03-011'; -- next-themes
update public.topics set order_index = 12 where id = 'topic-03-012'; -- react-hook-form
update public.topics set order_index = 14 where id = 'topic-03-014'; -- date-fns
update public.topics set order_index = 15 where id = 'topic-03-015'; -- lodash-es
update public.topics set order_index = 16 where id = 'topic-03-016'; -- nanoid
update public.topics set order_index = 17 where id = 'topic-05-017'; -- HMAC-SHA256
update public.topics set order_index = 18 where id = 'topic-05-018'; -- JWT (JSON Web Tokens)
update public.topics set order_index = 19 where id = 'topic-05-019'; -- jose
update public.topics set order_index = 20 where id = 'topic-05-020'; -- httpOnly Cookies
update public.topics set order_index = 21 where id = 'topic-05-021'; -- SameSite=Lax
update public.topics set order_index = 1 where id = 'topic-07-001'; -- curl
update public.topics set order_index = 2 where id = 'topic-07-002'; -- Postman
update public.topics set order_index = 3 where id = 'topic-07-003'; -- Insomnia
update public.topics set order_index = 4 where id = 'topic-07-004'; -- OpenAPI 3.0
update public.topics set order_index = 5 where id = 'topic-07-005'; -- Swagger UI
update public.topics set order_index = 4 where id = 'topic-08-004'; -- Kadane's Algorithm
update public.topics set order_index = 5 where id = 'topic-08-005'; -- HashMap / Frequency Count Patterns
update public.topics set order_index = 6 where id = 'topic-08-006'; -- Stack Patterns
update public.topics set order_index = 7 where id = 'topic-08-007'; -- Monotonic Stack
update public.topics set order_index = 8 where id = 'topic-08-008'; -- Queue / Deque Patterns
update public.topics set order_index = 9 where id = 'topic-08-009'; -- BFS / DFS
update public.topics set order_index = 11 where id = 'topic-08-011'; -- Floyd's Cycle Detection
update public.topics set order_index = 12 where id = 'topic-08-012'; -- Heap / Priority Queue
update public.topics set order_index = 13 where id = 'topic-08-013'; -- Dynamic Programming (Memoization + Tabulation)
update public.topics set order_index = 8 where id = 'topic-11-008'; -- MVCC (Multi-Version Concurrency Control)
update public.topics set order_index = 9 where id = 'topic-11-009'; -- VACUUM
update public.topics set order_index = 3 where id = 'topic-12-003'; -- Anthropic API
update public.topics set order_index = 4 where id = 'topic-12-004'; -- text-embedding-3-small
update public.topics set order_index = 9 where id = 'topic-12-009'; -- Vercel AI SDK
update public.topics set order_index = 10 where id = 'topic-12-010'; -- BullMQ
update public.topics set order_index = 11 where id = 'topic-12-011'; -- Bull Board
update public.topics set order_index = 6 where id = 'topic-13-006'; -- requestAnimationFrame
update public.topics set order_index = 7 where id = 'topic-13-007'; -- requestIdleCallback
update public.topics set order_index = 8 where id = 'topic-13-008'; -- View Transitions API
update public.topics set order_index = 11 where id = 'topic-13-011'; -- y-websocket
update public.topics set order_index = 12 where id = 'topic-13-012'; -- y-webrtc
update public.topics set order_index = 13 where id = 'topic-13-013'; -- y-indexeddb
update public.topics set order_index = 14 where id = 'topic-13-014'; -- Hocuspocus
update public.topics set order_index = 15 where id = 'topic-13-015'; -- ProseMirror
update public.topics set order_index = 16 where id = 'topic-13-016'; -- Tiptap
update public.topics set order_index = 1 where id = 'topic-17-001'; -- Cache-Aside Caching
update public.topics set order_index = 2 where id = 'topic-17-002'; -- Write-Through Caching
update public.topics set order_index = 3 where id = 'topic-17-003'; -- Optimistic Updates
update public.topics set order_index = 3 where id = 'topic-18-010'; -- docs/adr/
update public.topics set order_index = 4 where id = 'topic-18-003'; -- RFCs (Request for Comments)
update public.topics set order_index = 5 where id = 'topic-18-004'; -- DORA Metrics
update public.topics set order_index = 6 where id = 'topic-18-005'; -- Blameless Post-Mortems
update public.topics set order_index = 7 where id = 'topic-18-006'; -- Technical Debt Tracking
update public.topics set order_index = 8 where id = 'topic-18-007'; -- Estimation Tracking
update public.topics set order_index = 9 where id = 'topic-18-008'; -- Code Review Conventions
update public.topics set order_index = 10 where id = 'topic-18-009'; -- Ramp-Up Strategy
update public.topics set order_index = 11 where id = 'topic-18-011'; -- ARCHITECTURE.md
update public.topics set order_index = 12 where id = 'topic-18-012'; -- DECISIONS.md
update public.topics set order_index = 13 where id = 'topic-18-013'; -- PERFORMANCE.md
update public.topics set order_index = 14 where id = 'topic-18-014'; -- SECURITY.md
update public.topics set order_index = 15 where id = 'topic-18-015'; -- MONITORING.md
update public.topics set order_index = 16 where id = 'topic-18-016'; -- OPERATIONS.md
update public.topics set order_index = 17 where id = 'topic-18-019'; -- PRODUCT_DECISIONS.md
update public.topics set order_index = 18 where id = 'topic-18-020'; -- READING_NOTES.md
update public.topics set order_index = 19 where id = 'topic-18-018'; -- TECH_DEBT.md
update public.topics set order_index = 20 where id = 'topic-18-017'; -- incidents/

commit;
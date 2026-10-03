// Role-family learning paths layered on top of the core curriculum. The core
// curriculum is full-stack shaped; these paths tell a person aiming at a
// different family which phases to treat as core, which to skim or skip, what
// extra modules to add, and what proof of work employers expect. Plain data,
// fully tested, no owner content.

export type PhaseTier = "core" | "light" | "skip";

export const PHASE_TITLES: Record<string, string> = {
  "phase-01": "Developer Environment & Foundations",
  "phase-01b": "TypeScript Mastery",
  "phase-02": "React + Next.js Core",
  "phase-03": "UI System & Styling",
  "phase-04": "State, Data Fetching & Advanced React",
  "phase-05": "Backend + Database + Auth",
  "phase-06": "Testing + CI/CD + Deployment",
  "phase-06b": "React Native (Mobile)",
  "phase-07": "API Documentation & Developer Tooling",
  "phase-08": "DSA & Interview Preparation",
  "phase-09": "Caching + Email + Payments",
  "phase-10": "Monitoring & Analytics",
  "phase-11": "Real-Time + Search + PostgreSQL Internals",
  "phase-12": "AI/RAG + Production AI Patterns",
  "phase-13": "Advanced Browser APIs + Collaboration",
  "phase-14": "Load Testing + Security Deep Dive",
  "phase-15": "Build Tooling + CSS-in-JS",
  "phase-16": "Infrastructure",
  "phase-17": "Architectural Patterns",
  "phase-18": "Engineering Craft + Package Publishing",
  "phase-19": "Career & Community",
};

export interface AddOnModule {
  title: string;
  weeks: number;
  outcome: string;
  topics: string[];
  project: string;
}

export interface PortfolioProject {
  name: string;
  brief: string;
  acceptance: string[];
}

export interface RolePath {
  /** Family paths use the family id; role-specific paths use their own slug. */
  id?: string;
  familyId: string;
  /** Set on role-specific paths: the catalog profiles (job titles) this path is written for. */
  profileIds?: string[];
  /** Role-specific paths can reuse lessons from these modules of the parent family path. */
  include?: string[];
  title: string;
  pitch: string;
  dayInTheLife: string[];
  phaseMap: Record<string, PhaseTier>;
  addOns: AddOnModule[];
  portfolio: PortfolioProject[];
  readyWhen: string[];
  mistakes: string[];
}

const all = (tier: PhaseTier) => Object.fromEntries(Object.keys(PHASE_TITLES).map((id) => [id, tier])) as Record<string, PhaseTier>;
const map = (base: PhaseTier, overrides: Record<string, PhaseTier>) => ({ ...all(base), ...overrides });

export const ROLE_PATHS: RolePath[] = [
  {
    familyId: "software-development",
    title: "Software development path",
    pitch: "The core curriculum is built for you. Follow it in order, treat the foundations as non-negotiable, and use the add-ons to specialise in frontend or backend depth.",
    dayInTheLife: [
      "Pick up a ticket, read the code around it, and ask clarifying questions before typing.",
      "Build a small feature with tests, open a pull request, respond to review comments.",
      "Debug a production issue using logs and metrics, then write down what you learned.",
    ],
    phaseMap: map("core", { "phase-06b": "light", "phase-12": "light", "phase-13": "light", "phase-15": "light", "phase-16": "light" }),
    addOns: [
      {
        title: "Frontend depth",
        weeks: 3,
        outcome: "Ship fast, accessible interfaces that hold up under real users.",
        topics: ["Accessibility with keyboard and screen reader testing", "Core Web Vitals and performance budgets", "Forms, validation and error states", "Design-system thinking and component APIs", "Browser devtools profiling"],
        project: "Take one existing project and raise its Lighthouse performance and accessibility scores above 90, documenting each change.",
      },
      {
        title: "Backend depth",
        weeks: 3,
        outcome: "Design APIs and data models that stay correct as they grow.",
        topics: ["Schema design and migrations", "Pagination, filtering and idempotency", "Background jobs and queues", "Rate limiting and input validation", "Structured logging and tracing"],
        project: "Add a background job queue to one API: emails or report generation with retries and a dead-letter list.",
      },
    ],
    portfolio: [
      { name: "A full-stack product", brief: "A real app with auth, a relational database, and a deployed URL.", acceptance: ["Sign up, log in, and a permission rule that is tested", "At least 3 related tables with migrations", "CI runs tests on every pull request", "README with architecture diagram and trade-offs"] },
      { name: "A project with real users", brief: "Anything used by at least ten people who are not your friends.", acceptance: ["Public link and simple analytics", "Feedback collected and two changes made because of it", "A short write-up of what you learned"] },
    ],
    readyWhen: ["You can build and deploy a CRUD app with auth from an empty folder in a weekend.", "You solve easy problems in about 20 minutes and mediums with hints.", "You can walk through one project's architecture, bugs and trade-offs for ten minutes without notes."],
    mistakes: ["Collecting tutorials instead of shipping a second and third project.", "Skipping tests until the end.", "Leaving DSA until the week before interviews."],
  },
  {
    familyId: "mobile-development",
    title: "Mobile development path",
    pitch: "Use the web foundations to get fluent in components and state, then spend your time on mobile specifics: navigation, offline, device APIs and store releases.",
    dayInTheLife: [
      "Build a screen from a design, handling loading, empty and error states.",
      "Test on a real device and a small screen, and fix layout and performance issues.",
      "Prepare a release: versioning, store listing, crash reporting.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-01b": "core", "phase-02": "core", "phase-03": "light", "phase-04": "core", "phase-05": "light", "phase-06": "core", "phase-06b": "core", "phase-07": "light", "phase-08": "core", "phase-10": "light", "phase-14": "light", "phase-19": "core" }),
    addOns: [
      { title: "Platform fundamentals", weeks: 3, outcome: "Understand how the app lifecycle, permissions and navigation really work on a phone.", topics: ["App lifecycle, background and foreground states", "Navigation stacks, tabs and deep links", "Permissions: camera, location, notifications", "Safe areas, keyboards and gestures", "Platform design conventions (Material and Human Interface)"], project: "Build a note-taking app with tabs, a detail screen, a deep link and a permission prompt that degrades gracefully." },
      { title: "Offline-first and data", weeks: 3, outcome: "Make the app useful without a network and safe when requests fail.", topics: ["Local storage and SQLite", "Caching and optimistic updates", "Sync conflicts and retry queues", "Secure storage for tokens", "Pagination and list performance"], project: "Add offline support to the notes app, syncing changes when the connection returns." },
      { title: "Shipping to the stores", weeks: 2, outcome: "Take an app from a laptop to a store listing with confidence.", topics: ["Build variants and environment configs", "Code signing and release tracks", "Crash reporting and analytics", "Store review guidelines and common rejections", "Performance profiling on low-end devices"], project: "Release a beta through TestFlight or the Play internal track and collect crash-free-session data." },
    ],
    portfolio: [
      { name: "A polished app on a real device", brief: "A focused app that solves one problem well.", acceptance: ["Runs on a physical phone, with screen recordings in the README", "Loading, empty and error states on every screen", "Offline behaviour documented and tested", "Crash reporting wired up"] },
      { name: "A published beta", brief: "Prove you can get through a store pipeline.", acceptance: ["Beta available to testers through an official channel", "Release notes and a privacy policy", "At least five testers and their feedback summarised"] },
    ],
    readyWhen: ["You can build a multi-screen app with navigation, forms and remote data from scratch.", "You explain how state flows through your app and why you chose that approach.", "You have shipped something to testers on a real device."],
    mistakes: ["Testing only in a simulator.", "Ignoring slow devices and poor networks.", "Treating store release as a last-day task."],
  },
  {
    familyId: "data-ai",
    title: "Data and AI path",
    pitch: "Your core is SQL, Python-style data thinking, statistics and communication. Use the web phases lightly, add the data modules below, and build projects that end in a decision or a deployed model.",
    dayInTheLife: [
      "Clarify a business question, then pull and clean the data needed to answer it.",
      "Analyse, visualise and explain what changed and what to do about it.",
      "For engineering and ML roles: build and monitor pipelines or models that run on a schedule.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "core", "phase-06": "light", "phase-08": "core", "phase-09": "skip", "phase-10": "core", "phase-11": "light", "phase-12": "core", "phase-16": "light", "phase-17": "light", "phase-18": "light", "phase-19": "core" }),
    addOns: [
      { title: "SQL for analysis", weeks: 3, outcome: "Answer real business questions with confident, correct queries.", topics: ["Joins, aggregation and grouping", "Window functions and ranking", "CTEs and readable query structure", "Cohort, funnel and retention analysis", "Query plans and indexes"], project: "Analyse a public e-commerce dataset: funnel conversion, monthly cohorts, and a written recommendation." },
      { title: "Python and data wrangling", weeks: 3, outcome: "Clean and reshape messy data reproducibly.", topics: ["Python fundamentals, functions and files", "pandas: selection, groupby, merge, reshape", "Missing data and outliers", "Dates, text and categorical handling", "Notebooks versus scripts and reproducibility"], project: "Turn a messy CSV set into a clean dataset with a script and a data-quality report." },
      { title: "Statistics you actually use", weeks: 3, outcome: "Avoid wrong conclusions and explain uncertainty.", topics: ["Distributions, mean, median, variance", "Sampling, bias and confidence intervals", "Hypothesis tests and p-values, correctly interpreted", "A/B test design and pitfalls", "Correlation versus causation"], project: "Design and analyse a simulated A/B test, including sample size and a plain-language conclusion." },
      { title: "Visualisation and storytelling", weeks: 2, outcome: "Communicate findings so a manager acts on them.", topics: ["Choosing the right chart", "Dashboard design and metrics definitions", "Narrative structure: question, evidence, action", "BI tools and a semantic layer", "Presenting to non-technical audiences"], project: "Build a dashboard with five metrics and a one-page memo that recommends a decision." },
      { title: "Machine learning foundations", weeks: 4, outcome: "Train, evaluate and explain a model without leaking data.", topics: ["Train/validation/test splits and leakage", "Linear and logistic regression, trees and ensembles", "Metrics: precision, recall, ROC and calibration", "Feature engineering and cross-validation", "Model explanation and error analysis"], project: "Predict a real outcome (churn, price or demand) with a baseline, an improved model and an error analysis." },
      { title: "Pipelines and MLOps basics", weeks: 3, outcome: "Run data and models reliably on a schedule.", topics: ["Orchestration concepts and scheduling", "Data warehousing and transformations", "Data quality checks and alerts", "Model packaging, serving and versioning", "Monitoring drift and performance"], project: "Build a daily pipeline that loads, transforms and tests data, then serves a model prediction through an API." },
    ],
    portfolio: [
      { name: "An end-to-end analysis", brief: "A question, data, method, result and recommendation.", acceptance: ["A clear business question in the first paragraph", "Reproducible code and a data dictionary", "Charts that answer the question, not decorate it", "A limitations section"] },
      { name: "A deployed model or pipeline", brief: "Show you can ship, not just train.", acceptance: ["Scheduled or on-demand run with logs", "Tests on data quality", "A README with metrics and a monitoring plan"] },
    ],
    readyWhen: ["You can answer an ambiguous business question with SQL and a clear written recommendation.", "You explain your model's weaknesses before the interviewer finds them.", "You have two projects with reproducible code and a story each."],
    mistakes: ["Jumping to deep learning before mastering SQL and statistics.", "Leaking test data into training.", "Presenting charts without a recommendation."],
  },
  {
    familyId: "cloud-infrastructure",
    title: "Cloud, DevOps and SRE path",
    pitch: "You need to understand how software is built and shipped, then own the platform it runs on. Take the backend and delivery phases seriously, then go deep on Linux, containers, infrastructure as code and observability.",
    dayInTheLife: [
      "Review a pipeline failure, find the root cause and fix the automation.",
      "Change infrastructure through code review, not clicks in a console.",
      "Respond to an alert, mitigate first, then write a blameless post-incident review.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "core", "phase-06": "core", "phase-07": "light", "phase-08": "light", "phase-09": "light", "phase-10": "core", "phase-11": "light", "phase-14": "core", "phase-16": "core", "phase-17": "core", "phase-18": "light", "phase-19": "core" }),
    addOns: [
      { title: "Linux and networking", weeks: 3, outcome: "Be comfortable debugging a server and a connection.", topics: ["Shell, processes, permissions and systemd", "Logs, disks and resource limits", "TCP, DNS, HTTP and TLS in practice", "Firewalls, ports and troubleshooting with curl, ss and tcpdump", "SSH and secure access"], project: "Provision a small VM, host a service behind a reverse proxy with TLS, and document how you would debug it when it fails." },
      { title: "Containers and orchestration", weeks: 4, outcome: "Package and run services reliably.", topics: ["Docker images, layers and multi-stage builds", "Compose for local environments", "Kubernetes: pods, deployments, services, config and secrets", "Health checks, rollouts and rollbacks", "Resource requests, limits and autoscaling basics"], project: "Containerise a two-service app and deploy it to a local Kubernetes cluster with rolling updates." },
      { title: "Infrastructure as code", weeks: 3, outcome: "Create and change environments repeatably.", topics: ["Declarative infrastructure and state", "Modules, variables and environments", "Remote state and locking", "Policy checks and code review for infrastructure", "Drift detection"], project: "Describe a network, a database and a compute service as code, and create and destroy it from a pipeline." },
      { title: "CI/CD and release engineering", weeks: 2, outcome: "Ship small changes safely and often.", topics: ["Pipeline stages and caching", "Artifact versioning", "Blue-green and canary releases", "Feature flags", "Secrets management in pipelines"], project: "Build a pipeline that tests, builds an image, deploys to staging and promotes to production with a manual gate." },
      { title: "Observability and reliability", weeks: 3, outcome: "See problems before users do and respond calmly.", topics: ["Metrics, logs and traces", "SLIs, SLOs and error budgets", "Alerting that pages for symptoms, not causes", "Runbooks and on-call habits", "Blameless post-incident reviews"], project: "Add dashboards and two SLO-based alerts to your service, then trigger a failure and write the incident review." },
      { title: "Cloud fundamentals and cost", weeks: 3, outcome: "Use a major cloud provider's core services with sound security and cost control.", topics: ["Identity and access management, least privilege", "Compute, storage, networking and managed databases", "Backups and disaster recovery targets", "Cost tagging, budgets and rightsizing", "Shared-responsibility model"], project: "Deploy your project on a cloud provider with least-privilege roles, a budget alert and a tested backup restore." },
    ],
    portfolio: [
      { name: "A production-style platform", brief: "One service, fully automated from commit to monitored deploy.", acceptance: ["Infrastructure defined as code and reviewable", "Pipeline with tests, scans and staged deploys", "Dashboards, alerts and a runbook", "Documented cost per month and how to reduce it"] },
      { name: "A reliability exercise", brief: "Prove you can handle failure.", acceptance: ["A deliberate failure and the timeline of detection and recovery", "A blameless review with three concrete follow-ups", "A restore from backup that you timed"] },
    ],
    readyWhen: ["You can take a service from source code to a monitored, rolled-back-able deployment without clicking in a console.", "You explain what happens from a browser request to the database and back.", "You have handled and documented a failure on purpose."],
    mistakes: ["Learning tools without the problems they solve.", "Using broad permissions to make things work.", "Skipping monitoring until after the first outage."],
  },
  {
    familyId: "cybersecurity",
    title: "Cybersecurity path",
    pitch: "Learn how systems are built before you try to break or defend them. Combine web and backend fundamentals with networking, attacker thinking and defensive operations, and practise legally in labs.",
    dayInTheLife: [
      "Triage alerts, separate noise from real incidents and document your reasoning.",
      "Review code or architecture for security flaws and write up fixes developers can act on.",
      "Harden systems, manage vulnerabilities and rehearse incident response.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-02": "light", "phase-05": "core", "phase-06": "light", "phase-07": "light", "phase-08": "light", "phase-10": "core", "phase-14": "core", "phase-16": "core", "phase-17": "light", "phase-19": "core" }),
    addOns: [
      { title: "Networking and Linux for defenders", weeks: 4, outcome: "Read traffic and system logs fluently.", topics: ["TCP/IP, DNS, HTTP and TLS", "Packet analysis with Wireshark", "Linux permissions, services and logging", "Firewalls, segmentation and VPNs", "Common ports and protocols"], project: "Capture and annotate a login, a DNS lookup and a file download, explaining each packet." },
      { title: "Web application security", weeks: 4, outcome: "Find and fix the vulnerabilities that cause most real breaches.", topics: ["OWASP Top 10 categories", "Authentication, sessions and access-control flaws", "Injection, XSS and CSRF with defences", "Secure file uploads and deserialisation", "Security headers and dependency risk"], project: "Assess an intentionally vulnerable practice app, then write a report with severity, proof and fix for each finding." },
      { title: "Detection and response", weeks: 4, outcome: "Spot attacks and respond methodically.", topics: ["Log sources and SIEM concepts", "Writing and tuning detection rules", "Threat frameworks and attack chains", "Incident response lifecycle", "Evidence handling and timelines"], project: "Build a small log pipeline, write three detections, and run a tabletop incident with a written timeline." },
      { title: "Cloud and identity security", weeks: 3, outcome: "Secure the places where modern breaches begin.", topics: ["Identity, roles and least privilege", "Secrets and key management", "Misconfiguration scanning", "Container and pipeline security", "Logging and audit trails"], project: "Audit a small cloud environment for misconfigurations and remediate them as code." },
      { title: "Risk, compliance and reporting", weeks: 2, outcome: "Explain risk to people who control budgets.", topics: ["Threat modelling", "Risk scoring and prioritisation", "Common frameworks and controls", "Writing clear findings", "Security awareness"], project: "Threat-model one of your own projects and present the top five risks with owners and fixes." },
    ],
    portfolio: [
      { name: "A written assessment", brief: "A professional report on a legal practice target.", acceptance: ["Scope and method stated up front", "Each finding has impact, proof and remediation", "An executive summary a manager can read in two minutes"] },
      { name: "A detection project", brief: "Show defensive skill.", acceptance: ["Documented data sources and detection logic", "False-positive handling", "A timeline from alert to resolution"] },
    ],
    readyWhen: ["You can explain how a request travels across the network and where each control sits.", "You can find and fix the common web vulnerabilities in code.", "You have written up findings in a way developers act on."],
    mistakes: ["Practising on systems you do not have permission to test.", "Collecting tools without understanding protocols.", "Writing reports that list problems without fixes."],
  },
  {
    familyId: "software-quality",
    title: "Quality engineering and test automation path",
    pitch: "Great testers think like users and write like developers. Build solid programming and API skills, then specialise in test strategy, automation and the pipelines that run it.",
    dayInTheLife: [
      "Break down a feature into risks and design tests that catch them early.",
      "Automate regression checks and keep them fast and reliable.",
      "Investigate flaky tests and failed builds, and work with developers on root causes.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-01b": "core", "phase-02": "core", "phase-04": "light", "phase-05": "light", "phase-06": "core", "phase-07": "core", "phase-08": "light", "phase-10": "light", "phase-14": "core", "phase-19": "core" }),
    addOns: [
      { title: "Test design and strategy", weeks: 2, outcome: "Choose the right tests for the right risks.", topics: ["Test pyramid and where each test belongs", "Equivalence classes, boundaries and decision tables", "Exploratory testing charters", "Risk-based prioritisation", "Writing clear bug reports"], project: "Write a test plan for a small app, with prioritised risks, test types and an exploratory session log." },
      { title: "UI test automation", weeks: 3, outcome: "Automate browser tests that stay reliable.", topics: ["Locators that survive change", "Page-object or component patterns", "Waiting and synchronisation without sleeps", "Test data and isolation", "Parallel runs and traces"], project: "Automate the five most important user journeys of a web app and run them in CI." },
      { title: "API and contract testing", weeks: 2, outcome: "Test behaviour below the UI where it is faster and more stable.", topics: ["HTTP methods, status codes and schemas", "Authentication in tests", "Mocking and service virtualisation", "Contract tests between services", "Negative and boundary cases"], project: "Build an API test suite with schema validation and a contract test against a mocked dependency." },
      { title: "Performance and reliability testing", weeks: 2, outcome: "Find limits before users do.", topics: ["Load, stress, soak and spike tests", "Reading latency percentiles", "Baselines and regression thresholds", "Test environments and data", "Bottleneck hunting"], project: "Load-test one endpoint, find the bottleneck and show the improvement with before-and-after graphs." },
      { title: "Quality in the pipeline", weeks: 2, outcome: "Make quality visible and automatic.", topics: ["Fast feedback and test selection", "Quarantining and fixing flaky tests", "Coverage and its limits", "Quality gates and reporting", "Shift-left collaboration with developers"], project: "Set up a pipeline with unit, API and UI stages, a flaky-test report and a quality dashboard." },
    ],
    portfolio: [
      { name: "An automation framework", brief: "A clean, documented suite for a public demo app.", acceptance: ["Readable tests with clear names", "Reports and traces on failure", "Runs in CI in under ten minutes", "A README that explains the structure and how to add a test"] },
      { name: "A bug-hunt report", brief: "Show your thinking, not just your tools.", acceptance: ["Ten reproducible bugs with steps, expected, actual and severity", "Risk analysis of the most important areas", "Suggestions for preventing each class of bug"] },
    ],
    readyWhen: ["You can design a test strategy for a feature and defend what you chose not to test.", "You can write and debug automated tests at UI and API level.", "You can explain why a test is flaky and how you would fix it."],
    mistakes: ["Automating everything through the UI.", "Using fixed sleeps instead of proper waits.", "Reporting bugs without steps and impact."],
  },
  {
    familyId: "systems-hardware",
    title: "Systems, embedded and networking path",
    pitch: "You work close to the machine. Build strong programming and computer-science foundations, then learn operating systems, memory, hardware interfaces and the networks everything depends on.",
    dayInTheLife: [
      "Read a datasheet, write a driver or firmware routine and verify it with instruments.",
      "Debug a timing, memory or protocol issue with logs and a scope or analyser.",
      "Configure and troubleshoot networks, or optimise performance-critical code.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "light", "phase-06": "light", "phase-08": "core", "phase-10": "light", "phase-16": "light", "phase-19": "core" }),
    addOns: [
      { title: "C and memory", weeks: 4, outcome: "Write safe, efficient low-level code.", topics: ["Types, pointers and arrays", "Stack, heap and lifetimes", "Structs, bit manipulation and endianness", "Build systems, headers and linking", "Debugging with gdb and sanitizers"], project: "Implement a small dynamic array and string library with tests and sanitiser runs." },
      { title: "Operating systems and computer architecture", weeks: 4, outcome: "Understand what the machine does when your code runs.", topics: ["Processes, threads and scheduling", "Virtual memory and caches", "Interrupts and system calls", "Concurrency primitives and race conditions", "Instruction sets and pipelines at an overview level"], project: "Write a tiny shell and a multi-threaded producer-consumer program, explaining each synchronisation choice." },
      { title: "Embedded and hardware interfaces", weeks: 4, outcome: "Control real hardware reliably.", topics: ["Microcontroller basics and GPIO", "Timers, interrupts and ADCs", "UART, I2C and SPI", "Real-time constraints and RTOS concepts", "Power, debouncing and noise"], project: "Read a sensor over I2C, filter the data and show it on a display or serial console, with a wiring diagram." },
      { title: "Networking essentials", weeks: 3, outcome: "Design and troubleshoot networks with confidence.", topics: ["OSI and TCP/IP layers", "Addressing, subnetting and routing", "Switching, VLANs and NAT", "DNS, DHCP and common services", "Packet capture and troubleshooting"], project: "Design a small office network with subnets and VLANs, simulate it, and document test results." },
      { title: "IoT and connectivity", weeks: 2, outcome: "Get devices talking securely.", topics: ["MQTT and HTTP for devices", "Provisioning and over-the-air updates", "Device identity and secure boot concepts", "Telemetry and dashboards", "Failure modes in the field"], project: "Send sensor data to a broker and a dashboard, with reconnect logic and a signed update plan." },
    ],
    portfolio: [
      { name: "A hardware or firmware project", brief: "Something you can photograph and demo.", acceptance: ["Schematic or wiring diagram", "Code repository with build instructions", "A short video of it working", "Notes on a bug you diagnosed with instruments"] },
      { name: "A systems programming project", brief: "A tool built close to the OS.", acceptance: ["Clean C with tests and sanitiser output", "A performance measurement before and after an optimisation", "A write-up of concurrency decisions"] },
    ],
    readyWhen: ["You can explain pointers, memory layout and what happens at a system call.", "You have a working hardware or low-level project with documented debugging.", "You can subnet an address range and trace a failing connection layer by layer."],
    mistakes: ["Skipping the datasheet and guessing register values.", "Ignoring concurrency bugs until they appear in the field.", "Treating networking as memorised commands instead of layers."],
  },
  {
    familyId: "database-architecture",
    title: "Database and architecture path",
    pitch: "Data outlives code, and architecture decides how painful change will be. Master relational fundamentals, then move up to performance, reliability and system-level trade-offs.",
    dayInTheLife: [
      "Design a schema, review a migration and check its impact on production traffic.",
      "Investigate a slow query with the plan, then fix it safely.",
      "Draw the system on a whiteboard and explain what fails first and why.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "core", "phase-06": "light", "phase-08": "core", "phase-09": "core", "phase-10": "core", "phase-11": "core", "phase-14": "core", "phase-16": "core", "phase-17": "core", "phase-18": "light", "phase-19": "core" }),
    addOns: [
      { title: "Relational design and SQL mastery", weeks: 4, outcome: "Model data correctly and query it with confidence.", topics: ["Normalisation and when to denormalise", "Constraints, keys and integrity", "Joins, subqueries and window functions", "Transactions and isolation levels", "Migrations without downtime"], project: "Design a multi-tenant schema, write the ten hardest reports against it, and plan a zero-downtime migration." },
      { title: "Performance and indexing", weeks: 3, outcome: "Make slow queries fast and know why.", topics: ["Reading query plans", "B-tree and other index types", "Statistics, vacuuming and bloat", "Connection pooling and caching", "Partitioning and archiving"], project: "Take a 10-million-row table with slow queries, fix them with indexes and rewrites, and publish the before-and-after plans." },
      { title: "Reliability: backup, replication and recovery", weeks: 3, outcome: "Keep data safe and the service up.", topics: ["Backups, point-in-time recovery and restore drills", "Replication and failover", "High availability trade-offs", "Monitoring database health", "Capacity planning"], project: "Set up primary and replica databases, simulate failover and document your recovery time." },
      { title: "Distributed systems and architecture", weeks: 4, outcome: "Reason about trade-offs at system level.", topics: ["Consistency, availability and partition behaviour", "Caching, queues and event-driven design", "Sharding and data partitioning", "Idempotency, retries and exactly-once myths", "Observability and failure modes"], project: "Write an architecture decision record for a system of your choice, including two rejected alternatives and failure scenarios." },
      { title: "Non-relational data", weeks: 2, outcome: "Choose the right store for the job.", topics: ["Document, key-value, column and graph stores", "Search indexes", "Time-series data", "Data modelling for access patterns", "Polyglot persistence costs"], project: "Model one domain in a relational and a document store and compare queries, consistency and complexity." },
    ],
    portfolio: [
      { name: "A performance case study", brief: "Evidence you can find and fix real bottlenecks.", acceptance: ["A reproducible slow workload", "Query plans before and after", "A chart of latency improvements", "Notes on trade-offs of each index"] },
      { name: "An architecture dossier", brief: "A clear system design with the reasoning behind it.", acceptance: ["Diagrams at two levels of detail", "Decision records with alternatives", "Failure scenarios and mitigations", "Capacity estimates with assumptions"] },
    ],
    readyWhen: ["You can design a schema and defend every constraint.", "You can read a query plan and explain why it is slow.", "You can describe how your system behaves when a node, a network link or a deployment fails."],
    mistakes: ["Adding indexes without measuring.", "Skipping restore drills for backups.", "Choosing distributed designs before a single database is under strain."],
  },
  {
    familyId: "enterprise-technology",
    title: "Enterprise platform path",
    pitch: "Enterprise roles reward people who understand business processes and can configure and extend a platform safely. Build general development and data skills, then specialise in one platform with real certifications and projects.",
    dayInTheLife: [
      "Translate a business request into configuration, workflow or code on the platform.",
      "Test changes in a sandbox, document them and move them through release environments.",
      "Work with business users on data quality, permissions and integrations.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-01b": "light", "phase-05": "core", "phase-06": "light", "phase-07": "core", "phase-08": "light", "phase-10": "light", "phase-14": "light", "phase-19": "core" }),
    addOns: [
      { title: "Business process and data fundamentals", weeks: 3, outcome: "Speak the language of the business and model its data.", topics: ["Process mapping and requirements", "Master data, transactions and reporting", "SQL for business data", "User roles and approvals", "Change management basics"], project: "Map a purchase-to-pay or lead-to-cash process, identify its data objects and propose three automations." },
      { title: "Choose and learn one platform", weeks: 6, outcome: "Become productive on one platform's tools and terminology.", topics: ["The platform's data model and security model", "Declarative configuration versus code", "Workflow and automation tools", "Integration patterns and APIs", "Release management between environments"], project: "Build an end-to-end solution on a free developer or trial environment: a data model, a workflow, a report and an integration." },
      { title: "Integration and APIs", weeks: 3, outcome: "Connect enterprise systems reliably.", topics: ["REST, SOAP and event integrations", "Authentication and secrets", "Error handling and retries", "Data mapping and transformation", "Monitoring integrations"], project: "Sync records between the platform and an external service, with error logging and a reconciliation report." },
      { title: "Certification and delivery habits", weeks: 3, outcome: "Prove your skill and work like a consultant.", topics: ["Official certification objectives and practice", "Requirement documents and acceptance criteria", "Testing and user acceptance", "Documentation and handover", "Estimation and scope control"], project: "Pass a foundational certification and document one solution as a client handover pack." },
    ],
    portfolio: [
      { name: "A working solution on a developer environment", brief: "A small but complete implementation of a business scenario.", acceptance: ["Screenshots and a short walkthrough video", "Data model and security explained", "Test cases and results", "A handover document"] },
      { name: "An integration project", brief: "Show you can connect systems.", acceptance: ["Sequence diagram", "Error handling and retries", "A reconciliation view"] },
    ],
    readyWhen: ["You can take a business request and turn it into a configured, tested solution.", "You hold or are close to a platform certification.", "You can explain your solution to a non-technical user."],
    mistakes: ["Learning screens without the underlying business process.", "Customising when configuration would do.", "Skipping documentation and testing."],
  },
  {
    familyId: "specialized-technology",
    title: "Specialised technology path (blockchain, games, XR)",
    pitch: "These fields reward strong core programming plus deep craft in one domain. Build solid fundamentals, choose a single specialism, and ship small public projects that people can try.",
    dayInTheLife: [
      "Prototype a mechanic or contract, test it hard and iterate.",
      "Profile performance or gas costs and make careful trade-offs.",
      "Read the specification or engine documentation, then explain it to teammates.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-01b": "light", "phase-02": "light", "phase-05": "light", "phase-06": "light", "phase-08": "core", "phase-14": "light", "phase-19": "core" }),
    addOns: [
      { title: "Core programming for your specialism", weeks: 4, outcome: "Be fluent in the main language and its tooling.", topics: ["Language fundamentals and project structure", "Data structures you use daily in your domain", "Testing and debugging tools", "Version control with large assets or contracts", "Reading documentation efficiently"], project: "Reimplement a classic small program or game rule set with tests, in your chosen domain's language." },
      { title: "Pick one: smart contracts", weeks: 6, outcome: "Write and audit simple contracts safely.", topics: ["Accounts, transactions and gas", "Solidity basics and storage layout", "Common vulnerabilities such as reentrancy and access control", "Testing and local networks", "Front-end integration with wallets"], project: "Build and test an escrow or voting contract with a simple front end and a written self-audit." },
      { title: "Pick one: game development", weeks: 6, outcome: "Ship a small, finished game.", topics: ["Game loop, input and timing", "Scenes, entities and physics basics", "Math for games: vectors and collisions", "Game feel, feedback and level design", "Profiling and packaging"], project: "Finish and publish a small game in two weeks of scope, with a playable build and a postmortem." },
      { title: "Pick one: XR and spatial", weeks: 6, outcome: "Build comfortable, performant spatial experiences.", topics: ["3D transforms and coordinate systems", "Interaction models and comfort", "Performance budgets for headsets and phones", "Spatial audio and UI", "Platform SDK setup and testing"], project: "Build a small interactive scene that runs at a steady frame rate on a target device, with a comfort checklist." },
    ],
    portfolio: [
      { name: "A finished public project", brief: "Something people can try in minutes.", acceptance: ["Playable or testable link", "Clear README with controls or usage", "Notes on a hard problem you solved", "A short demo video"] },
      { name: "A technical deep-dive", brief: "A write-up that shows your depth.", acceptance: ["A measured performance or cost improvement", "Diagrams and code excerpts", "Lessons learned"] },
    ],
    readyWhen: ["You have shipped at least two small projects in your domain.", "You can explain the key constraints of your platform, such as gas, frame budget or comfort.", "You can read the official documentation and build from it."],
    mistakes: ["Starting a huge project and never finishing.", "Copying code without understanding its costs.", "Skipping security or performance until the end."],
  },
];

export function getRolePath(familyId: string | null | undefined): RolePath | null {
  return ROLE_PATHS.find((p) => p.familyId === familyId) ?? null;
}

export function pathId(path: RolePath): string {
  return path.id ?? path.familyId;
}

/** Role-specific paths, written for particular job titles inside a family. */
export const PROFILE_PATHS: RolePath[] = [
  {
    id: "data-analyst",
    familyId: "data-ai",
    profileIds: ["data-ai--data-analyst"],
    include: ["SQL for analysis", "Python and data wrangling", "Statistics you actually use"],
    title: "Data analyst path",
    pitch:
      "For Data Analyst, Business Intelligence Analyst and Product Analyst roles. Your craft is turning messy data into a decision someone acts on: strong SQL, sound statistics, honest charts and a clear written recommendation. This path drops the machine-learning and pipeline detours and adds the spreadsheet, metrics, dashboard and interview skills analysts are hired for.",
    dayInTheLife: [
      "Clarify what decision a stakeholder is trying to make, then define the metric that informs it.",
      "Pull, clean and join data with SQL, check it against a second source and note the caveats.",
      "Build a chart or dashboard and a short written recommendation, then present and defend it.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "core", "phase-08": "light", "phase-10": "core", "phase-12": "light", "phase-19": "core" }),
    addOns: [
      { title: "Spreadsheets that scale", weeks: 2, outcome: "Clean, join and summarise data in a spreadsheet without breaking it.", topics: ["Lookups with XLOOKUP and INDEX/MATCH", "SUMIFS, COUNTIFS and conditional logic", "Pivot tables and calculated fields", "Cleaning text, numbers and dates", "Structuring a model so others can audit it"], project: "Clean a messy export and build a one-page summary with pivots, a chart and a notes sheet." },
      { title: "SQL for analysis", weeks: 3, outcome: "Answer real business questions with confident, correct queries.", topics: ["Joins, aggregation and grouping", "Window functions and ranking", "CTEs and readable query structure", "Cohort, funnel and retention analysis", "Query plans and indexes"], project: "Analyse a public e-commerce dataset: funnel conversion, monthly cohorts, and a written recommendation." },
      { title: "Python and data wrangling", weeks: 3, outcome: "Clean and reshape messy data reproducibly.", topics: ["Python fundamentals, functions and files", "pandas: selection, groupby, merge, reshape", "Missing data and outliers", "Dates, text and categorical handling", "Notebooks versus scripts and reproducibility"], project: "Turn a messy CSV set into a clean dataset with a script and a data-quality report." },
      { title: "Statistics you actually use", weeks: 3, outcome: "Avoid wrong conclusions and explain uncertainty.", topics: ["Distributions, mean, median, variance", "Sampling, bias and confidence intervals", "Hypothesis tests and p-values, correctly interpreted", "A/B test design and pitfalls", "Correlation versus causation"], project: "Design and analyse a simulated A/B test, including sample size and a plain-language conclusion." },
      { title: "Metrics and product analytics", weeks: 3, outcome: "Define metrics that mean something and find what moves them.", topics: ["Metric definitions, trees and guardrails", "Funnels and segmentation", "Simpson's paradox and mix effects", "Retention, engagement and activation", "Instrumentation and event naming"], project: "Write a metric dictionary for a product, with a metric tree, definitions and a funnel analysis." },
      { title: "Visualisation and storytelling", weeks: 2, outcome: "Communicate findings so a manager acts on them.", topics: ["Choosing the right chart", "Dashboard layout and design rules", "Narrative structure: question, evidence, action", "Annotating and highlighting", "Presenting to non-technical audiences"], project: "Build a dashboard with five metrics and a one-page memo that recommends a decision." },
      { title: "BI tools and data modelling", weeks: 2, outcome: "Model data so dashboards are fast, correct and reusable.", topics: ["Facts, dimensions and grain", "Star schemas and surrogate keys", "Measures versus calculated columns", "Row-level security and refresh", "Documenting a semantic layer"], project: "Model a sales dataset as a star schema and build three reports from the same model." },
      { title: "Analyst interviews and case practice", weeks: 2, outcome: "Perform in SQL screens, metric cases and take-home analyses.", topics: ["SQL interview patterns", "Metric investigation cases", "Take-home analysis structure", "Explaining trade-offs aloud", "Questions to ask the hiring team"], project: "Complete three timed SQL screens and two written metric cases, then review your own answers." },
    ],
    portfolio: [
      { name: "A decision-focused analysis", brief: "A real dataset, a clear question and a recommendation a manager could act on.", acceptance: ["The question and decision are stated in the first paragraph", "SQL and code are reproducible, with a data dictionary", "Charts answer the question rather than decorate it", "Limitations and next steps are written down"] },
      { name: "A metric-backed dashboard", brief: "A dashboard built on a documented, quality-checked dataset.", acceptance: ["Each metric has a written definition and owner", "Data-quality checks and refresh time are visible", "Layout reads top to bottom: headline, drivers, detail", "A short note on how to use it and what it cannot tell you"] },
      { name: "A product or business case study", brief: "Investigate why a metric moved and what to do about it.", acceptance: ["Data is validated before conclusions", "The metric is broken down by segment and time", "Hypotheses are tested and ruled out explicitly", "Ends with ranked recommendations and the evidence for each"] },
    ],
    readyWhen: ["You can take an ambiguous question and deliver a correct SQL answer and a written recommendation in a day.", "You can explain, with numbers, why a metric moved and what you ruled out.", "You have two projects with reproducible code and a story each, plus a dashboard people could use."],
    mistakes: ["Presenting charts without a recommendation.", "Trusting a number you have not reconciled against a second source.", "Learning machine learning before SQL, statistics and communication are solid."],
  },
  {
    id: "ai-ml-engineer",
    familyId: "data-ai",
    profileIds: ["data-ai--machine-learning-engineer", "data-ai--ai-engineer", "data-ai--llm-engineer"],
    include: ["Machine learning foundations"],
    title: "AI and ML engineer path",
    pitch:
      "For Machine Learning Engineer, AI Engineer and LLM Engineer roles. You ship models and AI features that work reliably in production. That means software engineering discipline first, solid ML fundamentals, hands-on deep learning, retrieval and LLM application skills, and the serving and monitoring habits that keep them working.",
    dayInTheLife: [
      "Turn a product need into a measurable ML or LLM problem, with a baseline and an evaluation set.",
      "Train, fine-tune or prompt and retrieve, then evaluate honestly against the baseline and failure cases.",
      "Package, serve and monitor the system, and respond when quality or latency drifts.",
    ],
    phaseMap: map("skip", { "phase-01": "core", "phase-05": "core", "phase-06": "core", "phase-07": "light", "phase-08": "core", "phase-10": "core", "phase-11": "light", "phase-12": "core", "phase-14": "light", "phase-16": "light", "phase-17": "light", "phase-19": "core" }),
    addOns: [
      { title: "Python for ML engineering", weeks: 2, outcome: "Write ML code that is reproducible, tested and reviewable.", topics: ["Environments, pinned dependencies and configuration", "Seeds and sources of randomness", "Data and model versioning", "Testing shapes, invariants and metrics", "Notebook-to-package workflow"], project: "Refactor a notebook into a package with a config file, fixed seeds and tests, and show that two runs give the same metrics." },
      { title: "Machine learning foundations", weeks: 4, outcome: "Train, evaluate and explain a model without leaking data.", topics: ["Train/validation/test splits and leakage", "Linear and logistic regression, trees and ensembles", "Metrics: precision, recall, ROC and calibration", "Feature engineering and cross-validation", "Model explanation and error analysis"], project: "Predict a real outcome (churn, price or demand) with a baseline, an improved model and an error analysis." },
      { title: "Deep learning in practice", weeks: 4, outcome: "Train neural networks and debug them when they misbehave.", topics: ["Tensors, losses and gradients", "The training loop: batches, optimiser, evaluation", "Overfitting, regularisation and learning curves", "Debugging: overfit one batch, check shapes and data", "GPUs, mixed precision and experiment tracking"], project: "Train a small network on a public dataset, log learning curves and write down three things you changed and why." },
      { title: "Embeddings and retrieval", weeks: 3, outcome: "Build search and retrieval that finds the right context.", topics: ["What embeddings represent", "Similarity search and vector indexes", "Chunking strategies", "Retrieval evaluation: recall at k", "Hybrid search and re-ranking"], project: "Build semantic search over a document set and measure recall at 5 against hand-labelled questions." },
      { title: "LLM applications", weeks: 4, outcome: "Build LLM features that are reliable, testable and safe.", topics: ["Prompting and structured outputs", "Tool use and function calling", "Evaluation sets and regression tests", "Prompt injection and guardrails", "Cost, latency and caching"], project: "Build a grounded question-answering app with citations, a golden evaluation set and a regression test that runs in CI." },
      { title: "Serving and MLOps", weeks: 3, outcome: "Run models in production and notice when they degrade.", topics: ["Batch versus online inference", "APIs, latency budgets and timeouts", "Model versioning and safe rollout", "Monitoring data drift and quality", "Feedback loops and retraining triggers"], project: "Serve a model behind an API with versioning, a latency dashboard and a drift check that raises an alert." },
      { title: "ML system design and interviews", weeks: 2, outcome: "Design an ML system end to end and explain the trade-offs.", topics: ["Framing the problem and metrics", "Data, labels and feedback", "Model choice and baselines", "Serving, monitoring and iteration", "Common design prompts"], project: "Write a two-page design for a recommendation or fraud system and present it in 20 minutes." },
    ],
    portfolio: [
      { name: "A grounded LLM application", brief: "An AI feature people can use, with evidence it works.", acceptance: ["Answers cite their sources and refuse when context is missing", "A golden evaluation set with documented scores", "A regression test that fails when quality drops", "Cost and latency per request are measured and reported"] },
      { name: "A trained and served model", brief: "Show the whole loop from data to a monitored endpoint.", acceptance: ["A baseline and an improved model, compared honestly", "Reproducible training from a config and fixed seeds", "An API with versioning and a latency budget", "A drift or quality check with an alert"] },
      { name: "An error analysis write-up", brief: "Show you understand where and why your system fails.", acceptance: ["Failures grouped into categories with counts", "Examples of each category", "A prioritised list of fixes with expected impact", "Evidence that one fix actually helped"] },
    ],
    readyWhen: ["You can build, evaluate and serve a model or LLM feature from scratch, with tests and a baseline.", "You can explain how your system fails, how you would detect it and what you would do.", "You have two deployed projects with evaluation numbers and error analysis."],
    mistakes: ["Calling an API without building an evaluation set.", "Chasing model complexity before a strong baseline and clean data.", "Shipping with no monitoring for drift, cost or quality."],
  },
];

export const ALL_PATHS: RolePath[] = [...ROLE_PATHS, ...PROFILE_PATHS];

/** The most specific path for a job title: a role-specific path if one exists, else the family path. */
export function getRolePathForProfile(profileId: string | null | undefined, familyId: string | null | undefined): RolePath | null {
  return PROFILE_PATHS.find((p) => profileId && p.profileIds?.includes(profileId)) ?? getRolePath(familyId);
}

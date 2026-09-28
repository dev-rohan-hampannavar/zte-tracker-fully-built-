import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "data/career-role-list.json"), "utf8"));

const familyDescriptions = {
  "software-development": "Build user-facing websites, APIs, backend services, and general-purpose software across established programming ecosystems.",
  "mobile-development": "Create native and cross-platform applications, including interaction design, device integration, testing, and app releases.",
  "data-ai": "Turn data into decisions and production models, including analytics, data platforms, machine learning, and generative AI applications.",
  "cloud-infrastructure": "Provision and operate cloud platforms and distributed systems with a focus on reliability, security, automation, and cost.",
  cybersecurity: "Identify and reduce security risk through secure engineering, cloud controls, vulnerability analysis, and incident response.",
  "software-quality": "Build confidence in software through risk-based test strategy, exploratory testing, automation, and quality engineering.",
  "systems-hardware": "Develop and integrate software that runs close to devices, networks, operating systems, and hardware constraints.",
  "database-architecture": "Design and operate data stores, distributed services, and software architectures around reliability and quality attributes.",
  "enterprise-technology": "Customize and integrate business platforms so enterprise workflows remain secure, maintainable, and governed.",
  "specialized-technology": "Build products in specialized domains such as blockchain, games, and extended reality, with strong platform and performance skills.",
};

const prerequisitesByFamily = {
  "Software Development": ["Basic programming and command-line use", "Git fundamentals and basic HTTP concepts"],
  "Mobile Development": ["Programming fundamentals in a target mobile language", "Git and HTTP basics"],
  "Data / AI": ["SQL or spreadsheet fundamentals", "Basic probability and statistics"],
  "Cloud / Infrastructure": ["Linux command-line fundamentals", "Networking basics and Git"],
  Cybersecurity: ["Networking and Linux fundamentals", "Basic web, operating-system, or cloud concepts"],
  "Software Quality": ["Understanding of a web or API product workflow", "Basic test-case and defect writing"],
  "Systems / Hardware": ["C programming fundamentals", "Digital logic and basic electronics"],
  "Database / Architecture": ["SQL fundamentals", "Basic data modeling and application architecture"],
  "Enterprise Technology": ["Basic relational data and workflow modeling", "Platform and integration fundamentals"],
  "Specialized Technology": ["Programming fundamentals", "Mathematics or platform basics relevant to the specialization"],
};

// Shared profile content is deliberately attached to specialization groups, not copied
// as 118 mostly-identical career tracks. Each title still keeps its own curriculum status.
const profileContent = {
  "frontend-developer": ["Accessible semantic HTML", "CSS layout and responsive design", "JavaScript and TypeScript", "Component architecture and state", "Browser performance and testing", "HTTP and web security"],
  "backend-developer": ["HTTP APIs and service boundaries", "Relational data modeling", "Authentication and authorization", "Caching and background work", "Observability and deployment", "API testing and versioning"],
  "full-stack-developer": ["End-to-end feature delivery", "Accessible responsive UI", "API and service design", "Relational persistence", "Authentication and authorization", "Production testing and deployment"],
  "java-developer": ["Java language and JVM fundamentals", "Object-oriented design and collections", "Spring Boot services", "SQL and persistence", "Testing and observability", "Concurrency and performance"],
  "python-developer": ["Python language and packaging", "Typed application design", "Web framework fundamentals", "SQL and data access", "Testing and deployment", "Concurrency and performance"],
  "net-developer": ["C# and .NET runtime", "ASP.NET Core APIs", "Entity Framework and SQL", "Identity and authorization", "Testing and observability", "Cloud deployment"],
  "go-developer": ["Go language and tooling", "HTTP services and middleware", "Concurrency with goroutines", "SQL and data access", "Testing and profiling", "Containerized deployment"],
  "rust-developer": ["Ownership and borrowing", "Error handling and traits", "Systems interfaces and memory", "Async Rust where appropriate", "Testing, benchmarks and tooling", "Safe interoperability"],
  "php-developer": ["Modern PHP and Composer", "HTTP request lifecycle", "SQL and persistence", "Authentication and validation", "Testing and deployment", "Security and performance"],
  "ruby-developer": ["Ruby language and object model", "Rails conventions and routing", "Active Record and SQL", "Background jobs and caching", "RSpec and system testing", "Production operations"],
  "android-developer": ["Kotlin and Android SDK", "Jetpack Compose or Views", "Lifecycle and navigation", "Local persistence and networking", "Accessibility and testing", "Play release basics"],
  "ios-developer": ["Swift and SwiftUI", "UIKit interoperability", "Concurrency and app lifecycle", "Persistence and networking", "Accessibility and XCTest", "App Store release basics"],
  "flutter-developer": ["Dart and Flutter widgets", "State management and navigation", "Platform channels and plugins", "Offline data and API integration", "Responsive accessibility and testing", "Store builds and release"],
  "data-analyst": ["SQL querying and data quality", "Descriptive statistics", "Metric definitions and experimentation", "Dashboard design", "Data storytelling", "Privacy-aware analysis"],
  "data-engineer": ["SQL and data modeling", "Batch and incremental pipelines", "Orchestration and retries", "Warehouse and lake concepts", "Data quality and lineage", "Cost and reliability operations"],
  "data-scientist": ["Probability and statistical inference", "Exploratory analysis", "Feature engineering", "Model evaluation and validation", "Experiment design", "Clear analytical communication"],
  "machine-learning-engineer": ["Supervised learning and evaluation", "Feature and data pipelines", "Model serving", "Monitoring and drift", "Reproducible experiments", "Latency and cost trade-offs"],
  "ai-engineer": ["Model selection and evaluation", "Retrieval and grounding", "Tool and workflow orchestration", "Safety and access controls", "Latency and cost measurement", "Production monitoring"],
  "llm-engineer": ["Prompt and structured output design", "Embeddings and retrieval", "RAG evaluation", "Tool calling and orchestration", "Guardrails and red-team tests", "Serving cost and latency"],
  "mlops-engineer": ["Model packaging and reproducibility", "Feature and model registries", "Training and deployment pipelines", "Serving observability", "Drift and rollback", "Compute governance"],
  "devops-engineer": ["Linux and networking foundations", "Infrastructure as code", "CI/CD and release safety", "Containers and orchestration", "Monitoring and incident response", "Secrets and least privilege"],
  "cloud-engineer": ["Cloud networking and identity", "Compute and storage primitives", "Infrastructure as code", "Resilience and backup", "Cost controls and observability", "Secure deployment"],
  "sre": ["SLIs, SLOs and error budgets", "Linux, networking and distributed systems", "Incident command and postmortems", "Capacity and performance", "Automation and toil reduction", "Resilience testing"],
  "platform-engineer": ["Kubernetes and container platforms", "Internal developer platforms", "Infrastructure as code", "Golden paths and templates", "Platform security and tenancy", "Developer experience metrics"],
  "cloud-architect": ["Cloud reference architectures", "Identity and network design", "Resilience and disaster recovery", "Security and compliance boundaries", "FinOps and service selection", "Architecture decision records"],
  "infrastructure-engineer": ["Linux and network operations", "Configuration management", "Virtualization and containers", "Infrastructure automation", "Monitoring and recovery", "Change and access control"],
  "cybersecurity-analyst": ["Threat modeling and risk", "Security control fundamentals", "Vulnerability triage", "Identity and endpoint protection", "Incident handling", "Clear evidence and reporting"],
  "application-security-engineer": ["Secure design and threat modeling", "Web and API vulnerability classes", "SAST, DAST and dependency analysis", "Secure code review", "Developer security workflows", "Risk-based remediation"],
  "cloud-security-engineer": ["Cloud IAM and policy", "Network segmentation", "Workload and data protection", "Configuration posture management", "Detection and incident response", "Compliance evidence"],
  "soc-analyst": ["Log sources and SIEM queries", "Alert triage and enrichment", "Endpoint and network indicators", "Incident escalation", "Detection tuning", "Evidence handling and reporting"],
  "qa-engineer": ["Test strategy and risk", "Requirements and acceptance criteria", "Exploratory testing", "Defect isolation and reporting", "API and integration testing", "Release quality signals"],
  "test-automation-engineer": ["Test pyramid and scope", "Browser and API automation", "Stable fixtures and test data", "CI execution and reporting", "Flake diagnosis", "Coverage tied to product risk"],
  "software-development-engineer-in-test": ["Programming for testability", "Automation framework design", "API, UI and contract testing", "CI and test observability", "Reliability and flake reduction", "Quality architecture"],
  "embedded-engineer": ["C/C++ and memory constraints", "Microcontroller peripherals", "RTOS and concurrency", "Hardware interfaces", "Debugging and test rigs", "Power and timing budgets"],
  "firmware-engineer": ["C/C++ and toolchains", "Bootloaders and device lifecycle", "Drivers and peripheral control", "RTOS scheduling", "Hardware debugging", "Secure update and recovery"],
  "iot-engineer": ["Device connectivity and protocols", "Embedded and cloud boundaries", "Provisioning and identity", "Telemetry and fleet operations", "Offline and failure handling", "Device security"],
  "systems-engineer": ["Requirements and interfaces", "System decomposition", "Reliability and fault analysis", "Integration and verification", "Operational constraints", "Technical documentation"],
  "c-cpp-developer": ["Modern C/C++ and build systems", "Memory and resource management", "Concurrency and synchronization", "Debugging and profiling", "API and ABI boundaries", "Testing and static analysis"],
  "network-engineer": ["TCP/IP and subnetting", "Routing and switching", "DNS, DHCP and TLS", "Network monitoring", "Firewall and segmentation", "Troubleshooting and change control"],
  "database-engineer": ["Relational modeling and SQL", "Indexing and query plans", "Transactions and concurrency", "Replication and partitioning", "Backup and recovery", "Data access security"],
  "database-administrator": ["Database installation and configuration", "Backup and point-in-time recovery", "Performance and capacity", "Access control and auditing", "Replication and failover", "Upgrade and incident procedures"],
  "software-architect": ["Quality attributes and trade-offs", "Service and component boundaries", "API and data design", "Security and resilience", "Architecture decisions", "Migration and technical governance"],
  "distributed-systems-engineer": ["Consistency and failure models", "Partitioning and replication", "Messaging and idempotency", "Consensus concepts", "Observability and recovery", "Load and fault testing"],
  "solutions-architect": ["Stakeholder discovery", "Capability and integration mapping", "Solution options and trade-offs", "Security and non-functional requirements", "Delivery sequencing", "Architecture communication"],
  "sap-technical-developer": ["SAP architecture and transport flow", "ABAP development fundamentals", "Data models and APIs", "Extension and integration patterns", "Testing and authorization", "Business process discovery"],
  "salesforce-developer": ["Salesforce data model and security", "Apex and Lightning", "Flows and declarative automation", "SOQL and integrations", "Testing and deployment", "Governor limits"],
  "servicenow-developer": ["ServiceNow platform data model", "Business rules and scripting", "Flow Designer and integrations", "Access controls", "Update sets and testing", "Service process mapping"],
  "power-platform-developer": ["Power Apps canvas and model-driven apps", "Dataverse data and security", "Power Automate flows", "Connectors and integration", "ALM and environment strategy", "Usability and governance"],
  "blockchain-developer": ["Distributed ledger fundamentals", "Wallets and transaction lifecycle", "Contract and protocol integration", "Threat modeling", "Testnets and observability", "Key management and incident response"],
  "game-developer": ["Engine and gameplay loop", "Input, physics and animation", "Asset and scene pipelines", "Performance profiling", "Save and progression systems", "Playtesting and release"],
  "xr-developer": ["3D interaction and spatial UI", "Tracking and input", "Performance and comfort", "Scene and asset pipelines", "Device testing", "Privacy and safety"],
};

const profileDetails = {
  "frontend-developer": ["React", "TypeScript", "HTML", "CSS", "Next.js", "Playwright"],
  "backend-developer": ["Node.js", "REST", "PostgreSQL", "SQL", "Redis", "Docker"],
  "full-stack-developer": ["TypeScript", "React", "Node.js", "REST", "PostgreSQL", "Docker"],
  "java-developer": ["Java", "Spring Boot", "SQL", "PostgreSQL", "JUnit", "Docker"],
  "python-developer": ["Python", "FastAPI", "Django", "SQL", "PostgreSQL", "Pytest"],
  "net-developer": ["C#", ".NET", "ASP.NET Core", "SQL Server", "xUnit", "Docker"],
  "go-developer": ["Go", "HTTP", "PostgreSQL", "Docker", "Kubernetes", "OpenTelemetry"],
  "rust-developer": ["Rust", "Cargo", "Linux", "C", "WebAssembly", "Criterion"],
  "php-developer": ["PHP", "Composer", "Laravel", "MySQL", "PHPUnit", "Docker"],
  "ruby-developer": ["Ruby", "Rails", "PostgreSQL", "Redis", "RSpec", "Sidekiq"],
  "android-developer": ["Kotlin", "Android", "Jetpack Compose", "Room", "JUnit", "Gradle"],
  "ios-developer": ["Swift", "SwiftUI", "UIKit", "XCTest", "Core Data", "Xcode"],
  "flutter-developer": ["Dart", "Flutter", "Firebase", "REST", "Riverpod", "Integration Test"],
  "data-analyst": ["SQL", "Python", "Excel", "Power BI", "Tableau", "Statistics"],
  "data-engineer": ["SQL", "Python", "Airflow", "Spark", "dbt", "Snowflake"],
  "data-scientist": ["Python", "pandas", "scikit-learn", "Statistics", "Jupyter", "SQL"],
  "machine-learning-engineer": ["Python", "PyTorch", "scikit-learn", "FastAPI", "Docker", "MLflow"],
  "ai-engineer": ["Python", "REST", "Embeddings", "Vector databases", "Evaluation", "Docker"],
  "llm-engineer": ["Python", "LLM APIs", "Embeddings", "Vector databases", "RAG", "Evaluation"],
  "mlops-engineer": ["Python", "Docker", "Kubernetes", "MLflow", "Airflow", "Prometheus"],
  "devops-engineer": ["Linux", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Prometheus"],
  "cloud-engineer": ["AWS", "Azure", "Terraform", "Linux", "Docker", "IAM"],
  "sre": ["Linux", "Kubernetes", "Prometheus", "Grafana", "OpenTelemetry", "Terraform"],
  "platform-engineer": ["Kubernetes", "Terraform", "Helm", "Backstage", "Argo CD", "OPA"],
  "cloud-architect": ["AWS", "Azure", "Networking", "IAM", "Terraform", "FinOps"],
  "infrastructure-engineer": ["Linux", "Ansible", "Terraform", "VMware", "Networking", "Prometheus"],
  "cybersecurity-analyst": ["Linux", "OWASP", "NIST CSF", "SIEM", "Wireshark", "MITRE ATT&CK"],
  "application-security-engineer": ["OWASP", "Burp Suite", "SAST", "DAST", "Threat modeling", "CI/CD"],
  "cloud-security-engineer": ["AWS", "Azure", "IAM", "CloudTrail", "Kubernetes", "CIS Benchmarks"],
  "soc-analyst": ["SIEM", "Splunk", "Microsoft Sentinel", "Wireshark", "MITRE ATT&CK", "EDR"],
  "qa-engineer": ["Test design", "Postman", "SQL", "Jira", "Browser DevTools", "CI/CD"],
  "test-automation-engineer": ["Playwright", "Selenium", "Cypress", "Postman", "TypeScript", "CI/CD"],
  "software-development-engineer-in-test": ["TypeScript", "Playwright", "API testing", "JUnit", "CI/CD", "Docker"],
  "embedded-engineer": ["C", "C++", "Embedded Linux", "FreeRTOS", "JTAG", "I2C"],
  "firmware-engineer": ["C", "C++", "FreeRTOS", "ARM", "JTAG", "UART"],
  "iot-engineer": ["C", "MQTT", "AWS IoT", "Linux", "TLS", "Prometheus"],
  "systems-engineer": ["Linux", "Networking", "Python", "Requirements", "SysML", "Docker"],
  "c-cpp-developer": ["C", "C++", "CMake", "Linux", "GDB", "Valgrind"],
  "network-engineer": ["TCP/IP", "Cisco IOS", "DNS", "BGP", "Wireshark", "Firewalls"],
  "database-engineer": ["PostgreSQL", "SQL", "Redis", "Kafka", "Debezium", "pg_stat_statements"],
  "database-administrator": ["PostgreSQL", "SQL Server", "SQL", "Backup and recovery", "Replication", "Monitoring"],
  "software-architect": ["C4 model", "UML", "REST", "PostgreSQL", "Docker", "Architecture decisions"],
  "distributed-systems-engineer": ["Kafka", "PostgreSQL", "Redis", "Kubernetes", "gRPC", "OpenTelemetry"],
  "solutions-architect": ["C4 model", "AWS", "Azure", "REST", "IAM", "Architecture decisions"],
  "sap-technical-developer": ["SAP ABAP", "SAP HANA", "OData", "SAP Fiori", "Git", "SAP BTP"],
  "salesforce-developer": ["Apex", "SOQL", "LWC", "Salesforce Flow", "Salesforce CLI", "REST"],
  "servicenow-developer": ["ServiceNow", "JavaScript", "Flow Designer", "REST", "ATF", "CMDB"],
  "power-platform-developer": ["Power Apps", "Power Automate", "Dataverse", "Power BI", "Connectors", "ALM"],
  "blockchain-developer": ["Solidity", "Ethereum", "Foundry", "Hardhat", "OpenZeppelin", "Ethers.js"],
  "game-developer": ["Unity", "Unreal Engine", "C#", "C++", "Blender", "Git LFS"],
  "xr-developer": ["Unity", "Unreal Engine", "OpenXR", "C#", "Blender", "Spatial UI"],
};

const projects = {
  "frontend-developer": ["Build an accessible, responsive product interface with forms, routing, and measured performance.", "Add component tests and a browser test for a critical user journey."],
  "backend-developer": ["Design and deploy a versioned API with authentication, relational persistence, and validation.", "Add rate limits, structured logs, health checks, and integration tests."],
  "full-stack-developer": ["Ship a full-stack workflow with role-aware access, persistence, and a responsive UI.", "Deploy it with automated tests, monitoring, and a concise architecture note."],
  "java-developer": ["Build a Spring Boot service with transactional persistence and API documentation.", "Add unit and integration tests, metrics, and a container image."],
  "python-developer": ["Build a typed Python API with migrations, validation, and background work.", "Publish test results, operational notes, and a reproducible deployment."],
  "net-developer": ["Build an ASP.NET Core service with identity, persistence, and API versioning.", "Automate tests and deployment, and document security boundaries."],
  "go-developer": ["Build a concurrent Go service with clear shutdown and bounded resource use.", "Add benchmarks, tracing, containerization, and failure tests."],
  "rust-developer": ["Implement a safe systems utility with a documented error model and CLI.", "Benchmark it, test edge cases, and explain ownership and API choices."],
  "php-developer": ["Build a validated Laravel workflow backed by relational data and queues.", "Add authorization tests, deployment automation, and performance evidence."],
  "ruby-developer": ["Deliver a Rails workflow with background processing and clear domain models.", "Add request/system tests and document production operations."],
  "android-developer": ["Build an Android app with offline-aware state and accessible navigation.", "Add UI tests and a release-ready build with crash-handling notes."],
  "ios-developer": ["Build an iOS app with async data loading and resilient local state.", "Add XCTest coverage and document accessibility and privacy choices."],
  "flutter-developer": ["Build a cross-platform app with shared navigation and local persistence.", "Test critical flows on two platforms and document platform-specific behavior."],
  "data-analyst": ["Create a metric-backed dashboard from a documented, quality-checked dataset.", "Write an analysis that explains assumptions, caveats, and a decision."],
  "data-engineer": ["Build an incremental pipeline with idempotent loads and data quality checks.", "Orchestrate retries and publish lineage, freshness, and cost metrics."],
  "data-scientist": ["Run a reproducible analysis with a leakage-safe validation design.", "Compare a baseline and candidate model and communicate uncertainty."],
  "machine-learning-engineer": ["Serve a versioned model behind an API with reproducible artifacts.", "Measure quality, latency, drift, and rollback behavior."],
  "ai-engineer": ["Deliver a grounded AI workflow with retrieval, tools, and access controls.", "Evaluate task success, unsafe outputs, latency, and cost against a fixed set."],
  "llm-engineer": ["Build a retrieval-augmented assistant with citations and explicit fallback behavior.", "Create an evaluation set for grounding, refusal, latency, and cost."],
  "mlops-engineer": ["Automate model training, approval, deployment, and rollback.", "Expose model/data lineage, serving health, and drift signals."],
  "devops-engineer": ["Provision an application stack as code with a repeatable deployment pipeline.", "Demonstrate rollback, secret handling, monitoring, and recovery."],
  "cloud-engineer": ["Deploy a multi-service workload with least-privilege identity and private networking.", "Show backup recovery, budget alerts, and resilience trade-offs."],
  "sre": ["Define SLOs for a service and build dashboards and alerts from user impact.", "Run a failure exercise and publish an actionable postmortem."],
  "platform-engineer": ["Create a paved deployment path with templates and policy checks.", "Measure developer task time and document tenancy and upgrade strategy."],
  "cloud-architect": ["Produce a cloud architecture for a workload with quantified availability and cost goals.", "Include threat boundaries, recovery design, and recorded decisions."],
  "infrastructure-engineer": ["Automate a repeatable host or cluster build with configuration checks.", "Demonstrate patching, monitoring, recovery, and controlled change."],
  "cybersecurity-analyst": ["Triage a realistic vulnerability set and prioritize fixes by evidence and impact.", "Write a concise incident or risk report with reproducible findings."],
  "application-security-engineer": ["Threat-model a web application and add security checks to its delivery pipeline.", "Reproduce, fix, and retest a vulnerability with regression coverage."],
  "cloud-security-engineer": ["Harden a cloud workload using least privilege and policy-as-code.", "Demonstrate detection, evidence collection, and a safe incident response."],
  "soc-analyst": ["Investigate a simulated alert using correlated endpoint and network evidence.", "Write a timeline, confidence statement, escalation, and detection improvement."],
  "qa-engineer": ["Create a risk-based test plan for a realistic feature and execute exploratory sessions.", "Report defects with reliable reproduction and release-quality evidence."],
  "test-automation-engineer": ["Automate a critical browser and API journey with stable test data.", "Run it in CI and explain coverage, flake handling, and failure diagnosis."],
  "software-development-engineer-in-test": ["Build a maintainable test harness for a service and its UI.", "Add contract tests and CI diagnostics that isolate failures quickly."],
  "embedded-engineer": ["Implement a sensor-to-control prototype with timing and resource constraints.", "Test faults and hardware interfaces using a repeatable rig."],
  "firmware-engineer": ["Build a firmware feature with boot, update, and recovery behavior.", "Capture timing and memory budgets plus hardware test evidence."],
  "iot-engineer": ["Connect a device fleet through authenticated messaging with offline buffering.", "Demonstrate provisioning, telemetry, and revocation for a device."],
  "systems-engineer": ["Translate stakeholder needs into verifiable requirements and interface contracts.", "Run an integration verification plan and record risks and traceability."],
  "c-cpp-developer": ["Implement a resource-safe C/C++ component with a stable interface.", "Use sanitizers, profiling, and tests to show memory and performance behavior."],
  "network-engineer": ["Design and simulate a segmented network with routing and failure recovery.", "Include an addressing plan, monitoring, and verified troubleshooting runbook."],
  "database-engineer": ["Model a transactional workload and tune its slow queries using measured plans.", "Demonstrate migration safety, replication, and recovery."],
  "database-administrator": ["Build a database operations runbook for backup, restore, upgrades, and failover.", "Present measured performance and access-audit evidence."],
  "software-architect": ["Write a system design with quality attributes, boundaries, and migration stages.", "Validate key assumptions with a small technical spike and ADRs."],
  "distributed-systems-engineer": ["Build an idempotent event workflow that tolerates retries and partial failure.", "Demonstrate ordering, recovery, and observability under injected faults."],
  "solutions-architect": ["Translate a business workflow into an integration architecture with options and costs.", "Present security, migration, and operational decisions to mixed stakeholders."],
  "sap-technical-developer": ["Extend an SAP business process with a documented API or application change.", "Show transport, authorization, and test evidence in a non-production environment."],
  "salesforce-developer": ["Build a Salesforce workflow with secure data access and a tested integration.", "Document governor-limit handling and a repeatable deployment."],
  "servicenow-developer": ["Automate a service workflow with scoped access and traceable state transitions.", "Add ATF coverage and a documented update-set release."],
  "power-platform-developer": ["Deliver a governed Power Platform app and automated approval flow.", "Show environment promotion, connector permissions, and user acceptance evidence."],
  "blockchain-developer": ["Build and test a contract workflow on a local chain or testnet.", "Include adversarial tests, access assumptions, and key-handling guidance."],
  "game-developer": ["Build a playable vertical slice with input, feedback, and a measurable performance budget.", "Collect playtest feedback and document build/release steps."],
  "xr-developer": ["Build an XR interaction that works across target devices and comfort constraints.", "Measure frame timing and test accessibility and safety considerations."],
};

const interview = {
  "Software Development": ["Language and runtime fundamentals", "Data structures and practical problem solving", "API and data modeling", "Testing and debugging", "Code review and trade-offs"],
  "Mobile Development": ["Platform lifecycle and architecture", "State, persistence, and networking", "UI accessibility", "Testing and release", "Performance and privacy trade-offs"],
  "Data / AI": ["SQL or Python reasoning", "Statistics and evaluation design", "Data quality and leakage", "Production constraints", "Communicating uncertainty"],
  "Cloud / Infrastructure": ["Linux and networking troubleshooting", "Infrastructure and deployment design", "Reliability and incident response", "Security and identity", "Cost and operational trade-offs"],
  Cybersecurity: ["Threat and vulnerability analysis", "Evidence-based investigation", "Secure design and controls", "Incident response", "Risk communication"],
  "Software Quality": ["Risk-based test planning", "Automation design", "Defect isolation", "CI reliability", "Quality trade-offs"],
  "Systems / Hardware": ["C/C++ and resource constraints", "Hardware/software interfaces", "Debugging and measurement", "Reliability and safety", "System integration"],
  "Database / Architecture": ["Data and service boundaries", "Performance and scaling", "Failure and recovery design", "Consistency trade-offs", "Architecture communication"],
  "Enterprise Technology": ["Platform data and access model", "Workflow and integration design", "Testing and release management", "Governance and limits", "Business process discovery"],
  "Specialized Technology": ["Core platform/tool fundamentals", "System decomposition", "Testing and performance", "Security and operational risks", "Project decisions and iteration"],
};

const toolsForFamily = {
  "Software Development": ["Git", "HTTP", "SQL", "Docker", "Unit and integration testing"],
  "Mobile Development": ["Git", "Platform IDE", "REST", "Local persistence", "UI testing"],
  "Data / AI": ["SQL", "Python", "Jupyter", "Git", "Experiment tracking"],
  "Cloud / Infrastructure": ["Linux", "Git", "Infrastructure as code", "Containers", "Monitoring"],
  Cybersecurity: ["Linux", "Git", "Threat modeling", "Vulnerability analysis", "Incident documentation"],
  "Software Quality": ["Git", "Issue tracking", "API testing", "Browser automation", "CI"],
  "Systems / Hardware": ["Git", "C/C++ toolchain", "Debugger", "Hardware test tools", "CI"],
  "Database / Architecture": ["SQL", "Git", "Architecture diagrams", "Containers", "Observability"],
  "Enterprise Technology": ["Platform development tools", "Git", "API integration", "Automated testing", "Release management"],
  "Specialized Technology": ["Git", "Platform SDK", "Automated testing", "Profiling", "Release tooling"],
};

const covered = new Map([
  ["frontend-developer", "zte-frontend-v1"], ["react-developer", "zte-frontend-v1"],
  ["full-stack-developer", "zte-fullstack-v1"], ["full-stack-engineer", "zte-fullstack-v1"], ["software-engineer", "zte-fullstack-v1"],
  ["java-developer", "zte-backend-java-v1"], ["java-backend-engineer", "zte-backend-java-v1"], ["spring-boot-developer", "zte-backend-java-v1"],
]);
const dsa = (family) => family === "Data / AI" || family === "Cybersecurity" || family === "Software Quality" ? "basic-to-intermediate" : family === "Cloud / Infrastructure" || family === "Database / Architecture" ? "intermediate" : "foundational";
const design = (family) => family === "Cloud / Infrastructure" || family === "Database / Architecture" ? "applied" : ["Enterprise Technology", "Specialized Technology", "Systems / Hardware"].includes(family) ? "domain-specific" : "foundational";

const groups = source.specializationGroups.map((group) => {
  const key = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const skills = profileContent[key];
  if (!skills) throw new Error(`Missing curated skill profile: ${key}`);
  const family = source.families.find((item) => item.id === group.family_id);
  return {
    id: group.id,
    family_id: group.family_id,
    name: group.name,
    summary: `${group.name} work centers on ${skills.slice(0, 3).join(", ").toLowerCase()} and shipping reliable solutions in ${family.name.toLowerCase()}. Related titles share this profile; the title itself does not imply identical tools at every employer.`,
    prerequisites: prerequisitesByFamily[family.name],
    core_skills: skills,
    tool_stack: [...new Set([...(profileDetails[key] ?? []), ...toolsForFamily[family.name]])],
    project_blueprints: projects[key],
    interview_focus: interview[family.name],
    dsa_expectation: dsa(family.name),
    system_design_expectation: design(family.name),
    portfolio_evidence: ["A runnable project with setup instructions and a clear problem statement", "Tests or validation evidence tied to important requirements", "A short decision note that explains one meaningful trade-off"],
    roadmap_id: null,
    curriculum_status: "core_curriculum",
    coverage_notes: "Curriculum coverage is set per exact job title below. Related titles share this role profile, but a track mapped to one title does not imply that every sibling title has a matching specialist curriculum.",
  };
});

const roles = source.roles.map((role) => ({
  ...role,
  roadmap_id: covered.get(role.id) ?? null,
  curriculum_status: covered.has(role.id) ? "mapped_to_detailed_track" : "core_curriculum",
  role_focus: role.title === "React Developer" ? "React component systems, TypeScript, and server-rendered web applications." : role.title === "Java Backend Engineer" || role.title === "Spring Boot Developer" ? "Java service design with Spring Boot, persistence, and production operations." : role.title === "Software Engineer" ? "Broad software engineering foundations; the shared full-stack track is a starting curriculum, not a title-specific syllabus." : null,
}));

if (source.families.length !== 10 || groups.length !== 50 || roles.length !== 118) throw new Error(`Unexpected catalog counts: ${source.families.length}/${groups.length}/${roles.length}`);
if (new Set(roles.map((role) => role.target_role_id)).size !== roles.length) throw new Error("target_role_id collision");
const families = source.families.map((family, sort_order) => ({ ...family, description: familyDescriptions[family.id], sort_order }));
const catalog = { version: 1, generated_at: "2026-09-28", families, profiles: groups, roles };
fs.writeFileSync(path.join(root, "data/career-role-catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

const esc = (value) => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${esc(JSON.stringify(value))}::jsonb`;
const chunks = [
  "-- Curated 118-role career catalog. Generated from data/career-role-catalog.json by scripts/build-career-role-catalog.mjs.",
  "-- Existing learner enrollments and progress are intentionally unchanged.",
  "begin;",
  "insert into public.roadmaps(id,title,track,description,is_public) values ('zte-frontend-v1','Frontend Engineering','frontend','Shared frontend curriculum; detailed content is loaded by seed_roadmap_tracks.sql.',true),('zte-backend-java-v1','Backend Java Engineering','backend','Shared Java backend curriculum; detailed content is loaded by seed_roadmap_tracks.sql.',true),('zte-fullstack-v1','Full-Stack Engineering','full-stack','Shared full-stack curriculum; detailed content is loaded by seed_roadmap_tracks.sql.',true) on conflict(id) do update set is_public=true;",
  "alter table public.target_roles add column if not exists is_active boolean not null default true;",
  "create unique index if not exists target_roles_active_name_idx on public.target_roles(lower(name)) where is_active;",
  `update public.target_roles set is_active=false where id not in (${roles.map((role) => esc(role.target_role_id)).join(",")});`,
  "create table if not exists public.career_families (id text primary key, name text not null unique, description text not null, sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());",
  "create table if not exists public.career_role_profiles (id text primary key, family_id text not null references public.career_families(id) on update cascade on delete restrict, name text not null, summary text not null, prerequisites jsonb not null default '[]'::jsonb, core_skills jsonb not null default '[]'::jsonb, tool_stack jsonb not null default '[]'::jsonb, project_blueprints jsonb not null default '[]'::jsonb, interview_focus jsonb not null default '[]'::jsonb, dsa_expectation text not null default 'foundational', system_design_expectation text not null default 'foundational', portfolio_evidence jsonb not null default '[]'::jsonb, roadmap_id text references public.roadmaps(id) on delete set null, curriculum_status text not null check (curriculum_status in ('mapped_to_detailed_track','core_curriculum')), coverage_notes text not null, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());",
  "create table if not exists public.career_roles (id text primary key, target_role_id text not null unique references public.target_roles(id) on update cascade on delete cascade, family_id text not null references public.career_families(id) on update cascade on delete restrict, profile_id text not null references public.career_role_profiles(id) on update cascade on delete restrict, role_focus text, roadmap_id text references public.roadmaps(id) on delete set null, curriculum_status text not null check (curriculum_status in ('mapped_to_detailed_track','core_curriculum')), is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());",
  "create index if not exists career_roles_family_idx on public.career_roles(family_id) where is_active;",
  "create index if not exists career_roles_profile_idx on public.career_roles(profile_id) where is_active;",
  "alter table public.career_families enable row level security; alter table public.career_role_profiles enable row level security; alter table public.career_roles enable row level security;",
  "drop policy if exists career_families_read on public.career_families; create policy career_families_read on public.career_families for select to authenticated using (true);",
  "drop policy if exists career_families_admin on public.career_families; create policy career_families_admin on public.career_families for all to authenticated using (public.is_admin()) with check (public.is_admin());",
  "drop policy if exists career_role_profiles_read on public.career_role_profiles; create policy career_role_profiles_read on public.career_role_profiles for select to authenticated using (is_active or public.is_admin());",
  "drop policy if exists career_role_profiles_admin on public.career_role_profiles; create policy career_role_profiles_admin on public.career_role_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());",
  "drop policy if exists career_roles_read on public.career_roles; create policy career_roles_read on public.career_roles for select to authenticated using (is_active or public.is_admin());",
  "drop policy if exists career_roles_admin on public.career_roles; create policy career_roles_admin on public.career_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());",
  "drop policy if exists role_roadmap_assignments_admin_write on public.role_roadmap_assignments; create policy role_roadmap_assignments_admin_write on public.role_roadmap_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());",
  "grant select, insert, update, delete on public.career_families, public.career_role_profiles, public.career_roles, public.target_roles, public.role_roadmap_assignments to authenticated;",
  "create or replace function public.set_role_roadmap_assignment(p_role_id text,p_roadmap_id text) returns void language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null or not public.is_admin() then raise exception 'administrator access required'; end if; if not exists(select 1 from public.target_roles where id=p_role_id) then raise exception 'target role not found'; end if; if not exists(select 1 from public.roadmaps r join public.roadmap_versions v on v.roadmap_id=r.id where r.id=p_roadmap_id and r.is_public and v.is_current and v.status='published') then raise exception 'role must map to a public roadmap with a current published version'; end if; perform pg_advisory_xact_lock(hashtext(p_role_id)); delete from public.role_roadmap_assignments where role_id=p_role_id; insert into public.role_roadmap_assignments(role_id,roadmap_id,priority) values(p_role_id,p_roadmap_id,0); update public.career_roles set roadmap_id=p_roadmap_id,curriculum_status='mapped_to_detailed_track',updated_at=now() where target_role_id=p_role_id; end; $$;",
  "revoke all on function public.set_role_roadmap_assignment(text,text) from public, anon; grant execute on function public.set_role_roadmap_assignment(text,text) to authenticated;",
  `create or replace function public.admin_sync_career_role_skills(p_role_id text) returns void language plpgsql security definer set search_path=public as $$ declare target_id text; skill_names jsonb; tool_names jsonb; begin if auth.uid() is null or not public.is_admin() then raise exception 'administrator access required'; end if; select cr.target_role_id, p.core_skills, p.tool_stack into target_id, skill_names, tool_names from public.career_roles cr join public.career_role_profiles p on p.id=cr.profile_id where cr.id=p_role_id; if target_id is null then raise exception 'career role not found'; end if; with all_names as (select value as name from jsonb_array_elements_text(coalesce(skill_names,'[]'::jsonb)) union all select value as name from jsonb_array_elements_text(coalesce(tool_names,'[]'::jsonb))), normalized as (select lower(name) as key, min(name) as name from all_names group by lower(name)) insert into public.technologies(id,name,category) select 'career-'||md5(key),name,'Career skill' from normalized n where not exists(select 1 from public.technologies t where lower(t.name)=n.key) on conflict(id) do nothing; with all_requirements as (select value as name, greatest(0.35,1.00-(ordinality-1)*0.08)::numeric(3,2) as weight from jsonb_array_elements_text(coalesce(skill_names,'[]'::jsonb)) with ordinality union all select value as name, greatest(0.35,0.85-(ordinality-1)*0.06)::numeric(3,2) as weight from jsonb_array_elements_text(coalesce(tool_names,'[]'::jsonb)) with ordinality), normalized as (select lower(name) as key,min(name) as name,max(weight) as weight from all_requirements group by lower(name)) insert into public.role_skill_requirements(role_id,technology_id,weight) select target_id,t.id,n.weight from normalized n join lateral(select id from public.technologies where lower(name)=n.key order by id limit 1) t on true on conflict(role_id,technology_id) do update set weight=excluded.weight; end; $$;`,
  "revoke all on function public.admin_sync_career_role_skills(text) from public, anon; grant execute on function public.admin_sync_career_role_skills(text) to authenticated;",
  "drop policy if exists target_roles_admin_write on public.target_roles; create policy target_roles_admin_write on public.target_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());",
];

chunks.push("insert into public.career_families(id,name,description,sort_order) values");
chunks.push(families.map((family) => `(${esc(family.id)},${esc(family.name)},${esc(family.description)},${family.sort_order})`).join(",\n") + " on conflict(id) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,updated_at=now();");
chunks.push("insert into public.career_role_profiles(id,family_id,name,summary,prerequisites,core_skills,tool_stack,project_blueprints,interview_focus,dsa_expectation,system_design_expectation,portfolio_evidence,roadmap_id,curriculum_status,coverage_notes) values");
chunks.push(groups.map((profile) => `(${esc(profile.id)},${esc(profile.family_id)},${esc(profile.name)},${esc(profile.summary)},${json(profile.prerequisites)},${json(profile.core_skills)},${json(profile.tool_stack)},${json(profile.project_blueprints)},${json(profile.interview_focus)},${esc(profile.dsa_expectation)},${esc(profile.system_design_expectation)},${json(profile.portfolio_evidence)},${esc(profile.roadmap_id)},${esc(profile.curriculum_status)},${esc(profile.coverage_notes)})`).join(",\n") + " on conflict(id) do update set family_id=excluded.family_id,name=excluded.name,summary=excluded.summary,prerequisites=excluded.prerequisites,core_skills=excluded.core_skills,tool_stack=excluded.tool_stack,project_blueprints=excluded.project_blueprints,interview_focus=excluded.interview_focus,dsa_expectation=excluded.dsa_expectation,system_design_expectation=excluded.system_design_expectation,portfolio_evidence=excluded.portfolio_evidence,roadmap_id=excluded.roadmap_id,curriculum_status=excluded.curriculum_status,coverage_notes=excluded.coverage_notes,updated_at=now();");
chunks.push("insert into public.target_roles(id,name,description,is_active) values");
chunks.push(roles.map((role) => `(${esc(role.target_role_id)},${esc(role.title)},${esc(role.role_focus ?? `Career profile: ${role.profile_id.replaceAll("--", " / ")}`)},true)`).join(",\n") + " on conflict(id) do update set name=excluded.name,description=excluded.description,is_active=true;");
chunks.push("insert into public.career_roles(id,target_role_id,family_id,profile_id,role_focus,roadmap_id,curriculum_status) values");
chunks.push(roles.map((role) => `(${esc(role.id)},${esc(role.target_role_id)},${esc(role.family_id)},${esc(role.profile_id)},${esc(role.role_focus)},${esc(role.roadmap_id)},${esc(role.curriculum_status)})`).join(",\n") + " on conflict(id) do update set target_role_id=excluded.target_role_id,family_id=excluded.family_id,profile_id=excluded.profile_id,role_focus=excluded.role_focus,roadmap_id=excluded.roadmap_id,curriculum_status=excluded.curriculum_status,is_active=true,updated_at=now();");

const assignmentRoles = roles.filter((role) => role.roadmap_id);
chunks.push("delete from public.role_roadmap_assignments where role_id in ('backend-developer','devops-engineer','cloud-engineer','mobile-engineer','qa-engineer','bi-data-analyst','operations-analyst','sde-1');");
chunks.push("insert into public.role_roadmap_assignments(role_id,roadmap_id,priority) values");
chunks.push(assignmentRoles.map((role) => `(${esc(role.target_role_id)},${esc(role.roadmap_id)},0)`).join(",\n") + " on conflict(role_id,roadmap_id) do update set priority=excluded.priority;");

// Extend the shared technology dictionary with curated role skills, then seed
// weighted requirements so the existing readiness engine can score evidence.
const allSkills = new Set();
const requirementMap = new Map();
for (const role of roles) {
  const profile = groups.find((item) => item.id === role.profile_id);
  profile.core_skills.forEach((skill, index) => {
    allSkills.add(skill);
    const key = `${role.target_role_id}\0${skill.toLowerCase()}`;
    requirementMap.set(key, { roleId: role.target_role_id, skill, weight: Math.max(0.35, 1 - index * 0.08) });
  });
  profile.tool_stack.forEach((skill, index) => {
    allSkills.add(skill);
    const key = `${role.target_role_id}\0${skill.toLowerCase()}`;
    if (!requirementMap.has(key)) requirementMap.set(key, { roleId: role.target_role_id, skill, weight: Math.max(0.35, 0.85 - index * 0.06) });
  });
}
chunks.push("insert into public.technologies(id,name,category) select 'career-'||md5(lower(s.name)),s.name,'Career skill' from (select lower(skill) as normalized,min(skill) as name from (values\n" + [...allSkills].map((skill) => `(${esc(skill)})`).join(",\n") + ") as raw(skill) group by lower(skill)) s where not exists (select 1 from public.technologies t where lower(t.name)=s.normalized) on conflict(id) do nothing;");
const requirementRows = [...requirementMap.values()].map(({ roleId, skill, weight }) => `(${esc(roleId)},${esc(skill)},${weight.toFixed(2)})`);
chunks.push("insert into public.role_skill_requirements(role_id,technology_id,weight) select v.role_id,t.id,v.weight from (values\n" + requirementRows.join(",\n") + ") as v(role_id,technology_name,weight) join lateral (select id from public.technologies where lower(name)=lower(v.technology_name) order by id limit 1) t on true on conflict(role_id,technology_id) do update set weight=excluded.weight;");
chunks.push("commit;", "");
const migrationPath = path.join(root, "supabase/migrations/0087_career_role_catalog.sql");
fs.writeFileSync(migrationPath, chunks.join("\n"), "utf8");
console.log(`Built catalog: ${source.families.length} families, ${groups.length} shared profiles, ${roles.length} role titles; migration ${path.relative(root, migrationPath)}`);

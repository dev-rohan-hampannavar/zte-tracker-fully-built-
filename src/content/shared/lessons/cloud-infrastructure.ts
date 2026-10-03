import type { Lesson } from "./types";

export const CLOUD_LESSONS: Lesson[] = [
  {
    id: "cloud-linux-debug",
    familyId: "cloud-infrastructure",
    module: "Linux and networking",
    title: "Debugging a service that won't start",
    minutes: 35,
    objectives: ["Follow a repeatable checklist when a service fails", "Read logs with journalctl and systemctl", "Tell apart permission, port and configuration failures"],
    explain: [
      "When a service will not start, guessing wastes time. Work from the outside in: is the process running, what does its log say, does the configuration parse, can it bind its port, and does it have permission to read the files it needs? Each question rules out a whole class of causes.",
      "On a systemd machine, systemctl status shows whether the unit is active, failed or restarting and prints the last log lines. journalctl -u name -e jumps to the end of that unit's log, and -f follows it live. Exit codes and messages such as 'permission denied', 'address already in use' or 'no such file or directory' usually name the cause directly.",
      "Change one thing at a time and re-test. Write down what you tried. If you fix it, add a line to a runbook so the next person, perhaps you at 3 a.m., does not start from zero.",
      "Resource exhaustion causes many mysterious failures, so add three quick checks to your routine. Disk: df -h and df -i show full disks and exhausted inodes. Memory: free -m and the system log reveal the kernel killing processes that used too much. CPU and load: uptime and top show whether the machine is simply overloaded. A service that starts and then dies for no obvious reason is often a victim of one of these.",
    ],
    keyIdeas: ["Status, logs, config, port, permissions: in that order", "systemctl status and journalctl -u are your first two commands", "'Address already in use' means another process owns the port", "Change one variable at a time"],
    example: {
      title: "A web app that fails after deploy",
      lang: "bash",
      code: `# 1. Is it running, and why did it stop?
systemctl status myapp --no-pager

# 2. Read the tail of the log
journalctl -u myapp -n 50 --no-pager

# 3. Is something already using the port?
sudo ss -ltnp | grep ':8080'

# 4. Can the service user read its config and write its data dir?
sudo -u myapp test -r /etc/myapp/config.yml && echo "config readable"
ls -ld /var/lib/myapp

# 5. After fixing, restart and confirm
sudo systemctl restart myapp && systemctl is-active myapp
curl -fsS http://localhost:8080/health`,
      walkthrough: ["Status and logs show the failure message; many problems end here.", "ss lists listening sockets with their process, which finds port conflicts.", "Testing as the service user catches permission problems that root hides."],
    },
    practice: [
      { task: "Create a tiny service that binds a port, then start a second copy. Find the error and the process holding the port.", hint: "Use ss -ltnp and read the 'address already in use' message." },
      { task: "Make a unit file reference a config you cannot read as that user. Diagnose it only from the logs.", hint: "journalctl -u shows the permission error; fix with ownership or mode, not 777." },
    ],
    quiz: [
      { q: "A service logs 'bind: address already in use'. What is the most likely cause?", options: ["Low disk space", "Another process is listening on that port", "A DNS failure", "A missing library"], answer: 1, why: "The port is taken. Use ss -ltnp to find the process, then stop it or change the port." },
      { q: "Which command follows a unit's log live?", options: ["journalctl -u myapp -f", "systemctl log myapp", "cat /var/log", "ss -f myapp"], answer: 0, why: "-u selects the unit and -f follows new entries." },
      { q: "Why test file access as the service user rather than root?", options: ["Root cannot read files", "Root bypasses permission checks and hides the problem", "It is faster", "Service users have more rights"], answer: 1, why: "Root ignores file permissions. The service runs as its own user and fails where root succeeds." },
    ],
    pitfalls: ["Fixing permissions with chmod 777", "Changing several things at once", "Restarting repeatedly without reading the log"],
  },
  {
    id: "cloud-network-request",
    familyId: "cloud-infrastructure",
    module: "Linux and networking",
    title: "DNS, TCP and TLS: what happens on a request",
    minutes: 35,
    objectives: ["Trace a request from name lookup to response", "Use curl, dig and openssl to inspect each step", "Locate whether a failure is DNS, network, TLS or application"],
    explain: [
      "Every web request is a chain of smaller steps. First DNS turns a name into an IP address. Then TCP opens a connection with a three-way handshake. For HTTPS, TLS negotiates encryption and the server presents a certificate that the client verifies. Only then does the HTTP request travel and the response return. A failure at any step looks like 'the site is down' to a user but has a different fix.",
      "Each step can be tested alone. dig shows what a name resolves to and which server answered. curl with the verbose flag prints the connection, TLS and HTTP stages in order. openssl s_client shows the certificate chain and expiry. If DNS fails, the network and server are irrelevant; if TLS fails, the application may be perfectly healthy.",
      "Knowing the layers makes you fast. 'Could not resolve host' is DNS. 'Connection refused' means nothing is listening, 'timed out' often means a firewall or routing issue, a certificate error is TLS, and a 502 or 500 is the application or a proxy in front of it.",
      "Latency is the sum of these steps, which is why they matter beyond debugging. A cold connection pays for DNS, the TCP handshake and the TLS handshake before any data moves, while a reused connection pays almost nothing. That is why keep-alive, HTTP/2 and CDNs make sites feel faster, and why a distant server adds delay to every round trip. When a page is slow, break the time down by stage before changing any code.",
    ],
    keyIdeas: ["Request order: DNS, TCP, TLS, HTTP", "Test each layer separately", "Refused means no listener; timeout often means filtered or unreachable", "Certificates expire, and expired certificates take sites down"],
    example: {
      title: "Isolating a failure with three commands",
      lang: "bash",
      code: `# DNS: what does the name resolve to?
dig +short example.com
dig example.com @1.1.1.1 +short      # ask a specific resolver

# TCP + TLS + HTTP, step by step with timings
curl -v --max-time 10 https://example.com/ -o /dev/null

# Certificate details and expiry
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \\
  | openssl x509 -noout -dates -subject`,
      walkthrough: ["dig confirms the name resolves and lets you compare resolvers.", "curl -v prints the connection attempt, the TLS handshake and the HTTP exchange so you can see where it stops.", "openssl shows validity dates, which explains sudden certificate failures."],
    },
    practice: [
      { task: "Run curl -v against a site you use and label each stage in the output: DNS, TCP, TLS, request, response.", hint: "Look for the lines starting with *, >, and <." },
      { task: "Create a record that points a test hostname at the wrong IP and show how the failure differs from a closed port.", hint: "Wrong IP usually times out or connects to something else; a closed port is refused immediately." },
    ],
    quiz: [
      { q: "curl reports 'Could not resolve host'. Which layer failed?", options: ["TLS", "DNS", "Application", "TCP"], answer: 1, why: "The name could not be turned into an IP address, so nothing else was attempted." },
      { q: "'Connection refused' on a port most often means...", options: ["Nothing is listening there", "The certificate expired", "The DNS record is wrong", "The server is overloaded"], answer: 0, why: "The host replied that no process accepts connections on that port." },
      { q: "A site is healthy internally, but browsers show a certificate warning. Where do you look?", options: ["The database", "The certificate chain and expiry", "The CSS", "Container memory"], answer: 1, why: "TLS failures happen before the application sees the request." },
    ],
    pitfalls: ["Blaming the application for DNS or certificate problems", "Ignoring DNS caching and TTLs when changing records", "Forgetting certificate renewal alerts"],
  },
  {
    id: "cloud-dockerfile",
    familyId: "cloud-infrastructure",
    module: "Containers and orchestration",
    title: "Writing a good Dockerfile",
    minutes: 35,
    objectives: ["Build small, cache-friendly images", "Use multi-stage builds to keep build tools out of production", "Run as a non-root user"],
    explain: [
      "A container image is built in layers, one per instruction. Docker caches layers and reuses them when nothing above has changed. The order of instructions therefore matters: put things that change rarely, such as installing dependencies, before things that change often, such as copying your source code. A well-ordered file rebuilds in seconds instead of minutes.",
      "Multi-stage builds use one stage to compile or install build tools and a second, minimal stage to run the result. Only what you copy across ends up in the final image, which makes it smaller, faster to pull and with fewer packages to attack. Pin base image versions so builds are repeatable.",
      "Run the process as a non-root user, add a .dockerignore so you do not copy node_modules, git history or secrets into the build context, and never bake secrets into an image layer. Anyone who can pull the image can read its layers.",
      "Image hygiene pays off later. Scan images for known vulnerabilities as part of your pipeline, rebuild regularly so base-image fixes reach you, and use small base images such as slim or distroless variants where your application allows it. Keep one process per container, write logs to standard output so the platform can collect them, and make the container start quickly and shut down cleanly when it receives a termination signal.",
    ],
    keyIdeas: ["Order instructions from least to most frequently changed", "Multi-stage builds ship only what runs", "Pin versions; use a .dockerignore", "Non-root user; no secrets in layers"],
    example: {
      title: "A Node service image",
      lang: "dockerfile",
      code: `# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]`,
      walkthrough: ["package files are copied before the source, so dependency installation is cached until they change.", "The runtime stage installs only production dependencies and copies the compiled output from the build stage.", "USER node avoids running as root; HEALTHCHECK lets the platform detect a stuck process."],
    },
    practice: [
      { task: "Containerise a small app and compare image size with and without a multi-stage build.", hint: "Use docker images and look at the SIZE column." },
      { task: "Change one source file and rebuild. Which layers were reused? Move the COPY lines and see how rebuild time changes.", hint: "Watch for 'CACHED' in the build output." },
    ],
    quiz: [
      { q: "Why copy package files and install dependencies before copying the rest of the source?", options: ["Docker requires it", "The dependency layer stays cached when only source code changes", "It reduces CPU use", "It encrypts the image"], answer: 1, why: "Docker invalidates a layer and everything after it when its inputs change. Dependencies change less often than source." },
      { q: "What is the main benefit of a multi-stage build?", options: ["Faster CPUs", "Build tools stay out of the final image", "Automatic scaling", "Built-in monitoring"], answer: 1, why: "Compilers and dev dependencies are left behind, making the image smaller and safer." },
      { q: "Where is it safe to put an API key used at runtime?", options: ["In an ENV line in the Dockerfile", "Baked into a layer with COPY", "Injected at runtime by the platform's secret mechanism", "In the image tag"], answer: 2, why: "Anything in the image can be read by whoever can pull it. Inject secrets when the container starts." },
    ],
    pitfalls: ["Using the latest tag", "Copying the whole repository, including secrets, into the build context", "Running as root"],
  },
  {
    id: "cloud-k8s-deploy",
    familyId: "cloud-infrastructure",
    module: "Containers and orchestration",
    title: "Kubernetes: deployments, services and rollouts",
    minutes: 40,
    objectives: ["Describe the roles of pods, deployments and services", "Write a deployment with probes and resource requests", "Roll out and roll back a change safely"],
    explain: [
      "A pod is the smallest unit Kubernetes runs: one or more containers sharing a network. You rarely create pods directly. A Deployment declares how many copies you want and which image to run, and Kubernetes continuously works to make reality match. If a pod dies, it starts another. A Service gives those changing pods one stable address and load-balances across the healthy ones.",
      "Probes tell Kubernetes about health. A readiness probe decides whether a pod should receive traffic; a liveness probe decides whether it should be restarted. Resource requests tell the scheduler how much CPU and memory a pod needs, and limits cap what it may use. Without requests, the cluster cannot place workloads sensibly.",
      "When you change the image, the Deployment performs a rolling update: it starts new pods, waits until they are ready, then removes old ones, so users see no downtime if the probes are accurate. If the new version misbehaves, rolling back to the previous revision is one command.",
      "Configuration and secrets should live outside the image. Use ConfigMaps for non-sensitive settings and Secrets for credentials, mounted as environment variables or files, so the same image runs in every environment. Use labels consistently, since Services and Deployments find pods by label. When something goes wrong, three commands solve most problems: kubectl get pods to see state, kubectl describe pod for events such as failed probes or image pulls, and kubectl logs to read the application output.",
    ],
    keyIdeas: ["Deployments keep the desired number of pods running", "Services provide a stable address", "Readiness gates traffic; liveness triggers restarts", "Requests help scheduling; limits cap usage"],
    example: {
      title: "A deployment and a service",
      lang: "yaml",
      code: `apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 3
  selector: { matchLabels: { app: web } }
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: registry.example.com/web:1.4.2
          ports: [{ containerPort: 3000 }]
          readinessProbe: { httpGet: { path: /health, port: 3000 }, periodSeconds: 5 }
          livenessProbe:  { httpGet: { path: /health, port: 3000 }, initialDelaySeconds: 15 }
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { memory: 256Mi }
---
apiVersion: v1
kind: Service
metadata: { name: web }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: 3000 }]`,
      walkthrough: ["maxUnavailable 0 with maxSurge 1 starts one extra pod and only removes an old one once it is ready.", "The readiness probe keeps traffic away from pods that are still starting.", "Rollback is kubectl rollout undo deployment/web; status is kubectl rollout status deployment/web."],
    },
    practice: [
      { task: "Deploy the manifest on a local cluster, change the image tag, and watch the rollout. Then break the health endpoint and see what the rollout does.", hint: "A failing readiness probe stops the rollout from replacing healthy pods." },
      { task: "Delete a pod manually and observe what happens. Explain why.", hint: "The Deployment's controller notices the count is below the desired replicas." },
    ],
    quiz: [
      { q: "What does a failing readiness probe do?", options: ["Restarts the pod", "Removes the pod from Service endpoints so it receives no traffic", "Deletes the Deployment", "Scales the cluster"], answer: 1, why: "Readiness controls traffic. Liveness controls restarts." },
      { q: "Why define resource requests?", options: ["To make pods faster", "So the scheduler can place pods on nodes with enough capacity", "To enable logging", "They are optional decoration"], answer: 1, why: "Requests are the amount the scheduler reserves when placing a pod." },
      { q: "Which command reverts to the previous Deployment revision?", options: ["kubectl rollout undo deployment/web", "kubectl delete service web", "kubectl scale --to-previous", "kubectl restart web"], answer: 0, why: "Deployments keep revision history; undo returns to the last one." },
    ],
    pitfalls: ["No readiness probe, so traffic hits pods that are not ready", "Running with no resource requests or limits", "Using the latest tag so rollbacks are ambiguous"],
  },
  {
    id: "cloud-iac-state",
    familyId: "cloud-infrastructure",
    module: "Infrastructure as code",
    title: "State, plans and drift",
    minutes: 35,
    objectives: ["Explain what infrastructure state is and why it needs protection", "Read a plan before applying it", "Detect and resolve drift"],
    explain: [
      "Infrastructure as code describes the resources you want in files, and a tool compares that description with what exists and makes the difference. The tool remembers what it created in a state file. State maps your configuration to real resource ids, so it is the tool's memory. Lose it and the tool no longer knows what it manages; corrupt it and it may try to recreate things that exist.",
      "Because state is critical and sensitive, store it remotely with locking, so two people cannot apply at once, and with encryption and access control. Never commit it to version control, since it can contain secrets in plain text.",
      "Always read the plan. It lists what will be created, changed or destroyed. Changes that force replacement, such as renaming a database, can destroy data. Drift is when real infrastructure differs from the code, usually because someone changed it by hand. A scheduled plan that should show no changes is a cheap way to detect drift early.",
      "Structure helps teams stay safe. Split infrastructure into small, separately applied stacks, such as networking, data and applications, so a mistake has a limited blast radius and plans stay readable. Use modules for repeated patterns and variables for environment differences instead of copying files. Run formatting, validation and a policy check on every pull request, and require review of the plan output, because the plan is the most reliable summary of what a change will really do.",
    ],
    keyIdeas: ["State links code to real resources", "Remote state with locking and encryption", "Review the plan; look for destroy and replace", "Make changes through code, then detect drift with a no-op plan"],
    example: {
      title: "Remote state and a reviewed change",
      lang: "hcl",
      code: `terraform {
  backend "s3" {
    bucket         = "acme-tf-state"
    key            = "prod/network.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "acme-prod-assets"
}

# Workflow:
#   terraform fmt && terraform validate
#   terraform plan -out=tfplan      # read it; look for "destroy" and "replace"
#   terraform apply tfplan          # apply exactly what was reviewed`,
      walkthrough: ["The backend block stores state remotely with a lock table and encryption.", "Saving the plan to a file and applying that file guarantees you apply what you reviewed.", "Run terraform plan on a schedule; any unexpected diff is drift to investigate."],
    },
    practice: [
      { task: "Create a small resource, then change it in the cloud console. Run a plan and explain what it shows and how you would reconcile.", hint: "Either update the code to match, or apply to revert the manual change." },
      { task: "Write down your team's rules for who may run apply and where. Include how state is protected.", hint: "Prefer applying from a pipeline with approvals over laptops." },
    ],
    quiz: [
      { q: "Why must state files not be committed to Git?", options: ["They are too large", "They can contain secrets and cannot be safely merged", "Git cannot store JSON", "It slows deployments"], answer: 1, why: "State can hold sensitive values and needs locking and access control that Git does not provide." },
      { q: "In a plan, a resource shows 'must be replaced'. What should you do?", options: ["Apply immediately", "Check what is destroyed and whether data or traffic will be lost", "Delete the state file", "Ignore it"], answer: 1, why: "Replacement destroys the old resource first or after the new one, depending on lifecycle. Review the blast radius." },
      { q: "What is drift?", options: ["Slow deployments", "Real infrastructure differing from the code", "A type of cloud outage", "A state locking bug"], answer: 1, why: "Manual or out-of-band changes cause drift. Detect it with regular plans." },
    ],
    pitfalls: ["Applying without reading the plan", "Sharing state through chat or Git", "Making emergency console changes and never reconciling them"],
  },
  {
    id: "cloud-cicd-safe",
    familyId: "cloud-infrastructure",
    module: "CI/CD and release engineering",
    title: "A pipeline that ships safely",
    minutes: 35,
    objectives: ["Order pipeline stages so failures appear early and cheaply", "Build once and promote the same artifact", "Add a safe deployment strategy and rollback"],
    explain: [
      "A good pipeline gives fast, trustworthy feedback. Order stages from cheapest to most expensive: formatting and linting, unit tests, build, integration tests, then deploy. The sooner a failure appears, the cheaper it is to fix. Cache dependencies and run independent jobs in parallel to keep the pipeline short, because slow pipelines get bypassed.",
      "Build the artifact once, tag it with the commit, and promote that exact artifact through staging to production. Rebuilding for each environment means production runs something no one tested. Configuration comes from the environment, not from the build.",
      "Releases should be small and reversible. A rolling update replaces instances gradually. A canary sends a small share of traffic to the new version and watches error rates before widening. A feature flag decouples deploying code from enabling behaviour. Whatever the strategy, define in advance how you roll back and what signal triggers it.",
      "Pipelines are also where secrets leak and supply-chain risks enter. Store credentials in the platform's secret store, never in the repository, and give each job the least access it needs. Pin the versions of actions and base images, and scan dependencies and images for known vulnerabilities as a normal stage. A pipeline that deploys to production holds powerful keys, so treat its configuration with the same review discipline as application code.",
    ],
    keyIdeas: ["Cheap checks first, expensive checks later", "Build once, promote the same artifact", "Config from the environment, secrets from a vault", "Small releases with a tested rollback"],
    example: {
      title: "A staged pipeline with a manual gate",
      lang: "yaml",
      code: `name: ci-cd
on: { push: { branches: [main] } }

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint && npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t registry.example.com/web:\${{ github.sha }} .
      # push the image here with registry credentials from secrets

  deploy-staging:
    needs: build
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh staging \${{ github.sha }}

  deploy-prod:
    needs: deploy-staging
    environment: production      # configure required reviewers on this environment
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh production \${{ github.sha }}`,
      walkthrough: ["Each job needs the previous one, so a failed test stops everything after it.", "The image is tagged with the commit hash and the same hash is deployed to both environments.", "The production environment can require manual approval before the job runs."],
    },
    practice: [
      { task: "Add caching and measure how much faster the test stage runs. Then split tests into two parallel jobs.", hint: "Compare the durations in the pipeline UI before and after." },
      { task: "Write a rollback plan for your service: the command, who runs it, and the metric that triggers it.", hint: "A 5xx rate above a threshold for five minutes is a common trigger." },
    ],
    quiz: [
      { q: "Why promote the same built artifact to production rather than rebuilding?", options: ["It is cheaper", "Production then runs exactly what was tested", "Rebuilds are not allowed", "It avoids caching"], answer: 1, why: "A rebuild can differ because of dependency or environment changes. Promotion keeps what you tested identical." },
      { q: "What does a canary release do?", options: ["Deploys to all users at once", "Sends a small share of traffic to the new version first", "Skips testing", "Rolls back automatically always"], answer: 1, why: "A small exposure limits the blast radius while you watch metrics." },
      { q: "A pipeline takes 40 minutes. Developers start skipping it. What is the best response?", options: ["Mandate patience", "Cache, parallelise and move slow tests later", "Remove tests", "Run it nightly only"], answer: 1, why: "Speed is a feature. Slow pipelines get bypassed, which defeats their purpose." },
    ],
    pitfalls: ["Rebuilding per environment", "Secrets printed in logs", "No rollback plan until the first bad deploy"],
  },
  {
    id: "cloud-slo",
    familyId: "cloud-infrastructure",
    module: "Observability and reliability",
    title: "SLIs, SLOs and error budgets",
    minutes: 35,
    objectives: ["Choose meaningful SLIs from the user's point of view", "Set an SLO and compute the error budget", "Use the budget to decide between shipping and stabilising"],
    explain: [
      "A service level indicator, or SLI, is a measurement of how well the service is doing for users, such as the share of requests that succeed or the share served in under 300 milliseconds. A service level objective, or SLO, is the target for that measurement over a window, for example 99.9% of requests succeed over 30 days. Pick indicators users would notice: errors and latency at the edge, not CPU on one host.",
      "The error budget is the allowed failure: 100% minus the SLO. At 99.9% over 30 days, that is 0.1% of requests, or about 43 minutes of full downtime. The budget turns reliability into a shared, numeric trade-off. While there is budget left, teams can ship quickly and take risks. When it is nearly spent, the priority shifts to reliability work.",
      "Alert on how fast you are burning the budget rather than on every blip. A burn-rate alert fires when errors would exhaust the budget well before the window ends, which pages people for what matters and keeps the rest as tickets.",
      "Start small and iterate. Pick one or two user journeys that matter most, such as signing in and completing a purchase, measure them from the edge, and set a modest SLO you already meet. Review it monthly: if you are never close to the budget the target may be too loose, and if you constantly exhaust it either the target is unrealistic or reliability needs investment. Share the dashboard with product and business colleagues so the trade-off becomes a shared decision.",
    ],
    keyIdeas: ["SLIs describe the user's experience", "SLO = target; error budget = 100% minus SLO", "Budget guides risk: ship while healthy, stabilise when spent", "Alert on budget burn rate, not on every spike"],
    example: {
      title: "Availability SLI and budget arithmetic",
      lang: "text",
      code: `SLI:    good_requests / total_requests   (good = HTTP status < 500)
SLO:    99.9% over a rolling 30 days

Budget in requests:   total_requests * 0.001
If we serve 10,000,000 requests in 30 days:
   allowed bad requests = 10,000

Burn rate = (observed error rate) / (allowed error rate)
   observed 0.5% errors vs allowed 0.1%  ->  burn rate 5
   At burn rate 5, a 30-day budget is gone in 6 days -> page someone.

Time-based view: 30 days * 24h * 60m * 0.001 = 43.2 minutes of full outage.`,
      walkthrough: ["The SLI is a ratio of good events to all events.", "The budget is the permitted bad events: here, 10,000 out of 10 million.", "Burn rate tells you how quickly you consume it, which decides whether to page or open a ticket."],
    },
    practice: [
      { task: "Define two SLIs and SLOs for a service you know: one for availability and one for latency. Explain why users would care.", hint: "Use a percentile such as 95% of requests under 300 ms rather than an average." },
      { task: "Compute the monthly error budget for 99.5%, 99.9% and 99.99% in minutes of full downtime.", hint: "30 days is 43,200 minutes; multiply by the allowed failure fraction." },
    ],
    quiz: [
      { q: "A 99.9% availability SLO over 30 days allows roughly how much full downtime?", options: ["4 minutes", "43 minutes", "7 hours", "3 days"], answer: 1, why: "30 days is 43,200 minutes, and 0.1% of that is about 43 minutes." },
      { q: "Why prefer latency percentiles to the average?", options: ["Averages are illegal", "Averages hide slow tail requests that real users hit", "Percentiles are cheaper", "Percentiles need no data"], answer: 1, why: "A few very slow requests can ruin experience while barely moving the mean." },
      { q: "The error budget is almost gone. What is the usual policy?", options: ["Ship faster", "Prioritise reliability work over risky features", "Delete the SLO", "Hide the dashboard"], answer: 1, why: "The budget exists to balance reliability and velocity. When it is spent, reliability wins." },
    ],
    pitfalls: ["Measuring server metrics users cannot feel", "SLOs of 100%, which leave no room to change anything", "Paging on every error instead of budget burn"],
  },
];

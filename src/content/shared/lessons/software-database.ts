import type { Lesson } from "./types";

export const SOFTWARE_DEV_LESSONS: Lesson[] = [
  {
    id: "sd-a11y",
    familyId: "software-development",
    module: "Frontend depth",
    title: "Accessibility you can actually test",
    minutes: 35,
    objectives: ["Use semantic HTML so most accessibility comes for free", "Make every interaction work with a keyboard alone", "Run a five-minute accessibility check before you ship"],
    explain: [
      "Accessibility means people with different abilities can use your product: someone using a screen reader, someone who cannot use a mouse, someone with low vision or colour blindness, someone on a bright screen outdoors. It is also a legal requirement in many places and, in practice, it makes your interface better for everyone. The good news is that most of it comes from writing correct HTML rather than adding extra code.",
      "Start with semantics. Use button for actions and a for navigation, not a clickable div. Use headings in order, label every form field with a real label element connected to its input, and give images meaningful alt text, or an empty alt when they are decorative. Native elements come with keyboard behaviour, focus handling and screen reader roles built in. A div with a click handler has none of that, and rebuilding it with ARIA attributes is slower and easy to get wrong.",
      "Keyboard support is the most reliable test. Unplug your mouse and try to complete the main journey with Tab, Shift+Tab, Enter, Space and Escape. Focus must be visible at all times, the order must match the visual order, dialogs must trap focus while open and return it to the trigger when closed, and nothing should require hovering. Colour contrast matters too: normal text needs a contrast ratio of at least 4.5 to 1 against its background.",
      "Make accessibility part of your normal workflow instead of a final audit. Run an automated checker such as axe in your browser or in your tests to catch the mechanical problems, then do a manual keyboard pass and a short screen reader check with the reader built into your operating system. Automated tools find only a portion of issues, so the manual pass is not optional, but together they catch most of what real users would hit.",
    ],
    keyIdeas: ["Semantic HTML first; ARIA only to fill genuine gaps", "Every control must work by keyboard with visible focus", "Labels, alt text and heading order carry meaning to screen readers", "Automated checks plus a manual keyboard pass"],
    example: {
      title: "An inaccessible control and its fix",
      lang: "html",
      code: `<!-- BAD: not focusable, no role, no keyboard support, no label -->
<div class="btn" onclick="save()"><img src="save.svg"></div>

<!-- GOOD: native button, keyboard and screen reader support for free -->
<button type="button" class="btn" onclick="save()">
  <img src="save.svg" alt="" aria-hidden="true"> Save changes
</button>

<!-- Form field with a real label and an error message tied to the input -->
<label for="email">Email address</label>
<input id="email" type="email" autocomplete="email"
       aria-describedby="email-error" aria-invalid="true">
<p id="email-error" role="alert">Enter an email like name@example.com</p>

<!-- Visible focus: never remove the outline without replacing it -->
<style>
  .btn:focus-visible { outline: 3px solid #1a73e8; outline-offset: 2px; }
</style>`,
      walkthrough: ["The native button gets focus, Enter and Space handling and a role without any extra code.", "The decorative icon is hidden from assistive technology because the visible text already names the action.", "aria-describedby connects the error message to the input so a screen reader announces it with the field."],
    },
    practice: [
      { task: "Complete a sign-up flow on one of your projects using only the keyboard. Write down every place you got stuck or lost the focus indicator.", hint: "Check dropdowns, modals and custom controls first." },
      { task: "Run an automated accessibility checker on your homepage and fix the three most serious issues. Then explain one issue the tool cannot detect.", hint: "Tools cannot judge whether alt text is meaningful or whether the focus order makes sense." },
    ],
    quiz: [
      { q: "Why prefer a native button to a div with a click handler?", options: ["It looks better by default", "It brings keyboard, focus and screen reader behaviour built in", "Divs cannot be styled", "Buttons load faster"], answer: 1, why: "Native elements already implement the interaction patterns assistive technology expects." },
      { q: "What is the minimum contrast ratio for normal body text?", options: ["2 to 1", "3 to 1", "4.5 to 1", "10 to 1"], answer: 2, why: "WCAG AA requires at least 4.5 to 1 for normal-size text, and 3 to 1 for large text." },
      { q: "Which test finds the most real-world problems quickly?", options: ["Only running an automated scanner", "Completing the main journey with the keyboard alone", "Checking colours in a screenshot", "Reading the HTML once"], answer: 1, why: "Keyboard-only use exposes missing focus, bad order and mouse-only interactions that scanners miss." },
    ],
    pitfalls: ["Removing the focus outline with no replacement", "Using ARIA to patch a div instead of using the right element", "Placeholder text used as the only label"],
  },
  {
    id: "sd-vitals",
    familyId: "software-development",
    module: "Frontend depth",
    title: "Core Web Vitals: measure first, then fix",
    minutes: 35,
    objectives: ["Explain what LCP, INP and CLS measure", "Find the cause of a slow page with browser tools", "Apply the highest-impact fixes in order"],
    explain: [
      "Users judge performance by how a page feels, and Core Web Vitals turn that feeling into three measurements. Largest Contentful Paint, or LCP, is how long it takes for the main content to appear; a good value is 2.5 seconds or less. Interaction to Next Paint, or INP, is how quickly the page responds after a click or tap; 200 milliseconds or less is good. Cumulative Layout Shift, or CLS, is how much the layout jumps while loading; 0.1 or less is good.",
      "Never optimise by guessing. Measure with Lighthouse for a controlled lab run, and with real-user data from the field when you have it, because lab results on your fast laptop hide what a mid-range phone on a slow network experiences. In the browser performance panel, record a page load and read the waterfall: find the request that produces your LCP element, see what blocked it, and see which tasks held the main thread.",
      "The usual fixes follow the usual causes. For slow LCP, serve the hero image in a modern format at the right size, preload it, avoid lazy-loading it, and reduce render-blocking CSS and scripts. For poor INP, break long JavaScript tasks into smaller pieces, defer work that is not needed yet, and avoid expensive re-renders on every keystroke. For layout shift, always set width and height on images and reserve space for ads and late-loading content.",
      "Set a performance budget so you do not slowly regress: for example, a maximum JavaScript size for the main route and a minimum Lighthouse score in your pipeline. Change one thing at a time and re-measure so you know what actually helped. A common surprise is that removing an unused library or deferring a third-party script improves more than any clever micro-optimisation.",
    ],
    keyIdeas: ["LCP loading, INP responsiveness, CLS visual stability", "Measure in lab and field, on a slow device profile", "Fix the biggest cause first and re-measure", "Budgets in CI stop slow creep"],
    example: {
      title: "Fixing a slow hero image and layout shift",
      lang: "html",
      code: `<!-- Before: huge PNG, lazy-loaded hero, no dimensions -> slow LCP, layout jump -->
<img src="/hero.png" loading="lazy">

<!-- After: right size and format, high priority, reserved space -->
<link rel="preload" as="image" href="/hero-1200.avif" fetchpriority="high">
<img src="/hero-1200.avif"
     srcset="/hero-600.avif 600w, /hero-1200.avif 1200w"
     sizes="(max-width: 700px) 100vw, 1200px"
     width="1200" height="630"
     fetchpriority="high"
     alt="Dashboard showing weekly progress">

<!-- Defer non-critical third-party script so it cannot block interaction -->
<script src="https://example.com/chat.js" defer></script>

<!-- Break up a long task so the main thread can respond to input -->
<script>
  async function processInChunks(items) {
    for (let i = 0; i < items.length; i += 50) {
      items.slice(i, i + 50).forEach(handle);
      await new Promise((r) => setTimeout(r, 0)); // yield to the browser
    }
  }
</script>`,
      walkthrough: ["The hero is no longer lazy-loaded and has a preload and high fetch priority, which targets LCP.", "Width and height reserve the space so nothing moves when the image arrives, which targets CLS.", "Yielding between chunks lets the browser handle clicks during heavy work, which targets INP."],
    },
    practice: [
      { task: "Run Lighthouse on one of your pages with mobile throttling. Pick the single biggest opportunity, fix only that, and re-measure.", hint: "Record the before and after numbers so you can show the change." },
      { task: "Find a layout shift on a real site you use and describe what would prevent it.", hint: "Look for images without dimensions, banners that appear late and web fonts that swap." },
    ],
    quiz: [
      { q: "A hero image is lazy-loaded and LCP is slow. What is the likely fix?", options: ["Add more lazy loading", "Remove lazy loading from it and prioritise it", "Convert the page to a PDF", "Hide the image"], answer: 1, why: "The LCP element should load as early as possible; lazy loading delays it." },
      { q: "Which metric captures layout jumping during load?", options: ["LCP", "INP", "CLS", "TTFB"], answer: 2, why: "Cumulative Layout Shift sums unexpected movement of visible content." },
      { q: "Why test on throttled mobile settings rather than only your laptop?", options: ["Laptops cannot run Lighthouse", "Real users often have slower devices and networks", "Mobile is always faster", "It reduces the score"], answer: 1, why: "Performance problems that are invisible on a fast machine appear on typical phones." },
    ],
    pitfalls: ["Optimising without measuring first", "Lazy-loading above-the-fold images", "Adding third-party scripts without checking their cost"],
  },
  {
    id: "sd-migrations",
    familyId: "software-development",
    module: "Backend depth",
    title: "Safe schema changes and migrations",
    minutes: 35,
    objectives: ["Write migrations that can be applied and reviewed safely", "Change a live table without downtime using expand and contract", "Know which operations lock tables"],
    explain: [
      "A migration is a versioned, repeatable change to your database schema, stored in the repository next to the code that depends on it. Never edit the database by hand in production: a script that is reviewed, tested on a copy of real data and applied in order gives you history, repeatability and the ability to rebuild an environment from scratch. Keep each migration small and focused so a failure is easy to understand.",
      "The hard part is changing a live system without breaking the running application. Old and new versions of your code often run at the same time during a deploy, so a change that removes or renames a column the old code still reads will cause errors. The solution is the expand and contract pattern: first expand by adding the new column or table in a way the old code ignores, then deploy code that writes to both and reads from the new one, backfill old data, and only later contract by removing the old structure once nothing uses it.",
      "Know what your database locks. Some operations rewrite a whole table or hold a lock that blocks writes while they run, which on a large table can mean minutes of downtime. Adding a column with a constant default is cheap in modern PostgreSQL, but adding an index normally blocks writes unless you create it concurrently, and adding a constraint can require scanning the table. Test timing on production-sized data and check the documentation for your database version.",
      "Always plan how to go back. Not every migration can be reversed, because dropped data cannot be restored, so prefer additive changes and take a backup before destructive ones. Add a check in your pipeline that applies all migrations to an empty database and runs your tests, so a broken migration is found on a pull request and not at deploy time.",
    ],
    keyIdeas: ["Migrations are versioned code, reviewed and tested", "Expand, migrate, then contract; never rename in one step", "Know which operations lock large tables", "Prefer additive changes; back up before destructive ones"],
    example: {
      title: "Renaming a column without downtime (PostgreSQL)",
      lang: "sql",
      code: `-- Goal: rename users.fullname to users.display_name with zero downtime

-- STEP 1 (expand): add the new column. Old code ignores it.
ALTER TABLE users ADD COLUMN display_name text;

-- STEP 2: deploy code that writes BOTH columns and reads display_name,
--         falling back to fullname when display_name is null.

-- STEP 3 (backfill in small batches to avoid long locks)
UPDATE users SET display_name = fullname
WHERE id IN (SELECT id FROM users WHERE display_name IS NULL LIMIT 5000);
-- repeat until zero rows are updated

-- STEP 4: add the index without blocking writes
CREATE INDEX CONCURRENTLY idx_users_display_name ON users (display_name);

-- STEP 5 (contract): after all code uses display_name and a safe waiting period
ALTER TABLE users DROP COLUMN fullname;`,
      walkthrough: ["Each step is safe on its own, so a rollback at any point leaves the application working.", "Backfilling in batches keeps locks short and replication lag low.", "The destructive drop comes last, after confirming nothing reads the old column."],
    },
    practice: [
      { task: "Plan the expand and contract steps for splitting an address text column into street, city and postcode columns.", hint: "Write each step and which code version is deployed at that moment." },
      { task: "Time CREATE INDEX with and without CONCURRENTLY on a table with a million rows, and observe what happens to writes in a second session.", hint: "A normal index build blocks inserts; the concurrent one does not." },
    ],
    quiz: [
      { q: "Why not rename a column in a single migration during a rolling deploy?", options: ["Databases forbid renames", "Old application instances still reference the old name and will fail", "It takes too much disk", "It changes the primary key"], answer: 1, why: "During a deploy, old and new code run together, so the schema must work for both." },
      { q: "What does expand and contract mean?", options: ["Compressing tables", "Add the new structure, migrate usage, then remove the old structure", "Splitting a database in two", "Scaling servers up and down"], answer: 1, why: "It breaks one breaking change into a series of compatible steps." },
      { q: "Why backfill data in batches?", options: ["It is required by SQL", "To keep locks short and avoid overloading the database", "To reduce disk usage", "To skip backups"], answer: 1, why: "One giant update can hold locks and generate huge write load; small batches are gentle." },
    ],
    pitfalls: ["Editing production by hand", "Running a long blocking migration at peak traffic", "Dropping data with no backup and no way back"],
  },
  {
    id: "sd-pagination",
    familyId: "software-development",
    module: "Backend depth",
    title: "Pagination and idempotent APIs",
    minutes: 35,
    objectives: ["Choose between offset and cursor pagination", "Make write endpoints safe to retry", "Return consistent, predictable errors"],
    explain: [
      "Any list endpoint that can grow needs pagination, and the way you do it matters. Offset pagination, with page numbers or an offset and limit, is simple and lets users jump to a page, but it gets slower on deep pages because the database still walks past all skipped rows, and it can skip or repeat items when rows are inserted while someone is paging. Cursor pagination, also called keyset pagination, returns items after a given position, so every page costs the same and results stay stable.",
      "A cursor is usually the sort key of the last item, such as its created time plus id as a tiebreaker, encoded so clients treat it as opaque. The query asks for rows after that key in the same order and fetches one more than the page size to know whether another page exists. Always sort by a unique, indexed combination, otherwise ties make the order ambiguous and rows can be lost between pages.",
      "Networks fail, so clients retry, and retries must not create duplicates. An operation is idempotent if doing it twice has the same effect as doing it once. GET and PUT are naturally idempotent; POST is not, so for creation, such as payments, accept an idempotency key from the client. The server stores the key with the result, and when it sees the same key again it returns the saved result instead of repeating the work.",
      "Finish with predictable errors. Use the right status codes, 400 for invalid input, 401 and 403 for authentication and permission problems, 404 for missing resources, 409 for conflicts and 429 for rate limits, and return a consistent JSON body with a stable error code and a human-readable message. Clients can then handle failures programmatically, and your own logs stay searchable.",
    ],
    keyIdeas: ["Cursor pagination is stable and fast; offset is simple but degrades", "Sort by a unique indexed key", "Idempotency keys make creation safe to retry", "Consistent status codes and error bodies"],
    example: {
      title: "A cursor-paginated query and an idempotent create",
      lang: "sql",
      code: `-- Keyset pagination: newest first, tiebreak on id
-- Index: CREATE INDEX idx_posts_created_id ON posts (created_at DESC, id DESC);
SELECT id, title, created_at
FROM posts
WHERE (created_at, id) < ($1, $2)       -- cursor from the previous page
ORDER BY created_at DESC, id DESC
LIMIT 21;                                -- page size 20 plus one to detect a next page

-- Idempotent create: the same key returns the same result
CREATE TABLE idempotency_keys (
  key         text PRIMARY KEY,
  request_hash text NOT NULL,
  response    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- In the handler (pseudocode):
--   1. look up the key; if found and the request hash matches, return the stored response
--   2. if found with a different hash, return 422 (key reused for another request)
--   3. otherwise do the work and insert the key and response in the same transaction`,
      walkthrough: ["The tuple comparison uses the composite index, so a deep page is as fast as the first.", "Fetching one extra row tells you whether a next page exists without a separate count.", "Storing the response with the key and doing both in one transaction prevents duplicates from retries."],
    },
    practice: [
      { task: "Convert an offset-paginated endpoint to cursor pagination and measure the query time on page 1 versus page 5,000.", hint: "Use EXPLAIN to confirm the index is used." },
      { task: "Add an idempotency key to a create endpoint and test it by sending the same request three times in parallel.", hint: "Only one record should exist, and all three responses should match." },
    ],
    quiz: [
      { q: "Why does offset pagination slow down on deep pages?", options: ["JSON is larger", "The database still has to scan and skip all earlier rows", "Indexes stop working", "Browsers limit page depth"], answer: 1, why: "OFFSET N reads and discards N rows before returning results." },
      { q: "Which HTTP method is not naturally idempotent?", options: ["GET", "PUT", "DELETE", "POST"], answer: 3, why: "Repeating a POST typically creates another resource, so it needs an idempotency key." },
      { q: "Why add a unique tiebreaker such as id to the sort order?", options: ["To make the query faster", "To keep a stable total order so no rows are skipped or duplicated", "To reduce storage", "It is required by SQL"], answer: 1, why: "If several rows share the same timestamp, their relative order must be deterministic." },
    ],
    pitfalls: ["Returning a total count on every page of a huge table", "Using POST for creation with no retry protection", "Leaking internal errors in responses"],
  },
  {
    id: "sd-jobs",
    familyId: "software-development",
    module: "Backend depth",
    title: "Background jobs, retries and dead letters",
    minutes: 35,
    objectives: ["Decide what belongs in a background job", "Design jobs that are safe to run more than once", "Handle failure with backoff and a dead-letter list"],
    explain: [
      "A web request should answer quickly. Anything slow, unreliable or not needed to produce the response, such as sending email, generating a report, resizing an image or calling a third-party service, belongs in a background job. The request records the work in a queue and returns immediately, and a separate worker process picks the job up. This keeps pages fast, smooths traffic spikes and lets you retry failures without the user waiting.",
      "Queues deliver at least once, which means a job can run twice, for example if a worker crashes after finishing the work but before acknowledging it. So write jobs to be idempotent: check whether the work is already done before doing it, use a unique key for side effects such as an email send, and make database writes safe to repeat. Pass identifiers in the job, not large objects, and load fresh data when the job runs.",
      "Failures are normal, so plan for them. Retry transient errors with exponential backoff and a little random jitter, so a failing dependency is not hammered and a crowd of retries does not arrive at once. Cap the number of attempts. Jobs that still fail go to a dead-letter queue, which is a holding area where someone can inspect the payload, fix the cause and replay it, instead of the job disappearing or retrying forever.",
      "Make jobs observable. Log the job id, attempt number and duration, record metrics for queue depth and age of the oldest job, and alert when work is piling up. Set a timeout so a stuck job cannot block a worker. A queue you cannot see into becomes a place where failures hide for weeks, so treat monitoring as part of the feature.",
    ],
    keyIdeas: ["Move slow or unreliable work out of the request", "At-least-once delivery means jobs must be idempotent", "Retry with backoff and jitter, then dead-letter", "Monitor queue depth, age and failures"],
    example: {
      title: "An idempotent email job with retries",
      lang: "javascript",
      code: `// Enqueue from the request handler: store ids, not objects
await queue.add("send-welcome-email", { userId }, {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },   // 2s, 4s, 8s, ...
  removeOnComplete: true,
  removeOnFail: false,                              // keep failures for inspection
});

// Worker
worker.process("send-welcome-email", async (job) => {
  const user = await db.user.findUnique({ where: { id: job.data.userId } });
  if (!user) return;                                 // user deleted: nothing to do

  // Idempotency: a unique row records that this email was sent
  const claimed = await db.sentEmail.createMany({
    data: [{ userId: user.id, template: "welcome" }],
    skipDuplicates: true,
  });
  if (claimed.count === 0) return;                   // already sent on a previous attempt

  await mailer.send({ to: user.email, template: "welcome" });
});

// After the final failed attempt the job stays in the failed set (dead letter).
// Alert on its size and provide a way to replay jobs after the cause is fixed.`,
      walkthrough: ["Only the user id is queued, so the job always reads current data.", "The unique record makes a repeated attempt exit early instead of emailing twice.", "Failed jobs are kept, so you can inspect them and replay after fixing the cause."],
    },
    practice: [
      { task: "Add a background job to a project that sends an email or generates a file. Kill the worker mid-job and confirm that nothing is duplicated when it restarts.", hint: "You need a unique record or key that makes the side effect idempotent." },
      { task: "Write the alert rules for your queue: what depth, age and failure rate should wake someone up?", hint: "Alert on the age of the oldest job, not just the count." },
    ],
    quiz: [
      { q: "Why must background jobs be idempotent?", options: ["Queues are slow", "Delivery is at least once, so a job may run more than once", "Workers run on one CPU", "Jobs cannot read the database"], answer: 1, why: "Crashes and retries mean the same job can be delivered again after partially or fully completing." },
      { q: "What is jitter in retry logic?", options: ["A type of error", "Random variation added to delays so retries do not all arrive together", "A faster queue", "A job priority"], answer: 1, why: "Without jitter, many failing jobs retry at the same instant and can overload the recovering dependency." },
      { q: "What is a dead-letter queue for?", options: ["Deleting old jobs", "Holding jobs that exhausted their retries so they can be inspected and replayed", "Prioritising jobs", "Encrypting jobs"], answer: 1, why: "It prevents silent loss and endless retries, giving people a place to fix and replay failures." },
    ],
    pitfalls: ["Putting entire objects in the job payload", "Infinite retries with no backoff", "No visibility into queue depth or failures"],
  },
];

export const DATABASE_LESSONS: Lesson[] = [
  {
    id: "db-normalization",
    familyId: "database-architecture",
    module: "Relational design and SQL mastery",
    title: "Normalisation: designing tables that stay correct",
    minutes: 40,
    objectives: ["Spot update, insert and delete anomalies", "Normalise a table to third normal form", "Decide when denormalising is justified"],
    explain: [
      "Normalisation is organising data so each fact is stored once, in the right place. When the same fact appears in many rows, an update must touch every copy, and a missed one leaves the database contradicting itself. These are update anomalies. Insert anomalies mean you cannot record one fact without another, and delete anomalies mean removing one fact accidentally removes another. A well-designed schema makes such contradictions impossible by construction.",
      "The rules build on each other. First normal form requires atomic values: no lists of tags crammed into a single column and no repeating groups. Second normal form says every non-key column must depend on the whole key, which matters when the key has several columns. Third normal form says non-key columns must depend only on the key, not on other non-key columns; a customer's city should not live in the orders table if it is determined by the customer.",
      "A practical way to apply this is to ask of every column: what does this value describe? If it describes the customer, it belongs in a customers table, referenced from orders by a foreign key. Use primary keys to identify rows, foreign keys to enforce relationships, unique constraints for natural identifiers, and check constraints for valid values. Constraints are the database defending its own correctness, independent of how many applications write to it.",
      "Denormalisation, copying data to avoid joins, is a performance tool and not a starting point. It is justified for read-heavy reporting, for caching values like an order total, or for storing a historical snapshot, such as the price at the time of purchase, which must not change when the product price changes. When you denormalise, decide which copy is authoritative and how the others are kept in sync.",
    ],
    keyIdeas: ["One fact in one place", "1NF atomic values; 2NF whole key; 3NF only the key", "Constraints enforce correctness at the source", "Denormalise deliberately and document the source of truth"],
    example: {
      title: "From a messy table to a clean schema",
      lang: "sql",
      code: `-- Messy: customer details and product details repeated on every row
-- orders(order_id, customer_name, customer_city, product_name, product_price, qty)

-- Normalised
CREATE TABLE customers (
  customer_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL,
  city         text NOT NULL
);

CREATE TABLE products (
  product_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL UNIQUE,
  price_cents  integer NOT NULL CHECK (price_cents >= 0)
);

CREATE TABLE orders (
  order_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  bigint NOT NULL REFERENCES customers,
  placed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id     bigint NOT NULL REFERENCES orders ON DELETE CASCADE,
  product_id   bigint NOT NULL REFERENCES products,
  qty          integer NOT NULL CHECK (qty > 0),
  -- deliberate denormalisation: price at the time of purchase must not change later
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY (order_id, product_id)
);`,
      walkthrough: ["A customer's city is stored once, so a move is a single update.", "Foreign keys and checks make invalid data impossible instead of unlikely.", "unit_price_cents is copied on purpose, because history must not change when prices do."],
    },
    practice: [
      { task: "Take a spreadsheet you use and identify three update anomalies. Redesign it as tables with keys and constraints.", hint: "Ask what each column describes and where that fact should live." },
      { task: "List three denormalised columns in a system you know and explain why each exists and which copy is the source of truth.", hint: "A snapshot of a historical value is a legitimate reason; convenience alone usually is not." },
    ],
    quiz: [
      { q: "A table stores a customer's city on every order row. What problem does this create?", options: ["Faster queries always", "Update anomalies: changing the city must update many rows", "Missing indexes", "Lost foreign keys"], answer: 1, why: "Repeated facts can fall out of sync when only some copies are updated." },
      { q: "Third normal form says non-key columns should depend on...", options: ["Any other column", "Only the key", "The table name", "A random column"], answer: 1, why: "Non-key columns depending on other non-key columns indicates a fact that belongs in its own table." },
      { q: "Why store the unit price on an order item even though products have a price?", options: ["By mistake", "The historical price at purchase must not change when the product price changes", "To save space", "Because SQL requires it"], answer: 1, why: "It is a deliberate snapshot of a historical fact, not duplicated current state." },
    ],
    pitfalls: ["Storing comma-separated lists in a column", "Skipping foreign keys because the application checks", "Denormalising before measuring a real performance problem"],
  },
  {
    id: "db-query-plans",
    familyId: "database-architecture",
    module: "Performance and indexing",
    title: "Reading query plans and choosing indexes",
    minutes: 40,
    objectives: ["Read EXPLAIN ANALYZE output", "Tell when a sequential scan is fine and when it is a problem", "Design an index that matches a query"],
    explain: [
      "A query plan is the database's strategy for answering your query, and reading it is the core skill of performance work. In PostgreSQL, EXPLAIN shows the plan and EXPLAIN ANALYZE actually runs the query and reports real timings and row counts next to the estimates. The plan is a tree: each node is an operation such as scanning a table, joining two inputs or sorting, and the cost flows from the leaves upward.",
      "Look first at the scans. A sequential scan reads the whole table; on a small table that is perfectly fine and often the fastest option, but on a large table where the query returns a few rows it signals a missing index. An index scan or index-only scan uses an index to jump to matching rows. Also compare estimated rows with actual rows: a large gap means the planner's statistics are stale or misleading, and ANALYZE can refresh them.",
      "Design indexes from the query. Put equality columns first and the range or sort column last in a multi-column index, because the index is ordered by its columns from left to right. An index on (customer_id, created_at) serves filtering by customer and sorting by time, but not filtering by created_at alone. A partial index covers only the rows you query, such as unfinished orders, and an index-only scan can answer a query from the index without touching the table at all.",
      "Indexes are not free. Each one slows down inserts and updates, takes disk space and must be maintained, so add them for real queries and drop unused ones. Beware of things that stop an index being used: wrapping the indexed column in a function, comparing different types, or a leading wildcard in a text search. Always verify with EXPLAIN ANALYZE before and after, on data of realistic size.",
    ],
    keyIdeas: ["EXPLAIN ANALYZE shows real time and row counts", "Sequential scans are fine on small tables, suspicious on large ones", "Multi-column indexes: equality first, then range or sort", "Every index slows writes; verify before and after"],
    example: {
      title: "From a sequential scan to an index scan",
      lang: "sql",
      code: `-- Slow query: orders for one customer, newest first
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id, total_cents, created_at
FROM orders
WHERE customer_id = 4821
ORDER BY created_at DESC
LIMIT 20;

-- Plan (before):  Seq Scan on orders  (actual time=412.3..412.3 rows=20)
--                 Rows Removed by Filter: 2,399,980   <- reading the whole table

-- Create an index that matches the filter AND the sort
CREATE INDEX CONCURRENTLY idx_orders_customer_created
  ON orders (customer_id, created_at DESC);

-- Plan (after):   Index Scan using idx_orders_customer_created
--                 (actual time=0.05..0.12 rows=20)

-- A partial index for a hot subset of rows
CREATE INDEX idx_orders_open ON orders (created_at)
  WHERE status = 'open';

-- This defeats a normal index on email because of the function call:
--   WHERE lower(email) = 'a@b.com'
-- Fix with an expression index:
CREATE INDEX idx_users_lower_email ON users (lower(email));`,
      walkthrough: ["The plan before shows nearly 2.4 million rows read and discarded to return 20.", "The composite index matches both the filter and the sort, so the database reads exactly 20 rows in order.", "Expression and partial indexes fit specific query shapes without indexing everything."],
    },
    practice: [
      { task: "Create a table with a million rows, run a selective query, and capture the plan before and after adding the right index.", hint: "Use generate_series to build test data." },
      { task: "Find a query where an index exists but is not used and explain why.", hint: "Check for a function on the column, a type mismatch, or a query returning most of the table." },
    ],
    quiz: [
      { q: "For WHERE customer_id = ? ORDER BY created_at DESC, which index fits best?", options: ["(created_at)", "(customer_id, created_at DESC)", "(created_at, customer_id)", "Two separate single-column indexes always"], answer: 1, why: "The equality column goes first and the sort column second, so the index returns rows already in order." },
      { q: "A sequential scan on a 200-row table is...", options: ["Always a bug", "Often the fastest choice", "Impossible", "A sign of corruption"], answer: 1, why: "For tiny tables reading everything is cheaper than using an index." },
      { q: "What does a big gap between estimated and actual rows suggest?", options: ["A faster disk", "Stale or misleading statistics", "A network error", "A missing foreign key"], answer: 1, why: "The planner chose its strategy from bad estimates; run ANALYZE or investigate correlated columns." },
    ],
    pitfalls: ["Adding an index per column without checking the queries", "Testing on tiny datasets", "Ignoring write overhead of many indexes"],
  },
  {
    id: "db-restore",
    familyId: "database-architecture",
    module: "Reliability: backup, replication and recovery",
    title: "Backups you have actually restored",
    minutes: 30,
    objectives: ["Explain RPO and RTO and how they drive backup design", "Combine base backups with log archiving for point-in-time recovery", "Run a restore drill and record the result"],
    explain: [
      "A backup you have never restored is a hope, not a backup. Many teams discover during an emergency that their backups are empty, corrupt, incomplete or missing the one setting needed to restore them. The only way to know is to restore regularly and check the result. Treat the restore as the product and the backup as the means.",
      "Two numbers shape the design. The recovery point objective, or RPO, is how much recent data you can afford to lose, measured in time. The recovery time objective, or RTO, is how long you can afford to be down while recovering. A nightly backup gives an RPO of up to a day; continuous archiving of the write-ahead log can bring that to seconds. A small database restores quickly, while a multi-terabyte one may take hours, which has to fit within your RTO.",
      "The standard approach combines a periodic base backup of the data files with continuous archiving of the transaction log. To recover, you restore the base backup and then replay the log up to a chosen moment, which is called point-in-time recovery. That lets you recover to just before a bad deployment or an accidental delete, which a nightly snapshot alone cannot do. Store backups in a different location and account than the primary, encrypt them, and restrict who can delete them.",
      "Schedule restore drills. At least regularly, restore into a clean environment, run integrity checks and a few known queries, measure the elapsed time and compare it with your RTO. Write a runbook with exact commands, so that whoever is on call can follow it under stress. Replicas are not backups: a replica faithfully copies a mistake, such as a dropped table, within moments.",
    ],
    keyIdeas: ["Untested backups are not backups", "RPO is tolerable data loss; RTO is tolerable downtime", "Base backup plus log archive enables point-in-time recovery", "Replicas are not backups; keep copies elsewhere and restrict deletion"],
    example: {
      title: "A restore drill record (PostgreSQL-style)",
      lang: "bash",
      code: `# Monthly drill: restore production backup into a throwaway server
set -euo pipefail
START=$(date +%s)

# 1. Fetch the latest base backup and WAL archive from the backup bucket
backup-tool restore --target /var/lib/postgresql/drill --latest

# 2. Recover to a chosen moment (e.g. just before the incident time)
cat >> /var/lib/postgresql/drill/postgresql.auto.conf <<'CONF'
recovery_target_time = '2026-03-14 09:55:00+00'
recovery_target_action = 'promote'
CONF
touch /var/lib/postgresql/drill/recovery.signal
pg_ctl -D /var/lib/postgresql/drill start

# 3. Verify: schema present, recent rows exist, sanity counts match expectations
psql -d app -c "SELECT count(*) FROM orders WHERE created_at < '2026-03-14 09:55';"
psql -d app -c "SELECT max(created_at) FROM orders;"

END=$(date +%s)
echo "Restore took $((END-START)) seconds"   # compare with the RTO and log it`,
      walkthrough: ["The drill restores from the same storage that production backups use, so the whole chain is tested.", "recovery_target_time demonstrates point-in-time recovery to just before a mistake.", "Recording the elapsed time shows whether you can meet your RTO."],
    },
    practice: [
      { task: "Write down your RPO and RTO for a system you know. Check whether the current backup design can meet them.", hint: "Include how long a restore takes at current data size." },
      { task: "Run a restore of a small database into a clean machine and write a runbook from what you actually did.", hint: "Note every command and every surprise." },
    ],
    quiz: [
      { q: "What does RPO measure?", options: ["How fast you can restore", "How much recent data you can afford to lose", "Database size", "Number of replicas"], answer: 1, why: "Recovery point objective is the maximum acceptable data loss, expressed as time." },
      { q: "Why is a replica not a substitute for backups?", options: ["Replicas are slow", "It copies mistakes such as deletes almost immediately", "Replicas cannot store data", "Replicas are read-only forever"], answer: 1, why: "A bad change replicates to the standby, so you need an independent point-in-time copy." },
      { q: "What lets you recover to just before a bad deployment?", options: ["A nightly snapshot only", "A base backup plus archived transaction logs", "A bigger server", "More indexes"], answer: 1, why: "Replaying logs to a chosen time gives point-in-time recovery." },
    ],
    pitfalls: ["Backups stored in the same account and region as production", "Never testing a restore", "No runbook for the person on call"],
  },
  {
    id: "db-isolation",
    familyId: "database-architecture",
    module: "Relational design and SQL mastery",
    title: "Transactions and isolation levels",
    minutes: 40,
    objectives: ["Explain ACID in practical terms", "Recognise lost updates and write skew", "Pick locking or isolation to prevent them"],
    explain: [
      "A transaction groups several statements so they succeed or fail together. ACID summarises the promises: atomicity means all or nothing, consistency means constraints hold before and after, isolation means concurrent transactions do not see each other's half-finished work, and durability means committed data survives a crash. Moving money between accounts needs a transaction, because losing the credit after taking the debit would be a disaster.",
      "Isolation is a spectrum. At the weakest levels you can see anomalies: a dirty read sees another transaction's uncommitted change, a non-repeatable read gets different results when it reads the same row twice, and a phantom read sees new rows appear between two identical queries. PostgreSQL's default, read committed, avoids dirty reads but allows the others. Repeatable read gives each transaction a stable snapshot, and serializable makes the outcome equal to running the transactions one at a time, at the cost of occasional serialisation failures that your code must retry.",
      "The most common real bug is the lost update. Two requests read a balance of 100, each adds 10 in application code and writes 110, so one increment disappears. Fixes include doing the arithmetic in the database with a single UPDATE, locking the row with SELECT FOR UPDATE so the second transaction waits, using optimistic concurrency with a version column that must match, or running at serializable and retrying on failure. Another is write skew, where two transactions each check a rule that holds, such as at least one doctor on call, and then both make a change that breaks it together.",
      "Keep transactions short. A transaction that waits for a user, a network call or a slow job holds locks and blocks others, and long ones prevent cleanup of old row versions. Do your reads, decisions and writes quickly, avoid external calls inside a transaction, and acquire locks in a consistent order to avoid deadlocks. When a deadlock or serialisation error occurs, the correct response is to retry the whole transaction.",
    ],
    keyIdeas: ["ACID: atomic, consistent, isolated, durable", "Higher isolation prevents more anomalies at more cost", "Lost updates: use atomic updates, row locks or version checks", "Short transactions; retry on deadlock or serialisation failure"],
    example: {
      title: "Three ways to prevent a lost update",
      lang: "sql",
      code: `-- BUG: read-modify-write in application code
--   balance = SELECT balance FROM accounts WHERE id = 1;   -- both read 100
--   UPDATE accounts SET balance = <balance + 10> WHERE id = 1; -- both write 110

-- Fix 1: let the database do the arithmetic atomically
UPDATE accounts SET balance = balance + 10 WHERE id = 1;

-- Fix 2: lock the row for the duration of the transaction
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- others wait here
UPDATE accounts SET balance = balance + 10 WHERE id = 1;
COMMIT;

-- Fix 3: optimistic concurrency with a version column
UPDATE accounts
SET balance = 110, version = version + 1
WHERE id = 1 AND version = 7;     -- 0 rows updated means someone else changed it: re-read and retry

-- Strongest option: serializable, and retry on failure (SQLSTATE 40001)
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... statements ...
COMMIT;`,
      walkthrough: ["The single UPDATE is atomic, so concurrent increments both apply.", "FOR UPDATE makes the second transaction wait until the first commits.", "The version check detects interference without holding locks while the user thinks."],
    },
    practice: [
      { task: "Open two database sessions and reproduce a lost update with a read-then-write sequence. Then apply each of the three fixes.", hint: "Interleave the statements by hand across the two sessions." },
      { task: "Describe a write skew scenario in a booking system and how serializable isolation or a constraint would stop it.", hint: "Think of two bookings that each pass a capacity check but together exceed capacity." },
    ],
    quiz: [
      { q: "Two requests read balance 100 and each write back 110. What happened?", options: ["A deadlock", "A lost update", "A dirty read", "A phantom"], answer: 1, why: "One increment overwrote the other because both worked from the same stale read." },
      { q: "What should your code do after a serialisation failure or deadlock error?", options: ["Ignore it", "Retry the whole transaction", "Switch to a lower isolation level silently", "Delete the row"], answer: 1, why: "These errors are expected under concurrency; the transaction is safe to retry from the start." },
      { q: "Why avoid network calls inside a transaction?", options: ["Networks are insecure", "It holds locks while waiting and blocks other work", "Transactions cannot use sockets", "It uses more memory"], answer: 1, why: "Long-held locks reduce concurrency and can cause deadlocks and timeouts." },
    ],
    pitfalls: ["Read-modify-write in application code", "Long transactions that wait on users or services", "Treating serializable as free, with no retry logic"],
  },
];

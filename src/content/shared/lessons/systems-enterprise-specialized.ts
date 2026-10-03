import type { Lesson } from "./types";

export const SYSTEMS_LESSONS: Lesson[] = [
  {
    id: "sys-pointers",
    familyId: "systems-hardware",
    module: "C and memory",
    title: "Pointers, the stack and the heap",
    minutes: 40,
    objectives: ["Explain what a pointer is and what it points to", "Tell stack memory from heap memory and their lifetimes", "Avoid leaks, dangling pointers and buffer overruns"],
    explain: [
      "Memory is a long row of numbered bytes, and a pointer is simply a variable that holds one of those numbers: an address. The type of the pointer tells the compiler how to interpret the bytes at that address and how far to move when you add one. Writing int *p means p holds the address of an int, and *p reads or writes the int at that address. Everything in C that feels magical, from arrays to strings to linked lists, is built from this idea.",
      "A program uses two main regions for data. The stack holds local variables and function call information. It is fast and managed automatically: space appears when a function is called and vanishes when it returns, so a pointer to a local variable becomes invalid the moment the function ends. The heap holds memory you request explicitly with malloc and release with free. It lives until you free it, which is flexible but means you are responsible for its whole life.",
      "Most serious C bugs are lifetime and bounds bugs. A memory leak is heap memory you stopped pointing to without freeing it. A dangling pointer points at memory that has been freed or has gone out of scope, and using it is undefined behaviour. A buffer overrun writes past the end of an array, which corrupts neighbouring data and is a classic security vulnerability. C does not check bounds for you, so you must track sizes yourself and pass them along with pointers.",
      "Develop habits that catch these early. Initialise pointers, set them to NULL after freeing, check the result of malloc, and keep a clear rule about who owns each allocation and who frees it. Compile with warnings turned up, run your tests under AddressSanitizer and Valgrind, which detect leaks, overruns and use-after-free at runtime, and prefer functions that take a length, such as snprintf and strncpy used carefully, over their unbounded cousins.",
    ],
    keyIdeas: ["A pointer is an address; its type says how to read it", "Stack: automatic, ends with the function; heap: manual, ends at free", "Leaks, dangling pointers and overruns are the classic failures", "Use sanitizers and track ownership and sizes explicitly"],
    example: {
      title: "A growable array with correct ownership",
      lang: "c",
      code: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int    *data;
    size_t  len;
    size_t  cap;
} IntVec;

int vec_init(IntVec *v) {
    v->data = malloc(4 * sizeof *v->data);
    if (!v->data) return -1;               /* always check malloc */
    v->len = 0;
    v->cap = 4;
    return 0;
}

int vec_push(IntVec *v, int value) {
    if (v->len == v->cap) {
        size_t new_cap = v->cap * 2;
        int *bigger = realloc(v->data, new_cap * sizeof *bigger);
        if (!bigger) return -1;            /* old block is still valid on failure */
        v->data = bigger;
        v->cap = new_cap;
    }
    v->data[v->len++] = value;
    return 0;
}

void vec_free(IntVec *v) {
    free(v->data);
    v->data = NULL;                        /* avoid a dangling pointer */
    v->len = v->cap = 0;
}

int main(void) {
    IntVec v;
    if (vec_init(&v) != 0) return 1;
    for (int i = 0; i < 10; i++) vec_push(&v, i * i);
    printf("last = %d\\n", v.data[v.len - 1]);
    vec_free(&v);
    return 0;
}
/* Build and check:  gcc -Wall -Wextra -g -fsanitize=address,undefined vec.c && ./a.out */`,
      walkthrough: ["The struct owns its buffer: init allocates, push grows it, free releases it exactly once.", "realloc returns a new pointer; assigning it straight to v->data would leak the original on failure.", "Compiling with the address sanitizer reports leaks and out-of-bounds access immediately."],
    },
    practice: [
      { task: "Write a function that returns a pointer to a local variable, observe the compiler warning, and explain why it is a bug.", hint: "The stack frame is gone after return, so the address is no longer valid." },
      { task: "Introduce a deliberate off-by-one write in the vector code and see what AddressSanitizer reports.", hint: "Write to data[cap] and read the stack trace it prints." },
    ],
    quiz: [
      { q: "What is a dangling pointer?", options: ["A pointer to NULL", "A pointer to memory that is no longer valid", "A pointer to a function", "A constant pointer"], answer: 1, why: "It refers to freed or out-of-scope memory; using it is undefined behaviour." },
      { q: "Where do local variables normally live?", options: ["The heap", "The stack", "A file", "The registry"], answer: 1, why: "Locals live in the function's stack frame, which disappears on return." },
      { q: "Why assign realloc's result to a temporary pointer first?", options: ["It is faster", "If realloc fails, the original pointer would otherwise be lost and leaked", "The compiler requires it", "It avoids alignment"], answer: 1, why: "On failure realloc returns NULL but leaves the old block valid; overwriting your only pointer leaks it." },
    ],
    pitfalls: ["Returning the address of a local variable", "Forgetting that C does not check array bounds", "Freeing memory twice or using it after free"],
  },
  {
    id: "sys-races",
    familyId: "systems-hardware",
    module: "Operating systems and computer architecture",
    title: "Threads, race conditions and locks",
    minutes: 40,
    objectives: ["Explain why shared mutable state needs synchronisation", "Use a mutex to protect a critical section", "Recognise deadlock and how to avoid it"],
    explain: [
      "Threads in one process share the same memory, which makes communication cheap and bugs subtle. A race condition occurs when the result depends on the order in which threads happen to run. The classic example is incrementing a shared counter. The statement counter++ looks like one step but is really three: read the value, add one, write it back. If two threads interleave those steps, both can read the same value and one increment is lost.",
      "A critical section is a piece of code that touches shared data and must not be run by two threads at once. A mutex, short for mutual exclusion, enforces that: a thread locks it before entering, other threads that try to lock it wait, and the thread unlocks it on the way out. Keep critical sections as small as possible, because everything inside is serialised, and always unlock on every path, including error paths.",
      "Locks introduce their own failure, deadlock. If thread A holds lock 1 and waits for lock 2 while thread B holds lock 2 and waits for lock 1, neither can ever proceed. The standard prevention is to define a global order for acquiring locks and always follow it. Other tools include holding only one lock at a time, using timeouts, and designing data so threads share less. The less shared mutable state, the fewer locks you need, and message passing or per-thread data often replaces them.",
      "Testing concurrency is hard because bugs appear only under unlucky timing. Use tools designed for the job, such as ThreadSanitizer, which detects data races at runtime, and stress tests that run many threads for many iterations. Treat any unsynchronised access to shared data as a bug, even if it has never failed on your machine; it is only waiting for different hardware, a heavier load or a different compiler optimisation.",
    ],
    keyIdeas: ["counter++ is read, modify, write: not atomic", "Protect shared data with a mutex; keep sections short", "Avoid deadlock with a consistent lock order", "Detect races with ThreadSanitizer and stress tests"],
    example: {
      title: "A racy counter and the fix (POSIX threads)",
      lang: "c",
      code: `#include <pthread.h>
#include <stdio.h>

#define THREADS 4
#define ITERATIONS 1000000

static long counter = 0;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

/* RACY: increments can be lost */
void *racy(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++) counter++;
    return NULL;
}

/* SAFE: the critical section is protected */
void *safe(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++) {
        pthread_mutex_lock(&lock);
        counter++;
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

static long run(void *(*fn)(void *)) {
    pthread_t t[THREADS];
    counter = 0;
    for (int i = 0; i < THREADS; i++) pthread_create(&t[i], NULL, fn, NULL);
    for (int i = 0; i < THREADS; i++) pthread_join(t[i], NULL);
    return counter;
}

int main(void) {
    printf("racy: %ld (expected %d)\\n", run(racy), THREADS * ITERATIONS);
    printf("safe: %ld (expected %d)\\n", run(safe), THREADS * ITERATIONS);
    return 0;
}
/* Build:  gcc -O0 -pthread race.c   (then try: gcc -O0 -pthread -fsanitize=thread race.c) */`,
      walkthrough: ["On a multi-core machine the racy version usually prints less than 4,000,000 because increments overwrite each other. On a single core, or when the compiler optimises the loop, you may get the right total by luck. That does not make it safe: it only means the bug is hiding.", "The mutex makes each increment exclusive, so the total is always exact, at some speed cost.", "Rebuilding with -fsanitize=thread reports the data race in the unprotected version, even on runs where the total happens to be correct."],
    },
    practice: [
      { task: "Run the example several times and note how the racy total varies. Then change the number of threads and observe the effect.", hint: "More threads and iterations make lost updates more frequent. If your total is always correct, check how many cores you have and run ThreadSanitizer, which reports the race regardless." },
      { task: "Write two functions that each lock two mutexes in opposite order to cause a deadlock, then fix it with a consistent order.", hint: "Add a short sleep between the two locks to make it reproducible." },
    ],
    quiz: [
      { q: "Why can counter++ lose updates across threads?", options: ["It is a single atomic instruction on all CPUs", "It is read, modify and write steps that can interleave", "Compilers delete it", "Threads have separate counters"], answer: 1, why: "Two threads can read the same old value and both write back the same new value." },
      { q: "Which rule prevents deadlock between two locks?", options: ["Lock in a random order", "Always acquire locks in the same global order", "Never unlock", "Use more threads"], answer: 1, why: "A consistent ordering removes the circular wait that deadlock requires." },
      { q: "What does ThreadSanitizer do?", options: ["Speeds up threads", "Detects data races at runtime", "Compiles faster", "Encrypts memory"], answer: 1, why: "It instruments memory accesses and reports unsynchronised conflicting accesses." },
    ],
    pitfalls: ["Assuming a race that has never failed is safe", "Holding a lock while doing slow I/O", "Forgetting to unlock on an error path"],
  },
  {
    id: "sys-subnet",
    familyId: "systems-hardware",
    module: "Networking essentials",
    title: "Subnetting without panic",
    minutes: 35,
    objectives: ["Read CIDR notation and compute network size", "Split a block into equal subnets", "Find the network, broadcast and usable range for an address"],
    explain: [
      "An IPv4 address has 32 bits, shown as four numbers from 0 to 255. A subnet mask says how many of those bits identify the network and how many identify the host. CIDR notation writes this as a slash and a number: /24 means the first 24 bits are the network and the remaining 8 bits are for hosts. The more network bits, the smaller the subnet. A /24 has 8 host bits, so 2 to the power 8, or 256, addresses.",
      "In each subnet two addresses are reserved: the first is the network address and the last is the broadcast address. So the usable host count is the total minus two. A /24 therefore gives 254 usable hosts, a /26 has 64 addresses and 62 usable hosts, and a /30 has 4 addresses and 2 usable hosts, which is why /30 is traditional for point-to-point links. Remember the pattern: every extra bit in the prefix halves the size.",
      "To subnet, decide how many subnets or hosts you need, then choose the prefix. To split 192.168.10.0/24 into four equal subnets you borrow two bits and get /26 networks. Each has 64 addresses, so they start at .0, .64, .128 and .192. For any address, find which block of 64 it falls into: 192.168.10.77 belongs to the block starting at .64, which means network 192.168.10.64, broadcast 192.168.10.127 and usable hosts .65 to .126.",
      "Private ranges are reserved for internal use and are not routed on the public internet: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. Plan address space with growth in mind and avoid overlapping ranges, because overlaps make it painful to connect networks later, for example over a VPN. Document every subnet with its purpose, and verify your arithmetic with a calculator tool or the ipcalc command until the pattern is second nature.",
    ],
    keyIdeas: ["/n means n network bits; host bits are 32 minus n", "Addresses are 2^(host bits); usable is that minus 2", "Block size shows where subnets start", "Do not overlap private ranges you may need to connect"],
    example: {
      title: "Splitting 192.168.10.0/24 into four subnets",
      lang: "text",
      code: `Need: 4 subnets, each with up to ~50 hosts
Host bits needed: 2^6 = 64 addresses >= 50 + 2 reserved  ->  6 host bits  ->  /26

Subnet  Network          Usable range                 Broadcast
1       192.168.10.0/26    192.168.10.1  - .62          192.168.10.63
2       192.168.10.64/26   192.168.10.65 - .126         192.168.10.127
3       192.168.10.128/26  192.168.10.129 - .190        192.168.10.191
4       192.168.10.192/26  192.168.10.193 - .254        192.168.10.255

Check one address: 192.168.10.77
  block size 64 -> 77 falls in 64..127
  network = 192.168.10.64, broadcast = 192.168.10.127

Quick facts
  /24 -> 256 addresses, 254 usable      mask 255.255.255.0
  /26 -> 64  addresses, 62  usable      mask 255.255.255.192
  /30 -> 4   addresses, 2   usable      mask 255.255.255.252

Verify on the command line:  ipcalc 192.168.10.77/26`,
      walkthrough: ["Choose the smallest prefix whose usable host count covers your need.", "The block size is the step between network addresses: 64 for a /26.", "Always subtract the network and broadcast addresses when counting hosts."],
    },
    practice: [
      { task: "Design addressing for three offices needing 100, 50 and 20 hosts from 10.20.0.0/24. Write each subnet's range.", hint: "Allocate the largest subnet first: /25, then /26, then /27." },
      { task: "Given 172.16.5.200/27, find the network, broadcast and usable range.", hint: "A /27 has a block size of 32; 200 falls in the block starting at 192." },
    ],
    quiz: [
      { q: "How many usable hosts does a /26 provide?", options: ["64", "62", "30", "254"], answer: 1, why: "A /26 has 64 addresses; subtracting network and broadcast leaves 62." },
      { q: "192.168.10.77/26 belongs to which network?", options: ["192.168.10.0", "192.168.10.64", "192.168.10.128", "192.168.10.77"], answer: 1, why: "Blocks of 64 start at 0, 64, 128 and 192, and 77 falls in the block starting at 64." },
      { q: "Why avoid overlapping private ranges between sites?", options: ["Routers refuse to start", "They make connecting the networks later ambiguous and difficult", "Overlaps are illegal", "They slow down DNS"], answer: 1, why: "Identical addresses on both sides cannot be routed unambiguously without translation." },
    ],
    pitfalls: ["Forgetting to subtract the network and broadcast addresses", "Planning exactly for today's host count with no growth", "Using the same range at two sites you will later join"],
  },
];

export const ENTERPRISE_LESSONS: Lesson[] = [
  {
    id: "ent-process-data",
    familyId: "enterprise-technology",
    module: "Business process and data fundamentals",
    title: "Mapping a business process to data",
    minutes: 35,
    objectives: ["Describe a process as steps, actors and handoffs", "Identify the data objects each step creates or changes", "Spot where automation and controls belong"],
    explain: [
      "Enterprise software exists to support business processes, so the first skill is understanding one. A process is a repeatable sequence of steps that turns an input into an outcome: a customer places an order, finance approves a purchase, a warehouse ships the goods, an invoice is raised and the payment is collected. Before touching any system, write the process as a simple flow of steps, noting who performs each step, what triggers it and what the result is.",
      "Every step creates, reads or changes data, and those data objects are what you configure and report on. In a purchase process the main objects might be a purchase request, an approval, a purchase order, a goods receipt, a vendor invoice and a payment. Note the status each object moves through, such as draft, approved, received and paid, and which role is allowed to move it forward. Statuses and ownership turn a vague process into something you can model and test.",
      "Handoffs are where processes break. Wherever work passes between people or systems you will find delays, rekeying, lost information and disagreements about who owns the next move. These are the best places to look for automation, such as a workflow that routes an approval to the right person, or an integration that copies an order into the finance system. Also look for controls: separation of duties, such as the person who raises a purchase not also approving it, which auditors check.",
      "Finally, define measures. How long does the process take end to end, how often does it need rework, and where does work wait? Without numbers, you cannot tell whether a change improved anything. When you gather requirements, talk to the people who actually do the work, not only their managers, because the real process often differs from the documented one, and the differences are exactly where the interesting problems live.",
    ],
    keyIdeas: ["Write the process as steps, actors, triggers and outcomes", "Each step creates or changes data objects with statuses", "Handoffs and controls are where automation and risk concentrate", "Measure the process before and after"],
    example: {
      title: "A purchase-to-pay process map",
      lang: "text",
      code: `Step  Actor            Trigger / input          Data object (status)           Control / automation idea
1     Requester        Need identified          Purchase Request (draft)       Required fields, budget code lookup
2     Manager          Request submitted        Purchase Request (approved)    Route by amount; auto-approve under a threshold
3     Procurement      Approved request         Purchase Order (sent)          Approved vendor list check
4     Warehouse        Goods arrive             Goods Receipt (posted)         Match quantity to the order
5     Accounts payable Vendor invoice arrives   Vendor Invoice (matched)       Three-way match: order, receipt, invoice
6     Finance          Invoice matched          Payment (scheduled -> paid)    Separation of duties: approver is not requester

Measures:   request-to-order time, % invoices needing manual correction, payment on-time rate
Handoffs:   2->3 and 5->6 (watch for waiting time and lost context)
Data owner: Procurement owns vendors; Finance owns payment terms`,
      walkthrough: ["Each row gives a step, who does it and what record it affects, which is what you will model in a system.", "The control column shows where rules are enforced and where audit evidence comes from.", "The measures define how you would show that an automation actually helped."],
    },
    practice: [
      { task: "Map a process you know, such as expense claims or leave requests. List the steps, actors, data objects and statuses.", hint: "If you cannot name the owner of a step, that is a finding." },
      { task: "Pick two handoffs in your map and propose one automation and one control for each.", hint: "Consider notifications, validations, and separation of duties." },
    ],
    quiz: [
      { q: "Why record the status of each data object?", options: ["To fill space", "Statuses define how records progress and who can move them", "Databases require it", "To avoid testing"], answer: 1, why: "Status transitions and permissions are the backbone of workflow configuration." },
      { q: "Where do process problems most often occur?", options: ["Inside a single well-defined task", "At handoffs between people or systems", "In the login screen", "In the colour scheme"], answer: 1, why: "Handoffs cause waiting, rekeying and ambiguity about ownership." },
      { q: "What is separation of duties?", options: ["Using different databases", "Ensuring one person cannot complete a risky sequence alone, such as raise and approve", "Splitting teams by location", "Dividing tasks equally"], answer: 1, why: "It reduces fraud and error by requiring independent people for sensitive steps." },
    ],
    pitfalls: ["Documenting the official process instead of the real one", "Automating a broken process", "Defining no measure of success"],
  },
  {
    id: "ent-integration",
    familyId: "enterprise-technology",
    module: "Integration and APIs",
    title: "Integrations that survive failure",
    minutes: 35,
    objectives: ["Choose between request-response, batch and event-driven integration", "Design for retries, duplicates and partial failure", "Build a reconciliation check"],
    explain: [
      "Enterprise systems rarely live alone: orders flow from a shop to finance, employees from HR to payroll, tickets from support to engineering. An integration moves data between them, and the main design choice is the pattern. Request-response calls an API and waits for an answer, which suits lookups that need an immediate result. Batch integration moves files or bulk records on a schedule, which suits large volumes that are not urgent. Event-driven integration publishes a message when something happens and lets other systems react, which decouples them and handles bursts well.",
      "Whatever the pattern, assume things will fail. Networks drop, the other system is down for maintenance, a request times out after succeeding. So every integration needs retries with sensible delays, and because retries can deliver the same message twice, the receiving side must be idempotent: use a unique id from the source and ignore a repeat. Distinguish transient errors, such as a timeout, which deserve a retry, from permanent ones, such as a validation failure, which need a person to fix the data and should go to an error queue with the details.",
      "Map data carefully. Systems name and structure the same thing differently, so write down a field-by-field mapping, including formats such as dates and currencies, codes that need translating, and which system is the source of truth for each field. Version your interfaces and agree how changes are announced, because an unexpected field change in one system can silently break another.",
      "Finally, prove it works with reconciliation. At the end of each day, compare counts and totals between the two systems, for example the number of orders and their total value, and report differences. Log every message with an id and outcome so you can trace one order end to end. Integrations without monitoring and reconciliation tend to fail quietly, and the first person to notice is usually a customer or an auditor.",
    ],
    keyIdeas: ["Pick request-response, batch or events to fit urgency and volume", "Retry transient errors; send permanent errors to an error queue", "Idempotent receivers using source ids", "Reconcile counts and totals, and log with trace ids"],
    example: {
      title: "A resilient order sync with reconciliation",
      lang: "javascript",
      code: `// Receiver: idempotent, with clear error handling
async function handleOrderEvent(event) {
  const { eventId, orderId, total, currency } = event;

  // Idempotency: ignore messages we have already processed
  const seen = await db.processedEvents.findUnique({ where: { eventId } });
  if (seen) return { status: "duplicate" };

  try {
    validate(event);                                  // permanent errors throw ValidationError
    await finance.upsertInvoice({ externalId: orderId, total, currency });
    await db.processedEvents.create({ data: { eventId, orderId, outcome: "ok" } });
    return { status: "ok" };
  } catch (err) {
    if (err instanceof ValidationError) {
      await db.errorQueue.create({ data: { eventId, orderId, reason: err.message, payload: event } });
      return { status: "parked" };                    // a person fixes the data and replays it
    }
    throw err;                                        // transient: the queue will retry with backoff
  }
}

// Nightly reconciliation: counts and totals must match between systems
async function reconcile(day) {
  const [shop, fin] = await Promise.all([shopSystem.dailyTotals(day), finance.dailyTotals(day)]);
  if (shop.count !== fin.count || shop.totalCents !== fin.totalCents) {
    await alert("Order sync mismatch", { day, shop, fin });
  }
}`,
      walkthrough: ["The processed-events table makes redelivery harmless.", "Validation failures are parked with their payload for a person to fix, while transient failures are retried automatically.", "The nightly comparison catches silent loss or duplication that logs alone would miss."],
    },
    practice: [
      { task: "Design an integration between two tools you know. Choose a pattern, list the failure cases, and describe the reconciliation check.", hint: "Include what happens when the receiving system is down for an hour." },
      { task: "Write a field mapping table for an order, with source field, target field, transformation and source of truth.", hint: "Include dates, currencies and status codes." },
    ],
    quiz: [
      { q: "Why must the receiving side of an integration be idempotent?", options: ["Messages are encrypted", "Retries and redelivery can deliver the same message twice", "APIs only accept one request", "To save disk"], answer: 1, why: "Without it, a retry can create duplicate invoices or orders." },
      { q: "A message fails validation. What is the best handling?", options: ["Retry forever", "Park it in an error queue with details for a person to fix", "Drop it silently", "Restart the server"], answer: 1, why: "Permanent errors will not fix themselves; they need visibility and human correction." },
      { q: "What does reconciliation add beyond logging?", options: ["Faster responses", "Independent proof that both systems agree on counts and totals", "More retries", "Encryption"], answer: 1, why: "It detects silent loss or duplication that individual log lines can miss." },
    ],
    pitfalls: ["Assuming the other system is always available", "Mapping fields from memory instead of a written table", "Having no daily check that totals match"],
  },
];

export const SPECIALIZED_LESSONS: Lesson[] = [
  {
    id: "spec-reentrancy",
    familyId: "specialized-technology",
    module: "Pick one: smart contracts",
    title: "Reentrancy and checks-effects-interactions",
    minutes: 35,
    objectives: ["Explain how a reentrancy attack works", "Apply checks-effects-interactions", "Add a reentrancy guard and test the attack"],
    explain: [
      "A smart contract is code that runs on a blockchain and often holds real value, and once deployed it generally cannot be patched, so security work comes before release. Reentrancy is one of the best-known vulnerabilities. It happens when a contract sends value or calls another contract before it has finished updating its own state. The receiving contract can call back into the first one while its records are still out of date, and withdraw again and again.",
      "Here is the classic sequence. A contract keeps a balance for each user. The withdraw function checks the balance, sends the money using an external call, and only afterwards sets the balance to zero. An attacker contract receives the money and, in its receiving function, calls withdraw again. The balance is still not zero, so the check passes and the money is sent a second time. This repeats until the contract is drained. The flaw is the order of operations, not the arithmetic.",
      "The standard defence is the checks-effects-interactions pattern. First perform all checks, such as requiring that the caller has enough balance. Then apply all effects to your own state, such as setting the balance to zero. Only then interact with other contracts or send value. If the state is already updated, a reentrant call finds nothing to withdraw. A reentrancy guard, a lock that makes a function fail if it is entered again before finishing, adds a second layer.",
      "Treat every external call as untrusted code that can run arbitrary logic, including calling back into you. Prefer pull payments, where users withdraw their own funds, to pushing funds to many addresses in a loop. Write tests that include a malicious contract attempting reentrancy, use well-reviewed libraries for guards and token logic, run static analysers, and get an independent review before holding significant value.",
    ],
    keyIdeas: ["Reentrancy: an external call re-enters before state is updated", "Order: checks, then effects, then interactions", "Add a reentrancy guard as defence in depth", "Treat external calls as untrusted; test with an attacker contract"],
    example: {
      title: "Vulnerable and safe withdraw (Solidity)",
      lang: "solidity",
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // BUG: sends value BEFORE updating the balance
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");
        (bool ok, ) = msg.sender.call{value: amount}("");   // attacker re-enters here
        require(ok, "transfer failed");
        balances[msg.sender] = 0;                           // too late
    }
}

contract SafeVault {
    mapping(address => uint256) public balances;
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // checks -> effects -> interactions, plus a guard
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");        // check
        balances[msg.sender] = 0;                           // effect
        (bool ok, ) = msg.sender.call{value: amount}("");   // interaction
        require(ok, "transfer failed");
    }
}`,
      walkthrough: ["In the vulnerable version the balance is still non-zero when the attacker's callback runs, so a second withdrawal succeeds.", "The safe version zeroes the balance first, so a reentrant call sees nothing to withdraw.", "The guard makes a nested call revert even if someone later reorders the code by mistake."],
    },
    practice: [
      { task: "Write an attacker contract that exploits the vulnerable vault in a local test network, then confirm the safe vault resists it.", hint: "The attacker's receive function should call withdraw again while the vault still has funds." },
      { task: "Review a contract you have written and list every external call. For each, state which state changes happen before it.", hint: "Any state update after an external call is suspicious." },
    ],
    quiz: [
      { q: "What is the root cause of a reentrancy exploit?", options: ["Integer overflow", "Making an external call before updating state", "Using too much gas", "A missing constructor"], answer: 1, why: "The callee can call back while the contract's records are still stale." },
      { q: "In checks-effects-interactions, what comes last?", options: ["Checks", "Effects", "Interactions with other contracts", "Deployment"], answer: 2, why: "External calls come after all state changes are complete." },
      { q: "Why still use a reentrancy guard if you follow the pattern?", options: ["It is required by the compiler", "It adds defence in depth against future mistakes and cross-function reentrancy", "It saves gas", "It encrypts storage"], answer: 1, why: "Guards catch reentrancy paths you did not anticipate and survive later edits." },
    ],
    pitfalls: ["Updating balances after sending value", "Trusting that an external address is a simple wallet", "Deploying valuable contracts without independent review"],
  },
  {
    id: "spec-gameloop",
    familyId: "specialized-technology",
    module: "Pick one: game development",
    title: "The game loop and the fixed timestep",
    minutes: 35,
    objectives: ["Explain the input, update, render loop", "Make movement independent of frame rate", "Use a fixed timestep for stable physics"],
    explain: [
      "Every game, from a tiny puzzle to a huge open world, runs a loop: read input, update the world, draw the result, and repeat many times per second. This loop is the heart of the program. The simplest version updates and draws once per frame, but frames do not all take the same time. A fast machine might run at 144 frames per second and a slow one at 30, so if you move a character a fixed amount per frame, it will move at completely different speeds on different machines.",
      "The first fix is delta time: measure how long the last frame took and multiply movement by it. Speed is then defined in units per second, such as 200 pixels per second, and each frame moves the object by speed times delta. The object travels the same distance in the same real time whatever the frame rate. Cap the delta so that a long pause, such as dragging the window, does not cause a huge jump on the next frame.",
      "Variable delta time has a weakness: physics and collision behave differently at different time steps, and a large step can make a fast object pass through a thin wall. The robust solution is a fixed timestep for the simulation. Keep an accumulator of elapsed real time and run the update in fixed slices, for example sixty times a second, as many times as needed to catch up, then render once. The simulation becomes deterministic and stable, and rendering can run at any rate.",
      "When rendering at a different rate to the simulation, the picture can look slightly jerky because the drawn moment falls between two simulation states. Interpolating between the previous and current state by the leftover fraction of a step makes motion smooth. Keep the update free of drawing code and the draw free of game logic, because that separation makes the game easier to test, pause, replay and port.",
    ],
    keyIdeas: ["Loop: input, update, render", "Delta time makes speed independent of frame rate", "Fixed timestep with an accumulator for stable physics", "Interpolate when rendering between simulation steps"],
    example: {
      title: "A fixed-timestep loop (JavaScript, browser)",
      lang: "javascript",
      code: `const STEP = 1 / 60;          // simulation runs at 60 Hz
const MAX_FRAME = 0.25;       // clamp long pauses (tab switch, breakpoint)

let previous = performance.now();
let accumulator = 0;
let state = { x: 0, vx: 200 };        // 200 pixels per second
let prevState = { ...state };

function update(dt) {
  prevState = { ...state };           // remember for interpolation
  state.x += state.vx * dt;
  if (state.x > 600 || state.x < 0) state.vx *= -1;   // bounce off the edges
}

function render(alpha) {
  // alpha = how far we are between the previous and current simulation state
  const x = prevState.x + (state.x - prevState.x) * alpha;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(x, 100, 20, 20);
}

function frame(now) {
  const elapsed = Math.min((now - previous) / 1000, MAX_FRAME);
  previous = now;
  accumulator += elapsed;

  while (accumulator >= STEP) {       // catch up in fixed slices
    update(STEP);
    accumulator -= STEP;
  }
  render(accumulator / STEP);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`,
      walkthrough: ["The accumulator collects real elapsed time and spends it in fixed 1/60 second updates.", "Clamping the elapsed time prevents a spiral of catch-up after a long pause.", "render uses alpha to draw between two simulation states, which keeps motion smooth at any display rate."],
    },
    practice: [
      { task: "Make a square move at 200 pixels per second using delta time, then throttle your browser's frame rate and confirm the speed in real time stays the same.", hint: "Log the position after exactly five seconds on a fast and a throttled run." },
      { task: "Add a thin wall and fire a very fast object at it with a variable timestep and then with a fixed one. Compare the results.", hint: "Large time steps can skip over the wall entirely." },
    ],
    quiz: [
      { q: "Why multiply movement by delta time?", options: ["To make the game faster", "So speed is the same regardless of frame rate", "To save memory", "To reduce input lag"], answer: 1, why: "Movement per second stays constant even when frames take different amounts of time." },
      { q: "What is the main benefit of a fixed timestep for physics?", options: ["Prettier graphics", "Deterministic, stable simulation independent of frame rate", "Lower memory", "Shorter code"], answer: 1, why: "The same inputs produce the same outcome, and large steps cannot tunnel through objects." },
      { q: "Why clamp the elapsed time per frame?", options: ["To lower the frame rate", "To avoid a huge catch-up burst after a long pause", "To save battery", "To fix input"], answer: 1, why: "Without a cap, the loop could run many updates to catch up and freeze the game." },
    ],
    pitfalls: ["Moving a fixed distance per frame", "Mixing drawing code into update logic", "Letting a long pause cause a spiral of catch-up updates"],
  },
];

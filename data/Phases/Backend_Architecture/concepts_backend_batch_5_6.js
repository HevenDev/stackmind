const concepts = [
  {
    id: 6,
    title: "Message Queues & Background Jobs",
    tag: "DO IT NOW, OR DO IT LATER, OR DO IT RELIABLY",
    color: "#C0392B",
    tldr: "Message queues decouple the work from the request — instead of doing slow or risky operations synchronously, you push a job and return immediately. BullMQ (Redis-backed) gives you reliable job processing, retries, scheduling, and visibility. The key challenges are idempotency, dead letters, and concurrency control.",
    problem: `The most common mistake: doing everything synchronously in the request-response cycle. User places an order → you charge payment → send confirmation email → update inventory → notify the warehouse → generate invoice PDF. If the email service is down, the order request fails. If PDF generation takes 3 seconds, the user waits 3 seconds. If the warehouse notification retries 5 times, the user waits for all 5.

The second problem: reliability. Without a queue, if your Node process crashes mid-operation, the work is simply lost. There's no record that "send this email" was in progress. The user never gets their confirmation.

The third problem: rate control. An external SMS provider allows 100 SMS/second. Your flash sale generates 10,000 orders in the first second. Without a queue, 10,000 concurrent SMS requests overwhelm the provider, 9,900 fail, and you have no way to retry intelligently.

Queues solve all three: they decouple producers from consumers, they persist jobs so crashes don't lose work, and they let you control the rate of processing independently of the rate of production.

The hidden complexity: once you have async jobs, you inherit new problems. What if a job runs twice? (payment charged twice — idempotency). What if a job keeps failing? (dead letter queue). What if two workers process the same job simultaneously? (concurrency locks). These are the problems that separate queue users from queue experts.`,
    analogy: `Think of a restaurant's ticket system. Without it, every customer order goes directly to a single chef who must cook it immediately, in order, one at a time. One slow order blocks everything behind it.

With the ticket system, waiters (producers) post orders to the rail (queue). The kitchen (workers) processes them at their own pace. The restaurant can add more chefs (horizontal scaling). If a chef goes home sick mid-service, the ticket stays on the rail — the work isn't lost.

DELAYED JOBS are like "fire this ticket at 7pm" — a pre-order system. The ticket sits on a special shelf until the scheduled time.

REPEATABLE JOBS (cron) are like the chef who makes fresh bread every morning at 6am, regardless of customer orders. Scheduled, recurring, predictable.

DEAD LETTER QUEUE is the pile of tickets that couldn't be completed after multiple attempts — the kitchen ran out of a key ingredient. These tickets don't disappear, they go to a special rack so the manager can review them and decide what to do.

IDEMPOTENCY is why tickets have unique order numbers. If a waiter accidentally posts the same ticket twice, the kitchen recognizes the duplicate number and doesn't cook it twice. Without this, a crash-and-retry system charges customers twice.`,
    deep: `BULLMQ ARCHITECTURE
─────────────────────
BullMQ stores jobs in Redis. Each queue has multiple Redis keys:
- wait list: jobs ready to be processed
- active list: jobs currently being processed (claimed by a worker)
- delayed sorted set: jobs scheduled for future processing (sorted by timestamp)
- completed set: finished jobs (retained for monitoring)
- failed set: jobs that exhausted all retries

WHAT HAPPENS WHEN A WORKER CRASHES
────────────────────────────────────
BullMQ uses a "lock" on active jobs with a heartbeat TTL (default 30s). If a worker claims a job and dies, the lock expires and the job is moved back to the wait list automatically. No job is lost.

CONCURRENCY MODEL
──────────────────
Each worker can process N jobs in parallel (concurrency option). Multiple worker processes can consume the same queue. BullMQ uses Redis atomic operations (BRPOPLPUSH) to ensure each job is claimed by exactly one worker — no duplicate processing from the queue perspective.

JOB IDEMPOTENCY
────────────────
BullMQ doesn't enforce idempotency — that's your responsibility. Two patterns:
1. Unique job IDs: \`{ jobId: "order:O123:email" }\` — BullMQ rejects duplicate job IDs in the queue
2. Idempotency key in job data: worker checks "did I already do this?" before processing

RATE LIMITING PER QUEUE
────────────────────────
\`\`\`typescript
const worker = new Worker("sms-queue", processor, {
  limiter: {
    max: 100,        // max 100 jobs
    duration: 1000   // per 1000ms (per second)
  }
})
\`\`\`
BullMQ delays excess jobs automatically — no external rate limiting needed.

DEAD LETTER QUEUE
──────────────────
Jobs that fail more than \`attempts\` times go to the "failed" set in Redis.
You monitor this set and either: manually retry after fixing the bug, alert on-call, or discard and compensate (e.g., issue a refund if payment confirmation job keeps failing).

METRICS TO MONITOR
───────────────────
- Queue depth (waiting): if growing → workers can't keep up → add workers
- Processing rate: jobs/second
- Failed rate: alert if > 0 in production for critical queues
- Job duration p99: if slow → optimize processor or increase concurrency
- Retry rate: if high → investigate why jobs fail and need retries`,
    code: `// ─── QUEUE SETUP ────────────────────────────────────────────────────────
// queues/index.ts
// const { Queue, Worker, QueueEvents } = require("bullmq")

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379")
}

// Declare queues
const emailQueue    = new Queue("email",    { connection })
const smsQueue      = new Queue("sms",      { connection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 } } })
const invoiceQueue  = new Queue("invoice",  { connection })
const reportQueue   = new Queue("report",   { connection })

// ─── PRODUCERS — adding jobs from your service ───────────────────────────
class OrderService {
  async placeOrder(customerId: string, items: OrderItemInput[]): Promise<Order> {
    const order = await this.orderRepo.create({ customerId, items })

    // Fire and forget — don't await these, order is already created
    // Each job is independent — failure of one doesn't block others

    // Immediate: send confirmation email
    await emailQueue.add("order-confirmation", {
      orderId: order.id,
      customerId: order.customerId,
      email: order.customer.email,
      totalAmountPaise: order.totalAmountPaise
    }, {
      jobId: \`order-confirmation:\${order.id}\`,  // unique ID — prevents duplicates on retry
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 }
    })

    // Delayed: send "your order ships soon" reminder 1 hour before estimated delivery
    await emailQueue.add("shipping-reminder", {
      orderId: order.id,
      customerId: order.customerId
    }, {
      delay: 23 * 60 * 60 * 1000,  // 23 hours from now
      jobId: \`shipping-reminder:\${order.id}\`
    })

    // Immediate: generate invoice PDF
    await invoiceQueue.add("generate-invoice", {
      orderId: order.id
    }, {
      jobId: \`invoice:\${order.id}\`,
      attempts: 3
    })

    return order
  }
}

// ─── WORKERS — processing jobs ────────────────────────────────────────────
// workers/email.worker.ts

const emailWorker = new Worker(
  "email",
  async (job) => {
    const { name, data } = job

    switch (name) {
      case "order-confirmation": {
        const { orderId, email, totalAmountPaise } = data
        await emailService.send({
          to: email,
          subject: \`Order Confirmed — ₹\${(totalAmountPaise / 100).toFixed(2)}\`,
          template: "order-confirmation",
          variables: { orderId, amount: totalAmountPaise }
        })
        // Log for audit trail
        await job.log(\`Confirmation email sent to \${email} for order \${orderId}\`)
        break
      }
      case "shipping-reminder": {
        const user = await userService.findById(data.customerId)
        await emailService.send({
          to: user.email,
          subject: "Your order ships tomorrow!",
          template: "shipping-reminder",
          variables: { orderId: data.orderId }
        })
        break
      }
      default:
        throw new Error(\`Unknown job type: \${name}\`)
    }
  },
  {
    connection,
    concurrency: 10,  // process 10 emails in parallel per worker process
    limiter: {
      max: 50,          // max 50 email jobs per second (SendGrid rate limit)
      duration: 1000
    }
  }
)

// Worker event handlers — essential for monitoring
emailWorker.on("completed", (job) => {
  console.info(\`Job \${job.id} (\${job.name}) completed\`)
})

emailWorker.on("failed", (job, err) => {
  console.error(\`Job \${job?.id} (\${job?.name}) failed: \${err.message}\`)
  // Alert if this was the final attempt
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    alerting.send(\`CRITICAL: Email job \${job.id} exhausted all retries\`, err)
  }
})

emailWorker.on("stalled", (jobId) => {
  // Worker crashed while processing — job was automatically reclaimed
  console.warn(\`Job \${jobId} stalled and was reclaimed\`)
})

// ─── IDEMPOTENT JOB PROCESSOR ─────────────────────────────────────────────
// Even if a job runs twice, the effect should be the same

const invoiceWorker = new Worker(
  "invoice",
  async (job) => {
    const { orderId } = job.data

    // Idempotency check: did we already generate this invoice?
    const existing = await invoiceRepo.findByOrderId(orderId)
    if (existing) {
      await job.log(\`Invoice already exists for order \${orderId} — skipping\`)
      return { invoiceId: existing.id, skipped: true }
    }

    // Generate — this is safe to run once
    const order = await orderRepo.findById(orderId)
    const pdf = await pdfService.generateInvoice(order)
    const invoice = await invoiceRepo.create({ orderId, pdfUrl: pdf.url })

    return { invoiceId: invoice.id }
  },
  { connection, concurrency: 5 }
)

// ─── REPEATABLE JOBS (CRON) ───────────────────────────────────────────────
// Schedule recurring jobs — run once at app startup

async function scheduleRecurringJobs(): Promise<void> {
  // Daily: generate sales report at 6am IST (00:30 UTC)
  await reportQueue.add(
    "daily-sales-report",
    { reportType: "sales", timezone: "Asia/Kolkata" },
    {
      repeat: { pattern: "30 0 * * *" },  // cron expression: 6am IST
      jobId: "daily-sales-report"         // stable ID prevents duplicate schedules
    }
  )

  // Every 5 minutes: check for pending orders older than 30 minutes
  await reportQueue.add(
    "stale-order-check",
    {},
    {
      repeat: { every: 5 * 60 * 1000 },  // every 5 minutes in ms
      jobId: "stale-order-check"
    }
  )
}

// ─── MONITORING — Bull Board dashboard ────────────────────────────────────
// server.ts (Express app setup)
// const { createBullBoard } = require("@bull-board/api")
// const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter")
// const { ExpressAdapter } = require("@bull-board/express")

function setupBullBoard(app: Express): void {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath("/admin/queues")

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(smsQueue),
      new BullMQAdapter(invoiceQueue),
      new BullMQAdapter(reportQueue)
    ],
    serverAdapter
  })

  // Protect with admin auth middleware
  app.use("/admin/queues", adminAuthMiddleware, serverAdapter.getRouter())
}

// ─── DEAD LETTER QUEUE HANDLING ───────────────────────────────────────────
// Periodically review failed jobs and take action

async function reviewFailedJobs(): Promise<void> {
  const failedJobs = await emailQueue.getFailed(0, 50)  // first 50 failed jobs

  for (const job of failedJobs) {
    const failureReason = job.failedReason
    const attemptsMade = job.attemptsMade

    console.log(\`Failed job \${job.id}: \${failureReason} (after \${attemptsMade} attempts)\`)

    // Retry if the cause was transient (network timeout)
    if (failureReason?.includes("ECONNREFUSED") || failureReason?.includes("timeout")) {
      await job.retry()
    } else {
      // Permanent failure — discard and compensate
      await job.remove()
      // Business compensation: log to alerting, trigger manual review
      await alerting.send(\`Permanent email failure for order \${job.data.orderId}\`)
    }
  }
}`,
    bugs: `BUG 1 — Non-idempotent job processor charges users twice
────────────────────────────────────────────────────────
const paymentWorker = new Worker("payment", async (job) => {
  const { orderId, amountPaise } = job.data
  // No idempotency check!
  const charge = await razorpay.charge(amountPaise)
  await orderRepo.updateStatus(orderId, "PAID")
  return charge
})
// Job runs → charges payment → crashes before returning → BullMQ retries the job
// Job runs again → charges payment AGAIN → customer charged twice
// Production incident: flash sale, 150 customers charged twice

Fix: Check before charging:
const existing = await paymentRepo.findByOrderId(orderId)
if (existing) return { chargeId: existing.id, skipped: true }
// Only then: const charge = await razorpay.charge(amountPaise)
// Or use Razorpay's idempotency key: razorpay.charge(amount, { idempotencyKey: orderId })

BUG 2 — Adding jobs inside a database transaction
────────────────────────────────────────────────────
async function placeOrder(data: OrderData) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data })
    // WRONG: job added inside transaction
    await emailQueue.add("order-confirmation", { orderId: order.id })
    // If transaction ROLLS BACK, the job was already added to Redis!
    // Worker processes the job — tries to find an order that doesn't exist
    // Crashes with "Order not found" — retries 5 times — fills dead letter queue
  })
}

Fix: Add jobs AFTER the transaction commits:
const order = await prisma.$transaction(async (tx) => {
  return tx.order.create({ data })
})
// Transaction committed — now it's safe to queue the job
await emailQueue.add("order-confirmation", { orderId: order.id })

BUG 3 — No worker concurrency limit causes memory exhaustion
─────────────────────────────────────────────────────────────
const pdfWorker = new Worker("invoice", async (job) => {
  const pdf = await generatePdfFromHtml(job.data.html)  // 200MB per job!
  return pdf
}, { connection, concurrency: 100 })  // 100 concurrent × 200MB = 20GB RAM!
// Production: OOM kill, all 100 jobs fail simultaneously, retry storm

Fix: concurrency should reflect memory budget, not "more is faster"
{ concurrency: 3 }  // 3 × 200MB = 600MB — manageable
// For CPU-bound jobs: concurrency = number of CPU cores
// For I/O-bound jobs: higher concurrency is fine (waiting, not consuming)

BUG 4 — Scheduling the same cron job on every app restart
───────────────────────────────────────────────────────────
// Called on every server startup — in a 4-process cluster: called 4 times
async function setupJobs() {
  await reportQueue.add("daily-report", {}, {
    repeat: { pattern: "0 6 * * *" }
    // No jobId! Creates a NEW repeatable job entry on every restart
  })
}
// After 10 deployments: 40 copies of "daily-report" scheduled
// 40 copies fire at 6am → 40 report generation processes → DB overwhelmed

Fix: Always provide a stable jobId for repeatable jobs:
await reportQueue.add("daily-report", {}, {
  repeat: { pattern: "0 6 * * *" },
  jobId: "daily-report-v1"  // BullMQ deduplicates by jobId
})

BUG 5 — Forgetting to handle the stalled event = silent data loss
──────────────────────────────────────────────────────────────────
// Worker processes jobs but has no stalled handler
const worker = new Worker("critical-payments", processor, { connection })
// No: worker.on("stalled", ...)

// Worker crashes processing a high-value order
// BullMQ reclaims the job after stalledInterval (default 30s)
// Job is retried — but nobody knows this happened
// No alert, no audit log, mystery discrepancy in payment records

Fix: Always instrument your workers:
worker.on("stalled", (jobId) => {
  logger.error({ jobId }, "Job stalled — worker may have crashed")
  alerting.send(\`Payment worker stalled on job \${jobId}\`)
})`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const queue = new Queue("test", { connection })

await queue.add("job-A", { x: 1 }, { jobId: "unique-1", attempts: 3 })
await queue.add("job-B", { x: 2 }, { jobId: "unique-1", attempts: 3 })  // same jobId!
await queue.add("job-C", { x: 3 }, { attempts: 3 })

const waiting = await queue.getWaitingCount()
console.log("waiting:", waiting)

Q: How many jobs are in the waiting queue? Why?
   What happens to job-B with the duplicate jobId?
   If job-A fails 3 times, where does it go?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This worker has 4 problems. Find and fix them.

const worker = new Worker("order-processing", async (job) => {
  const { orderId, customerId } = job.data

  // Problem 1: no idempotency check
  await paymentService.charge(orderId, job.data.amountPaise)

  // Problem 2: N+1 inside job processor
  const order = await orderRepo.findById(orderId)
  const itemDetails = []
  for (const item of order.items) {
    const product = await productRepo.findById(item.productId)
    itemDetails.push({ ...item, product })
  }

  // Problem 3: throws a non-Error value (BullMQ loses stack trace)
  if (!order) throw "Order not found"

  // Problem 4: CPU-blocking operation in the worker
  const report = JSON.stringify(generateHeavyReport(order))  // synchronous, 2 seconds
  await reportRepo.save(report)

}, { connection, concurrency: 50 })

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete order notification pipeline using BullMQ:
1. Three queues: email-queue, sms-queue, push-queue
2. OrderService.placeOrder adds jobs to all three queues with unique jobIds
3. Each worker is idempotent: checks if notification was already sent before sending
4. SMS queue has rate limit: 100/second (provider limit)
5. If email fails 5 times, add a job to a "fallback-sms-queue" as compensation
6. Schedule a daily "unconfirmed orders" cron job that runs at 9am IST
7. Expose /admin/queue-health endpoint returning: queue depths, failure counts, processing rate
8. Write a test that verifies: placing an order enqueues exactly 3 jobs with correct data`,
    summary: "Message queues transform unreliable, slow synchronous operations into reliable, async, rate-controlled background work. BullMQ handles the hard parts — persistence, retries, scheduling, concurrency — but idempotency, proper instrumentation, and dead letter management are your responsibility."
  },

  {
    id: 7,
    title: "REST API Design",
    tag: "THE CONTRACT YOUR CLIENTS DEPEND ON",
    color: "#1A5276",
    tldr: "REST API design is about making a predictable, consistent contract: resources not actions, correct HTTP verbs, meaningful status codes, stable versioning, and a uniform error shape. Done well, clients can anticipate how your API behaves without reading docs for every endpoint.",
    problem: `Bad API design compounds over years. An endpoint named \`/getUserOrders\` is a RPC style that doesn't compose with HTTP conventions. Clients don't know what verb to use, what caching rules apply, or what a 400 vs 422 response means. A new engineer adds \`/getActiveUserOrders\` and \`/fetchOrdersByCustomer\` — now three endpoints do almost the same thing, named inconsistently.

The second problem: inconsistent error responses. One endpoint returns \`{ error: "User not found" }\`, another returns \`{ message: "Not found", code: 404 }\`, another returns an HTML error page from Express's default handler. Clients have to handle three different error shapes with three different parsers.

The third problem: pagination done wrong. An endpoint that returns all 2 million records when given no pagination parameters takes down your API and crashes the client. OFFSET-based pagination becomes unbearably slow on page 500 of a large dataset.

The fourth problem: premature versioning — or no versioning. APIs without versioning get locked to their first design forever, since any change risks breaking clients. APIs that version every minor change force clients to constantly upgrade.

Good REST design is not about being philosophically "RESTful" — it's about making a stable, predictable contract that clients can build on confidently.`,
    analogy: `Think of your API as a physical library's public interface — the part visible to visitors.

RESOURCE NAMING is like library sections. You don't say "go fetch books about computers" (RPC). You say "Computer Science section, third shelf" (REST). The location is the noun, not the action.

HTTP VERBS are the library rules: you can READ (GET) any book without permission. You must SIGN OUT (POST) to borrow. You RETURN (DELETE) when done. You can UPDATE your borrower record (PUT/PATCH). These rules are universal — you don't explain them to every visitor.

STATUS CODES are the librarian's standard responses: "Here it is" (200), "Created your card" (201), "That section moved" (301), "You need a library card" (401), "You can look but not borrow" (403), "That book doesn't exist" (404). Anyone who's used a library understands these without reading a manual.

VERSIONING is like how the library reorganizes sections. V1 was "Dewey Decimal." V2 is "Library of Congress." Both exist simultaneously. Long-time patrons use V1 (the old card catalog still works). New patrons use V2. Eventually V1 is retired with plenty of notice.

API DOCUMENTATION (Swagger) is the library directory posted at the entrance: every section, every shelf, every rule. You shouldn't have to explore to figure out what exists.`,
    deep: `HTTP VERBS — THE REAL SEMANTICS
──────────────────────────────────
GET:    Safe (no side effects), Idempotent. Cacheable. Never for state changes.
POST:   Not safe, Not idempotent. Creates resources or triggers actions.
PUT:    Not safe, Idempotent. FULL replacement of a resource.
PATCH:  Not safe, Not necessarily idempotent. PARTIAL update.
DELETE: Not safe, Idempotent. Remove a resource.

IDEMPOTENT means: calling it N times has the same effect as calling it once.
PUT /users/U1 with full body: 10 calls = same result as 1 call. Idempotent.
POST /orders: 10 calls = 10 orders created. NOT idempotent.

STATUS CODES DEVELOPERS GET WRONG
───────────────────────────────────
200 vs 201: POST that creates should return 201, not 200. 201 includes Location header.
400 vs 422: 400 = malformed request (invalid JSON). 422 = semantically invalid (valid JSON but "age": -5).
401 vs 403: 401 = not authenticated (no/invalid token). 403 = authenticated but not authorized.
404 vs 410: 404 = may exist elsewhere. 410 = Gone permanently (use for deleted resources).
500 vs 503: 500 = unexpected server error. 503 = server intentionally unavailable (maintenance, overload).

CURSOR VS OFFSET PAGINATION
─────────────────────────────
Offset: simple, supports jumping to page N, but slow at large offsets and inconsistent with live data
\`\`\`
GET /orders?offset=1000&limit=20
\`\`\`
Cursor: consistent with live data, O(1) regardless of depth, but can't jump to page N
\`\`\`
GET /orders?cursor=eyJpZCI6IlUxMjMiLCJ0cyI6MTY5...}&limit=20
\`\`\`
The cursor is usually a base64-encoded JSON: \`{ id: "last-item-id", ts: lastTimestamp }\`

VERSIONING TRADE-OFFS
──────────────────────
URL versioning (/v1/users): visible, cacheable, simple routing. Clutters URLs.
Header versioning (Accept: application/vnd.api+json;version=2): clean URLs. Harder to test manually.
Query param (?version=2): easy to override. Accidental omission silently uses wrong version.
Recommendation: URL versioning for public APIs. Header versioning for internal APIs.

ERROR RESPONSE SHAPE (RFC 7807 Problem Details)
─────────────────────────────────────────────────
\`\`\`json
{
  "type": "https://api.yourapp.com/errors/insufficient-balance",
  "title": "Insufficient Balance",
  "status": 422,
  "detail": "Account balance ₹450 is less than withdrawal amount ₹1000",
  "instance": "/api/v1/wallets/W1/withdraw",
  "traceId": "abc-123-def"
}
\`\`\``,
    code: `// ─── RESOURCE-ORIENTED ROUTING ───────────────────────────────────────────
// BAD: RPC-style, inconsistent, uncacheable
// POST /getUserOrders
// POST /getActiveUserOrders
// POST /cancelOrder
// POST /shipOrder

// GOOD: resource-oriented, predictable, HTTP-compliant
// GET    /users/:userId/orders           — list user's orders
// POST   /users/:userId/orders           — create an order for the user
// GET    /users/:userId/orders/:orderId  — get a specific order
// PATCH  /users/:userId/orders/:orderId  — update order (e.g., add item)
// DELETE /users/:userId/orders/:orderId  — cancel an order

// For state transitions that don't fit CRUD, use sub-resources:
// POST /orders/:orderId/cancellation  — cancel an order (action as noun)
// POST /orders/:orderId/shipment      — mark as shipped
// DELETE /orders/:orderId/hold        — remove a hold

// ─── EXPRESS ROUTER SETUP ─────────────────────────────────────────────────
// routes/orders.ts

const router = Router({ mergeParams: true })  // mergeParams for nested routes

router.get("/",    authMiddleware, orderController.listOrders)
router.post("/",   authMiddleware, orderController.createOrder)
router.get("/:id", authMiddleware, orderController.getOrder)
router.patch("/:id", authMiddleware, orderController.updateOrder)
router.delete("/:id", authMiddleware, orderController.cancelOrder)

// Sub-resource for state transitions
router.post("/:id/shipment",    authMiddleware, adminOnly, orderController.shipOrder)
router.post("/:id/refund",      authMiddleware, orderController.requestRefund)

// Mount nested under /users
app.use("/api/v1/users/:userId/orders", router)

// ─── CONSISTENT ERROR RESPONSE ────────────────────────────────────────────
// lib/errors.ts

class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, "RESOURCE_NOT_FOUND", \`\${resource} with id '\${id}' not found\`, { resource, id })
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly fields: Record<string, string>) {
    super(422, "VALIDATION_ERROR", message, { fields })
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message)
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message)
  }
}

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────
// middleware/errorHandler.ts

function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const traceId = req.headers["x-trace-id"] as string || generateTraceId()

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      type: \`https://api.yourapp.com/errors/\${err.code.toLowerCase().replace(/_/g, "-")}\`,
      title: err.code.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase()),
      status: err.statusCode,
      detail: err.message,
      instance: req.path,
      traceId,
      ...(err.details && { details: err.details })
    })
    return
  }

  // Unexpected error — don't expose internals
  console.error({ err, traceId }, "Unhandled error")
  res.status(500).json({
    type: "https://api.yourapp.com/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred. Please try again.",
    instance: req.path,
    traceId
  })
}

app.use(errorHandler)

// ─── PAGINATION ────────────────────────────────────────────────────────────
// Cursor-based pagination implementation

interface PaginationParams {
  cursor?: string
  limit: number
  sortBy?: string
  sortDir?: "asc" | "desc"
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    limit: number
    hasNextPage: boolean
    nextCursor: string | null
    total?: number  // optional — expensive to compute for large tables
  }
}

async function getPaginatedOrders(
  userId: string,
  params: PaginationParams
): Promise<PaginatedResponse<Order>> {
  const { cursor, limit, sortBy = "createdAt", sortDir = "desc" } = params

  let cursorCondition = {}
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString())
    cursorCondition = {
      [sortBy]: sortDir === "desc"
        ? { lt: decoded.value }
        : { gt: decoded.value }
    }
  }

  const orders = await prisma.order.findMany({
    where: { customerId: userId, ...cursorCondition },
    orderBy: { [sortBy]: sortDir },
    take: limit + 1,  // fetch one extra to detect hasNextPage
    include: { items: { select: { id: true, productId: true, qty: true } } }
  })

  const hasNextPage = orders.length > limit
  const data = hasNextPage ? orders.slice(0, limit) : orders

  const lastItem = data[data.length - 1]
  const nextCursor = hasNextPage && lastItem
    ? Buffer.from(JSON.stringify({ value: lastItem[sortBy as keyof Order] })).toString("base64")
    : null

  return { data, pagination: { limit, hasNextPage, nextCursor } }
}

// ─── FILTERING, SORTING, FIELD SELECTION ──────────────────────────────────
// GET /api/v1/orders?status=PENDING&sort=-createdAt&fields=id,status,total,customer

function parseQueryFilters(query: Record<string, string>) {
  const filters: Record<string, unknown> = {}
  const allowedFilters = ["status", "customerId", "minAmount", "maxAmount"]

  for (const key of allowedFilters) {
    if (query[key]) {
      if (key === "minAmount") filters.totalAmountPaise = { gte: parseInt(query[key]) }
      else if (key === "maxAmount") {
        filters.totalAmountPaise = { ...(filters.totalAmountPaise as object), lte: parseInt(query[key]) }
      } else {
        filters[key] = query[key]
      }
    }
  }

  // Sort: "-createdAt" means createdAt DESC, "createdAt" means ASC
  const sortParam = query.sort || "-createdAt"
  const sortDir = sortParam.startsWith("-") ? "desc" : "asc"
  const sortField = sortParam.replace(/^-/, "")

  // Field selection: "id,status,total" → { id: true, status: true, totalAmountPaise: true }
  const select = query.fields
    ? Object.fromEntries(query.fields.split(",").map(f => [f, true]))
    : undefined

  return { filters, orderBy: { [sortField]: sortDir }, select }
}

// ─── API VERSIONING ────────────────────────────────────────────────────────
// URL versioning — mount separate routers per version

// v1 router
const v1Router = Router()
v1Router.use("/users", v1UserRouter)
v1Router.use("/orders", v1OrderRouter)
app.use("/api/v1", v1Router)

// v2 router — breaking changes isolated here
const v2Router = Router()
v2Router.use("/users", v2UserRouter)   // new response shape
v2Router.use("/orders", v2OrderRouter) // new pagination
app.use("/api/v2", v2Router)

// Version sunset header — warn clients on deprecated version
function v1DeprecationMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Deprecation", "true")
  res.setHeader("Sunset", "Sat, 01 Jan 2026 00:00:00 GMT")
  res.setHeader("Link", '</api/v2>; rel="successor-version"')
  next()
}
app.use("/api/v1", v1DeprecationMiddleware)`,
    bugs: `BUG 1 — Using 200 for everything, including errors
──────────────────────────────────────────────────
app.post("/api/orders", async (req, res) => {
  try {
    const order = await orderService.create(req.body)
    res.json({ success: true, order })
  } catch (err) {
    // WRONG: returning 200 with error in body
    res.json({ success: false, error: err.message })
  }
})
// Client code: if (response.ok) {...} always runs, even on errors
// Logging systems can't alert on errors — all responses are 200
// CDN/proxy caches error responses — clients see stale errors

Fix: Use correct HTTP status codes. 400 for validation, 404 for not-found,
500 for unexpected errors. Never return 200 with "success: false" in the body.

BUG 2 — Mutating state with GET endpoints
───────────────────────────────────────────
// GET /api/orders/:id/mark-read  — changes state on a GET!
app.get("/api/orders/:id/mark-read", async (req, res) => {
  await orderRepo.update(req.params.id, { isRead: true })
  res.json({ success: true })
})
// GET is supposed to be safe and idempotent
// Browser prefetching, link crawlers, CDN probes can trigger state changes
// A simple curl with -v to debug could accidentally mark orders as read

Fix: Use POST or PATCH for state mutations:
POST /api/orders/:id/read-receipt  or  PATCH /api/orders/:id { "isRead": true }

BUG 3 — No pagination limit enforcement — returns all records
──────────────────────────────────────────────────────────────
app.get("/api/products", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 1000  // default 1000!
  const products = await productRepo.findAll({ limit })
  res.json(products)
})
// Client accidentally sends no limit → 1,000,000 products returned
// Response: 800MB JSON, OOM crash in both server and client
// Without max enforcement, any client (or attacker) can DoS your API

Fix: Enforce hard maximum:
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
// Never return more than 100 records per request, regardless of what client asks

BUG 4 — 404 vs 403 information leakage
────────────────────────────────────────
app.get("/api/users/:id/wallet", authMiddleware, async (req, res) => {
  const wallet = await walletRepo.findByUserId(req.params.id)
  if (!wallet) return res.status(404).json({ error: "Wallet not found" })
  if (wallet.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" })
  res.json(wallet)
})
// The 403 response confirms to an attacker that the wallet EXISTS for that user
// They can enumerate user IDs and find which ones have wallets

Fix: Return 404 for both "doesn't exist" AND "exists but you can't see it"
// This prevents resource existence enumeration:
if (!wallet || wallet.userId !== req.user.id) {
  return res.status(404).json({ error: "Wallet not found" })
}

BUG 5 — Breaking API change without versioning
────────────────────────────────────────────────
// V1 response: { "name": "Rahul Sharma", "email": "..." }
// Developer renames "name" to "fullName" for consistency:
// V1 response now: { "fullName": "Rahul Sharma", "email": "..." }
// Mobile app still reads response.name → undefined for all users
// Web client: user.name.split(" ") → Cannot read properties of undefined

// This broke production for 48 hours before a hotfix was deployed

Fix: Introduce versioning BEFORE making breaking changes.
Add "fullName" alongside "name" first (backwards compatible).
Deprecate "name" with a warning.
Remove it only in v2, with proper migration guides.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Consider these API endpoints:
  A: GET    /api/users/123/orders?status=PENDING&sort=-createdAt&limit=10
  B: POST   /api/users/123/orders
  C: PUT    /api/users/123/orders/456
  D: PATCH  /api/users/123/orders/456
  E: DELETE /api/users/123/orders/456

Q: For each endpoint, what HTTP status code should a SUCCESSFUL response return?
   Which of these is idempotent? Which is safe?
   If endpoint C and D both succeed: what's different about what the request body must contain?
   If DELETE /orders/456 is called when order 456 doesn't exist — should it return 404 or 200?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This REST endpoint has 5 design problems. Find and fix each.

app.post("/api/getOrdersForUser", async (req, res) => {
  try {
    const userId = req.body.userId  // Problem 1
    const orders = await orderRepo.findAll(userId)  // Problem 2: no pagination

    if (!orders) {
      return res.status(200).json({ error: "No orders found" })  // Problem 3
    }

    res.status(200).json({
      orders,
      userId,
      dbConnectionString: process.env.DATABASE_URL  // Problem 4
    })
  } catch (err) {
    res.status(200).json({ success: false, message: err.message })  // Problem 5
  }
})

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design a complete REST API for a "Wallet" feature:
1. Define all endpoints (URL, method, request body, response shape, status codes)
2. Implement consistent error responses following RFC 7807 Problem Details
3. Add cursor-based pagination for /transactions endpoint
4. Version the API at /api/v1/wallet/...
5. Add filtering to transactions: by type (credit/debit), date range, min/max amount
6. Implement field selection: ?fields=id,type,amount,createdAt
7. Write OpenAPI YAML spec for all 5 endpoints
8. Add sunset header to v1 expiring 6 months from now`,
    summary: "REST API design is a long-term commitment — every endpoint you ship is a contract your clients depend on. Get resources, verbs, status codes, error shapes, and pagination right from the start, and your API becomes predictable enough that clients can use it without reading docs for every edge case."
  },

  {
    id: 8,
    title: "Authentication & Authorization",
    tag: "WHO ARE YOU, AND WHAT ARE YOU ALLOWED TO DO",
    color: "#117A65",
    tldr: "Authentication verifies identity (who are you?). Authorization verifies permissions (what can you do?). JWT is stateless and scalable but comes with real attack vectors — alg:none, algorithm confusion, secret theft. Sessions are simpler and revocable. RBAC adds structure to permissions. Getting either wrong has severe security consequences.",
    problem: `The most dangerous mistake: copying a JWT tutorial without understanding what makes JWTs secure. JWT signing is only as strong as your secret. A weak secret (\`secret\`, \`123456\`) can be brute-forced in minutes. Storing the JWT secret in code (not environment variables) means every git clone of your repo has your production signing key.

The second dangerous mistake: the alg:none attack. If your JWT library checks the algorithm from the token header rather than enforcing it server-side, an attacker can craft a token with \`"alg": "none"\` and no signature. The library accepts it. The attacker is now any user they want to be.

The third problem: authorization confused with authentication. You check if someone is logged in (authentication). You forget to check if they're allowed to do what they're trying to do (authorization). Result: a logged-in user can access any other user's data by guessing IDs in the URL.

The fourth problem: JWTs that can't be revoked. A user's account is compromised. You invalidate their session in your database. But they have a JWT that's valid for 24 more hours. There's nothing you can do until it expires. This is the fundamental tradeoff of stateless JWTs.

The fifth problem: insecure password storage. In 2024, applications still get breached with MD5-hashed passwords. MD5 is not a password hash — it's a checksum. A proper password hash (bcrypt, Argon2) is intentionally slow and salted. The difference between MD5 and bcrypt is the difference between cracking a breach in hours vs centuries.`,
    analogy: `The airport security metaphor — the best one for auth.

AUTHENTICATION is the passport check. "Is this document genuine? Is this person who they claim to be?" Once you've verified identity, you get a boarding pass (JWT or session token).

AUTHORIZATION is the gate check. Your boarding pass lets you on the plane — but only to your seat. Even with a valid boarding pass, you can't sit in Business Class if you booked Economy. The captain's cabin door is locked regardless of your boarding pass.

JWT is like a self-contained boarding pass with all your details on it: name, flight, seat, class. Any airline staff member (service) can read it without calling the central database. But once issued, it can't be revoked — if you lose it and someone else picks it up, they can board your flight.

SESSIONS are like the hotel key card system. The key card itself contains no information — just a token. The hotel database maps the token to your room. Can be invalidated instantly (lost card? deactivate it immediately). Requires checking the database on every swipe.

RBAC (Role-Based Access Control) is the organizational hierarchy at a company. Interns can only access public documents. Engineers can access code repos. Managers can approve time-off. Directors can see financials. Permissions come from the role, not from individual assignment.

REFRESH TOKENS are like a long-term visa that lets you renew your short-term visitor's pass. The visitor's pass (access token) expires quickly. The visa (refresh token) lets you get a new visitor's pass without re-verifying your identity from scratch.`,
    deep: `JWT INTERNALS
──────────────
A JWT is three base64url-encoded JSON objects joined by dots:
\`\`\`
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVMSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzA5MDAwMDAwfQ.signature
       ↑ header                              ↑ payload                                               ↑ signature
\`\`\`
Header: { "alg": "RS256", "typ": "JWT" }
Payload: { "sub": "U1", "role": "user", "exp": 1709000000, "iat": 1708996400 }
Signature: RS256(base64(header) + "." + base64(payload), privateKey)

HS256 vs RS256:
- HS256: symmetric — same secret to sign AND verify. All services share the secret. If one is compromised, all tokens are compromised.
- RS256: asymmetric — private key to sign (only auth service), public key to verify (any service). Compromising a downstream service doesn't expose the signing key.

THE alg:none ATTACK
────────────────────
\`\`\`
// Attacker crafts: { "alg": "none" }.{ "sub": "admin", "role": "admin" }.
// Vulnerable library: jwt.verify(token) reads alg from the token itself → accepts any token

// Fix: ALWAYS specify allowed algorithms explicitly:
jwt.verify(token, secret, { algorithms: ["RS256"] })
// Never: jwt.verify(token, secret)  — vulnerable to algorithm confusion
\`\`\`

REFRESH TOKEN ROTATION
───────────────────────
1. Login → issue access_token (15min) + refresh_token (30 days, stored in DB)
2. Access_token expires → client sends refresh_token
3. Server verifies refresh_token exists in DB (not revoked) and matches user
4. Server issues NEW access_token + NEW refresh_token
5. Server INVALIDATES old refresh_token in DB (rotation — each token used once)
6. Logout → delete refresh_token from DB → all future refreshes denied

If an attacker steals a refresh token and uses it: the next legitimate refresh will see the old token has already been used → revoke ALL tokens for this user (reuse detection).

RBAC IN PRODUCTION
───────────────────
Three-layer model: Users → Roles → Permissions
\`\`\`
User Riya has roles: ["store-manager"]
Role "store-manager" has permissions: ["orders:read", "orders:update", "inventory:read", "inventory:update"]
Role "admin" has permissions: ["orders:*", "inventory:*", "users:*", "config:*"]
\`\`\`

Resource-level authorization (always required on top of RBAC):
Even if user has "orders:read" permission, they can only read their OWN orders — not all orders.
\`\`\`typescript
if (order.customerId !== req.user.id && !req.user.permissions.includes("orders:read:all")) {
  throw new ForbiddenError()
}
\`\`\``,
    code: `// ─── JWT IMPLEMENTATION — RS256 ─────────────────────────────────────────
// lib/jwt.ts
// const jwt = require("jsonwebtoken")
// const fs = require("fs")

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!  // RSA private key from env
const PUBLIC_KEY  = process.env.JWT_PUBLIC_KEY!   // RSA public key from env

interface TokenPayload {
  sub: string       // userId
  email: string
  role: string
  permissions: string[]
  iat?: number
  exp?: number
}

function issueAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: "RS256",   // ALWAYS specify — never rely on header
    expiresIn: "15m",
    issuer: "api.yourapp.com",
    audience: "yourapp.com"
  })
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ["RS256"],  // CRITICAL: whitelist — prevents alg:none and alg confusion
    issuer: "api.yourapp.com",
    audience: "yourapp.com"
  }) as TokenPayload
}

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided")
  }

  const token = authHeader.slice(7)  // Remove "Bearer "
  try {
    const payload = verifyToken(token)
    req.user = payload  // attach to request — available in all downstream middleware
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expired")
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid token")
    }
    throw err
  }
}

// ─── REFRESH TOKEN ROTATION ───────────────────────────────────────────────
class AuthService {
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new UnauthorizedError("Invalid credentials")

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) throw new UnauthorizedError("Invalid credentials")

    return this.issueTokenPair(user)
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token is valid
    const stored = await this.refreshTokenRepo.findByToken(refreshToken)
    if (!stored || stored.revokedAt) {
      // Reuse detected — revoke ALL tokens for this user
      if (stored) {
        await this.refreshTokenRepo.revokeAllForUser(stored.userId)
        await this.alerting.send(\`Refresh token reuse detected for user \${stored.userId}\`)
      }
      throw new UnauthorizedError("Invalid refresh token")
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired")
    }

    const user = await this.userRepo.findById(stored.userId)
    if (!user) throw new UnauthorizedError("User not found")

    // Rotate: revoke old token
    await this.refreshTokenRepo.revoke(stored.id)

    // Issue new token pair
    return this.issueTokenPair(user)
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepo.revokeByToken(refreshToken)
  }

  private async issueTokenPair(user: User): Promise<AuthTokens> {
    const permissions = await this.rbacService.getPermissions(user.role)
    const accessToken = issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions
    })

    // Refresh token: opaque random string stored in DB
    const refreshToken = crypto.randomBytes(64).toString("hex")
    await this.refreshTokenRepo.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days
    })

    return { accessToken, refreshToken, expiresIn: 900 }  // 15 min
  }
}

// ─── RBAC MIDDLEWARE ──────────────────────────────────────────────────────
function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError()

    const hasPermission = req.user.permissions.includes(permission)
      || req.user.permissions.includes(permission.split(":")[0] + ":*")
      || req.user.permissions.includes("*")

    if (!hasPermission) throw new ForbiddenError(\`Requires permission: \${permission}\`)
    next()
  }
}

// Route-level permission checks
router.get("/orders",         authMiddleware, requirePermission("orders:read"),   orderController.list)
router.post("/orders",        authMiddleware, requirePermission("orders:create"), orderController.create)
router.delete("/orders/:id",  authMiddleware, requirePermission("orders:delete"), orderController.cancel)
router.get("/admin/users",    authMiddleware, requirePermission("users:read:all"), adminController.listUsers)

// ─── RESOURCE-LEVEL AUTHORIZATION ────────────────────────────────────────
// After RBAC, check if the user owns the specific resource

class OrderController {
  async getOrder(req: Request, res: Response): Promise<void> {
    const order = await this.orderService.findById(req.params.id)
    if (!order) throw new NotFoundError("Order", req.params.id)

    // Resource-level: user can only see their own orders UNLESS they have elevated permission
    const canViewAll = req.user!.permissions.includes("orders:read:all")
    if (order.customerId !== req.user!.sub && !canViewAll) {
      throw new NotFoundError("Order", req.params.id)  // 404, not 403 — hide existence
    }

    res.json(order)
  }
}

// ─── PASSWORD HASHING — ARGON2 ────────────────────────────────────────────
// lib/password.ts
// const argon2 = require("argon2")

const ARGON2_OPTIONS = {
  type: argon2.argon2id,    // argon2id = best for password hashing
  memoryCost: 65536,        // 64MB memory — expensive for attacker to parallelize
  timeCost: 3,              // 3 iterations
  parallelism: 4,           // 4 threads
  saltLength: 16
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
  // Returns: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
  // Salt is embedded — no separate salt storage needed
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return argon2.verify(hash, password)
  } catch {
    return false  // malformed hash — treat as invalid
  }
}

// ─── OAUTH 2.0 + PKCE (Google Sign-In) ────────────────────────────────────
// In the browser: generate PKCE challenge
// This code runs client-side, but shows the pattern

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(64).toString("base64url")
  const challenge = crypto.createHash("sha256")
    .update(verifier)
    .digest("base64url")
  return { verifier, challenge }
}

// Server: exchange code for tokens (callback endpoint)
async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = req.query

  // Verify state parameter to prevent CSRF
  const storedState = await redis.get(\`oauth:state:\${req.session.id}\`)
  if (state !== storedState) throw new ForbiddenError("Invalid state parameter")

  // Exchange code for Google tokens
  const googleTokens = await googleOAuth.getToken({
    code: code as string,
    codeVerifier: req.session.pkceVerifier  // PKCE verification
  })

  const googleUser = await googleOAuth.getUserInfo(googleTokens.access_token)

  // Find or create user
  let user = await userRepo.findByEmail(googleUser.email)
  if (!user) {
    user = await userRepo.create({
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.sub,
      emailVerified: true
    })
  }

  // Issue our own JWT
  const { accessToken, refreshToken } = await authService.issueTokenPair(user)

  // Set refresh token in httpOnly cookie (can't be accessed by JS)
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000
  })

  res.json({ accessToken, expiresIn: 900 })
}`,
    bugs: `BUG 1 — Weak HS256 secret brute-forced
─────────────────────────────────────────
// Environment variable:
// JWT_SECRET=secret

const token = jwt.sign({ userId: "U1", role: "admin" }, process.env.JWT_SECRET!)
// jwt.io cracker or hashcat cracks "secret" in < 1 second
// Attacker forges tokens for any userId and role

Fix: Use a cryptographically random secret (min 256 bits):
// Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
// JWT_SECRET=a8f3b2c9d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9

// Better: Use RS256 with asymmetric keys — secret stays only on auth server.

BUG 2 — The alg:none attack
─────────────────────────────
// Vulnerable:
const payload = jwt.verify(token, secret)  // algorithm from token header
// Attacker sends: {"alg":"none","typ":"JWT"}.{"sub":"admin","role":"admin"}.
// Library accepts it — no signature needed

// Also vulnerable to algorithm confusion:
// If server has HS256 secret AND RS256 public key registered,
// attacker signs with RS256 public key as HS256 secret → accepted!

Fix: ALWAYS specify algorithm explicitly:
const payload = jwt.verify(token, secret, { algorithms: ["HS256"] })
// For RS256:
const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] })

BUG 3 — Authorization bypass via IDOR (Insecure Direct Object Reference)
──────────────────────────────────────────────────────────────────────────
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  // Authentication: checks user is logged in ✅
  // Authorization: checks nothing! Any logged-in user can see any order.
  const order = await orderRepo.findById(req.params.id)
  if (!order) return res.status(404).json({ error: "Not found" })
  res.json(order)  // Returns any user's order!
})
// Attacker: loops through order IDs 1, 2, 3, 4... harvests all orders

Fix: Always verify ownership:
if (order.customerId !== req.user.id && !req.user.permissions.includes("orders:read:all")) {
  return res.status(404).json({ error: "Not found" })  // 404, not 403
}

BUG 4 — JWT stored in localStorage — XSS token theft
──────────────────────────────────────────────────────
// Client-side code (commonly seen in tutorials):
localStorage.setItem("token", accessToken)  // XSS victim!
// Any script on your page (injected via XSS, third-party widget, etc.)
// can read localStorage and exfiltrate the token

// Production incident: a popular analytics widget was compromised,
// JS was injected to read localStorage tokens from banking apps

Fix: Store access tokens in memory (JavaScript variable).
Store refresh tokens in httpOnly, Secure, SameSite=Strict cookies.
httpOnly cookies can't be read by JavaScript — even XSS.

BUG 5 — No rate limiting on login endpoint
────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body
  const user = await userRepo.findByEmail(email)
  if (!user || !await argon2.verify(user.passwordHash, password)) {
    return res.status(401).json({ error: "Invalid credentials" })
  }
  // ... issue tokens
})
// Attacker can brute-force passwords: 1,000 attempts/second × 24hr = 86M attempts
// Common passwords ("Password@123", "Welcome1") found in minutes

Fix: Rate limit by IP and by email (brute force by different IPs):
// 5 failed attempts per email per 15 minutes → lock account temporarily
// 20 failed attempts per IP per minute → block IP
// Use Redis to track attempt counts with TTL`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const token = jwt.sign(
  { sub: "U1", role: "admin", exp: Math.floor(Date.now() / 1000) - 60 },  // expired 60 seconds ago
  "secret"
)

try {
  const decoded = jwt.verify(token, "secret")
  console.log("A:", decoded.role)
} catch (err) {
  console.log("B:", err.name)
}

try {
  const decoded = jwt.verify(token, "secret", { ignoreExpiration: true })
  console.log("C:", decoded.role)
} catch (err) {
  console.log("D:", err.name)
}

Q: What does each console.log output?
   Is ignoreExpiration ever safe to use in production? When might it be appropriate?
   What is the difference between jwt.decode() and jwt.verify()?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This auth implementation has 5 security vulnerabilities. Find and fix each.

class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body
    const user = await this.db.query(
      \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`  // Bug 1 + 2
    )

    if (!user) return res.status(401).json({ error: "Invalid" })

    const token = jwt.sign(             // Bug 3
      { userId: user.id, role: user.role },
      "mysecret",
      { expiresIn: "365d" }             // Bug 4
    )

    res.json({                          // Bug 5
      token,
      userId: user.id,
      passwordHash: user.password_hash
    })
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete authentication system:
1. POST /auth/register — hash password with argon2id, return 201 with user (no passwordHash)
2. POST /auth/login — verify, issue RS256 access token (15min) + opaque refresh token (30 days)
3. POST /auth/refresh — rotate refresh token, detect reuse and revoke all tokens if reused
4. POST /auth/logout — revoke refresh token
5. RBAC: define roles user/moderator/admin with permissions
6. Middleware: requireAuth (any logged-in user), requirePermission("resource:action")
7. Protect an endpoint: GET /admin/users requires permission "users:read:all"
8. Store refresh tokens in DB with: token, userId, expiresAt, revokedAt
9. Rate limit login: 5 attempts per email per 15 min, 20 per IP per minute`,
    summary: "Authentication proves identity; authorization proves permission. Use RS256 JWT with explicit algorithm enforcement, short access token TTLs with refresh rotation, resource-level ownership checks beyond RBAC, and Argon2id for passwords. Every shortcut in auth is a potential breach waiting to happen."
  },

  {
    id: 9,
    title: "Error Handling & Structured Logging",
    tag: "MAKING PRODUCTION DEBUGGABLE",
    color: "#6C3483",
    tldr: "Good error handling means mapping every domain error to a consistent HTTP response and never leaking internal details to clients. Structured logging means emitting machine-readable JSON with correlation IDs so you can trace a request across services, filter by severity, and alert on errors automatically. Together they make production incidents solvable in minutes instead of hours.",
    problem: `The most painful production scenario: an error occurs at 2am. Your logs say \`Error: Cannot read properties of undefined (reading 'id')\` with a stack trace pointing to line 847 of your compiled bundle. You don't know which user, which request, what data they sent, which service downstream failed, or how many other requests are affected. You spend 3 hours adding log statements, deploying, and waiting for it to happen again.

This is the cost of unstructured logging and poor error handling:
- Stack traces but no context (what user, what request, what input)
- Multiple log formats (some JSON, some plain text, some HTML from the default Express error handler)
- No correlation IDs — can't link the frontend error report to the backend log
- Sensitive data (passwords, payment details) accidentally logged
- Production returning 500s with full stack traces visible to end users

The second problem: inconsistent error handling leads to inconsistent error responses. Some routes catch errors and return 400. Some let them propagate to Express's default handler and return an HTML error page. Some swallow errors silently and return 200 with partial data. Clients can't build reliable error handling UI because the shape varies per endpoint.

The third problem: no health checks. Your Kubernetes pod is running but the database connection pool is exhausted. The load balancer keeps routing traffic to it. Every request fails. No alert fires because the process is "alive" by PID check. A proper /health endpoint would have caught this.`,
    analogy: `Think of a hospital's incident reporting system.

UNSTRUCTURED LOGGING is like doctors writing incident reports on random scraps of paper in different languages. When the hospital inspector asks "how many medication errors happened on Ward 3 between 6am and 10am on Tuesday?" — impossible to answer. The information exists but can't be queried.

STRUCTURED LOGGING is the standardized incident report form: Patient ID, Ward, Time, Staff ID, Incident Type, Severity, Description. Every field has a defined place. The hospital's reporting system can instantly answer "all medication errors, Ward 3, Tuesday morning" — a 3-second query.

CORRELATION IDs are like a patient's hospital ID number. A patient goes through reception, triage, imaging, pharmacy, discharge. At every station, the same number is recorded. A week later, you can reconstruct the entire patient journey from a single ID. Without it, you have disconnected records from each department with no way to link them.

ERROR MIDDLEWARE is like the hospital's escalation protocol. Minor issues (a nurse can handle it) → supervisor → department head → hospital director for critical incidents. Each level has a defined response. The protocol ensures nothing falls through the cracks and the right person is notified.

HEALTH CHECKS are like the hospital doing rounds: checking that every ward has staff, every pharmacy has critical medications, every piece of equipment is functional — not just that the building is standing.`,
    deep: `PINO LOG LEVELS AND WHEN TO USE THEM
──────────────────────────────────────
trace: extremely verbose, disabled in production (function entry/exit)
debug: useful during development, disabled in production by default
info:  routine operations (request served, job processed, user logged in)
warn:  something unexpected but recoverable (deprecated API used, retried operation)
error: something failed but the system continues (payment failed, email not sent)
fatal: system-level failure requiring immediate attention (DB connection lost, OOM)

RULE: alert on error and fatal. Review warn weekly. info is your audit trail.

STRUCTURED LOG FORMAT
──────────────────────
Every log entry should include:
\`\`\`json
{
  "level": "error",
  "time": 1709000000000,
  "pid": 12345,
  "hostname": "pod-abc-123",
  "traceId": "a1b2c3d4-e5f6-7890",
  "userId": "U123",
  "method": "POST",
  "url": "/api/v1/orders",
  "statusCode": 422,
  "durationMs": 145,
  "error": {
    "type": "ValidationError",
    "message": "amount must be a positive number",
    "code": "VALIDATION_ERROR"
  }
}
\`\`\`

NEVER LOG:
- Passwords (even "hashed" ones — the attempt to log them is the bug)
- JWT tokens or session IDs
- Full credit card numbers (PAN data — PCI DSS violation)
- UPI VPAs (phone numbers) in plaintext
- Full HTTP request bodies (may contain credentials)
- Database connection strings
- API keys or secrets

CORRELATION ID FLOW
────────────────────
Client → sends X-Request-ID header (or generate one)
API Gateway → forwards X-Request-ID + adds X-Trace-ID
Service A → logs with traceId: req.headers["x-trace-id"]
Service A → calls Service B with X-Trace-ID: forward the same ID
Service B → logs with same traceId
Database → slow query log includes traceId via SET LOCAL application_name

Now: grep logs by traceId → entire request journey across all services.

HEALTH CHECK DESIGN
────────────────────
/health — liveness: is the process running? Returns 200 immediately. Used by Kubernetes to know whether to restart.
/ready — readiness: can it serve traffic? Checks: DB connected, Redis connected, any required services reachable. Used by Kubernetes to know whether to route traffic.
/metrics — Prometheus metrics: request count, duration histograms, error rates.`,
    code: `// ─── CUSTOM ERROR CLASSES ────────────────────────────────────────────────
// lib/errors.ts

class AppError extends Error {
  public readonly isOperational = true  // operational = expected, don't alert

  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(422, "VALIDATION_ERROR", message, { fields })
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, "NOT_FOUND", id ? \`\${resource} '\${id}' not found\` : \`\${resource} not found\`)
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message)
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message)
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message)
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(503, "SERVICE_UNAVAILABLE", \`\${service} is currently unavailable\`)
  }
}

// ─── PINO STRUCTURED LOGGER ───────────────────────────────────────────────
// lib/logger.ts
// const pino = require("pino")

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || "local",
    service: "order-api",
    version: process.env.APP_VERSION || "unknown"
  },
  serializers: {
    err: pino.stdSerializers.err,  // serialize Error objects properly
    req: (req) => ({
      method: req.method,
      url: req.url,
      // NEVER log: req.headers.authorization, req.body.password, etc.
    }),
    res: (res) => ({ statusCode: res.statusCode })
  },
  redact: {
    // Auto-redact sensitive fields wherever they appear in logs
    paths: [
      "*.password", "*.passwordHash", "*.token", "*.secret",
      "*.creditCard", "*.cvv", "*.pan", "req.headers.authorization",
      "*.upiId"
    ],
    censor: "[REDACTED]"
  },
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined  // JSON to stdout in production, parsed by log aggregator
})

// ─── REQUEST LOGGING MIDDLEWARE ───────────────────────────────────────────
// middleware/requestLogger.ts

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()

  // Generate or forward trace ID
  const traceId = (req.headers["x-trace-id"] as string) || crypto.randomUUID()
  req.traceId = traceId
  res.setHeader("X-Trace-Id", traceId)

  // Child logger with request context — all logs from this request include traceId, userId
  req.log = logger.child({
    traceId,
    method: req.method,
    url: req.originalUrl
  })

  req.log.info("Request received")

  // Log when response is finished
  res.on("finish", () => {
    const durationMs = Date.now() - startTime
    const level = res.statusCode >= 500 ? "error"
      : res.statusCode >= 400 ? "warn"
      : "info"

    req.log[level]({
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.sub  // attach userId if authenticated
    }, "Request completed")
  })

  next()
}

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
// middleware/errorHandler.ts

function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const traceId = req.traceId || crypto.randomUUID()
  const log = req.log || logger

  if (err instanceof AppError) {
    // Operational error — expected, don't alert
    log.warn({
      err: { type: err.name, code: err.code, message: err.message },
      statusCode: err.statusCode,
      traceId
    }, "Operational error")

    res.status(err.statusCode).json({
      type: \`https://api.yourapp.com/errors/\${err.code.toLowerCase().replace(/_/g, "-")}\`,
      title: err.name,
      status: err.statusCode,
      detail: err.message,
      traceId,
      ...(err.context?.fields && { fields: err.context.fields })
    })
    return
  }

  // Unexpected error — programmer error or unhandled case — ALERT
  log.error({
    err,
    traceId,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.sub
  }, "Unhandled error")

  // In production: alert on-call
  if (process.env.NODE_ENV === "production") {
    alerting.send({
      title: "Unhandled server error",
      traceId,
      error: err instanceof Error ? err.message : String(err),
      url: req.originalUrl
    })
  }

  // NEVER expose stack traces or internal details to clients
  res.status(500).json({
    type: "https://api.yourapp.com/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred. Reference ID: " + traceId,
    traceId
  })
}

// ─── HEALTH CHECK ENDPOINTS ───────────────────────────────────────────────
// routes/health.ts

app.get("/health", (req, res) => {
  // Liveness: just return 200 — if the process is running, it's alive
  res.json({ status: "ok", uptime: process.uptime() })
})

app.get("/ready", async (req, res) => {
  // Readiness: can we actually serve traffic?
  const checks: Record<string, "ok" | "error"> = {}

  try {
    await prisma.$queryRaw\`SELECT 1\`
    checks.database = "ok"
  } catch {
    checks.database = "error"
  }

  try {
    await redis.ping()
    checks.redis = "ok"
  } catch {
    checks.redis = "error"
  }

  const allOk = Object.values(checks).every(v => v === "ok")
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "not ready",
    checks
  })
})

// ─── SERVICE LAYER ERROR PROPAGATION ─────────────────────────────────────
// Don't swallow errors — let them propagate to the error handler

class OrderService {
  async placeOrder(customerId: string, items: OrderItemInput[]): Promise<Order> {
    const customer = await this.userRepo.findById(customerId)
    if (!customer) throw new NotFoundError("Customer", customerId)

    // Throw domain errors — the controller and error handler map them to HTTP
    for (const item of items) {
      const inStock = await this.inventoryService.checkStock(item.productId, item.qty)
      if (!inStock) {
        throw new ConflictError(\`Product \${item.productId} is out of stock\`)
      }
    }

    try {
      const order = await this.orderRepo.create({ customerId, items })
      return order
    } catch (err) {
      // Wrap unexpected DB errors with context
      throw new Error(\`Failed to create order for customer \${customerId}: \${(err as Error).message}\`)
    }
  }
}`,
    bugs: `BUG 1 — Stack trace exposed to client
──────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack  // DO NOT SEND TO CLIENT
  })
})
// Production response visible to attacker:
// "stack": "Error: Cannot read property 'id' of undefined\\n at /app/src/services/order.ts:147:23\\n..."
// Reveals: file paths, line numbers, technology stack, internal variable names
// Helps attackers understand your architecture and find other vulnerabilities

Fix: Never send stack traces to clients. Log them server-side with the traceId.
Send only: human-readable message + traceId (for support lookup).

BUG 2 — Logging passwords and tokens
──────────────────────────────────────
app.post("/auth/login", async (req, res) => {
  logger.info(\`Login attempt: \${JSON.stringify(req.body)}\`)
  // Logs: {"email":"user@example.com","password":"MySecret123!"}
  // Now: passwords in your log aggregator, accessible to all engineers, retained for 30 days
  // GDPR violation, security audit failure, potential breach amplifier

Fix: Never log req.body for auth endpoints.
For other endpoints: selectively log only non-sensitive fields.
Use pino's redact option to auto-censor sensitive paths.

BUG 3 — Silent error swallowing
─────────────────────────────────
async function sendNotification(userId: string, message: string) {
  try {
    await emailService.send(userId, message)
  } catch (err) {
    // Silent: error just disappears!
    return false
  }
}
// Emails stop sending. Nobody knows.
// No log, no alert, no error count in metrics.
// Users stop receiving notifications — discovered when users start complaining, days later.

Fix: ALWAYS log errors, even if you handle them:
} catch (err) {
  logger.error({ err, userId }, "Failed to send notification")
  // Optionally: add to alerting if critical
  return false
}

BUG 4 — No correlation ID — impossible to trace requests
─────────────────────────────────────────────────────────
// All logs look like:
// {"level":"info","time":...,"message":"Order created"}
// {"level":"error","time":...,"message":"Payment failed"}
// {"level":"info","time":...,"message":"Email sent"}
// 10,000 requests per minute — you can't tell which logs belong together

// Production incident: "a user says their payment went through but no order was created"
// No way to find the specific request. Can't diagnose. Issue goes unresolved.

Fix: Generate a traceId per request, include it in EVERY log:
const traceId = req.headers["x-trace-id"] || crypto.randomUUID()
const reqLogger = logger.child({ traceId })
req.log = reqLogger  // all downstream code uses req.log

BUG 5 — /health returns 200 even when DB is down
──────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok" })  // always returns 200!
})
// Kubernetes readiness probe hits /health — sees 200 — keeps routing traffic
// But DB connection pool is exhausted — all actual requests fail with 500
// Load balancer keeps sending traffic to a broken pod for 10 minutes
// All users get errors until the pod is restarted manually

Fix: /health is liveness (process alive — can return 200).
/ready is readiness (actually ready to serve — checks dependencies):
const dbOk = await prisma.$queryRaw\`SELECT 1\`.then(() => true).catch(() => false)
if (!dbOk) return res.status(503).json({ status: "not ready", checks: { database: "error" } })`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const logger = pino({ level: "warn" })

logger.trace("trace message")   // A
logger.debug("debug message")   // B
logger.info("info message")     // C
logger.warn("warn message")     // D
logger.error("error message")   // E
logger.fatal("fatal message")   // F

Q: Which log statements actually produce output? Which are silently dropped?
   If you change level to "debug", which ones now produce output?
   What happens to log statements that are below the minimum level — are they expensive?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This error handling setup has 5 issues. Identify and fix each.

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await userService.getUser(req.params.id)
    res.json(user)
  } catch (err) {
    // Bug 1: always returns 500, even for expected errors
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

app.post("/api/payments", async (req, res) => {
  // Bug 2: logs entire body including card details
  console.log("Payment request:", JSON.stringify(req.body))

  try {
    const result = await paymentService.charge(req.body)
    res.json(result)
  } catch (err) {
    // Bug 3: swallows the error silently
    res.json({ success: false })
  }
})

// Bug 4: no traceId on error responses
// Bug 5: health check always returns 200
app.get("/health", (req, res) => res.json({ ok: true }))

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete observability setup for an Express API:
1. Custom error hierarchy: AppError, ValidationError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError
2. Pino logger with: log level from env, redact sensitive paths, structured base fields
3. Request middleware: generate/forward traceId, create child logger on req, log request + response
4. Global error handler: map AppError to correct status, log with context, never expose stack traces
5. /health (liveness) and /ready (readiness — checks DB + Redis) endpoints
6. Demonstrate: placing an order where inventory is insufficient → correct 409 response + warn log
7. Demonstrate: unexpected DB error → 500 response with traceId + error log + alert
8. Write a test that verifies: NotFoundError produces a 404 response with the correct error shape`,
    summary: "Structured logging and consistent error handling transform production debugging from a hours-long guessing game into a minutes-long search by traceId. Every error should have a known shape, every log should have context, every sensitive field should be redacted, and every critical path should have a health check."
  },

  {
    id: 10,
    title: "Scalability Patterns",
    tag: "BUILDING SYSTEMS THAT GROW WITHOUT BREAKING",
    color: "#1E8BC3",
    tldr: "Scalability means your system handles 10x more load without a rewrite. The key practices: stateless services (state in Redis, not memory), circuit breakers (fail fast before you cascade), rate limiting (protect yourself and upstream services), and graceful shutdown (drain before you die). CQRS and event sourcing are advanced patterns for when read/write scaling diverges.",
    problem: `The most common scaling failure: server-side sessions stored in Node.js process memory. Your app is deployed to 4 servers. A user logs in on server 1. Their next request goes to server 2 (load balancer round-robin). Server 2 has no session. The user is logged out. This is called the "sticky session" problem, and it forces you to either lock users to a server (no redundancy) or move state out of process memory.

The second failure: no circuit breaker on external service calls. Your payment gateway starts responding slowly — 10 seconds per request instead of 100ms. Your thread pool fills up waiting for payment responses. Your entire API starts timing out on all endpoints, not just payment ones. A single slow downstream service has cascaded into a full application outage.

The third failure: no rate limiting. A competitor scrapes your product catalog. A bug in a client app retries aggressively. A DDoS attack arrives. Without rate limiting, your application serves all of it at full speed until it collapses.

The fourth failure: stateful deployments that can't roll. Your deployment sends SIGTERM to old pods while new ones start. The old pod is mid-request — 12 concurrent payments being processed. SIGTERM kills the process immediately. 12 payments are lost, or worse, partially processed (charged but no order created).

The fifth failure: premature CQRS/event sourcing. These patterns solve real problems at scale but add enormous complexity. Teams adopt them because they sound impressive, not because they're needed. The result is a system that's harder to reason about, harder to debug, and slower to develop — with the same traffic as before.`,
    analogy: `Think of a modern bank branch network.

STATELESS SERVICES: Any teller at any branch can serve any customer. Customer data is in a central system (database/Redis), not in the teller's personal notebook. If a teller takes the day off, their customers seamlessly go to another teller. This is horizontal scaling — add more tellers, not a superhuman teller.

CIRCUIT BREAKER: The bank has a rule: "If the central credit bureau is unreachable, stop trying to contact them after 3 failures. For the next 60 seconds, automatically decline all credit applications with a specific message." This prevents tellers from sitting on hold with the bureau for hours, blocking all other work. After 60 seconds, one teller tries again ("half-open"). If it works, normal service resumes.

RATE LIMITING: The bank has a rule: "Maximum 5 cash withdrawals per customer per day." This protects against a single customer consuming all the bank's resources and protects the bank from fraud. The token bucket is like each customer getting 5 tokens per day — each withdrawal uses one.

GRACEFUL SHUTDOWN: When a bank branch closes at 5pm, the security guard doesn't eject customers mid-transaction. They stop letting new customers in (stop accepting new requests), let all current customers finish their transactions (drain in-flight requests), then lock the doors (shut down).

EVENT SOURCING: Instead of a ledger that just shows the current balance, imagine recording every single deposit, withdrawal, and transfer ever made. The balance is computed by replaying events. The ledger is immutable — you can always reconstruct the state at any point in history, and you can never "lose" a transaction.`,
    deep: `CIRCUIT BREAKER STATES
───────────────────────
Closed (normal): requests pass through. Failure counter incremented on failure.
Open (tripped): all requests immediately fail with a specific error. No calls to downstream.
Half-Open (probing): after a cooldown, let ONE request through. If it succeeds → Closed. If it fails → back to Open.

Thresholds: trip if failure rate > 50% in last 10 requests AND at least 5 requests tried.
Timeout: trip if request takes > N ms (slow = failing for scalability).

TOKEN BUCKET vs SLIDING WINDOW RATE LIMITING
─────────────────────────────────────────────
Token Bucket: user starts with N tokens, each request consumes 1, tokens replenish at R/second.
- Allows burst: all N tokens can be used at once
- More user-friendly for legitimate bursts

Sliding Window: count requests in the last N seconds.
- Smoother, more precise
- More expensive (stored in Redis sorted set with timestamps)
- No burst allowance

CQRS WHEN IT MAKES SENSE
─────────────────────────
Problem without CQRS: write queries lock rows, blocking read queries. Or read queries need denormalized data that's expensive to compute on every request.

CQRS: separate write model (normalized, optimized for writes) from read model (denormalized, optimized for reads).

Read model is built from write events: "Order placed" → update order count in read DB, update customer's order list, update inventory.

Warning: adds eventual consistency (reads may lag behind writes by milliseconds). Adds significant complexity. Only justified when read/write patterns are genuinely different and causing measurable performance problems.

GRACEFUL SHUTDOWN SEQUENCE
───────────────────────────
1. Receive SIGTERM
2. Stop accepting new connections (close server port)
3. Wait for in-flight requests to complete (drain with timeout)
4. Close database connection pool
5. Close Redis connection
6. Flush logs
7. Exit with code 0

If drain takes longer than 30s: force exit anyway (deployment can't wait forever).`,
    code: `// ─── STATELESS SERVICE — state in Redis, not process memory ────────────────
// WRONG: state in process memory — breaks with multiple instances
const activeSessions = new Map<string, Session>()  // dies on pod restart
const rateLimitCounters = new Map<string, number>() // not shared across pods

// CORRECT: all shared state in Redis
class SessionStore {
  constructor(private redis: Redis) {}

  async save(sessionId: string, data: Session, ttlSeconds = 86400): Promise<void> {
    await this.redis.setex(\`session:\${sessionId}\`, ttlSeconds, JSON.stringify(data))
  }

  async get(sessionId: string): Promise<Session | null> {
    const raw = await this.redis.get(\`session:\${sessionId}\`)
    return raw ? JSON.parse(raw) : null
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(\`session:\${sessionId}\`)
  }

  async refresh(sessionId: string, ttlSeconds = 86400): Promise<void> {
    await this.redis.expire(\`session:\${sessionId}\`, ttlSeconds)
  }
}

// ─── CIRCUIT BREAKER ─────────────────────────────────────────────────────
class CircuitBreaker {
  private failures = 0
  private successes = 0
  private lastFailureTime = 0
  private state: "closed" | "open" | "half-open" = "closed"

  constructor(
    private readonly options: {
      failureThreshold: number    // trip after N consecutive failures
      successThreshold: number    // close after N consecutive successes (half-open)
      timeout: number             // ms before attempting half-open
      callTimeout: number         // ms before treating a call as failed
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.state = "half-open"
        this.failures = 0
      } else {
        throw new ServiceUnavailableError("Circuit breaker is open — downstream service unavailable")
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Circuit breaker call timeout")), this.options.callTimeout)
        )
      ])

      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state === "half-open") {
      this.successes++
      if (this.successes >= this.options.successThreshold) {
        this.state = "closed"
        this.successes = 0
        logger.info("Circuit breaker closed — downstream service recovered")
      }
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.options.failureThreshold) {
      if (this.state !== "open") {
        this.state = "open"
        logger.error({ failures: this.failures }, "Circuit breaker opened — downstream service failing")
        alerting.send("Circuit breaker tripped for payment service")
      }
    }
  }

  getState(): string { return this.state }
}

// Usage: wrap every external service call
const paymentCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60_000,      // 60 seconds open before attempting half-open
  callTimeout: 5_000    // 5 second call timeout
})

class PaymentService {
  async charge(amountPaise: number, orderId: string): Promise<PaymentResult> {
    return paymentCircuitBreaker.execute(async () => {
      return razorpayClient.charge({ amount: amountPaise, orderId })
    })
  }
}

// ─── RATE LIMITING — Token Bucket with Redis ─────────────────────────────
// Sliding window counter using Redis sorted set

class RateLimiter {
  constructor(
    private redis: Redis,
    private readonly options: {
      windowMs: number    // time window in ms
      maxRequests: number // max requests per window
      keyPrefix: string
    }
  ) {}

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = \`\${this.options.keyPrefix}:\${identifier}\`
    const now = Date.now()
    const windowStart = now - this.options.windowMs
    const resetAt = now + this.options.windowMs

    const pipeline = this.redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)  // remove expired entries
    pipeline.zadd(key, now, \`\${now}:\${Math.random()}\`)  // add current request
    pipeline.zcard(key)                              // count in window
    pipeline.expire(key, Math.ceil(this.options.windowMs / 1000))

    const results = await pipeline.exec()
    const count = results![2][1] as number

    return {
      allowed: count <= this.options.maxRequests,
      remaining: Math.max(0, this.options.maxRequests - count),
      resetAt
    }
  }
}

// Middleware: 100 requests per minute per IP, 1000 per day per user
const ipRateLimiter  = new RateLimiter(redis, { windowMs: 60_000, maxRequests: 100, keyPrefix: "rl:ip" })
const userRateLimiter = new RateLimiter(redis, { windowMs: 86_400_000, maxRequests: 1000, keyPrefix: "rl:user" })

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || "unknown"
  const ipCheck = await ipRateLimiter.check(ip)

  res.setHeader("X-RateLimit-Limit", 100)
  res.setHeader("X-RateLimit-Remaining", ipCheck.remaining)
  res.setHeader("X-RateLimit-Reset", new Date(ipCheck.resetAt).toUTCString())

  if (!ipCheck.allowed) {
    res.status(429).json({
      type: "https://api.yourapp.com/errors/rate-limit-exceeded",
      title: "Too Many Requests",
      status: 429,
      detail: "You have exceeded the rate limit. Please try again later.",
      retryAfter: Math.ceil(ipCheck.resetAt / 1000)
    })
    return
  }

  next()
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────
let isShuttingDown = false

function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return
    isShuttingDown = true

    logger.info({ signal }, "Shutdown signal received — starting graceful shutdown")

    // Step 1: Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed — no new connections accepted")
    })

    // Step 2: Reject new requests (middleware)
    // (isShuttingDown checked in request handler middleware)

    // Step 3: Wait for in-flight requests to drain (max 30 seconds)
    const drainTimeout = setTimeout(() => {
      logger.warn("Drain timeout exceeded — forcing shutdown")
      process.exit(1)
    }, 30_000)

    // Step 4: Close infrastructure connections
    try {
      await prisma.$disconnect()
      logger.info("Database connection closed")

      await redis.quit()
      logger.info("Redis connection closed")

      clearTimeout(drainTimeout)
      logger.info("Graceful shutdown complete")
      process.exit(0)
    } catch (err) {
      logger.error({ err }, "Error during shutdown")
      process.exit(1)
    }
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))  // Kubernetes sends SIGTERM
  process.on("SIGINT",  () => shutdown("SIGINT"))   // Ctrl+C in development
}

// Middleware: reject new requests during shutdown
function shutdownMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isShuttingDown) {
    res.setHeader("Connection", "close")
    res.status(503).json({ error: "Server is shutting down" })
    return
  }
  next()
}

// ─── CQRS — SIMPLE IMPLEMENTATION ────────────────────────────────────────
// Write model: normalized, optimized for writes and consistency
interface OrderWriteModel {
  id: string
  customerId: string
  items: OrderItem[]
  status: OrderStatus
  totalAmountPaise: number
  createdAt: Date
}

// Read model: denormalized, optimized for the specific read patterns
interface OrderListReadModel {
  id: string
  customerName: string     // denormalized from users table
  customerEmail: string
  itemCount: number        // pre-computed
  totalAmountPaise: number
  statusLabel: string      // pre-formatted for UI
  createdAt: Date
}

// Write side: strict domain model, event emission
class OrderCommandHandler {
  async placeOrder(command: PlaceOrderCommand): Promise<void> {
    const order = await this.orderRepo.create(command)
    // Emit event for read model projection
    await this.eventBus.emit("order.placed", {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmountPaise: order.totalAmountPaise,
      createdAt: order.createdAt
    })
  }
}

// Read side: projection that builds and maintains the read model
class OrderProjection {
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const customer = await this.userRepo.findById(event.customerId)
    // Build and store the denormalized read model
    await this.orderReadRepo.upsert({
      id: event.orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      itemCount: event.items.length,
      totalAmountPaise: event.totalAmountPaise,
      statusLabel: "Pending",
      createdAt: event.createdAt
    })
  }
}

// Read side: fast, no JOINs needed
class OrderQueryHandler {
  async getOrderList(customerId: string): Promise<OrderListReadModel[]> {
    return this.orderReadRepo.findByCustomerId(customerId)
    // No JOINs, no computation — pre-built read model
  }
}`,
    bugs: `BUG 1 — State in process memory breaks horizontal scaling
─────────────────────────────────────────────────────────
const userPreferences = new Map<string, Preferences>()  // in-memory state!

app.post("/api/preferences", authMiddleware, async (req, res) => {
  userPreferences.set(req.user.id, req.body)  // stored in THIS process only
  res.json({ success: true })
})

app.get("/api/preferences", authMiddleware, async (req, res) => {
  const prefs = userPreferences.get(req.user.id)  // only works if SAME process
  res.json(prefs ?? {})
})

// With 3 server instances and round-robin load balancing:
// POST goes to instance 1 → saved in instance 1's memory
// GET goes to instance 2 → Map is empty → returns {} → user sees no preferences

Fix: Move all shared state to Redis:
await redis.setex(\`prefs:\${req.user.id}\`, 86400, JSON.stringify(req.body))
const prefs = await redis.get(\`prefs:\${req.user.id}\`)

BUG 2 — No circuit breaker — cascading failure
────────────────────────────────────────────────
async function placeOrder(data: OrderData) {
  // Payment service starts responding in 10 seconds (10,000ms)
  const payment = await paymentClient.charge(data.amountPaise)
  // Without timeout or circuit breaker:
  // 100 concurrent requests × 10s wait = all Node.js async capacity consumed
  // Entire API becomes unresponsive — even endpoints with no payment dependency
  const order = await orderRepo.create(data)
  return { payment, order }
}

Fix: Wrap in circuit breaker with timeout:
const payment = await paymentCircuitBreaker.execute(() =>
  paymentClient.charge(data.amountPaise)
)  // Fails fast after 5 consecutive timeouts — other endpoints unaffected

BUG 3 — Graceful shutdown not implemented — in-flight requests killed
──────────────────────────────────────────────────────────────────────
// Kubernetes deployment: new pods start, SIGTERM sent to old pods
// Node.js process exits immediately on SIGTERM (default behavior)
// 50 in-flight requests: some mid-payment, some mid-DB-transaction
// Database transactions left open → connection pool exhausted in new pods
// Payment charged but order not created → customer angry, finance confused

Fix: Implement shutdown handler as shown above.
Key: server.close() + drain timeout + explicit disconnect of DB and Redis.
Set terminationGracePeriodSeconds: 35 in Kubernetes deployment.

BUG 4 — Rate limiter per-process instead of per-cluster
─────────────────────────────────────────────────────────
// In-memory rate limiter — common "quick fix"
const requestCounts = new Map<string, { count: number; resetAt: number }>()

app.use((req, res, next) => {
  const ip = req.ip!
  const now = Date.now()
  const entry = requestCounts.get(ip) || { count: 0, resetAt: now + 60_000 }
  
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + 60_000
  }
  entry.count++
  requestCounts.set(ip, entry)
  
  if (entry.count > 100) return res.status(429).json({ error: "Too many requests" })
  next()
})

// With 4 server instances: effective limit = 400 requests/min (100 × 4 instances)
// An attacker distributes their 400 req/min across all 4 instances = bypasses limiting

Fix: Use Redis-backed rate limiter — shared across all instances.

BUG 5 — CQRS read model not updated after write
─────────────────────────────────────────────────
// Write operation: order status updated in orders table
await prisma.order.update({ where: { id }, data: { status: "SHIPPED" } })
// But the read model (order_list_view table) is NOT updated!
// Users still see "Pending" in their order list for hours until the projection catches up

// This is the danger of eventual consistency:
// If your event bus or projection worker fails silently, reads are permanently stale

Fix: Always monitor projection lag:
// Alert if projection is > 5 seconds behind the write model
// Provide a mechanism to rebuild the read model from scratch
// Make your event processors idempotent (safe to replay)`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 5000,
  callTimeout: 1000
})

// Simulate failures
for (let i = 0; i < 3; i++) {
  try { await breaker.execute(() => Promise.reject(new Error("fail"))) } catch {}
}
console.log("A:", breaker.getState())

// Simulate timeout passing
// (fast-forward 5001ms)
console.log("B:", breaker.getState())  // right after timeout passes

try { await breaker.execute(() => Promise.resolve("ok")) }
catch {}
console.log("C:", breaker.getState())

try { await breaker.execute(() => Promise.resolve("ok")) }
catch {}
console.log("D:", breaker.getState())

Q: What is the state at A, B, C, and D?
   What would happen at B if the timeout hadn't passed yet?
   What happens at C if the execution fails instead of succeeds?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This Node.js service has 4 scalability problems. Identify and fix each.

// Problem 1: state in process memory
const pendingJobs = new Set<string>()

app.post("/jobs/:id/start", (req, res) => {
  pendingJobs.add(req.params.id)
  res.json({ started: true })
})

// Problem 2: no circuit breaker on external call
app.get("/products/:id/price", async (req, res) => {
  const price = await pricingService.getPrice(req.params.id)  // external service
  res.json({ price })
})

// Problem 3: no graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down")
  process.exit(0)  // immediate kill!
})

// Problem 4: rate limiter only on API, not on the background job queue consumer
const worker = new Worker("jobs", async (job) => {
  await callExternalApi(job.data)  // no rate limit — can exceed external API quota
})

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a scalable order processing service:
1. Stateless: all session and rate limit state in Redis — works across 4 instances
2. Circuit breaker: wrap payment service calls, trip after 5 failures, 60s timeout, 2 successes to close
3. Rate limiter: 100 req/min per IP, 1000 req/day per user — Redis sliding window
4. Graceful shutdown: drain in-flight requests (max 30s), close DB and Redis connections
5. Health checks: /health (liveness), /ready (checks DB + Redis)
6. Demonstrate: circuit opens when payment service fails → all payment requests get 503 immediately → other endpoints unaffected
7. Demonstrate: rate limit exceeded → 429 with X-RateLimit-* headers and Retry-After
8. Demonstrate: SIGTERM during active requests → requests complete before shutdown`,
    summary: "Scalability is earned through discipline: keep services stateless, protect downstream with circuit breakers, protect yourself with rate limiting, and shut down gracefully. CQRS and event sourcing solve real problems at real scale — but apply them only when you've measured the pain they solve, not before."
  }
];

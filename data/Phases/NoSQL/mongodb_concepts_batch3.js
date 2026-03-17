const concepts = [
  {
    id: 9,
    title: "Sharding — Horizontal Scaling",
    tag: "SPLITTING DATA ACROSS MACHINES WHEN ONE ISN'T ENOUGH",
    color: "#1A5276",
    tldr: "Sharding partitions your data across multiple MongoDB nodes (shards), each holding a subset of documents. You need it later than you think — a well-indexed, properly tuned single replica set handles 100GB and tens of thousands of ops/sec comfortably. When you do need it, shard key selection is the most consequential decision you'll make: it determines write distribution, query isolation, and whether you create hotspots that defeat the entire purpose.",
    problem: `The most expensive sharding mistake: sharding too early. Sharding adds significant operational complexity — mongos routers, config servers, shard-aware queries, scatter-gather operations, cross-shard transactions. Engineers reach for sharding when they feel their database is "getting big," but "big" for MongoDB means genuinely large: hundreds of gigabytes to terabytes of data, or sustained throughput that maxes out a single node's I/O capacity. Most applications never get there. Atlas M30 instances (32GB RAM, fast NVMe) handle enormous workloads before sharding is needed.

The second, much more dangerous mistake: choosing the wrong shard key. A shard key is permanent — you cannot change it without dumping and reloading your entire dataset. The wrong choice will:
- Create hotspots: if your shard key is "createdAt" (monotonically increasing), all new writes go to the shard holding the highest range. You've created a write hotspot — one shard gets all writes while others sit idle.
- Cause scatter-gather queries: if your most common query filters by a field not in the shard key, MongoDB must send that query to ALL shards and merge results. 10 shards = 10x the work.
- Create jumbo chunks: if your shard key has low cardinality (e.g., "status" with only 5 values), MongoDB cannot split chunks further. All documents with status="PENDING" pile into one chunk, one shard.

The third mistake: not understanding zone sharding. Compliance requirements in India mandate that financial data for Indian users must reside in Indian data centers. Without zone sharding, your data is distributed randomly across regions. With zone sharding, you can tag shards with "region:india" and route all Indian user data exclusively to those shards.`,
    analogy: `Think of sharding like the evolution of a postal sorting facility.

A SINGLE REPLICA SET is like one large post office. It handles all letters for a city. As the city grows, you hire more staff (scale up: more RAM, faster disks). This works until the post office is physically full or the volume exceeds what any single building can process.

SHARDING is like opening multiple sorting facilities. City divided into postal zones: Zone A sorts letters starting with Aa-Ak, Zone B sorts Al-Az, Zone C sorts Ba-Bz. Each facility handles only its zone. The total capacity is the sum of all facilities.

THE MONGOS ROUTER is the postal headquarters that knows which facility handles which zone. You send all letters to headquarters; headquarters routes each letter to the correct facility. A query that asks "give me all letters for name=Rahul" goes to the correct zone immediately. A query that asks "give me all letters for people who ordered something last Tuesday" must be broadcast to ALL zones (scatter-gather) since "order date" isn't the sorting key.

THE SHARD KEY is the sorting rule. "Sort by last name A-Z" — good distribution (letters spread evenly across zones). "Sort by date received" — BAD: today's letters ALL go to the last zone. Tomorrow's letters also go to the last zone. Zones for A-2020 and B-2021 sit empty while C-2024 is overwhelmed. That's the monotonically increasing hotspot.

ZONE SHARDING is like a legal requirement: "All letters containing sensitive financial information from Mumbai must be stored in the Mumbai facility, not the Chennai or Delhi facilities." You tag certain facilities with "Mumbai" and configure routing rules that send Mumbai-origin sensitive letters only to tagged facilities.`,
    deep: `WHEN TO SHARD — REAL THRESHOLDS
─────────────────────────────────
Before sharding, verify you've maximized single-node performance:
- All query patterns have appropriate indexes (explain() shows IXSCAN, not COLLSCAN)
- Working set (hot data) fits in RAM — WiredTiger cache (60% of RAM) holds active data
- Disk I/O is not the bottleneck (check iostat: <80% utilization)
- You've used Atlas vertical scaling (M30 → M50 → M80 → M200)

Sharding is warranted when:
- Dataset exceeds what can be indexed in RAM (working set >> available RAM)
- Sustained write throughput maxes out primary disk I/O
- Read throughput maxes out replica set (adding more secondaries doesn't help writes)
- Data volume makes backup/restore impractically slow on one node

SHARD KEY PROPERTIES — THE THREE RULES
─────────────────────────────────────────
1. HIGH CARDINALITY: many distinct values. "gender" (2 values) → catastrophic. "customerId" (millions) → excellent. Cardinality determines maximum number of chunks MongoDB can create.

2. EVEN WRITE DISTRIBUTION: new writes spread across all shards. Monotonically increasing keys (ObjectId, timestamp, auto-increment int) cause write hotspots — all writes go to the shard with the highest range.

3. QUERY ISOLATION: your most frequent queries filter by the shard key (or the shard key prefix). Queries that don't include the shard key → scatter-gather to all shards.

RANGE vs HASH SHARDING
────────────────────────
Range sharding: documents with similar shard key values are on the same shard. Good for range queries on the shard key. Bad for monotonically increasing keys (hotspot).

Hash sharding: MongoDB hashes the shard key value before assigning to a shard. Values are distributed randomly across shards. Excellent write distribution. BUT: range queries on shard key become scatter-gather (hash destroys ordering).

COMPOUND SHARD KEYS
────────────────────
Best practice for most use cases: { customerId: 1, _id: 1 } or { tenantId: 1, createdAt: 1 }
- First field: high cardinality identifier → isolates queries per customer/tenant
- Second field: the natural sort key → provides within-customer ordering without scatter-gather
- New writes: distributed by customerId, not monotonically increasing

JUMBO CHUNKS
─────────────
If a chunk contains documents that all share the same shard key value, MongoDB cannot split it. Example: shard key = "city", chunk = all documents where city = "Bengaluru". If 5 million documents are in Bengaluru, they're in one chunk, one shard, forever. That shard is hot; the others are cold. This is the low-cardinality trap.

ZONE SHARDING (DATA LOCALITY)
──────────────────────────────
Assign shards to zones, define shard key ranges for each zone:
\`\`\`javascript
// Shard tagged "india" handles Indian users
sh.addTagRange("db.users", { region: "IN" }, { region: "IO" }, "india")
// Shard tagged "us" handles US users
sh.addTagRange("db.users", { region: "US" }, { region: "UT" }, "us")
\`\`\`
MongoDB routes all documents with region starting "IN" to India-tagged shards.`,
    code: `// ─── CHECKING IF YOU NEED SHARDING ───────────────────────────────────────
// Before sharding: run these diagnostics on your replica set

// 1. Check collection sizes
const stats = await db.collection("orders").stats()
console.log({
  totalDocuments: stats.count,
  avgDocSizeBytes: stats.avgObjSize,
  totalDataMB: Math.round(stats.size / 1024 / 1024),
  totalIndexMB: Math.round(stats.totalIndexSize / 1024 / 1024),
  storageFileMB: Math.round(stats.storageSize / 1024 / 1024)
})

// 2. Check WiredTiger cache usage (working set in RAM)
const serverStatus = await db.command({ serverStatus: 1 })
const cache = serverStatus.wiredTiger.cache
console.log({
  cacheMaxGB: (cache["maximum bytes configured"] / 1024 / 1024 / 1024).toFixed(1),
  cacheCurrentGB: (cache["bytes currently in the cache"] / 1024 / 1024 / 1024).toFixed(1),
  cacheUtilizationPct: (
    (cache["bytes currently in the cache"] / cache["maximum bytes configured"]) * 100
  ).toFixed(1),
  // If > 80%: working set larger than cache → frequent disk reads → scale up RAM first
  pagesEvictedByApp: cache["pages evicted by application threads"],  // > 0 = cache pressure
})

// 3. Check ops per second
const opcounters = serverStatus.opcounters
console.log("Ops per second snapshot:", opcounters)

// ─── SHARD KEY SELECTION EXAMPLES ─────────────────────────────────────────
// BAD shard key: monotonically increasing ObjectId
// { _id: 1 } — all new documents go to the shard with the highest range
// Write hotspot: Shard 3 gets 100% of writes while Shard 1 and 2 sit idle

// Enable sharding on database
// sh.enableSharding("ecommerce")

// BAD: hash on ObjectId removes hotspot but creates scatter-gather for all queries
// sh.shardCollection("ecommerce.orders", { _id: "hashed" })
// Every query without _id in filter → scatter-gather to all shards

// GOOD: compound shard key — customerId for isolation, _id for distribution
// sh.shardCollection("ecommerce.orders", { customerId: 1, _id: 1 })

// Now:
// Query { customerId: "U_RAHUL" } → single shard (Shard 1 owns U_RAHUL's range)
// Query { customerId: "U_RAHUL", createdAt: { $gte: date } } → single shard
// Query { status: "PENDING" } → scatter-gather (status not in shard key)
// New writes: distributed across shards by customerId (not monotonically increasing)

// GOOD for multi-tenant SaaS: { tenantId: 1, _id: 1 }
// sh.shardCollection("saas.events", { tenantId: 1, _id: 1 })
// Each tenant's data lives on one shard → fast tenant-scoped queries

// GOOD for IoT: { deviceId: 1, bucketStart: 1 }
// sh.shardCollection("iot.sensor_buckets", { deviceId: 1, bucketStart: 1 })
// Queries for a device's time range → single shard

// ─── HASH SHARDING FOR HIGH-WRITE UNIFORM DISTRIBUTION ───────────────────
// When you need maximum write distribution and your queries always filter by _id

// sh.shardCollection("ecommerce.page_views", { _id: "hashed" })
// Page views inserted at millions/sec → distributed uniformly across all shards
// Trade-off: range queries on _id are scatter-gather (page views don't have range queries)

// ─── ZONE SHARDING FOR DATA LOCALITY / COMPLIANCE ────────────────────────
// Requirement: Indian user data must reside on Indian shards (RBI data localization)

// Step 1: Tag shards with region
// sh.addShardTag("shard1", "india")  // shard1 and shard2 in Mumbai DC
// sh.addShardTag("shard2", "india")
// sh.addShardTag("shard3", "us")     // shard3 and shard4 in US DC
// sh.addShardTag("shard4", "us")

// Step 2: Shard key includes region field
// sh.shardCollection("ecommerce.users", { region: 1, _id: 1 })

// Step 3: Define zone ranges
// sh.addTagRange(
//   "ecommerce.users",
//   { region: "IN", _id: MinKey },   // all documents where region starts at "IN"
//   { region: "IO", _id: MinKey },   // up to (not including) "IO"
//   "india"                           // route to india-tagged shards
// )

// Result: all users with region: "IN" are stored exclusively on shard1 and shard2

// ─── QUERYING A SHARDED CLUSTER — TARGETED VS SCATTER-GATHER ─────────────
// With shard key { customerId: 1, _id: 1 }:

// TARGETED QUERY: includes shard key → mongos routes to exactly one shard
const targeted = await db.collection("orders").find({
  customerId: "U_RAHUL",                    // shard key field → targeted!
  status: "PENDING"
}).explain("executionStats")
// explain shows: "queryPlanner.winningPlan.shards" → only 1 shard queried

// SCATTER-GATHER: no shard key → mongos queries ALL shards, merges results
const scattered = await db.collection("orders").find({
  status: "PENDING",                        // not in shard key → all shards
  totalAmountPaise: { $gt: 100000 }
}).explain("executionStats")
// explain shows: "queryPlanner.winningPlan.shards" → all shards queried
// For N shards: N × (query latency) + merge time

// ─── CHECKING CHUNK DISTRIBUTION (BALANCE) ────────────────────────────────
// Run against mongos (not mongod directly)
// db.adminCommand({ listShards: 1 })

// Check chunk counts per shard
// use config
// db.chunks.aggregate([
//   { $group: { _id: "$shard", chunks: { $sum: 1 } } },
//   { $sort: { chunks: -1 } }
// ])

// BALANCED: shards have roughly equal chunk counts
// UNBALANCED: one shard has 10x more chunks → hotspot or bad shard key

// ─── MONGOS CONNECTION PATTERN ────────────────────────────────────────────
// Applications connect to mongos, not directly to shards
// mongos is stateless — run multiple for HA, all connect to same config servers

const mongosUri = process.env.MONGODB_URI!  // points to mongos, not shard
const client = new MongoClient(mongosUri, {
  // Increase pool size for mongos — handles routing for many requests
  maxPoolSize: 50,
  // mongos adds latency for routing — increase timeout slightly vs direct shard connection
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000
})

// Check if connected to mongos or mongod
const isMaster = await db.command({ isMaster: 1 })
if (isMaster.msg === "isdbgrid") {
  console.log("Connected to mongos (sharded cluster)")
} else {
  console.log("Connected to mongod (replica set or standalone)")
}`,
    bugs: `BUG 1 — Monotonically increasing shard key creates write hotspot
──────────────────────────────────────────────────────────────────
// sh.shardCollection("ecommerce.orders", { createdAt: 1 })
// Range sharding on timestamp: all new orders always go to the LAST chunk
// Because createdAt always increases, the max-range chunk always gets new data

// Shard 1 (older data): 0 writes/sec, mostly idle
// Shard 2 (recent data): 0 writes/sec, mostly idle
// Shard 3 (current range): 100% of writes — HOTSPOT

// Symptoms: Shard 3 CPU at 95%, disk I/O saturated
// Shard 1 and 2: CPU at 5%, mostly idle
// Adding more shards doesn't help — they all start empty; new writes still go to Shard 3

Fix: Never use monotonically increasing keys as shard keys.
Options:
1. Use compound key: { customerId: 1, createdAt: 1 } → distributes by customer first
2. Use hashed shard key: { createdAt: "hashed" } → hashing removes monotonic ordering
3. Use a bucket field: { dayBucket: 1, _id: 1 } → dayBucket cycles through values

BUG 2 — Low-cardinality shard key creates jumbo chunks
────────────────────────────────────────────────────────
// sh.shardCollection("ecommerce.orders", { status: 1 })
// status has only 5 values: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
// MongoDB creates at most 5 chunks — one per status value
// With 10 million DELIVERED orders: one chunk holds 10 million documents
// MongoDB cannot split a chunk where all documents share the same shard key value

// Result: "jumbo chunk" — one shard holds millions of documents that can't be moved
// Balancer gives up trying to balance this shard

// Fix: Use a compound shard key with high cardinality as the first field:
// sh.shardCollection("ecommerce.orders", { customerId: 1, status: 1 })
// customerId has millions of values → chunks split cleanly → balanced distribution

BUG 3 — Querying without shard key causes scatter-gather at scale
──────────────────────────────────────────────────────────────────
// Shard key: { customerId: 1, _id: 1 }
// Admin dashboard query: "find all PENDING orders" — no customerId filter
const pendingOrders = await db.collection("orders").find({
  status: "PENDING"
}).toArray()

// mongos broadcasts to ALL 10 shards
// Each shard performs an index scan (if status is indexed)
// mongos merges 10 result sets
// Query that took 20ms on single node now takes 200ms (10x scatter-gather overhead)

// With 50 shards: 50x overhead. Admin dashboard becomes unusable.

Fix 1: Add customerId to the query (if admin is filtering for a specific customer)
Fix 2: Keep a non-sharded "admin" collection that stores summary data for cross-shard queries
Fix 3: Use $merge aggregation to periodically write aggregate summaries to a dedicated reporting collection

BUG 4 — Changing shard key after production deployment
────────────────────────────────────────────────────────
// Original shard key: { email: 1 } — seemed reasonable at design time
// Problem discovered: users can change email, invalidating their shard placement
// Also: email has medium cardinality, queries by userId scatter-gather

// MongoDB 5.0 allows shard key changes on some configurations, but:
// — Cannot change from range to hash or vice versa
// — Requires a full collection reshard (hours of I/O on large collections)
// — During reshard: read and write performance degrades significantly
// — Production incident: 6-hour reshard caused 40% write latency increase

Fix: Spend significant time choosing the shard key BEFORE sharding.
Test with realistic data volumes in staging. Ask:
1. Will this field exist on every document? (Can't shard on optional field)
2. Will this field ever change? (Shard key is immutable per document)
3. Does it distribute writes evenly? (Simulate write patterns)
4. Does it isolate our most common queries? (Check query patterns)

BUG 5 — Running aggregations without shard key — merging on mongos
────────────────────────────────────────────────────────────────────
// Monthly revenue report — no shard key in $match
await db.collection("orders").aggregate([
  { $match: { createdAt: { $gte: new Date("2024-03-01") } } },  // not shard key!
  { $group: { _id: "$customerId", revenue: { $sum: "$totalAmountPaise" } } }
])
// mongos sends aggregation to ALL shards
// Each shard groups its local data
// mongos receives 10 partial $group results and must MERGE them (re-group on mongos)
// Merge happens in mongos RAM — mongos can become CPU/memory bottleneck

// With 50 shards: 50 partial results merged on one mongos node
// If each shard has 1M groups: 50M groups loaded into mongos RAM → OOM

Fix: Use $merge to write aggregation results to a collection on one shard
// Or: Use dedicated analytics DB (Atlas Data Federation, BI Connector)
// Or: Include shard key in $match to route to single shard`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Sharded cluster: 3 shards, shard key { customerId: 1, _id: 1 }
Chunk distribution:
  Shard 1: customerId [MinKey → "M"]
  Shard 2: customerId ["M" → "S"]
  Shard 3: customerId ["S" → MaxKey]

Query A: db.orders.find({ customerId: "U_RAHUL" })
Query B: db.orders.find({ customerId: "U_SARA" })
Query C: db.orders.find({ status: "PENDING" })
Query D: db.orders.find({ customerId: "U_MEERA", status: "PENDING" })
Query E: db.orders.count()

Q: Which shard(s) does each query go to?
   Which queries are "targeted" vs "scatter-gather"?
   If Shard 2 goes down, which queries fail? Which still work?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This sharding setup has 4 design problems. Identify and fix each.

// Problem 1: shard key choice
sh.shardCollection("ecommerce.orders", { createdAt: 1 })

// Problem 2: low cardinality field in shard key
sh.shardCollection("ecommerce.products", { category: 1 })
// categories: ["electronics", "clothing", "furniture", "books", "grocery"]

// Problem 3: querying without shard key in a tight loop (admin sync job)
async function syncPendingOrders() {
  const orders = await db.collection("orders").find({ status: "PENDING" }).toArray()
  for (const order of orders) {
    await externalSystem.sync(order)
  }
}

// Problem 4: aggregation without shard key that merges on mongos
await db.collection("orders").aggregate([
  { $group: { _id: "$sellerId", revenue: { $sum: "$totalAmountPaise" } } }
])

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design a sharding strategy for a multi-tenant B2B SaaS (like Zoho CRM):
1. Collections: tenants, users, contacts, deals, activities (millions of records per tenant)
2. Choose shard keys for each collection — justify each choice
3. Explain how querying "all deals for tenant T1" uses the shard key
4. Show zone sharding for: EU tenants on EU shards (GDPR), India tenants on India shards (RBI)
5. Define the threshold at which you'd actually shard (size, ops/sec, working set)
6. Show how to check if your sharded cluster is balanced (chunk distribution)
7. Demonstrate a mongos router health check in your application startup`,
    summary: "Sharding is a last resort for scaling MongoDB — most applications never need it. When you do need it, the shard key is the most permanent decision you make: choose high cardinality, even write distribution, and query isolation over whatever seems intuitive. A bad shard key creates hotspots that sharding was meant to solve."
  },

  {
    id: 10,
    title: "Change Streams",
    tag: "REACTING TO DATA CHANGES IN REAL TIME",
    color: "#7D6608",
    tldr: "Change streams let your application subscribe to a MongoDB collection and receive an event every time a document is inserted, updated, replaced, or deleted — without polling. They're built on the replica set oplog, so they're reliable, resumable (via resume token), and low-latency. The primary use cases are cache invalidation, real-time notifications, audit trails, and event sourcing.",
    problem: `The most common alternative to change streams — polling — is both inefficient and unreliable. Polling looks like: run a query every 5 seconds to find "anything updated since last check." This burns database resources, adds 0–5 seconds of latency to event detection, is hard to make reliable (what if two updates happen in 5 seconds?), and doesn't capture deletions well. At scale, thousands of services polling the same collection can overwhelm the primary.

The second problem: developers build change stream consumers without resume tokens and then wonder why they miss events after a deployment restart. When your change stream consumer restarts, it starts fresh from "now" — all events that occurred during the downtime are silently missed. Resume tokens solve this: store the last processed resume token, and when you restart, pass it to the watch() call. MongoDB replays all events you missed while you were down.

The third problem: misunderstanding fullDocument behavior. By default, an update event in a change stream only contains the changed fields (updateDescription), not the full document. If your consumer needs the complete document state, you must enable fullDocument: "updateLookup". But this performs an additional read to fetch the document — the document you get might be slightly newer than the change event if another update happened in between.

The fourth problem: change streams on large write-throughput collections creating oplog pressure. The oplog is a fixed-size capped collection. Under high write load, old oplog entries are overwritten before a slow consumer can read them. If this happens, the change stream cursor is invalidated with a "Change Stream History Lost" error. The consumer must re-initialize and potentially reconcile missed events from the full collection state.

The fifth problem: not understanding that change streams require a replica set. Change streams are impossible on standalone mongod instances. Many developers work locally with standalone MongoDB and discover this limitation when they try to run change stream code in staging.`,
    analogy: `Think of change streams as a newspaper subscription vs going to the newsstand every day.

POLLING is going to the newsstand every morning to check if there's a new paper. If you oversleep, you might miss yesterday's paper (it sold out). You're consuming the newsstand's resources even on days when no paper was printed. And you find out about news as often as you check — not the moment it happens.

CHANGE STREAMS is a subscription: the newspaper publisher delivers to your door the moment each edition is printed. You don't check — you receive. The delivery is guaranteed, and the publisher keeps a receipt (resume token) of what was delivered to you. If you're on vacation for a week, you can give the publisher your last receipt and they'll deliver all missed editions when you return.

THE OPLOG is the newspaper's printing log — a record of every edition ever printed. Change streams read from this log. If the log is short (small oplog) and the newspaper prints very fast (high write volume), old entries are overwritten before slow subscribers can read them. A "Change Stream History Lost" error is the newspaper telling you: "Your subscription lapsed so long that we've already recycled the papers you missed."

RESUME TOKEN is like the page number of the last article you read. "I read up to page 47." When you come back, you tell the publisher: "Start me from page 48." All subsequent pages are delivered in order, with nothing missed.

FULLDOCUMENT: "updateLookup" is like the newspaper calling the relevant government office to get the full current state of an article's subject, not just the change that was published. The full document you receive is current-at-fetch-time — slightly ahead of the change event if the subject changed again between the event and the fetch.`,
    deep: `CHANGE STREAM INTERNALS — OPLOG
────────────────────────────────
Change streams are a client-facing abstraction over the replica set oplog. The oplog (operations log) is a capped collection (db.oplog.rs) that records every write operation on the primary. Secondaries use the oplog to replicate.

Change streams subscribe to the oplog using a tailing cursor (a cursor that waits for new entries rather than returning EOF). When a write happens:
1. Primary writes to oplog
2. Change stream cursor detects new oplog entry
3. MongoDB transforms the raw oplog entry into a user-friendly change event
4. Your callback receives the change event

OPLOG SIZE AND CURSOR INVALIDATION
────────────────────────────────────
The oplog has a fixed maximum size (default: 5% of disk, minimum 990MB). Under high write load, the oplog wraps around and overwrites old entries. If your change stream consumer is behind the oldest oplog entry, your cursor is invalidated:
\`\`\`
MongoServerError: The resume token is not recognized or was not found in the oplog
\`\`\`
Response: Re-initialize the change stream from "now" and reconcile missed events by querying the collection directly.

RESUME TOKEN DURABILITY
────────────────────────
The resume token is a BSON object that encodes the oplog position. After processing each event, persist the resume token to a durable store (a MongoDB collection, Redis, or a file). On restart:
\`\`\`javascript
const resumeToken = await loadLastResumeToken()
const changeStream = collection.watch(pipeline, { resumeAfter: resumeToken })
\`\`\`

START AT OPERATION TIME vs RESUME AFTER
─────────────────────────────────────────
resumeAfter: { token } — resume after a specific oplog position (use stored resume token)
startAfter: { token } — like resumeAfter but works for invalidate events
startAtOperationTime: new Timestamp(seconds, ordinal) — resume from a specific clock time

CHANGE EVENT ANATOMY
─────────────────────
\`\`\`json
{
  "_id": { "<resume token>" },
  "operationType": "update",
  "clusterTime": { "<Timestamp>" },
  "ns": { "db": "ecommerce", "coll": "orders" },
  "documentKey": { "_id": "O1" },
  "updateDescription": {
    "updatedFields": { "status": "SHIPPED", "updatedAt": "..." },
    "removedFields": [],
    "truncatedArrays": []
  }
  // "fullDocument" only if fullDocument: "updateLookup" is set
}
\`\`\`

FILTERING CHANGE EVENTS
────────────────────────
The pipeline argument to watch() is an aggregation pipeline that filters change events before they're sent to your application. Filtering server-side (not in your application code) is critical for performance — only relevant events cross the network.

\`\`\`javascript
collection.watch([
  { $match: { operationType: { $in: ["insert", "update"] } } },
  { $match: { "fullDocument.status": "PLACED" } }
])
\`\`\``,
    code: `// ─── BASIC CHANGE STREAM ─────────────────────────────────────────────────
// Requires a replica set — does NOT work on standalone mongod

async function watchOrderChanges(): Promise<void> {
  const collection = db.collection("orders")

  // Simple watch — all change types on this collection
  const changeStream = collection.watch()

  // Process events
  changeStream.on("change", (event) => {
    console.log("Change event:", {
      operationType: event.operationType,   // "insert", "update", "delete", "replace"
      documentKey: event.documentKey,       // { _id: "O1" }
      ns: event.ns                          // { db: "ecommerce", coll: "orders" }
    })
  })

  changeStream.on("error", (err) => {
    console.error("Change stream error:", err)
    // Reconnect logic here
  })

  // Close when done
  process.on("SIGTERM", async () => {
    await changeStream.close()
  })
}

// ─── FILTERED CHANGE STREAM WITH FULL DOCUMENT ────────────────────────────
// Only watch for orders that change to PLACED status + get full document

async function watchNewOrderPlacements(): Promise<void> {
  const collection = db.collection("orders")

  const pipeline = [
    // Filter server-side — only these events cross the network
    {
      $match: {
        operationType: "insert"                    // only new orders
        // OR for updates: operationType: "update"
      }
    }
  ]

  const options = {
    fullDocument: "updateLookup" as const,         // fetch full doc on update events
    // Note: fullDocument on insert events always has the full document by default
  }

  const changeStream = collection.watch(pipeline, options)

  for await (const event of changeStream) {
    if (event.operationType === "insert" && event.fullDocument) {
      const order = event.fullDocument

      // Real-time notification: new order placed
      await notificationService.send({
        userId: order.customerId,
        type: "ORDER_PLACED",
        title: "Order Confirmed!",
        body: \`Your order of ₹\${(order.totalAmountPaise / 100).toFixed(2)} has been placed.\`,
        orderId: order._id
      })

      // Trigger email (non-blocking)
      emailQueue.add("order-confirmation", { orderId: order._id, customerId: order.customerId })
    }
  }
}

// ─── RESUMABLE CHANGE STREAM WITH TOKEN PERSISTENCE ──────────────────────
// Fault-tolerant: persists resume token, restarts from where it left off

const RESUME_TOKEN_KEY = "orders:change-stream:resume-token"

async function startResilientOrderWatcher(): Promise<void> {
  const collection = db.collection("orders")
  const tokenCollection = db.collection("change_stream_tokens")

  while (true) {  // outer loop: restart on failure
    let changeStream: ChangeStream | null = null

    try {
      // Load last processed resume token
      const tokenDoc = await tokenCollection.findOne({ _id: RESUME_TOKEN_KEY })
      const options: ChangeStreamOptions = {
        fullDocument: "updateLookup"
      }

      if (tokenDoc?.resumeToken) {
        options.resumeAfter = tokenDoc.resumeToken
        console.log("Resuming change stream from stored token")
      } else {
        console.log("Starting change stream from now (no stored token)")
      }

      changeStream = collection.watch([], options)

      for await (const event of changeStream) {
        // Process the event
        await processOrderChangeEvent(event)

        // Persist resume token AFTER successful processing
        // If processing fails, we don't update the token → event will be reprocessed on restart
        await tokenCollection.updateOne(
          { _id: RESUME_TOKEN_KEY },
          { $set: { resumeToken: event._id, updatedAt: new Date() } },
          { upsert: true }
        )
      }
    } catch (err) {
      const error = err as Error & { code?: number }

      if (error.code === 286) {
        // ChangeStreamHistoryLost: oplog wrapped around — can't resume
        console.error("Change stream history lost — resetting resume token")
        await tokenCollection.deleteOne({ _id: RESUME_TOKEN_KEY })
        // Must reconcile: scan full collection to find current state
        await reconcileFromFullCollectionScan()
      } else {
        console.error("Change stream error — will retry in 5s:", error.message)
        await new Promise(resolve => setTimeout(resolve, 5_000))
      }
    } finally {
      if (changeStream) await changeStream.close()
    }
  }
}

async function processOrderChangeEvent(event: ChangeStreamDocument): Promise<void> {
  switch (event.operationType) {
    case "insert": {
      const order = event.fullDocument!
      await cache.set(\`order:\${order._id}\`, JSON.stringify(order), 300)
      console.log(\`New order created: \${order._id}\`)
      break
    }
    case "update": {
      // Invalidate cache — fullDocument has current state if updateLookup enabled
      if (event.fullDocument) {
        await cache.set(\`order:\${event.documentKey._id}\`, JSON.stringify(event.fullDocument), 300)
      } else {
        await cache.del(\`order:\${event.documentKey._id}\`)
      }
      console.log(\`Order updated: \${event.documentKey._id}\`, event.updateDescription?.updatedFields)
      break
    }
    case "delete": {
      await cache.del(\`order:\${event.documentKey._id}\`)
      console.log(\`Order deleted: \${event.documentKey._id}\`)
      break
    }
  }
}

// ─── AUDIT TRAIL VIA CHANGE STREAMS ──────────────────────────────────────
// Watch a collection and write all changes to an immutable audit log

async function watchForAuditTrail(): Promise<void> {
  const ordersCollection = db.collection("orders")
  const auditCollection = db.collection("order_audit_log")

  const auditStream = ordersCollection.watch(
    [{ $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } }],
    { fullDocument: "updateLookup", fullDocumentBeforeChange: "whenAvailable" }
    // fullDocumentBeforeChange requires MongoDB 6.0+ and pre/post image configuration
  )

  for await (const event of auditStream) {
    await auditCollection.insertOne({
      eventId: new ObjectId(),
      operationType: event.operationType,
      documentId: event.documentKey._id,
      changedFields: event.operationType === "update"
        ? event.updateDescription?.updatedFields
        : null,
      fullDocumentAfter: event.fullDocument ?? null,
      clusterTime: event.clusterTime,
      timestamp: new Date()
    })
  }
}

// ─── DATABASE-LEVEL AND DEPLOYMENT-LEVEL WATCH ────────────────────────────
// Watch an entire database (all collections)
const dbWatcher = client.db("ecommerce").watch([
  { $match: { "ns.coll": { $in: ["orders", "products", "users"] } } }
])

// Watch entire cluster (all databases, all collections)
const clusterWatcher = client.watch([
  { $match: { "ns.db": "ecommerce" } }
])`,
    bugs: `BUG 1 — No resume token — missing events after restart
──────────────────────────────────────────────────────
async function watchOrders() {
  const changeStream = db.collection("orders").watch()

  changeStream.on("change", async (event) => {
    await processEvent(event)
    // BUG: resume token never persisted!
  })
}

// Deployment at 3pm: change stream consumer restarts
// Events from 2:55pm to 3:05pm: 47 order status updates
// Consumer starts at 3:05pm with no resume token
// All 47 events are silently missed — no error thrown
// Cache is stale, notifications not sent, audit trail has gaps

Fix: Persist resume token after every successful event processing:
changeStream.on("change", async (event) => {
  await processEvent(event)
  await db.collection("resume_tokens").updateOne(
    { _id: "orders-watcher" },
    { $set: { token: event._id, updatedAt: new Date() } },
    { upsert: true }
  )
})
// On startup: load token and pass as resumeAfter

BUG 2 — fullDocument is null for update events without updateLookup
─────────────────────────────────────────────────────────────────────
const changeStream = db.collection("orders").watch()

changeStream.on("change", (event) => {
  if (event.operationType === "update") {
    // BUG: assuming fullDocument is present on updates
    const status = event.fullDocument.status  // TypeError: Cannot read properties of null
    sendStatusNotification(status)
  }
})

// Default behavior: update events only contain updateDescription (changed fields)
// fullDocument is null unless fullDocument: "updateLookup" is set

Fix: Enable updateLookup OR use updateDescription for changed fields:
// Option 1: get full document (extra DB read per update)
const stream = collection.watch([], { fullDocument: "updateLookup" })
stream.on("change", (event) => {
  if (event.operationType === "update") {
    const doc = event.fullDocument  // now populated (may be slightly newer than event)
  }
})

// Option 2: use updateDescription for changed fields only (more efficient)
stream.on("change", (event) => {
  if (event.operationType === "update") {
    const changedStatus = event.updateDescription?.updatedFields?.status
  }
})

BUG 3 — ChangeStreamHistoryLost — oplog wrapped around
────────────────────────────────────────────────────────
// High write volume: 50,000 inserts/second on orders collection
// Change stream consumer falls 5 minutes behind (slow processing)
// Oplog fills up in 4 minutes at this write rate
// Oplog entries from 5 minutes ago are overwritten

// Consumer tries to resume from stored token:
// MongoServerError: Change stream history lost. The resume token is...
// Consumer crashes. Events from the last 5 minutes are permanently missed.

Fix 1: Increase oplog size (requires mongod restart):
// In mongod.conf: replication.oplogSizeMB: 51200  (50GB oplog)
// Or on Atlas: use M40+ tiers which have larger oplogs

Fix 2: Speed up your consumer (parallel processing, batch inserts):
// Process events in parallel, don't await each individually

Fix 3: Handle the error and reconcile from full collection scan:
if ((err as any).code === 286) {  // ChangeStreamHistoryLost
  await fullReconciliation()  // scan entire collection, rebuild cache/audit
  delete storedResumeToken    // start fresh
}

BUG 4 — Change stream opened on standalone mongod (no replica set)
──────────────────────────────────────────────────────────────────
// Developer runs local MongoDB via Docker: docker run -d mongo
// That's a standalone instance — no replica set!

const changeStream = db.collection("orders").watch()
// MongoServerError: The $changeStream stage is only supported on replica sets

// Entire local development environment can't test change streams
// OR developer assumes "it's just a MongoDB issue" and ignores

Fix: Run local MongoDB as a replica set:
// docker-compose.yml:
// mongo:
//   image: mongo
//   command: mongod --replSet rs0
// Then: mongosh --eval "rs.initiate()"

// Or use: docker run -d --name mongo mongo mongod --replSet rs0
// Then: docker exec -it mongo mongosh --eval "rs.initiate()"

// Atlas always runs as a replica set — no config needed there

BUG 5 — Processing events that trigger more writes — infinite loop
───────────────────────────────────────────────────────────────────
// Change stream watches "products" collection
// On product update → recalculate average rating → write back to products

const stream = db.collection("products").watch()
stream.on("change", async (event) => {
  if (event.operationType === "update") {
    const productId = event.documentKey._id
    const avg = await computeAverageRating(productId)
    // BUG: writing back to the same collection creates another change event!
    await db.collection("products").updateOne(
      { _id: productId },
      { $set: { averageRating: avg } }  // this triggers ANOTHER change event → infinite loop
    )
  }
})

Fix: Filter change events to exclude your own updates:
// Option 1: filter on specific fields in the pipeline
collection.watch([
  { $match: {
    operationType: "update",
    // Only react to changes in review-related fields, not averageRating
    "updateDescription.updatedFields.reviews": { $exists: true }
  }}
])

// Option 2: use a dedicated write to "reviews" collection as trigger
// Don't watch "products" — watch "reviews" and write computed values to "products"`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Consider this change stream setup:

const stream = db.collection("orders").watch([
  { $match: { operationType: "update" } }
], { fullDocument: "updateLookup" })

// Order O1 state: { _id: "O1", status: "PENDING", total: 1000 }

// Operation 1: Update status to SHIPPED
await db.collection("orders").updateOne({ _id: "O1" }, { $set: { status: "SHIPPED" } })

// 50ms later — before change stream receives the event:
// Operation 2: Update total to 1200
await db.collection("orders").updateOne({ _id: "O1" }, { $set: { total: 1200 } })

// Change stream now delivers the event for Operation 1

Q: What does event.updateDescription.updatedFields contain?
   What does event.fullDocument.total contain? Is it 1000 or 1200?
   This is a known behavior — what is it called and why does it happen?
   How would you avoid this race condition?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This change stream consumer has 4 reliability problems. Find and fix each.

async function startOrderWatcher() {
  // Bug 1: standalone mongod used locally
  const client = new MongoClient("mongodb://localhost:27017")

  const changeStream = client.db("ecommerce").collection("orders").watch()

  // Bug 2: no resume token
  changeStream.on("change", async (event) => {
    await notificationService.send(event.documentKey._id)
    // Bug 3: no error handling — unhandled rejection crashes the process
  })

  // Bug 4: no graceful shutdown
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a production-ready change stream consumer for an e-commerce audit trail:
1. Watch the "orders" collection for insert, update, and delete events
2. Write all changes to an "order_audit_log" collection with: operationType, documentId, changedFields, fullDocumentAfter, timestamp, processingLatencyMs
3. Persist resume token to "change_stream_state" collection after each successfully processed event
4. On startup: load resume token and resume from where you left off
5. Handle ChangeStreamHistoryLost (code 286): log error, alert, scan full collection, reset token
6. Handle the "fullDocument is null for deletes" case gracefully
7. Filter server-side: only process events where operationType != "drop" and namespace is "ecommerce.orders"
8. Write a test that verifies: after restart, no events are missed between shutdown and startup`,
    summary: "Change streams provide reliable, low-latency, push-based notification of MongoDB data changes — far more efficient than polling. The resume token is the key to fault tolerance: persist it after every event, and your consumer can restart after any failure without missing a single change."
  },

  {
    id: 11,
    title: "Node.js Driver Patterns & Mongoose",
    tag: "THE RIGHT WAY TO CONNECT AND OPERATE",
    color: "#1E8449",
    tldr: "The MongoClient is expensive to create — one connection pool per application, not per request. Errors like duplicate key (11000) need specific handling. BulkWrite with ordered:false is 100x faster than individual inserts in a loop. Mongoose adds schema validation and a rich ORM-like API on top of the native driver but introduces its own complexity — understand when each is appropriate.",
    problem: `The single most damaging Node.js + MongoDB mistake in production: creating a new MongoClient for every request. Each MongoClient creation opens a connection pool (default 100 connections). A server handling 1,000 concurrent requests creates 1,000 × 100 = 100,000 connections to MongoDB. PostgreSQL defaults to max 100 connections. MongoDB's max default is 1,000,000 but each connection consumes ~1MB of server RAM. You'll exhaust memory before you exhaust the connection limit.

The second problem: not handling error code 11000 (duplicate key). When you insert a document that violates a unique index, MongoDB throws an error with code 11000. Most generic error handlers treat this as a 500 Internal Server Error — a database error — when it should be a 409 Conflict — a user input error ("email already registered"). The distinction matters for API consumers and monitoring.

The third problem: inserting records in a loop with individual insertOne calls. 10,000 orders imported via a loop = 10,000 round trips to the database. Each round trip has network latency (1–5ms). Total: 10–50 seconds. bulkWrite with 10,000 operations: ONE round trip = 20–100ms. A 100-500x speedup hiding behind a for loop.

The fourth problem: the Mongoose vs native driver choice. Mongoose is not a replacement for MongoDB — it's an ODM (Object Document Mapper) that adds schema validation, middleware (pre/post hooks), virtuals, and populate() (reference resolution). It also adds 20-30% overhead on every operation, has its own opinions about ObjectIds, and requires learning its abstraction on top of MongoDB's. For small teams building CRUD-heavy apps: Mongoose saves time. For performance-critical systems or developers who know MongoDB deeply: the native driver is more predictable and faster.

The fifth problem: using Mongoose's populate() for all references without understanding it's N+1. populate() runs one query for the parent and N queries for each referenced document. For 100 orders each referencing a customer: 101 queries. The native driver's $lookup aggregation does this in 1 query.`,
    analogy: `The MongoClient singleton is like a phone exchange switchboard. The switchboard (connection pool) manages 100 lines (connections) between your office and the database office. You create one switchboard when the office opens. Every employee (request) uses the switchboard — they don't each buy their own. If you bought a new switchboard for every employee, you'd have 1,000 switchboards for 1,000 employees. Each switchboard costs money to run (RAM, connections). You'd go bankrupt (OOM) immediately.

BULKWRITE is like sending one postal truck with 10,000 packages vs making 10,000 individual trips. Same destination, same packages, but the overhead of each trip (truck startup, routing, delivery confirmation) multiplies. One truck, one trip, all 10,000 packages delivered at 100x the speed.

ERROR CODE 11000 is like a post office saying "we already have a PO box registered to that name" — it's not a system error, it's an expected business condition. Your application should translate this into "email already in use" for the user, not "internal server error."

MONGOOSE is like an autocorrect keyboard for MongoDB. It prevents many typos (schema validation: can't insert a string where a number is expected), suggests completions (pre-defined methods, virtuals), and auto-formats some inputs (ObjectId casting). Useful when you type quickly and trust the autocorrect. Frustrating when autocorrect changes what you meant (Mongoose transforming your query in unexpected ways) and adds latency to every keystroke (middleware overhead).

THE NATIVE DRIVER is a regular keyboard. You type exactly what you mean, nothing is auto-corrected. More control, less magic, requires knowing what you're doing. Preferred when performance matters or when you want MongoDB to behave exactly as documented.`,
    deep: `MONGOCLIENT SINGLETON INTERNALS
──────────────────────────────────
MongoClient maintains a connection pool: N persistent TCP connections to MongoDB, ready to serve queries. When a query arrives, it borrows a connection, runs the query, returns the connection to the pool.

Creating a MongoClient:
1. DNS resolution for the MongoDB URI
2. TCP connections established (maxPoolSize, default 100)
3. TLS handshake (if enabled)
4. Authentication (SCRAM-SHA-256)
Total startup cost: 200-500ms

For a serverless function or per-request creation: 200-500ms overhead BEFORE the query runs. Plus 100 connections opened, consuming server memory.

Correct pattern: create ONE MongoClient at application startup, reuse it forever.

CONNECTION POOL SIZING
───────────────────────
maxPoolSize (default: 100): maximum number of connections in the pool.
minPoolSize (default: 0): minimum connections kept alive (warm pool).
maxIdleTimeMS: close connections idle longer than this (default: 0, never).

Rule of thumb: maxPoolSize = number of concurrent queries you expect × 1.5
For a web server with 50 concurrent requests: maxPoolSize = 75–100.
For a high-throughput service: increase to 200–500, but watch MongoDB server RAM.

TOO SMALL: requests queue waiting for a free connection (latency spikes).
TOO LARGE: MongoDB server memory exhausted (each connection ~1MB).

ERROR CODE 11000 — DUPLICATE KEY
──────────────────────────────────
Thrown when: inserting/updating a document that violates a unique index.
Common unique indexes: _id (always), email, phone number, external IDs.

Error object structure:
\`\`\`javascript
{
  code: 11000,
  keyPattern: { email: 1 },
  keyValue: { email: "priya@example.com" }
}
\`\`\`

BULKWRITE PERFORMANCE
──────────────────────
Individual inserts: N round trips × RTT (round trip time).
bulkWrite: 1 round trip, regardless of N operations.

ordered: true (default): stop at first error. All subsequent operations skipped.
ordered: false: all operations run independently. Errors collected, reported at end.
Use ordered: false for independent batch operations (import, seeding, batch updates).

MONGOOSE VS NATIVE DRIVER
──────────────────────────
Mongoose adds:
- Schema definition with types and validation
- Document middleware (pre/post hooks on save, remove, find)
- Virtual fields (computed properties)
- populate() for reference resolution
- Easier TypeScript integration via Schema definitions

Mongoose costs:
- 20-30% query overhead from schema validation and middleware
- Type coercion (Mongoose converts strings to ObjectIds, which can hide bugs)
- populate() = N+1 queries (use aggregation for performance)
- Learning a second API on top of MongoDB's (Mongoose has its own query syntax)

Decision rule: Use Mongoose for teams that want guardrails and ORM-like DX. Use native driver for teams with MongoDB expertise, performance-critical systems, or complex aggregation pipelines.`,
    code: `// ─── SINGLETON MONGOCLIENT PATTERN ────────────────────────────────────────
// lib/db.ts — create ONCE, share across the entire application

let client: MongoClient | null = null
let db: Db | null = null

async function getDb(): Promise<Db> {
  if (db) return db  // reuse existing connection

  client = new MongoClient(process.env.MONGODB_URI!, {
    maxPoolSize: 100,           // max concurrent connections
    minPoolSize: 10,            // keep 10 warm connections ready
    maxIdleTimeMS: 60_000,      // close idle connections after 60s
    serverSelectionTimeoutMS: 5_000,   // fail fast if no server available
    socketTimeoutMS: 45_000,    // close socket if operation takes > 45s
    connectTimeoutMS: 10_000,   // timeout for initial connection
    retryWrites: true,          // automatically retry failed writes
    retryReads: true            // automatically retry failed reads
  })

  await client.connect()
  db = client.db("ecommerce")

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    await client?.close()
    console.log("MongoDB connection closed")
  })

  // Test the connection
  await db.command({ ping: 1 })
  console.log("MongoDB connected successfully")

  return db
}

// Usage throughout the app:
const db = await getDb()  // always returns the same connected client
// DO NOT:
// const client = new MongoClient(...); await client.connect()  // in a request handler!

// ─── HANDLING ERROR CODE 11000 (DUPLICATE KEY) ────────────────────────────
// Distinguish business conflicts from system errors

class DuplicateKeyError extends Error {
  constructor(public readonly field: string, public readonly value: string) {
    super(\`\${field} '\${value}' is already registered\`)
    this.name = "DuplicateKeyError"
  }
}

async function registerUser(email: string, password: string): Promise<User> {
  try {
    const passwordHash = await argon2.hash(password)
    const user = await db.collection("users").insertOne({
      _id: new ObjectId(),
      email,
      passwordHash,
      createdAt: new Date()
    })
    return user
  } catch (err) {
    const error = err as { code?: number; keyPattern?: Record<string, number>; keyValue?: Record<string, string> }

    if (error.code === 11000) {
      // Not a system error — expected business condition
      const field = Object.keys(error.keyPattern ?? {})[0] ?? "field"
      const value = error.keyValue?.[field] ?? "unknown"
      throw new DuplicateKeyError(field, value)
      // API will catch this and return 409 Conflict, not 500
    }

    throw err  // unexpected error — re-throw for global error handler
  }
}

// ─── BULKWRITE FOR BATCH OPERATIONS ───────────────────────────────────────
// Import 10,000 products from a CSV — ONE round trip

async function bulkImportProducts(products: ProductInput[]): Promise<BulkImportResult> {
  const operations = products.map(product => ({
    updateOne: {
      filter: { sku: product.sku },              // match by SKU
      update: {
        $set: {
          name: product.name,
          priceInPaise: product.priceInPaise,
          stock: product.stock,
          category: product.category,
          updatedAt: new Date()
        },
        $setOnInsert: {                           // only on insert
          _id: new ObjectId(),
          createdAt: new Date()
        }
      },
      upsert: true                                // insert if not exists, update if exists
    }
  }))

  const result = await db.collection("products").bulkWrite(
    operations,
    { ordered: false }     // continue on error — import as many as possible
  )

  const errors = result.getWriteErrors()

  return {
    inserted: result.insertedCount,
    updated: result.modifiedCount,
    total: result.insertedCount + result.modifiedCount,
    errors: errors.map(e => ({
      index: e.index,
      code: e.code,
      message: e.errmsg,
      sku: products[e.index]?.sku
    }))
  }
}

// Performance comparison:
// 10,000 products with individual insertOne: ~15,000ms (15 seconds)
// 10,000 products with bulkWrite: ~150ms (100x faster)

// ─── MONGOOSE SCHEMA — when to use ───────────────────────────────────────
// Good use case: complex validation, middleware hooks, TypeScript integration

// const mongoose = require("mongoose")

const OrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  customerName: { type: String, required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    priceAtPurchasePaise: { type: Number, required: true, min: 1 },
    qty: { type: Number, required: true, min: 1 }
  }],
  totalAmountPaise: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ["PENDING", "PLACED", "SHIPPED", "DELIVERED", "CANCELLED"],
    default: "PENDING"
  }
}, {
  timestamps: true  // auto-adds createdAt and updatedAt
})

// Pre-save middleware: calculate total before saving
OrderSchema.pre("save", function(next) {
  if (this.isModified("items")) {
    this.totalAmountPaise = this.items.reduce(
      (sum: number, item: any) => sum + (item.priceAtPurchasePaise * item.qty),
      0
    )
  }
  next()
})

// Virtual: total in rupees
OrderSchema.virtual("totalAmountRupees").get(function() {
  return (this.totalAmountPaise / 100).toFixed(2)
})

const Order = mongoose.model("Order", OrderSchema)

// ─── MONGOOSE POPULATE vs AGGREGATION ─────────────────────────────────────
// populate() — N+1 queries: 1 for orders + N for customers

const ordersWithPopulate = await Order
  .find({ status: "PENDING" })
  .populate("customerId", "name email phone")  // 1 query per UNIQUE customerId found
  .limit(50)
// 50 orders → up to 50 additional customer queries = up to 51 total queries

// Aggregation $lookup — 1 query total (much faster at scale)
const ordersWithLookup = await Order.aggregate([
  { $match: { status: "PENDING" } },
  { $limit: 50 },
  {
    $lookup: {
      from: "users",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
      pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }]
    }
  },
  { $unwind: { path: "$customer", preserveNullAndEmpty: true } }
])
// 1 query with JOIN — 50x faster for 50 orders

// ─── CONNECTION POOL MONITORING ───────────────────────────────────────────
// Monitor pool usage in development to right-size maxPoolSize

client.on("connectionPoolCreated", (event) => {
  console.log("Pool created:", event.address)
})

client.on("connectionPoolReady", (event) => {
  console.log("Pool ready:", event.address)
})

client.on("connectionCreated", (event) => {
  console.log(\`New connection opened (connectionId: \${event.connectionId})\`)
})

client.on("connectionClosed", (event) => {
  console.log(\`Connection closed (connectionId: \${event.connectionId})\`)
})

// Check current pool state (internal — not a public API but useful for debugging)
// db.admin().command({ currentOp: true, idleConnections: true })`,
    bugs: `BUG 1 — New MongoClient per request — connection pool exhaustion
────────────────────────────────────────────────────────────────
// WRONG: creating client in a request handler
app.get("/api/products", async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI!)  // NEW pool every request!
  await client.connect()
  const products = await client.db("ecommerce").collection("products").find().toArray()
  res.json(products)
  await client.close()  // closes but the connection/pool cost was already paid
})

// 500 concurrent requests: 500 MongoClients created
// 500 × 100 (maxPoolSize) = 50,000 connections attempted
// MongoDB server default maxIncomingConnections: 1,000,000
// But each connection: ~1MB RAM → 50GB RAM exhausted → OOM kill on MongoDB server

Fix: One MongoClient at app startup (see getDb() singleton pattern above)

BUG 2 — Error code 11000 treated as 500 — wrong HTTP status
─────────────────────────────────────────────────────────────
app.post("/api/users/register", async (req, res) => {
  try {
    const user = await db.collection("users").insertOne({
      email: req.body.email,
      passwordHash: await argon2.hash(req.body.password)
    })
    res.status(201).json(user)
  } catch (err) {
    // Generic error handler — treats ALL errors as 500
    res.status(500).json({ error: "Internal server error" })
    // Client sees: 500 when they tried to register with existing email
    // Should see: 409 Conflict — "email already registered"
    // Monitoring alerts on 500s — noise from expected user input errors
  }
})

Fix: Specifically handle 11000 before the generic catch:
} catch (err) {
  if ((err as any).code === 11000) {
    return res.status(409).json({ error: "Email already registered" })
  }
  next(err)  // unexpected error — global error handler
}

BUG 3 — Individual inserts in a loop — import takes 10 minutes
───────────────────────────────────────────────────────────────
async function importProducts(csvData: ProductRow[]) {
  for (const product of csvData) {
    await db.collection("products").insertOne({
      sku: product.sku,
      name: product.name,
      priceInPaise: parseInt(product.price) * 100
    })
    // Each insertOne: one network round trip (1-5ms per request on local network)
  }
}
// 50,000 products × 5ms per insert = 250 seconds (4+ minutes)
// In production with network latency: could be 10+ minutes
// Blocks import process, customers waiting for catalog to update

Fix: bulkWrite — 50,000 operations in one round trip:
await db.collection("products").bulkWrite(
  csvData.map(p => ({
    insertOne: { document: { sku: p.sku, name: p.name, priceInPaise: parseInt(p.price) * 100 } }
  })),
  { ordered: false }  // don't stop on duplicate SKU — skip and continue
)
// 50,000 products: ~200ms instead of 250 seconds

BUG 4 — Mongoose populate() causing N+1 on every page load
────────────────────────────────────────────────────────────
// Order list page: 20 orders, each referencing a different customer
const orders = await Order.find({ status: "PENDING" }).limit(20)
  .populate("customerId")  // runs 20 additional queries — 1 per unique customer!

// 20 orders → 21 total queries (1 for orders + 20 for customers)
// With 100 orders per page: 101 queries
// API response time: 50ms (orders) + 20 × 10ms (customer queries) = 250ms

// Worse: same customer ordered 3 times on this page
// populate() still queries that customer 3 times (no caching by default)

Fix: Use aggregation with $lookup for production list endpoints:
const orders = await Order.aggregate([
  { $match: { status: "PENDING" } },
  { $limit: 20 },
  { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer", pipeline: [{ $project: { name: 1, email: 1 } }] } },
  { $unwind: "$customer" }
])
// 1 query regardless of how many unique customers

BUG 5 — maxPoolSize too small — requests queue under load
──────────────────────────────────────────────────────────
const client = new MongoClient(uri, {
  maxPoolSize: 5  // only 5 connections!
})
// API server with 100 concurrent requests: 95 requests wait for a free connection
// Queue builds up, response time increases, timeouts occur
// Monitoring: "query_duration_p99: 5000ms" — looks like slow queries, actually queuing

// Symptoms: fast queries become slow only under load, not in isolation

Fix: Increase maxPoolSize to match concurrent load:
const client = new MongoClient(uri, {
  maxPoolSize: 100,   // or more for high-concurrency services
  waitQueueTimeoutMS: 10_000  // fail fast if no connection available in 10s
})
// Monitor connection pool utilization and adjust based on actual concurrency`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
// MongoClient is created with maxPoolSize: 3
const client = new MongoClient(uri, { maxPoolSize: 3 })

// 5 concurrent queries arrive simultaneously
const promises = Array(5).fill(null).map((_, i) =>
  db.collection("products").findOne({ _id: i.toString() })
)
const results = await Promise.all(promises)

Q: How many connections does the pool use? Are all 5 queries served?
   What happens to queries 4 and 5 while connections 1, 2, 3 are busy?
   If a 6th query arrives: what does it see (with default waitQueueTimeoutMS)?
   How would you diagnose this issue in production?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This Express route has 4 MongoDB driver problems. Find and fix each.

app.post("/api/orders/bulk-import", async (req, res) => {
  // Bug 1: new client per request
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()

  const orders = req.body.orders  // array of 1000 orders

  // Bug 2: inserting in a loop
  const results = []
  for (const order of orders) {
    try {
      const result = await client.db("ecommerce").collection("orders").insertOne(order)
      results.push({ success: true, id: result.insertedId })
    } catch (err: any) {
      // Bug 3: not distinguishing duplicate key from other errors
      results.push({ success: false, error: "Database error" })
    }
  }

  // Bug 4: not closing client (in the non-singleton case)
  res.json({ results })
})

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a production-ready MongoDB service layer for an e-commerce app:
1. Singleton MongoClient with appropriate pool size for 200 concurrent requests
2. Graceful shutdown that closes the pool on SIGTERM and SIGINT
3. registerUser(email, password): handles 11000 gracefully with 409 response
4. bulkCreateProducts(products): uses bulkWrite with ordered:false, returns {inserted, updated, errors}
5. listOrdersWithCustomer(status, page): uses aggregation $lookup (NOT populate) for 1-query join
6. Add connection event monitoring: log when connections are created/closed/timed-out
7. Compare performance: measure populate() vs $lookup for 100 orders with 50 unique customers
8. Show how to test the 11000 handler without a real database (mock the collection)`,
    summary: "One MongoClient per application, not per request — this single rule prevents the most common Node.js + MongoDB production outage. Handle error code 11000 as a 409 business conflict, use bulkWrite for batch operations instead of loops, and choose between Mongoose's guardrails and the native driver's performance based on your team's expertise and application's requirements."
  },

  {
    id: 12,
    title: "Performance Tuning & Atlas",
    tag: "FINDING AND FIXING WHAT'S ACTUALLY SLOW",
    color: "#922B21",
    tldr: "MongoDB performance problems are almost always one of four things: missing indexes (COLLSCAN), working set too large for RAM (cache thrashing), slow queries in the profiler that reveal query patterns you didn't know existed, or WiredTiger compression misconfiguration wasting disk and I/O. MongoDB Atlas adds managed observability, Atlas Search (Lucene-based full-text), and tiered storage — but Atlas M0 (free tier) has severe limitations that make it unsuitable for anything beyond development.",
    problem: `The most common performance problem that engineers don't know they have: their working set doesn't fit in RAM. WiredTiger (MongoDB's storage engine) keeps frequently accessed data in an in-memory cache (60% of total RAM by default). When the working set (hot data that gets accessed repeatedly) fits in cache, reads are served from RAM at ~100ns. When it doesn't fit, MongoDB reads pages from disk at ~1ms — 10,000x slower. The symptom: random queries are fast, but overall system is slow. The cause: cache eviction pressure as data is constantly paged in and out.

The second invisible problem: slow queries you don't know about. MongoDB's query profiler captures queries that exceed a threshold (default: 100ms). Most engineers never look at it. The db.system.profile collection fills up with slow queries — queries doing collection scans, sorts without indexes, $lookup without indexes — all silently recorded, none acted on. Running db.setProfilingLevel(1, {slowms: 100}) and reviewing the results is the single highest-ROI performance action.

The third problem: Atlas Search misconceptions. Atlas Search is a managed Lucene full-text search engine built into Atlas. It supports fuzzy matching, autocomplete, facets, and relevance scoring that MongoDB's $text operator simply cannot do. But engineers use Atlas Search to replace basic equality queries (already fast with B-tree indexes) instead of using it where it shines: natural language search, typo-tolerant autocomplete, and cross-field relevance ranking.

The fourth problem: Atlas M0 (free tier) for anything beyond a tutorial. M0 has: 512MB storage limit, 100 connection limit, no dedicated RAM, shared CPU with other tenants, no VPC peering, no backups, no custom indexes on Atlas Search. Running a staging environment or a "small" production workload on M0 is a guarantee of unpredictable performance degradation when a neighboring tenant gets busy.

The fifth problem: WiredTiger compression not configured for the workload. The default "snappy" compression gives good speed with moderate compression. For archival/analytical data: "zstd" gives much better compression ratios (2-3x better than snappy) with acceptable overhead. For maximum write speed with no compression overhead: "none". Engineers use the default everywhere, even for collections where the compression choice would significantly impact storage costs or throughput.`,
    analogy: `Think of MongoDB performance tuning as diagnosing why a restaurant is slow.

THE QUERY PROFILER is the kitchen's order tracking system. Every order that takes longer than 5 minutes gets flagged with a timestamp, the table, and what was ordered. If you never look at the flagged orders, you never know that "table 7 always orders the dish that requires a 20-minute oven cycle" — and that table is causing a cascade of delays. Looking at the profiler is like reading the flagged order log at the end of the night.

WORKING SET IN RAM is how many dishes the kitchen can keep warm simultaneously on the hot plate. If the restaurant serves 10 dishes regularly, the hot plate holds 10. Every order is served immediately from the warm plate. But if the restaurant serves 100 different dishes and the hot plate only holds 10, dishes must be retrieved from the refrigerator (disk) constantly. The kitchen is slow not because the chefs are slow — but because they're constantly going to and from the refrigerator.

WIREDTIGER CACHE is the hot plate. 60% of RAM is the hot plate size. If your frequently accessed data (hot documents, index pages) fits on the hot plate: fast. If not: disk reads.

ATLAS SEARCH (Lucene) is like hiring a skilled sommelier (wine expert) for your restaurant. For "do you have a 2019 Bordeaux?" (exact match), the wine list works fine. For "something like a full-bodied French red, maybe with berry notes, even if I'm pronouncing it wrong" — you need the sommelier's expertise (fuzzy matching, relevance scoring, typo tolerance).

ATLAS M0 is like a commercial kitchen in a shared co-working space. You get a workspace, but you share the oven, refrigerator, and prep area with 50 other food businesses. When the business next to you is catering a wedding, your oven is unavailable. Completely fine for cooking at home (tutorials, learning). Not acceptable for a restaurant serving paying customers (production).`,
    deep: `DB PROFILER — LEVELS AND READING
──────────────────────────────────
Level 0: profiling off (default in production — overhead of profiling every query)
Level 1: profile slow operations only (queries > slowms threshold)
Level 2: profile ALL operations (development only — high overhead)

Profile entries include:
- op: the operation type (query, update, insert, command)
- ns: namespace (db.collection)
- millis: execution time
- planSummary: "COLLSCAN" or "IXSCAN { <index> }" — shows if index was used
- nreturned: documents returned
- keysExamined: index keys scanned
- docsExamined: documents scanned (should be close to nreturned)
- execStats: full explain output embedded in the profile entry

WORKING SET AND WIREDTIGER CACHE
──────────────────────────────────
WiredTiger cache size = max(60% of RAM - 1GB, 256MB). On a 16GB server: ~8.6GB cache.

Working set = the set of documents and index pages that are frequently accessed. If working set < cache: cache hit rate ~99%, most reads from RAM. If working set > cache: pages evicted constantly, cache hit rate drops, disk I/O increases.

To check cache pressure:
\`\`\`javascript
const serverStatus = await db.command({ serverStatus: 1 })
const cache = serverStatus.wiredTiger.cache
const evictions = cache["pages evicted by application threads"]
// > 0: application threads evicting pages (bad — should be background eviction only)
const hitRatio = 1 - (cache["pages read into cache"] / cache["cache read ahead pages"])
// < 0.95 (95% hit rate): working set is not in cache
\`\`\`

WIREDTIGER COMPRESSION
────────────────────────
snappy (default): fast compression/decompression, ~2:1 ratio. Good for most workloads.
zstd: higher compression ratio (~3:1 or better), slightly more CPU. Best for analytics/archival.
zlib: good ratio, high CPU cost. Generally outperformed by zstd.
none: no compression. Maximum write speed. Highest disk usage.

Configure per-collection:
\`\`\`javascript
await db.createCollection("sensor_archive", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
})
\`\`\`

ATLAS SEARCH vs $TEXT vs REGEX
────────────────────────────────
$regex: client-side pattern match — can't use indexes for non-anchored patterns. O(n).
$text: server-side text index. Exact word matching with stemming. No fuzzy matching.
Atlas Search (Lucene): full-text search engine. Fuzzy matching, autocomplete, facets, relevance scoring, synonyms, multilingual support. Runs as separate process on Atlas — some write propagation delay (seconds).

Use $text for: exact word matching in small collections.
Use Atlas Search for: user-facing search, autocomplete, typo-tolerant queries, relevance ranking.
Use neither for: equality queries on indexed fields (use regular B-tree index).

ATLAS TIERS
────────────
M0 (Free): 512MB storage, shared RAM, 100 connections, no VPC, no backups. Development only.
M10 ($57/month): 2GB RAM, dedicated, backups. Small production workloads.
M30 ($200/month): 8GB RAM, good for most production apps.
M50 ($450/month): 16GB RAM. High-traffic applications.
M200+: 384GB RAM. Very large working sets.`,
    code: `// ─── QUERY PROFILER — enabling and reading slow queries ──────────────────
// Enable profiling for queries > 100ms on the ecommerce database

await db.command({
  profile: 1,           // level 1: slow queries only (2 = all queries)
  slowms: 100,          // threshold: capture queries taking > 100ms
  sampleRate: 1.0       // capture 100% of slow queries (reduce to 0.1 in high-throughput)
})

// Check current profiling level
const profilingStatus = await db.command({ profile: -1 })
console.log("Profiling level:", profilingStatus.was, "Slow MS:", profilingStatus.slowms)

// Read slow query entries — run this after a load test or in production diagnosis
const slowQueries = await db.collection("system.profile")
  .find({})
  .sort({ ts: -1 })          // most recent first
  .limit(20)
  .toArray()

for (const entry of slowQueries) {
  console.log({
    collection:    entry.ns,                          // which collection
    operation:     entry.op,                          // "query", "update", "command"
    durationMs:    entry.millis,                      // how long it took
    planSummary:   entry.planSummary,                 // "COLLSCAN" or "IXSCAN { ... }"
    nReturned:     entry.nreturned,                   // documents returned
    docsExamined:  entry.docsExamined,                // documents scanned (should ≈ nReturned)
    keysExamined:  entry.keysExamined,                // index keys scanned
    query:         JSON.stringify(entry.command?.filter ?? entry.query ?? {})
  })

  // RED FLAGS:
  // planSummary: "COLLSCAN" → missing index
  // docsExamined >> nReturned → poor index selectivity or wrong index
  // millis > 1000 → critical — needs immediate attention
}

// ─── WIREDTIGER CACHE MONITORING ─────────────────────────────────────────
// Check if your working set fits in RAM

async function checkCachePressure(): Promise<void> {
  const serverStatus = await db.command({ serverStatus: 1 })
  const cache = serverStatus.wiredTiger.cache

  const cacheMaxGB = cache["maximum bytes configured"] / 1024 / 1024 / 1024
  const cacheUsedGB = cache["bytes currently in the cache"] / 1024 / 1024 / 1024
  const utilizationPct = (cacheUsedGB / cacheMaxGB) * 100

  const pagesReadFromDisk = cache["pages read into cache"]          // disk reads
  const pagesEvictedByApp = cache["pages evicted by application threads"]  // bad: app doing eviction

  console.log({
    cacheMaxGB:           cacheMaxGB.toFixed(2),
    cacheUsedGB:          cacheUsedGB.toFixed(2),
    utilizationPct:       utilizationPct.toFixed(1) + "%",
    diskReads:            pagesReadFromDisk,     // rising = working set > cache
    appEvictions:         pagesEvictedByApp,     // > 0 = cache pressure
  })

  if (utilizationPct > 90) {
    console.warn("ALERT: Cache utilization > 90% — working set may exceed available RAM")
    console.warn("Consider: upgrading instance size, archiving old data, or sharding")
  }

  if (pagesEvictedByApp > 0) {
    console.warn("ALERT: Application threads are evicting pages — severe cache pressure")
  }
}

// ─── WIREDTIGER COMPRESSION PER COLLECTION ────────────────────────────────
// Hot transactional data: snappy (fast compression, fast decompression)
await db.createCollection("orders", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=snappy" }
  }
})

// Cold archival data: zstd (best compression ratio, acceptable overhead)
await db.createCollection("order_archive_2023", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
})

// Check collection compression being used
const collStats = await db.command({ collStats: "orders" })
console.log("WiredTiger config:", collStats.wiredTiger?.["creationString"])

// ─── ATLAS SEARCH — full-text with fuzzy matching ─────────────────────────
// First: create Atlas Search index via Atlas UI or API
// (Atlas Search indexes are separate from regular MongoDB indexes)

// Atlas Search index definition (JSON, created in Atlas UI):
// {
//   "mappings": {
//     "dynamic": false,
//     "fields": {
//       "name": { "type": "string", "analyzer": "lucene.standard" },
//       "brand": { "type": "string", "analyzer": "lucene.standard" },
//       "description": { "type": "string", "analyzer": "lucene.standard" },
//       "category": { "type": "string", "analyzer": "lucene.keyword" }
//     }
//   }
// }

// Atlas Search query — fuzzy matching, relevance scored
async function searchProducts(searchQuery: string, categoryFilter?: string): Promise<any[]> {
  const mustClauses: any[] = [
    {
      text: {
        query: searchQuery,
        path: ["name", "brand", "description"],
        fuzzy: { maxEdits: 1, prefixLength: 3 },   // typo tolerance
        score: { boost: { path: "name", value: 5 } }  // name matches rank higher
      }
    }
  ]

  const filterClauses: any[] = []
  if (categoryFilter) {
    filterClauses.push({
      text: { query: categoryFilter, path: "category" }
    })
  }

  return db.collection("products").aggregate([
    {
      $search: {
        index: "products_search_index",
        compound: {
          must: mustClauses,
          filter: filterClauses
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        brand: 1,
        priceInPaise: 1,
        category: 1,
        score: { $meta: "searchScore" }  // relevance score from Lucene
      }
    },
    { $sort: { score: -1 } },
    { $limit: 20 }
  ]).toArray()
}

// Compare: $text (basic) vs Atlas Search (advanced)
// $text query — no fuzzy matching, exact word match
const textResults = await db.collection("products").find(
  { $text: { $search: "redmi smartphone" } },
  { projection: { score: { $meta: "textScore" }, name: 1 } }
).sort({ score: { $meta: "textScore" } }).limit(20).toArray()

// Atlas Search — "redmi smarrtphone" (typo) still finds results
// $text — "smarrtphone" (typo) finds nothing

// ─── ATLAS M0 LIMITATIONS CHECK ──────────────────────────────────────────
// Things that FAIL on Atlas M0 (free tier) that work on M10+

// 1. Storage limit: 512MB
// await db.collection("large_data").insertMany(largeBatch)
// Error: "PlanExecutor error during aggregation :: caused by :: db data exceeded maximum limit"

// 2. Connection limit: 100
// New MongoClient({ maxPoolSize: 200 })
// Error: "connection refused" at 101+ connections

// 3. No VPC peering — connections from production servers often blocked

// 4. Shared RAM — performance varies based on neighboring tenants

// 5. No Atlas Search custom index options on M0

// Detect if running on M0 (free tier) at startup
async function checkAtlasTier(): Promise<void> {
  try {
    const buildInfo = await db.command({ buildInfo: 1 })
    const serverStatus = await db.command({ serverStatus: 1 })

    // M0 has very limited RAM
    const totalRamGB = (serverStatus.mem?.virtual ?? 0) / 1024
    if (totalRamGB < 1) {
      console.warn("WARNING: Running on Atlas M0 (free tier) — not suitable for production")
      console.warn("Upgrade to M10+ for production workloads")
    }
  } catch (err) {
    // Not on Atlas or insufficient permissions
  }
}

// ─── QUERY PERFORMANCE QUICK AUDIT ────────────────────────────────────────
// Run this on any collection to identify missing indexes

async function auditCollectionPerformance(collectionName: string): Promise<void> {
  // 1. Check index usage statistics
  const indexStats = await db.collection(collectionName).aggregate([
    { $indexStats: {} }
  ]).toArray()

  console.log("\nIndex usage stats for", collectionName)
  for (const stat of indexStats) {
    console.log({
      index: stat.name,
      accesses: stat.accesses.ops,
      since: stat.accesses.since,
      // Low accesses = index may not be needed (write overhead for nothing)
      // Zero accesses = definitely not needed
    })
  }

  // 2. Check collection stats
  const stats = await db.command({ collStats: collectionName })
  const dataMB = Math.round(stats.size / 1024 / 1024)
  const indexMB = Math.round(stats.totalIndexSize / 1024 / 1024)

  console.log({
    dataMB,
    indexMB,
    indexToDataRatio: (indexMB / dataMB).toFixed(2),
    // > 2: too many indexes — index overhead exceeds data size
  })
}`,
    bugs: `BUG 1 — Working set larger than cache — invisible performance degradation
────────────────────────────────────────────────────────────────────────
// Application on a 4GB RAM server (WiredTiger cache: ~1.8GB)
// Orders collection: 10GB of data (active orders + 3 years of history)
// All queries on orders — hot and cold data mixed

// Performance: p50 latency: 5ms (looks fine), p99 latency: 2,000ms (terrible)
// Cache hit rate: 20% (80% of queries reading from disk)
// Disk I/O: 95% utilization

// Developers add more indexes — makes it worse (more cache used by index pages)
// Developers tune queries — some improve, most don't
// Real fix: the cache is too small for the working set

Fix options (in order of invasiveness):
1. Archive old orders to a separate collection/database (reduce working set)
   await db.collection("orders_2021").insertMany(oldOrders)  // move to archive
   await db.collection("orders").deleteMany({ createdAt: { $lt: cutoffDate } })

2. Upgrade instance RAM (Atlas: upgrade tier; self-hosted: add RAM)
   // Working set now fits in cache → disk reads near zero → latency drops 10x

3. Shard the collection (separate active/historical shards by date range)

BUG 2 — Profiler never checked — production COLLSCAN for 6 months
──────────────────────────────────────────────────────────────────
// db.setProfilingLevel was never enabled
// A new query pattern was added 6 months ago: search orders by sellerId
// No index exists on sellerId
// 50 requests/second × 1 COLLSCAN per request on 5M documents = database at 100% CPU

// The issue was only discovered when the entire database became unresponsive
// Root cause: one query pattern without an index, running 50x per second

Fix: Enable profiling in staging AND production:
await db.command({ profile: 1, slowms: 50 })  // catch queries > 50ms
// Schedule weekly profiler review: check system.profile for COLLSCAN entries
// Set up alerts: Atlas Performance Advisor flags missing indexes automatically

BUG 3 — Using Atlas Search for simple equality — overkill and slow
────────────────────────────────────────────────────────────────────
// Developer sees "Atlas Search" in the docs, uses it for product category filtering
await db.collection("products").aggregate([{
  $search: {
    text: { query: "electronics", path: "category" }
    // Atlas Search for exact category match?? Category is a fixed enum!
  }
}])

// Atlas Search has propagation delay (seconds) from primary to Lucene index
// A newly created product might not appear in search results for 2-10 seconds
// For a fixed enum like category: B-tree index + $match is instant AND zero delay

Fix: Use Atlas Search only for full-text, fuzzy, or relevance-ranked search:
// Category filter: use regular index
await db.collection("products").find(
  { category: "electronics" },  // B-tree index → instant, always consistent
  { readConcern: { level: "local" } }
).toArray()
// Atlas Search: use for name/description search with typo tolerance

BUG 4 — Atlas M0 connection limit hit in staging — production panic
────────────────────────────────────────────────────────────────────
// Staging environment on Atlas M0 (100 connection limit)
// 5 developers run tests simultaneously
// Each MongoClient has maxPoolSize: 100 (default)
// 5 developers × 100 connections = 500 connections attempted → M0 rejects at 100

// Error: "MongoServerError: too many connections"
// Developers assume this is a code bug, not an infrastructure limit
// They add retry logic, more logging, escalate to on-call — hours wasted

Fix 1: Use M10 or M30 for staging — never M0 for anything team-shared
Fix 2: Reduce maxPoolSize in development:
const client = new MongoClient(uri, {
  maxPoolSize: process.env.NODE_ENV === "test" ? 5 : 100
})

BUG 5 — No index on Atlas Search-indexed fields for non-search queries
────────────────────────────────────────────────────────────────────────
// Atlas Search index created on { name, description, brand }
// Developer assumes Atlas Search index = MongoDB index (it does NOT)
// Regular MongoDB queries still need regular B-tree indexes!

// This query does NOT use the Atlas Search index:
await db.collection("products").findOne({ brand: "Xiaomi" })
// Plan: COLLSCAN — no B-tree index on brand, Atlas Search index is irrelevant

// Atlas Search is a separate Lucene process — its indexes are NOT used by MongoDB queries
// They're only used by $search aggregation stage

Fix: Create both: Atlas Search index (for $search) AND B-tree index (for regular queries):
await db.collection("products").createIndex({ brand: 1 })   // for findOne/find queries
// Atlas Search index: for full-text $search aggregation queries
// Both serve different purposes — both are needed`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
WiredTiger cache: 4GB (server has 8GB RAM, 60% to cache)
Products collection: 8GB of data (documents + indexes)
Orders collection: 2GB of data (documents + indexes)

Q: Both collections are queried equally frequently. What cache hit rate would you expect?
   Which queries are likely served from RAM vs disk?
   If you archive 6GB of old products (reducing products collection to 2GB):
   — What happens to cache pressure?
   — How would p99 query latency change?
   — What does db.command({ serverStatus: 1 }).wiredTiger.cache show differently?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This production setup has 4 performance configuration issues. Find and fix each.

// Problem 1: profiling never enabled — no slow query visibility
// (no code shown — the absence is the bug)

// Problem 2: wrong compression for archival collection
await db.createCollection("orders_archive_2022")
// No storageEngine config — defaults to snappy
// This is cold archival data that's rarely read — zstd would save 40% storage

// Problem 3: Atlas Search for a simple exact-match filter
const orders = await db.collection("orders").aggregate([{
  $search: {
    text: { query: "PENDING", path: "status" }  // status is an enum!
  }
}]).toArray()
// This adds 2-10 second search propagation delay to status queries

// Problem 4: checking cache pressure wrong
const serverStatus = await db.command({ serverStatus: 1 })
const cacheUsed = serverStatus.wiredTiger.cache["bytes in cache"]  // wrong field name!
// Correct field: "bytes currently in the cache"

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete performance monitoring and tuning setup for MongoDB:
1. Enable profiling at startup: level 1, slowms: 100 (configurable via env var)
2. scheduledProfilerAudit(): runs every hour, finds COLLSCAN entries in system.profile, logs with collection + query pattern + duration + recommendations
3. checkWorkingSetFit(): compares cache size vs total collection sizes, warns if working set > 80% of cache
4. checkIndexUsage(): uses $indexStats to find indexes with zero accesses (unused indexes), recommends dropping
5. Implement product search using Atlas Search: fuzzy matching on name + brand, filter by category using regular find (not Atlas Search), explain why each tool is used for each part
6. Detect if running on Atlas M0 and log a startup warning
7. Create the orders_archive collection with zstd compression, show how to move documents from orders to orders_archive based on age
8. Write a "query health score" that returns a 0-100 score based on: COLLSCAN rate, cache hit rate, and avg query duration from the profiler`,
    summary: "MongoDB performance tuning starts with the profiler (find what's actually slow), then indexes (eliminate COLLSCANs), then working set sizing (fit hot data in RAM), and then WiredTiger compression tuning for storage efficiency. Atlas Search solves fuzzy full-text search that $text cannot — but it's not a replacement for B-tree indexes on equality queries, and Atlas M0's limitations make it unsuitable for any shared or production workload."
  }
];

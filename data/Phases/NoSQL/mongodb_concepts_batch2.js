const concepts = [
  {
    id: 5,
    title: "Indexes & Query Performance",
    tag: "THE DIFFERENCE BETWEEN 2MS AND 8 SECONDS",
    color: "#2471A3",
    tldr: "MongoDB indexes are B-tree data structures that let the database find documents in O(log n) instead of O(n). Without an index, every query scans every document. With the right index, queries jump directly to matching documents. The wrong index — or too many indexes — makes writes slower without helping reads. `explain('executionStats')` is how you verify what the database actually does.",
    problem: `The most expensive MongoDB mistake that doesn't show up until production: querying a collection with millions of documents with no index. In development with 100 documents, the query returns in 2ms. In production with 5 million documents, the same query takes 12 seconds because MongoDB reads every document sequentially — a collection scan (COLLSCAN).

The second problem: creating indexes blindly without understanding compound index column order. An index on (status, createdAt) helps queries filtering by status. But a query filtering by ONLY createdAt cannot use that index — the left-prefix rule means you must include the leftmost column(s) of the compound index in your query for it to be usable.

The third problem: indexing arrays incorrectly (or not knowing that indexing an array field creates a multikey index that indexes EACH array element separately). If your "tags" field has an array of 50 tags per product, MongoDB creates 50 index entries per document. On 1 million products: 50 million index entries. The index is larger than your data.

The fourth problem: not reading explain() output. Developers add an index, assume it's being used, and don't verify. COLLSCAN in the execution stats is the smoking gun — your index is being ignored. Without reading explain(), you're guessing.

The fifth problem: over-indexing. Every index you create must be updated on every write. A collection with 12 indexes on a high-write table can be 3x slower on writes because each insert/update must update all 12 index trees. Index every field you query, and only those fields.`,
    analogy: `A MongoDB collection without indexes is like a library where every book is shelved randomly. To find "MongoDB: The Definitive Guide," you read every spine in the entire library until you find it. 50,000 books = 50,000 spine checks. That's a COLLSCAN.

A SINGLE FIELD INDEX is like the library's card catalog sorted by title. You find the card for your book in seconds, note the shelf location, walk directly there. 50,000 books = 2 card catalog checks (binary search) + 1 walk.

A COMPOUND INDEX is like a card catalog sorted by genre THEN by title within genre. "Technology → MongoDB..." is instant. But "all books by author Sharma" cannot use this catalog because author isn't in the catalog at all. The leftmost columns must appear in your search.

A MULTIKEY INDEX on an array is like creating one card per genre tag on the book's jacket. A book tagged ["technology", "database", "NoSQL"] gets THREE cards in the catalog — one under each tag. You can now find "all books tagged NoSQL" instantly. But the catalog is now 3x bigger.

A TTL INDEX is like a library's "return by this date" sticker system. The library automatically removes expired books from the shelves once a day — you don't need a cron job or a cleanup script.

EXPLAIN is like asking the librarian to describe, step by step, exactly how they found your book. "I opened the card catalog, found entry 4,821, walked to shelf 7, row 3, retrieved the book." That tells you whether they actually used the catalog or just wandered the stacks.`,
    deep: `INDEX INTERNALS — B-TREE
─────────────────────────
MongoDB uses B-trees for all indexes except text and hashed. A B-tree is a balanced tree where:
- Leaves hold the indexed value + a pointer to the document (_id or RID)
- All leaves are at the same depth (balanced)
- Lookups are O(log n): 1 million documents = ~20 comparisons to find any value
- Range queries are efficient: leaves are linked in sorted order — scan is contiguous

COMPOUND INDEX — LEFT-PREFIX RULE
───────────────────────────────────
Index on { status: 1, customerId: 1, createdAt: -1 }

Can use this index:
- WHERE status = "PENDING"
- WHERE status = "PENDING" AND customerId = "U1"
- WHERE status = "PENDING" AND customerId = "U1" AND createdAt > date

CANNOT use this index:
- WHERE customerId = "U1" (skips leftmost: status)
- WHERE createdAt > date (skips both: status and customerId)
- WHERE status = "PENDING" AND createdAt > date (skips middle: customerId)

Inequality on a field terminates the index usage for fields to its right:
- WHERE status = "PENDING" AND customerId > "U500" → status uses full index, customerId uses range, createdAt cannot use index

SORT USING INDEX
──────────────────
A sort can use an index if the sort fields match the index fields (in order, same direction or all reversed):
Index: { status: 1, createdAt: -1 }
- sort({ status: 1, createdAt: -1 }) → uses index ✅
- sort({ status: -1, createdAt: 1 }) → uses index reversed ✅ (all reversed is OK)
- sort({ createdAt: -1 }) → uses index only if status is equality-filtered in query ✅
- sort({ createdAt: 1 }) → cannot use this index for sort ❌

READING EXPLAIN OUTPUT
───────────────────────
\`\`\`javascript
collection.find(query).explain("executionStats")
\`\`\`

Key fields:
- queryPlanner.winningPlan.stage: COLLSCAN (bad) or IXSCAN (good)
- executionStats.totalDocsExamined: should be close to nReturned
- executionStats.totalKeysExamined: index entries examined
- executionStats.executionTimeMillis: total query time

RED FLAGS:
- stage: "COLLSCAN" on a large collection → missing index
- totalDocsExamined >> nReturned → low selectivity index or wrong index
- "FETCH" stage after IXSCAN with high docsExamined → covered index would help (no FETCH needed)

TTL INDEX — AUTO-EXPIRY
─────────────────────────
TTL indexes run a background thread every 60 seconds that deletes documents where the indexed date field is older than expireAfterSeconds. Useful for: sessions, OTPs, temporary locks, event logs, cache entries.

INDEX INTERSECTION — RARELY USEFUL
────────────────────────────────────
MongoDB CAN use two separate indexes for a single query (index intersection). But in practice, a compound index almost always outperforms index intersection. Design compound indexes, not separate single-field indexes hoping MongoDB will combine them.`,
    code: `// ─── SINGLE FIELD INDEX ───────────────────────────────────────────────────
// Create indexes when you create collections — not after data grows
await db.collection("orders").createIndex(
  { customerId: 1 },
  { name: "idx_orders_customer", background: true }
)

// Single field index with partial filter — indexes only a subset of documents
// Useful: index only PENDING orders (not delivered/cancelled — 90% of writes)
await db.collection("orders").createIndex(
  { createdAt: -1 },
  {
    name: "idx_orders_pending_date",
    partialFilterExpression: { status: "PENDING" },
    background: true
  }
)

// ─── COMPOUND INDEX ────────────────────────────────────────────────────────
// Rule: equality fields first, range/sort fields last
// Query pattern: filter by customerId + status, sort by createdAt

await db.collection("orders").createIndex(
  { customerId: 1, status: 1, createdAt: -1 },
  { name: "idx_orders_customer_status_date" }
)

// This index satisfies ALL of these queries efficiently:
// 1. find({ customerId: "U1" })
// 2. find({ customerId: "U1", status: "PENDING" })
// 3. find({ customerId: "U1", status: "PENDING" }).sort({ createdAt: -1 })
// 4. find({ customerId: "U1" }).sort({ createdAt: -1 }) — after customerId is equality

// ─── MULTIKEY INDEX — indexing array fields ────────────────────────────────
// Product has: { tags: ["5G", "fast-charging", "AMOLED"] }
// MongoDB automatically creates a multikey index when field is an array

await db.collection("products").createIndex(
  { tags: 1 },
  { name: "idx_products_tags" }
)
// Creates 3 index entries per product (one per tag)
// Allows: db.products.find({ tags: "5G" }) — uses index ✅

// COMPOUND MULTIKEY RESTRICTION: only ONE array field per compound index
// This is allowed (tags is the only array):
await db.collection("products").createIndex({ category: 1, tags: 1 })

// This FAILS if both fields are arrays (parallel arrays):
// await db.collection("products").createIndex({ tags: 1, colors: 1 })
// MongoError: "cannot index parallel arrays"

// ─── TEXT INDEX — full-text search ─────────────────────────────────────────
// Only ONE text index per collection (can include multiple fields)
await db.collection("products").createIndex(
  { name: "text", description: "text", brand: "text" },
  {
    name: "idx_products_text",
    weights: { name: 10, brand: 5, description: 1 },  // name matches rank higher
    default_language: "english"
  }
)

// Text search queries
const results = await db.collection("products").find(
  { $text: { $search: "Redmi fast charging" } },
  { projection: { score: { $meta: "textScore" }, name: 1, priceInPaise: 1 } }
).sort({ score: { $meta: "textScore" } })   // sort by relevance
.limit(20)
.toArray()

// ─── TTL INDEX — automatic document expiry ────────────────────────────────
// OTP collection: automatically delete after 10 minutes
await db.collection("otps").createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 600, name: "idx_otps_ttl" }  // 10 minutes
)

const otp = await db.collection("otps").insertOne({
  userId: "U_PRIYA",
  phone: "9876543210",
  code: "847392",
  createdAt: new Date(),  // TTL index uses this field
  verified: false
})
// MongoDB background thread removes this document automatically after 600 seconds
// No cron job needed, no cleanup queries

// Session tokens: expire after 30 days of inactivity
await db.collection("sessions").createIndex(
  { lastAccessedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600, name: "idx_sessions_ttl" }
)

// ─── EXPLAIN — reading execution stats ────────────────────────────────────
// ALWAYS verify your indexes are actually being used

const explanation = await db.collection("orders").find({
  customerId: "U_RAHUL",
  status: "PENDING"
}).sort({ createdAt: -1 }).explain("executionStats")

// What to look at:
const plan = explanation.queryPlanner.winningPlan
const stats = explanation.executionStats

console.log("Stage:", plan.stage)
// COLLSCAN → no index used — PROBLEM on large collections
// IXSCAN → index used — good
// FETCH → after IXSCAN, fetching full documents (not covered)

console.log("Index used:", plan.inputStage?.indexName)
// Should see "idx_orders_customer_status_date" if our compound index is working

console.log({
  docsReturned:  stats.nReturned,
  docsExamined:  stats.totalDocsExamined,   // should be close to nReturned
  keysExamined:  stats.totalKeysExamined,   // index entries scanned
  executionMs:   stats.executionTimeMillis
})

// BAD: docsExamined = 5,000,000, nReturned = 3 → full scan for 3 docs
// GOOD: docsExamined = 3, nReturned = 3 → index delivered exactly what was needed

// ─── COVERED QUERY — no FETCH stage needed ─────────────────────────────────
// Index on { customerId: 1, status: 1, createdAt: -1 }
// If projection includes ONLY indexed fields → MongoDB reads index, never fetches docs

const coveredQuery = await db.collection("orders").find(
  { customerId: "U_RAHUL", status: "PENDING" },
  { projection: { _id: 0, customerId: 1, status: 1, createdAt: 1 } }  // only indexed fields
).explain("executionStats")

// executionStats.totalDocsExamined = 0 → covered query! Never touched actual documents.

// ─── INDEX ON ARRAY WITH $elemMatch ───────────────────────────────────────
// Finding orders where a specific item has both productId AND qty > 2
// Multikey index on items.productId helps, but $elemMatch still needed for multi-condition

await db.collection("orders").createIndex({ "items.productId": 1 })

const result = await db.collection("orders").find({
  items: {
    $elemMatch: {
      productId: "P001",
      qty: { $gt: 2 }
    }
  }
}).explain("executionStats")
// IXSCAN on items.productId to find candidate docs, then FETCH + filter for qty > 2`,
    bugs: `BUG 1 — COLLSCAN on production with 10 million documents
──────────────────────────────────────────────────────────
// Query used in production — no index exists on status
const pendingOrders = await db.collection("orders").find({
  status: "PENDING",
  createdAt: { $gte: new Date("2024-03-01") }
}).toArray()

// explain() reveals: stage: "COLLSCAN", totalDocsExamined: 10,000,000
// Execution time: 12,000ms. Dashboard page times out.
// No error thrown — MongoDB will happily scan 10M docs all day.

Fix:
await db.collection("orders").createIndex(
  { status: 1, createdAt: -1 },
  { background: true }  // non-blocking on live collection
)
// After index: IXSCAN, totalDocsExamined: 847, executionMs: 3

BUG 2 — Compound index column order violates left-prefix rule
──────────────────────────────────────────────────────────────
// Index created: { createdAt: -1, status: 1, customerId: 1 }
// (date first — intuitive but wrong for this query pattern)

await db.collection("orders").find({
  customerId: "U_RAHUL",
  status: "PENDING"
}).explain("executionStats")

// Result: stage: "COLLSCAN" — index is completely unused!
// customerId and status are both to the right of createdAt
// Without filtering on createdAt first, the index is not accessible

Fix: Rebuild index with equality fields first, range last:
await db.collection("orders").dropIndex("old_index_name")
await db.collection("orders").createIndex(
  { customerId: 1, status: 1, createdAt: -1 }
)
// Now: IXSCAN using customerId + status, then using createdAt for sort

BUG 3 — TTL index on wrong field type — documents never expire
────────────────────────────────────────────────────────────────
await db.collection("sessions").createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }  // delete when expiresAt is in the past
)

// Session document:
await db.collection("sessions").insertOne({
  token: "abc123",
  userId: "U1",
  expiresAt: "2024-03-15T00:00:00Z"  // STRING, not Date object!
})

// TTL thread checks: is expiresAt < now? But expiresAt is a string.
// MongoDB TTL only works on BSON Date types — strings are silently ignored.
// Sessions accumulate forever. Storage grows unboundedly.

Fix: ALWAYS use new Date() when inserting TTL-indexed fields:
expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

BUG 4 — Too many indexes killing write performance
────────────────────────────────────────────────────
// Orders collection with 12 indexes (every field indexed "just in case")
// { _id: 1 }         (automatic)
// { customerId: 1 }
// { status: 1 }
// { createdAt: -1 }
// { updatedAt: -1 }
// { paymentMethod: 1 }
// { totalAmountPaise: 1 }
// { deliveryPincode: 1 }
// ... 4 more

// Flash sale: 10,000 orders per second
// Each order insert: must update 12 B-tree indexes = 12x write amplification
// Write throughput dropped from 10,000/sec to 2,000/sec
// Queue backs up, orders time out, customers complain

Fix: Audit indexes with db.collection("orders").getIndexes()
Drop unused indexes: check which indexes have low usage via $indexStats
await db.collection("orders").aggregate([{ $indexStats: {} }]).toArray()
// Drop indexes with accesses.ops === 0 or near-zero — they're write overhead with no read benefit

BUG 5 — Sort without index causes in-memory sort — 32MB limit hit
──────────────────────────────────────────────────────────────────
// Fetching all orders for admin dashboard, sorted by totalAmountPaise
const expensiveOrders = await db.collection("orders").find({})
  .sort({ totalAmountPaise: -1 })
  .limit(100)
  .toArray()

// explain() shows: stage: "SORT" (in-memory sort) — no index on totalAmountPaise
// With 5M orders: MongoDB loads ALL 5M documents into memory to sort them
// Memory limit for in-memory sort: 32MB — throws:
// MongoError: "Executor error: OperationFailed Sort exceeded memory limit of 33554432 bytes"

Fix 1: Create index on sort field:
await db.collection("orders").createIndex({ totalAmountPaise: -1 })

Fix 2: Always filter first (reduce sort input), index after:
// Filter to last 30 days first, then sort — much smaller working set
db.collection("orders").find({ createdAt: { $gte: thirtyDaysAgo } }).sort({ totalAmountPaise: -1 })`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Collection: orders (2,000,000 documents)
Indexes: { customerId: 1, status: 1, createdAt: -1 }

Query A: db.orders.find({ customerId: "U1", status: "PENDING" }).sort({ createdAt: -1 })
Query B: db.orders.find({ status: "PENDING" }).sort({ createdAt: -1 })
Query C: db.orders.find({ customerId: "U1" }).sort({ totalAmountPaise: -1 })
Query D: db.orders.find({ createdAt: { $gte: new Date("2024-01-01") } })

Q: For each query: does it use the index? Is the sort covered by the index?
   What does explain() show for the stage of Query B?
   Query C sorts by totalAmountPaise — what happens? What would you add to fix it?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This index setup has 4 problems. Find and fix each.

// Problem 1: index created after collection is huge — blocking
db.collection("orders").createIndex({ customerId: 1 })

// Problem 2: wrong field type in TTL-indexed document
await db.collection("otps").insertOne({
  userId: "U1",
  code: "123456",
  createdAt: "2024-03-15T10:00:00Z"  // should expire in 10 minutes
})
await db.collection("otps").createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 })

// Problem 3: text search with wrong query syntax
const results = await db.collection("products").find({
  name: { $regex: "smartphone", $options: "i" }  // should use text index
}).toArray()

// Problem 4: no index on foreign key field used in application joins
const orders = await db.collection("orders").find({ customerId: userId }).toArray()
// No index on customerId — COLLSCAN on every page load

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design the complete index strategy for a food delivery platform:
1. orders collection: primary queries (by userId, by restaurantId + status, by date range)
2. restaurants collection: queries (by city + cuisine, by rating, by location near user — 2dsphere)
3. menu_items collection: queries (by restaurantId + category, text search by name)
4. sessions collection: TTL index, expires in 24 hours
5. otps collection: TTL index, expires in 10 minutes, partial index for unverified only
6. For each index: write the createIndex call and explain which queries it serves
7. Run explain("executionStats") on your 3 most critical queries — describe what GOOD output looks like
8. Identify which indexes would hurt write performance during a flash sale and propose trade-offs`,
    summary: "Indexes are the single highest-leverage performance tool in MongoDB — the difference between milliseconds and minutes on large collections. Create compound indexes matched to your query patterns (equality fields first, range/sort fields last), always verify with explain('executionStats'), and audit regularly to remove unused indexes that slow down writes without helping reads."
  },

  {
    id: 6,
    title: "Aggregation Pipeline",
    tag: "SQL JOINS AND GROUP BY, BUT MORE POWERFUL",
    color: "#117A65",
    tldr: "The aggregation pipeline transforms documents through a sequence of stages — filter with $match, reshape with $project, group with $group, join with $lookup, flatten arrays with $unwind. Each stage passes its output to the next. The order of stages is critical for performance: $match and $project early eliminate documents before expensive operations. $facet enables parallel aggregations in one query.",
    problem: `The most common aggregation mistake: putting $match at the end instead of the beginning. Every stage processes the output of the previous stage. If your pipeline starts with $lookup (joining two large collections) and then filters with $match, MongoDB joins everything first — millions of documents — then throws away 99% of them. Flip the order: $match first eliminates 99% of documents, then $lookup joins only what survives.

The second problem: $unwind without understanding what it does to document count. You have 100 orders, each with 5 items. After $unwind on items, you have 500 documents — one per item. Developers expect 100 documents and get confused by the 5x multiplier. Aggregation logic after $unwind needs to re-group to get back to order-level results.

The third problem: $lookup performance misconceptions. Unlike SQL JOINs (which can use sophisticated query optimization with hash joins, sort-merge joins), MongoDB's $lookup is essentially a nested loop join under the hood. It runs one query per document in the left collection. On large collections without proper indexing on the joined field, this is catastrophically slow.

The fourth problem: computing dashboard stats with separate queries instead of $facet. "Total orders today", "Revenue today", "Average order value", "Orders by status" — running four separate aggregation queries when $facet can compute all four in a single pipeline pass.

The fifth problem: group by without understanding accumulators. $group with $sum: 1 counts documents. $sum: "$field" sums a field. $avg: "$field" averages. $push: "$field" collects into an array. $first: "$field" keeps the first value. Mixing these up produces silently wrong analytics.`,
    analogy: `The aggregation pipeline is like a car assembly line. Raw materials (documents) enter at one end. Each station (stage) does ONE thing to every car that passes through. The finished product rolls out at the other end.

$MATCH is the quality control gate at the start: "Only cars that meet these specifications continue." Reject everything else immediately — don't waste the rest of the assembly line's time on rejections.

$PROJECT is the customization station: "Remove the sunroof option, rename 'colour' to 'color', add a calculated field for 'totalWithTax'." Reshape what passes through.

$GROUP is the final packaging station: "Group all blue cars by size, count how many there are, calculate average price per size." Collapses multiple documents into summary documents.

$LOOKUP is the station where you bring in a part from a different supply chain: "For each car passing through, find its engine specification from the engines warehouse." Adds data from another collection. But if the warehouse is far away and disorganized (no index), fetching one engine spec per car is very slow.

$UNWIND is like disassembling each car into individual parts for inspection: "Each car has 4 wheels. After $unwind on wheels, you have 4 documents per car — one per wheel." Useful when you need to work with array elements individually. After inspection, $group reassembles.

$FACET is like having parallel assembly lines running simultaneously: "Line A counts by color. Line B computes average price by model. Line C lists top 10 most expensive." All three lines run on the same input. Results arrive together.`,
    deep: `PIPELINE EXECUTION MODEL
─────────────────────────
MongoDB executes the pipeline sequentially. Each stage streams its output to the next. Some stages ($sort, $group) are "blocking" — they must consume their entire input before producing any output. Others ($match, $project, $limit) can stream.

Memory limit: each stage has a 100MB memory limit by default. For large aggregations:
\`\`\`javascript
{ allowDiskUse: true }
\`\`\`
This allows stages to spill to disk. Slower but removes the 100MB cap. Essential for large sort/group operations.

$LOOKUP INTERNALS
──────────────────
$lookup performs a nested-loop-style join. For each document from the left collection, it queries the right collection. Without an index on the right collection's join field, each query is a full scan.

Performance implications:
- Left collection: 10,000 documents, right collection: 1,000,000 documents, no index on join field
- 10,000 × 1,000,000 comparisons = 10 billion comparisons
- Solution: ALWAYS index the foreignField in the right collection

$lookup with pipeline (MongoDB 3.6+):
\`\`\`javascript
{
  $lookup: {
    from: "users",
    let: { cid: "$customerId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
      { $project: { name: 1, email: 1 } }  // project INSIDE lookup — less data transferred
    ],
    as: "customer"
  }
}
\`\`\`
This is more efficient than basic $lookup when you need to filter or project within the join.

$GROUP ACCUMULATORS
────────────────────
$sum: "$field" — sum numeric values
$sum: 1 — count documents
$avg: "$field" — arithmetic mean
$min/$max: "$field" — minimum/maximum
$push: "$field" — collect all values into array (allows duplicates)
$addToSet: "$field" — collect unique values into set
$first/$last: "$field" — first/last value (after $sort, if meaningful)
$count: {} — count documents (shorthand for $sum: 1, MongoDB 5.0+)

$FACET — PARALLEL AGGREGATIONS
────────────────────────────────
$facet runs multiple sub-pipelines on the same input simultaneously. The output is a single document with one field per sub-pipeline. Input documents are processed once (not N times for N facets).

Use case: search results page showing both the results AND the filter counts (how many products in each price range, how many per brand, etc.) — all in one database round trip.

PIPELINE OPTIMIZATION RULES
─────────────────────────────
1. $match as early as possible — reduce documents before expensive stages
2. $project as early as possible — reduce document size before expensive stages
3. $limit + $sort before $lookup — join only the records you need
4. $unwind immediately after $lookup if you're going to unwind anyway
5. Avoid $where and $function (JavaScript evaluation) — they can't use indexes
6. Use $expr instead of $where for expressions that reference fields`,
    code: `// ─── BASIC PIPELINE: orders with computed stats ─────────────────────────
// Bad order: $group before $match (processes ALL orders)
const badPipeline = [
  { $group: { _id: "$customerId", total: { $sum: "$totalAmountPaise" } } },
  { $match: { total: { $gt: 1000000 } } }  // should come first!
]

// Good order: $match first, then $group (processes only matching orders)
const pipeline = await db.collection("orders").aggregate([
  // Stage 1: filter early — only PLACED orders from last 30 days
  {
    $match: {
      status: "PLACED",
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  },
  // Stage 2: reshape — drop fields we don't need (reduces memory for subsequent stages)
  {
    $project: {
      customerId: 1,
      totalAmountPaise: 1,
      createdAt: 1,
      itemCount: { $size: "$items" }  // compute from array length — no $unwind needed
    }
  },
  // Stage 3: group by customer — compute stats
  {
    $group: {
      _id: "$customerId",
      orderCount: { $sum: 1 },
      totalSpendPaise: { $sum: "$totalAmountPaise" },
      avgOrderValuePaise: { $avg: "$totalAmountPaise" },
      maxOrderValuePaise: { $max: "$totalAmountPaise" },
      totalItems: { $sum: "$itemCount" },
      firstOrderDate: { $min: "$createdAt" },
      lastOrderDate: { $max: "$createdAt" }
    }
  },
  // Stage 4: filter groups (post-aggregation)
  {
    $match: { orderCount: { $gte: 3 } }  // only customers with 3+ orders
  },
  // Stage 5: sort and paginate
  { $sort: { totalSpendPaise: -1 } },
  { $limit: 100 }
]).toArray()

// ─── $LOOKUP WITH PIPELINE — efficient join ───────────────────────────────
// Join orders with users — project only needed fields inside the lookup

const ordersWithCustomers = await db.collection("orders").aggregate([
  { $match: { status: "PENDING" } },
  { $sort: { createdAt: -1 } },
  { $limit: 50 },                        // limit BEFORE lookup — only join 50 docs

  {
    $lookup: {
      from: "users",
      let: { cid: "$customerId" },       // pass left-side field to sub-pipeline
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },  // join condition
        {
          $project: {                    // project INSIDE lookup — transfer less data
            name: 1,
            email: 1,
            phone: 1,
            _id: 0
          }
        }
      ],
      as: "customer"
    }
  },

  { $unwind: { path: "$customer", preserveNullAndEmpty: false } },
  // preserveNullAndEmpty: false → drops orders where user not found (orphaned orders)

  {
    $project: {
      _id: 1,
      status: 1,
      totalAmountPaise: 1,
      createdAt: 1,
      "customer.name": 1,
      "customer.email": 1,
      "customer.phone": 1
    }
  }
]).toArray()

// ─── $UNWIND — flatten and reaggregate ────────────────────────────────────
// Find revenue per product across all orders

const revenueByProduct = await db.collection("orders").aggregate([
  { $match: { status: { $in: ["PLACED", "DELIVERED"] } } },

  // $unwind multiplies documents: 100 orders × 5 items avg = 500 documents
  { $unwind: "$items" },

  // Now each document IS one item — group and sum
  {
    $group: {
      _id: "$items.productId",
      productName: { $first: "$items.productName" },  // same for all docs with same productId
      totalRevenuePaise: { $sum: { $multiply: ["$items.priceAtPurchasePaise", "$items.qty"] } },
      totalUnitsSold: { $sum: "$items.qty" },
      orderCount: { $sum: 1 }
    }
  },

  { $sort: { totalRevenuePaise: -1 } },
  { $limit: 20 },

  // Add computed field: average revenue per order for this product
  {
    $addFields: {
      avgRevenuePerOrderPaise: {
        $round: [{ $divide: ["$totalRevenuePaise", "$orderCount"] }, 0]
      }
    }
  }
]).toArray()

// ─── $FACET — dashboard in one query ─────────────────────────────────────
// Admin dashboard: fetch multiple stats in one aggregation pass

const today = new Date()
today.setHours(0, 0, 0, 0)

const dashboardStats = await db.collection("orders").aggregate([
  // Filter to today's orders first — shared input for all facets
  {
    $match: {
      createdAt: { $gte: today }
    }
  },

  {
    $facet: {
      // Facet 1: overall summary
      summary: [
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenuePaise: { $sum: "$totalAmountPaise" },
            avgOrderValuePaise: { $avg: "$totalAmountPaise" },
            maxOrderValuePaise: { $max: "$totalAmountPaise" }
          }
        }
      ],

      // Facet 2: orders by status
      byStatus: [
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenuePaise: { $sum: "$totalAmountPaise" }
          }
        },
        { $sort: { count: -1 } }
      ],

      // Facet 3: hourly distribution (bucketed by hour)
      hourlyDistribution: [
        {
          $group: {
            _id: { $hour: "$createdAt" },
            orderCount: { $sum: 1 },
            revenuePaise: { $sum: "$totalAmountPaise" }
          }
        },
        { $sort: { "_id": 1 } }
      ],

      // Facet 4: top 5 customers today
      topCustomers: [
        {
          $group: {
            _id: "$customerId",
            customerName: { $first: "$customerName" },
            orderCount: { $sum: 1 },
            totalPaise: { $sum: "$totalAmountPaise" }
          }
        },
        { $sort: { totalPaise: -1 } },
        { $limit: 5 }
      ]
    }
  }
]).toArray()

const { summary, byStatus, hourlyDistribution, topCustomers } = dashboardStats[0]

// ─── $BUCKET — histogram / price range distribution ────────────────────────
// How many orders fall in each price bracket?

const priceDistribution = await db.collection("orders").aggregate([
  { $match: { status: "DELIVERED" } },
  {
    $bucket: {
      groupBy: "$totalAmountPaise",
      boundaries: [0, 50000, 100000, 200000, 500000, 1000000, Infinity],  // in paise
      default: "other",  // documents that don't fit any bucket
      output: {
        count: { $sum: 1 },
        totalRevenuePaise: { $sum: "$totalAmountPaise" },
        avgOrderPaise: { $avg: "$totalAmountPaise" }
      }
    }
  }
]).toArray()
// Buckets: [0-₹500], [₹500-₹1000], [₹1000-₹2000], [₹2000-₹5000], [₹5000-₹10000], [₹10000+]

// $bucketAuto: let MongoDB decide bucket boundaries automatically
const autoBuckets = await db.collection("orders").aggregate([
  { $match: { status: "DELIVERED" } },
  {
    $bucketAuto: {
      groupBy: "$totalAmountPaise",
      buckets: 5,  // create 5 roughly equal-population buckets
      output: {
        count: { $sum: 1 },
        minPaise: { $min: "$totalAmountPaise" },
        maxPaise: { $max: "$totalAmountPaise" }
      }
    }
  }
]).toArray()

// ─── PIPELINE WITH allowDiskUse ────────────────────────────────────────────
// Large aggregations that might exceed 100MB memory limit

const largeAggregation = await db.collection("orders").aggregate(
  [
    { $match: { createdAt: { $gte: new Date("2024-01-01") } } },
    { $group: { _id: "$customerId", total: { $sum: "$totalAmountPaise" } } },
    { $sort: { total: -1 } }
  ],
  { allowDiskUse: true }  // spill to disk if memory limit exceeded
).toArray()`,
    bugs: `BUG 1 — $match after expensive $lookup — processes millions of unnecessary docs
──────────────────────────────────────────────────────────────────────────────
// WRONG: lookup first, then filter
const pipeline = [
  {
    $lookup: {
      from: "users",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
    // Joins ALL orders with ALL users — millions of join operations
  },
  {
    $match: { status: "PENDING" }
    // Only THEN filters to PENDING — 99% of join work was wasted!
  }
]

// CORRECT: filter first, then join only the survivors
const fastPipeline = [
  { $match: { status: "PENDING" } },   // 100 documents remain
  { $lookup: { ... } }                  // join only 100 documents
]

// Impact: 100x fewer join operations. 8000ms → 80ms on production data.

BUG 2 — $unwind without preserveNullAndEmpty — silently drops documents
────────────────────────────────────────────────────────────────────────
// Order document: { _id: "O1", customerId: "U1", items: [] }  — empty items array
// Or: { _id: "O2", customerId: "U2" }  — no items field at all

const results = await db.collection("orders").aggregate([
  { $unwind: "$items" }  // default: drops documents where items is empty or missing!
]).toArray()

// O1 and O2 silently disappear from results
// Revenue calculation: missing orders → wrong total
// Developer can't understand why order count is wrong

Fix:
{ $unwind: { path: "$items", preserveNullAndEmpty: true } }
// Keeps documents with empty/missing arrays — items field becomes null for those docs

BUG 3 — $group without $match accumulates everything in memory
────────────────────────────────────────────────────────────────
// Trying to get monthly revenue — no date filter
await db.collection("orders").aggregate([
  {
    $group: {
      _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
      revenue: { $sum: "$totalAmountPaise" }
    }
  }
  // Processes 5 YEARS of orders — all 20 million documents
  // MongoError: "Exceeded memory limit for $group stage"
])

Fix: Always $match to a reasonable date range before $group:
[
  { $match: { createdAt: { $gte: new Date("2024-01-01") } } },  // this year only
  { $group: { _id: { month: { $month: "$createdAt" } }, revenue: { $sum: "$totalAmountPaise" } } }
]

BUG 4 — $lookup on unindexed foreignField — nested loop catastrophe
──────────────────────────────────────────────────────────────────────
await db.collection("orders").aggregate([
  {
    $lookup: {
      from: "users",
      localField: "customerId",      // orders.customerId
      foreignField: "externalId",    // users.externalId — NOT indexed!
      as: "customer"
    }
  }
])
// For each of 10,000 orders: full scan of 1,000,000 users to find matching externalId
// = 10 billion document comparisons. Query runs for 10 minutes before timeout.

Fix: Create index on foreignField BEFORE using in $lookup:
await db.collection("users").createIndex({ externalId: 1 })
// After index: each lookup is O(log n) instead of O(n)

BUG 5 — $facet sub-pipeline outputs wrapped in array — not unwrapped
──────────────────────────────────────────────────────────────────────
const result = await db.collection("orders").aggregate([
  { $match: { status: "PENDING" } },
  {
    $facet: {
      total: [{ $count: "count" }],
      byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }]
    }
  }
]).toArray()

// result is: [{ total: [{ count: 47 }], byStatus: [...] }]
// total is an ARRAY with one element — not a number!
// result[0].total.count → undefined (it's result[0].total[0].count)

const count = result[0].total.count          // WRONG → undefined
const count2 = result[0].total[0]?.count     // CORRECT → 47

Fix: Always unwrap $facet sub-pipeline results — they're always arrays:
const { total: [{ count }], byStatus } = result[0]`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Collection: orders
[
  { customerId: "U1", status: "PLACED", totalAmountPaise: 100000, items: ["A","B"] },
  { customerId: "U1", status: "PLACED", totalAmountPaise: 200000, items: ["C"] },
  { customerId: "U2", status: "CANCELLED", totalAmountPaise: 50000, items: [] },
  { customerId: "U1", status: "PLACED", totalAmountPaise: 150000, items: ["D","E","F"] }
]

Pipeline:
[
  { $match: { status: "PLACED" } },
  { $unwind: "$items" },
  { $group: { _id: "$customerId", itemCount: { $sum: 1 }, totalPaise: { $sum: "$totalAmountPaise" } } }
]

Q: How many documents after $match? After $unwind?
   What does totalPaise show for U1? Is it correct revenue? Why not?
   How would you fix the pipeline to get correct revenue per customer?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This aggregation pipeline has 4 performance and correctness issues. Find and fix each.

const stats = await db.collection("orders").aggregate([
  // Issue 1: pipeline order
  { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "user" } },
  { $match: { "user.role": "premium", createdAt: { $gte: thirtyDaysAgo } } },

  // Issue 2: unwind drops empty orders
  { $unwind: "$items" },

  // Issue 3: group without projection — carries all fields through pipeline
  { $group: { _id: "$customerId", revenue: { $sum: "$totalAmountPaise" } } },

  // Issue 4: sort without limit on large result set
  { $sort: { revenue: -1 } }
]).toArray()

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete analytics pipeline for a food delivery platform:
1. Daily revenue report: total orders, revenue, avg order value — grouped by restaurant
2. Customer retention: customers who ordered in both last month AND this month
3. Menu popularity: top 10 items by units sold across all restaurants (requires $unwind on items)
4. Search results page: using $facet to return results + price-range counts + cuisine counts simultaneously
5. Delivery time histogram: using $bucketAuto to bucket delivery durations into 5 ranges
6. Identify top-spending customers per city using $group + $sort + $limit per city — show two approaches
7. Add allowDiskUse to appropriate pipelines and explain when it's needed`,
    summary: "The aggregation pipeline's power comes from composing simple stages in the right order — $match and $project early to reduce data volume, $lookup with indexed foreign fields, $unwind paired with $group, and $facet for parallel analytics. Pipeline stage order is a performance decision, not just a logical one."
  },

  {
    id: 7,
    title: "Multi-Document Transactions",
    tag: "WHEN YOU NEED ALL-OR-NOTHING ACROSS DOCUMENTS",
    color: "#784212",
    tldr: "MongoDB's multi-document transactions (4.0+) give you ACID guarantees across multiple documents and collections — either all operations succeed or none do. They come with real performance cost: longer lock hold times, replication overhead, and retry complexity. Use them only when schema redesign (embedding, atomic single-document updates) cannot solve the consistency requirement.",
    problem: `The biggest misunderstanding about MongoDB transactions: developers think they need them everywhere because they're coming from a relational background where transactions are the default unit of work. MongoDB is designed around atomic single-document operations — embedding related data means the "transaction" is free (single document = already atomic). Using multi-document transactions to paper over a bad schema design is like using a sledgehammer where a tap would do.

The second problem: transaction performance overhead is real and significant. A transaction holds locks on modified documents for its duration. Other operations trying to modify those documents must wait. Under high concurrency, transactions become a bottleneck. A wallet debit that takes 2ms without a transaction might take 20ms with one, and 200ms if there's contention.

The third problem: transaction retry logic. Transactions can be aborted for several reasons — write conflicts (another transaction modified the same document), transient network issues, primary elections, session expiry. Without retry logic, a failed transaction silently fails and your application has inconsistency. With retry logic, you must ensure idempotency — if the transaction runs twice, the result should be correct.

The fourth problem: confusing session management. A transaction must be conducted through a single session. Operations inside the transaction must use the session object. If you accidentally perform an operation outside the session (without passing the session object), it runs outside the transaction — it won't be rolled back if the transaction aborts.

The fifth problem: not understanding the timeout. A transaction that runs for more than 60 seconds (default transactionLifetimeLimitSeconds) is automatically aborted by MongoDB. A transaction that includes any user-facing wait or slow I/O will hit this limit in production.`,
    analogy: `Multi-document transactions are like a bank's SWIFT transfer process. The money moves from Bank A (debit wallet) to Bank B (credit order), with a third party notified (insert payment record). The entire transfer is wrapped in a guarantee: either all three steps complete successfully, or the system rolls back to exactly where it started. No partial states. No money in limbo.

But bank transfers are expensive and slow compared to cash transactions at the same branch. You use a SWIFT transfer when you must — international wires, large amounts, legal requirements. You don't use SWIFT to buy a coffee.

MongoDB is like a well-organized bank branch. Most business within the branch (single-document operations) doesn't need the full SWIFT infrastructure. Embedding related data (like order items) means "charging the customer and recording the items" is one operation on one document — automatically atomic, no SWIFT needed.

WHEN YOU DO NEED TRANSACTIONS: Think of it like moving money between two different accounts at two different banks. Two separate ledgers must be updated. If you update Bank A but the connection to Bank B fails, you can't have money disappear. The transaction wraps both updates: either both ledgers are updated or neither is.

SESSION is like the unique transaction reference number. Every operation in the transfer must reference this number. An operation without the reference number is treated as a completely separate, independent operation that won't be rolled back if the transfer fails.

RETRY LOGIC is like the bank's "please wait while we retry the connection" message. Temporary failures are retried automatically. But the bank checks: if the first attempt actually succeeded before the connection dropped, it doesn't send the money a second time (idempotency).`,
    deep: `WHEN TRANSACTIONS ARE ACTUALLY NEEDED
──────────────────────────────────────────
Use transactions when:
1. You must update multiple separate documents atomically (wallet debit + order create)
2. The documents can't be embedded due to size constraints or independent access patterns
3. Business invariants span multiple documents (inventory and orders must always be consistent)

DO NOT use transactions when:
1. Embedding would solve the problem (order + items in one document = free atomicity)
2. Eventual consistency is acceptable (feed updates, notification counts)
3. Single-document atomic operators ($inc, findOneAndUpdate with condition) solve it
4. You could use the Saga pattern (compensating transactions) instead

PERFORMANCE OVERHEAD
─────────────────────
Transactions add overhead in three places:
1. Lock duration: documents are locked for the transaction duration. Concurrent writes block.
2. Replication: transaction commit must replicate to majority before acknowledging (if w: majority)
3. Oplog overhead: entire transaction is written to oplog as one entry

Benchmark: on a single node, a simple two-document update transaction is ~3-5x slower than two non-transactional updates. Under contention (concurrent transactions touching same documents): 10-50x slower.

WRITE CONFLICT AND RETRY
─────────────────────────
If two transactions try to modify the same document, one succeeds and one gets a WriteConflict error (code 112). The failed transaction must be retried.

Retry strategy:
- Max retries: 3-5 (don't retry indefinitely)
- Exponential backoff: wait before retrying (2^n × 100ms)
- Idempotency: ensure retrying the transaction produces the same result

TRANSACTION LIMITS
───────────────────
- Maximum duration: transactionLifetimeLimitSeconds (default: 60 seconds)
- Maximum data size: 16MB of oplog entry per transaction
- Operations per transaction: no hard limit, but large transactions fail more often under contention
- Cursors: no new cursors can be opened inside a transaction

READ YOUR OWN WRITES IN TRANSACTIONS
──────────────────────────────────────
Inside a transaction, you can read documents you've written in the same transaction — even before they're committed. Other sessions cannot see uncommitted transaction writes (snapshot isolation).`,
    code: `// ─── BASIC TRANSACTION — wallet debit + order creation ──────────────────
async function placeOrderWithPayment(
  userId: string,
  items: OrderItemInput[],
  amountPaise: number
): Promise<Order> {
  const session = client.startSession()

  try {
    let createdOrder: Order | null = null

    await session.withTransaction(async () => {
      // Step 1: Debit wallet — atomic check-and-debit
      const wallet = await db.collection("wallets").findOneAndUpdate(
        {
          userId,
          balancePaise: { $gte: amountPaise },  // condition: sufficient balance
          isLocked: { $ne: true }
        },
        {
          $inc: { balancePaise: -amountPaise },
          $set: { updatedAt: new Date() }
        },
        { session, returnDocument: "after" }
      )

      if (!wallet) {
        // Throwing inside withTransaction triggers automatic abort
        throw new InsufficientBalanceError(\`Insufficient balance to place order\`)
      }

      // Step 2: Reserve inventory — atomic per-product
      for (const item of items) {
        const product = await db.collection("products").findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty, reserved: item.qty } },
          { session }
        )
        if (!product) {
          throw new InsufficientStockError(\`Insufficient stock for \${item.productId}\`)
        }
      }

      // Step 3: Create order — all of the above either commit or rollback together
      const orderDoc = {
        _id: new ObjectId(),
        userId,
        items,
        totalAmountPaise: amountPaise,
        status: "PLACED",
        createdAt: new Date()
      }

      await db.collection("orders").insertOne(orderDoc, { session })
      createdOrder = orderDoc as unknown as Order
    }, {
      // Transaction options
      readConcern: { level: "snapshot" },      // snapshot isolation within transaction
      writeConcern: { w: "majority" },         // durable after commit
      maxCommitTimeMS: 10_000                  // abort if commit takes > 10s
    })

    return createdOrder!
  } finally {
    await session.endSession()  // ALWAYS end session — even on error
  }
}

// ─── TRANSACTION WITH RETRY LOGIC ────────────────────────────────────────
// Write conflicts require retry — withTransaction does basic retry but
// application-level retry with backoff is more robust

async function transferFundsWithRetry(
  fromUserId: string,
  toUserId: string,
  amountPaise: number,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Debit sender
        const sender = await db.collection("wallets").findOneAndUpdate(
          { userId: fromUserId, balancePaise: { $gte: amountPaise } },
          { $inc: { balancePaise: -amountPaise } },
          { session }
        )
        if (!sender) throw new InsufficientBalanceError("Sender has insufficient balance")

        // Credit receiver
        await db.collection("wallets").updateOne(
          { userId: toUserId },
          { $inc: { balancePaise: amountPaise } },
          { session }
        )

        // Insert transfer record
        await db.collection("transfers").insertOne({
          fromUserId,
          toUserId,
          amountPaise,
          status: "COMPLETED",
          transactionId: new ObjectId().toString(),
          ts: new Date()
        }, { session })
      })

      return  // success — exit retry loop
    } catch (err) {
      lastError = err as Error

      // Retry on transient errors — not on application errors
      const isTransient = (err as any).hasErrorLabel?.("TransientTransactionError")
        || (err as any).code === 112  // WriteConflict
      if (!isTransient) throw err  // not retryable — rethrow immediately

      // Exponential backoff: 100ms, 200ms, 400ms
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
    } finally {
      await session.endSession()
    }
  }

  throw lastError ?? new Error("Transaction failed after max retries")
}

// ─── MANUAL ABORT — explicit rollback ─────────────────────────────────────
// Sometimes you need to abort a transaction explicitly based on business logic

async function processRefund(orderId: string, amountPaise: number): Promise<void> {
  const session = client.startSession()
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
  })

  try {
    const order = await db.collection("orders").findOne(
      { _id: new ObjectId(orderId) },
      { session }
    )

    if (!order) {
      await session.abortTransaction()  // explicit abort
      throw new NotFoundError("Order", orderId)
    }

    if (order.status !== "DELIVERED") {
      await session.abortTransaction()
      throw new BusinessRuleError("Can only refund DELIVERED orders")
    }

    // Mark order as refunded
    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: "REFUNDED", refundedAt: new Date() } },
      { session }
    )

    // Credit the wallet
    await db.collection("wallets").updateOne(
      { userId: order.userId },
      { $inc: { balancePaise: amountPaise } },
      { session }
    )

    await session.commitTransaction()  // explicit commit
  } catch (err) {
    // If error wasn't from abortTransaction above, abort here
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    throw err
  } finally {
    await session.endSession()
  }
}

// ─── SCHEMA ALTERNATIVE TO TRANSACTIONS ───────────────────────────────────
// BEFORE: requires transaction (two documents)
// Wallet document + Order document must update atomically

// AFTER: embed pending charges in wallet — single document, no transaction
// "Pre-authorization" pattern — wallet holds the pending charge

const walletWithPendingDoc = {
  _id: "W_U1",
  userId: "U1",
  balancePaise: 500000,       // available balance (after deducting pending)
  pendingCharges: [           // embedded — updated atomically with balance
    {
      orderId: new ObjectId(),
      amountPaise: 149900,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)  // 10 min reservation
    }
  ]
}

// Single-document atomic debit: checks balance - pending >= amount
await db.collection("wallets_v2").findOneAndUpdate(
  {
    userId: "U1",
    // Available = balance - sum(pendingCharges)
    // MongoDB can't compute this in query — pre-compute available on update instead
    balancePaise: { $gte: 149900 }
  },
  {
    $inc: { balancePaise: -149900 },
    $push: { pendingCharges: { orderId: new ObjectId(), amountPaise: 149900, createdAt: new Date() } }
  }
)
// No session, no transaction, 5x faster

// ─── READING REPLICA SET STATE — transaction awareness ────────────────────
// Show current replication state and lag

async function checkReplicaHealth(): Promise<void> {
  const adminDb = client.db("admin")
  const status = await adminDb.command({ replSetGetStatus: 1 })

  for (const member of status.members) {
    const role = member.stateStr  // "PRIMARY", "SECONDARY", "ARBITER"
    const lag = member.optimeDate
      ? Math.abs(new Date().getTime() - member.optimeDate.getTime())
      : 0

    console.log({
      host: member.name,
      role,
      lagMs: lag,
      health: member.health === 1 ? "healthy" : "unhealthy"
    })

    // Alert if secondary lag exceeds 5 seconds
    if (role === "SECONDARY" && lag > 5000) {
      console.error(\`ALERT: Secondary \${member.name} is \${lag}ms behind primary\`)
    }
  }
}`,
    bugs: `BUG 1 — Operation performed without session — not rolled back on abort
────────────────────────────────────────────────────────────────────
async function placeOrder(userId: string, items: any[], session: ClientSession) {
  await session.withTransaction(async () => {
    await db.collection("wallets").updateOne(
      { userId },
      { $inc: { balancePaise: -100000 } },
      { session }  // ✅ uses session
    )

    // BUG: forgot to pass session to email log insert
    await db.collection("email_logs").insertOne({
      type: "order_confirmation",
      userId,
      ts: new Date()
      // NO session — this operation is OUTSIDE the transaction!
    })

    throw new Error("Payment gateway timeout")  // abort transaction
  })
  // Transaction aborted — wallet debit is rolled back ✅
  // BUT: email_log entry is NOT rolled back — it was outside the transaction
  // Database now has an email_log for an order that doesn't exist
}

Fix: EVERY database operation inside a transaction must receive the session object.
Pass session explicitly to every db call or use a session-aware wrapper.

BUG 2 — No retry on WriteConflict — silent transaction failure
────────────────────────────────────────────────────────────────
async function transferFunds(fromId: string, toId: string, amount: number) {
  const session = client.startSession()
  try {
    await session.withTransaction(async () => {
      await db.collection("wallets").updateOne({ userId: fromId }, { $inc: { balance: -amount } }, { session })
      await db.collection("wallets").updateOne({ userId: toId }, { $inc: { balance: amount } }, { session })
    })
  } catch (err) {
    // No retry logic — WriteConflict (code 112) throws here and is not retried
    throw err  // "Transaction 47 has been aborted" — user sees a 500 error
  } finally {
    await session.endSession()
  }
}

// Under load: 10 concurrent transfers → some hit WriteConflict → fail immediately
// Without retry: ~15% of transfers fail under moderate load

Fix: Implement retry with backoff for TransientTransactionError:
if ((err as any).hasErrorLabel?.("TransientTransactionError")) {
  await sleep(backoffMs)
  return transferFunds(fromId, toId, amount)  // retry
}

BUG 3 — Transaction running slow I/O inside — hits 60s timeout
────────────────────────────────────────────────────────────────
async function placeOrderWithPDFInvoice(userId: string, items: any[]) {
  const session = client.startSession()
  await session.withTransaction(async () => {
    await db.collection("wallets").updateOne(..., { session })
    await db.collection("orders").insertOne(..., { session })

    // BUG: generating PDF INSIDE the transaction
    const pdf = await pdfService.generateInvoice(items)  // takes 3-8 seconds
    await uploadToS3(pdf)                                 // takes 2-5 seconds

    await db.collection("invoices").insertOne({ pdfUrl: ... }, { session })
  })
  // If PDF generation + upload > 60s: MongoServerError: "transaction is too large for snapshot"
  // OR: "Transaction has been committed or aborted"
  // Wallet was debited, but no order or invoice created
}

Fix: Move slow I/O OUTSIDE the transaction. Transaction should contain only DB ops:
const session = client.startSession()
let orderId: ObjectId
await session.withTransaction(async () => {
  orderId = new ObjectId()
  await db.collection("wallets").updateOne(...)
  await db.collection("orders").insertOne({ _id: orderId, ... }, { session })
})
await session.endSession()
// After transaction committed: now do slow I/O
const pdf = await pdfService.generateInvoice(items)
await db.collection("invoices").insertOne({ orderId, pdfUrl: pdf.url })

BUG 4 — Session not ended on error — connection pool exhaustion
────────────────────────────────────────────────────────────────
async function badTransaction(userId: string) {
  const session = client.startSession()
  session.startTransaction()
  try {
    await db.collection("wallets").updateOne({ userId }, { $inc: { balance: -100 } }, { session })
    await session.commitTransaction()
  } catch (err) {
    await session.abortTransaction()
    throw err
    // BUG: session.endSession() never called on error path!
  }
  await session.endSession()  // only reached on success
}

// Each failed transaction leaks a session
// MongoDB has a connection/session limit (~100 concurrent sessions per mongod)
// After 100 errors: new sessions fail: "Too many sessions"
// All further requests fail until server restarts

Fix: ALWAYS call endSession() in finally:
} finally {
  await session.endSession()  // guaranteed cleanup
}

BUG 5 — Using transactions for single-document operations
──────────────────────────────────────────────────────────
// Incrementing a stock counter with a transaction
async function reserveStock(productId: string, qty: number) {
  const session = client.startSession()
  await session.withTransaction(async () => {
    const product = await db.collection("products").findOne({ _id: productId }, { session })
    if (!product || product.stock < qty) throw new Error("Out of stock")
    await db.collection("products").updateOne(
      { _id: productId },
      { $inc: { stock: -qty } },
      { session }
    )
  })
  await session.endSession()
}

// This transaction has 3x the overhead of a non-transactional findOneAndUpdate
// The single-document operation IS ALREADY ATOMIC — no transaction needed!

Fix: Single document → use findOneAndUpdate — already atomic, no transaction:
const product = await db.collection("products").findOneAndUpdate(
  { _id: productId, stock: { $gte: qty } },
  { $inc: { stock: -qty } },
  { returnDocument: "after" }
)
if (!product) throw new InsufficientStockError()`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Starting state:
wallets: { userId: "U1", balancePaise: 100000 }
wallets: { userId: "U2", balancePaise: 50000 }

Transaction T1 (starts first, commits second):
  - Read U1 balance: 100000
  - Read U2 balance: 50000
  - Write U1: $inc -30000
  - Write U2: $inc +30000

Transaction T2 (starts second, commits first):
  - Read U1 balance: 100000  ← same snapshot as T1 sees
  - Write U1: $inc -80000

Both transactions commit successfully.

Q: What is U1's final balance? Is this correct?
   Can both transactions see balance = 100000 for U1? Why?
   What happens if T2 tries to commit AFTER T1 commits — is there a write conflict?
   How would you prevent U1's balance from going negative?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This transaction has 4 correctness problems. Find and fix each.

async function processPayment(userId: string, orderId: string, amountPaise: number) {
  const session = client.startSession()

  try {
    session.startTransaction()

    const wallet = await db.collection("wallets").findOne({ userId })  // Bug 1: no session

    if (!wallet || wallet.balancePaise < amountPaise) {
      throw new Error("Insufficient balance")  // Bug 2: not handling abort correctly
    }

    await db.collection("wallets").updateOne(
      { userId },
      { $inc: { balancePaise: -amountPaise } },
      { session }
    )

    // Bug 3: slow external call inside transaction
    const paymentResult = await paymentGateway.charge(amountPaise)

    await db.collection("payments").insertOne({
      orderId, amountPaise, status: "SUCCESS",
      gatewayRef: paymentResult.id
    }, { session })

    await session.commitTransaction()
  } catch (err) {
    // Bug 4: session never ended on error
    await session.abortTransaction()
    throw err
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete money transfer system that decides when to use transactions vs not:
1. Implement reserveStock(productId, qty): single document — should NOT use transaction
2. Implement debitWallet(userId, amount): single document — should NOT use transaction
3. Implement placeOrder(userId, items, amountPaise): multi-document — MUST use transaction
   - Atomically: debit wallet + reserve stock for each item + create order record
   - Abort if any stock is insufficient (release all reservations)
   - Abort if wallet insufficient (release all stock reservations)
4. Add retry logic: 3 attempts with exponential backoff on TransientTransactionError
5. Add idempotency: if placeOrder is called twice with same idempotency key, second call is a no-op
6. Monitor: log transaction duration, retry count, and write conflicts
7. Write a test verifying: 100 concurrent placeOrder calls for 50 items result in exactly 50 successful orders`,
    summary: "Multi-document transactions provide ACID guarantees when you truly need all-or-nothing across multiple documents, but they come with real performance cost and retry complexity. Before reaching for a transaction, ask whether embedding, single-document atomic operators, or schema redesign can solve the consistency requirement with less overhead."
  },

  {
    id: 8,
    title: "Read Preferences & Write Concerns",
    tag: "TRADING CONSISTENCY FOR SPEED, DELIBERATELY",
    color: "#6C3483",
    tldr: "Read preference controls which node in a replica set answers your queries. Write concern controls how many nodes must acknowledge a write before it's considered successful. Together they let you tune MongoDB's consistency vs performance trade-off deliberately — routing analytics reads to secondaries, using w:majority for financial data, and w:1 for high-volume event streams where occasional data loss is acceptable.",
    problem: `The most dangerous production misconfiguration: using writeConcern: { w: 1 } (MongoDB's default) for financial data. With w:1, MongoDB acknowledges the write as soon as the primary receives it — before any secondary has replicated it. If the primary fails in the next millisecond before replication, the write is lost. The user's ₹50,000 wallet debit or ₹2,00,000 order is gone. No error was thrown. No warning. The money was debited from the user's account but the order record doesn't exist.

The second problem: using readPreference: "primary" (the default) for everything, even heavy analytics queries. Every analytics query competes with user-facing traffic on the primary node. A reporting query that takes 30 seconds can degrade primary performance for all users during those 30 seconds. Routing analytics to secondaries costs nothing and protects primary availability for user traffic.

The third problem: not understanding replication lag. A secondary might be 500ms to several seconds behind the primary, depending on write volume and network conditions. If your code writes to the primary and then immediately reads from a secondary (readPreference: secondary), it might read stale data — the write hasn't replicated yet. This is the "read-your-own-writes" problem.

The fourth problem: not monitoring replication lag in production. A secondary that falls seconds behind the primary starts serving increasingly stale reads. If the secondary is a hidden member used for analytics, stale analytics is acceptable. But if it's serving user reads (readPreference: secondaryPreferred), users see outdated data and support tickets arrive.

The fifth problem: using writeConcern: { w: "majority" } with wtimeout: 0 (wait forever). Under network issues or secondary failures, writes block indefinitely. API endpoints time out waiting for write acknowledgment. Setting a reasonable wtimeout causes the write to fail fast so you can handle it.`,
    analogy: `Think of a replica set as a hospital's medical record system with a central server (primary) and two backup terminals (secondaries).

WRITE CONCERN is the doctor's signature requirement. w:1 means only the central server needs to acknowledge the record update — fast, but if the central server crashes before backing up, the record is lost. w:majority means two of three servers must confirm the record exists — slower, but the record survives any single server failure.

READ PREFERENCE is which terminal answers your query. Primary: always the central server — freshest data, highest load. Secondary: a backup terminal — slightly stale but takes load off the central server. SecondaryPreferred: use backup if available, fallback to central if no backup is up. Nearest: whichever terminal responds fastest (useful across geographic regions).

REPLICATION LAG is the delay between the central server updating a record and the backup terminals receiving the update. If a patient was just admitted (written to primary) and you query a backup terminal before the update arrives (read from secondary), the backup might say "no patient with that name on file." The lag is usually milliseconds but can spike to seconds under high write load.

WTIMEOUT is the "how long will you wait for the backup terminals to confirm?" Without a timeout, the nurse waits indefinitely for backup confirmation — during a network outage, the nurse stands frozen, blocking everyone else. With wtimeout: 5000, if backup confirmation doesn't arrive in 5 seconds, return an error and let the supervisor (application) decide what to do.

CAUSAL CONSISTENCY is like giving each doctor a sequence number for their writes. "I wrote this record as write #47. When you read back, only give me results that reflect write #47 or later." This ensures the doctor reads their own writes, even from a backup terminal.`,
    deep: `READ PREFERENCE OPTIONS
────────────────────────
primary (default): all reads go to primary. Strongest consistency, highest primary load.

primaryPreferred: reads go to primary; if primary unavailable, falls back to secondary. Good for fault tolerance.

secondary: reads always go to a secondary. Cannot serve reads if no secondaries are available. Saves primary resources. May serve stale data.

secondaryPreferred: reads go to secondary if available; falls back to primary. Most common for read scaling.

nearest: reads go to the member with the lowest network latency (regardless of primary/secondary). Good for geographically distributed replica sets.

TAG SETS: Route reads to specific secondaries by tag:
\`\`\`javascript
readPreference: new ReadPreference("secondary", [{ region: "us-east", tier: "analytics" }])
\`\`\`
Tag specific secondaries for analytics vs user-facing reads.

WRITE CONCERN OPTIONS
──────────────────────
w: 0 — fire and forget. No acknowledgment. Fastest. Use only for very high volume, loss-tolerant data (page view logs, analytics events).

w: 1 (default) — acknowledged by primary only. Fast but risks data loss on primary failure before replication.

w: 2 — acknowledged by primary + at least 1 secondary. Good middle ground for 3-node replica sets.

w: "majority" — acknowledged by the majority of the replica set. Durable across elections. Required for financial data.

w: "tag-name" — acknowledged by members matching a custom tag.

j: true — journal write. Primary persists to disk journal before acknowledging. Protects against primary crashes before journal flush (every ~100ms). Add to any w setting.

wtimeout: N — milliseconds before write acknowledgment times out. 0 = wait forever. Recommended: 5000-30000 for user-facing writes.

CAUSAL CONSISTENCY SESSION
────────────────────────────
MongoDB sessions support causal consistency: after a write in a session, subsequent reads in the same session are guaranteed to see that write — even from a secondary.

\`\`\`javascript
const session = client.startSession({ causalConsistency: true })
await collection.insertOne(doc, { session })
// Next read from secondary in same session: guaranteed to see the insert
const result = await collection.findOne({ _id: doc._id }, { session })
\`\`\`

MONITORING REPLICATION LAG
────────────────────────────
\`\`\`javascript
db.admin().command({ replSetGetStatus: 1 })
// member.optimeDate: last oplog timestamp applied
// Lag = primary.optimeDate - secondary.optimeDate
\`\`\`
Alert threshold: > 5 seconds for secondaries serving user reads. > 60 seconds is a serious problem.`,
    code: `// ─── CONFIGURING READ PREFERENCE PER OPERATION ──────────────────────────
// Different reads need different freshness guarantees

// // const { ReadPreference } = require("mongodb")

// User-facing reads: always primary — must be fresh
async function getUserProfile(userId: string): Promise<User | null> {
  return db.collection("users").findOne(
    { _id: userId },
    { readPreference: ReadPreference.PRIMARY }  // freshest data for user-facing
  )
}

// Analytics / reporting: secondaries OK — slightly stale is acceptable
async function getDailySalesReport(date: Date): Promise<SalesReport> {
  return db.collection("orders").aggregate([
    { $match: { createdAt: { $gte: date } } },
    { $group: { _id: null, total: { $sum: "$totalAmountPaise" }, count: { $sum: 1 } } }
  ], {
    readPreference: ReadPreference.SECONDARY_PREFERRED  // route to secondary, save primary
  }).toArray()
}

// Read immediately after write — use causal consistency to avoid stale read
async function updateAndReadProfile(userId: string, name: string): Promise<User> {
  const session = client.startSession({ causalConsistency: true })

  try {
    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { name } },
      { session, writeConcern: { w: "majority" } }
    )

    // Read from secondary — but causal consistency guarantees we see the write above
    return await db.collection("users").findOne(
      { _id: userId },
      { session, readPreference: ReadPreference.SECONDARY_PREFERRED }
    ) as User
  } finally {
    await session.endSession()
  }
}

// ─── WRITE CONCERNS FOR DIFFERENT DATA TYPES ────────────────────────────
// Financial data: w:majority + journal — must not be lost
async function recordWalletDebit(userId: string, amountPaise: number): Promise<void> {
  await db.collection("wallets").updateOne(
    { userId, balancePaise: { $gte: amountPaise } },
    {
      $inc: { balancePaise: -amountPaise },
      $push: {
        ledger: {
          type: "DEBIT",
          amountPaise,
          ts: new Date(),
          txId: new ObjectId().toString()
        }
      }
    },
    {
      writeConcern: {
        w: "majority",  // acknowledged by majority — survives primary failure
        j: true,        // journaled — survives primary crash before journal flush
        wtimeout: 10_000  // fail fast after 10s if majority unreachable
      }
    }
  )
}

// User-generated content: w:1 is fine — acceptable risk of losing a comment
async function addComment(postId: string, comment: CommentInput): Promise<void> {
  await db.collection("posts").updateOne(
    { _id: new ObjectId(postId) },
    { $push: { comments: { ...comment, ts: new Date() } } },
    { writeConcern: { w: 1 } }  // fast — occasional comment loss in extreme failure is OK
  )
}

// High-volume analytics events: w:0 — fire and forget
async function trackPageView(productId: string, userId: string): Promise<void> {
  db.collection("page_views").insertOne(
    { productId, userId, ts: new Date() },
    { writeConcern: { w: 0 } }  // no acknowledgment — fastest possible write
  ).catch(err => console.error("Page view write failed (non-critical):", err.message))
  // Non-blocking — don't await fire-and-forget writes
}

// ─── REPLICA SET CLIENT CONFIGURATION ─────────────────────────────────────
// Different clients for different workloads

// Primary client: for all user-facing transactional writes
const primaryClient = new MongoClient(process.env.MONGODB_URI!, {
  readPreference: "primary",
  writeConcern: { w: "majority", j: true }
})

// Analytics client: reads routed to secondary, read-only workload
const analyticsClient = new MongoClient(process.env.MONGODB_URI!, {
  readPreference: "secondaryPreferred",
  // No write concern needed — analytics client should be read-only
})

// High-throughput event client: for event streams, logs
const eventClient = new MongoClient(process.env.MONGODB_URI!, {
  readPreference: "primaryPreferred",
  writeConcern: { w: 1 }  // fast writes, occasional loss acceptable
})

// ─── MONITORING REPLICATION LAG ─────────────────────────────────────────
async function monitorReplicationLag(): Promise<void> {
  const adminDb = client.db("admin")
  const status = await adminDb.command({ replSetGetStatus: 1 })

  const primaryOptime = status.members
    .find((m: any) => m.stateStr === "PRIMARY")
    ?.optimeDate as Date | undefined

  if (!primaryOptime) {
    console.error("No primary found in replica set!")
    return
  }

  for (const member of status.members) {
    if (member.stateStr !== "SECONDARY") continue

    const lagMs = primaryOptime.getTime() - (member.optimeDate as Date).getTime()

    if (lagMs > 10_000) {
      // Alert: secondary is more than 10 seconds behind
      await alerting.send({
        severity: "warning",
        message: \`Secondary \${member.name} is \${lagMs}ms behind primary\`,
        lagMs,
        host: member.name
      })
    }

    console.log({
      secondary: member.name,
      lagMs,
      state: member.stateStr,
      healthy: member.health === 1
    })
  }
}

// Run monitoring every 30 seconds
setInterval(monitorReplicationLag, 30_000)

// ─── READ PREFERENCE WITH TAGS ─────────────────────────────────────────────
// Tag secondaries for specific workloads in mongod.conf:
// replication.memberConfig.tags: { region: "us-east", tier: "analytics" }

// Route analytics to tagged analytics secondary
const analyticsReadPref = new ReadPreference(
  ReadPreference.SECONDARY,
  [{ tier: "analytics" }],  // tag set
  { maxStalenessSeconds: 120 }  // accept up to 2 minutes stale — analytics OK
)

const monthlySales = await db.collection("orders").find(
  { createdAt: { $gte: new Date("2024-03-01") } },
  { readPreference: analyticsReadPref }
).toArray()

// ─── WRITE CONCERN TIMEOUT HANDLING ───────────────────────────────────────
async function safeWrite(data: Record<string, unknown>): Promise<boolean> {
  try {
    await db.collection("critical_events").insertOne(data, {
      writeConcern: { w: "majority", wtimeout: 5_000 }  // 5 second timeout
    })
    return true
  } catch (err) {
    if ((err as any).code === 64) {
      // WriteConcernError: MIGHT have written to primary
      // Check before deciding how to handle
      const existing = await db.collection("critical_events").findOne(
        { _id: (data as any)._id },
        { readPreference: ReadPreference.PRIMARY, readConcern: { level: "local" } }
      )
      if (existing) {
        // Write happened on primary — replication is just slow. OK.
        console.warn("Write succeeded on primary but majority timed out")
        return true
      }
      // Write didn't make it — truly failed
      console.error("Write failed: majority not achieved within timeout")
      return false
    }
    throw err  // unexpected error
  }
}`,
    bugs: `BUG 1 — Default w:1 for financial data — silent money loss on failover
───────────────────────────────────────────────────────────────────────
// Order service using default write concern
await db.collection("orders").insertOne({
  userId: "U_RAHUL",
  amountPaise: 499900,
  status: "PLACED"
})
// w: 1 default: MongoDB acknowledges when primary receives it
// 50ms later: primary fails before replicating this document
// New primary elected: document does NOT exist on it
// User was charged ₹4,999 — no order record exists anywhere
// Customer support ticket: "I was charged but no order was created"
// Recovery: manual investigation, refund, apology

Fix: All financial writes must use w: "majority" and j: true:
{ writeConcern: { w: "majority", j: true, wtimeout: 10_000 } }

BUG 2 — Reading own writes from secondary — stale data served to user
────────────────────────────────────────────────────────────────────────
// User updates their profile name
await db.collection("users").updateOne(
  { _id: userId },
  { $set: { name: "Priya Sharma-Verma" } },
  { writeConcern: { w: "majority" } }  // written to majority ✅
)

// Immediately redirect to profile page — fetch user from secondaryPreferred
const user = await db.collection("users").findOne(
  { _id: userId },
  { readPreference: ReadPreference.SECONDARY_PREFERRED }  // might be stale!
)
// user.name = "Priya Sharma" (old name — secondary hasn't replicated yet)
// User sees: "My name update didn't save" — calls support

Fix: Use causal consistency for read-your-own-writes:
const session = client.startSession({ causalConsistency: true })
await collection.updateOne(..., { session })
const user = await collection.findOne({ _id: userId }, { session })
// Guaranteed to see the write in the same session, even from secondary

BUG 3 — Analytics query on primary blocks user traffic
────────────────────────────────────────────────────────
// Monthly revenue report — runs at 8pm when traffic is highest
await db.collection("orders").aggregate([
  { $match: { createdAt: { $gte: new Date("2024-03-01") } } },
  { $group: { _id: { $dayOfMonth: "$createdAt" }, revenue: { $sum: "$totalAmountPaise" } } }
  // No readPreference set — defaults to primary!
])
// 30-second aggregation on primary
// p99 latency for all user-facing requests spikes from 50ms to 800ms
// Alert fires: "API response time degraded"
// Cause: analytics query competing with user traffic on primary

Fix: Route analytics to secondary:
db.collection("orders").aggregate([...], {
  readPreference: ReadPreference.SECONDARY_PREFERRED
})

BUG 4 — wtimeout: 0 causes indefinite blocking writes
────────────────────────────────────────────────────────
// Secondary goes down for maintenance
// Primary has only 1 of 3 nodes — cannot achieve majority

await db.collection("orders").insertOne(order, {
  writeConcern: { w: "majority" }  // wtimeout defaults to 0 — wait forever!
})
// Request hangs for minutes waiting for majority
// API request times out (30s Nginx timeout): user gets 504 Gateway Timeout
// But write might eventually succeed when secondary comes back

Fix: ALWAYS set wtimeout for majority writes:
{ writeConcern: { w: "majority", wtimeout: 10_000 } }
// Fails fast after 10s — application can show error and retry

BUG 5 — readPreference: secondary with no secondaries available
────────────────────────────────────────────────────────────────
const client = new MongoClient(uri, { readPreference: "secondary" })

// During maintenance: both secondaries down, only primary up
const users = await db.collection("users").find({}).toArray()
// MongoServerSelectionError: "No suitable servers found (server selection timed out)"
// Application completely down even though primary is healthy!

// "secondary" (not "secondaryPreferred") requires a secondary — refuses primary fallback

Fix: Use "secondaryPreferred" for most cases — falls back to primary if no secondaries:
const client = new MongoClient(uri, { readPreference: "secondaryPreferred" })
// If secondaries down: primary serves reads — still available`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Replica set: 3 nodes (1 primary P, 2 secondaries S1, S2)
Scenario: S1 and S2 are both 2 seconds behind P due to high write load.

Query A: db.orders.findOne({ _id: "O1" }, { readPreference: "primary" })
Query B: db.orders.findOne({ _id: "O1" }, { readPreference: "secondary" })
Query C: db.orders.findOne({ _id: "O1" }, { readPreference: "nearest" })

Order "O1" was inserted 1 second ago.

Q: Which queries successfully find "O1"? Which might return null?
   If P goes down while S1 and S2 are 2 seconds behind: which queries work?
   What write concern would guarantee O1 is found by Query B immediately after insert?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This service has 4 read/write concern misconfigurations. Find and fix each.

class WalletService {
  // Bug 1: wrong write concern for financial operation
  async debitWallet(userId: string, amount: number) {
    return db.collection("wallets").updateOne(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } }
      // No writeConcern specified — defaults to w:1
    )
  }

  // Bug 2: stale read after write — no causal consistency
  async transferAndGetBalance(from: string, to: string, amount: number) {
    await this.debitWallet(from, amount)
    await db.collection("wallets").updateOne({ userId: to }, { $inc: { balance: amount } })
    // Reading from secondary immediately after
    return db.collection("wallets").findOne(
      { userId: from },
      { readPreference: ReadPreference.SECONDARY }  // may show old balance!
    )
  }

  // Bug 3: analytics on primary
  async getMonthlyReport(month: Date) {
    return db.collection("transactions").aggregate([
      { $match: { ts: { $gte: month } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).toArray()  // no readPreference — hits primary
  }

  // Bug 4: majority without timeout — could block forever
  async recordCriticalAuditEvent(event: AuditEvent) {
    return db.collection("audit_log").insertOne(event, {
      writeConcern: { w: "majority" }  // no wtimeout — blocks indefinitely on network issues
    })
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design a complete read/write concern strategy for an e-commerce platform:
1. Define 3 MongoDB clients: transactional (user-facing), analytics (reporting), events (high-volume)
2. For each client: specify readPreference, writeConcern, and rationale
3. Implement a causal consistency wrapper that ensures read-your-own-writes for user profile updates
4. Implement a health check that: checks replication lag and alerts if > 10 seconds
5. Implement a tagged secondary setup: one secondary tagged for analytics, one for user reads
6. Show how to route: order creation (primary, w:majority), product search (secondaryPreferred), monthly report (secondary tagged analytics)
7. Handle the WriteConcernError case: write may or may not have succeeded — show idempotent retry
8. Write a test that verifies: a wallet debit is NOT lost even if primary fails immediately after write`,
    summary: "Read preferences and write concerns are the knobs that let you trade consistency for performance, deliberately and per-operation. Use w:majority for financial data (never lose a write), route analytics to secondaries (protect primary availability), set wtimeout on all majority writes (fail fast, not hang), and use causal consistency sessions whenever you need to read your own writes."
  }
];

const concepts = [
  {
    id: 1,
    title: "CAP Theorem & MongoDB's Sweet Spots",
    tag: "WHY YOU CAN'T HAVE EVERYTHING",
    color: "#27AE60",
    tldr: "CAP theorem says a distributed system can only guarantee two of three: Consistency, Availability, or Partition Tolerance. Since network partitions are inevitable, you're really choosing between C and A. MongoDB defaults to CP — strong consistency within a replica set — but its real strengths are flexible schema, horizontal scaling, and document-shaped data like catalogs, feeds, and user-generated content.",
    problem: `The most common MongoDB mistake: using it everywhere because it's "easy to start with," then hitting walls when you need transactions, or discovering your flexible schema became an inconsistent mess with 12 different field names for the same concept across 3 million documents.

The second mistake: misunderstanding what MongoDB is actually good at. It's not a "faster MySQL." It's a fundamentally different model optimized for different access patterns. Using MongoDB for a financial ledger (needs strict ACID across multiple entities) is fighting the tool. Using it for a product catalog (flexible attributes per category, nested specs) is playing to its strengths.

The third mistake: assuming "NoSQL means no consistency." MongoDB with a write concern of majority and readConcern of majority gives you strong consistency within a replica set — reads will never return stale data that hasn't been acknowledged by a majority of nodes. This is a very different consistency guarantee than, say, Cassandra's eventual consistency.

The concrete production consequences:
— Developers choose MongoDB for its schemaless flexibility, then write zero validation, then spend months cleaning up documents where half have "phoneNumber" and half have "phone_number" and a third have "mobile"
— Teams assume MongoDB can't do transactions, write application-level "two-phase commit" logic that's 10x more complex and still not correct
— A catalog service uses MongoDB (correct), a payment service uses MongoDB (wrong), and nobody notices until an audit
— Developers don't understand replica set read/write concerns and assume MongoDB is eventually consistent by default — it isn't, but you have to configure it correctly`,
    analogy: `The CAP triangle is like an impossible demands from a food delivery service. They promise three things:
1. Your order is always accurate (Consistency)
2. They always answer the phone (Availability)
3. They deliver even during a city-wide flood (Partition Tolerance)

In a city-wide flood (network partition), couriers can't reach some restaurants. Now the service has to choose: do they answer the phone and take orders they can't fulfill (Available but Inconsistent)? Or do they stop taking orders from flooded areas until connectivity is restored (Consistent but Unavailable)?

You can't have all three during the flood. The flood is always possible. You always have to pick.

MongoDB's choice: during a network partition, the primary replica set node stops accepting writes if it can't confirm a majority of nodes can see it. Orders stop being taken. You get consistency (no partial writes) at the cost of availability (temporary downtime). This is the CP choice.

Cassandra's choice: every node accepts writes during a partition, reconciling later. Orders are taken but might be inconsistent. That's CA — available but eventually consistent.

MONGODB SWEET SPOTS — think of document databases as filing cabinets vs spreadsheets. A spreadsheet (relational DB) forces every row into the same columns. A product catalog where phones have "battery_capacity" and furniture has "material" and clothing has "size_chart" would need 50 nullable columns in a spreadsheet. In a filing cabinet (MongoDB), each product's folder contains exactly the fields that matter to that product — nothing forced, nothing empty.`,
    deep: `CAP IN PRACTICE
────────────────
Network partitions happen. Always. In cloud environments, they happen frequently. CAP's real message is: "choose your behavior during partition" — and that choice reflects your system's priorities.

CP systems (MongoDB, HBase, Zookeeper):
During partition: refuse writes or reads that might be inconsistent.
Good for: financial data, inventory counts, anything where serving wrong data is worse than serving no data.

AP systems (Cassandra, CouchDB, DynamoDB):
During partition: serve whatever data is available, reconcile later.
Good for: social feeds, shopping carts, anything where a slightly stale answer is better than no answer.

Note: "CA" (no partition tolerance) is theoretically possible only for single-node systems — not distributed. So all real distributed systems are either CP or AP.

MONGODB'S CONSISTENCY MODEL
────────────────────────────
MongoDB provides strong consistency WITHIN A REPLICA SET by default:
- writeConcern: { w: "majority" } — write is acknowledged only when majority of nodes have persisted it
- readConcern: "majority" — reads only data that has been written to majority of nodes
- With both: you get linearizable consistency — reads always reflect the latest acknowledged write

Default writeConcern is { w: 1 } — only primary acknowledges. Fast but can lose data on primary failure.
Default readConcern is "local" — read from primary without waiting for majority acknowledgment.

For maximum consistency:
\`\`\`
db.collection.findOne({}, { readConcern: { level: "majority" } })
db.collection.insertOne({}, { writeConcern: { w: "majority", j: true } })
\`\`\`

MONGODB SWEET SPOTS
────────────────────
✅ IDEAL USE CASES:
- Product catalogs: each product type has different attributes (phones, clothing, furniture)
- User profiles: flexible, evolving fields (preferences, social links, settings)
- Content management: articles, posts, comments — nested, self-contained documents
- Real-time activity feeds: denormalized, append-only, no complex joins needed
- IoT / event data: high-volume time-series with flexible schema per device type
- Session and cache storage: short-lived, schemaless, fast reads

❌ POOR USE CASES:
- Financial transactions requiring ACID across multiple documents/collections
- Highly relational data where you need ad-hoc JOINs across many collections
- Data warehousing and complex analytical queries (use columnar stores)
- Multi-tenant SaaS with strict per-tenant schema enforcement
- Systems where the schema MUST be enforced at DB level (use PostgreSQL + constraints)

REPLICA SET TOPOLOGY
────────────────────
Primary (1): accepts all writes, can serve reads
Secondaries (2+): replicate from primary, can serve reads with appropriate readPreference
Arbiter (optional): votes in elections, holds no data

Election trigger: primary goes down or loses majority. Secondaries elect a new primary within ~10 seconds (default electionTimeoutMillis). During election: no writes accepted (CP behavior).`,
    code: `// ─── WRITE CONCERNS — choosing consistency level ────────────────────────
// // const { MongoClient } = require("mongodb")

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db("ecommerce")

// Default (w: 1) — fast, but write can be lost if primary fails before replicating
await db.collection("events").insertOne(
  { type: "page_view", userId: "U1", productId: "P123", ts: new Date() },
  { writeConcern: { w: 1 } }
)

// Majority write concern — safe for important data
// Write acknowledged only after majority of replica set has persisted it
await db.collection("orders").insertOne(
  { customerId: "C1", amountPaise: 149900, status: "PLACED" },
  { writeConcern: { w: "majority", j: true } }  // j: true = wait for journal flush
)

// ─── READ CONCERNS — choosing freshness level ────────────────────────────
// "local" (default): read from primary, may include uncommitted data
const latestProduct = await db.collection("products")
  .findOne({ _id: productId }, { readConcern: { level: "local" } })

// "majority": only read data acknowledged by majority — no dirty reads
const confirmedOrder = await db.collection("orders")
  .findOne({ _id: orderId }, { readConcern: { level: "majority" } })

// "linearizable": strongest — guarantees you see the result of all
// prior acknowledged writes. Slower — only for critical reads.
const criticalBalance = await db.collection("wallets")
  .findOne({ userId: "U1" }, { readConcern: { level: "linearizable" } })

// ─── PRODUCT CATALOG — MongoDB's natural fit ─────────────────────────────
// SQL would need 50+ nullable columns or an EAV (key-value) table
// MongoDB: each product has exactly the attributes it needs

const smartphoneDoc = {
  _id: "P001",
  name: "Redmi Note 13 Pro",
  category: "smartphone",
  brand: "Xiaomi",
  priceInPaise: 2499900,
  stock: 1250,
  specs: {
    // smartphone-specific nested doc
    batteryMah: 5100,
    cameraMP: 200,
    ramGB: 8,
    storageGB: 256,
    displayInches: 6.67,
    os: "Android 13",
    network: ["4G", "5G", "WiFi"]
  },
  tags: ["5G", "fast-charging", "AMOLED"],
  images: [
    { url: "https://cdn.example.com/p001-front.jpg", isPrimary: true },
    { url: "https://cdn.example.com/p001-back.jpg",  isPrimary: false }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

const furnitureDoc = {
  _id: "P002",
  name: "Wooden Study Table",
  category: "furniture",
  brand: "Wakefit",
  priceInPaise: 899900,
  stock: 50,
  specs: {
    // furniture-specific — completely different shape, same collection
    material: "Sheesham Wood",
    finishColor: "Honey Oak",
    widthCm: 120,
    heightCm: 75,
    depthCm: 60,
    assemblyRequired: true,
    weightKg: 32
  },
  tags: ["WFH", "study", "wooden"],
  images: [{ url: "https://cdn.example.com/p002.jpg", isPrimary: true }],
  createdAt: new Date(),
  updatedAt: new Date()
}

// Both documents in the same "products" collection — wildly different shapes
// In PostgreSQL, this would require either: a messy EAV table, JSONB column,
// or a separate table per category (dozens of JOINs)
await db.collection("products").insertMany([smartphoneDoc, furnitureDoc])

// ─── ACTIVITY FEED — high-write, denormalized ───────────────────────────
// A social feed where consistency is eventual and availability matters more
// Each event is self-contained — no JOINs needed

const feedEvent = {
  _id: new ObjectId(),
  userId: "U_ARJUN",
  actorId: "U_PRIYA",
  actorName: "Priya Sharma",            // denormalized — no JOIN to users
  actorAvatarUrl: "https://cdn.../priya.jpg",
  type: "order_delivered",
  payload: {
    orderId: "ORD_789",
    productName: "Redmi Note 13 Pro",   // denormalized — no JOIN to products
    productImage: "https://cdn.../p001-front.jpg"
  },
  ts: new Date()
}

// Fast insert — this collection is append-only, high write throughput
await db.collection("feed_events").insertOne(
  feedEvent,
  { writeConcern: { w: 1 } }  // AP choice: slightly stale feed OK, availability preferred
)

// ─── MONGODB TRANSACTIONS (ACID across documents) ────────────────────────
// For cases that DO need strict ACID — MongoDB 4.0+ supports multi-doc transactions

const session = client.startSession()
try {
  await session.withTransaction(async () => {
    // Debit wallet
    await db.collection("wallets").updateOne(
      { userId: "U1", balancePaise: { $gte: 149900 } },
      { $inc: { balancePaise: -149900 } },
      { session }
    )
    // Create order
    await db.collection("orders").insertOne(
      { customerId: "U1", amountPaise: 149900, status: "PLACED" },
      { session }
    )
    // If either fails, BOTH are rolled back
  }, {
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" }
  })
} finally {
  await session.endSession()
}

// ─── CAP BEHAVIOR DEMO — replica set election ─────────────────────────────
// During a partition or primary failure:
// MongoDB will REFUSE writes rather than risk inconsistency

try {
  await db.collection("orders").insertOne(
    { customerId: "U1", amountPaise: 49900 },
    {
      writeConcern: { w: "majority", wtimeout: 5000 },  // wait max 5s for majority
      // If majority unreachable within 5s: throws WriteConcernError
    }
  )
} catch (err) {
  if (err.code === 64) {  // WriteConcernError
    // CP behavior: write may or may not have succeeded on primary
    // Do NOT assume it failed — check before retrying
    console.error("Majority write timed out — check if order was created before retrying")
  }
}`,
    bugs: `BUG 1 — Assuming MongoDB is eventually consistent by default
─────────────────────────────────────────────────────────────
// Developer reads docs, assumes "NoSQL = eventual consistency"
// Checks balance, then charges in separate operations
const wallet = await db.collection("wallets").findOne({ userId: "U1" })
if (wallet.balancePaise >= amountPaise) {
  // WRONG: this read might be stale if another process just debited
  // Two concurrent requests: both read balance = 5000, both see "sufficient"
  // Both proceed to debit → balance goes to -5000
  await db.collection("wallets").updateOne(
    { userId: "U1" },
    { $inc: { balancePaise: -amountPaise } }
  )
}

Fix: Use an atomic findOneAndUpdate with a condition — the check and update happen atomically:
const result = await db.collection("wallets").findOneAndUpdate(
  { userId: "U1", balancePaise: { $gte: amountPaise } },
  { $inc: { balancePaise: -amountPaise } },
  { returnDocument: "after" }
)
if (!result) throw new InsufficientBalanceError()

BUG 2 — Schemaless becomes schema-chaos
─────────────────────────────────────────
// No validation, multiple developers, 6 months of data:
// Document 1: { "phoneNumber": "9876543210" }
// Document 2: { "phone": "+91-9876543210" }
// Document 3: { "mobile": "09876543210" }
// Document 4: { "contact": { "phone": "9876543210" } }
// Query: db.users.find({ phoneNumber: "9876543210" }) — misses 75% of users

Fix: Add MongoDB schema validation:
await db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "phoneNumber"],
      properties: {
        phoneNumber: { bsonType: "string", pattern: "^[6-9][0-9]{9}$" },
        email: { bsonType: "string", pattern: "@" }
      }
    }
  },
  validationAction: "error"  // reject invalid documents
})

BUG 3 — Using MongoDB for financial transactions without understanding ACID scope
──────────────────────────────────────────────────────────────────────────────────
// Payment service using MongoDB — no transactions
async function processPayment(orderId: string, userId: string, amount: number) {
  await paymentsCollection.insertOne({ orderId, userId, amount, status: "SUCCESS" })
  // Server crashes here
  await ordersCollection.updateOne({ _id: orderId }, { $set: { status: "PAID" } })
  // Order never marked PAID but payment record exists — inconsistency
}

Fix: Use MongoDB multi-document transactions (4.0+) or switch to PostgreSQL
for financial data. Transactions have a performance cost — use them only where needed.

BUG 4 — Read preference misconfiguration causing stale reads
──────────────────────────────────────────────────────────────
// Developer wants to reduce load on primary
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred"  // reads go to secondary by default
})
// Secondary replication lag can be 100ms-10s under high write load
// User adds item to cart → reads cart immediately → cart appears empty
// Because the secondary hasn't replicated the write yet

Fix: For read-your-writes consistency, either:
1. Use readPreference: "primary" for reads that must see recent writes
2. Use sessions with causalConsistency: true
const session = client.startSession({ causalConsistency: true })

BUG 5 — Not understanding WriteConcernError vs a failed write
──────────────────────────────────────────────────────────────
try {
  await collection.insertOne(order, { writeConcern: { w: "majority", wtimeout: 3000 } })
} catch (err) {
  // Developer assumes: if error thrown → write didn't happen
  await collection.insertOne(order)  // INSERTS AGAIN — creates duplicate order!
}

// Reality: WriteConcernError means the write MAY have happened on primary
// but couldn't confirm majority acknowledgment before timeout.
// The document might already exist in the primary.

Fix: Use idempotent inserts with a stable _id, or check for existence before retrying:
const stableId = \`order:\${customerId}:\${Date.now()}\`  // client-generated stable ID
try {
  await collection.insertOne({ _id: stableId, ...order }, { writeConcern: { w: "majority" } })
} catch (err) {
  if (err.code !== 11000) throw err  // 11000 = duplicate key — already inserted, OK
}`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Consider a MongoDB replica set with 3 nodes: Primary, Secondary1, Secondary2.
writeConcern: { w: "majority" } is configured.

Scenario: Primary goes down right after writing a document.
1. The write was on Primary but NOT yet replicated to either Secondary.
2. A new Primary is elected (Secondary1).
3. You try to read the document from the new Primary.

Q: What do you get? Why? What happened to the document?
   What would happen differently with { w: 1 } (default write concern)?
   Why is { w: "majority", j: true } safer than { w: "majority" }?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This inventory check and reservation has 3 MongoDB consistency bugs.

async function reserveStock(productId: string, qty: number, userId: string) {
  // Bug 1: read then write — not atomic
  const product = await db.collection("products").findOne({ _id: productId })
  if (product.stock < qty) throw new Error("Out of stock")
  
  // Bug 2: default write concern for a critical operation
  await db.collection("products").updateOne(
    { _id: productId },
    { $inc: { stock: -qty } }
  )

  // Bug 3: no transaction — if this insert fails, stock was already decremented
  await db.collection("reservations").insertOne({
    productId, qty, userId, expiresAt: new Date(Date.now() + 600_000)
  })
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design a MongoDB-based flash sale system:
1. Products collection with stock count
2. A "claim" operation that must be atomic (no overselling)
3. Use appropriate write concern for the financial sensitivity
4. Handle the race condition where 1000 users try to buy the last item simultaneously
5. Show what happens during a network partition using your write concern choice
6. Add schema validation to prevent invalid stock values (stock must be >= 0)
7. Write a test that verifies exactly 1 user gets the last item when 100 concurrent requests arrive`,
    summary: "CAP theorem forces a real choice: during network partitions, MongoDB chooses consistency over availability by design. Its true strength isn't 'no schema' — it's document-shaped data like catalogs and feeds where flexible structure and nested documents eliminate expensive JOINs and match how the data is actually used."
  },

  {
    id: 2,
    title: "Schema Design — Embed vs Reference",
    tag: "DESIGN FOR YOUR QUERIES, NOT YOUR RELATIONSHIPS",
    color: "#E67E22",
    tldr: "The most important MongoDB design decision is whether to embed related data inside a document or store it separately and reference it by ID. Embed when data is always accessed together, is bounded in size, and is owned by the parent. Reference when data is shared, grows unboundedly, or needs to be queried independently. The 16MB document limit and query access patterns — not data relationships — drive the decision.",
    problem: `Coming from a relational background, the instinct is to normalize everything: users table, orders table, order_items table — all separate, all joined at query time. In MongoDB, this instinct leads to excessive lookups ($lookup is the MongoDB equivalent of JOIN — slow, non-indexed by default, and awkward).

The opposite instinct — embed everything because "MongoDB likes embedded documents" — leads to the other failure: a 20MB user document that blows past the 16MB BSON document limit, or an "orders" array on a user document that grows to 50,000 items and makes every user lookup slow.

The real question is: "what queries will this application make?" If 99% of order reads need the customer name and email, put the customer name and email in the order document. Don't look them up separately. If the order's line items are always read with the order, embed them. If a product's reviews need to be paginated independently of the product, store them in a separate collection.

The three access patterns that should drive your decision:
1. Is this data always accessed together? → Embed
2. Is this array bounded (will it stop growing at some reasonable N)? → Embed if yes, Reference if no
3. Is this data shared across multiple parent documents? → Reference (embed creates copies that drift)

The 16MB limit is real and painful: a social media user document that embeds all posts, or an IoT device document that embeds all sensor readings, will eventually hit it and fail with a BSONError at 3am in production.`,
    analogy: `Think of how you'd physically organize paperwork for a small business.

EMBEDDING is like keeping everything in one folder per customer: the contract, invoices, notes, and contact details all in one place. When you pull the folder, you have everything immediately — no hunting. Perfect if a customer has 5-10 invoices that you always review together.

REFERENCING is like a filing system where customer details are in Drawer A, invoices are in Drawer B (each with a "Customer ID: 123" label), and payments are in Drawer C. More organized, but to get a complete picture of customer 123, you go to three drawers. Worth the extra trip if you sometimes need just the invoices, or if a customer has 5,000 invoices (that would be one massive folder).

THE 16MB LIMIT is the physical size of the folder. If you keep embedding everything, eventually you can't close the folder — it's too thick.

THE "DESIGN FOR QUERIES" PRINCIPLE: Imagine a very specific question you ask 1,000 times a day: "What's the status of order X?" If the answer requires visiting 5 drawers each time, you redesign the system. You put a copy of the most-needed info on the front of each order file — customer name, phone, delivery address — so the 1,000 daily checks are a one-drawer operation.

EXTENDED REFERENCE PATTERN: You copy needed fields to the child document. Yes, the customer name appears in both Drawer A and on every order file. That's intentional — you trade some redundancy for dramatic query speed improvement.`,
    deep: `THE EMBEDDING DECISION FRAMEWORK
──────────────────────────────────
Embed when:
- Data is always accessed together (99% of reads need both)
- The child data is "owned" by the parent (delete parent = delete child)
- The array is bounded (won't grow past a few hundred items)
- The child data is not referenced from multiple parents

Reference when:
- Child data is shared (a product referenced by many orders)
- The array is unbounded (user's post history, IoT readings, order history)
- Child data needs to be queried independently
- The child document is large and often not needed with the parent

THE 16MB BSON LIMIT
────────────────────
MongoDB documents have a hard limit of 16MB. This sounds like a lot until you embed:
- A blog post with 10,000 comments: each comment ~500 bytes = 5MB — OK
- A user with 100,000 followers (user IDs): 100,000 × 12 bytes = 1.2MB — OK
- A user with 10,000,000 followers: 120MB — BSON error. Catastrophic.
- An IoT device embedding sensor readings at 1/minute for 3 years: 1,576,800 readings × 50 bytes = ~79MB — BSON error

The solution: the BUCKET pattern (group readings into time-window documents) or REFERENCE pattern.

SCHEMA DESIGN PATTERNS
───────────────────────
1. BUCKET PATTERN (IoT, time-series)
   Instead of one document per reading, group N readings per document:
   Each bucket document holds 1 hour of readings. Reduces document count by N, enables per-bucket aggregation.

2. OUTLIER PATTERN (celebrity users)
   Normal users: embed their followers (bounded). Celebrity users (10M+ followers): store overflow in extra_followers collection with a "hasOverflow" flag.

3. COMPUTED PATTERN (denormalized aggregates)
   Pre-compute and store totals (order count, total spend) directly on the parent document. Update via $inc on every write. Avoids expensive aggregations on reads.

4. SUBSET PATTERN (top N hot items)
   Embed only the most relevant N items (e.g., top 10 reviews) in the parent document. Full data in a separate collection. Fast reads for 95% of cases.

5. EXTENDED REFERENCE PATTERN (copy needed fields)
   Copy frequently-needed fields from related documents into the child. Trade write complexity for read speed. Accept that copied data may be slightly stale.

RELATIONSHIP TYPES AND DEFAULT PATTERNS
─────────────────────────────────────────
One-to-One: embed always (address inside user, settings inside profile)
One-to-Few (< ~100): embed the array (order items, product images, post tags)
One-to-Many (100–10,000): reference with array of IDs on parent, or store parent ID on child
One-to-Squillions (unbounded): store parent ID on child (no array on parent)`,
    code: `// ─── 1-TO-FEW EMBED: Order with items ────────────────────────────────────
// Items are always read with the order, bounded (< 50 items), owned by order
// PERFECT embedding candidate

const orderDoc = {
  _id: new ObjectId(),
  customerId: "U_RAHUL",
  customerName: "Rahul Verma",          // Extended Reference: copy needed read fields
  customerPhone: "+91-9876543210",      // copied from users collection
  deliveryAddress: {                    // embed: owned by this order, never shared
    line1: "Flat 4B, Sunrise Apartments",
    locality: "Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034"
  },
  items: [                              // embed: bounded, always needed with order
    {
      productId: "P001",                // reference the source product
      productName: "Redmi Note 13 Pro", // copy for display — no JOIN needed
      productImage: "https://cdn.../p001.jpg",
      priceAtPurchasePaise: 2499900,    // SNAPSHOT price — not live price
      qty: 1,
      subtotalPaise: 2499900
    },
    {
      productId: "P045",
      productName: "USB-C Cable 2m",
      productImage: "https://cdn.../p045.jpg",
      priceAtPurchasePaise: 49900,
      qty: 2,
      subtotalPaise: 99800
    }
  ],
  totalAmountPaise: 2599700,
  gstAmountPaise: 467946,              // computed pattern: pre-computed, stored
  grandTotalPaise: 3067646,
  status: "PLACED",
  paymentMethod: "UPI",
  createdAt: new Date(),
  updatedAt: new Date()
}

// Single document fetch — no $lookup needed for the 95% case
const order = await db.collection("orders").findOne({ _id: orderId })
// order.items, order.customerName, order.deliveryAddress — all immediately available

// ─── 1-TO-MANY REFERENCE: User's orders ──────────────────────────────────
// Orders are NOT embedded in user — unbounded growth, independent access

// User document — no orders array (would grow indefinitely)
const userDoc = {
  _id: "U_RAHUL",
  email: "rahul.verma@example.com",
  name: "Rahul Verma",
  phone: "9876543210",
  orderCount: 47,                       // Computed pattern: maintained via $inc
  totalSpendPaise: 128947600,           // Computed pattern: pre-aggregated
  addresses: [                          // 1-to-few EMBED: bounded, always with user
    {
      _id: new ObjectId(),
      label: "Home",
      line1: "Flat 4B, Sunrise Apartments",
      locality: "Koramangala",
      city: "Bengaluru",
      pincode: "560034",
      isDefault: true
    }
  ],
  preferences: { currency: "INR", language: "hi", notifications: true },
  createdAt: new Date()
}

// Orders reference the user (not the other way around)
// Query: "all orders for Rahul" → index on customerId
const rahulsOrders = await db.collection("orders")
  .find({ customerId: "U_RAHUL" })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray()

// ─── BUCKET PATTERN: IoT sensor readings ──────────────────────────────────
// Device sends temperature every minute — 1,440 readings/day
// BAD: one document per reading → 1.4M documents for 1 device per year
// GOOD: bucket by hour → 8,760 documents for 1 device per year

// Each bucket holds 1 hour of readings
const sensorBucketDoc = {
  _id: new ObjectId(),
  deviceId: "DEVICE_001",
  sensorType: "temperature",
  bucketDate: new Date("2024-03-15T14:00:00Z"),  // hour bucket
  bucketHour: 14,
  count: 60,                    // current number of readings in this bucket
  minValue: 23.4,               // computed aggregate — fast to query
  maxValue: 28.9,
  sumValue: 1574.2,             // enables average calculation: sumValue / count
  readings: [                   // bounded: max 60 readings per hour bucket
    { ts: new Date("2024-03-15T14:00:00Z"), value: 24.1 },
    { ts: new Date("2024-03-15T14:01:00Z"), value: 24.3 },
    // ... up to 60 entries
  ]
}

// Add a new reading — push to current bucket, update aggregates atomically
await db.collection("sensor_readings").updateOne(
  {
    deviceId: "DEVICE_001",
    bucketDate: new Date("2024-03-15T14:00:00Z"),
    count: { $lt: 60 }          // only if bucket not full
  },
  {
    $push: { readings: { ts: new Date(), value: 25.2 } },
    $inc: { count: 1, sumValue: 25.2 },
    $min: { minValue: 25.2 },   // $min only updates if new value is smaller
    $max: { maxValue: 25.2 },   // $max only updates if new value is larger
    $setOnInsert: { deviceId: "DEVICE_001", bucketDate: new Date("2024-03-15T14:00:00Z") }
  },
  { upsert: true }              // create new bucket if this is the first reading
)

// ─── OUTLIER PATTERN: Celebrity users with millions of followers ───────────
// Normal user: followers embedded (bounded)
// Celebrity: overflow to separate collection

const normalUserDoc = {
  _id: "U_NORMAL",
  name: "Ananya Singh",
  followerCount: 342,
  followers: ["U1", "U2", "U3", "U342"],  // embedded: bounded
  hasFollowerOverflow: false
}

const celebrityUserDoc = {
  _id: "U_CELEBRITY",
  name: "Virat Kohli Fan Page",
  followerCount: 10_500_000,
  followers: ["U1", "U2", ..., "U1000"],  // first 1000 embedded for fast "do I follow" check
  hasFollowerOverflow: true                // flag: more in overflow collection
}

// Overflow documents (separate collection)
// { userId: "U_CELEBRITY", followerIds: ["U1001", "U1002", ...], page: 2 }
// Paginate through overflow collection for full follower list

// ─── SUBSET PATTERN: Top N reviews ───────────────────────────────────────
// Product shows top 5 reviews inline. Full reviews in separate collection.

const productWithSubset = {
  _id: "P001",
  name: "Redmi Note 13 Pro",
  priceInPaise: 2499900,
  averageRating: 4.3,
  reviewCount: 12847,
  // Subset: top 5 most-helpful reviews embedded for fast display
  topReviews: [
    {
      reviewId: new ObjectId(),
      reviewerName: "Sanjay K.",        // Extended Reference
      rating: 5,
      title: "Best camera in this range",
      body: "The 200MP camera is absolutely incredible for the price...",
      helpfulVotes: 892,
      createdAt: new Date("2024-01-15")
    }
    // ... 4 more top reviews
  ]
}

// Full review history: separate collection, queried with pagination
// db.collection("product_reviews").find({ productId: "P001" }).sort({ helpfulVotes: -1 })

// ─── $LOOKUP FOR WHEN YOU DO NEED A JOIN ─────────────────────────────────
// Use sparingly — $lookup is a full scan of the joined collection without proper indexing

const ordersWithCustomer = await db.collection("orders").aggregate([
  { $match: { status: "PLACED", createdAt: { $gte: new Date("2024-03-01") } } },
  {
    $lookup: {
      from: "users",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
      pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }]  // only needed fields
    }
  },
  { $unwind: "$customer" }  // convert array to object
]).toArray()`,
    bugs: `BUG 1 — Unbounded array causes document to hit 16MB limit
──────────────────────────────────────────────────────────
// Embedding ALL orders into the user document
await db.collection("users").updateOne(
  { _id: userId },
  { $push: { orders: newOrder } }  // newOrder is ~5KB
)
// After 3,200 orders: 3200 × 5000 bytes = 16MB → BSONError: document too large
// This kills the request. User's account is effectively broken.

Fix: Never embed unbounded arrays. Store orders in a separate collection
with customerId as a reference. Add an index on customerId for fast lookups.

BUG 2 — $lookup without index on the foreign collection
─────────────────────────────────────────────────────────
// Joining orders with users — no index on users._id (ObjectId)
await db.collection("orders").aggregate([
  { $match: { status: "PENDING" } },
  {
    $lookup: {
      from: "users",
      localField: "customerId",
      foreignField: "_id",  // this should be indexed — it IS: _id has a default index
      as: "customer"
    }
  }
])
// OK for _id (always indexed). But what about:
{
  $lookup: {
    from: "users",
    localField: "customerId",
    foreignField: "externalId",  // custom field — NO INDEX → full scan of users for each order
    as: "customer"
  }
}
// 10,000 orders × full scan of 1M users = 10 billion comparisons. Complete timeout.

Fix: CREATE INDEX idx_users_externalId ON users(externalId) before using in $lookup foreignField

BUG 3 — Price not snapshotted — order history shows wrong amounts
──────────────────────────────────────────────────────────────────
// Embedding a reference to the live product, not a snapshot
const orderItem = {
  productId: "P001",
  // NO priceAtPurchase — storing only the reference
  qty: 2
}
// Product price changes from ₹24,999 to ₹22,999 three months later
// Order history now shows ₹22,999 for an order that was charged ₹24,999
// Financial reports are wrong. Customer support is confused.

Fix: ALWAYS snapshot the price at purchase time:
const orderItem = {
  productId: "P001",
  productName: product.name,           // snapshot
  priceAtPurchasePaise: product.priceInPaise,  // snapshot at time of order
  currentPriceInPaise: product.priceInPaise,   // could diverge later — intentional
  qty: 2
}

BUG 4 — Embedding shared reference data that drifts
──────────────────────────────────────────────────────
// Embedding full category details in every product
const productDoc = {
  name: "Redmi Note 13",
  category: {             // embedded full category object
    id: "C01",
    name: "Smartphones",
    icon: "📱",
    commissionRate: 0.12  // 12% platform fee
  }
}
// Category commission rate changes to 15%
// Must update EVERY product in the "Smartphones" category
// 50,000 products × update = expensive migration, window of inconsistency

Fix: Reference shared data that changes. Only embed what's stable or snapshot-valid:
const productDoc = {
  name: "Redmi Note 13",
  categoryId: "C01",      // reference — single source of truth
}
// OR embed only the fields that should be snapshotted (display name at time of catalog)
// and keep mutable fields (commissionRate) as a reference

BUG 5 — Missing index on referenced field — slow joins in aggregation
──────────────────────────────────────────────────────────────────────
// Orders have customerId: "U_RAHUL" (string, not ObjectId)
// users._id is also a string "U_RAHUL"
// No index created on customerId in orders collection

// This query scans ALL orders every time:
const userOrders = await db.collection("orders")
  .find({ customerId: "U_RAHUL" })
  .toArray()

// With 10M orders: scan takes 8 seconds. Page load timeout.

Fix: Create index IMMEDIATELY when you establish a reference:
await db.collection("orders").createIndex(
  { customerId: 1, createdAt: -1 },  // compound: filter + sort in one index
  { name: "idx_orders_customer_date" }
)`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Consider this design:

const blogDoc = {
  _id: "BLOG_001",
  title: "MongoDB Schema Design",
  authorId: "U_PRIYA",
  authorName: "Priya Sharma",  // Extended Reference
  tags: ["mongodb", "nosql", "backend"],
  comments: [
    { _id: "C1", text: "Great post!", authorId: "U_RAJ", likes: 5 },
    { _id: "C2", text: "Very helpful", authorId: "U_ANKIT", likes: 12 }
  ],
  commentCount: 2,  // Computed pattern
  likeCount: 847
}

Q: Priya changes her display name from "Priya Sharma" to "Priya Sharma-Verma".
   How many documents need to be updated? Why is this a design trade-off, not a bug?
   What would you do differently if authorName appears in 5 million blog posts?
   What happens when commentCount reaches 10,000 — what design concern arises?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This schema design has 4 problems. Identify and fix each.

const productDoc = {
  _id: "P001",
  name: "Laptop",
  // Problem 1: storing live price reference instead of display price
  priceRef: { collection: "prices", id: "PRICE_001" },

  // Problem 2: embedding entire category document (mutable shared data)
  category: {
    id: "C01", name: "Electronics",
    taxRate: 0.18,   // mutable
    commissionRate: 0.08  // mutable
  },

  // Problem 3: unbounded array embedded
  reviews: [...allReviews],  // could be 50,000 reviews

  // Problem 4: no price snapshot on order items
  // (shown in OrderService)
}

async function addToOrder(productId: string, qty: number) {
  const product = await productsCollection.findOne({ _id: productId })
  await ordersCollection.insertOne({
    items: [{ productId, qty }]  // no price snapshot!
  })
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design the complete MongoDB schema for a food delivery app (Swiggy/Zomato style):
1. restaurants collection: name, location, cuisines, ratings, menu (embedded or referenced?)
2. menu_items: what to embed vs reference given 100-500 items per restaurant
3. orders: items snapshot (why?), delivery address snapshot (why?), status history
4. users: addresses (bounded embed), order_count (computed), recent_orders (subset: last 5)
5. Apply the Bucket pattern for: delivery time analytics (per restaurant per hour)
6. Apply the Outlier pattern for: a restaurant with 1M+ reviews
7. Show all indexes you'd create for the primary query patterns
8. Demonstrate what happens when a restaurant changes its menu price mid-order`,
    summary: "Schema design in MongoDB is about optimizing for your read patterns, not normalizing your data model. Embed what's always accessed together, reference what grows unboundedly or is shared, snapshot what must be consistent at a point in time, and create indexes immediately when you establish any reference field."
  },

  {
    id: 3,
    title: "MongoDB Schema Patterns",
    tag: "FIVE PATTERNS THAT SOLVE REAL PRODUCTION PROBLEMS",
    color: "#8E44AD",
    tldr: "MongoDB's schema design patterns — Bucket, Outlier, Computed, Subset, and Extended Reference — are proven solutions to specific production scaling problems. They trade write complexity and some redundancy for dramatically faster reads and smaller document sizes. Each pattern has a clear trigger condition: use it when you hit the specific pain it solves.",
    problem: `Schema design problems in MongoDB follow predictable patterns. The same five problems appear in almost every production MongoDB application that reaches scale:

1. IoT / time-series data: one document per event = 10 million documents for 1 device per year. Aggregations are slow, storage is bloated, index cardinality is extreme.

2. The celebrity problem: your social platform works perfectly until one user has 10 million followers and their document hits the 16MB limit. Everything built on the assumption of "followers is an embedded array" breaks.

3. Real-time stats: every product page shows average rating and review count. Without pre-computation, every page load triggers an aggregation over potentially millions of review documents. The database melts under load.

4. Fat documents: the product detail page embeds all 50,000 reviews. Loading a product takes 2 seconds because you're transferring reviews the user will never read in that session.

5. Cross-document data: every order needs the customer's name and address. Without copying those fields to the order, every order read requires a JOIN to the users collection.

These five problems each have a proven pattern solution. Knowing when to apply each pattern — and when NOT to — separates MongoDB experts from engineers who "just use find() and hope for the best."`,
    analogy: `Each pattern is a specialized tool — like specialized kitchen equipment that solves a specific problem much better than the general-purpose approach.

BUCKET PATTERN is like meal prep containers. Instead of storing each bite of food individually (one document per event), you group a week's worth of meals into containers by day (bucket by time window). Fewer containers, faster inventory check, easier to see weekly patterns.

OUTLIER PATTERN is like a VIP checkout lane at a grocery store. Most shoppers (normal users) go through regular checkout (embedded followers array). Celebrity shoppers (users with millions of followers) get a different lane with a special cart system (overflow collection). Don't redesign the whole store for the 0.1% — just have a different path for outliers.

COMPUTED PATTERN is like a running scoreboard vs manually counting every point. Instead of replaying the entire game to find the score (aggregating all transactions to find balance), you keep a running total and update it with each event ($inc). One glance at the scoreboard gives you the answer instantly.

SUBSET PATTERN is like a restaurant menu with "Today's Specials" highlighted on the first page. The full menu (all reviews) exists, but the first page shows the top 5 dishes (top 5 reviews) that 90% of people care about. Fast first-page load, full menu available on request.

EXTENDED REFERENCE PATTERN is like putting the delivery address on the package label, not just in the warehouse database. The label has enough information for the delivery driver without needing to call the warehouse. Yes, if the customer moves, the old packages still show the old address — but that's intentional for a past order.`,
    deep: `BUCKET PATTERN — DEEP DIVE
──────────────────────────
Problem: IoT device sends 1 reading/second = 86,400 documents/day/device.
- Index size explodes (one entry per document)
- Aggregations span millions of documents
- Storage overhead per document (headers, indexes) > actual data

Solution: Group N readings into one bucket document.
Bucket size choice: enough readings to reduce document count 10-100x, but not so many that one bucket exceeds 1MB.
- 1 minute buckets: 1,440 docs/day — too many for high-cardinality aggregations
- 1 hour buckets: 24 docs/day — sweet spot for most IoT
- 1 day buckets: 1 doc/day — good for daily summaries

Pre-compute aggregates within each bucket ($min, $max, $sum, count). Then aggregating across buckets is aggregating over much fewer documents.

OUTLIER PATTERN — DEEP DIVE
─────────────────────────────
Problem: Zipf distribution — a tiny fraction of entities have orders of magnitude more data.
In a social platform: 99.9% of users have < 5,000 followers (safe to embed). 0.1% have millions.
If you design for the outlier: every user document is over-engineered.
If you ignore outliers: the 0.1% crash your application.

Solution: Design for the common case. Add a flag + overflow collection for outliers.
The flag (hasOverflow: true) tells the application to make an additional query.
99.9% of reads: one document, no flag, done. 0.1% of reads: one extra query.
Performance cost for extra query is justified by simplicity for the 99.9% case.

COMPUTED PATTERN — DEEP DIVE
──────────────────────────────
When to use: when you're computing the same aggregation on every read, especially in high-traffic endpoints.

The trade-off: write amplification (every review write must also update the product's averageRating and reviewCount) for read speed (no aggregation at read time).

Atomicity: use $inc and $set in the same update that adds the review. If you update the review count in a separate operation, you can get inconsistent counts.

When NOT to use: when writes are extremely high frequency and reads are infrequent. The write overhead may outweigh the read benefit. Also when the computed value needs to be exactly correct at all times — the computed value is slightly denormalized and may be eventually consistent.

SUBSET PATTERN — DEEP DIVE
────────────────────────────
Key question: which N items to embed? Almost always: the most recently added or most relevant.
For reviews: top N by helpfulVotes or most recent.
For a shopping cart: last 10 viewed products.
For a feed: last 20 events.

The embedded subset should be maintained as new items are added:
- On new review insert: push to topReviews if it qualifies, pop the least relevant one off
- Keep topReviews sorted so the application always gets the right N without sorting

EXTENDED REFERENCE PATTERN — DEEP DIVE
──────────────────────────────────────
Which fields to copy? Only fields that:
1. Are frequently needed in queries alongside the child document
2. Change infrequently (or where historical accuracy is acceptable)
3. Are small in size

Customer name in order: name changes rarely, needed on every order display, small. ✅ Copy.
Customer current address in order: address at time of order must be preserved (legal). ✅ Copy.
Customer current wallet balance in order: changes constantly, must be live. ❌ Never copy.

Update strategy for copied fields: if a user changes their name, decide whether to update all historical orders (expensive migration) or accept that old orders show the old name (often acceptable — the delivery was to the old address anyway).`,
    code: `// ─── BUCKET PATTERN: Temperature sensor readings ─────────────────────────
// One bucket document per device per hour
// Each bucket stores up to 60 readings (1/minute)

// Structure
interface SensorBucket {
  _id: ObjectId
  deviceId: string
  sensorType: string
  bucketStart: Date          // hour start: 2024-03-15T14:00:00Z
  count: number              // current readings in this bucket (0-60)
  totalValue: number         // sum for computing average
  minValue: number
  maxValue: number
  readings: Array<{ ts: Date; value: number; unit: string }>
}

// Add a new reading atomically to the current bucket
// If bucket doesn't exist yet, upsert creates it
async function addSensorReading(
  deviceId: string,
  value: number,
  unit: string
): Promise<void> {
  const now = new Date()
  const bucketStart = new Date(now)
  bucketStart.setMinutes(0, 0, 0)    // floor to hour

  await db.collection("sensor_buckets").updateOne(
    {
      deviceId,
      bucketStart,
      count: { $lt: 60 }              // only if bucket has capacity
    },
    {
      $push: { readings: { ts: now, value, unit } },
      $inc: { count: 1, totalValue: value },
      $min: { minValue: value },      // update min only if smaller
      $max: { maxValue: value },      // update max only if larger
      $setOnInsert: {                 // only on bucket creation
        deviceId,
        sensorType: "temperature",
        bucketStart,
        count: 0,
        totalValue: 0,
        minValue: value,
        maxValue: value
      }
    },
    { upsert: true }
  )
}

// Query: average temperature for Device 001 on March 15 (fast aggregation over 24 docs)
const dailyStats = await db.collection("sensor_buckets").aggregate([
  {
    $match: {
      deviceId: "DEVICE_001",
      bucketStart: {
        $gte: new Date("2024-03-15T00:00:00Z"),
        $lt:  new Date("2024-03-16T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: null,
      overallMin: { $min: "$minValue" },
      overallMax: { $max: "$maxValue" },
      totalSum: { $sum: "$totalValue" },
      totalCount: { $sum: "$count" }
    }
  },
  {
    $addFields: { averageTemp: { $divide: ["$totalSum", "$totalCount"] } }
  }
]).toArray()

// ─── COMPUTED PATTERN: Product ratings ────────────────────────────────────
// Pre-compute averageRating and reviewCount on the product document
// Update atomically when a review is added

async function addProductReview(
  productId: string,
  reviewData: { userId: string; rating: number; title: string; body: string }
): Promise<void> {
  // Insert the full review into reviews collection
  const review = await db.collection("reviews").insertOne({
    productId,
    ...reviewData,
    helpfulVotes: 0,
    createdAt: new Date()
  })

  // Update the product's computed stats atomically
  // This is not in a transaction: review count could be slightly off
  // by 1 in rare concurrent cases — acceptable trade-off for products
  await db.collection("products").updateOne(
    { _id: productId },
    {
      $inc: { reviewCount: 1 },
      // Update runningRatingSum for average calculation
      $inc: { ratingSum: reviewData.rating },
      // Also maintain the top reviews subset (Subset Pattern combined)
      $push: {
        topReviews: {
          $each: [{
            reviewId: review.insertedId,
            reviewerName: reviewData.userId,  // Extended Reference
            rating: reviewData.rating,
            title: reviewData.title,
            body: reviewData.body.slice(0, 200),  // truncate for subset
            helpfulVotes: 0,
            createdAt: new Date()
          }],
          $sort: { helpfulVotes: -1 },  // sort by most helpful
          $slice: 5                     // keep only top 5
        }
      }
    }
  )

  // Recompute averageRating from the updated sums (accurate, no float drift)
  const product = await db.collection("products").findOne(
    { _id: productId },
    { projection: { ratingSum: 1, reviewCount: 1 } }
  )
  if (product && product.reviewCount > 0) {
    const averageRating = product.ratingSum / product.reviewCount
    await db.collection("products").updateOne(
      { _id: productId },
      { $set: { averageRating: Math.round(averageRating * 10) / 10 } }
    )
  }
}

// ─── OUTLIER PATTERN: Users with massive follower counts ──────────────────
const MAX_EMBEDDED_FOLLOWERS = 1000  // embed first 1000, overflow the rest

async function addFollower(userId: string, followerId: string): Promise<void> {
  const user = await db.collection("users").findOne(
    { _id: userId },
    { projection: { followerCount: 1, hasFollowerOverflow: 1 } }
  )
  if (!user) throw new NotFoundError("User", userId)

  if (!user.hasFollowerOverflow && (user.followerCount || 0) < MAX_EMBEDDED_FOLLOWERS) {
    // Normal case: embed the follower
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $addToSet: { followers: followerId },
        $inc: { followerCount: 1 }
      }
    )
  } else {
    // Outlier path: use overflow collection
    if (!user.hasFollowerOverflow) {
      // First overflow — set the flag
      await db.collection("users").updateOne(
        { _id: userId },
        { $set: { hasFollowerOverflow: true }, $inc: { followerCount: 1 } }
      )
    } else {
      await db.collection("users").updateOne(
        { _id: userId },
        { $inc: { followerCount: 1 } }
      )
    }
    // Store in overflow collection, grouped in pages of 1000
    await db.collection("follower_overflow").updateOne(
      { userId, pageCount: { $lt: 1000 } },
      {
        $push: { followerIds: followerId },
        $inc: { pageCount: 1 },
        $setOnInsert: { userId, createdAt: new Date() }
      },
      { upsert: true }
    )
  }
}

// ─── SUBSET PATTERN: Product with top reviews ─────────────────────────────
// Product document has only top 5 reviews embedded
// Full review history in separate collection

// Get product with top reviews — NO extra query for 95% of page loads
const product = await db.collection("products").findOne({ _id: "P001" })
// product.topReviews = [{...}, {...}, {...}, {...}, {...}]  — ready immediately

// "See all reviews" → paginate the full collection
const allReviews = await db.collection("reviews")
  .find({ productId: "P001" })
  .sort({ helpfulVotes: -1 })
  .skip((page - 1) * 20)
  .limit(20)
  .toArray()

// ─── EXTENDED REFERENCE PATTERN: Order with customer fields ───────────────
// Copy only the fields needed for display + legally required at order time

async function createOrderWithExtendedRef(
  userId: string,
  items: OrderItemInput[],
  addressId: string
): Promise<Order> {
  // Fetch source documents
  const user = await db.collection("users").findOne({ _id: userId })
  const address = user.addresses.find((a: any) => a._id.equals(new ObjectId(addressId)))

  // Build order with copied fields — no JOIN needed at read time
  const order = {
    _id: new ObjectId(),
    customerId: userId,
    // Extended Reference: copy needed display fields
    customerName: user.name,                 // snapshot
    customerEmail: user.email,               // snapshot
    customerPhone: user.phone,               // snapshot
    // Delivery address: full snapshot (legal requirement + address may change later)
    deliveryAddress: {
      ...address,
      // Record current address — even if user moves, this order's address is preserved
    },
    items: await Promise.all(items.map(async (item) => {
      const product = await db.collection("products").findOne({ _id: item.productId })
      return {
        productId: item.productId,
        productName: product.name,           // Extended Reference
        productImage: product.images[0]?.url,
        priceAtPurchasePaise: product.priceInPaise,  // SNAPSHOT — critical!
        qty: item.qty,
        subtotalPaise: product.priceInPaise * item.qty
      }
    })),
    status: "PLACED",
    createdAt: new Date()
  }

  await db.collection("orders").insertOne(order)
  return order
}`,
    bugs: `BUG 1 — Bucket pattern with wrong bucket key — produces unbounded buckets
──────────────────────────────────────────────────────────────────────────
// Bucketing by day but not capping — one document per day could have 86,400 readings
await db.collection("sensor_data").updateOne(
  { deviceId, date: today },  // no count cap in the query!
  { $push: { readings: newReading }, $inc: { count: 1 } },
  { upsert: true }
)
// Day bucket at 1 reading/second: 86,400 readings × 50 bytes = 4.3MB per day
// After 4 days of data: bucket exceeds 16MB → BSONError
// ALL data for that device for those days is lost/corrupted

Fix: Always cap bucket size and create a new bucket when full:
{ deviceId, date: today, count: { $lt: MAX_BUCKET_SIZE } }  // MAX_BUCKET_SIZE = 1000
// When bucket is full, upsert creates a new one with a sequence number:
{ deviceId, date: today, seq: bucketSeq, count: { $lt: MAX_BUCKET_SIZE } }

BUG 2 — Computed pattern not updated atomically — count drifts
───────────────────────────────────────────────────────────────
async function addReview(productId, reviewData) {
  await reviewsCollection.insertOne({ productId, ...reviewData })
  // Non-atomic: if this line fails or crashes, reviewCount is wrong
  await productsCollection.updateOne({ _id: productId }, { $inc: { reviewCount: 1 } })
}

// After 1000 reviews: 12 crashes during the update step
// reviewCount shows 988, but actual reviews = 1000
// Star rating display shows 988 reviews — users lose trust

Fix: Use a background job that periodically reconciles computed fields:
const actual = await reviewsCollection.countDocuments({ productId })
await productsCollection.updateOne({ _id: productId }, { $set: { reviewCount: actual } })
// Run nightly or on discrepancy detection

BUG 3 — Extended Reference not snapshotting mutable fields
────────────────────────────────────────────────────────────
// Copying a field that changes frequently
const order = {
  customerId: userId,
  customerName: user.name,
  customerCurrentBalance: user.walletBalance  // WRONG — mutable financial data
}
// Order shows customer had ₹50,000 balance "at time of order"
// Displayed on invoice — completely misleading and wrong
// Balance changes with every transaction

Fix: Only snapshot fields that should be historically preserved:
const order = {
  customerId: userId,
  customerName: user.name,           // OK: name rarely changes, snapshot is useful
  deliveryAddress: { ...address },   // OK: where we delivered it, must be preserved
  // NEVER: wallet balance, loyalty points, live inventory — keep as references
}

BUG 4 — Subset pattern not maintaining sort order on insert
────────────────────────────────────────────────────────────
// When adding a new review, push to topReviews without maintaining sort
await productsCollection.updateOne(
  { _id: productId },
  { $push: { topReviews: newReview } }  // No $sort, no $slice!
)
// topReviews now grows unboundedly — no slice to cap at 5
// After 50,000 reviews: topReviews array has 50,000 items embedded
// The entire point of the Subset pattern is defeated

Fix: Always use $sort and $slice in $push when maintaining a subset:
await productsCollection.updateOne(
  { _id: productId },
  {
    $push: {
      topReviews: {
        $each: [newReview],
        $sort: { helpfulVotes: -1, createdAt: -1 },
        $slice: 5          // keep only top 5 — enforced on every write
      }
    }
  }
)

BUG 5 — Outlier flag not checked — queries broken for celebrity users
──────────────────────────────────────────────────────────────────────
// Check if currentUser follows targetUser
async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const target = await usersCollection.findOne({ _id: targetUserId })
  return target.followers?.includes(currentUserId)  // only checks embedded array!
}
// Celebrity user has hasFollowerOverflow: true
// currentUserId is in the overflow collection, NOT in target.followers
// Function returns false — "you don't follow them" — even though you do

Fix: Check the flag and search overflow collection when needed:
async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const target = await usersCollection.findOne({ _id: targetUserId })
  if (target.followers?.includes(currentUserId)) return true
  if (!target.hasFollowerOverflow) return false
  // Check overflow collection
  const overflow = await followerOverflowCollection.findOne({
    userId: targetUserId,
    followerIds: currentUserId
  })
  return overflow !== null
}`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
A product document has the Computed Pattern applied:
{
  _id: "P001",
  reviewCount: 3,
  ratingSum: 12,  // sum of all ratings (3 reviews × avg 4 = 12)
  averageRating: 4.0,
  topReviews: [
    { reviewId: "R1", rating: 5, helpfulVotes: 100 },
    { reviewId: "R2", rating: 4, helpfulVotes: 80 },
    { reviewId: "R3", rating: 3, helpfulVotes: 60 }
  ]
}

A new review is added: { reviewId: "R4", rating: 1, helpfulVotes: 0 }

After the update with $push + $sort: helpfulVotes DESC + $slice: 3:
Q: What is the new averageRating? Show the calculation.
   What does topReviews look like after the update?
   Is R4 (rating: 1, helpfulVotes: 0) in topReviews? Why or why not?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This IoT data ingestion has 3 pattern implementation bugs.

async function ingestReading(deviceId: string, temp: number) {
  const today = new Date().toDateString()

  // Bug 1: bucket key doesn't limit bucket size
  await db.collection("readings").updateOne(
    { deviceId, date: today },
    {
      $push: { data: { ts: new Date(), value: temp } },
      $inc: { count: 1 }
      // Bug 2: no pre-aggregated stats updated
    },
    { upsert: true }
  )
}

async function addFollower(userId: string, newFollowerId: string) {
  // Bug 3: no overflow check — just push forever
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $push: { followers: newFollowerId },
      $inc: { followerCount: 1 }
    }
  )
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete product review system using ALL FIVE patterns:
1. Computed: maintain reviewCount, averageRating, ratingDistribution on product doc
2. Subset: top 5 most-helpful reviews embedded in product doc
3. Bucket: no — this doesn't apply here. Identify why reviews don't fit the Bucket pattern.
4. Outlier: handle products with > 10,000 reviews (rare but possible viral products)
5. Extended Reference: each review embeds reviewerName + reviewerAvatarUrl (from users collection)
6. Write addReview(productId, userId, rating, title, body) that updates ALL patterns atomically
7. Write getProduct(productId) that returns product with topReviews — no extra query
8. Write getProductReviews(productId, page, sortBy) that paginates the full reviews collection`,
    summary: "The five MongoDB schema patterns — Bucket, Outlier, Computed, Subset, and Extended Reference — each solve a specific scaling problem. Know the trigger for each: unbounded time-series → Bucket, power-law distributions → Outlier, frequent aggregation → Computed, fat documents → Subset, expensive JOINs → Extended Reference."
  },

  {
    id: 4,
    title: "CRUD Operators & Atomic Updates",
    tag: "WRITE OPERATIONS THAT DON'T LIE TO YOU",
    color: "#C0392B",
    tldr: "MongoDB's update operators ($set, $inc, $push, $pull, $addToSet, $unset) modify documents atomically at the field level — no read-modify-write cycles, no race conditions. findOneAndUpdate returns the document before or after the update in a single atomic operation. Understanding when operations are atomic and when they're not is the difference between correct and subtly broken code.",
    problem: `The most dangerous MongoDB pattern is the read-modify-write anti-pattern: read a document, modify it in your application code, write the whole document back. This creates a race condition window where two concurrent processes read the same value, both compute an update, and both write back — with the second write silently overwriting the first.

For a counter: Process A reads count=5, Process B reads count=5, Process A writes count=6, Process B writes count=6. The count should be 7. It's 6. Silent data loss in production.

For a stock counter: Process A reads stock=1, Process B reads stock=1, Process A reserves the last item (stock → 0), Process B also reserves the last item (stock → -1). You've oversold. Customer relations disaster.

MongoDB's update operators solve this by moving the computation into the database operation itself. \`$inc\` doesn't read the current value — it atomically adds to it at the database level. Two concurrent \`$inc: { stock: -1 }\` operations on stock=2 correctly result in stock=0. No race condition.

The second common mistake: not understanding what \`findOneAndUpdate\` guarantees. It finds and updates a document atomically — the query and the update happen as one operation, without another process being able to modify the document between the find and the update. This is the correct tool for "check balance then debit" operations.

The third mistake: building batch operations with individual update calls in a loop. 1,000 individual updateOne calls = 1,000 round trips to the database = 10+ seconds. bulkWrite sends all 1,000 operations in one round trip = 100ms. A 100x performance difference hiding behind a for loop.`,
    analogy: `Think of MongoDB update operators as atomic banking transactions.

READ-MODIFY-WRITE (wrong way): You call your bank to check your balance (₹10,000). You hear the number. You call back and say "set my balance to ₹9,000" (making a ₹1,000 purchase). Meanwhile, your spouse also checked the balance (₹10,000) and called to set it to ₹9,500 (₹500 purchase). Two calls arrive at the bank simultaneously — the second one overwrites the first. One purchase is silently lost.

$INC (right way): You call the bank and say "subtract ₹1,000 from my balance." Your spouse calls and says "subtract ₹500." The bank processes both atomically. Balance correctly goes from ₹10,000 to ₹9,500 to ₹9,000. No race condition because you never named an absolute value.

FINDONEANDUPDATE is like a bank employee who can both check and modify your account in one action: "If balance >= ₹1,000, debit ₹1,000 and tell me the new balance." The check and the debit are one indivisible operation — no other transaction can happen between them.

$PUSH vs $ADDTOSET: $push is like adding a number to a list, even if it already exists (a phone bill can have duplicate line items). $addToSet is like joining a club — you can only be a member once. Trying to join again is silently ignored.

BULKWRITE is like dropping off a batch of transactions at the bank at once, instead of coming in individually for each one. One trip for 1,000 transactions instead of 1,000 trips.`,
    deep: `ATOMICITY GUARANTEES IN MONGODB
────────────────────────────────
Single-document operations are ALWAYS atomic in MongoDB:
- updateOne, updateMany, findOneAndUpdate: atomic on each document
- insertOne, deleteOne: atomic
- The entire update of ONE document — even with multiple $set fields — is one atomic operation

What is NOT atomic:
- Multiple documents in updateMany (each document update is atomic, but the overall operation is not)
- Multiple separate operations (even in the same session, without a transaction)

For multi-document atomicity: use sessions + transactions (MongoDB 4.0+)

THE POSITIONAL OPERATOR $
──────────────────────────
\`$\` refers to the first array element matched by the query condition.
\`\`\`javascript
// Update the price of item with productId "P001" in this specific order
await db.collection("orders").updateOne(
  { _id: orderId, "items.productId": "P001" },  // match condition identifies the element
  { $set: { "items.$.priceAtPurchasePaise": 1999900 } }  // $ refers to that matched element
)
\`\`\`
CRITICAL: $ only works for the first matched array element. Use $[<identifier>] (arrayFilters) for multiple.

$ELEMMATCH — matching array elements with multiple conditions
\`\`\`javascript
// WRONG — matches documents where items has qty > 2 AND productId = "P001", but not necessarily the SAME item
{ items: { qty: { $gt: 2 }, productId: "P001" } }

// CORRECT — both conditions must apply to the SAME array element
{ items: { $elemMatch: { qty: { $gt: 2 }, productId: "P001" } } }
\`\`\`

UPSERT BEHAVIOR
────────────────
upsert: true = update if exists, insert if not.
- If document found: apply the update operators normally.
- If NOT found: $setOnInsert operators run, $inc/$push still run (on the newly created doc).
- The _id is generated automatically if not specified.
- CRITICAL: upsert is NOT idempotent for $push — if the document doesn't exist and is created, the $push runs. If it already exists, $push runs again. Two concurrent upserts on the same new document can create duplicates.

FINDONEANDUPDATE RETURN VALUE
──────────────────────────────
returnDocument: "before" (default): returns the document AS IT WAS before the update.
returnDocument: "after": returns the document AS IT IS after the update.
If no document matched: returns null.

This distinction matters:
- "before" to check the pre-update state (was stock > 0 before I decremented it?)
- "after" to get the final state (what is the balance after I credited ₹500?)

BULKWRITE ORDERED VS UNORDERED
────────────────────────────────
ordered: true (default): stop on first error. Slower (sequential).
ordered: false: continue on error. Faster (parallel). Returns all errors at end.
Use ordered: false for independent batch operations where one failure shouldn't stop others.`,
    code: `// ─── $SET, $INC, $UNSET — field-level updates ───────────────────────────
// $set: set field to exact value (replaces current value)
// $inc: atomically increment/decrement by N (no read needed)
// $unset: remove a field from the document

// Update product price and mark as on-sale
await db.collection("products").updateOne(
  { _id: "P001" },
  {
    $set: {
      priceInPaise: 1999900,       // ₹19,999
      onSale: true,
      saleEndsAt: new Date("2024-03-20"),
      updatedAt: new Date()
    },
    $unset: { originalPriceInPaise: "" }  // remove field (value ignored — use "")
  }
)

// Atomic stock decrement — safe for concurrent requests
// Only decrements if stock > 0 (condition in the query)
const result = await db.collection("products").findOneAndUpdate(
  { _id: "P001", stock: { $gt: 0 } },   // condition: must have stock
  {
    $inc: { stock: -1 },                 // atomic: no race condition
    $set: { updatedAt: new Date() }
  },
  { returnDocument: "after" }
)
if (!result) throw new ConflictError("Product out of stock")
// result.stock is the NEW stock value after decrement

// ─── $PUSH, $PULL, $ADDTOSET — array updates ─────────────────────────────
// $push: append to array (allows duplicates)
// $addToSet: append only if not already present (no duplicates)
// $pull: remove all elements matching a condition

// Add a tag to a product (no duplicates)
await db.collection("products").updateOne(
  { _id: "P001" },
  { $addToSet: { tags: "bestseller" } }
)
// Calling this twice: idempotent — "bestseller" appears only once

// Remove a specific tag
await db.collection("products").updateOne(
  { _id: "P001" },
  { $pull: { tags: "out-of-stock" } }
)

// Add a new address to user (embed array — bounded)
await db.collection("users").updateOne(
  { _id: "U_RAHUL" },
  {
    $push: {
      addresses: {
        _id: new ObjectId(),
        label: "Office",
        line1: "Tower B, Prestige Tech Park",
        locality: "Outer Ring Road",
        city: "Bengaluru",
        pincode: "560103",
        isDefault: false
      }
    },
    $inc: { addressCount: 1 }
  }
)

// Remove address by its _id (pull with condition)
await db.collection("users").updateOne(
  { _id: "U_RAHUL" },
  {
    $pull: { addresses: { _id: new ObjectId(addressId) } },
    $inc: { addressCount: -1 }
  }
)

// ─── POSITIONAL OPERATOR $ — updating array elements ─────────────────────
// Update a specific item inside the orders.items array

// Scenario: update the qty of product P001 in order ORD_001
await db.collection("orders").updateOne(
  {
    _id: "ORD_001",
    "items.productId": "P001"      // match the right element
  },
  {
    $set: {
      "items.$.qty": 3,            // $ refers to the matched element
      "items.$.subtotalPaise": 3 * 2499900
    }
  }
)

// $[identifier] with arrayFilters: update ALL matching elements
// Mark all items from seller S1 in the order as "dispatched"
await db.collection("orders").updateOne(
  { _id: "ORD_001" },
  {
    $set: { "items.$[item].dispatchedBySeller": true }
  },
  {
    arrayFilters: [{ "item.sellerId": "S1" }]  // filter: which elements to update
  }
)

// ─── $ELEMMATCH — multi-condition array element query ────────────────────
// Find orders where a specific item has both qty > 2 AND price < 10000 paise
const orders = await db.collection("orders").find({
  items: {
    $elemMatch: {
      productId: "P001",
      qty: { $gt: 2 },
      priceAtPurchasePaise: { $lt: 1000000 }
      // All THREE conditions must apply to the SAME item in the array
    }
  }
}).toArray()

// ─── FINDONEANDUPDATE — atomic check-then-modify ─────────────────────────
// Wallet debit: check balance AND debit atomically
async function debitWallet(userId: string, amountPaise: number): Promise<Wallet> {
  const wallet = await db.collection("wallets").findOneAndUpdate(
    {
      userId,
      balancePaise: { $gte: amountPaise },  // condition: must have sufficient balance
      isLocked: { $ne: true }               // condition: account not frozen
    },
    {
      $inc: { balancePaise: -amountPaise },
      $push: {
        transactions: {
          $each: [{
            type: "DEBIT",
            amountPaise,
            ts: new Date(),
            transactionId: new ObjectId().toString()
          }],
          $sort: { ts: -1 },
          $slice: 50              // keep only last 50 transactions embedded (Subset)
        }
      },
      $set: { updatedAt: new Date() }
    },
    {
      returnDocument: "after",   // return the updated wallet
      upsert: false              // don't create if not found
    }
  )

  if (!wallet) throw new InsufficientBalanceError(
    \`Cannot debit ₹\${(amountPaise / 100).toFixed(2)} — insufficient balance or account locked\`
  )
  return wallet
}

// ─── UPSERT — insert-or-update pattern ────────────────────────────────────
// Use case: "ensure a shopping cart exists, then add an item"

async function addToCart(userId: string, productId: string, qty: number): Promise<void> {
  await db.collection("carts").updateOne(
    { userId },                    // find by userId
    {
      $setOnInsert: {             // only on INSERT (new cart)
        userId,
        createdAt: new Date()
      },
      $set: { updatedAt: new Date() },
      $addToSet: {
        // $addToSet doesn't work for nested object comparison reliably
        // use this pattern instead with $pull + $push
      }
    },
    { upsert: true }
  )

  // More reliable: $pull existing entry then $push new one
  await db.collection("carts").updateOne(
    { userId },
    {
      $pull: { items: { productId } },   // remove existing entry for this product
    }
  )
  await db.collection("carts").updateOne(
    { userId },
    {
      $push: { items: { productId, qty, addedAt: new Date() } },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  )
}

// ─── BULKWRITE — batch operations ────────────────────────────────────────
// Process 1,000 price updates in ONE round trip instead of 1,000

async function bulkUpdatePrices(updates: Array<{ productId: string; newPricePaise: number }>): Promise<void> {
  const operations = updates.map(({ productId, newPricePaise }) => ({
    updateOne: {
      filter: { _id: productId },
      update: {
        $set: {
          priceInPaise: newPricePaise,
          updatedAt: new Date()
        },
        $inc: { priceUpdateCount: 1 }
      }
    }
  }))

  const result = await db.collection("products").bulkWrite(
    operations,
    { ordered: false }  // continue even if some updates fail
  )

  console.log({
    matched:  result.matchedCount,
    modified: result.modifiedCount,
    errors:   result.getWriteErrors().length
  })
}

// Mixed bulk operations: inserts + updates + deletes in one call
const mixedBulk = await db.collection("inventory").bulkWrite([
  { insertOne: { document: { sku: "NEW_SKU", stock: 100 } } },
  { updateOne: { filter: { sku: "OLD_SKU" }, update: { $inc: { stock: -5 } } } },
  { deleteOne: { filter: { sku: "DISCONTINUED", stock: 0 } } },
  {
    replaceOne: {
      filter: { sku: "REFRESH_SKU" },
      replacement: { sku: "REFRESH_SKU", stock: 200, updatedAt: new Date() },
      upsert: true
    }
  }
], { ordered: false })`,
    bugs: `BUG 1 — Read-modify-write race condition on counter
────────────────────────────────────────────────────
// WRONG: read-modify-write pattern
async function incrementViewCount(productId: string) {
  const product = await db.collection("products").findOne({ _id: productId })
  await db.collection("products").updateOne(
    { _id: productId },
    { $set: { viewCount: product.viewCount + 1 } }  // read + modify = race condition
  )
}
// Concurrent requests: both read viewCount=100, both write 101.
// 1000 concurrent page loads: view count increments by maybe 300, not 1000.

Fix: Never do arithmetic on a value you read — do it atomically:
await db.collection("products").updateOne(
  { _id: productId },
  { $inc: { viewCount: 1 } }  // atomic: no read needed
)

BUG 2 — $elemMatch vs non-$elemMatch for multi-condition array query
─────────────────────────────────────────────────────────────────────
// Finding orders where the SAME item has qty > 2 AND price < 100000
// WRONG: conditions can match DIFFERENT items in the array
const orders = await db.collection("orders").find({
  "items.qty": { $gt: 2 },
  "items.priceAtPurchasePaise": { $lt: 100000 }
}).toArray()
// This matches: order has item A with qty=3 AND item B with price=50000
// Even though no single item satisfies both conditions

// CORRECT:
const orders = await db.collection("orders").find({
  items: {
    $elemMatch: {
      qty: { $gt: 2 },
      priceAtPurchasePaise: { $lt: 100000 }
    }
  }
}).toArray()

BUG 3 — Positional operator $ with no matching array element
──────────────────────────────────────────────────────────────
// Updating an item in the order — query doesn't include the array field condition
await db.collection("orders").updateOne(
  { _id: orderId },                // query: matches the ORDER but not a specific ITEM
  { $set: { "items.$.qty": 5 } }  // ERROR: $ has no context — which element?
)
// MongoServerError: The positional operator did not find the match needed

Fix: Query MUST include the array field condition for $ to resolve:
await db.collection("orders").updateOne(
  { _id: orderId, "items.productId": "P001" },  // $ resolves to the matched item
  { $set: { "items.$.qty": 5 } }
)

BUG 4 — findOneAndUpdate returning "before" when "after" is needed
────────────────────────────────────────────────────────────────────
// Showing user their new wallet balance after a credit
const wallet = await db.collection("wallets").findOneAndUpdate(
  { userId },
  { $inc: { balancePaise: 50000 } }
  // returnDocument defaults to "before"!
)
// wallet.balancePaise is the OLD balance (before the credit)
// User sees: "Your balance is ₹500" — but they just added ₹500, so it should show ₹1,000
// They try to make a purchase, it succeeds (real balance is ₹1,000), but UI showed wrong amount

Fix: Always specify returnDocument explicitly:
const wallet = await db.collection("wallets").findOneAndUpdate(
  { userId },
  { $inc: { balancePaise: 50000 } },
  { returnDocument: "after" }  // explicit — get the new balance
)

BUG 5 — bulkWrite ordered:true with a failing operation blocks the rest
───────────────────────────────────────────────────────────────────────
// Processing price updates for 10,000 products — ordered: true (default)
const result = await db.collection("products").bulkWrite(
  priceUpdates.map(u => ({
    updateOne: { filter: { _id: u.productId }, update: { $set: { price: u.price } } }
  }))
  // ordered: true — default!
)
// Product #47 has an invalid update (price is a string, schema validation fails)
// Products #48 through #10,000 are NEVER updated — silently skipped
// You get a partial update with no clear indication of what wasn't processed

Fix: Use ordered: false for independent batch operations:
const result = await db.collection("products").bulkWrite(operations, { ordered: false })
// All valid updates proceed; errors collected and reported
// Check: result.getWriteErrors() for failed operations
if (result.hasWriteErrors()) {
  logger.error({ errors: result.getWriteErrors() }, \`\${result.getWriteErrors().length} updates failed\`)
}`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Starting state:
{ _id: "W1", userId: "U1", balancePaise: 100000, transactions: [] }

Operation 1: concurrent requests A and B both run simultaneously:
db.wallets.findOneAndUpdate(
  { _id: "W1", balancePaise: { $gte: 60000 } },
  { $inc: { balancePaise: -60000 } },
  { returnDocument: "after" }
)

Q: Both A and B try to debit ₹600. Only ₹1000 total is available.
   What does request A see? What does request B see?
   What is the final balancePaise in the document?
   Would the answer change if you used read-modify-write instead of findOneAndUpdate?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This cart service has 4 update operator bugs. Identify and fix each.

async function updateCart(userId: string, productId: string, qty: number) {
  // Bug 1: read-modify-write
  const cart = await db.collection("carts").findOne({ userId })
  const items = cart?.items || []
  const existingIdx = items.findIndex(i => i.productId === productId)
  if (existingIdx >= 0) items[existingIdx].qty = qty
  else items.push({ productId, qty })
  await db.collection("carts").updateOne({ userId }, { $set: { items } })

  // Bug 2: $ positional without array match in query
  await db.collection("orders").updateOne(
    { _id: "ORD_001" },
    { $set: { "items.$.status": "UPDATED" } }
  )

  // Bug 3: $push instead of $addToSet for unique tags
  await db.collection("products").updateOne(
    { _id: productId },
    { $push: { recentViewers: userId } }  // should be unique set
  )

  // Bug 4: findOneAndUpdate without returnDocument specification — ambiguous
  const updated = await db.collection("carts").findOneAndUpdate(
    { userId },
    { $set: { updatedAt: new Date() } }
  )
  return updated.totalItems  // is this before or after update?
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete atomic inventory reservation system:
1. Products have: stock (available), reserved (held, not purchased), sold
2. reserveStock(productId, qty, userId): atomically move qty from stock → reserved
   - Must fail atomically if insufficient stock
   - Returns the updated product with new stock values
3. confirmPurchase(productId, qty, userId): atomically move qty from reserved → sold
4. releaseReservation(productId, qty, userId): move qty from reserved back to stock
5. Use bulkWrite to handle flash sale: simultaneously reserve 1 unit each for 1000 users
6. Handle the case where 1000 users try to reserve the last 100 units — exactly 100 should succeed
7. Use arrayFilters to update the status of all items from a specific seller in an order
8. Write a test that verifies no overselling occurs with 100 concurrent reservation requests`,
    summary: "MongoDB's update operators ($set, $inc, $push, $pull, $addToSet) perform atomic field-level modifications that eliminate read-modify-write race conditions. findOneAndUpdate atomically checks a condition and applies an update in one indivisible operation. bulkWrite reduces N round trips to 1. These tools are the difference between correct concurrent data operations and silent data corruption."
  }
];

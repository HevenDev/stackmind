const concepts = [
  {
    id: 1,
    title: "ORM Impedance Mismatch",
    tag: "WHY ORMS EXIST AND WHERE THEY BETRAY YOU",
    color: "#1D4ED8",
    tldr: `ORMs (Object-Relational Mappers) bridge the gap between object-oriented code (classes, objects, graphs) and relational databases (tables, rows, sets). The impedance mismatch is the fundamental tension between these two worlds — ORMs paper over it, but understanding where the abstraction leaks tells you exactly when to reach for raw SQL and when the ORM is actually saving you hours of work.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My ORM query is 100× slower than the equivalent SQL I wrote manually"
  → The ORM generated a horrific N+1 query pattern or a cartesian product JOIN.
  → ORMs optimize for developer ergonomics, not always for query efficiency.
  → Understanding mismatch helps you know when to use orm.raw() or a direct query.

"I can't express this query in my ORM — it needs a window function / lateral join / CTE"
  → ORMs have limited expressiveness. SQL has decades of features; ORMs lag behind.
  → Drizzle: use the sql\`\` tagged template for raw SQL fragments within typed queries.
  → Prisma: use prisma.\$queryRaw for complex cases.

"I updated an object property but the database didn't update"
  → Object ≠ row. Mutating an in-memory object doesn't persist. Must call .save() / .update().
  → Active Record pattern (Mongoose, Sequelize model instances) can obscure when persistence happens.
  → Drizzle/Prisma are Data Mapper pattern: no magic "track my changes" — explicit writes only.

"My ORM loaded the entire table into memory to find 3 rows"
  → ORM called .findMany() or equivalent with no WHERE/LIMIT, then filtered in JS.
  → "Comfortable" ORM APIs encourage loading all data: customers.filter(c => c.active).
  → Always push predicates to the database. The ORM should generate WHERE clauses, not JS filter().

"Why does Drizzle feel different from Prisma? Both are ORMs but the API is totally different."
  → Drizzle: SQL-like, query builder, TypeScript-first, no runtime codegen, "close to the metal."
  → Prisma: abstraction-heavy, auto-generated client, schema-first (.prisma files), more "magic."
  → Different philosophies: Drizzle lets you see (and control) the SQL. Prisma hides it more.
    `,
    analogy: `
THE GPS VS PAPER MAP ANALOGY:
------------------------------
SQL = Paper map. You understand every road, every route, every shortcut. Full control.
  Steep learning curve. Easy to plan the perfect route. Can't go wrong with directions.

ORM = GPS navigation. You say "take me to the nearest coffee shop." GPS figures out the route.
  Fast for common trips. Occasionally takes bizarre detours (N+1 queries, unnecessary JOINs).
  Sometimes routes you through a 30km detour because it doesn't know your local shortcut.

THE IMPEDANCE MISMATCH = MAPS DRAWN ON DIFFERENT PROJECTIONS:
  Object world: graphs (objects reference other objects in any direction), identity via reference,
    behavior mixed with data (methods), no concept of "rows" or "sets."
  Relational world: tables (structured rows), identity via keys, data only (no behavior),
    set operations are first-class, relationships expressed via foreign keys.
  
  Translation problems that ORMs must solve:
  1. IDENTITY: same row fetched twice in SQL → two separate objects? Or same object?
     ORM "identity map" pattern: tries to ensure same DB row = same in-memory object.
     Bug: stale data — update via raw SQL, ORM's in-memory object doesn't know.
  
  2. ASSOCIATIONS: SQL JOIN produces flat rows. ORM must re-nest them into object graph.
     user: {name:'Priya', orders: [{id:1,...}, {id:2,...}]}
     Two joins → lots of NULL rows → complex hydration logic.
  
  3. LAZY vs EAGER LOADING: should order.customer be fetched now or later?
     Lazy: loads when accessed. Convenient but causes N+1. ("I'll get it when I need it.")
     Eager: loads in the original query. Efficient but requires explicit opt-in.
     In ORMs: this decision point is where most performance bugs live.
  
  4. GRANULARITY: Objects can have fine-grained properties (street, city, pincode as separate fields
     or as an Address object). SQL tables don't have nested types natively.
     JSONB is a workaround. Composite types help. But the mismatch remains.

DRIZZLE vs PRISMA = STICK SHIFT vs AUTOMATIC:
  Drizzle (stick shift): you control exactly what SQL runs. Low-level, explicit, fast.
    You can always see what gear you're in. No surprises.
  Prisma (automatic): smooth and easy for common cases. Occasionally shifts unexpectedly.
    Hides the SQL from you — sometimes you don't know what's actually running.
  Both valid tools. Know which you're using and why.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ORM PATTERNS AND TRADE-OFFS:
--------------------------------------------------------

THE FOUR ORM PATTERNS:
  
  1. Active Record (Rails ActiveRecord, Sequelize model instances):
     Model = database row. Methods on the model persist to DB.
     user.save() → UPDATE users SET ... WHERE id = user.id
     Pros: very ergonomic for simple CRUD. One class = one table.
     Cons: mixing domain logic with persistence. Hard to test. Violates Single Responsibility.
  
  2. Data Mapper (Drizzle, Prisma, TypeORM with repositories):
     Separate mapper between domain objects and database rows.
     No "magic" persistence. You explicitly call db.insert(), db.update().
     Pros: clean separation. Easier to test (mock the db layer).
     Cons: more boilerplate. Less "magical."
  
  3. Query Builder (Drizzle, Knex):
     Fluent API that builds SQL programmatically.
     db.select().from(users).where(eq(users.id, 42))
     Generates SQL: SELECT * FROM users WHERE id = 42
     Pros: full SQL expressiveness with type safety. Close to raw SQL. Composable.
     Cons: still learning curve. Some SQL constructs need raw fragments.
  
  4. Schema-first code generation (Prisma):
     Write schema.prisma → prisma generate → fully-typed client generated.
     Prisma reads .prisma schema, generates TypeScript types AND client code.
     Pros: excellent DX, type-safe, good for standard CRUD.
     Cons: generated code is opaque. Hard to customize. Complex queries awkward.

DRIZZLE SPECIFICALLY:
  Drizzle is a TypeScript query builder + schema definition library.
  Key characteristics:
    1. SQL-like API: db.select().from().where().orderBy() mirrors SQL structure.
    2. Zero runtime codegen: types inferred directly from schema definitions.
    3. Lightweight: no complex runtime, no heavyweight connection management (bring your own driver).
    4. Relations API: separate from the query builder — a data-fetching layer with N+1 prevention.
    5. drizzle-kit: CLI tool for migrations (generate diff, run migrations, studio).
  
  Two query modes:
    Query Builder: db.select().from(users).where(eq(users.id, 42)) → type-safe query builder.
    Relations: db.query.users.findFirst({ with: { orders: true } }) → declarative, handles joins/N+1.

PRISMA SPECIFICALLY:
  Prisma is a schema-first ORM with a generated TypeScript client.
  Key characteristics:
    1. .prisma schema file: single source of truth for data model.
    2. prisma generate: generates PrismaClient with fully-typed methods.
    3. prisma migrate dev: generates SQL migration files from schema diff.
    4. Nested writes: create user + orders in one call.
    5. prisma.\$queryRaw / \$executeRaw: escape hatch for complex SQL.
  
  Prisma's generated SQL:
    prisma.user.findMany({ where: { active: true } })
    → SELECT "User"."id", "User"."email", ... FROM "public"."User" WHERE "User"."active" = true
    The generated SQL is often verbose but correct.

WHEN TO ABANDON THE ORM:
  1. Window functions: LAG, RANK, OVER, PARTITION — Drizzle has sql\`\` tag. Prisma needs \$queryRaw.
  2. Complex aggregates: GROUP BY with HAVING, multiple aggregate functions.
  3. Recursive CTEs: WITH RECURSIVE. Both ORMs: raw SQL or sql\`\` fragments.
  4. Lateral joins: critical for top-N-per-group. Must be raw SQL.
  5. UPSERT with complex ON CONFLICT logic: Drizzle has onConflictDoUpdate(). Prisma: upsert().
  6. Bulk operations: INSERT ... SELECT, mass UPDATE with JOIN. ORMs do row-by-row.
  7. Reporting queries: complex multi-table analytics. Raw SQL + TypeScript typing.
    `,
    code: `
// ===== ORM IMPEDANCE MISMATCH — EXAMPLES =====

// EXAMPLE 1: The core mismatch — objects vs rows
// SQL thinks in SETS. JavaScript thinks in OBJECTS.

// SQL: "give me all users in Mumbai with their order count"
// SELECT u.id, u.name, COUNT(o.id) as order_count
// FROM users u LEFT JOIN orders o ON o.user_id = u.id
// WHERE u.city = 'Mumbai' GROUP BY u.id, u.name

// ORM version (Prisma):
// const users = await prisma.user.findMany({
//   where: { city: 'Mumbai' },
//   include: { _count: { select: { orders: true } } }
// });
// Prisma generates: SELECT + COUNT subquery — similar efficiency

// ORM version (Drizzle):
// const users = await db
//   .select({ id: users.id, name: users.name, orderCount: count(orders.id) })
//   .from(users)
//   .leftJoin(orders, eq(orders.userId, users.id))
//   .where(eq(users.city, 'Mumbai'))
//   .groupBy(users.id, users.name);
// Drizzle generates: almost identical SQL to the manual version

// EXAMPLE 2: The dangerous "filter in JS" anti-pattern

// WRONG: Loads ALL products into memory, filters in JavaScript
// const products = await db.select().from(productsTable);
// const expensive = products.filter(p => p.price > 5000); // JS filter — ALL rows loaded!

// RIGHT: Push the predicate to the database
// import { gt } from 'drizzle-orm';
// const expensive = await db
//   .select()
//   .from(productsTable)
//   .where(gt(productsTable.price, 5000)); // SQL WHERE price > 5000

// EXAMPLE 3: Active Record vs Data Mapper mental model

// Active Record (Sequelize — for comparison):
// const user = await User.findByPk(42);
// user.name = 'Priya Sharma';
// await user.save(); // Magic persistence
// Danger: user.name = 'x' without .save() → change silently lost

// Data Mapper (Drizzle — explicit, no magic):
// const [user] = await db.select().from(users).where(eq(users.id, 42));
// // user is a plain JS object — mutating it does NOTHING to the database
// await db.update(users).set({ name: 'Priya Sharma' }).where(eq(users.id, 42));
// Advantage: you always know exactly when a DB write happens

// Data Mapper (Prisma):
// const user = await prisma.user.findUnique({ where: { id: 42 } });
// // user is plain object — no .save() method
// const updated = await prisma.user.update({
//   where: { id: 42 },
//   data: { name: 'Priya Sharma' }
// });

// EXAMPLE 4: When ORM expressiveness hits a wall — use raw SQL escape hatch

// Goal: window function — rank orders per customer by amount (ORM can't express this directly)

// Drizzle: use sql\`\` tagged template for raw fragments inside typed queries
// import { sql } from 'drizzle-orm';
// const rankedOrders = await db.execute(sql\`
//   SELECT
//     o.id,
//     o.customer_id,
//     o.amount,
//     RANK() OVER (PARTITION BY o.customer_id ORDER BY o.amount DESC) as rank
//   FROM orders o
//   WHERE o.created_at > NOW() - INTERVAL '30 days'
// \`);

// Prisma escape hatch:
// const rankedOrders = await prisma.\$queryRaw\`
//   SELECT id, customer_id, amount,
//          RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) as rank
//   FROM orders
//   WHERE created_at > NOW() - INTERVAL '30 days'
// \`;

// EXAMPLE 5: Lazy loading trap — N+1 from object navigation

// Prisma with lazy loading behavior (include not specified):
// const orders = await prisma.order.findMany({ take: 10 });
// for (const order of orders) {
//   // This navigates a relation NOT included — Prisma throws an error
//   // (Prisma doesn't do lazy loading — you get a runtime error if relation not included)
//   console.log(order.customer.name); // ERROR: Cannot read 'name' of undefined
// }

// The fix — eager load with include:
// const orders = await prisma.order.findMany({
//   take: 10,
//   include: { customer: { select: { name: true, email: true } } }
// });
// // Now ONE query with a JOIN — no N+1

// EXAMPLE 6: Drizzle vs Prisma philosophy comparison side-by-side

// Same query: "Find all active users in Bangalore with their order count > 5"

// DRIZZLE (close to SQL — you see exactly what runs):
// import { and, eq, gt, count } from 'drizzle-orm';
// const result = await db
//   .select({ id: users.id, name: users.name, totalOrders: count(orders.id) })
//   .from(users)
//   .leftJoin(orders, eq(orders.userId, users.id))
//   .where(and(eq(users.status, 'active'), eq(users.city, 'Bangalore')))
//   .groupBy(users.id, users.name)
//   .having(gt(count(orders.id), 5));
// You know exactly: JOIN + GROUP BY + HAVING. No surprises.

// PRISMA (abstraction — SQL hidden):
// const result = await prisma.user.findMany({
//   where: {
//     status: 'active', city: 'Bangalore',
//     orders: { _count: { gt: 5 } }
//   },
//   include: { _count: { select: { orders: true } } }
// });
// What SQL does Prisma generate? You must run with DEBUG=* to find out.
// Prisma actually generates a subquery here. Might not be optimal.

// EXAMPLE 7: The identity map problem — stale data after raw SQL bypass

// Bug scenario: update via raw SQL, then read via ORM
// await db.execute(sql\`UPDATE users SET balance = 0 WHERE id = 1\`);
// const user = await db.select().from(users).where(eq(users.id, 1));
// // Drizzle: no identity map — always fetches fresh from DB. balance = 0. CORRECT.

// Prisma also has no identity map in practice — each query hits the DB.
// The "stale data" problem is more common in Hibernate/JPA (Java) which has a first-level cache.
// Lesson: Drizzle and Prisma both do fresh DB reads. No hidden caching. No stale data risk.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ORM IMPEDANCE MISMATCH:
--------------------------------------------------

BUG 1: Prisma include generating a cartesian product — 10,000 rows for 100 orders
  Scenario: E-commerce dashboard loaded "orders with items and shipping details."
    prisma.order.findMany({ include: { items: true, shipping: true } })
    With 100 orders, 10 items each, 1 shipping record: Prisma generated a JOIN that returned
    100 × 10 × 1 = 1000 rows from the DB, then de-nested them in memory. Fine at this scale.
    But with 1000 orders × 20 items: 20,000 rows transferred and de-nested. 800ms → 8s.
  Root cause: Prisma's include for one-to-many relations joins the tables together.
    Large "many" side multiplied by number of parent records = large result set.
  Fix: Use separate queries for large one-to-many or paginate the children:
    prisma.order.findMany({ take: 100 })
    Then: prisma.orderItem.findMany({ where: { orderId: { in: orderIds } } })
    In application: merge items into orders by orderId. Two queries, controlled sizes.

BUG 2: "Filter in JS" loading entire production table — 4GB into Lambda RAM
  Scenario: Serverless function at a logistics company:
    const allShipments = await db.select().from(shipments); // 2M rows!
    const pendingToday = allShipments.filter(s =>
      s.status === 'pending' && s.scheduledDate === today
    );
    Lambda OOM-killed. 128MB limit exceeded. Function crashed in production.
  Root cause: Developer came from frontend where array.filter() is normal.
    Didn't realize db.select() with no WHERE loads EVERY ROW into memory.
  Fix:
    const pendingToday = await db.select().from(shipments).where(
      and(eq(shipments.status, 'pending'), eq(shipments.scheduledDate, today))
    );
    Never filter in JS what can be filtered in SQL. The database is orders of magnitude faster.

BUG 3: Prisma nested write creating duplicate records on retry
  Scenario: Payment API with retry logic:
    await prisma.order.create({
      data: { customerId: 42, amount: 5000, items: { create: [...itemData] } }
    });
    Network timeout → client retried. Two orders created. Customer charged twice.
  Root cause: Prisma nested writes are not idempotent. Retry = second create.
    No duplicate detection built into the ORM call.
  Fix:
    1. Use idempotency keys: store idempotency_key on orders table.
    2. Before create: check if order with this idempotency_key exists.
    3. Or: use upsert with idempotency_key:
       await prisma.order.upsert({
         where: { idempotencyKey: key },
         create: { customerId: 42, amount: 5000, idempotencyKey: key },
         update: {} // No-op if already exists
       });

BUG 4: Drizzle query builder built outside request scope — shared mutable state
  Scenario: Developer built a "reusable query" by creating a query builder outside the handler:
    // File module level:
    const baseQuery = db.select().from(users).where(eq(users.active, true));
    // In handler:
    const withLimit = baseQuery.limit(10); // Mutation?
    Appeared to work in development. Under load: queries returned wrong data — limits from
    one request appeared in another request's query.
  Root cause: Drizzle query builder objects ARE immutable (they return new objects on each chain call).
    But the developer wasn't certain, and the pattern encouraged confusion.
    If baseQuery was accidentally mutable: concurrent requests could corrupt shared state.
  Fix: Build queries inside request handlers, not at module scope.
    OR: Use functions that return fresh query builders:
    const getActiveUsersQuery = () => db.select().from(users).where(eq(users.active, true));

BUG 5: ORM SELECT * loading unused columns — 40KB JSONB blobs per row
  Scenario: User listing API: db.select().from(users) — fetching ALL columns.
    users table had a metadata JSONB column with 40KB per user (stored preferences, activity logs).
    Fetching 1000 users: 40MB transferred per API call. 500ms latency just for network transfer.
  Root cause: ORM's default is SELECT * — all columns, including large JSONB/TEXT blobs.
    The API only needed id, name, email for the listing.
  Fix — Drizzle (explicit column selection):
    const users = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email
    }).from(usersTable);
  Fix — Prisma:
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true } // Never select: false — just omit
    });
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE BEHAVIOR:
  Given this Drizzle code:

  // const allUsers = await db.select().from(users);
  // const result = allUsers.filter(u => u.city === 'Delhi' && u.age > 25);
  // console.log(result.length);

  The users table has 2,000,000 rows. 500 users in Delhi are over 25.

  a) How many rows does this code load into memory?
  b) How many rows does the database actually return over the network?
  c) How long might this take compared to a proper WHERE clause?
  d) Write the correct Drizzle query that pushes the filter to the database.
  e) What happens to this Lambda function if users table grows to 10M rows?

CHALLENGE 2 — IDENTIFY THE ORM PATTERN:
  For each code snippet, identify: (a) Active Record or Data Mapper? (b) What's the bug risk?

  Snippet A:
  // const user = await User.findOne({ where: { id: 42 } });
  // user.lastLoginAt = new Date();
  // // ... 200 lines of business logic ...
  // await user.save();

  Snippet B:
  // const user = await prisma.user.findUnique({ where: { id: 42 } });
  // user.lastLoginAt = new Date(); // ← is this persisted?

  Snippet C:
  // const updatedUser = await db
  //   .update(users)
  //   .set({ lastLoginAt: new Date() })
  //   .where(eq(users.id, 42))
  //   .returning();

  Which snippet has a hidden bug? Which is safest? Why?

CHALLENGE 3 — BUILD FROM SCRATCH:
  You're building a product catalog API for Flipkart. The endpoint:
  GET /products?category=electronics&minPrice=5000&maxPrice=50000&city=Mumbai&page=1

  Requirements:
  1. Fetch products matching all provided filters (filters are optional — if not provided, don't filter by that field)
  2. Only return: id, name, price, category, stock (NOT the full description/images JSONB)
  3. Limit to 20 products per page
  4. Include total count for pagination metadata

  Write this as a Drizzle query (use any reasonable schema) showing:
  - How to handle optional WHERE conditions
  - Column selection (not SELECT *)
  - Pagination
  - Count query for total

  Then: identify which parts of this query would be IMPOSSIBLE to express in a pure ORM
  and would require raw SQL (e.g., if you needed to rank by relevance or add a window function).
    `,
    summary: `The ORM impedance mismatch is not a problem to be solved but a trade-off to be managed — ORMs win on developer velocity for CRUD operations, schema management, and type safety, but lose on complex analytics, unusual query shapes, and bulk operations. Knowing when to use the ORM and when to reach for raw SQL (Drizzle's sql\`\` tag, Prisma's \$queryRaw) is the skill that separates good backend engineers from great ones.`
  },

  {
    id: 2,
    title: "Drizzle Schema Definition",
    tag: "YOUR DATABASE IN TYPESCRIPT, TYPE-SAFE FROM DAY ONE",
    color: "#047857",
    tldr: `Drizzle schemas are TypeScript files where you define tables using pgTable/mysqlTable/sqliteTable and describe every column with its type, constraints, and defaults. The schema IS the single source of truth — Drizzle infers TypeScript types directly from it with zero runtime codegen, and drizzle-kit reads it to generate SQL migration files. Get the schema right and everything downstream (type checking, migrations, queries) just works.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I define a PostgreSQL table in Drizzle? What's the right function to use?"
  → pgTable() for PostgreSQL, mysqlTable() for MySQL, sqliteTable() for SQLite.
  → Each has dialect-specific column types (e.g., pgTable has jsonb(), uuid(); mysqlTable has tinyint()).

"I defined a column as integer but TypeScript says it could be null everywhere"
  → Drizzle columns are nullable by default. Must add .notNull() to make them required.
  → Or: add a default value with .default(0) — then column is never null in inserts.

"What's the difference between .default() and .$defaultFn() in Drizzle?"
  → .default(value): SQL-level default. Stored in the CREATE TABLE. Database sets it if no value provided.
  → .$defaultFn(() => fn()): JavaScript-level default. Evaluated at INSERT time by Drizzle, not the DB.
  → For UUIDs: .$defaultFn(() => crypto.randomUUID()) generates UUID in JS before inserting.
  → For server timestamps: .defaultNow() uses SQL NOW() — evaluated by the database.

"drizzle-kit generate created a migration that drops and recreates my entire table"
  → Schema changes that seem minor can cause column renames to be detected as DROP + ADD.
  → Drizzle-kit can't always tell a renamed column from a dropped+added pair.
  → Review generated migration files before running. Use column renaming carefully.

"My relations definition isn't affecting the query output — why?"
  → Relations (one/many/relations helpers) are a SEPARATE metadata layer for the db.query.* API.
  → They don't affect the query builder (db.select().from()...). They only enable db.query.users.findFirst().
  → If using the query builder: express relations with explicit .leftJoin() calls.
    `,
    analogy: `
THE BLUEPRINT ANALOGY:
-----------------------
A database table = a room in a building.
The Drizzle schema file = the architectural blueprint for every room.

PGTABLE() = THE ROOM DEFINITION:
  export const users = pgTable('users', { ... })
  This says: "There exists a room called 'users' in our PostgreSQL building."
  pgTable = PostgreSQL building. mysqlTable = MySQL building. sqliteTable = SQLite building.
  The building type determines available materials (column types, features).

COLUMN DEFINITIONS = ROOM SPECIFICATIONS:
  id: bigserial('id').primaryKey()
  → "This room has a unique room number that auto-increments. Required. Unique. Primary key."
  
  email: varchar('email', { length: 255 }).notNull().unique()
  → "There's a label holder (max 255 characters). Must be filled. Must be unique across all rooms."
  
  createdAt: timestamp('created_at').defaultNow()
  → "There's a clock on the wall. By default, it shows when the room was created."

.NOTNULL() vs NO MODIFIER:
  Without .notNull(): the column is like a whiteboard that CAN be left blank.
  With .notNull(): the whiteboard is required to have something written on it. Empty = rejected.
  
  Critical: Drizzle's TypeScript types reflect this!
  Without .notNull(): TypeScript type includes | null. You must handle null in code.
  With .notNull(): TypeScript type is the base type only. No null checks needed.

$DEFAULTFN() vs .DEFAULTNOW() = JS FACTORY vs DB CLOCK:
  .defaultNow() → equivalent to DEFAULT NOW() in SQL. Database fills this. Fast, server-side.
  .$defaultFn(() => new Date()) → Drizzle generates the value in JavaScript, then sends it to DB.
    Used when: the default value must be computed in JS (UUID, custom random string, etc.)
    Caveat: if you INSERT via raw SQL (bypassing Drizzle), the $defaultFn doesn't run!
    The DB only knows about SQL-level defaults (.default() and .defaultNow()).

RELATIONS METADATA = THE ROOM CONNECTION MAP:
  The building blueprint shows individual rooms. Connections between rooms (doors, corridors)?
  relations() is the "connection map" — tells Drizzle: "the users room connects to the orders room."
  This metadata enables: db.query.users.findFirst({ with: { orders: true } }).
  It does NOT create SQL foreign keys (those are in the column definition).
  It's just Drizzle's data-fetching navigation guide.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DRIZZLE SCHEMA INTERNALS:
-----------------------------------------------------

TABLE DEFINITION FUNCTIONS:
  pgTable(tableName, columns, extraConfig?)
    tableName: SQL table name (string)
    columns: object of column definitions
    extraConfig: function receiving the table → return array of indexes, constraints
  
  Same API for mysqlTable, sqliteTable.
  Each dialect has different available column types:
  
  PostgreSQL-specific (pgTable):
    serial/bigserial, uuid, jsonb/json, text, varchar, boolean, integer, bigint,
    real/doublePrecision, numeric/decimal, timestamp/timestamptz, date, time,
    inet, cidr, macaddr, point, line, interval, bytea, xml, tsvector, tsquery
  
  MySQL-specific (mysqlTable):
    tinyint, smallint, mediumint, int, bigint, float, double, decimal,
    varchar, char, text, mediumtext, longtext, binary, varbinary, blob,
    date, time, datetime, timestamp, year, json, enum, set
  
  SQLite-specific (sqliteTable):
    integer, real, text, blob, numeric
    (SQLite has limited types; Drizzle maps higher-level types to these)

COLUMN MODIFIERS CHAIN:
  Column modifiers are chainable methods that return the same column type:
    .primaryKey(): makes this the primary key. Implies .notNull() and uniqueness.
    .notNull(): NOT NULL constraint. Affects TypeScript type (removes | null).
    .unique(): UNIQUE constraint. Optionally: .unique('constraint_name').
    .default(value): SQL-level default. Value must be a literal or SQL expression.
    .defaultNow(): sugar for .default(sql\`now()\`).
    .$defaultFn(() => fn()): JS-level default. Evaluated by Drizzle before INSERT.
    .$onUpdateFn(() => fn()): JS-level value evaluated on UPDATE.
    .references(() => otherTable.column): creates SQL FOREIGN KEY constraint.
      + optional: { onDelete: 'cascade' | 'restrict' | 'set null' | 'no action' }
    .generatedAlwaysAs(() => sql\`...\`): computed/generated column (PG 12+)

TYPE INFERENCE:
  Drizzle infers TypeScript types from the schema at compile time:
  
  type UsersTableType = typeof users.\$inferSelect;
  // → { id: number; name: string; email: string; createdAt: Date; deletedAt: Date | null; }
  
  type NewUser = typeof users.\$inferInsert;
  // → { id?: number; name: string; email: string; createdAt?: Date; deletedAt?: Date | null; }
  // id is optional (auto-generated), createdAt is optional (has default)
  
  The \$inferSelect type: what you get back from SELECT (all columns including nullable).
  The \$inferInsert type: what you need to provide for INSERT (optional for defaulted/generated).

RELATIONS METADATA LAYER:
  relations() is NOT SQL. It doesn't create foreign keys. It's pure metadata for db.query.* API.
  
  // usersRelations: describes that users has many orders
  export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders)
  }));
  
  // ordersRelations: describes that each order belongs to one user
  export const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] })
  }));
  
  The fields/references in one() is what Drizzle uses to construct the JOIN condition.
  Without this: db.query.orders.findFirst({ with: { user: true } }) won't know how to join.
  
  Relations are entirely optional. You can use db.select().leftJoin() without defining relations.
  They only benefit the db.query.* (Relational Queries) API.

INDEX DEFINITION IN SCHEMA:
  Indexes defined in the third argument of pgTable (extraConfig):
  
  export const orders = pgTable('orders', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    customerId: bigint('customer_id', { mode: 'number' }).notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow()
  }, (table) => ({
    customerIdIdx: index('idx_orders_customer_id').on(table.customerId),
    statusCreatedIdx: index('idx_orders_status_created').on(table.status, table.createdAt),
    // Unique index:
    uniqueEmailOrg: uniqueIndex('uq_email_org').on(table.email, table.orgId),
    // Partial index (PostgreSQL):
    activeCustomerIdx: index('idx_active_customers').on(table.customerId).where(
      sql\`\${table.status} != 'deleted'\`
    )
  }));

DRIZZLE-KIT AND MIGRATIONS:
  drizzle.config.ts: configuration file for drizzle-kit.
    schema: path to schema files.
    out: directory for migration files.
    dialect: 'postgresql' | 'mysql' | 'sqlite'.
    dbCredentials: connection details.
  
  Commands:
    npx drizzle-kit generate: reads schema, compares with previous migration snapshot,
      generates a new .sql migration file + updated snapshot.
    npx drizzle-kit migrate: runs pending migrations against the database.
    npx drizzle-kit push: applies schema changes directly (no migration files — good for dev).
    npx drizzle-kit studio: opens a browser-based GUI for viewing/editing data.
    `,
    code: `
// ===== DRIZZLE SCHEMA DEFINITION — EXAMPLES =====

// EXAMPLE 1: Complete realistic schema for a SaaS application

// import { pgTable, bigserial, text, varchar, boolean, timestamp,
//          numeric, integer, uuid, jsonb, bigint } from 'drizzle-orm/pg-core';
// import { relations, sql } from 'drizzle-orm';

// Tenants (organizations)
const tenants = pgTable('tenants', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }) // nullable = soft delete
}, (table) => ({
  subdomainIdx: index('idx_tenants_subdomain').on(table.subdomain)
}));

// Users
const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'number' }).notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),                   // nullable — no .notNull()
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .$onUpdateFn(() => new Date())                 // Auto-update on every UPDATE
}, (table) => ({
  emailTenantIdx: uniqueIndex('uq_users_email_tenant').on(table.email, table.tenantId),
  tenantIdx: index('idx_users_tenant').on(table.tenantId)
}));

// EXAMPLE 2: Orders with different column types demonstrated

const orders = pgTable('orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  // UUID generated by JavaScript (not DB):
  publicId: uuid('public_id').notNull().$defaultFn(() => crypto.randomUUID()),
  customerId: bigint('customer_id', { mode: 'number' }).notNull()
    .references(() => users.id, { onDelete: 'restrict' }), // Can't delete user with orders
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  // Check constraint via sql template:
  // (Drizzle doesn't have a .check() method yet — add via SQL in migration or extraConfig)
  shippingAddress: jsonb('shipping_address'),   // Flexible structure
  notes: text('notes'),                         // Long text, nullable
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }) // Nullable: not yet processed
}, (table) => ({
  customerIdx: index('idx_orders_customer').on(table.customerId),
  statusCreatedIdx: index('idx_orders_status_created')
    .on(table.status, table.createdAt.desc()), // Composite with direction
  pendingIdx: index('idx_orders_pending')
    .on(table.customerId)
    .where(sql\`\${table.status} = 'pending'\`) // Partial index
}));

// EXAMPLE 3: Many-to-many junction table

const products = pgTable('products', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0)
});

// Junction table: orders ↔ products
const orderItems = pgTable('order_items', {
  orderId: bigint('order_id', { mode: 'number' }).notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' }).notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull() // Snapshot price at time of order
}, (table) => ({
  pk: primaryKey({ columns: [table.orderId, table.productId] }), // Composite PK
  productIdx: index('idx_order_items_product').on(table.productId)
}));

// EXAMPLE 4: Relations definition (metadata for db.query.* API)

// User has many orders. Order belongs to user.
const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] })
}));

const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  items: many(orderItems)
}));

const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] })
}));

// EXAMPLE 5: TypeScript type inference from schema

// Extract types from table definitions:
// type User = typeof users.\$inferSelect;
// type NewUser = typeof users.\$inferInsert;
// type Order = typeof orders.\$inferSelect;

// User type:
// {
//   id: number;
//   tenantId: number;
//   email: string;
//   name: string;
//   avatarUrl: string | null;     // No .notNull() = includes null
//   metadata: unknown | null;      // JSONB = unknown in Drizzle
//   createdAt: Date;
//   updatedAt: Date | null;
// }

// NewUser type:
// {
//   id?: number;          // Optional: auto-generated (bigserial)
//   tenantId: number;     // Required: no default
//   email: string;        // Required: no default
//   name: string;         // Required: no default
//   avatarUrl?: string | null;    // Optional: no default, nullable
//   metadata?: unknown | null;    // Optional: has default ({})
//   createdAt?: Date;     // Optional: has defaultNow()
//   updatedAt?: Date;     // Optional: has defaultNow()
// }

// EXAMPLE 6: drizzle.config.ts setup

// export default {
//   schema: './src/db/schema.ts',     // Path to schema file(s)
//   out: './src/db/migrations',       // Where to write migration files
//   dialect: 'postgresql',
//   dbCredentials: {
//     url: process.env.DATABASE_URL!, // Connection string
//   },
//   // Optional: verbose migration output
//   verbose: true,
//   // Optional: strict mode (fail if breaking changes detected)
//   strict: true,
// } satisfies Config;

// EXAMPLE 7: Self-referential table (categories, org chart)

const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  parentId: bigint('parent_id', { mode: 'number' })
    .references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  // Note: references() callback syntax — needed for self-references (avoids circular reference)
  sortOrder: integer('sort_order').notNull().default(0)
}, (table) => ({
  parentIdx: index('idx_categories_parent').on(table.parentId)
}));
    `,
    bugs: `
REAL PRODUCTION BUGS FROM DRIZZLE SCHEMA MISTAKES:
---------------------------------------------------

BUG 1: Missing .notNull() — TypeScript allows nulls where database rejects them
  Scenario: Schema defined: email: varchar('email', { length: 255 }).unique()
    TypeScript type: { email: string | null } — nullable because no .notNull().
    Developer wrote: await db.insert(users).values({ name: 'Priya' }); // email omitted
    TypeScript: no error (email is optional in insert type).
    Database: ERROR: null value in column "email" violates not-null constraint
    (If the column was NOT NULL in the database but not in the Drizzle schema)
  Root cause: Schema doesn't match database. Schema migration wasn't run after schema change.
    OR: schema defined without .notNull() but migration added NOT NULL manually.
  Fix:
    email: varchar('email', { length: 255 }).notNull().unique()
    Always run drizzle-kit generate + migrate after changing schema.
    Keep schema and database in sync — never manually alter production without updating schema.

BUG 2: $defaultFn for UUID not applied when inserting via raw SQL
  Scenario: Schema used .$defaultFn(() => crypto.randomUUID()) for publicId.
    Direct Drizzle inserts: worked fine. UUID was generated.
    Migration script used raw SQL: INSERT INTO orders (customer_id, amount) VALUES (...)
    Result: orders rows had publicId = NULL. Application code expected publicId to exist.
    Frontend URLs that used publicId (e.g., /orders/:publicId) were broken.
  Root cause: $defaultFn is JavaScript-level. It only runs when using Drizzle's insert() method.
    Raw SQL bypasses Drizzle entirely — $defaultFn never called.
  Fix: Use a SQL-level default instead:
    publicId: uuid('public_id').notNull().default(sql\`gen_random_uuid()\`)
    Now both Drizzle inserts AND raw SQL inserts get a UUID from the database.
    OR: use gen_random_uuid() as a PostgreSQL extension (requires: CREATE EXTENSION pgcrypto).

BUG 3: Self-referential table without () => callback — circular reference error
  Scenario: Developer wrote:
    parentId: bigint('parent_id').references(() => categories.id) -- Correct
    // But this was tried first:
    parentId: bigint('parent_id').references(categories.id)       -- Error!
    TypeScript error: "Variable 'categories' is used before being assigned"
  Root cause: categories references itself. At the time parentId is defined,
    the categories variable doesn't exist yet (it's being defined right now!).
  Fix: Wrap in a callback: .references((): AnyPgColumn => categories.id)
    The () => wraps the reference in a function, delaying evaluation until after definition.
    Also needed for: mutually circular references between two tables.

BUG 4: Missing composite primary key on junction table — duplicate many-to-many entries
  Scenario: order_items table had:
    orderId: bigint(...).references(...),
    productId: bigint(...).references(...),
    // NO primaryKey({ columns: [...] }) defined
    
    Application added the same product to an order twice (bug in frontend double-click).
    Two rows with same (orderId, productId) — order showed product quantity as 2 separate lines
    instead of increasing quantity. Order total doubled.
  Root cause: No composite primary key or unique constraint on junction table.
  Fix:
    In extraConfig:
    pk: primaryKey({ columns: [table.orderId, table.productId] })
    Or: uniqueIndex('uq_order_product').on(table.orderId, table.productId)
    And: add upsert logic in application to increment quantity if item already exists.

BUG 5: Relations defined but fields/references wrong — silent wrong query results
  Scenario: Developer defined:
    user: one(users, { fields: [orders.customerId], references: [orders.id] }) -- WRONG!
    Should be: references: [users.id]
    
    db.query.orders.findFirst({ with: { user: true } }) ran without error.
    Returned... wrong user! Drizzle joined ON orders.customer_id = orders.id
    (joining order to itself) instead of ON orders.customer_id = users.id.
  Root cause: Drizzle's relations don't validate that fields/references make semantic sense —
    only that the columns exist. Wrong mapping = wrong JOIN silently.
  Fix: Always double-check:
    fields: columns from the TABLE BEING DEFINED (orders)
    references: columns from the TARGET TABLE (users)
    user: one(users, { fields: [orders.customerId], references: [users.id] }) // CORRECT
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE TYPESCRIPT TYPES:
  Given these column definitions, predict the TypeScript type for \$inferSelect and \$inferInsert:

  const products = pgTable('products', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sku: varchar('sku', { length: 50 }).notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),              // a
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),  // b
    isActive: boolean('is_active').notNull().default(true),  // c
    publicId: uuid('public_id').$defaultFn(() => crypto.randomUUID()).notNull(), // d
    createdAt: timestamp('created_at').defaultNow().notNull(),  // e
  });

  For each labelled column (a-e), state:
  1. Is it optional or required in \$inferInsert? Why?
  2. Does its \$inferSelect type include null? Why?
  3. What happens if you omit it in db.insert(products).values({})?

CHALLENGE 2 — FIX THE SCHEMA:
  This Drizzle schema has 5 bugs. Find and fix each:

  const invoices = pgTable('invoices', {
    id: bigserial('id').primaryKey(),        // Bug 1: missing mode option
    orderId: bigint('order_id').references(orders.id), // Bug 2: two issues here
    amount: decimal('amount').notNull(),     // Bug 3: missing precision/scale
    dueDate: date('due_date'),               // This is fine
    status: text('status').default('unpaid'), // Bug 4: no notNull
    items: jsonb('items').default('[]'),    // Bug 5: wrong default type
  }, (table) => ({
    orderIdx: index('idx_inv_order').on(table.orderId),
  }));

  For each bug: explain what goes wrong at compile time, runtime, or database level.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Design a complete Drizzle schema for a job board platform (like Naukri.com) with:

  Tables: companies, jobs, candidates, applications, skills, job_skills (junction)

  Requirements:
  - companies: id, name, website, logo_url, verified (boolean), plan ('free'|'pro'|'enterprise')
  - jobs: id, company_id (FK), title, description, location, salary_min, salary_max (both NUMERIC),
    job_type ('full_time'|'part_time'|'contract'|'internship'), is_active, posted_at, expires_at
  - candidates: id, email (unique), name, resume_url, current_salary, expected_salary, city
  - applications: id, job_id (FK), candidate_id (FK), status, cover_letter, applied_at
    (one candidate can apply to one job only once — enforce this)
  - skills: id, name (unique, case-insensitive)
  - job_skills: junction table between jobs and skills

  For each table: include appropriate column modifiers, defaults, and constraints.
  Add indexes that support these common queries:
  1. "Find all active jobs in Bangalore for a company"
  2. "Find all applications for a candidate, newest first"
  3. "Find all jobs requiring a specific skill"
    `,
    summary: `The Drizzle schema file is the foundation of your entire data layer — every column modifier (.notNull(), .default(), .references()) directly shapes both the TypeScript types your application code uses AND the SQL that drizzle-kit generates for migrations. The golden rule: schema and database must always be in sync — run drizzle-kit generate + migrate after every schema change, and never manually alter the database without updating the schema file.`
  },

  {
    id: 3,
    title: "Drizzle Queries — Select, Insert, Update, Delete",
    tag: "TALKING TO YOUR DATABASE IN TYPED SQL",
    color: "#B45309",
    tldr: `Drizzle's query builder mirrors SQL syntax so closely that if you know SQL, you already know Drizzle. Every operation — select with WHERE/ORDER BY/LIMIT, insert single or bulk rows, update with conditions, delete with returning — is expressed as a chainable TypeScript API that generates the exact SQL you'd write by hand. The result is always typed: TypeScript knows exactly what shape comes back from every query.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I express WHERE a = 1 AND b > 5 in Drizzle?"
  → Import condition helpers: eq, gt, lt, gte, lte, ne, and, or, not, like, ilike, inArray, isNull.
  → .where(and(eq(users.city, 'Mumbai'), gt(users.age, 25)))
  → Each helper maps directly to a SQL operator. No magic string syntax.

"Drizzle query has a ? placeholder but I need a dynamic column name"
  → Column references in Drizzle are ALWAYS the schema object: users.id, orders.status.
  → Dynamic column selection: pass array of column objects. Table[colName as keyof Table] for dynamic.
  → Never string-concatenate table/column names — use the schema objects for SQL injection safety.

"I need to INSERT and get back the inserted row's generated ID"
  → Drizzle: .returning() after insert/update/delete returns specified columns.
  → .returning({ id: users.id }) → returns [{ id: number }].
  → .returning() (no argument) → returns all columns of inserted row.

"How do I do an UPSERT in Drizzle?"
  → .onConflictDoUpdate() for INSERT ... ON CONFLICT DO UPDATE.
  → .onConflictDoNothing() for INSERT ... ON CONFLICT DO NOTHING.
  → Specify: target (which column/constraint), set (what to update).

"db.select().from(users) — what is the return type exactly?"
  → Array of the table's \$inferSelect type: Promise<(typeof users.\$inferSelect)[]>
  → If you select specific columns: Promise<{ id: number; name: string }[]> (only selected columns).
  → Drizzle infers the exact return type from the .select({ ... }) argument.
    `,
    analogy: `
THE SENTENCE CONSTRUCTION ANALOGY:
------------------------------------
Writing a Drizzle query is like constructing a sentence in English, clause by clause:

SQL:     SELECT id, name    FROM users   WHERE city = 'Mumbai'  ORDER BY name   LIMIT 20;
Drizzle: .select({id,name}) .from(users) .where(eq(city,'Mumbai')) .orderBy(name) .limit(20);

Each method = one SQL clause. Same order. Same logic. Just TypeScript syntax.

THE CONDITION HELPERS = VOCABULARY:
  eq(a, b)      → a = b
  ne(a, b)      → a != b
  gt(a, b)      → a > b
  gte(a, b)     → a >= b
  lt(a, b)      → a < b
  lte(a, b)     → a <= b
  and(a, b, c)  → a AND b AND c
  or(a, b)      → a OR b
  not(a)        → NOT a
  like(a, '%x') → a LIKE '%x'
  ilike(a, '%x')→ a ILIKE '%x' (case-insensitive)
  inArray(a,[]) → a IN (...)
  isNull(a)     → a IS NULL
  isNotNull(a)  → a IS NOT NULL

RETURNING() = THE RECEIPT:
  INSERT and UPDATE don't normally tell you what was stored.
  .returning() is like asking for a receipt: "show me what you just saved."
  
  INSERT INTO users (name) VALUES ('Priya') RETURNING id, name;
  → Drizzle: await db.insert(users).values({name:'Priya'}).returning({id: users.id, name: users.name})
  → Returns: [{ id: 42, name: 'Priya' }]
  You now have the auto-generated ID without a second SELECT query.

BULK INSERT = WRITING MANY LINES AT ONCE:
  .values([{...}, {...}, {...}]) → INSERT with multiple VALUE tuples.
  Same as writing 1000 separate INSERTs but 10-100× faster (one roundtrip, one transaction).
  PostgreSQL processes: INSERT INTO t (a,b) VALUES (1,'x'), (2,'y'), (3,'z')...

PREPARED STATEMENTS = SENDING THE TEMPLATE ONCE, FILLING IT MANY TIMES:
  db.select().from(users).where(eq(users.id, sql.placeholder('userId'))).prepare('getUserById')
  → PostgreSQL: PREPARE getUserById AS SELECT ... WHERE id = $1
  → Execute: prepared.execute({ userId: 42 }) → much faster for repeated queries.
  Benefit: PostgreSQL parses and plans the query once. Subsequent executions skip parse+plan step.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DRIZZLE QUERY INTERNALS:
----------------------------------------------------

QUERY BUILDER CHAIN:
  Each method returns a new query builder object (immutable chain).
  Nothing executes until you await the result (or call .toSQL() to inspect without executing).
  
  const query = db.select({ id: users.id }).from(users).where(eq(users.id, 42));
  query.toSQL() // → { sql: 'select "id" from "users" where "users"."id" = $1', params: [42] }
  const result = await query; // → Actually executes

SELECT:
  Basic: db.select().from(table)
    → SELECT * FROM table
  Column selection: db.select({ id: t.id, name: t.name }).from(t)
    → SELECT "id", "name" FROM "t"
  Expression: db.select({ count: count(t.id) }).from(t)
    → SELECT COUNT("id") FROM "t"
  
  Chaining:
    .where(condition)         → WHERE ...
    .orderBy(asc(col), desc(col2)) → ORDER BY col ASC, col2 DESC
    .limit(n)                 → LIMIT n
    .offset(n)                → OFFSET n
    .groupBy(col1, col2)      → GROUP BY col1, col2
    .having(condition)        → HAVING ...
    .leftJoin(table, on)      → LEFT JOIN table ON ...
    .innerJoin(table, on)     → INNER JOIN table ON ...
    .rightJoin(table, on)     → RIGHT JOIN table ON ...
    .fullJoin(table, on)      → FULL OUTER JOIN table ON ...

INSERT:
  db.insert(table).values({ ... })
  db.insert(table).values([{ ... }, { ... }])   // Bulk
  db.insert(table).values({ ... }).returning()   // Returns inserted row
  db.insert(table).values({ ... }).onConflictDoNothing()
  db.insert(table).values({ ... }).onConflictDoUpdate({
    target: table.email,          // The conflicting column
    set: { updatedAt: new Date() } // What to update
  })
  // Upsert using EXCLUDED:
  db.insert(table).values({ ... }).onConflictDoUpdate({
    target: table.email,
    set: { name: sql\`excluded.name\`, updatedAt: new Date() }
  })

UPDATE:
  db.update(table).set({ col: value }).where(condition)
  db.update(table).set({ col: value }).where(condition).returning()
  
  Increment pattern:
    db.update(products).set({ stock: sql\`\${products.stock} - 1\` }).where(eq(products.id, 42))
    → UPDATE products SET stock = stock - 1 WHERE id = 42

DELETE:
  db.delete(table).where(condition)
  db.delete(table).where(condition).returning({ id: table.id })
  
  Soft delete pattern:
    db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, 42))

JOINS IN QUERY BUILDER:
  const result = await db.select({
    orderId: orders.id,
    customerName: users.name,
    amount: orders.amount
  })
  .from(orders)
  .leftJoin(users, eq(orders.customerId, users.id))
  .where(eq(orders.status, 'pending'));
  
  Return type: { orderId: number; customerName: string | null; amount: string }
  Note: customerName is string | null because LEFT JOIN — right side may not exist.
  
  Multiple joins:
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .innerJoin(users, eq(orders.customerId, users.id))

PAGINATION:
  OFFSET pagination: simple but degrades at high offsets.
    .limit(20).offset(page * 20)
    Problem: OFFSET 10000 still scans 10020 rows and discards first 10000.
  
  Cursor pagination: efficient, stable ordering.
    .where(and(condition, gt(orders.id, lastSeenId)))
    .limit(20)
    .orderBy(asc(orders.id))
    Efficient regardless of position. No row scanning.
    Tradeoff: can't jump to arbitrary page. "Previous page" is harder.

PREPARED STATEMENTS:
  const prepared = db.select().from(users)
    .where(eq(users.id, sql.placeholder('id')))
    .prepare('getUserById');
  
  const user = await prepared.execute({ id: 42 });
  // PostgreSQL: PREPARE getUserById AS SELECT ... WHERE id = $1; EXECUTE getUserById(42);
  // Benefit: plan cached after first execution. Subsequent calls skip planning.
  
  Use for: frequently executed queries with different parameter values.
  Avoid for: queries that benefit from different plans based on parameter values (rare).
    `,
    code: `
// ===== DRIZZLE QUERIES — CODE EXAMPLES =====

// EXAMPLE 1: SELECT with conditions, ordering, pagination

// Find active users in Bangalore, paginated
// import { eq, and, desc, count, sql } from 'drizzle-orm';

async function getActiveUsersInCity(city, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [usersResult, countResult] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt
      // Note: NOT selecting avatarUrl, metadata — avoid SELECT *
    })
    .from(users)
    .where(and(
      eq(users.city, city),
      isNull(users.deletedAt)       // Soft-delete filter
    ))
    .orderBy(desc(users.createdAt)) // Newest first
    .limit(pageSize)
    .offset(offset),

    db.select({ total: count() })
    .from(users)
    .where(and(eq(users.city, city), isNull(users.deletedAt)))
  ]);

  return {
    users: usersResult,
    pagination: {
      total: countResult[0].total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult[0].total / pageSize)
    }
  };
}

// EXAMPLE 2: Cursor-based pagination (efficient for large datasets)

async function getOrdersCursor(lastOrderId = null, limit = 20) {
  const conditions = [eq(orders.status, 'pending')];

  if (lastOrderId !== null) {
    conditions.push(gt(orders.id, lastOrderId));
  }

  const result = await db.select({
    id: orders.id,
    publicId: orders.publicId,
    amount: orders.amount,
    createdAt: orders.createdAt
  })
  .from(orders)
  .where(and(...conditions))
  .orderBy(asc(orders.id))
  .limit(limit);

  const nextCursor = result.length === limit ? result[result.length - 1].id : null;
  return { orders: result, nextCursor };
}

// EXAMPLE 3: INSERT with returning, single and bulk

async function createOrder(customerId, amount, items) {
  return await db.transaction(async (tx) => {
    // Insert order, get back generated id and publicId
    const [newOrder] = await tx.insert(orders)
      .values({
        customerId,
        amount: amount.toString(), // numeric type expects string
        status: 'pending',
        shippingAddress: null
      })
      .returning({ id: orders.id, publicId: orders.publicId, createdAt: orders.createdAt });

    // Bulk insert order items
    await tx.insert(orderItems).values(
      items.map(item => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price.toString()
      }))
    );

    return newOrder;
  });
}

// EXAMPLE 4: UPDATE patterns — single field, conditional, increment

// Simple update:
async function updateOrderStatus(orderId, newStatus) {
  const [updated] = await db.update(orders)
    .set({
      status: newStatus,
      processedAt: newStatus === 'delivered' ? new Date() : null
    })
    .where(and(eq(orders.id, orderId), ne(orders.status, 'cancelled')))
    .returning({ id: orders.id, status: orders.status });

  if (!updated) throw new Error('Order not found or already cancelled');
  return updated;
}

// Increment stock (atomic — no race condition):
async function decrementStock(productId, quantity) {
  const [updated] = await db.update(products)
    .set({
      stock: sql\`\${products.stock} - \${quantity}\`
    })
    .where(and(
      eq(products.id, productId),
      gte(products.stock, quantity)   // Only decrement if enough stock
    ))
    .returning({ id: products.id, stock: products.stock });

  if (!updated) throw new Error('Insufficient stock');
  return updated;
}

// EXAMPLE 5: DELETE with soft delete pattern

// Hard delete:
async function hardDeleteUser(userId) {
  await db.delete(users).where(eq(users.id, userId));
}

// Soft delete (preferred for auditable systems):
async function softDeleteUser(userId) {
  const [deleted] = await db.update(users)
    .set({ deletedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning({ id: users.id, deletedAt: users.deletedAt });

  return deleted;
}

// EXAMPLE 6: UPSERT — insert or update

// Track user login activity:
async function trackUserLogin(userId, ipAddress) {
  await db.insert(userLoginStats)
    .values({
      userId,
      loginCount: 1,
      lastIp: ipAddress,
      lastLoginAt: new Date()
    })
    .onConflictDoUpdate({
      target: userLoginStats.userId,
      set: {
        loginCount: sql\`\${userLoginStats.loginCount} + 1\`,
        lastIp: ipAddress,
        lastLoginAt: new Date()
      }
    });
}

// EXAMPLE 7: Complex SELECT with JOIN, aggregation, using sql`` for expressions

async function getOrderSummaryByCustomer(startDate, endDate) {
  return await db.select({
    customerId: orders.customerId,
    customerName: users.name,
    orderCount: count(orders.id),
    totalRevenue: sql\`SUM(\${orders.amount})::NUMERIC\`.mapWith(Number),
    avgOrderValue: sql\`AVG(\${orders.amount})::NUMERIC\`.mapWith(Number),
    lastOrderDate: sql\`MAX(\${orders.createdAt})\`.mapWith(Date)
  })
  .from(orders)
  .innerJoin(users, eq(orders.customerId, users.id))
  .where(and(
    gte(orders.createdAt, startDate),
    lte(orders.createdAt, endDate),
    ne(orders.status, 'cancelled')
  ))
  .groupBy(orders.customerId, users.name)
  .having(gt(count(orders.id), 2))   // Only customers with > 2 orders
  .orderBy(desc(sql\`SUM(\${orders.amount})\`));
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM DRIZZLE QUERY MISTAKES:
--------------------------------------------------

BUG 1: Forgot .where() on DELETE — deleted entire table in production
  Scenario: Developer meant to delete soft-deleted users older than 90 days.
    await db.delete(users); // WHERE clause accidentally omitted during refactor
    Deleted ALL users in production. No recovery except from backup.
  Root cause: Drizzle allows DELETE without WHERE (valid SQL). No safeguard.
  Fix:
    // Always add where, even if it's a "truthy" condition for clarity:
    await db.delete(users).where(
      and(isNotNull(users.deletedAt), lt(users.deletedAt, ninetyDaysAgo))
    );
    Use a linting rule or wrapper that requires .where() on delete operations.
    Or: disable raw DELETE and use soft-delete only pattern.

BUG 2: Missing transaction for multi-table insert — partial writes on error
  Scenario: Order creation: insert order then insert items. items insert throws (constraint violation).
    Order was created. Items were not. Orphan order in database.
    Customer saw "order placed" (order ID exists) but order had no items.
    Payment was charged. Customer support nightmare.
  Root cause: Two separate await db.insert() calls without wrapping in db.transaction().
  Fix:
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({...}).returning();
      await tx.insert(orderItems).values(items.map(i => ({ orderId: order.id, ...i })));
      return order;
    });
    // If items insert fails: transaction rolls back, order is not created.

BUG 3: Returning all columns from INSERT exposing sensitive data
  Scenario: User registration endpoint:
    const [user] = await db.insert(users).values({...}).returning();
    // user contains: { id, email, name, passwordHash, internalNotes, ... }
    return res.json(user); // Accidentally exposed passwordHash to client!
  Root cause: .returning() without arguments returns ALL columns.
  Fix:
    const [user] = await db.insert(users).values({...}).returning({
      id: users.id,
      email: users.email,
      name: users.name
      // passwordHash deliberately excluded
    });
    Rule: always specify .returning({ ... }) with explicit columns. Never .returning() alone.

BUG 4: Numeric/decimal columns returned as strings — type mismatch breaks arithmetic
  Scenario: Product price was stored as numeric(10,2).
    const [product] = await db.select().from(products).where(eq(products.id, 42));
    const total = product.price * quantity;
    // product.price = '299.99' (STRING! Not a number)
    // total = '299.99' + '299.99' = '299.99299.99' (string concatenation!)
  Root cause: PostgreSQL numeric/decimal type is returned as string by the pg driver to avoid
    floating-point precision loss. Drizzle preserves this behavior.
  Fix options:
    1. Explicit cast in query: sql\`\${products.price}::FLOAT\`.mapWith(Number)
    2. Parse in application: parseFloat(product.price)
    3. Store as integer (price in paise): price = 29999 (₹299.99 = 29999 paise)
       Then: price / 100 for display. No floating-point issues.

BUG 5: Concurrent update without row lock — lost update problem
  Scenario: Two requests simultaneously checked inventory and decremented:
    // Request A:
    const product = await db.select().from(products).where(eq(products.id, 42));
    // product.stock = 1
    // [Request B reads here: also sees stock = 1]
    await db.update(products).set({ stock: product.stock - 1 }).where(eq(products.id, 42));
    // Both A and B set stock = 0. But 2 items were sold from stock of 1!
  Root cause: Read-modify-write without locking. Classic lost update race condition.
  Fix: Use atomic update (update based on current DB value, not cached object):
    const [updated] = await db.update(products)
      .set({ stock: sql\`\${products.stock} - 1\` })
      .where(and(eq(products.id, 42), gt(products.stock, 0)))
      .returning();
    if (!updated) throw new Error('Out of stock');
    // SQL: UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0
    // Database enforces the decrement atomically. No race condition.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE QUERY OUTPUT:
  Given this Drizzle query:

  const result = await db.select({
    name: users.name,
    orderCount: count(orders.id),
    totalSpent: sql\`COALESCE(SUM(\${orders.amount}), 0)\`
  })
  .from(users)
  .leftJoin(orders, eq(orders.customerId, users.id))
  .where(eq(users.city, 'Delhi'))
  .groupBy(users.id, users.name)
  .orderBy(desc(sql\`SUM(\${orders.amount})\`))
  .limit(5);

  Users in Delhi: Arjun (3 orders: ₹1000, ₹2000, ₹1500), Priya (0 orders), Rohan (1 order: ₹5000)

  a) What is the SQL this generates?
  b) What does result[0] look like (name, orderCount, totalSpent)?
  c) What is Priya's row? Why? (Hint: what does LEFT JOIN do for users with no orders?)
  d) What is the TypeScript type of totalSpent in the result? String or number?
  e) How would you fix question (d) to get a number?

CHALLENGE 2 — FIX THE QUERY BUGS:
  This endpoint has 3 bugs. Find and fix each:

  async function transferFunds(fromUserId, toUserId, amount) {
    // Bug 1: Read balance outside transaction (race condition)
    const [sender] = await db.select({ balance: wallets.balance })
      .from(wallets).where(eq(wallets.userId, fromUserId));

    if (parseFloat(sender.balance) < amount) {
      throw new Error('Insufficient funds');
    }

    // Bug 2: Two separate updates, no transaction
    await db.update(wallets)
      .set({ balance: sql\`\${wallets.balance} - \${amount}\` })
      .where(eq(wallets.userId, fromUserId));

    // Simulated failure point: server crashes here

    await db.update(wallets)
      .set({ balance: sql\`\${wallets.balance} + \${amount}\` })
      .where(eq(wallets.userId, toUserId));

    // Bug 3: No check that recipient wallet exists — update silently affects 0 rows
  }

  Write the corrected version with all 3 bugs fixed.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete order management query module for a D2C brand.
  
  Implement these 5 functions using Drizzle:

  1. createOrderWithItems(customerId, items[{productId, qty, price}])
     - Atomic: either all inserts succeed or none
     - Decrements product stock atomically
     - Returns order with publicId
     
  2. getOrderHistory(customerId, cursor, limit)
     - Cursor-based pagination (not offset)
     - Returns orders with basic item count and total
     - Sorted by newest first
     
  3. updateOrderStatus(orderId, newStatus, note)
     - Validate status transitions (pending→confirmed→shipped→delivered)
     - Soft-reject invalid transitions (return error, don't throw)
     - Log status change to order_events table
     
  4. getRevenueReport(startDate, endDate, groupBy: 'day'|'week'|'month')
     - Use sql\`\` template for DATE_TRUNC grouping
     - Return: period, order_count, revenue, avg_order_value
     
  5. bulkUpdateProductPrices(priceUpdates[{productId, newPrice}])
     - Efficient: one query, not N individual updates
     - Use sql\`\` with unnest or VALUES for bulk update
    `,
    summary: `Drizzle's query builder is deliberately designed to make SQL visible rather than abstract it away — if you can read the SELECT/WHERE/JOIN/GROUP BY clauses in the chain, you know exactly what SQL will run. The three most important practices: always specify column selections explicitly (never select *), always use db.transaction() for multi-step writes, and use sql\`\${column} operator value\` for atomic operations that can't be expressed with ORM helpers.`
  },

  {
    id: 4,
    title: "Pagination, Raw SQL & the sql`` Tag",
    tag: "GOING BEYOND WHAT THE ORM CAN EXPRESS",
    color: "#6D28D9",
    tldr: `Pagination comes in two flavors: offset (simple but degrades with large datasets) and cursor-based (efficient at any depth). When Drizzle's query builder can't express a SQL construct — window functions, lateral joins, CTEs, complex expressions — the sql\`\` tagged template literal lets you embed raw SQL fragments within fully typed queries. It safely parameterizes values to prevent SQL injection while letting you escape every ORM limitation.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My page 100 takes 10 seconds but page 1 takes 10ms — why?"
  → OFFSET pagination: SELECT * FROM orders LIMIT 20 OFFSET 2000 — must scan and discard 2000 rows.
  → At page 1000 with 20 items/page: OFFSET 20000 scans 20,020 rows, returns 20.
  → Cursor-based: WHERE id > :lastId LIMIT 20 — always scans exactly 20 rows (with index).

"I need a window function in my Drizzle query — is that possible?"
  → Yes: use the sql\`\` tag to embed raw SQL expressions anywhere in a query.
  → db.select({ rank: sql\`RANK() OVER (ORDER BY amount DESC)\` }).from(orders)
  → Generates: SELECT RANK() OVER (ORDER BY amount DESC) FROM orders — exactly as written.

"Is sql\`\` safe? Can it cause SQL injection?"
  → Values embedded via \${variable} are ALWAYS parameterized. Safe.
  → Column/table names referenced via \${table.column} are resolved at compile time. Safe.
  → Never string-concatenate raw SQL: sql\`WHERE id = \` + userId → UNSAFE (injection risk).
  → sql\`WHERE id = \${userId}\` → safe parameterized query.

"I need to write a CTE (WITH clause) — Drizzle doesn't have a .with() method (in older versions)"
  → Use db.execute(sql\`WITH ... SELECT ...\`) for full raw SQL queries.
  → Or: newer Drizzle versions have .with() CTE support — check docs.
  → For complex analytics: raw SQL is often clearer than a deep chain anyway.

"What's the difference between sql\`\` expression and db.execute(sql\`\`)?"
  → sql\`\` expression: used WITHIN a query builder chain (as a column, condition, or value).
  → db.execute(sql\`...\`): executes a complete raw SQL statement. Returns raw rows.
    `,
    analogy: `
THE BOOK AND BOOKMARK ANALOGY:
--------------------------------
OFFSET PAGINATION = "Find page 50 in the book by counting from the beginning":
  Your book has 10,000 pages. You want page 50.
  Offset pagination: start from page 1, count to page 50, start reading.
  Fast for page 50. For page 9,950: count through 9,950 pages to get to your spot.
  The database does the same: scans and discards all rows before the offset.
  Performance: O(offset). OFFSET 0 = fast. OFFSET 100000 = slow.

CURSOR PAGINATION = "Use a bookmark to jump directly to where you left off":
  Your bookmark says "page 9,950." Jump directly there. Zero counting.
  "Give me 20 records after ID 48,293" → database looks up ID 48,293 in the index (instant),
  then returns the next 20 rows. O(1) regardless of position.
  
  Tradeoff: you can't say "jump to page 500." You can only say "next" or "previous."
  But for "load more" UI, infinite scroll, API pagination: cursor is almost always better.

SQL`` TAG = THE EXPERT CONSULTANT:
  ORM = your regular contractor. Handles 90% of jobs well. Easy to communicate with.
  sql\`\` tag = the specialist you bring in when the contractor says "I can't do that."
  
  You: "I need a window function here."
  ORM contractor: "I don't do those."
  sql\`\` specialist: "Show me exactly what you need written. I'll put it in precisely."
  
  SAFE sql\`\` (specialist uses exact specifications):
    sql\`RANK() OVER (PARTITION BY \${orders.customerId} ORDER BY \${orders.amount} DESC)\`
    → The \${} parts are compile-time column references, not runtime strings. Injection-safe.
    
    sql\`\${orders.amount} > \${minAmount}\`
    → minAmount becomes a parameterized $1 placeholder. SQL injection impossible.
  
  UNSAFE pattern (never do this):
    sql\`WHERE id = \` + userId  → String concatenation. SQL injection possible.
    "SELECT * FROM " + tableName → Never do this in any form.

DATE SPINE WITH GENERATE_SERIES = THE CALENDAR SCAFFOLD:
  Problem: "Show daily revenue for January — including days with zero sales."
  ORM approach: query orders, group by date → zero-revenue days disappear.
  Raw SQL: generate_series('2024-01-01', '2024-01-31', '1 day') → all 31 days guaranteed.
  LEFT JOIN orders to this series → zero days appear as 0, not missing.
  Only expressible with sql\`\` in Drizzle — no ORM helper for generate_series.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — PAGINATION AND SQL TAG INTERNALS:
-------------------------------------------------------------

OFFSET PAGINATION INTERNALS:
  SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 1000
  
  What PostgreSQL does:
    1. Table/index scan to find all matching rows (if no WHERE: full scan).
    2. Sort by created_at DESC (if no index: in-memory sort).
    3. Skip first 1000 rows (waste).
    4. Return next 20.
  
  Problems at scale:
    - Rows 1-1000 fully scanned AND sorted, then discarded. Pure waste.
    - If data changes between page fetches: items can shift positions.
      New order inserted at page 1 position → every page shifts → page 2 might repeat item from page 1.
      This is the "phantom row" problem with offset pagination.
    - Memory: sort of millions of rows before OFFSET.
  
  When offset is acceptable:
    - Total dataset is small (< 100K rows).
    - Users rarely go beyond page 5-10 (most UI cases).
    - Simplicity > performance at this scale.

CURSOR PAGINATION INTERNALS:
  SELECT * FROM orders WHERE id > :lastId ORDER BY id ASC LIMIT 20
  
  What PostgreSQL does:
    1. Index scan on id > :lastId (instant: B-tree traversal O(log n)).
    2. Return next 20 rows from that point.
  
  For descending order (newest first) with cursor:
    WHERE id < :lastId ORDER BY id DESC LIMIT 20
    Or: use a timestamp cursor + tie-break by ID:
    WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC
  
  Compound cursor needed when ORDER BY column is not unique:
    Ordering by created_at alone → ties at same timestamp → unstable cursor.
    Tie-break with id: WHERE (created_at, id) < (cursor.ts, cursor.id)
    Stable even when multiple rows have the same timestamp.
  
  Encoding the cursor:
    Raw values as query params: ?cursor=1234 (ID-based).
    Encoded: base64(JSON.stringify({ id: 1234, ts: '2024-01-15T10:30:00Z' }))
    Opaque cursor to client: they don't know what it means. More flexible to change internals.

THE SQL`` TAG IN DEPTH:
  Tagged template literal syntax: sql\`raw sql with \${expressions}\`
  
  How it works:
    1. TypeScript evaluates the template literal parts and expression values.
    2. Drizzle builds a SQL string with $1, $2, ... placeholders for expression values.
    3. Table/column references (e.g., \${users.id}) are resolved to their SQL names ("users"."id").
    4. Primitive values (\${userId}) become parameterized placeholders.
  
  sql\`\${users.id} = \${42}\` → "users"."id" = $1 with params: [42]
  sql\`LOWER(\${users.email})\` → LOWER("users"."email") — column reference, not parameterized
  sql\`\${users.amount} * \${taxRate}\` → "users"."amount" * $1 with params: [taxRate]
  
  .mapWith(): cast the raw SQL result to a TypeScript type:
    sql\`COUNT(*)\`.mapWith(Number) → result is number, not string
    sql\`MAX(\${orders.createdAt})\`.mapWith(Date) → result is Date object
  
  sql.raw(): inject a literal SQL string (NOT parameterized — USE CAREFULLY):
    sql.raw('ASC') → used for dynamic direction (validated values only!)
    sql.raw(direction === 'asc' ? 'ASC' : 'DESC') → safe: limited to two known values
    sql.raw(userInput) → DANGEROUS: SQL injection risk!
  
  sql.placeholder(): named placeholder for prepared statements:
    sql.placeholder('userId') → creates a $n placeholder associated with name 'userId'

WINDOW FUNCTIONS WITH SQL TAG:
  Drizzle doesn't have built-in window function helpers. Use sql\`\` tag:
  
  await db.select({
    id: orders.id,
    amount: orders.amount,
    customerRank: sql\`RANK() OVER (PARTITION BY \${orders.customerId}
                       ORDER BY \${orders.amount} DESC)\`.mapWith(Number),
    runningTotal: sql\`SUM(\${orders.amount}) OVER (
                       PARTITION BY \${orders.customerId}
                       ORDER BY \${orders.createdAt}
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                     )\`.mapWith(Number)
  }).from(orders);

CTE SUPPORT (Drizzle v0.29+):
  Drizzle added .with() CTE support in newer versions:
  
  const recentOrders = db.\$with('recent_orders').as(
    db.select().from(orders).where(gte(orders.createdAt, thirtyDaysAgo))
  );
  
  const result = await db.with(recentOrders)
    .select({ customerId: recentOrders.customerId, total: sum(recentOrders.amount) })
    .from(recentOrders)
    .groupBy(recentOrders.customerId);
  
  For older Drizzle or complex CTEs: db.execute(sql\`WITH ... SELECT ...\`)
    `,
    code: `
// ===== PAGINATION, RAW SQL & sql\`\` TAG — EXAMPLES =====

// EXAMPLE 1: Offset vs cursor pagination comparison

// OFFSET pagination (simple, degrades at depth):
async function getOrdersOffset(page, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  return db.select({ id: orders.id, amount: orders.amount, createdAt: orders.createdAt })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset); // BAD: scans all rows before offset
}

// CURSOR pagination (efficient at any depth):
async function getOrdersCursor(cursor = null, limit = 20) {
  // Decode cursor (base64 encoded JSON in real app)
  const conditions = [ne(orders.status, 'cancelled')];

  if (cursor) {
    const { id, createdAt } = JSON.parse(Buffer.from(cursor, 'base64').toString());
    // Compound cursor: (created_at, id) for stable ordering with ties
    conditions.push(
      or(
        lt(orders.createdAt, new Date(createdAt)),
        and(eq(orders.createdAt, new Date(createdAt)), lt(orders.id, id))
      )
    );
  }

  const rows = await db.select({
    id: orders.id,
    amount: orders.amount,
    status: orders.status,
    createdAt: orders.createdAt
  })
  .from(orders)
  .where(and(...conditions))
  .orderBy(desc(orders.createdAt), desc(orders.id))
  .limit(limit);

  const nextCursor = rows.length === limit
    ? Buffer.from(JSON.stringify({ id: rows.at(-1).id, createdAt: rows.at(-1).createdAt })).toString('base64')
    : null;

  return { orders: rows, nextCursor };
}

// EXAMPLE 2: Window functions with sql\`\` tag

async function getCustomerOrderRankings(customerId) {
  return db.select({
    id: orders.id,
    amount: orders.amount,
    status: orders.status,
    // RANK within this customer's orders by amount:
    amountRank: sql\`RANK() OVER (ORDER BY \${orders.amount}::NUMERIC DESC)\`.mapWith(Number),
    // Running total of this customer's spending:
    runningTotal: sql\`SUM(\${orders.amount}::NUMERIC) OVER (
      ORDER BY \${orders.createdAt}
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )\`.mapWith(Number),
    // Month-over-month comparison (LAG):
    prevMonthAmount: sql\`LAG(\${orders.amount}::NUMERIC, 1) OVER (
      ORDER BY DATE_TRUNC('month', \${orders.createdAt})
    )\`.mapWith(Number)
  })
  .from(orders)
  .where(and(eq(orders.customerId, customerId), ne(orders.status, 'cancelled')))
  .orderBy(desc(orders.createdAt));
}

// EXAMPLE 3: Date spine report using generate_series (requires raw SQL)

async function getDailyRevenue(startDate, endDate) {
  return db.execute(sql\`
    WITH date_spine AS (
      SELECT generate_series(
        \${startDate}::DATE,
        \${endDate}::DATE,
        INTERVAL '1 day'
      )::DATE AS day
    )
    SELECT
      ds.day,
      COALESCE(COUNT(o.id), 0)::INT           AS order_count,
      COALESCE(SUM(o.amount::NUMERIC), 0)     AS revenue,
      COALESCE(AVG(o.amount::NUMERIC), 0)     AS avg_order_value
    FROM date_spine ds
    LEFT JOIN orders o
      ON o.created_at::DATE = ds.day
      AND o.status != 'cancelled'
    GROUP BY ds.day
    ORDER BY ds.day
  \`);
}

// EXAMPLE 4: Dynamic sort direction with sql.raw()

async function getUsers(sortBy = 'createdAt', sortDir = 'desc') {
  // Validate inputs — NEVER directly use user input with sql.raw()
  const allowedSortColumns = { createdAt: users.createdAt, name: users.name, email: users.email };
  const column = allowedSortColumns[sortBy] ?? users.createdAt;
  const direction = sortDir === 'asc' ? sql\`ASC\` : sql\`DESC\`;

  return db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(sql\`\${column} \${direction}\`);
}

// EXAMPLE 5: Full-text search with ts_rank using sql\`\`

async function searchProducts(searchQuery, limit = 20) {
  // Use PostgreSQL full-text search
  const tsQuery = sql\`plainto_tsquery('english', \${searchQuery})\`;

  return db.select({
    id: products.id,
    name: products.name,
    price: products.price,
    relevance: sql\`ts_rank(
      to_tsvector('english', \${products.name} || ' ' || COALESCE(\${products.description}, '')),
      \${tsQuery}
    )\`.mapWith(Number)
  })
  .from(products)
  .where(sql\`
    to_tsvector('english', \${products.name} || ' ' || COALESCE(\${products.description}, ''))
    @@ \${tsQuery}
  \`)
  .orderBy(desc(sql\`ts_rank(
    to_tsvector('english', \${products.name} || ' ' || COALESCE(\${products.description}, '')),
    \${tsQuery}
  )\`))
  .limit(limit);
}

// EXAMPLE 6: CTE with Drizzle's .with() API (v0.29+)

async function getTopSpendersWithOrders(tenantId, limit = 10) {
  const topSpenders = db.\$with('top_spenders').as(
    db.select({
      customerId: orders.customerId,
      totalSpent: sql\`SUM(\${orders.amount}::NUMERIC)\`.mapWith(Number).as('total_spent')
    })
    .from(orders)
    .where(eq(orders.tenantId, tenantId))
    .groupBy(orders.customerId)
    .orderBy(desc(sql\`SUM(\${orders.amount}::NUMERIC)\`))
    .limit(limit)
  );

  return db.with(topSpenders)
    .select({
      customerId: topSpenders.customerId,
      totalSpent: topSpenders.totalSpent,
      customerName: users.name,
      customerEmail: users.email
    })
    .from(topSpenders)
    .innerJoin(users, eq(users.id, topSpenders.customerId));
}

// EXAMPLE 7: Prepared statements for frequently executed queries

// Define prepared statement (parsed and planned once by PostgreSQL):
// const getUserByEmail = db.select()
//   .from(users)
//   .where(eq(users.email, sql.placeholder('email')))
//   .prepare('get_user_by_email');

// Execute many times efficiently:
// const user = await getUserByEmail.execute({ email: 'priya@example.com' });
// const user2 = await getUserByEmail.execute({ email: 'rohan@example.com' });
// Each execution: uses cached query plan. Faster than re-parsing each time.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM PAGINATION AND RAW SQL:
-------------------------------------------------

BUG 1: Offset pagination showing duplicate items on page boundaries — UI confusion
  Scenario: Product listing with offset pagination. User on page 2, new product added at top.
    Page 1: items 1-20. New item inserted → item 20 shifts to page 2.
    User goes to page 2: item 20 appears again (shifted down). Duplicate visible.
    User on page 3: item that was on page 2 (position 21) is now missing.
    Support tickets: "I keep seeing the same product" and "I can't find product X."
  Root cause: Offset pagination is not stable when data changes between page loads.
  Fix: Use cursor pagination for any UI where data changes frequently.
    Or: for catalog browsing where inserts are rare: accept occasional duplicates.
    Or: snapshot the sort position (ORDER BY id, not ORDER BY createdAt where inserts happen).

BUG 2: sql.raw() with user input — SQL injection vulnerability
  Scenario: Sort direction came from query parameter: ?sort=DESC
    db.select().from(products).orderBy(sql.raw(req.query.sort))
    Attacker sent: sort=; DROP TABLE products; --
    SQL executed: ORDER BY ; DROP TABLE products; -- → table deleted.
  Root cause: sql.raw() is NOT parameterized. It injects the string literally into SQL.
  Fix: Validate and map to known safe values:
    const dir = req.query.sort === 'asc' ? sql\`ASC\` : sql\`DESC\`;
    // OR:
    const ALLOWED_DIRS = { asc: asc, desc: desc };
    const sortFn = ALLOWED_DIRS[req.query.sort] ?? desc;
    .orderBy(sortFn(products.name))
  Rule: Never pass user input to sql.raw(). Always validate against an allowlist first.

BUG 3: Cursor with non-unique ORDER BY — cursor "sticks" on ties
  Scenario: Paginating orders sorted by status (many orders have same status = 'pending').
    Cursor: WHERE status >= :lastStatus ORDER BY status — unstable! Multiple rows have same status.
    cursor = 'pending' → next page starts at first 'pending' again → infinite loop!
    "Load more" button showed same orders forever.
  Root cause: Cursor based on non-unique column → ambiguous "starting position."
  Fix: Always include a tie-breaking unique column (usually id):
    ORDER BY status ASC, id ASC
    WHERE (status, id) > (:lastStatus, :lastId)
    cursor = { status: 'pending', id: 12345 }

BUG 4: sql\`\` tag in .where() with OR logic — incorrect parameterization
  Scenario: Developer wrote:
    .where(sql\`\${users.email} = \${email} OR \${users.phone} = \${phone}\`)
    Appeared to work. Under edge cases, users could log in with each other's phones.
    
    Actual SQL: "users"."email" = $1 OR "users"."phone" = $2 → CORRECT
    
    The bug was different: developer cached the prepared statement globally and reused it
    with different email/phone combinations. The prepare() call shared parameter names,
    causing param leakage between requests under concurrent load.
  Fix: Use Drizzle's typed helpers instead of raw sql\`\` for standard conditions:
    .where(or(eq(users.email, email), eq(users.phone, phone)))
    Type-safe, correct, no raw string manipulation.

BUG 5: Missing .mapWith() on aggregates — returns string instead of number
  Scenario: Revenue calculation:
    const result = await db.select({
      total: sql\`SUM(amount)\`
    }).from(orders);
    const tax = result[0].total * 0.18; // ₹1000.00 * 0.18 = NaN!
    // result[0].total = '1000.00' (string from PostgreSQL driver)
    // '1000.00' * 0.18 = NaN (can't multiply string by number)
    
    Email sent to customer: "Your tax is ₹NaN"
  Root cause: SQL aggregates (SUM, AVG, COUNT) return strings from the pg driver.
    Without .mapWith(Number): Drizzle preserves the string type.
  Fix:
    total: sql\`SUM(amount::NUMERIC)\`.mapWith(Number)
    // Or:
    total: sql\`SUM(amount)\`.mapWith(v => parseFloat(v as string))
    Always add .mapWith(Number) to any aggregate that should be a number.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE BEHAVIOR:
  You have an orders table with 1,000,000 rows, sorted by created_at DESC.

  Query A (offset):
  db.select().from(orders).orderBy(desc(orders.createdAt)).limit(20).offset(50000)

  Query B (cursor):
  db.select().from(orders)
    .where(lt(orders.id, 950000))
    .orderBy(desc(orders.id))
    .limit(20)

  Indexes available: PRIMARY KEY on id, index on created_at DESC.

  a) How many rows does PostgreSQL actually scan for Query A? For Query B?
  b) Query A vs B — which is faster at offset=50000? By roughly how much?
  c) If created_at has many ties (all same day), why would using id as cursor tie-breaker be critical?
  d) A user is on "page 2500" (offset 50000). They leave for 2 hours, come back.
     1000 new orders were inserted. What happens with Query A? With Query B?

CHALLENGE 2 — FIX THE RAW SQL SECURITY BUG:
  This search endpoint has a SQL injection vulnerability. Find and fix it.

  async function searchOrders(filterField, filterValue, sortField, sortDir) {
    // Bug: all parameters directly used in raw SQL
    return db.execute(sql\`
      SELECT id, amount, status, created_at
      FROM orders
      WHERE \${sql.raw(filterField)} = \${filterValue}
      ORDER BY \${sql.raw(sortField)} \${sql.raw(sortDir)}
      LIMIT 100
    \`);
  }

  // Attacker calls:
  // searchOrders("id; DROP TABLE orders; --", "1", "id", "ASC")
  // searchOrders("id", "1", "id", "ASC; DROP TABLE orders; --")

  a) Which parameter is dangerous and why?
  b) Write the fixed version using:
     - Drizzle column references instead of sql.raw for column names
     - Validated allowlist for sort direction
     - Parameterized values for filter value
  c) What if filterField needs to be dynamic (user can filter by any column)?
     How do you safely support this?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete paginated search API for an analytics dashboard.

  The API: GET /analytics/orders?page=1&sort=revenue&dir=desc&status=delivered&dateFrom=2024-01-01

  Requirements:
  1. Cursor pagination with compound cursor (date + id) — not offset
  2. Optional filters: status, dateFrom, dateTo, minAmount, maxAmount
  3. Sort by: revenue (sum of amount), orderCount, or customerName — dynamic
  4. Include window function: revenue_rank (DENSE_RANK by revenue among all results)
  5. Include a 30-day rolling average revenue (window function)
  6. Return: { data: [...], nextCursor: string|null, total: number }

  Extra: How would you add full-text search on customer name and order notes?
  Show the ts_rank-based relevance scoring using sql\`\`.
    `,
    summary: `Cursor-based pagination and the sql\`\` tagged template are the two tools that make Drizzle viable for production systems at scale. Cursor pagination is non-negotiable for any table over 100K rows where users paginate deeply. The sql\`\` tag is your escape hatch for every SQL feature the ORM doesn't expose — window functions, CTEs, generate_series, full-text search — while keeping values parameterized and injection-safe. Always validate dynamic column/direction inputs against an explicit allowlist before using sql.raw().`
  },

  {
    id: 5,
    title: "N+1 Problem, Relations & Eager Loading",
    tag: "THE PERFORMANCE KILLER HIDING IN YOUR ORM CODE",
    color: "#BE123C",
    tldr: `The N+1 problem is the most common ORM-induced performance disaster: instead of one query that fetches all needed data, the code runs 1 query to get N parent records, then N more queries to get the related data — 1+N queries total. Drizzle's relations API with with() prevents N+1 at the ORM level. For the query builder, explicit JOINs are the solution. Detecting N+1 requires query count logging during development — it's otherwise invisible until production load reveals it.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My endpoint works in development but crushes the database in production with 50 users"
  → Classic N+1: "Get 50 orders with their customer names."
  → Dev: 50 orders, code runs 51 queries. Looks fine (51ms).
  → Production: 10,000 orders, code runs 10,001 queries. 10 seconds. DB at 100% CPU.
  → The problem was always there — scale just made it visible.

"I'm using Drizzle's with() but my query still shows N queries in logs — why?"
  → with() is part of the RELATIONAL QUERIES API (db.query.*), not the query builder (db.select.*).
  → If you're using db.select().from(orders) and then accessing .customer: that's the query builder.
    Query builder has no auto-join. You must explicitly .leftJoin().
  → db.query.orders.findMany({ with: { customer: true } }): uses relational API → single JOIN query.

"How do I even detect N+1? It doesn't throw an error."
  → N+1 is invisible without query counting. Enable Drizzle logger: { logger: true } in drizzle().
  → Watch the query count in development for each endpoint.
  → Or: use middleware that counts queries per request and logs if count > threshold.
  → In production: pg_stat_statements shows queries with same template executed thousands of times.

"Drizzle's with() vs a manual JOIN — which is better?"
  → with() (relational API): returns nested objects. Excellent DX. Handles one-to-many naturally.
    Generates: either a JOIN or a batched IN query. Controlled by mode: 'relational' or 'default'.
  → Manual JOIN (query builder): returns flat rows. Need to de-nest manually. More control over SQL.
  → For standard nested object retrieval: with(). For custom queries (aggregates, filters on relation): JOIN.

"What is the 'SELECT IN' strategy vs JOIN strategy in Drizzle relations?"
  → Drizzle has two strategies for with():
  → JOIN: SELECT orders.*, users.* FROM orders LEFT JOIN users ON ... — one big flat result, re-nested.
  → SELECT IN: SELECT * FROM orders; then SELECT * FROM users WHERE id IN (1,2,3,...) — two queries, no JOIN.
  → SELECT IN avoids the cartesian product problem (parent with many children = duplicated parent rows).
  → Default Drizzle uses JOIN. Can control via { mode: 'default' } on db.query configuration.
    `,
    analogy: `
THE RESTAURANT ORDERING ANALOGY:
----------------------------------
You're managing a waiter who takes orders for a table of 10 people.

THE N+1 WAITER:
  1. Waiter goes to table, gets list of 10 people.        (1 query: "get all customers")
  2. Goes back to kitchen for person 1's food.            (query 2)
  3. Comes back, goes to kitchen for person 2's food.     (query 3)
  4. Comes back, goes to kitchen for person 3's food.     (query 4)
  ... 10 trips to kitchen total for 10 people ...
  Total: 11 trips (1 + N). Each trip = round trip to the kitchen = network round trip to DB.
  A table of 1000 people? 1001 trips. Customers starving.

THE EFFICIENT WAITER (JOIN / with()):
  1. Waiter goes to table, gets list of 10 people AND all their orders simultaneously.
     "Table 5 wants: [Priya: pasta, Rohan: pizza, Arjun: salad, ...]"  (1 query with JOIN)
  2. One trip to kitchen with all orders.
  3. One delivery with all food.
  Total: 1 trip. Same result. Everyone fed.

THE BATCH WAITER (SELECT IN strategy):
  1. Waiter gets list of 10 people (1 query).
  2. Waiter writes down all 10 people's IDs on one slip: "IDs 1,2,3,4,5,6,7,8,9,10"
  3. One trip to kitchen: "Give me food for ALL of these people at once." (1 IN query)
  4. One delivery.
  Total: 2 trips. More than JOIN (2 vs 1) but better than N+1 (2 vs 11).
  Advantage: no cartesian product — if each person had 10 items: JOIN = 100 rows; IN = 10+10 rows.

DETECTING N+1 = COUNTING KITCHEN TRIPS:
  Without logging: you only notice when the restaurant has 1000 tables and the kitchen collapses.
  With logging: each waiter has a counter. "That waiter made 1001 trips for one table!?"
  
  Drizzle logger:
    drizzle(db, { logger: true }) → logs every SQL query to console.
    1 log entry = 1 kitchen trip. Count them per request.
  
  The rule: for a page that shows N records, you should see 1-3 log entries, not N+1.
  If you see the SAME query repeated N times with different IDs: N+1 detected!

FIXING N+1 = HIRING THE RIGHT KIND OF WAITER:
  Fix 1 — Relations with(): "use the efficient waiter" → db.query.orders.findMany({ with: { customer: true } })
  Fix 2 — Explicit JOIN: "teach the waiter to carry multiple orders" → db.select().from(orders).leftJoin(users, ...)
  Fix 3 — Batch fetch + merge: "use the batch waiter" → fetch all orders, collect IDs, one IN query for customers
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — N+1 DETECTION AND DRIZZLE RELATIONS:
----------------------------------------------------------------

HOW N+1 HAPPENS IN DRIZZLE:
  // N+1 example with query builder (naive pattern):
  const allOrders = await db.select().from(orders).limit(100);
  // ^ 1 query: SELECT * FROM orders LIMIT 100
  
  for (const order of allOrders) {
    const [customer] = await db.select().from(users).where(eq(users.id, order.customerId));
    // ^ N queries: SELECT * FROM users WHERE id = $1 — called 100 times!
    console.log(customer.name, order.amount);
  }
  // Total: 101 queries for 100 orders.
  
  This is the textbook N+1. It happens whenever you:
  1. Fetch a list of records.
  2. Loop over them and fetch related records one by one.

DRIZZLE RELATIONAL QUERIES API (db.query.*):
  The relational API requires:
  1. Relations defined in schema with relations() helper.
  2. DB initialized with full schema: drizzle(client, { schema: { users, orders, usersRelations, ordersRelations } })
  
  Usage:
    db.query.orders.findMany({ ... })
    db.query.orders.findFirst({ ... })
  
  Options:
    where: filter conditions (using same helpers as query builder)
    with: eager-load related records (NO N+1 — generates JOIN or batched query)
    columns: select specific columns only
    extras: add sql\`\` expressions
    orderBy: sort
    limit / offset: pagination
  
  with() deep nesting:
    db.query.orders.findMany({
      with: {
        customer: {
          columns: { name: true, email: true },
          with: { address: true }  // Nested relation
        },
        items: {
          with: { product: { columns: { name: true, price: true } } }
        }
      }
    })
    Generates: either nested JOINs or batched SELECTs — never N+1.

SQL GENERATED BY DRIZZLE RELATIONAL QUERIES:
  For one-to-one (order → customer):
    Single JOIN: SELECT orders.*, users.name, users.email FROM orders
      LEFT JOIN users ON orders.customer_id = users.id WHERE ...
    Flat result re-nested into: { id, amount, customer: { name, email } }
  
  For one-to-many (order → items) with mode that avoids cartesian:
    Two queries: SELECT * FROM orders; SELECT * FROM order_items WHERE order_id IN (1,2,3,...)
    Drizzle merges in JavaScript: { id, items: [...] }
  
  The JOIN strategy for one-to-many with large children sets:
    100 orders × 20 items each = 2000 rows in JOIN result
    SELECT IN strategy: 100 + 2000 = 2100 rows BUT in two clean queries, no parent duplication.

DETECTING N+1 IN PRACTICE:
  Method 1 — Drizzle logger (development):
    const db = drizzle(client, { logger: true });
    // Watch console: each query logged. Count per request = query count.
  
  Method 2 — Custom query counter middleware:
    let queryCount = 0;
    const instrumentedDb = drizzle(client, {
      logger: { logQuery(query, params) { queryCount++; console.log(query); } }
    });
    // Before request: queryCount = 0. After: log if queryCount > threshold.
  
  Method 3 — pg_stat_statements in production:
    SELECT calls, query FROM pg_stat_statements
    WHERE query LIKE '%users WHERE id = $1%'
    ORDER BY calls DESC LIMIT 10;
    // calls = 50,000 for "SELECT * FROM users WHERE id = $1" → N+1 in production!

FIXING N+1 — THREE APPROACHES:
  Approach 1: Drizzle relational API (best for standard nested objects):
    const orders = await db.query.orders.findMany({
      limit: 100,
      with: { customer: { columns: { name: true } } }
    });
    // 1 query. orders[0].customer.name — works. No N+1.
  
  Approach 2: Explicit JOIN in query builder (best for custom queries with filters on relations):
    const orders = await db.select({
      orderId: orders.id, amount: orders.amount,
      customerName: users.name
    })
    .from(orders)
    .leftJoin(users, eq(orders.customerId, users.id))
    .limit(100);
    // 1 query. Flat result: { orderId, amount, customerName }.
  
  Approach 3: Manual batch fetch (for complex cases):
    const allOrders = await db.select().from(orders).limit(100);
    const customerIds = [...new Set(allOrders.map(o => o.customerId))];
    const customers = await db.select().from(users).where(inArray(users.id, customerIds));
    const customerMap = new Map(customers.map(c => [c.id, c]));
    const enriched = allOrders.map(o => ({ ...o, customer: customerMap.get(o.customerId) }));
    // 2 queries. Efficient. Useful when you need custom logic in the merge step.

PRISMA N+1 NOTES:
  Prisma does NOT have lazy loading — accessing a relation not included throws/returns undefined.
  This prevents one class of N+1 (the accidental lazy-load kind).
  But: explicit loops with prisma.user.findUnique() per item still cause N+1.
  Prisma fix: include: { customer: { select: { name: true } } }
  Or: use prisma.customer.findMany({ where: { id: { in: customerIds } } }) for batch.
    `,
    code: `
// ===== N+1 PROBLEM, RELATIONS & EAGER LOADING — EXAMPLES =====

// EXAMPLE 1: Classic N+1 — the problem (DO NOT DO THIS)

// The N+1 pattern:
async function getOrdersWithCustomers_BAD() {
  // Query 1: fetch 100 orders
  const allOrders = await db.select().from(orders).limit(100);

  const results = [];
  for (const order of allOrders) {
    // Queries 2-101: one per order! 100 separate DB round trips!
    const [customer] = await db.select({
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, order.customerId));

    results.push({ ...order, customer });
  }
  return results;
  // Total: 101 queries. At 10,000 orders → 10,001 queries. Production disaster.
}

// EXAMPLE 2: Fix N+1 using Drizzle relational API (db.query.*)

// Schema must have relations defined. DB must include schema in drizzle() init.
// const db = drizzle(client, { schema });

async function getOrdersWithCustomers_GOOD_RELATIONS() {
  return db.query.orders.findMany({
    limit: 100,
    orderBy: desc(orders.createdAt),
    with: {
      customer: {                    // Eager-load: NO N+1
        columns: { name: true, email: true }  // Only fetch needed columns
      }
    }
  });
  // Returns: [{ id, amount, status, customer: { name, email } }, ...]
  // 1 query total. customer is nested inside each order.
}

// EXAMPLE 3: Fix N+1 using explicit JOIN (query builder)

async function getOrdersWithCustomers_GOOD_JOIN() {
  const rows = await db.select({
    orderId: orders.id,
    orderAmount: orders.amount,
    orderStatus: orders.status,
    orderCreatedAt: orders.createdAt,
    customerName: users.name,
    customerEmail: users.email,
    customerId: users.id
  })
  .from(orders)
  .leftJoin(users, eq(orders.customerId, users.id))
  .limit(100)
  .orderBy(desc(orders.createdAt));

  // Flat result — customer fields are on the same object as order fields
  // Re-nest if needed:
  return rows.map(row => ({
    id: row.orderId,
    amount: row.orderAmount,
    status: row.orderStatus,
    createdAt: row.orderCreatedAt,
    customer: row.customerId ? { id: row.customerId, name: row.customerName, email: row.customerEmail } : null
  }));
}

// EXAMPLE 4: Deep nested relations (orders with items with products)

async function getOrdersWithItems() {
  return db.query.orders.findMany({
    limit: 20,
    where: eq(orders.status, 'pending'),
    with: {
      customer: {
        columns: { name: true, email: true }
      },
      items: {                        // One order → many items
        with: {
          product: {                  // Each item → one product
            columns: { name: true, price: true, stock: true }
          }
        }
      }
    },
    orderBy: asc(orders.createdAt)
  });
  // Returns: [{ id, amount, customer: {...}, items: [{ quantity, product: {...} }, ...] }]
  // Drizzle generates: JOIN for customer, batched IN query for items+products. No N+1.
}

// EXAMPLE 5: N+1 detection — query counter middleware

// Utility to count queries in a request:
function createInstrumentedDb(baseDb) {
  let queryCount = 0;
  const queries = [];

  // Wrap db with a proxy that counts queries
  // (In real app: use Drizzle's logger option)
  const db = drizzle(client, {
    logger: {
      logQuery(query, params) {
        queryCount++;
        queries.push({ query: query.substring(0, 100), params });
      }
    }
  });

  return {
    db,
    getStats: () => ({ queryCount, queries }),
    reset: () => { queryCount = 0; queries.length = 0; }
  };
}

// Express middleware example:
// app.use((req, res, next) => {
//   const startQueries = getQueryCount();
//   res.on('finish', () => {
//     const endQueries = getQueryCount();
//     const count = endQueries - startQueries;
//     if (count > 10) {
//       console.warn(\`N+1 WARNING: \${req.path} executed \${count} queries!\`);
//     }
//   });
//   next();
// });

// EXAMPLE 6: Manual batch fetch (when relational API isn't flexible enough)

async function getOrdersWithCustomerData(filters) {
  // Step 1: fetch orders with filters
  const ordersResult = await db.select({
    id: orders.id, amount: orders.amount, status: orders.status,
    customerId: orders.customerId, createdAt: orders.createdAt
  })
  .from(orders)
  .where(and(...filters))
  .limit(100);

  if (ordersResult.length === 0) return [];

  // Step 2: batch fetch all customers at once (one query, not N queries)
  const customerIds = [...new Set(ordersResult.map(o => o.customerId))];
  const customersResult = await db.select({
    id: users.id, name: users.name, email: users.email, phone: users.phone
  })
  .from(users)
  .where(inArray(users.id, customerIds));

  // Step 3: build lookup map and merge
  const customerMap = new Map(customersResult.map(c => [c.id, c]));

  return ordersResult.map(order => ({
    ...order,
    customer: customerMap.get(order.customerId) ?? null
  }));
  // Total: 2 queries regardless of how many orders. O(1) query count.
}

// EXAMPLE 7: Prisma equivalent — include to prevent N+1

// Prisma N+1 (BAD):
// const orders = await prisma.order.findMany({ take: 100 });
// for (const order of orders) {
//   const customer = await prisma.user.findUnique({ where: { id: order.customerId } });
//   // N+1!
// }

// Prisma fix — include:
// const orders = await prisma.order.findMany({
//   take: 100,
//   include: {
//     customer: { select: { name: true, email: true } },
//     items: {
//       include: { product: { select: { name: true, price: true } } }
//     }
//   },
//   orderBy: { createdAt: 'desc' }
// });
// 1-3 queries. No N+1. orders[0].customer.name works.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM N+1 AND RELATION ISSUES:
---------------------------------------------------

BUG 1: N+1 in admin dashboard — 10,000 queries per page load
  Scenario: Admin dashboard showed "orders with customer names and product counts."
    Developer wrote: fetch all orders, loop, fetch customer per order, fetch item count per order.
    In development with 20 orders: 41 queries — looked fine, < 100ms.
    In production with 10,000 orders: 20,001 queries. Page took 45 seconds. DB CPU: 100%.
    Other users experienced slowness across the whole application.
  Root cause: N+1 invisible in dev. Scale in production exposed it.
  Fix:
    db.query.orders.findMany({
      with: { customer: { columns: { name: true } } },
      extras: { itemCount: sql\`(SELECT COUNT(*) FROM order_items WHERE order_id = \${orders.id})\`.mapWith(Number) }
    })
    Or: JOIN with COUNT aggregate. 1 query for all data.

BUG 2: with() used on query builder (db.select()) instead of relational API — silent failure
  Scenario: Developer tried:
    db.select().from(orders).with({ customer: true }) // ← WRONG: .with() doesn't exist on query builder
    TypeScript: "Property 'with' does not exist on type..." → Error (caught early).
    BUT: developer "fixed" it by casting: (db.select().from(orders) as any).with(...)
    Returned orders with no customer field. Application crashed at runtime when accessing .customer.name.
  Root cause: Confusion between the two Drizzle APIs:
    Query builder: db.select().from().leftJoin() — no .with()
    Relational API: db.query.orders.findMany({ with: {} }) — has .with()
  Fix: Use the correct API for the use case.
    If you need .with() with nested eager loading: use db.query.* (relational API).
    If you need custom SELECT columns with JOIN: use db.select().from().leftJoin().

BUG 3: Relational API schema not passed to drizzle() — "table does not exist" error
  Scenario: Schema had relations defined. But:
    const db = drizzle(client); // Missing schema!
    db.query.orders.findMany({ with: { customer: true } });
    // Runtime error: "db.query.orders is not defined"
  Root cause: Drizzle's relational API requires the schema (including relations) to be passed
    to the drizzle() initialization call:
    const db = drizzle(client, { schema }); // CORRECT
    Without schema: db.query.* is not available.
  Fix: Import all tables and relations, pass as schema:
    // import * as schema from './schema';
    const db = drizzle(client, { schema });

BUG 4: with() on one-to-many returning unexpectedly large response — cartesian effect
  Scenario: Orders with items. Order had 100 items each. Fetching 100 orders with items:
    db.query.orders.findMany({ limit: 100, with: { items: true } })
    Drizzle used JOIN strategy. Result: 100 × 100 = 10,000 rows joined, de-nested into 100 orders.
    10,000 rows transferred, 100 orders returned. 100× more data than needed.
    Memory spike in Lambda. Response time: 3 seconds.
  Root cause: JOIN strategy for one-to-many with large child sets = cartesian result.
  Fix: Drizzle should automatically use batched SELECT for large one-to-many relations.
    For very large datasets: manually batch:
    1. Fetch 100 orders (1 query).
    2. Fetch items WHERE order_id IN ([100 IDs]) (1 query).
    3. Merge in JavaScript.
    Total: 2 queries, 100 + 10,000 = 10,100 rows in two round trips vs 10,000 in one JOIN.
    Better yet: paginate the items — rarely need all 100 items at once.

BUG 5: Missing inArray import — batch fix compiles but crashes at runtime
  Scenario: Developer fixed N+1 with manual batch fetch:
    const customers = await db.select().from(users).where(inArray(users.id, customerIds));
    TypeScript: no error (inArray imported? Let's check...).
    Runtime: "inArray is not a function" → TypeError. 500 response.
    The N+1 fix worked in dev tests (small datasets, inArray codepath not hit).
    But in production with > 1 customer: crash.
  Root cause: inArray not imported from 'drizzle-orm'. Tree-shaking removed it.
    // Missing: import { inArray } from 'drizzle-orm';
  Fix: Ensure all helpers are explicitly imported:
    // import { and, eq, inArray, isNull, desc, count, sql } from 'drizzle-orm';
    Use TypeScript's "no-implicit-any" and strict mode to catch runtime issues earlier.
    Better yet: write tests that exercise the code path with N > 1 related records.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — COUNT THE QUERIES:
  Given this Drizzle code, count the number of database queries that execute.
  Explain what SQL each query is.

  Snippet A:
  const allProducts = await db.query.products.findMany({ limit: 50 });
  for (const product of allProducts) {
    const reviews = await db.select().from(productReviews)
      .where(eq(productReviews.productId, product.id));
    product.reviews = reviews;
  }
  // a) Query count: ___  b) Is this N+1? c) What's the fix?

  Snippet B:
  const orders = await db.query.orders.findMany({
    limit: 50,
    with: {
      customer: { columns: { name: true } },
      items: { with: { product: { columns: { name: true } } } }
    }
  });
  // a) Query count: ___ (exactly or estimate — explain why)
  // b) What are the queries?

  Snippet C:
  const customers = await db.select({ id: users.id, name: users.name }).from(users).limit(10);
  const customerIds = customers.map(c => c.id);
  const orders = await db.select().from(orders).where(inArray(orders.customerId, customerIds));
  const orderMap = new Map();
  orders.forEach(o => {
    if (!orderMap.has(o.customerId)) orderMap.set(o.customerId, []);
    orderMap.get(o.customerId).push(o);
  });
  // a) Query count: ___  b) N+1? c) This pattern is called what?

CHALLENGE 2 — FIX THE N+1:
  This product catalog page has an N+1. Fix it two ways.

  async function getProductCatalog() {
    const products = await db.select({
      id: products.id, name: products.name, price: products.price
    }).from(products).where(eq(products.isActive, true)).limit(20);

    // N+1: fetching category name for each product
    const enriched = await Promise.all(products.map(async (product) => {
      const [category] = await db.select({ name: categories.name })
        .from(categories).where(eq(categories.id, product.categoryId));

      const reviewStats = await db.select({
        avgRating: sql\`AVG(rating)\`.mapWith(Number),
        count: count()
      }).from(reviews).where(eq(reviews.productId, product.id));

      return { ...product, categoryName: category?.name, ...reviewStats[0] };
    }));

    return enriched;
  }

  Fix 1: Using db.query.* relational API with with()
  Fix 2: Using a single SQL query with JOINs and aggregates

  Which fix is better? Under what circumstances would each be preferred?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a social feed feature for an app (like LinkedIn's news feed).

  Schema: users, posts, comments, likes, user_follows (who follows whom)

  Implement:
  1. getFeed(userId, cursor, limit=20):
     - Returns posts from users that userId follows
     - Each post includes: author name + avatar, like count, comment count, first 3 comments with author names
     - Cursor-based pagination
     - ZERO N+1 queries (maximum 3-4 total queries for the whole request)
     - Use a combination of with() for nested relations and batch fetch for counts

  2. Write the query count assertion test:
     - Instruments the db to count queries
     - Calls getFeed with a test user following 100 users with 5 posts each
     - Asserts that query count <= 4

  3. Explain: for this use case (social feed with aggregates), would you use:
     - Drizzle relational API with with()
     - Manual JOINs with aggregates
     - A mix of both (which parts use which?)
     Justify your choice with query count and SQL complexity reasoning.
    `,
    summary: `The N+1 problem is silent, invisible in development, and catastrophic under production load — it's the most important ORM performance problem to internalize. The complete defense strategy: always enable Drizzle's query logger during development and count queries per request, use db.query.* with with() for nested object retrieval, use explicit JOINs with aggregates for analytics queries, and never loop over query results making per-row database calls. If you see the same query template repeated in your logs, you have N+1 — fix it before it reaches production.`
  }
];

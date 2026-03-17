const concepts = [
  {
    id: 1,
    title: "How Databases Work Internally",
    tag: "WHAT HAPPENS WHEN YOU HIT ENTER",
    color: "#1D4ED8",
    tldr: `PostgreSQL doesn't read or write individual rows directly to disk — it works in 8KB pages, using a buffer pool to keep hot data in RAM. Every write is first recorded in the Write-Ahead Log (WAL) so crashes can be recovered cleanly. Understanding this mechanical reality — how data moves between disk, RAM, and the WAL — fundamentally changes how you design schemas and write queries.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Why is my query slow even though I have an index?"
  → The index fits in RAM but the actual rows don't. Every index hit triggers a random I/O
    to fetch the heap page. 1000 index hits = 1000 random I/Os = potentially 5-10 seconds.
  → Solution: covering index (keep all needed columns in the index), or sequential scan may be faster.

"Why does PostgreSQL eat disk space even after I DELETE millions of rows?"
  → DELETE doesn't reclaim space. It marks rows as "dead" (MVCC tombstoning).
  → Dead tuples accumulate until VACUUM runs and reclaims them.
  → A table with 10M rows but 8M dead tuples can be 5× larger than necessary.

"Why does a machine with 128GB RAM still have slow queries on a 10GB database?"
  → Buffer pool (shared_buffers) might be set to PostgreSQL's default: 128MB.
  → Only 128MB of the 128GB is used for database page caching.
  → Fix: set shared_buffers = 32GB (25% of RAM), effective_cache_size = 96GB.

"My INSERT is fine alone but 10,000 concurrent INSERTs slow the whole system"
  → Each INSERT triggers WAL writes (fsync). WAL is sequential but still has fsync overhead.
  → Checkpoints flush dirty pages to disk; if checkpoints too frequent → I/O storm.
  → Fix: increase checkpoint_completion_target, use bulk INSERT or COPY.

"Why does UPDATE cost twice as much as INSERT in PostgreSQL?"
  → PostgreSQL UPDATE = INSERT new version + mark old version dead. Two operations, not one.
  → This is MVCC (Multi-Version Concurrency Control): readers never block writers.
  → The cost: more dead tuples → VACUUM runs more often → more I/O overhead.
    `,
    analogy: `
THE LIBRARY WAREHOUSE ANALOGY:
--------------------------------
PostgreSQL is a giant library warehouse. Let's trace what happens when you run a query.

THE WAREHOUSE (Disk — heap files):
  Books (rows) are stored on shelves (disk pages, 8KB each).
  Each shelf holds ~10-50 books depending on book size.
  The warehouse has millions of shelves. Reading from the warehouse is SLOW (disk I/O).
  Fetching a shelf takes ~5ms (HDD) or ~0.1ms (NVMe SSD).

THE READING ROOM (Buffer Pool — shared_buffers):
  A reading room holds the most recently requested shelves (hot pages in RAM).
  Reading from the reading room is INSTANT (~100 nanoseconds).
  If someone requests a book: check reading room first. If not there: fetch from warehouse.
  Buffer pool hit ratio: 99%+ for healthy systems. Cache miss = trip to warehouse.

THE CATALOG (Index):
  Instead of scanning all shelves, the catalog (index) says "book #42 is on shelf 7, slot 3."
  Fast to find: O(log n) catalog lookup. But you still need to go get the actual book from the shelf.
  If the shelf is already in the reading room: instant. If not: warehouse trip.

THE CHANGE LOG (WAL — Write-Ahead Log):
  Before modifying any shelf, a librarian writes in a sequential change log:
  "Shelf 7, slot 3: change title from X to Y."
  If the library burns down mid-modification: replay the change log on the backup copy → full recovery.
  The log is SEQUENTIAL WRITES (fast). The actual shelf modification can happen later (lazy writes).

THE JANITOR (VACUUM):
  Books don't get removed immediately — they get a sticky note: "DEAD — from transaction #5001."
  Dead books still occupy shelf space. The janitor (VACUUM) periodically sweeps through,
  physically removes dead books, and reclaims empty slots for new books.
  No janitor → shelves fill with dead books → new books can't fit → table bloat.

SEQUENTIAL vs RANDOM I/O:
  Sequential read: reading shelves 1, 2, 3, 4, 5 in order. The warehouse elevator pre-loads the next shelf.
  Disk pre-fetch: very fast — reading 1MB sequentially ≈ 1ms on SSD.
  
  Random read: index says "go to shelf 7, then 2401, then 893, then 15002."
  No pre-fetch benefit. Each trip: 0.1ms (SSD) × 1000 trips = 100ms for 1000 rows.
  
  This is why a full table scan (sequential) can beat an index scan (random) for large result sets!
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — POSTGRESQL INTERNALS:
-------------------------------------------------

HEAP FILES AND PAGES:
  PostgreSQL stores each table as one or more heap files on disk.
  Each file is divided into 8KB pages (blocks). This is the fundamental unit of I/O.
  
  Page layout:
    [PageHeader 24 bytes][ItemIDs array (4 bytes each)][Free space][Tuple data (grows inward)]
  
  PageHeader contains:
    - pd_lsn: Log Sequence Number of last WAL record for this page
    - pd_lower: pointer to start of free space (after last ItemID)
    - pd_upper: pointer to end of free space (before last tuple)
    - pd_special: pointer to special space (for index pages)
  
  ItemID (line pointer): 4 bytes pointing to a tuple's offset within the page.
  Tuple (row): Contains system columns (xmin, xmax, ctid) + user data.
    xmin: transaction ID that inserted this row
    xmax: transaction ID that deleted/updated this row (0 if live)
    ctid: (page, slot) physical location — changes on UPDATE (new version created elsewhere)

MVCC (MULTI-VERSION CONCURRENCY CONTROL):
  PostgreSQL never overwrites rows in place. Every UPDATE:
    1. Creates a NEW tuple with xmin = current_txn, old tuple gets xmax = current_txn.
    2. Indexes point to the NEW tuple's ctid.
    3. Old tuple: visible only to transactions that started before the UPDATE.
  
  This enables:
    - Readers and writers never block each other.
    - Each transaction sees a consistent snapshot of the database.
    - Time-travel queries (AS OF SYSTEM TIME in some databases).
  
  Cost: dead tuples accumulate until VACUUM.
  
  Visibility rule: a tuple is visible to transaction T if:
    xmin committed before T started AND (xmax is 0 OR xmax started after T started)

BUFFER POOL (shared_buffers):
  All page I/O goes through the buffer pool. PostgreSQL manages its own page cache
  (separate from OS page cache — double caching is why effective_cache_size guidance exists).
  
  When a page is requested:
    1. Check buffer pool hash table: O(1) lookup.
    2. Hit: return pointer to page in RAM. Zero disk I/O.
    3. Miss: find a free buffer (LRU eviction if pool full), load page from disk.
  
  Clock sweep algorithm: each buffer has a "usage count" (0-5).
    On cache miss: sweep clock hand, decrement usage count.
    Evict first buffer with usage count = 0.
    This is cheaper than pure LRU (no per-access lock required).
  
  Tuning:
    shared_buffers: PostgreSQL's own cache (set to 25% of RAM as starting point).
    effective_cache_size: hint to query planner about total available cache (75% of RAM).
    work_mem: per-sort/hash operation memory (multiplied by max parallel workers!).

WAL (WRITE-AHEAD LOG):
  Before any page modification, the change is written to WAL (pg_wal/ directory).
  WAL records are sequential writes — the fastest type of disk write.
  
  WAL write flow:
    1. Transaction begins.
    2. All changes buffered in WAL buffer (wal_buffers, default 64KB or 1/32 shared_buffers).
    3. At COMMIT: WAL buffer flushed to WAL file (fsync). This is the durability guarantee.
    4. Actual data pages written lazily by background writer and checkpointer.
  
  Crash recovery:
    1. Read last checkpoint LSN from pg_control.
    2. Replay all WAL records after that LSN.
    3. Apply each WAL record to restore modified pages.
    4. Database is consistent — not one byte lost from committed transactions.
  
  WAL is also used for:
    Replication (streaming WAL to standbys)
    Point-in-time recovery (PITR) — replay WAL to any point in time
    Logical decoding (change data capture / CDC)

VACUUM AND AUTOVACUUM:
  VACUUM tasks:
    1. Mark dead tuples' space as reusable (free space map update).
    2. Update visibility map (pages with all-live tuples can skip during index-only scans).
    3. Advance oldest_xmin to prevent transaction ID wraparound.
  
  VACUUM FULL: rewrites entire table — reclaims disk space but locks the table. Avoid in production.
  VACUUM (regular): reclaims space for reuse but doesn't shrink the file. No lock on table.
  AUTOVACUUM: daemon that monitors pg_stat_user_tables.n_dead_tup and triggers when threshold crossed.
    Threshold: autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × n_live_tup
    Default: 50 + 0.2 × n_live_tup (20% dead tuples triggers vacuum).
  
  Transaction ID Wraparound:
    Transaction IDs are 32-bit (4 billion total). After 2 billion transactions from oldest xmin,
    PostgreSQL will REFUSE new transactions with "database is not accepting commands to avoid
    wraparound data loss" — production outage.
    Prevention: ensure autovacuum runs regularly. Monitor: SELECT age(datfrozenxid) FROM pg_database;

SEQUENTIAL vs RANDOM I/O — THE DESIGN IMPACT:
  Rule: Disk seeks are expensive. Sequential reads are cheap.
  
  Consequences for schema/query design:
  1. Table scans beat index scans for >5-10% of table rows (random I/O overhead).
     Planner uses: seq_page_cost (1.0) vs random_page_cost (4.0 HDD, 1.1 SSD).
  2. Clustered data (rows inserted in access order) = sequential reads = fast.
     CLUSTER table ON index or use BRIN indexes for naturally ordered data (timestamps, IDs).
  3. Wide rows = fewer rows per page = more I/O per query.
     Keep frequently queried columns narrow. Move BLOBs to object storage.
  4. Hot pages stay in buffer pool. Cold pages evict. Query patterns determine which pages are "hot."
    `,
    code: `
// ===== HOW DATABASES WORK INTERNALLY — SQL & CONFIG EXAMPLES =====

-- EXAMPLE 1: Observing buffer pool hit ratio
-- If cache_hit_ratio < 99%, consider increasing shared_buffers

SELECT
  sum(heap_blks_read)  AS heap_read,   -- Pages read from disk
  sum(heap_blks_hit)   AS heap_hit,    -- Pages found in buffer pool (RAM)
  round(
    sum(heap_blks_hit)::numeric
    / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100,
    2
  ) AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Expected result for healthy system:
-- heap_read | heap_hit | cache_hit_ratio
-- 12043     | 4829301  | 99.75
-- If ratio < 95%: increase shared_buffers or add RAM

-- EXAMPLE 2: Finding dead tuple bloat — tables that need VACUUM
-- Scenario: Swiggy order table with frequent status updates

SELECT
  schemaname,
  relname                               AS table_name,
  n_live_tup                            AS live_rows,
  n_dead_tup                            AS dead_rows,
  round(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1)
                                        AS dead_pct,
  last_autovacuum,
  last_autoanalyze,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname))
                                        AS total_size
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_pct DESC
LIMIT 20;

-- Red flag: dead_pct > 20% and last_autovacuum is NULL or hours ago
-- Fix: manually trigger VACUUM ANALYZE orders;
--      or tune autovacuum_vacuum_scale_factor for high-churn tables

-- EXAMPLE 3: Checking WAL write pressure and checkpoint frequency
-- High checkpoint warnings in logs = WAL being generated faster than checkpointer can keep up

SELECT
  checkpoints_timed,          -- Checkpoints triggered by timeout (healthy)
  checkpoints_req,            -- Checkpoints triggered by WAL fill (pressure!)
  checkpoint_write_time,      -- Time writing dirty pages (ms)
  checkpoint_sync_time,       -- Time syncing to disk (ms)
  buffers_checkpoint,         -- Pages written by checkpointer
  buffers_clean,              -- Pages written by background writer
  buffers_backend,            -- Pages written by backend processes (BAD — means checkpointer behind)
  maxwritten_clean            -- Times bgwriter stopped early (pool full)
FROM pg_stat_bgwriter;

-- If checkpoints_req >> checkpoints_timed: increase max_wal_size
-- If buffers_backend > 0: checkpointer is falling behind writes — tune checkpoint_completion_target

-- EXAMPLE 4: Observing MVCC dead tuples in action
-- Watch how UPDATE creates dead tuples

-- Setup
CREATE TABLE inventory (
  id      SERIAL PRIMARY KEY,
  product VARCHAR(100),
  stock   INT,
  price   NUMERIC(10,2)
);

INSERT INTO inventory (product, stock, price)
SELECT 'Product ' || i, (random() * 1000)::INT, (random() * 5000)::NUMERIC(10,2)
FROM generate_series(1, 100000) AS i;

-- Check before updates
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'inventory';
-- n_live_tup=100000, n_dead_tup=0

-- Simulate price updates (common in e-commerce — flash sales, repricing)
UPDATE inventory SET price = price * 0.9 WHERE stock > 500;
-- ~50,000 rows updated = ~50,000 dead tuples created!

-- Check after updates (run ANALYZE first to refresh stats)
ANALYZE inventory;
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'inventory';
-- n_live_tup=100000, n_dead_tup~50000 — 50% bloat!

-- Run VACUUM and check again
VACUUM inventory;
ANALYZE inventory;
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'inventory';
-- n_dead_tup=0 — reclaimed

-- EXAMPLE 5: Transaction ID age — wraparound monitoring
-- CRITICAL: if age > 1.5 billion, investigate immediately

SELECT
  datname,
  age(datfrozenxid)                       AS xid_age,
  2000000000 - age(datfrozenxid)          AS xids_remaining,
  pg_size_pretty(pg_database_size(datname)) AS db_size
FROM pg_database
WHERE datallowconn
ORDER BY age(datfrozenxid) DESC;

-- Alert threshold: xid_age > 1,500,000,000 (1.5 billion)
-- Emergency: VACUUM FREEZE on the oldest tables
-- Prevention: ensure autovacuum is running, monitor with this query weekly

-- EXAMPLE 6: Understanding page layout — ctid changes on UPDATE
-- ctid = physical location (page_number, slot_within_page)

CREATE TABLE test_ctid (id INT, val TEXT);
INSERT INTO test_ctid VALUES (1, 'hello');

-- See physical location before update
SELECT ctid, id, val FROM test_ctid WHERE id = 1;
-- ctid=(0,1) — page 0, slot 1

UPDATE test_ctid SET val = 'world' WHERE id = 1;

-- ctid changed! New version at different location
SELECT ctid, id, val FROM test_ctid WHERE id = 1;
-- ctid=(0,2) — page 0, slot 2 (new tuple)

-- Old tuple at (0,1) is now "dead" — has xmax set, invisible to new transactions
-- VACUUM will reclaim slot (0,1)

-- EXAMPLE 7: Sequential vs random I/O — measuring with EXPLAIN ANALYZE
-- Scenario: two queries on orders table — one uses index (random), one scans (sequential)

-- Random I/O via index (bad for large result sets):
EXPLAIN (ANALYZE, BUFFERS) 
SELECT order_id, customer_id, amount
FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
-- If date range covers > 10% of table rows, planner may choose seq scan anyway
-- Buffers: shared hit=X read=Y — Y = pages fetched from disk (random I/O)

-- Force sequential scan for comparison:
SET enable_indexscan = OFF;
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id, customer_id, amount
FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
RESET enable_indexscan;

-- The one with fewer "Buffers: shared read" is making fewer disk trips.
-- Often sequential scan wins for wide date ranges despite seeming less precise.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM MISUNDERSTANDING INTERNALS:
------------------------------------------------------

BUG 1: shared_buffers left at default — 128GB server caching only 128MB
  Scenario: Razorpay migrated to a new 128GB RAM server. Queries stayed just as slow.
  Root cause: PostgreSQL's shared_buffers defaults to 128MB (or 25% of 512MB if auto-detected small).
    The entire database fit in RAM — but PostgreSQL wasn't using it!
    pg_stat_bgwriter showed cache hit ratio at 72% (should be >99%).
  Fix:
    In postgresql.conf:
    shared_buffers = '32GB'          -- 25% of RAM
    effective_cache_size = '96GB'    -- Hint to planner (75% of RAM)
    work_mem = '256MB'               -- Per sort/hash operation
  Restart required for shared_buffers. Hit ratio jumped to 99.8% after restart.
  Result: p99 query latency dropped from 800ms to 12ms.

BUG 2: VACUUM FULL run on a live production table — hours-long table lock
  Scenario: DevOps engineer saw "orders table is 40GB, should be 8GB" → ran VACUUM FULL orders.
    VACUUM FULL takes an ACCESS EXCLUSIVE lock — equivalent to DROP TABLE.
    All queries on orders table blocked for 3.5 hours. Production outage.
  Fix: NEVER run VACUUM FULL on a live production table.
    Use regular VACUUM (no lock) to reclaim space for reuse.
    If you must reclaim disk space: use pg_repack extension (rewrites table without exclusive lock).
    Or: pg_repack -t orders -d mydb — online repack with minimal locking.

BUG 3: Autovacuum not keeping up — table bloat causing query slowdown over weeks
  Scenario: Swiggy delivery_status table updated 1M times/day (driver location updates).
    After 2 weeks, table size grew from 2GB to 18GB. Queries slowed 5×.
  Root cause: Autovacuum default scale factor (20%) meant VACUUM triggered when 20% of rows were dead.
    High-update table: 20% dead = 200,000 rows. At 1M updates/day, re-bloats within hours.
  Fix: Tune autovacuum per-table for high-churn tables:
    ALTER TABLE delivery_status SET (
      autovacuum_vacuum_scale_factor = 0.01,   -- Vacuum at 1% dead (not 20%)
      autovacuum_vacuum_cost_delay = 2,        -- Less throttling for this table
      autovacuum_vacuum_threshold = 1000       -- Vacuum after 1000 dead tuples (not 50)
    );

BUG 4: Transaction ID wraparound — production database refusing connections
  Scenario: A startup's PostgreSQL database stopped accepting writes with error:
    "ERROR: database is not accepting commands to avoid wraparound data loss in database X"
  Root cause: Autovacuum was disabled on the server ("we don't need it, we manage manually").
    After 2.1 billion transactions, PostgreSQL emergency freeze kicked in.
  Fix (emergency):
    1. Connect as superuser (still allowed).
    2. SET vacuum_freeze_min_age = 0;
    3. VACUUM FREEZE on all tables (may take hours).
    4. Re-enable autovacuum immediately.
  Prevention: Never disable autovacuum. Monitor xid_age weekly.

BUG 5: Missing ANALYZE after bulk load — planner using stale statistics
  Scenario: ETL job loaded 50M new rows into a reporting table. Subsequent queries 100× slower.
  Root cause: Query planner's statistics (pg_statistic) still showed the OLD row count.
    Planner estimated 100,000 rows, actually 50M rows. Chose nested loop join instead of hash join.
    Nested loop on 50M rows = O(n²) → hours instead of seconds.
  Fix: Always run ANALYZE after bulk loads:
    COPY large_table FROM '/data/dump.csv' CSV;
    ANALYZE large_table; -- Updates planner statistics
    -- Or use: COPY followed by CREATE INDEX ... and ANALYZE
  Prevention: Add ANALYZE to ETL pipeline as a mandatory final step.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTCOME:
  Given this sequence of operations on a fresh PostgreSQL table:
  
  CREATE TABLE accounts (id SERIAL, balance NUMERIC);
  INSERT INTO accounts (balance) SELECT 1000 FROM generate_series(1, 100000);
  
  -- Transaction A begins
  BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  -- Transaction A NOT YET committed
  
  -- Concurrently, Transaction B reads:
  SELECT balance FROM accounts WHERE id = 1;
  -- (Transaction B started AFTER Transaction A's UPDATE but BEFORE COMMIT)
  
  a) What does Transaction B see? Why?
  b) After Transaction A COMMITs, what do pg_stat_user_tables show for n_dead_tup?
  c) If we then run UPDATE accounts SET balance = balance + 1 WHERE id <= 50000,
     what is the approximate n_dead_tup after ANALYZE?
  d) What is the exact size difference between VACUUM and VACUUM FULL here?
     (Hint: think about what each actually does to the file on disk)

CHALLENGE 2 — FIX THE PRODUCTION INCIDENT:
  Your PostgreSQL server has these symptoms:
  - CPU 90% for the past hour
  - All queries taking 10× longer than normal
  - pg_stat_activity shows many queries in "wait_event_type = Lock"
  - One superuser session shows: query = "VACUUM FULL public.transactions"
  
  a) What is happening? What lock does VACUUM FULL hold?
  b) The transactions table has 500M rows and 400M are dead tuples. 
     The team wants to reclaim 80GB of disk space. 
     Propose a safe, zero-downtime alternative to VACUUM FULL.
  c) Write the postgresql.conf changes to prevent this bloat from recurring.
  d) Write a monitoring query that alerts when any table's dead tuple ratio exceeds 25%.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Design a PostgreSQL monitoring dashboard query set for a production e-commerce system.
  
  Write 4 queries that together give a complete health picture:
  
  Query 1: "Database cache efficiency" 
    Show per-table: heap reads, heap hits, index reads, index hits, overall hit ratio.
    Sort by tables with lowest hit ratio (most disk-hungry) first.
  
  Query 2: "Bloat report"
    Show tables with: live rows, dead rows, dead %, size, last vacuum time.
    Flag tables where dead % > 10% OR last_autovacuum > 24 hours ago AND n_dead_tup > 10000.
  
  Query 3: "Transaction ID safety"
    Show databases: name, xid age, % of safe budget used, estimated days until danger
    (assume 500,000 transactions/day rate — calculate from current age and rate).
  
  Query 4: "Write amplification"
    Show: checkpoints_req / (checkpoints_timed + checkpoints_req) as "checkpoint pressure ratio."
    If > 0.5 (more than half of checkpoints are forced, not scheduled): suggest config changes.
    `,
    summary: `PostgreSQL's performance is shaped by three physical realities: RAM is 10,000× faster than disk (so buffer pool hit ratio is everything), sequential writes are fast and random reads are expensive (which is why WAL works and random index reads don't scale), and UPDATE never overwrites in place (MVCC creates dead tuples that VACUUM must clean). Every schema decision, index choice, and query pattern should be evaluated against these three constraints.`
  },

  {
    id: 2,
    title: "Schema Design & Normalization",
    tag: "THE ARCHITECTURE THAT OUTLASTS YOUR CODE",
    color: "#047857",
    tldr: `Schema design is the highest-leverage decision in database work — a poor schema is nearly impossible to fix in production without downtime and data migrations. Normalization (1NF→3NF) eliminates redundancy and update anomalies; deliberate denormalization trades redundancy for read performance. UUID v4 fragments B-tree indexes; UUID v7 is time-ordered and index-friendly. Every junction table, self-referential relationship, and surrogate key decision has long-term performance implications.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I stored tags as a comma-separated string — is that okay?"
  → Violates 1NF (non-atomic values). You can't index "python,django,postgres".
  → Querying: WHERE tags LIKE '%python%' → full table scan always.
  → Fix: separate tags table + junction table. Queryable, indexable, extensible.

"Why does my UPDATE to one column sometimes make other data inconsistent?"
  → Transitive dependency (3NF violation). Example: orders table stores city AND zip AND state.
    Update zip but forget state → address inconsistency. ZIP code determines state — keep in separate table.

"UUID vs SERIAL/BIGSERIAL — which should I use for primary keys?"
  → SERIAL (sequential integer): small (4 bytes), perfectly ordered, B-tree friendly.
  → UUID v4: 16 bytes, RANDOM order → B-tree fragmentation → 50-300% write overhead, 20-50% index bloat.
  → UUID v7: 16 bytes, TIME-ORDERED → as index-friendly as SERIAL + globally unique across services.
  → Use UUID v7 when you need distributed uniqueness. Use BIGSERIAL otherwise.

"Our reports table has all the user info repeated in every row — why is that bad?"
  → Update anomaly: change a user's email → must update 10,000 rows (one per order).
    Miss even one → data inconsistency. This is exactly what normalization solves.

"Self-referential tables confuse me — how do I store a category tree?"
  → Single table with parent_id FK to itself. category_id → parent_id (NULL for root).
  → Querying the tree requires recursive CTEs (WITH RECURSIVE).
  → Alternative for deep trees: Nested Sets or Closure Tables (pre-materialized paths).
    `,
    analogy: `
THE SPREADSHEET EVOLUTION ANALOGY:
------------------------------------
Imagine building a spreadsheet to track Flipkart orders. Watch how it evolves through normal forms.

THE MESS (Unnormalized):
  order_id | customer_name | customer_email | product1, product2, product3 | city | zip | state
  -----------------------------------------------------------------------
  1001     | Priya Sharma  | priya@x.com    | "Phone,Case,Charger"        | Pune | 411001 | MH
  1002     | Priya Sharma  | priya@x.com    | "Laptop"                    | Pune | 411001 | MH
  
  Problems: Priya's email stored twice (update anomaly), products in one cell (can't query).

1NF — ATOMIC VALUES (No Repeating Groups):
  Each cell holds exactly one value. No arrays, no comma-separated lists.
  Split "Phone,Case,Charger" → 3 separate rows, each with one product.
  Now every cell is atomic. But Priya's email still repeated twice...

2NF — NO PARTIAL DEPENDENCIES (Only applies to composite keys):
  If primary key is (order_id, product_id), then customer_name depends only on order_id
  (not the full composite key). That's a partial dependency — violates 2NF.
  Fix: separate orders table (order_id, customer info) and order_items table (order_id, product_id).

3NF — NO TRANSITIVE DEPENDENCIES:
  In orders table: order_id → customer_id → city → zip → state.
  State depends on zip (not directly on order_id). Transitive dependency!
  Fix: separate addresses table. zip → city, state stored once.
  
  Now if the government changes a zip code boundary: update ONE row in addresses.
  Before: update thousands of order rows — and miss some → inconsistency.

THE DENORMALIZED REPORTING TABLE:
  After all this: to show "Priya's order summary," you JOIN 4 tables.
  For 1 analyst running ad-hoc reports: fine.
  For 10 million users viewing their order history simultaneously: too slow.
  
  Solution: a denormalized order_summary table with all data pre-joined.
  Accept the redundancy. Populate via triggers or ETL. Optimized for reads.
  This is NOT bad design — it's intentional design for a specific access pattern.

UUID v4 vs v7 = RANDOM FILING vs CHRONOLOGICAL FILING:
  UUID v4: "File this document in a random drawer." 
    After 1 million documents: the cabinet is perfectly random. Finding insertion spot: random seeks.
    B-tree index must constantly re-balance random insertions → page splits → fragmentation.
  
  UUID v7: "File this document in the drawer for today's date."
    Documents naturally cluster by time. New inserts always go to the "latest" drawer.
    B-tree index: new pages always append to the right side → minimal page splits → efficient.
    Identical behavior to SERIAL integers, but globally unique across servers.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — SCHEMA DESIGN INTERNALS:
-----------------------------------------------------

NORMAL FORMS — PRECISE DEFINITIONS:

1NF (First Normal Form):
  Rules:
  1. Each column contains atomic (indivisible) values.
  2. Each column contains values of a single type.
  3. Each row is unique (primary key exists).
  
  Violations: arrays in columns (PostgreSQL allows this as a feature, but breaks relational model),
  comma-separated strings, JSON blobs used as a workaround for missing columns.
  
  Exception: PostgreSQL arrays and JSONB are sometimes intentionally used for semi-structured data
  where the alternative (EAV model) would be worse. Pragmatism over dogma.

2NF (Second Normal Form):
  Requires 1NF PLUS: no non-key attribute depends on a PROPER SUBSET of the primary key.
  Only relevant when primary key is composite (multiple columns).
  
  Example violation:
    order_items (order_id PK, product_id PK, product_name, quantity)
    product_name depends only on product_id (subset of PK). Violates 2NF.
  Fix: move product_name to products table.

3NF (Third Normal Form):
  Requires 2NF PLUS: no non-key attribute depends on another non-key attribute (transitive dependency).
  
  Example violation:
    employees (emp_id PK, dept_id, dept_name, dept_budget)
    dept_name and dept_budget depend on dept_id (non-key), not on emp_id.
  Fix: departments table (dept_id, dept_name, dept_budget). employees references dept_id.

BCNF (Boyce-Codd Normal Form):
  Stronger than 3NF. For every functional dependency X → Y: X must be a superkey.
  Practical for: scheduling and assignment problems with overlapping candidate keys.
  In practice, 3NF is sufficient for most schemas.

WHEN TO DENORMALIZE:
  1. Read-heavy reporting: pre-join data in a denormalized table. Accept write overhead.
     Pattern: orders table + daily ETL → order_summary_denorm (all columns flat).
  
  2. Aggregations: pre-computed counts, sums. Updated via triggers or scheduled jobs.
     Pattern: products.review_count + products.average_rating — updated by trigger on review INSERT.
  
  3. Search optimization: duplicate a column from a joined table to avoid a JOIN on every search.
     Pattern: order_items.product_name copied from products — avoids JOIN for order listing.
  
  4. Microservices: each service owns its denormalized copy of data from other services.
     Consistency maintained via events/messaging, not foreign keys.

SURROGATE vs NATURAL KEYS:
  Natural key: uses real-world data as PK (email, PAN number, GSTIN).
    Risk: "immutable" identifiers change (email changes, company rebrands).
    Risk: exposes internal IDs in URLs (sequential integers → competitor can enumerate).
    Risk: wide natural keys in foreign key columns waste space.
  
  Surrogate key: artificial key (SERIAL, UUID) with no business meaning.
    Benefits: stable, small (4-8 bytes for BIGINT vs 20+ bytes for natural key).
    Best practice: surrogate PK + unique constraint on natural key.
    Example: users(id BIGSERIAL PK, email TEXT UNIQUE NOT NULL, ...)

UUID v4 vs UUID v7 — INDEX FRAGMENTATION:
  B-tree index for a table with 10M UUID v4 rows:
    Insertions are random → each insert likely lands in a DIFFERENT index page.
    All index pages constantly "in use" → can't stay cold in buffer pool.
    Write: always page split potential (50% of pages at 50% fill factor after fragmentation).
    Read: random page accesses across the entire index.
  
  UUID v7 structure: [48-bit unix_ms][12-bit rand][62-bit random]
    First 48 bits are timestamp → new UUIDs are always greater than old ones.
    B-tree behavior: identical to SERIAL integers. New inserts at the rightmost leaf.
    Only rightmost pages need to stay "hot" in buffer pool.
    
  Measured impact at scale (10M row table):
    INSERT throughput: UUID v7 ~3× faster than UUID v4.
    Index size: UUID v7 ~20-30% smaller due to less fragmentation.
    Query performance: UUID v7 ~2× faster for recent-data queries (hot pages cached).

JUNCTION TABLES (Many-to-Many):
  users ←→ roles (many users can have many roles):
    user_roles (user_id, role_id) — composite PK + individual FKs
    Add metadata to the junction: user_roles (user_id, role_id, granted_at, granted_by)
    
  Index strategy: composite PK (user_id, role_id) covers "what roles does user X have?"
    Add SEPARATE index on (role_id, user_id) for "who has role Y?"

SELF-REFERENTIAL TABLES (Hierarchies):
  Adjacency List (simplest):
    categories (id, name, parent_id REFERENCES categories(id))
    Query subtree: WITH RECURSIVE cte AS (SELECT id FROM categories WHERE parent_id IS NULL
      UNION ALL SELECT c.id FROM categories c JOIN cte ON c.parent_id = cte.id)
    Fast for: insert/update (O(1)). Slow for: subtree queries (O(depth) recursive joins).
  
  Materialized Path:
    categories (id, name, path TEXT) -- path = '1.5.23.67'
    Find subtree: WHERE path LIKE '1.5.%'
    Fast for: subtree queries (index on path). Slower for: moving subtrees (update many paths).
  
  Closure Table (most flexible):
    category_closure (ancestor_id, descendant_id, depth)
    One row for every ancestor-descendant pair (including self: depth=0).
    Fast for: all queries. Cost: O(depth²) rows per node.
    Best for: deep trees with frequent subtree queries.
    `,
    code: `
// ===== SCHEMA DESIGN & NORMALIZATION — SQL EXAMPLES =====

-- EXAMPLE 1: 1NF violation → fix (tags as array vs junction table)

-- BAD: Violates 1NF — tags in a single column, not atomic
CREATE TABLE products_bad (
  id      BIGSERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  tags    TEXT,  -- "electronics,mobile,5g" — can't index, can't query efficiently
  price   NUMERIC(10,2)
);
-- Querying: WHERE tags LIKE '%mobile%' → full table scan, fragile

-- GOOD: Proper 1NF with junction table
CREATE TABLE products (
  id      BIGSERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  price   NUMERIC(10,2) NOT NULL
);

CREATE TABLE tags (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE product_tags (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     BIGINT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX ON product_tags (tag_id, product_id); -- Reverse index for "products with tag X"

-- Querying products with tag 'mobile' — uses index, fast:
SELECT p.* FROM products p
JOIN product_tags pt ON pt.product_id = p.id
JOIN tags t          ON t.id = pt.tag_id
WHERE t.name = 'mobile';

-- EXAMPLE 2: 3NF violation → fix (transitive dependency)

-- BAD: city and state depend on pincode, not order_id (transitive dependency)
CREATE TABLE orders_bad (
  order_id    BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  pincode     CHAR(6),
  city        TEXT,   -- Depends on pincode!
  state       TEXT,   -- Depends on pincode!
  amount      NUMERIC(10,2)
);
-- Update anomaly: if pincode 400001 changes from 'Mumbai' to 'Mumbai City':
-- Must update every order row with that pincode — miss any → inconsistency.

-- GOOD: Separate pincodes reference table (3NF)
CREATE TABLE pincodes (
  pincode CHAR(6) PRIMARY KEY,
  city    TEXT    NOT NULL,
  state   TEXT    NOT NULL,
  country TEXT    NOT NULL DEFAULT 'India'
);

CREATE TABLE orders (
  order_id    BIGSERIAL PRIMARY KEY,
  customer_id BIGINT    NOT NULL REFERENCES customers(id),
  pincode     CHAR(6)   NOT NULL REFERENCES pincodes(pincode),
  amount      NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Change city name for a pincode: UPDATE pincodes SET city = 'Mumbai City' WHERE pincode = '400001';
-- One row update. All orders with that pincode automatically reflect the change via JOIN.

-- EXAMPLE 3: Surrogate key + UUID v7 for distributed systems
-- Using pg_idkit extension or gen_random_uuid() (v4) vs custom v7 function

-- UUID v4 (random — BAD for high-insert tables):
CREATE TABLE events_v4 (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Random = index fragmentation!
  event_type TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UUID v7 (time-ordered — GOOD):
-- Using pg_idkit extension: SELECT idkit_uuidv7();
-- Or custom function that encodes current ms timestamp into UUID v7 format:
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS UUID AS \$\$
DECLARE
  unix_ms  BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  rand_hex TEXT   := encode(gen_random_bytes(10), 'hex');
  ts_hex   TEXT   := lpad(to_hex(unix_ms), 12, '0');
BEGIN
  -- Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
  RETURN (
    ts_hex || '-' ||
    substr(ts_hex, 9, 4) || '-' ||
    '7' || substr(rand_hex, 1, 3) || '-' ||
    to_hex(((get_byte(gen_random_bytes(1), 0) & 63) | 128)::INT) ||
    substr(rand_hex, 4, 2) || '-' ||
    substr(rand_hex, 6, 12)
  )::UUID;
END;
\$\$ LANGUAGE plpgsql;

CREATE TABLE events_v7 (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- Time-ordered — index-friendly!
  event_type TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAMPLE 4: Self-referential table — category hierarchy with recursive CTE

CREATE TABLE categories (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT    NOT NULL,
  parent_id BIGINT  REFERENCES categories(id), -- NULL = root category
  sort_order INT    NOT NULL DEFAULT 0
);

-- Sample data: Electronics > Phones > Smartphones
INSERT INTO categories (id, name, parent_id) VALUES
  (1, 'Electronics',  NULL),
  (2, 'Phones',       1),
  (3, 'Laptops',      1),
  (4, 'Smartphones',  2),
  (5, 'Feature Phones', 2),
  (6, 'Gaming Laptops', 3),
  (7, 'MacBooks',     3);

-- Get full subtree under 'Electronics' (id=1) with depth:
WITH RECURSIVE category_tree AS (
  -- Anchor: start at root
  SELECT id, name, parent_id, 0 AS depth, ARRAY[id] AS path
  FROM categories
  WHERE id = 1

  UNION ALL

  -- Recursive: join children
  SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || c.id
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
  id,
  repeat('  ', depth) || name AS indented_name,  -- Visual indentation
  depth,
  path
FROM category_tree
ORDER BY path;

-- Result:
-- 1  | Electronics
-- 2  |   Phones
-- 4  |     Smartphones
-- 5  |     Feature Phones
-- 3  |   Laptops
-- 6  |     Gaming Laptops
-- 7  |     MacBooks

-- EXAMPLE 5: Denormalized aggregate columns with trigger maintenance
-- Scenario: products table with pre-computed review stats (avoid expensive aggregate per request)

CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT    NOT NULL,
  review_count  INT     NOT NULL DEFAULT 0,    -- Denormalized: maintained by trigger
  average_rating NUMERIC(3,2)                  -- Denormalized: maintained by trigger
);

CREATE TABLE reviews (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer   TEXT    NOT NULL,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function to maintain denormalized stats
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER AS \$\$
BEGIN
  UPDATE products
  SET
    review_count   = (SELECT COUNT(*)        FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)),
    average_rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NULL; -- AFTER trigger, return value ignored for row-level
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_product_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating_stats();

-- Now: SELECT id, name, review_count, average_rating FROM products; — NO expensive aggregate!

-- EXAMPLE 6: Junction table with metadata and proper indexing
-- User-Role assignment with audit trail (who assigned, when, expiry)

CREATE TABLE users  (id BIGSERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL);
CREATE TABLE roles  (id BIGSERIAL PRIMARY KEY, name  TEXT UNIQUE NOT NULL);

CREATE TABLE user_roles (
  user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    BIGINT      NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by BIGINT      REFERENCES users(id),          -- Who granted this role
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                               -- NULL = never expires
  PRIMARY KEY (user_id, role_id)
);

-- Index for "what roles does user X have?" (covered by PK)
-- Index for "who has role Y?" (need separate index)
CREATE INDEX idx_user_roles_role_user ON user_roles (role_id, user_id);

-- Query: all active roles for user ID 42
SELECT r.name, ur.granted_at, ur.expires_at
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = 42
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

-- EXAMPLE 7: Proper audit table design with immutable history
-- Pattern: never UPDATE the audit log, only INSERT

CREATE TABLE orders (
  id         BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  amount     NUMERIC(10,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log: every status change recorded, never deleted
CREATE TABLE order_status_history (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT      NOT NULL REFERENCES orders(id),
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  BIGINT      REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason      TEXT
);
CREATE INDEX ON order_status_history (order_id, changed_at DESC);

-- Trigger to auto-record status changes:
CREATE OR REPLACE FUNCTION log_order_status_change() RETURNS TRIGGER AS \$\$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_status_change();
    `,
    bugs: `
REAL PRODUCTION BUGS FROM SCHEMA DESIGN MISTAKES:
--------------------------------------------------

BUG 1: UUID v4 primary keys on high-insert table — index fragmentation causing 5× write slowdown
  Scenario: A fintech startup used UUID v4 for transaction primary keys (8M inserts/day).
    After 3 months (700M rows), INSERT throughput dropped from 20,000/sec to 4,000/sec.
    Index size grew to 140% of expected size. B-tree fill factor dropped to ~45%.
  Root cause: Each UUID v4 insert is statistically random — lands in a random existing B-tree page.
    Every page needs to be read, modified, and written back. No hot "rightmost" page.
    Pages constantly split when full (50% full after split → 50% wasted space).
  Fix: Migrate to UUID v7 (time-ordered) for new data.
    For existing table: CREATE INDEX CONCURRENTLY new_idx ON transactions (id::uuid_v7_equivalent);
    Or: switch to BIGSERIAL (8 bytes vs 16 bytes) for internal services.

BUG 2: Comma-separated foreign keys in a column — query becomes impossible at scale
  Scenario: "Product has multiple seller IDs" stored as: seller_ids = '42,187,2034'
    Worked fine at 10,000 products. At 2M products: WHERE seller_ids LIKE '%42%' took 45 seconds.
    Also: referential integrity impossible (can't FK a CSV string), can't count sellers per product.
  Root cause: Violated 1NF. Multiple values in one column.
  Fix: CREATE TABLE product_sellers (product_id BIGINT, seller_id BIGINT, PRIMARY KEY(product_id, seller_id));
    Migrate: parse CSV, insert rows. Add proper indexes. O(1) lookup per seller.

BUG 3: No ON DELETE behavior defined — orphaned rows or unexpected cascades
  Scenario: When a user account was deleted, their orders remained with customer_id pointing to NULL
    (because the FK allowed NULL). Order count queries were wrong. Refund processing hit NULL FK errors.
    Another team had CASCADE but didn't realize deleting a user would delete 10 years of order history.
  Fix: Be explicit about every FK's delete behavior:
    REFERENCES users(id) ON DELETE RESTRICT   -- Prevent delete if orders exist (safest for orders)
    REFERENCES users(id) ON DELETE CASCADE    -- Delete orders when user deleted (for draft items)
    REFERENCES users(id) ON DELETE SET NULL   -- Set FK to NULL (for optional relationships)
    REFERENCES users(id) ON DELETE SET DEFAULT -- Set to default value
  Rule: never leave FK delete behavior to default (RESTRICT) without thinking about it explicitly.

BUG 4: Natural key as PK — customer used name+dob as PK, names can duplicate, dob can be wrong
  Scenario: Healthcare app used (patient_name, date_of_birth) as composite PK.
    Two patients named "Priya Sharma" born on same date → duplicate key violation.
    Also: patient corrected their DOB → all FK references in 12 tables needed updating.
  Fix: Always use surrogate key (BIGSERIAL or UUID v7) as PK.
    Add UNIQUE constraint on natural key if uniqueness is required:
    CREATE UNIQUE INDEX ON patients (name, date_of_birth, national_id); -- real uniqueness
    patients.id remains BIGSERIAL PK — never changes, regardless of data corrections.

BUG 5: Self-referential table without depth limit — recursive CTE runs forever on circular data
  Scenario: Employee org chart table. Data entry error created a cycle: Manager A reports to B, B reports to A.
    Recursive CTE to build the org tree ran for 40 minutes and crashed the server.
  Root cause: WITH RECURSIVE has no cycle detection by default in some versions.
    Circular reference → infinite recursion.
  Fix: Add cycle detection to recursive CTEs:
    WITH RECURSIVE org_tree AS (
      SELECT id, manager_id, name, ARRAY[id] AS visited, false AS is_cycle
      FROM employees WHERE manager_id IS NULL
      UNION ALL
      SELECT e.id, e.manager_id, e.name,
             ot.visited || e.id,
             e.id = ANY(ot.visited)  -- Detect cycle!
      FROM employees e JOIN org_tree ot ON e.manager_id = ot.id
      WHERE NOT is_cycle  -- Stop if cycle detected
    )
    SELECT * FROM org_tree WHERE NOT is_cycle;
  Also: add application-level validation to prevent circular FK on insert/update.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — SPOT THE NORMAL FORM VIOLATIONS:
  Identify every normalization violation in this table and which normal form it breaks:
  
  CREATE TABLE hospital_appointments (
    appointment_id  SERIAL,
    patient_name    TEXT,
    patient_phone   TEXT,
    patient_email   TEXT,
    doctor_id       INT,
    doctor_name     TEXT,      -- Violation? Which NF?
    doctor_phone    TEXT,      -- Violation? Which NF?
    department      TEXT,      -- Depends on doctor_id? Which NF?
    appointment_date DATE,
    time_slot_1     TIME,      -- Violation? Which NF?
    time_slot_2     TIME,      -- Violation? Which NF?
    time_slot_3     TIME,      -- Violation? Which NF?
    city            TEXT,      -- Depends on pincode? Which NF?
    pincode         TEXT,
    state           TEXT       -- Depends on pincode? Which NF?
  );
  
  For each violation:
  a) Name the normal form it violates.
  b) Describe the anomaly it causes (insert, update, or delete anomaly).
  c) Show the corrected schema (multiple tables).

CHALLENGE 2 — UUID v4 vs v7 PERFORMANCE TEST:
  You're asked to justify switching from UUID v4 to UUID v7 to your team.
  
  a) Write the SQL to create two identical tables: events_v4 and events_v7.
  b) Write a PL/pgSQL block that inserts 1,000,000 rows into each table.
     Measure the time with EXPLAIN ANALYZE on a batch insert.
  c) After the inserts, query: SELECT pg_size_pretty(pg_indexes_size('events_v4'));
     and the same for events_v7. What do you expect to see? Why?
  d) A colleague says: "We need UUID v4 for security — sequential IDs are predictable."
     Counter-argument: How does UUID v7 address this concern while still being ordered?
     (Hint: look at the bits in UUID v7 that are random vs timestamp)

CHALLENGE 3 — BUILD A SCHEMA FROM SCRATCH:
  Design the complete schema for a food delivery app (like Zomato) covering:
  
  Entities: customers, restaurants, menu_items, orders, order_items, delivery_partners, addresses, reviews
  
  Requirements:
  - A customer can have multiple saved addresses
  - An order has exactly one delivery address (snapshot of address at time of order — WHY snapshot?)
  - Menu items belong to a restaurant and have categories (nested: Starters > Veg Starters)
  - Orders track status history (pending → confirmed → preparing → out_for_delivery → delivered)
  - Reviews can be for restaurants OR delivery partners
  - Delivery partners can be assigned to at most one active order at a time
  
  For each table: write CREATE TABLE with:
  - Primary key choice (BIGSERIAL or UUID v7 — justify)
  - Foreign keys with explicit ON DELETE behavior
  - Constraints (CHECK, NOT NULL, UNIQUE)
  - Timestamps (created_at, updated_at)
  
  Identify: which columns are intentionally denormalized and why?
    `,
    summary: `Schema design is the foundation that every future query, index, and application feature rests on — get it wrong and you're fighting the database forever. Normalize to 3NF to eliminate update anomalies; denormalize deliberately for read-heavy paths. Choose UUID v7 over UUID v4 for distributed-unique primary keys to avoid index fragmentation. Every foreign key needs an explicit ON DELETE strategy, and every self-referential relationship needs cycle protection.`
  },

  {
    id: 3,
    title: "Indexes — The Most Important Performance Topic",
    tag: "THE DIFFERENCE BETWEEN MILLISECONDS AND HOURS",
    color: "#B45309",
    tldr: `An index is a separate data structure (usually a B-tree) that lets PostgreSQL find rows in O(log n) instead of O(n). But indexes have a dark side: every write pays the cost of updating every index on the table. The key skills are: understanding the left-prefix rule for composite indexes, building covering indexes to eliminate heap fetches, writing partial and expression indexes for specific query shapes, and identifying when an index makes things worse (low cardinality, write-heavy tables, bloated/unused indexes).`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I added an index but the query is still slow"
  → Index not being used: column in WHERE clause wrapped in a function (WHERE LOWER(email) = ?)
    but index is on email, not LOWER(email). Create an expression index.
  → Index selectivity too low: indexing a boolean column (50% of rows = true). Index not worth it.
  → Result set too large: returning 30% of table rows → sequential scan is cheaper (less random I/O).

"My composite index on (a, b) doesn't help queries on just column b"
  → Left-prefix rule: composite index (a, b, c) helps queries filtering on: a, (a,b), (a,b,c).
  → Does NOT help queries filtering ONLY on b or c.
  → Create a separate index on (b) if you need to filter just by b.

"After I added 10 indexes, my inserts became 3× slower"
  → Every INSERT updates all indexes. 10 indexes → 10 index B-tree updates per row.
  → Each index update: O(log n) tree traversal, potential page split, WAL write.
  → Solution: audit indexes, drop unused ones (pg_stat_user_indexes.idx_scan = 0).

"What's a covering index and why is it a big deal?"
  → Normal index lookup: find row location in index → fetch full row from heap (random I/O).
  → Covering index: ALL columns needed by query ARE in the index → skip heap fetch entirely.
  → Query never touches the actual table data → 10-100× faster for the right query.

"My index is 3× larger than the table — is that normal?"
  → Possible index bloat from deleted/updated rows. Dead index entries remain until VACUUM.
  → High UPDATE rate → B-tree pages become partially empty → wasted space.
  → Fix: REINDEX CONCURRENTLY tablename (rebuilds without table lock).
    `,
    analogy: `
THE TEXTBOOK INDEX ANALOGY:
-----------------------------
A database table is a 1000-page textbook. A query is you searching for information.

WITHOUT AN INDEX (sequential scan):
  No table of contents. You read every single page: page 1, page 2, ..., page 1000.
  For a 1-page answer: you read 1000 pages. O(n) work regardless of how selective your search is.
  Fine for: small textbooks (small tables), or when you need most of the content.

WITH A B-TREE INDEX:
  Textbook has an index at the back: "PostgreSQL → pages 347, 512, 891."
  Finding the entry: binary search through sorted index: O(log n) — about 10 lookups for 1000 entries.
  Then: jump to those specific pages. Total: O(log n) to find + O(results) to read.
  
B-TREE INTERNALS — THE BALANCED TREE:
  Index stored as a balanced tree. Each node: up to ~400 key-pointer pairs (fills an 8KB page).
  Root node → branch nodes → leaf nodes (contain actual key values + ctid pointers).
  
  For 1,000,000 rows: tree height = ceil(log₄₀₀(1M)) = 3 levels.
  Any row found in 3 page reads! (root → branch → leaf → heap page = 4 I/Os worst case).
  No matter if table grows to 1 billion rows: tree height = ceil(log₄₀₀(1B)) = 5 levels.
  Log₄₀₀(1B) = 5 vs linear scan of 1B pages. That's the power of B-trees.

COMPOSITE INDEX = TABLE OF CONTENTS FOR PAIRS:
  Index on (last_name, first_name): sorted first by last_name, then by first_name within same last_name.
  
  "Find all Sharmas" → uses index (left prefix matches).
  "Find all Priyas" → CAN'T use index efficiently (first_names not sorted globally, only within each last_name).
  "Find Priya Sharma" → uses index (left prefix + full key).
  
  Left-prefix rule: the index works left-to-right. Skipping a column breaks the traversal.

COVERING INDEX = THE ANSWER IS PRINTED IN THE INDEX:
  Textbook index: "Foreign keys → page 347" (just tells you WHERE to go).
  Covering index: "Foreign keys → [full explanation here in the index itself]" (no page flip needed!).
  
  If your query needs only columns that are in the index: zero heap page reads.
  Query: SELECT email FROM users WHERE tenant_id = 5 AND active = true
  Covering index: (tenant_id, active, email) — all three columns in index.
  Execution: read index leaf pages only. Never touch the actual table data.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — INDEX INTERNALS:
--------------------------------------------

B-TREE STRUCTURE:
  PostgreSQL's default index type. Implements a balanced B+-tree.
  
  Internal (branch) nodes: contain separator keys and child pointers.
    Each page holds ~(8192 - header) / (key_size + 6 bytes pointer) entries.
    For INT8 key: ~(8192 - 24) / (8 + 6) ≈ 586 entries per page.
  
  Leaf nodes: contain key values + heap tuple pointers (ItemPointer = 6 bytes: 4 page + 2 offset).
    Leaf pages are linked in a doubly-linked list for efficient range scans.
    Range scan: find first key (O(log n)), then follow next-page pointers (O(results)).
  
  Splits: when a leaf page is full and a new key must be inserted:
    Split into two pages at ~50% fill each.
    New separator key inserted into parent (may cascade upward).
    Fill factor: configurable (default 90% for B-tree). Lower fill factor = less splits but more space.
    CREATE INDEX idx ON orders(created_at) WITH (fillfactor=70); -- For heavily updated columns

COMPOSITE INDEX — LEFT-PREFIX RULE (DEEP):
  Index on (a, b, c) is equivalent to a sorted list: sorted first by a, then b within a, then c within b.
  
  Queries that CAN use this index:
    WHERE a = 5                     → yes (prefix of index)
    WHERE a = 5 AND b = 3           → yes (first two columns)
    WHERE a = 5 AND b = 3 AND c = 1 → yes (all three)
    WHERE a = 5 AND c = 1           → PARTIAL (uses a, skips to c — c not useful without b)
    WHERE a > 3                     → yes (range scan on first column)
    WHERE a = 5 AND b > 3           → yes (equality on a, range on b)
    WHERE a = 5 AND b > 3 AND c = 1 → a and b used, c cannot be used after range on b!
  
  Queries that CANNOT use this index efficiently:
    WHERE b = 3                     → no (b not the leftmost column)
    WHERE c = 1                     → no
    WHERE b = 3 AND c = 1           → no
  
  Index for ORDER BY:
    Index (a ASC, b ASC) can satisfy ORDER BY a, b — no sort needed!
    Index (a ASC, b ASC) CANNOT satisfy ORDER BY a DESC, b DESC without seq scan + sort.
    For mixed sort: CREATE INDEX ON orders (status ASC, created_at DESC);

COVERING INDEX — IMPLEMENTATION:
  Standard: CREATE INDEX idx_users_email ON users (email);
    Lookup email → get ctid → fetch heap row to get other columns.
  
  Covering: CREATE INDEX idx_users_email_cov ON users (email) INCLUDE (name, tenant_id);
    INCLUDE columns stored in leaf nodes only (not branch nodes).
    Benefit: can satisfy queries needing email + name + tenant_id without heap fetch.
    INCLUDE vs adding to key: INCLUDE columns not usable for range/filter (only for output).
  
  Index-only scan: planner chooses this when all needed columns are in the index AND
    the visibility map says the page has all-visible tuples (so no need to check heap for visibility).
    Check if queries use index-only scan: EXPLAIN output shows "Index Only Scan."

PARTIAL INDEX:
  CREATE INDEX idx_orders_pending ON orders (customer_id) WHERE status = 'pending';
  
  Size: only indexes rows where status = 'pending'. If 1% of orders are pending:
    Index is 100× smaller than full index on customer_id.
  
  Use case: WHERE customer_id = 42 AND status = 'pending'
    Uses partial index: only 1% of rows in index → fast lookup.
  
  Does NOT help: WHERE customer_id = 42 AND status = 'delivered'
    Must use different index or sequential scan.
  
  Maintenance: only rows matching WHERE clause are updated/inserted into index.
    Writes to orders where status != 'pending' don't touch this index at all.

EXPRESSION INDEX:
  CREATE INDEX idx_users_email_lower ON users (LOWER(email));
  
  Query: WHERE LOWER(email) = LOWER('Priya@Example.COM') → uses index.
  Query: WHERE email = 'priya@example.com' → does NOT use this index (different expression).
  
  Other examples:
    CREATE INDEX ON orders ((amount::INT));           -- Cast expression
    CREATE INDEX ON users ((data->>'city'));           -- JSONB extraction
    CREATE INDEX ON products ((length(description))); -- Function result
    CREATE INDEX ON events ((created_at::DATE));       -- Date truncation

LOW CARDINALITY — WHEN INDEXES HURT:
  Cardinality: number of distinct values in a column.
  Boolean column: 2 values (true/false). 50% of rows match each value.
  
  Index on boolean column for WHERE active = true:
    B-tree lookup: 3 I/Os to reach leaf. Then: fetch 50% of table rows (random I/O for each).
    Full table sequential scan for 50%: much cheaper (sequential reads, batch I/O).
  
  PostgreSQL planner will refuse to use index if estimated rows > ~5-10% of table.
    Set enable_seqscan = OFF to force index use (only for testing/debugging, never production).
  
  Solution: partial index on the rare value:
    CREATE INDEX ON users (id) WHERE active = false; -- If only 0.1% are inactive

INDEX BLOAT AND MAINTENANCE:
  B-tree pages are never automatically merged or recycled after deletions.
  DELETE 50% of rows → 50% of index pages now nearly empty → wasted space.
  
  Monitoring index bloat:
    SELECT pg_size_pretty(pg_indexes_size('tablename')) AS index_size,
           pg_size_pretty(pg_total_relation_size('tablename')) AS total_size;
  
  Fix: REINDEX CONCURRENTLY index_name;
    Rebuilds index from scratch. No lock on table. Requires extra disk space temporarily.
    After rebuild: compact, efficient, full fill factor.
    DO NOT use REINDEX (without CONCURRENTLY) in production — locks table for duration!

FINDING UNUSED INDEXES:
  pg_stat_user_indexes.idx_scan = 0 (since last stats reset or server restart).
  
  Each unused index costs: INSERT/UPDATE/DELETE overhead + disk space + VACUUM time.
  Drop them: DROP INDEX CONCURRENTLY index_name; (no table lock).
    `,
    code: `
// ===== INDEXES — SQL EXAMPLES =====

-- EXAMPLE 1: Demonstrating B-tree lookup vs sequential scan with EXPLAIN ANALYZE

-- Create and populate a realistic orders table
CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT    NOT NULL,
  status      TEXT      NOT NULL CHECK (status IN ('pending','shipped','delivered','cancelled')),
  amount      NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert 2 million rows (realistic for small e-commerce)
INSERT INTO orders (customer_id, status, amount, created_at)
SELECT
  (random() * 100000)::BIGINT + 1,
  (ARRAY['pending','shipped','delivered','cancelled'])[ceil(random()*4)::INT],
  (random() * 9999)::NUMERIC(10,2),
  NOW() - (random() * interval '365 days')
FROM generate_series(1, 2000000);

ANALYZE orders;

-- Without index: sequential scan
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;
-- Seq Scan on orders (cost=0.00..47862.00 rows=20 width=...) (actual time=... rows=20 loops=1)
-- Buffers: shared hit=X read=22226  ← reads nearly ALL pages

-- Add index:
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);

-- With index: index scan (random I/O but only ~20 rows)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;
-- Index Scan using idx_orders_customer_id on orders (cost=0.43..76.56 rows=20 width=...)
-- Buffers: shared hit=23  ← only 23 pages total (3 index + 20 heap)

-- EXAMPLE 2: Composite index — demonstrating left-prefix rule

-- Index for queries filtering by status AND date range (in that order)
-- Use case: "Show me all pending orders from the last 7 days" (common dashboard query)
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

-- Uses full composite index (status = equality + created_at = range):
EXPLAIN SELECT id, amount FROM orders
WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';
-- Index Scan using idx_orders_status_created ✓

-- Does NOT efficiently use index (no status filter — range scan on second column alone):
EXPLAIN SELECT id, amount FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';
-- Seq Scan or index scan on a different index (status missing = can't start traversal)

-- For queries filtering ONLY by date: need separate index:
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

-- EXAMPLE 3: Covering index — eliminating heap fetches
-- Scenario: Leaderboard query showing top customers by total spend

-- Without covering index: index scan + heap fetch for each row
CREATE INDEX idx_orders_customer_status ON orders (customer_id, status);

EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
ORDER BY total_spend DESC
LIMIT 10;
-- Index Scan + Heap Fetches: reads index pages + separate heap pages for amount column

-- WITH covering index: amount column included → no heap access!
CREATE INDEX idx_orders_covering ON orders (status, customer_id) INCLUDE (amount);

EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, SUM(amount) AS total_spend
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
ORDER BY total_spend DESC
LIMIT 10;
-- Index Only Scan using idx_orders_covering ← "Only" = no heap fetch!
-- Buffers: shared hit=<much smaller number>

-- EXAMPLE 4: Partial index — indexing only the "hot" subset
-- Scenario: Order processing queue — only 'pending' orders need fast lookup

-- Full index: 2M rows indexed
CREATE INDEX idx_orders_pending_full ON orders (created_at) WHERE status = 'pending';

-- Compare sizes:
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname LIKE 'idx_orders_pending%';

-- Partial index (only ~5% of rows): much smaller, faster to maintain
-- Query that uses it:
SELECT id, customer_id, amount FROM orders
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at
LIMIT 100;
-- Uses partial index — scans only pending orders sorted by age

-- EXAMPLE 5: Expression index — case-insensitive email lookup

CREATE TABLE users (
  id    BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT
);

-- Without expression index: function call prevents index use
CREATE INDEX idx_users_email ON users (email); -- Indexes original case

-- Query with LOWER(): planner cannot use standard email index!
EXPLAIN SELECT * FROM users WHERE LOWER(email) = LOWER('Priya@Example.COM');
-- Seq Scan — function on column = no standard index use

-- Fix: create expression index matching the query's expression
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- Now this query uses the index:
EXPLAIN SELECT * FROM users WHERE LOWER(email) = LOWER('Priya@Example.COM');
-- Index Scan using idx_users_email_lower ✓

-- JSONB expression index (common in modern schemas):
ALTER TABLE users ADD COLUMN metadata JSONB;
CREATE INDEX idx_users_city ON users ((metadata->>'city'));

-- Fast query:
SELECT * FROM users WHERE metadata->>'city' = 'Bangalore';
-- Uses idx_users_city ✓

-- EXAMPLE 6: Finding and dropping unused indexes

-- Find all indexes with zero scans since last stats reset:
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND pg_relation_size(indexrelid) > 8192  -- Skip empty/tiny indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Generate DROP INDEX CONCURRENTLY statements for unused indexes:
SELECT
  'DROP INDEX CONCURRENTLY ' || schemaname || '.' || indexname || ';' AS drop_statement,
  pg_size_pretty(pg_relation_size(indexrelid)) AS space_to_reclaim
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (               -- Don't drop PKs or UNIQUE constraints!
    SELECT conindid FROM pg_constraint WHERE contype IN ('p','u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- EXAMPLE 7: REINDEX CONCURRENTLY to fix bloated indexes

-- Check index bloat (ratio of current size to estimated ideal size):
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS current_size,
  round(
    pg_relation_size(indexrelid)::numeric /
    NULLIF(pg_relation_size(tablename::regclass), 0) * 100, 1
  ) AS index_to_table_ratio_pct
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- If index is bloated (ratio suspiciously high or after many deletes):
-- SAFE for production — no table lock, concurrent with all operations:
REINDEX INDEX CONCURRENTLY idx_orders_customer_id;
-- Rebuilds entire B-tree. Takes seconds to minutes depending on size.
-- Requires extra disk space temporarily (old index + new index both exist during rebuild).
    `,
    bugs: `
REAL PRODUCTION BUGS FROM INDEX MISUNDERSTANDING:
--------------------------------------------------

BUG 1: Function-wrapped column defeats index — full table scan in production
  Scenario: User search endpoint: WHERE UPPER(username) = UPPER(:input)
    Developers tested with 1,000 users — fast. Production: 5M users — query took 8 seconds.
  Root cause: Index on username. Query uses UPPER(username). PostgreSQL can't use index on
    a column when a function is applied — must evaluate UPPER() for every row.
  Fix (Option A): Expression index: CREATE INDEX ON users (UPPER(username));
    Query: WHERE UPPER(username) = UPPER(:input) — now uses expression index.
  Fix (Option B): Store pre-normalized value: ADD COLUMN username_lower TEXT GENERATED ALWAYS AS (LOWER(username)) STORED;
    CREATE INDEX ON users (username_lower); Query: WHERE username_lower = LOWER(:input).
  Lesson: Any function in WHERE clause = potential index bypass. Check EXPLAIN output.

BUG 2: Left-prefix rule violation — composite index created in wrong column order
  Scenario: Table orders with composite index (amount, customer_id, created_at).
    Most common query: WHERE customer_id = 42 AND created_at > NOW() - INTERVAL '30 days'
    This query never uses the composite index (customer_id is not the leftmost column).
    Full table scan on 50M row orders table. Query: 12 seconds.
  Fix: Create index with most selective/commonly-filtered column first:
    CREATE INDEX ON orders (customer_id, created_at DESC); -- leftmost = customer_id
    Now the query uses the index: <50ms.
  Lesson: Always design composite indexes from the perspective of your most common query patterns.
    The WHERE clause columns should appear in the index in left-to-right order.

BUG 3: Too many indexes on a write-heavy table — INSERT throughput 10× slower
  Scenario: A notification events table accumulated 15 indexes added by different developers over 2 years.
    INSERT rate dropped from 50,000/sec to 5,000/sec. VACUUM taking 4 hours per run.
  Root cause: Each INSERT updates 15 B-tree indexes: 15 × O(log n) tree traversals + 15 WAL writes.
    VACUUM must process dead tuples in 15 indexes, not just 1.
  Fix: Run pg_stat_user_indexes query to find idx_scan=0 indexes. Dropped 9 unused indexes.
    INSERT rate recovered to 38,000/sec. VACUUM time: 25 minutes.
  Lesson: Every index is a tax on every write. Audit indexes quarterly. Drop what's unused.

BUG 4: Index on low-cardinality column — planner ignores index, but developers don't trust it
  Scenario: Developer added index on orders.status (5 distinct values, ~20% each).
    EXPLAIN showed planner choosing Seq Scan. Developer forced index: SET enable_seqscan=OFF in app code.
    Query got SLOWER — index scan for 20% of table = 2M random I/Os vs 22,000 sequential reads.
  Root cause: Planner was RIGHT. Index not useful for low-cardinality, high-match columns.
    Forcing the index bypassed the planner's correct analysis.
  Fix: Remove SET enable_seqscan=OFF from application code.
    For the actual use case (find pending orders for a specific customer):
    CREATE INDEX ON orders (customer_id, status); — composite makes status selective in context.
  Lesson: Trust the query planner. If you disagree, understand WHY before overriding.

BUG 5: Index created without CONCURRENTLY on production table — 45-minute table lock
  Scenario: Developer ran CREATE INDEX idx_large_table_col ON large_table (col); at 2pm.
    This locked the large_table (AccessShareLock) for 45 minutes during index build.
    All queries that needed to write to large_table queued. Production degraded.
  Fix: Always use CONCURRENTLY for production index creation:
    CREATE INDEX CONCURRENTLY idx_large_table_col ON large_table (col);
    Builds index in background — takes longer but doesn't block reads or writes.
    Also: REINDEX CONCURRENTLY, DROP INDEX CONCURRENTLY.
  Lesson: CREATE INDEX without CONCURRENTLY = production lock. Never do this in production.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE QUERY PLAN:
  Table: user_events (user_id BIGINT, event_type TEXT, created_at TIMESTAMPTZ, value NUMERIC)
  Index: CREATE INDEX ON user_events (user_id, event_type, created_at DESC);
  
  For each query, predict: (a) uses index or seq scan, (b) which index columns are used, (c) why:
  
  Query A: SELECT * FROM user_events WHERE user_id = 100;
  Query B: SELECT * FROM user_events WHERE event_type = 'purchase';
  Query C: SELECT * FROM user_events WHERE user_id = 100 AND event_type = 'purchase';
  Query D: SELECT * FROM user_events WHERE user_id = 100 ORDER BY created_at DESC LIMIT 10;
  Query E: SELECT * FROM user_events WHERE user_id = 100 AND created_at > NOW() - INTERVAL '7 days';
  Query F: SELECT * FROM user_events WHERE user_id > 100 AND event_type = 'purchase';
  
  Bonus: For Query F — if you could add ONE index to make it fast, what would it be?
  Bonus: For Query B — if event_type has 3 distinct values each covering 33% of rows,
    would you create an index on just event_type? What would you do instead?

CHALLENGE 2 — FIX THE SLOW QUERIES:
  Diagnose and fix each slow query by proposing the right index:
  
  a) Query: SELECT * FROM products WHERE LOWER(name) LIKE 'samsung%';
     Current index: CREATE INDEX ON products (name);
     Why is it slow? What index would fix it? (Note: LIKE 'prefix%' CAN use a B-tree index — how?)
  
  b) Query: SELECT user_id, COUNT(*) FROM sessions WHERE active = true GROUP BY user_id;
     Current index: CREATE INDEX ON sessions (user_id);
     The query is doing a seq scan despite the index. Why?
     Propose an index that: (1) avoids seq scan, (2) covers the aggregate.
  
  c) Query: SELECT id, name, email FROM users WHERE tenant_id = 5 ORDER BY name LIMIT 20;
     Current indexes: (tenant_id), (name)
     The planner uses idx on tenant_id, fetches 10,000 rows, sorts, returns 20.
     Design a single index that eliminates the sort AND heap fetches.

CHALLENGE 3 — INDEX DESIGN FOR A REAL SCHEMA:
  Given this schema for a banking application:
  
  accounts (id, customer_id, account_type, balance, status, created_at)
  transactions (id, from_account_id, to_account_id, amount, type, status, created_at)
  
  Design indexes for these query patterns (one index per query, can be reused):
  
  Pattern 1: "Show all transactions for account #42, newest first" (most common — millions/day)
  Pattern 2: "Find all transactions over ₹100,000 in the last 7 days" (fraud detection — hourly)
  Pattern 3: "Count active accounts by type for the dashboard" (aggregate — every 5 minutes)
  Pattern 4: "Find the current balance of a specific account" (very frequent — millions/day)
  Pattern 5: "Get all failed transactions for retry processing" (background job — every minute)
  
  For each index: write the CREATE INDEX statement, specify if partial/expression/covering,
  and estimate the size benefit vs a full index on the same column(s).
    `,
    summary: `Indexes are the single highest-leverage performance tool in SQL — the difference between a millisecond query and a 10-second query is usually a missing or mis-designed index. The three rules to internalize are: match your index to your most frequent query's WHERE and ORDER BY clauses (left-prefix rule), add INCLUDE columns to make covering indexes that skip heap access entirely, and ruthlessly drop unused indexes because every index is a perpetual tax on every write.`
  },

  {
    id: 4,
    title: "Joins — Deep Dive",
    tag: "COMBINING DATA WITHOUT DESTROYING PERFORMANCE",
    color: "#6D28D9",
    tldr: `Joins combine rows from multiple tables based on a condition. The semantics (INNER, LEFT, RIGHT, FULL, CROSS, SELF) determine which rows appear in results; the join algorithm (nested loop, hash join, merge join) determines how fast it runs. The N+1 query problem — running one query per result row instead of one query total — is the single most common ORM-induced performance disaster, silently turning a 1-query page load into 1,001 queries.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"LEFT JOIN returns duplicate rows — why?"
  → Each row on the LEFT that matches MULTIPLE rows on the RIGHT appears once per match.
  → JOIN doesn't mean "one result per left row" — it means "one result per matching pair."
  → Fix: if you expect one result per left row, ensure the right side has uniqueness, or use DISTINCT ON.

"NOT IN (subquery) returns zero rows when I expect results"
  → NULL propagation: if ANY value in the NOT IN list is NULL, the entire IN comparison returns NULL.
  → NULL IN (1, 2, NULL) = NULL (not FALSE). NOT NULL = NULL. WHERE NULL = no rows returned.
  → Fix: use NOT EXISTS instead. Or ensure subquery excludes NULLs: WHERE id NOT IN (SELECT id FROM ... WHERE id IS NOT NULL).

"My ORM generates SELECT n+1 queries but I don't know how to tell"
  → Enable slow query log: log queries taking > 100ms. Or: pg_stat_statements for query counts.
  → Sign: 1 query to "get orders", then 1 query per order to "get customer name" = N+1 problem.
  → Fix: use JOIN or batch fetch instead of per-row lookup.

"What is a hash join and when does PostgreSQL choose it?"
  → Hash join: build hash table from smaller input, probe with larger input. O(n) but needs work_mem.
  → PostgreSQL chooses hash join when: no sorted input available, larger dataset, join condition is equality.
  → If work_mem too small: hash join spills to disk → performance degrades badly.

"CROSS JOIN vs cartesian product — aren't they the same thing?"
  → Yes. CROSS JOIN produces every combination of rows from both tables. n × m rows.
  → Usually a mistake if rows is unexpectedly huge. Legitimate use: generate all combinations intentionally.
  → Accidental CROSS JOIN: forgetting the ON clause in an older-style implicit join.
    `,
    analogy: `
THE GUEST LIST ANALOGY:
------------------------
Two lists at a wedding: Guest List (LEFT table) and RSVP Confirmed List (RIGHT table).

INNER JOIN — "Only guests who confirmed":
  Return rows that appear in BOTH lists. Priya confirmed → she appears.
  Rohan was invited but didn't RSVP → he doesn't appear in INNER JOIN result.
  Used for: "Show me orders that have customers" (drop orphan orders).

LEFT JOIN — "All guests, confirmed or not":
  Return ALL guests from left list. If they confirmed: show their RSVP info.
  If not confirmed: show guest info with NULL for RSVP columns.
  Rohan shows up with RSVP_status = NULL.
  Used for: "Show all customers, including those with no orders."

RIGHT JOIN — "All RSVPs, even gate-crashers":
  Return ALL from right list. If they're on the guest list: show guest info.
  If not on guest list: show RSVP info with NULL for guest columns.
  (Rarely used; same as LEFT JOIN with tables swapped.)

FULL OUTER JOIN — "Everyone, from both lists":
  Return ALL rows from BOTH tables. NULLs where no match.
  Used for: reconciliation reports, "show everything even if not matched."

CROSS JOIN — "Every guest at every table combination":
  150 guests × 20 tables = 3,000 combinations. Every possible pairing.
  Used for: generating all combinations intentionally.

THE N+1 PROBLEM = CALLING EACH GUEST INDIVIDUALLY:
  Normal: send one group email to all confirmed guests (1 query with JOIN).
  N+1: get list of confirmed guests (1 query), then call each one to ask if they're coming (N queries).
  100 confirmed guests → 101 phone calls instead of 1 email. At 10,000 guests: disaster.
  
HASH JOIN = BUILDING A PHONE BOOK BEFORE CALLING:
  Small list (e.g., confirmed RSVPs, 50 people): build a hash map of {name → RSVP info}.
  Then scan full guest list (1000 people): for each guest, O(1) hash lookup.
  Total: O(n) instead of O(n²) nested loop.
  
MERGE JOIN = TWO SORTED LISTS, WALKING IN PARALLEL:
  Sort Guest list by name. Sort RSVP list by name.
  Walk both lists simultaneously: two pointers moving forward together.
  When names match → output. When left < right → advance left. Vice versa.
  O(n log n) to sort + O(n) to merge = O(n log n) total.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — JOIN ALGORITHMS AND OPTIMIZATION:
-------------------------------------------------------------

JOIN ALGORITHMS:

1. NESTED LOOP JOIN:
  For each row in outer table: scan inner table for matching rows.
  Cost: O(outer_rows × inner_rows) worst case.
  Optimized: O(outer_rows × log(inner_rows)) if inner table has index.
  
  When PostgreSQL chooses it:
    - Outer table is small (few rows).
    - Inner table has an index on the join key.
    - LIMIT clause: can stop early after finding enough rows.
  
  Best for: small tables, LIMIT queries, joining to a single row (FK lookup).
  
  Example: SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = 42;
    Outer: 1 row (orders WHERE id=42). Inner: index scan on customers.
    Nested loop is perfect here: 1 × O(log n) = O(log n).

2. HASH JOIN:
  Phase 1 (build): scan smaller table, build hash table keyed on join attribute.
  Phase 2 (probe): scan larger table, for each row: hash lookup in hash table.
  Cost: O(n + m) time, O(smaller_table) memory.
  
  When PostgreSQL chooses it:
    - Join condition is equality (=).
    - One table significantly smaller (fits in work_mem).
    - No suitable indexes on join columns.
  
  Memory concern: if hash table > work_mem: hash join writes "batches" to disk.
    Hash join with disk spill: much slower. Monitor: EXPLAIN shows "Batches: X" where X > 1.
  
  Tuning: SET work_mem = '256MB'; for large analytical queries (session-level, not global!).

3. MERGE JOIN:
  Sort both inputs on the join key. Scan both sorted inputs simultaneously.
  Cost: O(n log n + m log m) if not already sorted. O(n + m) if already sorted.
  
  When PostgreSQL chooses it:
    - Both inputs can be sorted (or already sorted via index scan).
    - Large tables where hash join would need too much memory.
    - Non-equality join conditions like BETWEEN.
  
  Advantage: streaming — can output results before reading all of both inputs.
  Perfect for: sorted data, range joins, very large tables.

JOIN ORDER OPTIMIZATION:
  PostgreSQL query planner uses dynamic programming (or genetic algorithm for > 8 tables)
  to find the optimal join order among all table permutations.
  
  Key insight: join order matters enormously.
  Start with the smallest result set → less data to carry through subsequent joins.
  
  Example: 3 tables — orders (10M rows), customers (1M rows), premium_customers (1K rows)
  Bad order:  orders × customers = 10M×1M intermediate → then filter to 1K premium
  Good order: premium_customers × customers = 1K×1M → 1K results → join orders
  
  Force join order (for testing/debugging):
    SET join_collapse_limit = 1; -- Disables join reordering
    SET from_collapse_limit = 1;

THE N+1 PROBLEM — DEEP DIVE:
  Classic in ORM code (Django ORM, Sequelize, ActiveRecord, Hibernate).
  
  N+1 pattern:
    1 query: SELECT * FROM orders LIMIT 100; -- 100 rows
    100 queries: SELECT * FROM customers WHERE id = X; -- One per order
    Total: 101 queries for what should be 1 query.
  
  At scale: 1000 order rows → 1001 queries. Each query: network roundtrip to DB (~1ms).
    Total time: 1001ms ≈ 1 second just in network overhead, plus 1001 query executions.
  
  Detection methods:
    1. Enable pg_stat_statements: shows query count and total time per query pattern.
    2. Django Debug Toolbar / Query Inspector in Rails: shows per-request query count.
    3. Slow query log: log_min_duration_statement = 0 (logs ALL queries). Filter for bursts.
    4. Look for: same query template repeated N times with different bind parameters.
  
  Fix 1 — JOIN:
    SELECT o.*, c.name, c.email FROM orders o JOIN customers c ON c.id = o.customer_id LIMIT 100;
    1 query, all data in one result set.
  
  Fix 2 — Subquery (correlated → rewrite as JOIN):
    -- Bad (correlated subquery = N+1 equivalent):
    SELECT id, (SELECT name FROM customers WHERE id = o.customer_id) FROM orders o;
    -- Good: rewrite as JOIN
  
  Fix 3 — Batch fetch (ORM-level):
    -- Django: Order.objects.select_related('customer').all()
    -- Sequelize: Order.findAll({ include: [{ model: Customer }] })
    -- These generate a JOIN or a single IN query, not N separate queries.

ANTI-JOIN (NOT IN vs NOT EXISTS vs LEFT JOIN IS NULL):
  Anti-join: find rows in A that have NO matching row in B.
  
  NOT IN with subquery:
    SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);
    DANGER: if ANY order has customer_id = NULL → NOT IN returns 0 rows (NULL propagation!).
    NULL IN (1, 2, NULL) = NULL. NOT NULL = NULL. WHERE NULL → no rows.
  
  NOT EXISTS (RECOMMENDED):
    SELECT * FROM customers c WHERE NOT EXISTS (
      SELECT 1 FROM orders o WHERE o.customer_id = c.id
    );
    NULL-safe. PostgreSQL often converts to an efficient anti-hash-join.
    Returns all customers with no orders, regardless of NULLs.
  
  LEFT JOIN ... IS NULL:
    SELECT c.* FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;
    Explicit anti-join. Same result as NOT EXISTS. Sometimes slightly less efficient.
    Good for: readability, when you also want columns from the joined table for debugging.
  
  Performance: all three roughly equivalent with indexes. NOT EXISTS clearest semantics.
    `,
    code: `
// ===== JOINS — SQL EXAMPLES =====

-- Setup: realistic e-commerce schema for join examples
CREATE TABLE customers (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT      NOT NULL,
  email      TEXT      UNIQUE NOT NULL,
  city       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT    REFERENCES customers(id) ON DELETE RESTRICT,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT      NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  quantity   INT    NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE products (
  id       BIGSERIAL PRIMARY KEY,
  name     TEXT      NOT NULL,
  category TEXT      NOT NULL
);

-- Sample data
INSERT INTO customers (name, email, city) VALUES
  ('Priya Sharma',  'priya@example.com',  'Mumbai'),
  ('Rohan Mehta',   'rohan@example.com',  'Delhi'),
  ('Ananya Patel',  'ananya@example.com', 'Bangalore'),
  ('Kiran Rao',     'kiran@example.com',  'Hyderabad');

INSERT INTO orders (customer_id, amount, status) VALUES
  (1, 1500.00, 'delivered'),
  (1, 2300.00, 'pending'),
  (2, 800.00,  'delivered'),
  (3, 4500.00, 'shipped');
-- Note: customer 4 (Kiran) has NO orders

-- EXAMPLE 1: All join types demonstrated side-by-side

-- INNER JOIN — only customers who have orders:
SELECT c.name, o.amount, o.status
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;
-- Returns 4 rows (3 customers × their orders). Kiran not included.

-- LEFT JOIN — ALL customers, with order info if it exists:
SELECT c.name, o.amount, o.status
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;
-- Returns 5 rows. Kiran: name='Kiran Rao', amount=NULL, status=NULL

-- FULL OUTER JOIN — all customers AND all orders, matched where possible:
SELECT c.name, o.id AS order_id, o.amount
FROM customers c
FULL OUTER JOIN orders o ON o.customer_id = c.id;
-- All customers + all orders. NULLs on whichever side has no match.

-- CROSS JOIN — every customer × every order (rarely useful, but demonstrative):
SELECT c.name, o.id AS order_id
FROM customers c
CROSS JOIN orders o;
-- 4 customers × 4 orders = 16 rows (all combinations)

-- SELF JOIN — customers in the same city:
SELECT a.name AS customer1, b.name AS customer2, a.city
FROM customers a
JOIN customers b ON a.city = b.city AND a.id < b.id; -- a.id < b.id avoids (Priya,Priya) and duplicate (Priya,Rohan) vs (Rohan,Priya)

-- EXAMPLE 2: Anti-join patterns — customers with NO orders

-- Method 1: NOT EXISTS (recommended, NULL-safe):
SELECT c.id, c.name, c.email
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
-- Returns Kiran Rao only

-- Method 2: LEFT JOIN ... IS NULL (same result, more explicit):
SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- Method 3: NOT IN — DANGEROUS with NULLs:
-- If any order had customer_id = NULL:
SELECT c.id, c.name FROM customers c
WHERE c.id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);
-- Added WHERE customer_id IS NOT NULL to make it safe

-- EXAMPLE 3: N+1 problem — bad vs good pattern

-- BAD: N+1 pattern (what ORMs do without eager loading)
-- Conceptual — don't run this as a loop in SQL, but this is what ORM generates:
-- 1st query:
SELECT id, customer_id, amount FROM orders LIMIT 100;
-- Then for EACH of the 100 orders:
SELECT name, email FROM customers WHERE id = :customer_id; -- 100 times!
-- Total: 101 queries

-- GOOD: Single JOIN query (what you WANT the ORM to generate):
SELECT
  o.id       AS order_id,
  o.amount,
  o.status,
  c.name     AS customer_name,
  c.email    AS customer_email
FROM orders o
JOIN customers c ON c.id = o.customer_id
LIMIT 100;
-- Total: 1 query. Same data.

-- EXAMPLE 4: Multi-table join with aggregation
-- "Order summary: total items, total value, per order with customer info"

SELECT
  o.id                             AS order_id,
  c.name                           AS customer,
  c.city,
  COUNT(oi.id)                     AS total_items,
  SUM(oi.quantity * oi.unit_price) AS calculated_total,
  o.amount                         AS billed_amount,
  o.status,
  o.created_at
FROM orders o
JOIN customers  c  ON c.id  = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.name, c.city, o.amount, o.status, o.created_at
ORDER BY o.created_at DESC;

-- EXAMPLE 5: Detecting N+1 with pg_stat_statements

-- First, enable the extension (requires superuser, done once):
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the most called queries (N+1 pattern = high calls, low mean time each):
SELECT
  calls,
  round(mean_exec_time::numeric, 2)  AS mean_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  rows,
  query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'          -- Exclude system queries
ORDER BY calls DESC
LIMIT 20;

-- N+1 signature: query like "SELECT * FROM customers WHERE id = $1"
-- with calls = 50,000+ in a short period, mean_ms = 0.5ms, total_ms = 25,000ms
-- Fix: that query should be a JOIN in the caller.

-- EXAMPLE 6: Join order hints and performance investigation

-- Default: planner chooses join order automatically
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT c.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total_spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Mumbai'
GROUP BY c.name;

-- Forcing join order (for debugging only — don't use in production code):
SET join_collapse_limit = 1;
SET from_collapse_limit = 1;

-- Now planner must use the order written in the query
EXPLAIN SELECT c.name, COUNT(o.id)
FROM orders o  -- If written first: planner starts with orders (large table)
JOIN customers c ON c.id = o.customer_id
WHERE c.city = 'Mumbai'
GROUP BY c.name;

RESET join_collapse_limit;
RESET from_collapse_limit;

-- EXAMPLE 7: Hash join work_mem issue and fix

-- Query that might spill to disk if work_mem too low:
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.city, COUNT(*) AS order_count, SUM(o.amount) AS total
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.city;

-- If EXPLAIN shows: "Hash  (cost=... Batches: 4 ..." — batches > 1 = spill to disk!
-- Fix for this session (before running the heavy query):
SET work_mem = '256MB';  -- Enough for hash table to stay in RAM

EXPLAIN (ANALYZE, BUFFERS)
SELECT c.city, COUNT(*) AS order_count, SUM(o.amount) AS total
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.city;
-- Now: "Hash  (cost=... Batches: 1 ..." — in-memory hash join, much faster

RESET work_mem; -- Reset after the query (don't leave elevated globally)
    `,
    bugs: `
REAL PRODUCTION BUGS FROM JOIN MISUNDERSTANDING:
-------------------------------------------------

BUG 1: NOT IN returning zero rows due to NULL in subquery — silent data bug
  Scenario: "Find all products not yet ordered." Query returned 0 products even though
    most products had never been ordered. Team trusted the result for 2 weeks before noticing.
  Root cause:
    SELECT * FROM products WHERE id NOT IN (SELECT product_id FROM order_items);
    order_items had some rows with product_id = NULL (from legacy data import).
    NULL IN the subquery result → entire NOT IN expression evaluates to NULL → WHERE NULL → no rows.
  Fix:
    SELECT * FROM products WHERE id NOT IN (
      SELECT product_id FROM order_items WHERE product_id IS NOT NULL
    );
    -- Or better (NULL-safe by design):
    SELECT * FROM products p
    WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);
  Lesson: Never use NOT IN with a subquery without NULL protection. NOT EXISTS is always safer.

BUG 2: LEFT JOIN inflating counts — 1 order counted 3× because of multiple items
  Scenario: Monthly revenue dashboard showed inflated totals — ₹500M instead of expected ₹200M.
  Root cause:
    SELECT SUM(o.amount) FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id;
    An order with 3 items: joins to 3 rows. o.amount (₹1000) counted 3 times = ₹3000.
    Sum was ≈ 2.5× actual revenue (average 2.5 items per order).
  Fix: Aggregate order_items separately, then join:
    SELECT SUM(o.amount) FROM orders o; -- Just sum the orders table directly!
    -- Or: use DISTINCT on order ID if you really need the join:
    SELECT SUM(DISTINCT o.amount) -- Wrong too (deduplicates equal amounts, not rows)!
    -- Correct: don't join if you only need order-level data.
    -- If you need per-order item count AND sum: use subquery or CTE.

BUG 3: Accidental CROSS JOIN from missing ON clause — billions of rows returned
  Scenario: Report query ran for 8 hours and produced a 500GB result file before being killed.
  Root cause:
    SELECT * FROM orders, customers WHERE orders.amount > 1000;
    -- Missing: AND orders.customer_id = customers.id
    -- Result: every order × every customer = 5M × 1M = 5 TRILLION rows attempted.
  Fix: Always use explicit JOIN syntax (JOIN ... ON ...) instead of implicit join (comma-separated FROM).
    Modern SQL style prevents this class of bug.
    SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.amount > 1000;
  Lesson: Never use old-style implicit joins. Linters and ORMs both enforce explicit JOIN syntax.

BUG 4: Hash join spilling to disk — 10× performance regression after data growth
  Scenario: Reporting query ran in 2 seconds for 1M customers. After 10M customers: 40 seconds.
  Root cause: Hash join built a hash table of customers (smaller table). At 1M rows: fit in work_mem (64MB default).
    At 10M rows: hash table = 800MB > work_mem. Spilled to disk: 12 batches.
    Each batch: read/write temporary files. 40 seconds vs 2 seconds.
  Detection: EXPLAIN ANALYZE output: "Hash  (cost=... Batches: 12 Memory Usage: 64kB  Disk: 245120kB)"
  Fix: SET work_mem = '1GB'; before the report query.
    Or: in postgresql.conf: work_mem = '256MB' (affects ALL concurrent sorts/hashes — be careful).
    Rule: work_mem × max_connections × parallel_workers can use all RAM. Set conservatively globally,
    use SET work_mem per session for specific heavy queries.

BUG 5: N+1 in production causing database CPU at 100% during peak hours
  Scenario: E-commerce app worked fine in testing (100 users). Production launch (10,000 concurrent):
    DB CPU pegged at 100%. pg_stat_activity showed 8,000 identical queries:
    "SELECT * FROM users WHERE id = $1" — each taking 0.5ms but 8,000 running concurrently.
  Root cause: Product listing page loaded 50 products. For each product: fetched seller info separately.
    50 products × 10,000 concurrent users = 500,000 "get seller" queries per minute.
  Fix:
    -- Before (ORM without eager loading):
    Product.findAll({ limit: 50 }) -- then for each: product.getSeller()
    -- After (with JOIN or eager loading):
    Product.findAll({ limit: 50, include: [{ model: Seller }] })
    -- Generates: SELECT products.*, sellers.* FROM products JOIN sellers ON ... LIMIT 50
    -- 1 query vs 51 queries. DB CPU dropped from 100% to 15%.
  Lesson: N+1 is the #1 ORM-related production performance bug. Always check query count per request.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Given these tables:
  
  employees: (id: 1,'Alice','Eng'), (2,'Bob','Eng'), (3,'Carol','Sales'), (4,'Dave',NULL)
  departments: (id:'Eng','Engineering'), ('Sales','Sales'), ('Marketing','Marketing')
  projects: (emp_id:1, proj:'Alpha'), (1,'Beta'), (2,'Alpha'), (5,'Gamma') -- emp_id 5 doesn't exist
  
  Predict the EXACT row count and NULLs for each query:
  
  a) SELECT e.name, d.name FROM employees e INNER JOIN departments d ON d.id = e.dept_id;
     Rows: ___  Why doesn't Dave appear? ___
  
  b) SELECT e.name, d.name FROM employees e LEFT JOIN departments d ON d.id = e.dept_id;
     Rows: ___  What does Dave's row look like? ___
  
  c) SELECT e.name, COUNT(p.proj) AS project_count
     FROM employees e LEFT JOIN projects p ON p.emp_id = e.id
     GROUP BY e.name;
     Rows: ___  What is Carol's project_count? ___
  
  d) SELECT * FROM employees WHERE id NOT IN (SELECT emp_id FROM projects);
     Expected: employees not on any project. Actual result: ___  Why? ___
     (Hint: look at emp_id 5 in projects — does it have a matching employee?)

CHALLENGE 2 — FIX THE N+1 QUERY:
  This Node.js/SQL code has a classic N+1 problem. Fix it with a single JOIN query.
  
  // Current code (N+1):
  async function getOrdersWithCustomers(limit) {
    // Query 1: get orders
    const orders = await db.query(
      \`SELECT id, customer_id, amount, status FROM orders LIMIT \${limit}\`
    );
    
    // N queries: one per order!
    for (const order of orders.rows) {
      const customer = await db.query(
        \`SELECT name, email, city FROM customers WHERE id = \${order.customer_id}\`
      );
      order.customer = customer.rows[0];
    }
    
    return orders.rows; // 1 + N queries total
  }
  
  a) Rewrite as a single SQL query using JOIN.
  b) What if some orders have customer_id = NULL (guest checkouts)? 
     Should you use INNER or LEFT JOIN? Why?
  c) What if you need order_items count per order TOO (without N+1)?
     Add it to your JOIN query using a subquery or GROUP BY.
  d) How would you detect this N+1 in production? 
     Write the pg_stat_statements query to find it.

CHALLENGE 3 — BUILD THE COMPLETE REPORTING QUERY:
  Using the e-commerce schema (customers, orders, order_items, products), write a single SQL query for:
  
  "Monthly Sales Report: For each month in 2024, show:
  - Month name
  - Number of unique customers who ordered
  - Total orders placed
  - Total revenue (sum of order amounts)
  - Top product category by revenue that month
  - Average order value
  - Number of new customers (first-ever order in that month)"
  
  Requirements:
  - Use only JOINs and CTEs (no correlated subqueries in SELECT)
  - The "top category" column should use a window function or DISTINCT ON
  - "New customers" requires identifying each customer's first order date
  - Handle months with zero orders (still show the month with zeros)
  - Order results by month ascending
  
  Hint: Generate all 12 months using generate_series() and LEFT JOIN to orders.
    `,
    summary: `Join semantics determine correctness (which rows appear), join algorithms determine performance (how fast the database combines them), and N+1 queries are the silent killers that make ORMs dangerous without proper eager loading. The two rules that prevent the most bugs: always use NOT EXISTS instead of NOT IN (NULL safety), and always check query count per page load in development before going to production.`
  }
];

const concepts = [
  {
    id: 9,
    title: "Database Constraints & Data Integrity",
    tag: "THE LAST LINE OF DEFENSE FOR YOUR DATA",
    color: "#065F46",
    tldr: `Constraints are rules enforced by the database engine itself — not by your application code. They run inside transactions, survive concurrent access, and catch violations that application-layer validation misses when two requests race. A constraint violation is a feature, not a bug: it means the database caught something your application forgot to check.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I validate in my application — why do I need database constraints too?"
  → Application validation runs before the database write. But:
    Two concurrent requests can both pass application validation simultaneously,
    then both write — producing a duplicate email or negative stock count.
    Database constraints are enforced inside the transaction, atomically, with locking.
    They are the only guaranteed enforcement under concurrent load.

"My migration failed with: cannot add NOT NULL column without a default"
  → Adding NOT NULL to an existing column requires ALL existing rows to have a value.
  → Adding it on a large table: full table scan + rewrite = hours of table lock.
  → Safe pattern: add nullable → backfill → add NOT NULL (three steps, zero downtime).

"ON DELETE CASCADE deleted 50,000 rows I didn't expect!"
  → Cascading deletes follow the FK chain silently. No warning, no confirmation.
  → Deleting a single user triggered cascade through: orders → order_items → invoices → payments.
  → Best practice: default to ON DELETE RESTRICT. Use CASCADE only when you explicitly want it.

"I want UNIQUE emails but allow soft-deleted users to re-register with the same email"
  → Standard UNIQUE constraint: all rows including soft-deleted must be unique.
  → Partial unique index: UNIQUE WHERE deleted_at IS NULL — only enforces uniqueness on live rows.
  → Deleted rows can share emails. New registrations use the deleted user's email freely.

"CHECK constraint vs PostgreSQL ENUM type — which should I use for 'status' columns?"
  → ENUM: stored as integer internally (compact), but adding/removing values requires ALTER TYPE
    (which rewrites the type, potentially locking tables in older PostgreSQL versions).
  → CHECK with TEXT column: flexible — add/remove valid values via migration (just update constraint),
    readable in queries, compatible with schema diffing tools. Preferred for evolving status values.
    `,
    analogy: `
THE BUILDING CODE ANALOGY:
---------------------------
Building a skyscraper (your application). Database constraints = building code (safety regulations).

APPLICATION VALIDATION = THE ARCHITECT'S REVIEW:
  The architect (your application) reviews plans before construction starts.
  Most safety issues caught early. But: architect only reviews ONE project at a time.
  Two construction crews working simultaneously? Architect can't review both at once.
  Both crews proceed — and both build the same doorway in conflicting positions.
  Constraint violation: only discovered when walls physically collide (production data corruption).

DATABASE CONSTRAINT = THE BUILDING INSPECTOR:
  Inspector visits EVERY floor, EVERY time, regardless of how many crews are working.
  Inspector is present AT THE MOMENT the concrete is poured (inside the transaction).
  Two crews try to pour conflicting foundations simultaneously? Inspector stops BOTH.
  One is allowed to proceed; the other waits or is rejected. No collision possible.

TYPES OF INSPECTORS (Constraint Types):
  NOT NULL inspector: "Every structural column must have a beam — no empty slots allowed."
  UNIQUE inspector: "No two apartments can have the same door number on the same floor."
  CHECK inspector: "Floor area must be between 200 and 5000 sq ft. No exceptions."
  FOREIGN KEY inspector: "Every apartment must have a valid building to belong to."
    If the building is demolished (DELETE): RESTRICT stops demolition if apartments exist.
    CASCADE demolishes the apartments too (automatically).
    SET NULL marks apartments as "building unknown" — they float until reassigned.

DEFERRABLE CONSTRAINTS = THE INSPECTOR WHO REVIEWS AT END OF SHIFT:
  Normal: inspector checks EVERY time a beam is installed.
  DEFERRABLE: inspector checks only at end of the work shift (transaction commit).
  Useful when: you need to install two beams that depend on each other (circular dependencies).
    Install beam A (inspector defers check), install beam B (inspector defers check),
    end of shift: inspector verifies both are valid together. Neither checked in isolation.

PARTIAL UNIQUE INDEX = THE INSPECTOR WHO IGNORES DEMOLISHED UNITS:
  Standard unique rule: no two units can share a door number — including demolished units.
  Problem: demolished unit #42 still "occupies" that door number.
  Partial unique index: rule only applies to STANDING units (WHERE deleted_at IS NULL).
  Demolished unit #42 doesn't count. New unit can get door number #42.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — CONSTRAINT INTERNALS:
-------------------------------------------------

CONSTRAINT TYPES AND THEIR IMPLEMENTATION:

NOT NULL:
  Stored as column attribute in pg_attribute.attnotnull.
  Enforced at row insertion time: if value is NULL → immediate error.
  Adding NOT NULL to existing column (PostgreSQL 11+): if column has a non-volatile DEFAULT,
    PostgreSQL stores default in catalog and doesn't rewrite table (instant!).
    If no default: full table scan required to verify no NULLs exist. Lock during scan.
  
  Fast pattern (PostgreSQL 11+):
    ALTER TABLE orders ADD COLUMN processed BOOLEAN NOT NULL DEFAULT FALSE;
    -- Instant: stores default in catalog, no table rewrite needed.
  
  Slow pattern (any version):
    ALTER TABLE orders ADD COLUMN processed BOOLEAN;
    UPDATE orders SET processed = FALSE; -- Backfill
    ALTER TABLE orders ALTER COLUMN processed SET NOT NULL; -- Validates all rows (scan)

UNIQUE:
  Implemented as a unique B-tree index behind the scenes.
  At INSERT/UPDATE: index lookup for the value. If found → violation error.
  NULL behavior: NULL ≠ NULL in SQL. Multiple NULLs allowed in a UNIQUE column.
  Composite UNIQUE: (user_id, date) — the combination must be unique, not individual columns.

CHECK:
  Stored as pg_constraint.consrc (the constraint expression as text).
  Evaluated for every INSERT and UPDATE. Must return TRUE (or NULL — NULL passes check).
  WARNING: NULL passes CHECK! CHECK (amount > 0) passes if amount IS NULL.
    → Add NOT NULL separately, or: CHECK (amount IS NOT NULL AND amount > 0).
  
  CHECK vs ENUM:
    ENUM type: ALTER TYPE status ADD VALUE 'new_status'; (safe in PG 9.1+, but irreversible without recreating)
    CHECK (status IN ('pending','active','deleted')): change values by dropping and recreating CHECK.
    CHECK preferred: easier migrations, no custom type management, works with all SQL clients.

FOREIGN KEY:
  Enforces referential integrity. Stores parent table + column reference in pg_constraint.
  At INSERT/UPDATE on child table: looks up parent row. If not found → violation.
  At DELETE/UPDATE on parent table: checks for dependent child rows. Behavior depends on ON DELETE:
  
  ON DELETE RESTRICT (default): prevents parent deletion if children exist.
    Immediately checked at statement time (even in a transaction).
  ON DELETE NO ACTION (slightly different): checked at end of statement; deferred if constraint is DEFERRABLE.
  ON DELETE CASCADE: deletes all child rows automatically. Silent, recursive!
    CASCADE chains: if grandchild also has CASCADE → grandchild deleted too. Depth unlimited.
  ON DELETE SET NULL: sets FK column to NULL in all child rows.
  ON DELETE SET DEFAULT: sets FK column to column's default value.
  
  Performance: every FK requires an index on the CHILD column for fast child lookup.
    Without index: ON DELETE parent row → full scan of child table to find dependents.
    PostgreSQL does NOT automatically create this index (unlike MySQL InnoDB).
    Rule: always index every FK column on the child side.

DEFERRABLE CONSTRAINTS:
  DEFERRABLE INITIALLY DEFERRED: always deferred to end of transaction.
  DEFERRABLE INITIALLY IMMEDIATE: immediate by default, but can be deferred via:
    SET CONSTRAINTS constraint_name DEFERRED;
  NOT DEFERRABLE (default): always immediate.
  
  Use case: circular references.
    employees(dept_id FK → departments.id) AND departments(manager_id FK → employees.id)
    Without deferrable: must insert employee with dept_id=NULL, insert department, then update employee.
    With deferrable: insert both within one transaction; FK checked at COMMIT.

PARTIAL UNIQUE INDEX:
  Not a constraint per se — an index with a WHERE clause that happens to be UNIQUE.
  CREATE UNIQUE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
  Enforces: no two ACTIVE users can share an email. Deleted users ignored.
  Can combine: WHERE status = 'active' AND org_id = 5 (org-scoped uniqueness).

CONSTRAINT VIOLATION HANDLING:
  PostgreSQL SQLSTATE codes:
    23505: unique_violation (duplicate key)
    23502: not_null_violation
    23503: foreign_key_violation
    23514: check_violation
  
  Application handling:
    Catch 23505 → return "email already exists" user-friendly error.
    Catch 23503 → return "referenced record not found" error.
    Never show raw constraint names to users — map to user-friendly messages.
  
  In PL/pgSQL:
    EXCEPTION WHEN unique_violation THEN ... handle ...
    EXCEPTION WHEN check_violation THEN ... handle ...
    EXCEPTION WHEN foreign_key_violation THEN ... handle ...
    `,
    code: `
-- ===== CONSTRAINTS & DATA INTEGRITY — SQL EXAMPLES =====

-- EXAMPLE 1: All constraint types in a realistic schema

CREATE TABLE organizations (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT      NOT NULL,
  gst_number TEXT      UNIQUE,     -- Optional but must be unique if provided
  plan       TEXT      NOT NULL DEFAULT 'free'
    CONSTRAINT chk_org_plan CHECK (plan IN ('free','starter','pro','enterprise')),
  max_users  INT       NOT NULL DEFAULT 5
    CONSTRAINT chk_max_users CHECK (max_users BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT    NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  email       TEXT      NOT NULL,
  name        TEXT      NOT NULL,
  role        TEXT      NOT NULL DEFAULT 'member'
    CONSTRAINT chk_user_role CHECK (role IN ('owner','admin','member','viewer')),
  deleted_at  TIMESTAMPTZ,         -- Soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')
);

-- Partial unique index: email unique only among non-deleted users
CREATE UNIQUE INDEX idx_users_email_active ON users (email)
WHERE deleted_at IS NULL;
-- Deleted users can share email with new registrations!

-- Composite unique: one owner per org
CREATE UNIQUE INDEX idx_users_one_owner ON users (org_id)
WHERE role = 'owner' AND deleted_at IS NULL;

-- EXAMPLE 2: DEFERRABLE constraints for circular FK references
-- Scenario: departments have a manager, managers belong to departments

CREATE TABLE departments (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT      NOT NULL,
  manager_id BIGINT    -- Will reference employees, added after
);

CREATE TABLE employees (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT    NOT NULL,
  dept_id   BIGINT  NOT NULL REFERENCES departments(id)
              DEFERRABLE INITIALLY DEFERRED  -- Defer FK check to end of transaction
);

-- Now add the circular FK with deferral
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id)
  DEFERRABLE INITIALLY DEFERRED;

-- Without deferral: must insert employee with NULL dept, insert dept, update employee. Messy.
-- With deferral: insert both in one transaction, FK checked at COMMIT:
BEGIN;
  INSERT INTO departments (id, name) VALUES (1, 'Engineering'); -- manager_id NULL for now
  INSERT INTO employees (id, name, dept_id) VALUES (101, 'Priya Sharma', 1); -- References dept 1 ✓
  UPDATE departments SET manager_id = 101 WHERE id = 1; -- Now set manager
COMMIT; -- FK checks happen HERE — both FKs valid at this point

-- EXAMPLE 3: ON DELETE behavior comparison

CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- RESTRICT: can't delete user if they have orders (prevent data orphaning)
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled'))
);

CREATE TABLE order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- CASCADE: deleting an order also deletes its items (makes semantic sense)
  product_id BIGINT NOT NULL,
  quantity   INT    NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price > 0)
);

CREATE TABLE order_notes (
  id       BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note     TEXT,
  author   BIGINT REFERENCES users(id) ON DELETE SET NULL  -- Keep note, clear author if user deleted
);

-- Demo: delete an order → cascades to items and notes
DELETE FROM orders WHERE id = 42;
-- order_items for order 42: automatically deleted (CASCADE)
-- order_notes for order 42: automatically deleted (CASCADE)
-- If order 42 doesn't exist, or user still has other orders: no cascade needed

-- EXAMPLE 4: CHECK constraint vs ENUM — and why CHECK wins for evolving status

-- ENUM approach (harder to migrate):
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
CREATE TABLE orders_enum (
  id     BIGSERIAL PRIMARY KEY,
  status order_status_enum NOT NULL DEFAULT 'pending'
);
-- Adding a new status 'returned':
ALTER TYPE order_status_enum ADD VALUE 'returned'; -- Works in PG 9.1+ but CANNOT be removed easily
-- Removing a status: must CREATE NEW TYPE, ALTER TABLE, DROP OLD TYPE — complex migration

-- CHECK approach (easier to migrate):
CREATE TABLE orders_check (
  id     BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_order_status
      CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled'))
);
-- Adding 'returned':
ALTER TABLE orders_check DROP CONSTRAINT chk_order_status;
ALTER TABLE orders_check ADD CONSTRAINT chk_order_status
  CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','returned'));
-- Done! Can also remove values this way.

-- EXAMPLE 5: Constraint violation handling — graceful error mapping in PL/pgSQL

CREATE OR REPLACE FUNCTION register_user(
  p_org_id BIGINT, p_email TEXT, p_name TEXT
) RETURNS JSONB AS \$\$
DECLARE
  new_user_id BIGINT;
BEGIN
  INSERT INTO users (org_id, email, name)
  VALUES (p_org_id, p_email, p_name)
  RETURNING id INTO new_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);

EXCEPTION
  WHEN unique_violation THEN
    -- SQLSTATE 23505: partial unique index on email WHERE deleted_at IS NULL
    RETURN jsonb_build_object('success', false, 'error', 'email_already_registered',
      'message', 'This email is already associated with an active account.');

  WHEN foreign_key_violation THEN
    -- SQLSTATE 23503: org_id does not exist
    RETURN jsonb_build_object('success', false, 'error', 'invalid_org',
      'message', 'Organization not found.');

  WHEN check_violation THEN
    -- SQLSTATE 23514: role or email format check failed
    RETURN jsonb_build_object('success', false, 'error', 'invalid_data',
      'message', 'Invalid email format or role value.');

  WHEN not_null_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_field',
      'message', 'Required field is missing.');
END;
\$\$ LANGUAGE plpgsql;

-- EXAMPLE 6: Partial unique index for multi-tenant uniqueness scoping

CREATE TABLE tickets (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_no   TEXT   NOT NULL,  -- e.g., "TKT-0042" — unique within org
  title       TEXT   NOT NULL,
  status      TEXT   NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket number unique WITHIN each organization (not globally):
CREATE UNIQUE INDEX idx_tickets_org_no ON tickets (org_id, ticket_no);

-- Ticket number unique within org AND only among open tickets (hypothetical partial):
CREATE UNIQUE INDEX idx_tickets_active_no ON tickets (org_id, ticket_no)
WHERE status NOT IN ('closed');

-- EXAMPLE 7: Monitoring constraint violations in production

-- Find tables with no NOT NULL on important columns:
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.is_nullable = 'YES'
  AND c.column_name IN ('email', 'user_id', 'order_id', 'amount', 'status')
ORDER BY c.table_name, c.column_name;

-- Find FK columns with no supporting index (performance risk):
SELECT
  tc.table_name        AS child_table,
  kcu.column_name      AS fk_column,
  ccu.table_name       AS parent_table,
  ccu.column_name      AS parent_column,
  CASE WHEN ix.indexname IS NULL THEN '⚠ NO INDEX' ELSE ix.indexname END AS index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes ix
  ON ix.tablename = tc.table_name AND ix.indexdef LIKE '%(' || kcu.column_name || ')%'
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY child_table;
    `,
    bugs: `
REAL PRODUCTION BUGS FROM CONSTRAINT MISUNDERSTANDING:
------------------------------------------------------

BUG 1: ON DELETE CASCADE silently deletes 200,000 rows — data loss in production
  Scenario: Customer support team deleted a test organization account.
    Expected: the organization row and its users deleted.
    Actual: organization → users → orders → order_items → invoices → payments.
    200,000 rows deleted across 6 tables in 800ms. No undo. Production data gone.
  Root cause: Every FK was defined with ON DELETE CASCADE by default (copied from template).
    Nobody questioned whether cascading payments/invoices made sense.
  Fix: Default to ON DELETE RESTRICT for financially significant data:
    REFERENCES organizations(id) ON DELETE RESTRICT -- Can't delete if orders exist
  Prevention: Review every FK's ON DELETE behavior during code review.
    Rule: ON DELETE CASCADE only for "child cannot exist without parent" (e.g., order_items → orders).
    NEVER for financial records (payments, invoices), audit logs, or user-generated content.

BUG 2: UNIQUE constraint missing on FK — race condition allows duplicate team memberships
  Scenario: Team invitation system. "Add user to team" endpoint checked:
    IF NOT EXISTS (SELECT 1 FROM team_members WHERE user_id=X AND team_id=Y) THEN INSERT.
    Under concurrent load: two requests checked simultaneously (both saw no existing row),
    both inserted → same user appears twice in the team → application crashes on display.
  Root cause: No UNIQUE constraint on (user_id, team_id). Application-level check not atomic.
  Fix:
    ALTER TABLE team_members ADD CONSTRAINT uq_team_member UNIQUE (team_id, user_id);
    -- Or: INSERT ... ON CONFLICT (team_id, user_id) DO NOTHING; (idempotent invite)
  Lesson: Any "should only exist once" relationship needs a UNIQUE constraint, not just app-level check.

BUG 3: CHECK constraint passes NULL — negative amounts reach the database
  Scenario: Refund processing created orders with amount = NULL (bug in refund calculation).
    CHECK (amount > 0) didn't catch it. NULL > 0 evaluates to NULL (not FALSE) — check passes.
    Downstream revenue reports showed NULL instead of 0 for some orders. Aggregates silently wrong.
  Root cause: NULL passes all CHECK constraints (NULL IS NOT FALSE).
  Fix: Explicit NOT NULL either as column constraint OR inside CHECK:
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0)
    -- OR: CHECK (amount IS NOT NULL AND amount > 0)
  Lesson: NOT NULL and CHECK are separate guards. A CHECK on a nullable column silently passes NULLs.

BUG 4: ENUM type blocking migration — adding a status value caused 45-minute deployment
  Scenario: Product team added "returned" to order status. Migration: ALTER TYPE order_status ADD VALUE 'returned'.
    In PostgreSQL 12: this required an ACCESS EXCLUSIVE lock on all tables using that type.
    With 200 tables referencing the ENUM: 45-minute lock cascade during peak hours. Production outage.
  Root cause: PostgreSQL ENUM ALTER requires table rewrites in some versions.
    Team had used ENUM for "safety" without understanding migration costs.
  Fix: Migrate all ENUM columns to TEXT + CHECK:
    -- Step 1: add TEXT column
    ALTER TABLE orders ADD COLUMN status_new TEXT;
    -- Step 2: copy data
    UPDATE orders SET status_new = status::TEXT;
    -- Step 3: add constraint
    ALTER TABLE orders ADD CONSTRAINT chk_status CHECK (status_new IN ('pending','confirmed',...));
    -- Step 4: swap columns (zero-downtime multi-deploy)

BUG 5: Partial unique index not used — duplicate soft-deleted users allowed when they shouldn't be
  Scenario: Email uniqueness enforced with partial unique index WHERE deleted_at IS NULL.
    Bug in delete flow: set deleted_at to NOW() BUT also set email to NULL (trying to "free" the email).
    Partial index condition: NULL email rows are excluded from the index entirely (NULL != any value).
    New user registers with same email → succeeds → partial index ignores the deleted row anyway.
    Two active users could end up with same email if deletion sets email=NULL then active user registers,
    then deletion is undone (deleted_at set back to NULL) — now two active users, same email=NULL... chaos.
  Fix: Don't clear email on soft delete. The partial unique index handles the re-registration case cleanly.
    If you must clear PII on deletion: use a separate anonymized_email column, keep original email intact.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE CONSTRAINT BEHAVIOR:
  Given these tables and data:

  CREATE TABLE products (
    id    BIGSERIAL PRIMARY KEY,
    sku   TEXT UNIQUE,
    price NUMERIC CHECK (price > 0),
    stock INT  CHECK (stock >= 0)
  );
  INSERT INTO products (id, sku, price, stock) VALUES (1, 'PHONE-01', 999.00, 10);

  Predict: does each statement succeed or fail? What error (if any)?

  a) INSERT INTO products (sku, price, stock) VALUES ('PHONE-01', 500.00, 5);
     Result: ___ Error: ___

  b) INSERT INTO products (sku, price, stock) VALUES ('TABLET-01', NULL, 5);
     Result: ___ Why? (CHECK constraint on price — what does NULL > 0 return?)

  c) INSERT INTO products (sku, price, stock) VALUES ('TABLET-01', -1.00, 5);
     Result: ___

  d) UPDATE products SET stock = -1 WHERE id = 1;
     Result: ___

  e) INSERT INTO products (sku, price, stock) VALUES (NULL, 299.00, 0);
     Result: ___ (Is NULL allowed in a UNIQUE column?)

  f) INSERT INTO products (sku, price, stock) VALUES (NULL, 299.00, 0);
     -- Second insert of NULL sku
     Result: ___ (Can two rows have NULL in a UNIQUE column?)

CHALLENGE 2 — FIX THE CONSTRAINT BUGS:
  This schema for a SaaS multi-tenant app has 5 constraint problems. Find and fix each.

  CREATE TABLE tenants (id BIGSERIAL PRIMARY KEY, name TEXT, subdomain TEXT);
  -- Problem 1: subdomain should be unique and required

  CREATE TABLE tenant_users (
    id        BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),  -- Problem 2: missing ON DELETE, missing NOT NULL
    email     TEXT,                           -- Problem 3: not unique within tenant
    role      TEXT DEFAULT 'user',            -- Problem 4: no constraint on valid roles
    balance   NUMERIC DEFAULT 0              -- Problem 5: should not be negative
  );

  For each problem:
  a) State what bug it causes in production.
  b) Write the corrected DDL (ALTER TABLE or CREATE TABLE).

CHALLENGE 3 — BUILD FROM SCRATCH:
  Design the complete constraint setup for an online exam platform.

  Entities:
  - exams (title, duration_minutes, pass_score_pct, max_attempts, published_at)
  - questions (exam_id, question_text, question_type, points, sort_order)
  - options (question_id, option_text, is_correct, sort_order)
  - attempts (user_id, exam_id, started_at, submitted_at, score_pct, passed)
  - answers (attempt_id, question_id, selected_option_id, answered_at)

  Constraints to implement:
  1. An exam must have pass_score_pct between 0 and 100, max_attempts between 1 and 10
  2. A question's points must be positive
  3. A multiple-choice question must have exactly one correct option (trigger-based constraint)
  4. A user cannot start a new attempt if they've already passed (partial unique index)
  5. A user cannot exceed max_attempts per exam (trigger-based constraint)
  6. submitted_at must be after started_at (CHECK constraint)
  7. An answer must reference a question that belongs to the same exam as the attempt
     (This is tricky — standard FK can't express this cross-table constraint)

  Write all CREATE TABLE statements, constraints, indexes, and the two trigger functions.
    `,
    summary: `Database constraints are your last-resort data quality guarantee — they catch violations that concurrent requests cause between application-level validation and the actual write. The four rules: never rely solely on application validation for uniqueness or range checks (use UNIQUE and CHECK); default FK deletes to RESTRICT, not CASCADE; always index FK columns on the child side; and prefer CHECK over ENUM for evolving status columns.`
  },

  {
    id: 10,
    title: "Connection Pooling & Scale",
    tag: "WHY YOUR DATABASE CHOKES AT 1000 USERS",
    color: "#1E3A5F",
    tldr: `PostgreSQL spawns a separate OS process for every database connection — each consuming ~5–10MB of RAM plus CPU overhead for context switching. At 500 connections, that's 2.5–5GB just for idle connections doing nothing. Connection poolers (PgBouncer, Supabase Pooler) sit between your application and PostgreSQL, multiplexing thousands of application connections onto a small set of real database connections. Getting pooling wrong is the #1 reason PostgreSQL-backed applications fail under load.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My app works fine locally but PostgreSQL crashes at 200 concurrent users"
  → Each HTTP request opens a new database connection. 200 users = 200 connections.
  → PostgreSQL default max_connections = 100. At 201: "FATAL: sorry, too many clients already."
  → Without a connection pool, your app is effectively single-threaded at the database layer.

"I added more RAM but database performance didn't improve under load"
  → 1000 connections, each idle: 5-10GB RAM consumed just for process overhead.
  → The bottleneck isn't RAM — it's connection count and context switching overhead.
  → Solution: PgBouncer reduces real connections from 1000 to 20. Same work, 50× less process overhead.

"PgBouncer transaction pooling broke my prepared statements"
  → Session pooling: one client → one server connection (just like without pooler).
  → Transaction pooling: client gets a connection for the duration of a transaction only.
    Between transactions: the connection goes back to the pool. Client may get different server connection.
  → Prepared statements are server-connection-scoped. With transaction pooling: prepared statement
    from client A's previous connection may not exist on the new connection client A gets next request.
  → Fix: use unnamed prepared statements, or use PgBouncer session pooling, or use Supavisor (which
    handles prepared statements in transaction mode by tracking them per client).

"What's the right connection pool size? How many connections should I configure?"
  → Common mistake: set pool size = max_connections (e.g., 100). Every app server fills its pool.
  → 10 app servers × 100 pool size each = 1000 connections. PostgreSQL overwhelmed.
  → Formula: pool_size = (num_cores × 2) + num_effective_disk_spindles.
    For 8-core server with SSD (treat as 1 spindle): pool_size ≈ (8×2)+1 = 17.
    Total connections = app_servers × pool_size_per_server. Must fit within max_connections.

"Edge functions / serverless can't use traditional connection poolers — why?"
  → Serverless functions are stateless and ephemeral. Can't hold a persistent TCP connection.
  → Each invocation may run on different hardware. Can't pre-warm a connection pool.
  → Solution: Neon serverless driver uses HTTP-based connections (one HTTP request = one query).
    Or: use a connection pooler with session pooling at the edge (Supabase's Supavisor).
    `,
    analogy: `
THE RESTAURANT ANALOGY:
------------------------
Your PostgreSQL database = a restaurant kitchen with 8 chefs (CPU cores).
Database connections = customers sitting at tables waiting to order.

WITHOUT A CONNECTION POOL (Direct Connections):
  Each customer (app request) gets their own dedicated waiter (OS process).
  Waiter stands at the customer's table even when the customer is thinking (idle connection).
  Restaurant: 8 chefs. 500 customers. 500 waiters. Only 8 customers being served at a time.
  499 waiters standing idle, bumping into each other, consuming space, using oxygen.
  Kitchen chaos: waiters tripping over each other trying to get to the 8 chefs.
  CPU time wasted: OS scheduling 500 processes even though 8 are actually doing work.

WITH A CONNECTION POOL (PgBouncer):
  PgBouncer = a maître d' at the front of the restaurant.
  500 app threads want to make queries → all register with the maître d'.
  Maître d' maintains ONLY 17 active waiters (matching the 8 chefs' capacity).
  When a customer needs to order: maître d' assigns an available waiter. Order placed. Waiter returns to pool.
  Customer (app thread) waits at the door briefly if all 17 waiters are busy.
  Kitchen: 8 chefs, 17 waiters = perfectly loaded. No idle waiters standing around.

SESSION POOLING = DEDICATED WAITER FOR VISIT:
  You get your own waiter for your entire dining experience. Waiter not shared.
  Pros: full session features (server-side prepare, temp tables, session variables).
  Cons: waiter idle during long pauses (between courses). Less efficient for high concurrency.

TRANSACTION POOLING = WAITER SHARED BETWEEN COURSES:
  Waiter takes your order (transaction), goes to kitchen, comes back with food.
  Then waiter serves other tables while you eat (between transactions).
  Pros: maximum efficiency. 17 waiters serve 500 customers.
  Cons: waiter might be different for each course. Anything you told the previous waiter (prepared
    statements, session variables, temp tables) is forgotten. Must start fresh each time.

THE FORMULA = RIGHT-SIZING THE WAIT STAFF:
  8 chefs (CPU cores) × 2 = 16 concurrent operations at 100% CPU.
  +1 for occasional disk I/O waits = 17 total waiters.
  More than 17: chefs overwhelmed, everyone waits longer. Diminishing returns above this number.
  Counterintuitive: FEWER connections = BETTER throughput when connections > core count.

SERVERLESS = TAKEOUT ORDERS (NO SEATED TABLES):
  Edge function = customer calling in a takeout order. No table. No waiter. One call per order.
  Traditional TCP connection = requires reserving a table (persistent connection, session state).
  HTTP-based connection = place order, get result, hang up. No persistent reservation needed.
  Neon/Supabase edge driver: sends SQL over HTTP. Kitchen processes it. Returns result. No "table" held.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — CONNECTION POOLING INTERNALS:
---------------------------------------------------------

WHY CONNECTIONS ARE EXPENSIVE (PostgreSQL Process Model):
  PostgreSQL uses a process-per-connection model (not threads).
  For each connection:
    Fork: OS forks a new postgres backend process (~1ms overhead per connection).
    Memory: each backend allocates private memory (work_mem, local buffers, stack, shared memory map).
      Minimum: ~5MB per connection. With work_mem=256MB: up to 261MB per connection.
    Shared memory: backend maps into shared_buffers (same physical pages, but each mapping has overhead).
    CPU: OS scheduler must context-switch between all active processes. At 500 processes: noticeable overhead.
  
  max_connections × memory_per_connection formula:
    max_connections = 200, work_mem = 4MB → 200 × (5 + 4) MB = 1.8GB minimum.
    max_connections = 200, work_mem = 256MB → 200 × (5 + 256) MB = 52GB! (most idle, but still mapped)
  
  This is why PostgreSQL documentation recommends: max_connections ≈ 100–200 with a connection pooler.

PGBOUNCER ARCHITECTURE:
  PgBouncer is a single-threaded lightweight proxy. Runs as a separate process.
  
  Client connections (application → PgBouncer): can be thousands. PgBouncer handles with async I/O.
  Server connections (PgBouncer → PostgreSQL): limited by pool_size. Typically 10–50.
  
  Pooling modes:
    Session: one server connection per client session. Fully compatible with all features.
      Use for: apps with session state (temp tables, SET variables, advisory locks, LISTEN/NOTIFY).
    Transaction: server connection acquired per transaction. Released after COMMIT/ROLLBACK.
      Use for: stateless REST APIs, microservices. Most efficient. ~10× more concurrency than session.
      INCOMPATIBLE with: prepared statements (server-scoped), SET commands that persist, LISTEN.
    Statement: server connection released after EACH statement. Only for autocommit mode.
      Rarely used. Breaks multi-statement transactions.
  
  PgBouncer key config (pgbouncer.ini):
    pool_mode = transaction
    max_client_conn = 10000    -- PgBouncer accepts this many app connections
    default_pool_size = 20     -- Real postgres connections per database+user pair
    min_pool_size = 5          -- Always keep 5 connections ready (warm pool)
    reserve_pool_size = 5      -- Extra connections for emergencies
    server_idle_timeout = 600  -- Release idle server connections after 10min
    client_idle_timeout = 0    -- Keep client connections until they disconnect

SUPABASE POOLER (SUPAVISOR):
  Supabase runs Supavisor — a distributed connection pooler built in Elixir.
  Two connection strings:
    Direct (port 5432): bypasses pooler. Use for: migrations, admin tasks, long transactions.
    Pooler (port 6543): goes through Supavisor. Use for: application queries from many serverless instances.
  
  Supavisor advantages over PgBouncer:
    Handles prepared statements in transaction mode (tracks prepared statements per client, re-prepares on new server connection).
    Horizontally scalable (multiple Supavisor instances behind a load balancer).
    JWT authentication support for Row Level Security.

NEON SERVERLESS DRIVER:
  Neon's postgres driver sends SQL queries over HTTP (WebSockets for streaming).
  No persistent TCP connection required.
  Each query = one HTTPS request + response. Stateless.
  
  Use case: Vercel Edge Functions, Cloudflare Workers — environments with no persistent TCP.
  Limitation: latency higher than TCP (HTTP overhead per query ~5–20ms vs ~0.5ms for TCP).
    For Edge: acceptable (query is the bottleneck, not the connection setup).
  
  import { neon } from '@neondatabase/serverless'; // Conceptual — don't use import in string
  // const sql = neon(process.env.DATABASE_URL);
  // const rows = await sql\`SELECT * FROM users WHERE id = \${userId}\`;

POOL SIZING FORMULA:
  Based on Little's Law and PostgreSQL benchmark research (by Percona / pgBouncer docs):
  
  Optimal connections = (num_cpu_cores × 2) + num_effective_disk_spindles
  
  For cloud instances:
    t3.medium (2 vCPU, SSD): optimal = 2×2 + 1 = 5 connections.
    c5.2xlarge (8 vCPU, SSD): optimal = 8×2 + 1 = 17 connections.
    db.r6g.4xlarge (16 vCPU): optimal = 16×2 + 1 = 33 connections.
  
  "Effective spindles" for SSD = 1 (SSDs serve random I/O near-sequentially; no seek time penalty).
  For HDD RAID: count actual spindles.
  
  Total connections calculation:
    app_servers × pool_size_per_server ≤ max_connections (leave ~10 for admin/monitoring)
  
  Example:
    max_connections = 100. Reserve 10. Available = 90.
    4 app servers → pool_size_per_server = 90 / 4 ≈ 22 connections each.
    PgBouncer sits in front → PgBouncer's pool_size = 90 → each app server holds thousands of CLIENT connections to PgBouncer.

MONITORING CONNECTIONS:
  pg_stat_activity: shows all current connections, their state, and query.
  Key states:
    active: query currently executing.
    idle: connected but no query running (wasted connection).
    idle in transaction: in an open transaction but not executing. DANGER — holds locks.
    idle in transaction (aborted): transaction failed, app forgot to ROLLBACK. DANGER.
    waiting: waiting for a lock held by another connection.
  
  Connection saturation alert:
    IF (SELECT count(*) FROM pg_stat_activity) / max_connections > 0.8 → alert!
    `,
    code: `
-- ===== CONNECTION POOLING & SCALE — SQL AND CONFIG EXAMPLES =====

-- EXAMPLE 1: Diagnosing connection problems in production

-- Count connections by state (what's consuming your connection budget):
SELECT
  state,
  wait_event_type,
  wait_event,
  COUNT(*)                                      AS connection_count,
  MAX(EXTRACT(EPOCH FROM (NOW() - state_change)))::INT AS max_age_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type, wait_event
ORDER BY connection_count DESC;

-- Expected healthy output:
-- active         | NULL       | NULL   | 5    | 2     ← queries executing
-- idle           | Client     | ClientRead | 15 | 300  ← connected but idle (OK if pooled)
-- idle in transaction | Lock | relation | 1  | 45    ← DANGER: holding lock for 45s

-- Find long-running idle-in-transaction connections (lock hoarders):
SELECT
  pid,
  usename,
  application_name,
  state,
  NOW() - state_change AS idle_duration,
  LEFT(query, 100)      AS last_query
FROM pg_stat_activity
WHERE state IN ('idle in transaction', 'idle in transaction (aborted)')
  AND NOW() - state_change > INTERVAL '30 seconds'
ORDER BY idle_duration DESC;

-- Kill a specific idle-in-transaction connection:
-- SELECT pg_terminate_backend(12345); -- Replace 12345 with pid

-- EXAMPLE 2: Connection count vs max_connections — saturation monitoring

-- Current connection usage as a percentage:
SELECT
  COUNT(*)                               AS current_connections,
  (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  ROUND(
    COUNT(*)::NUMERIC /
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') * 100, 1
  )                                      AS utilization_pct,
  COUNT(*) FILTER (WHERE state = 'active')          AS active_queries,
  COUNT(*) FILTER (WHERE state LIKE 'idle%')        AS idle_connections,
  COUNT(*) FILTER (WHERE wait_event_type = 'Lock')  AS waiting_on_locks
FROM pg_stat_activity
WHERE datname = current_database();

-- Alert: utilization_pct > 80% → connection pressure, add pooler or reduce pool_size per app server
-- Alert: idle_connections / current_connections > 0.7 → too many idle connections → reduce pool_size

-- EXAMPLE 3: PgBouncer configuration (pgbouncer.ini format — as SQL comments for reference)
-- This is a reference configuration, not executable SQL

/*
[databases]
myapp = host=localhost port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction          -- transaction pooling for stateless APIs
max_client_conn = 10000          -- up to 10k app connections to PgBouncer
default_pool_size = 20           -- 20 real PostgreSQL connections per db/user pair
min_pool_size = 5                -- keep 5 warm connections always
reserve_pool_size = 5            -- emergency extra connections
reserve_pool_timeout = 5.0       -- use reserve pool after 5s wait

server_idle_timeout = 600        -- return idle server connections to pool after 10min
client_idle_timeout = 3600       -- disconnect idle clients after 1hr
server_connect_timeout = 15      -- fail fast if PostgreSQL unreachable

-- Connection health checks:
server_check_delay = 30          -- test server connection every 30s
server_check_query = SELECT 1    -- health check query
*/

-- EXAMPLE 4: Pool sizing calculator query

WITH server_info AS (
  SELECT
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_pg_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) AS current_connections
),
cpu_estimate AS (
  -- Estimate optimal pool size (substitute actual CPU count for your server)
  SELECT
    8 AS cpu_cores,                        -- Replace with actual vCPU count
    1 AS effective_spindles                -- 1 for SSD, actual count for HDD RAID
),
pool_sizing AS (
  SELECT
    s.max_pg_connections,
    s.current_connections,
    c.cpu_cores * 2 + c.effective_spindles AS optimal_total_connections,
    ROUND((s.max_pg_connections - 10)::NUMERIC / 4, 0) AS pool_size_per_app_server  -- Assuming 4 app servers
  FROM server_info s CROSS JOIN cpu_estimate c
)
SELECT
  max_pg_connections,
  current_connections,
  optimal_total_connections,
  pool_size_per_app_server,
  CASE
    WHEN current_connections > optimal_total_connections * 1.5
      THEN 'OVER-SUBSCRIBED: reduce pool_size or add PgBouncer'
    WHEN current_connections < optimal_total_connections * 0.5
      THEN 'UNDER-UTILIZED: pool_size can be increased'
    ELSE 'HEALTHY: connections within optimal range'
  END AS recommendation
FROM pool_sizing;

-- EXAMPLE 5: Detecting prepared statement issues with transaction pooling

-- Prepared statements are SERVER CONNECTION-scoped.
-- With transaction pooling: next transaction may get a DIFFERENT server connection.
-- The prepared statement from the previous connection is GONE.

-- PROBLEMATIC pattern with transaction pooling:
-- PREPARE my_stmt (BIGINT) AS SELECT * FROM orders WHERE customer_id = $1;
-- EXECUTE my_stmt(42); -- May fail: "prepared statement does not exist" on new connection

-- SAFE with transaction pooling: use $1 placeholder in the query directly (unnamed prepared statement)
-- Most ORMs do this automatically. Verify by checking application driver docs.

-- Check which prepared statements exist on current connection:
SELECT name, statement, parameter_types
FROM pg_prepared_statements;
-- If using PgBouncer transaction mode: this should be empty between transactions.
-- If you see statements here during transaction pooling: potential issue with named prepared statements.

-- EXAMPLE 6: idle_in_transaction_session_timeout — auto-kill stuck transactions

-- Set in postgresql.conf for all connections:
-- idle_in_transaction_session_timeout = 300000  -- 5 minutes in ms

-- Or per-session (for specific application roles):
SET idle_in_transaction_session_timeout = '5min';

-- Or per-role (recommended for application users):
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '5min';
ALTER ROLE app_user SET statement_timeout = '30s';  -- Also: kill runaway queries

-- Verify settings:
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN ('idle_in_transaction_session_timeout', 'statement_timeout', 'max_connections');

-- EXAMPLE 7: Application-level connection pool configuration (Node.js pg pattern — as comments)

/*
// node-postgres (pg) pool configuration for a production API server
// import { Pool } from 'pg';  -- reference only

const pool = {
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 6432,                      // PgBouncer port, not 5432

  // Pool sizing: (cpu_cores * 2 + 1) / num_app_servers
  // For 4-core app server, 4 app servers, PgBouncer with 20 real connections:
  max: 5,                          // 5 connections per app server × 4 servers = 20 total
  min: 2,                          // Keep 2 warm connections always
  idleTimeoutMillis: 30000,        // Release idle connection after 30s
  connectionTimeoutMillis: 5000,   // Fail fast if can't connect in 5s

  // With PgBouncer transaction pooling — disable prepared statements at driver level:
  // Some drivers: { prepare: false } or use query strings not named prepared statements
};

// Health check: check pool stats
// pool.totalCount: total connections in pool
// pool.idleCount: idle connections
// pool.waitingCount: requests waiting for a connection (0 = healthy)
// If waitingCount > 0 consistently: pool exhausted, increase pool size or check for slow queries
*/
    `,
    bugs: `
REAL PRODUCTION BUGS FROM CONNECTION POOLING MISUNDERSTANDING:
---------------------------------------------------------------

BUG 1: No connection pooler — "too many clients" error at 100 users
  Scenario: Node.js API deployed to 10 EC2 instances, each with pg pool max=20.
    10 instances × 20 connections = 200 connections. PostgreSQL max_connections=100.
    At 50+ concurrent users: "FATAL: sorry, too many clients already." API returns 500 errors.
  Root cause: Application connects directly to PostgreSQL (port 5432). Each instance maintains
    up to 20 connections. 10 instances = 200 needed, 100 available → contention.
  Fix:
    1. Deploy PgBouncer on a dedicated instance.
    2. All app instances connect to PgBouncer (port 6432) instead of PostgreSQL directly.
    3. PgBouncer maintains 20 real PostgreSQL connections (pool_size=20).
    4. 10 app instances × 20 each = 200 client connections → PgBouncer → 20 server connections.
    5. PostgreSQL sees 20 connections. 10× improvement in capacity.

BUG 2: Transaction pooling with session-level SET commands — configuration lost silently
  Scenario: Application set SET TIME ZONE 'Asia/Kolkata' at connection start.
    With PgBouncer transaction pooling: SET applies to the server connection.
    Next transaction: gets a DIFFERENT server connection. Timezone is UTC again.
    Timestamps displayed as UTC instead of IST. Subtle, hard-to-reproduce bug.
  Root cause: SET command changes server connection state. With transaction pooling:
    connection returned to pool after transaction. Next transaction: different connection, different state.
  Fix: Set timezone in postgresql.conf globally:
    timezone = 'Asia/Kolkata'  -- in postgresql.conf
    Or: SET TIMEZONE at the database or role level:
    ALTER DATABASE myapp SET timezone = 'Asia/Kolkata';
    ALTER ROLE app_user SET timezone = 'Asia/Kolkata';
    These are applied automatically on every new connection by PostgreSQL.

BUG 3: Pool size too large — more connections than CPU cores, throughput DECREASES
  Scenario: DBA saw "connection timeouts" under load. Solution: increased pool_size from 20 to 200.
    Result: timeouts got WORSE. p99 latency went from 800ms to 4 seconds.
  Root cause: 200 connections competing for 8 CPU cores. Scheduler overhead dominates.
    Each query runs in a separate OS process. 200 processes competing for 8 cores = 25× context switching.
    Queries that used to take 50ms now wait 200ms just for CPU time.
  Fix: Reduce pool_size to (cpu_cores × 2) + 1 = 17 for this 8-core server.
    200 idle connections → 17 working connections: p99 latency drops from 4s to 120ms.
  Insight: "More connections = more throughput" is WRONG for PostgreSQL above optimal pool size.

BUG 4: Prepared statements with PgBouncer transaction pooling — "statement does not exist"
  Scenario: Java application (Hibernate) used named prepared statements.
    Worked fine with session pooling. Switched to transaction pooling for efficiency.
    Began seeing: "ERROR: prepared statement S_1 does not exist."
    Happened randomly — harder to debug because it worked 90% of the time.
  Root cause: Hibernate prepared statement "S_1" was prepared on server connection C1.
    After transaction commit: C1 returned to pool. Next transaction: got connection C2.
    "S_1" doesn't exist on C2. Error.
  Fix options:
    1. Stay on session pooling (safe but less efficient).
    2. Configure Hibernate to use unnamed/protocol-level prepared statements (resets per connection).
    3. Use Supavisor instead of PgBouncer (Supavisor handles this transparently).
    4. Disable statement caching in the connection pool (use simple queries instead of named prepared).

BUG 5: Serverless Lambda connecting directly to PostgreSQL — connection exhaustion and cold start latency
  Scenario: AWS Lambda functions processing orders each opened a direct PostgreSQL connection.
    At 50 concurrent Lambda invocations: 50 connections. Fine.
    Black Friday: 5,000 concurrent invocations. 5,000 connections. PostgreSQL OOM-killed.
    Also: each Lambda cold start spent 200-400ms establishing a TCP connection to PostgreSQL.
  Root cause: Serverless functions can't hold persistent connections. Each invocation = new connection.
    No connection pooling at Lambda level. Direct connection = one OS process per invocation.
  Fix:
    1. Use RDS Proxy (AWS managed connection pooler) or PgBouncer on EC2.
    2. Lambda connects to proxy (port 6432) → proxy maintains 20 real PG connections.
    3. 5,000 Lambda invocations → all share 20 database connections via proxy.
    4. For Neon/Supabase: use HTTP-based serverless driver (no TCP connection needed at all).
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE CONNECTION BEHAVIOR:
  You have: PostgreSQL max_connections=100, PgBouncer pool_mode=transaction, default_pool_size=20.
  Your app: 5 servers, each with a pg connection pool max=50.

  a) How many connections does PostgreSQL see at max load?
     (a) 250  (b) 20  (c) 100  (d) 5

  b) How many client connections can PgBouncer handle simultaneously?
     (a) 20  (b) 100  (c) Thousands (limited by max_client_conn, e.g., 10000)  (d) 250

  c) Your application does:
     SET search_path = myschema;       -- Session variable
     SELECT * FROM users LIMIT 10;    -- Transaction 1
     SELECT * FROM orders LIMIT 10;   -- Transaction 2 (new transaction after commit)
     
     With PgBouncer transaction pooling: does Transaction 2 see the SET search_path?
     Why or why not? What's the fix?

  d) A developer argues: "We have 64GB RAM, so let's set max_connections=1000 to handle more load."
     Our server has 16 CPU cores. Why is this argument wrong?
     Calculate the actual optimal connection count and explain why.

CHALLENGE 2 — DIAGNOSE THE PRODUCTION INCIDENT:
  Your monitoring shows:
  - API response time: 5 seconds (normal: 200ms)
  - pg_stat_activity shows:
    state='active': 18 rows
    state='idle in transaction': 47 rows (average age: 8 minutes!)
    state='idle': 22 rows
    wait_event_type='Lock': 31 rows
  - max_connections = 100, current connections = 87

  a) What is the root cause of the slowdown? (Not "too many connections" — what SPECIFICALLY?)

  b) Write the pg_stat_activity query to find the specific sessions holding locks that others are waiting on.
     (Hint: use pg_blocking_pids() function)

  c) What immediate fix terminates the problematic sessions?
     Write the SQL to kill all sessions idle in transaction for more than 5 minutes.

  d) What configuration change prevents this in the future?
     Write the ALTER ROLE command for the application user.

  e) If you were architecting this system from scratch: what connection setup would prevent this scenario?
     (PgBouncer config choices, pool_size, timeouts)

CHALLENGE 3 — DESIGN THE CONNECTION ARCHITECTURE:
  Design the complete connection architecture for a fintech SaaS with these characteristics:
  - 3 regions: Mumbai, Singapore, Frankfurt
  - 1 primary PostgreSQL (Mumbai), 2 read replicas (Singapore, Frankfurt)
  - Expected: 200 concurrent users per region at peak
  - Workload: 80% reads, 20% writes
  - Migrations run 3× per week

  Design:
  1. Connection pooler placement: where does PgBouncer run? How many instances?
  2. Pool sizing: calculate default_pool_size for each region's PgBouncer
     (Primary: 16 vCPU, replicas: 8 vCPU)
  3. Read/write routing: how do reads go to replicas and writes to primary?
     (Write the two connection strings your app would use)
  4. Migration connection: why should migrations use direct connection (port 5432)?
     What could go wrong running migrations through PgBouncer transaction pooling?
  5. Failover: if Mumbai primary goes down, how do connections route?
     What is the role of the pooler in this scenario?
    `,
    summary: `Connection pooling is not an optimization — it's a prerequisite for any PostgreSQL application that serves more than a handful of concurrent users. Every direct connection consumes 5-10MB of RAM and a full OS process; a pool of 17 connections can serve thousands of concurrent application threads with lower latency than 200 direct connections competing for 8 CPU cores. The mental model to internalize: more connections beyond the CPU-core formula decreases throughput, never increases it.`
  },

  {
    id: 11,
    title: "Migrations — The Underestimated Skill",
    tag: "CHANGING PRODUCTION SCHEMAS WITHOUT DOWNTIME",
    color: "#7C3AED",
    tldr: `Database migrations on production tables with millions of rows are the highest-risk moments in a deployment. A naive ALTER TABLE ADD COLUMN NOT NULL or CREATE INDEX on a large table acquires an ACCESS EXCLUSIVE lock, blocking all reads and writes for minutes or hours. Zero-downtime migration requires specific patterns: add nullable columns first, backfill in batches, then add NOT NULL; always use CONCURRENTLY for indexes; and adopt a multi-deploy strategy for column renames and deletions.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I added a NOT NULL column in a migration — it locked the table for 8 minutes"
  → ALTER TABLE ADD COLUMN col TEXT NOT NULL DEFAULT 'value': rewrites every row on pre-PG11.
  → PostgreSQL 11+: if default is a constant (not a function), stored in catalog — no rewrite!
  → But for large tables: still validates every row to ensure NOT NULL. Use the 3-step pattern.

"I ran CREATE INDEX and all queries on that table hung for 10 minutes"
  → CREATE INDEX acquires ACCESS SHARE LOCK on the table — blocks writes.
  → More precisely: takes SHARE lock during index build, which blocks concurrent writes.
  → Fix: CREATE INDEX CONCURRENTLY — builds without blocking reads OR writes. Takes longer but safe.

"I renamed a column in the database but didn't update the application first — production down"
  → Classic "rename causes immediate breakage." Any deployed application code using old column name breaks.
  → Safe approach: never rename. Add new column → backfill → update app to use new column → drop old column.
    Spread across 2-4 deployments. Old and new column coexist during transition.

"My migration UPDATE on 50M rows took 3 hours and locked the table the whole time"
  → Single UPDATE touching millions of rows: one huge transaction, one table lock for the duration.
  → Batch UPDATE: update 1,000 rows at a time, commit after each batch. Lock held briefly per batch.
  → Other transactions proceed between batches. Total time same but no continuous lock.

"I added a NOT NULL FK column — can I roll back this migration?"
  → Adding NOT NULL: rollback is just DROP NOT NULL constraint — fast.
  → Adding a column: rollback is DROP COLUMN — fast.
  → But: if you also backfilled data, DROP COLUMN loses that data permanently.
  → And: if app code already deployed reads the new column, rolling back schema breaks app.
  → Schema rollback requires app rollback first. They must be synchronized.
    `,
    analogy: `
THE HIGHWAY CONSTRUCTION ANALOGY:
-----------------------------------
Your production database table = a busy highway (100,000 cars/hour).
A migration = highway construction project.

NAIVE MIGRATION = CLOSING THE HIGHWAY:
  ALTER TABLE ADD COLUMN NOT NULL DEFAULT 'value' (pre-PG11 with non-constant default):
  Close all lanes. Resurface every inch. Reopen.
  Duration: 8 minutes on a 50M row table. During those 8 minutes: zero traffic. Production down.

CREATE INDEX CONCURRENTLY = CONSTRUCTION IN THE SHOULDER LANE:
  Workers build a new exit ramp (index) in the shoulder lane while traffic flows normally.
  Takes 3× longer than closing the highway, but cars never stop.
  Occasionally workers must briefly pause to check their work (two lock acquisitions: very brief, not blocking normal reads).
  Final step: brief lane merge (swap new index into place). Sub-millisecond.

THE 3-STEP NOT NULL PATTERN = ADDING A NEW TOLL BOOTH:
  Step 1 (Deploy 1): Build the new toll booth structure but leave it unoccupied (nullable column).
    Traffic flows, new cars don't need to stop there (existing rows have NULL).
  Step 2 (Backfill): Quietly equip all existing booths overnight (UPDATE in batches).
    Traffic still flows. Workers update a few hundred booths at a time between cars.
  Step 3 (Deploy 2): Make it official — the toll booth is now required (SET NOT NULL).
    Fast check: all booths already equipped. No rewrite needed. Sub-second.

COLUMN RENAME = REPLACING ROAD SIGNS WHILE CARS DRIVE:
  Rename "NH-48" to "NH-48 Bangalore Expressway."
  If you change the map (schema) but not the GPS units (deployed application code) simultaneously:
  Every GPS unit gives wrong directions until updated. Cars (queries) get lost.
  
  Safe approach: Add new sign alongside old sign. Update GPS units (app deployment) to use new sign.
  Once all GPS units updated: remove old sign. Two separate changes, two separate deployments.

BATCH BACKFILL = REPAVING IN SECTIONS:
  Full highway repave in one night: close all lanes for 6 hours.
  Sectional repave: close one mile at a time, 20 minutes each, reopen, move to next mile.
  Total time: same. Impact on traffic: minimal (one mile slowed, not the whole highway).
  Database: UPDATE 1000 rows at a time, COMMIT after each batch, repeat 50,000 times.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — MIGRATION LOCK MECHANICS:
-----------------------------------------------------

POSTGRESQL LOCK LEVELS (relevant for migrations):
  AccessShareLock: acquired by SELECT. Compatible with everything except AccessExclusiveLock.
  RowShareLock: SELECT FOR UPDATE/SHARE.
  RowExclusiveLock: INSERT, UPDATE, DELETE.
  ShareUpdateExclusiveLock: VACUUM, CREATE INDEX CONCURRENTLY, ANALYZE. Allows reads and DML.
  ShareLock: CREATE INDEX (not concurrent). Allows reads, blocks writes.
  AccessExclusiveLock: ALTER TABLE, DROP TABLE, TRUNCATE. Blocks EVERYTHING including reads.
  
  Migration operations and their locks:
    ADD COLUMN (nullable, constant default, PG11+): brief AccessExclusiveLock for catalog update only.
    ADD COLUMN NOT NULL (no default): AccessExclusiveLock + full table scan to validate.
    ALTER COLUMN SET NOT NULL: AccessExclusiveLock + full table scan.
    CREATE INDEX: ShareLock — allows reads, BLOCKS concurrent writes.
    CREATE INDEX CONCURRENTLY: ShareUpdateExclusiveLock — allows reads AND writes.
    DROP COLUMN: AccessExclusiveLock (brief — just catalog change, column data left in place until VACUUM).
    ADD CONSTRAINT CHECK: AccessExclusiveLock + full table scan for validation.
    ADD CONSTRAINT CHECK NOT VALID: AccessExclusiveLock (brief — skips validation!). Followed by:
    VALIDATE CONSTRAINT: ShareUpdateExclusiveLock — allows writes during validation scan.
    ADD FOREIGN KEY: ShareRowExclusiveLock on child + ShareLock on parent. Validates entire table.
    ADD FOREIGN KEY NOT VALID: minimal locks. Then VALIDATE CONSTRAINT separately.

ZERO-DOWNTIME NOT NULL COLUMN ADDITION:
  The 3-step pattern (safe for all PostgreSQL versions):
  
  Step 1: Add nullable column (deploy 1):
    ALTER TABLE orders ADD COLUMN processed_at TIMESTAMPTZ;
    -- Fast: just adds column definition to catalog. No row rewrite. Brief AccessExclusiveLock.
    -- Existing rows: processed_at = NULL
  
  Step 2: Backfill existing rows in batches:
    -- Script runs OUTSIDE of the deployment, before deploy 2
    DO \$\$
    DECLARE batch_size INT := 1000; last_id BIGINT := 0;
    BEGIN
      LOOP
        UPDATE orders SET processed_at = NOW()
        WHERE id > last_id AND processed_at IS NULL
        ORDER BY id LIMIT batch_size
        RETURNING id INTO last_id;
        EXIT WHEN NOT FOUND;
        PERFORM pg_sleep(0.01); -- 10ms pause between batches (be kind to I/O)
      END LOOP;
    END;
    \$\$;
  
  Step 3: Add NOT NULL constraint (deploy 2):
    -- PostgreSQL 12+: SET NOT NULL with no table scan if column has no NULLs
    -- and PostgreSQL can verify via the constraint being added as NOT VALID first:
    ALTER TABLE orders ADD CONSTRAINT orders_processed_at_not_null
      CHECK (processed_at IS NOT NULL) NOT VALID; -- Fast: skips validation scan
    ALTER TABLE orders VALIDATE CONSTRAINT orders_processed_at_not_null; -- ShareUpdateExclusiveLock (non-blocking)
    ALTER TABLE orders ALTER COLUMN processed_at SET NOT NULL; -- Now instant: constraint proves no NULLs
    ALTER TABLE orders DROP CONSTRAINT orders_processed_at_not_null; -- Clean up

CREATE INDEX CONCURRENTLY GOTCHAS:
  1. Cannot run inside a transaction block (will error). Run as standalone statement.
  2. If the build fails partway: leaves an INVALID index. Must DROP and recreate.
     Check: SELECT indexname, indisvalid FROM pg_indexes JOIN pg_index ON ... WHERE NOT indisvalid;
  3. Takes 2-3× longer than regular CREATE INDEX (builds index twice, scans table twice).
  4. During the build: two brief lock acquisitions (for the two phases). Each is very short.
  5. If a long-running transaction exists when CONCURRENTLY starts: it waits for it to finish.
     Monitor: check pg_stat_activity for transactions older than a few minutes before starting.

COLUMN RENAME — MULTI-DEPLOY STRATEGY:
  Never rename directly in production if any code is reading the old name.
  
  Deploy 1: Add new column, update writes to write to BOTH old and new column.
    ALTER TABLE users ADD COLUMN user_name TEXT;
    -- Application: writes to both 'name' AND 'user_name' simultaneously.
  
  Deploy 2 prep: Backfill new column from old for rows where new column is NULL.
    UPDATE users SET user_name = name WHERE user_name IS NULL;
  
  Deploy 2: Update application to read from new column only. Still writes to both.
    -- No schema change in this deploy.
  
  Deploy 3: Stop writing to old column. Old column is now stale.
    -- Application: writes only to 'user_name'. Old 'name' column not written.
  
  Deploy 4: Drop old column.
    ALTER TABLE users DROP COLUMN name;
    -- Brief AccessExclusiveLock (catalog change only). Old data remains in disk until VACUUM.

LOCK MONITORING DURING MIGRATIONS:
  -- Before running a migration: check for long-running queries that would be blocked:
  SELECT pid, now() - query_start AS duration, state, left(query, 100) AS query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND now() - query_start > INTERVAL '30 seconds'
  ORDER BY duration DESC;
  
  -- During migration: check if migration is waiting for a lock:
  SELECT blocked.pid, blocked.query, blocking.pid AS blocking_pid, blocking.query AS blocking_query
  FROM pg_stat_activity blocked
  JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
  WHERE blocked.query LIKE 'ALTER TABLE%' OR blocked.query LIKE 'CREATE INDEX%';

ROLLBACK CONSIDERATIONS:
  What can be rolled back:
    Additive changes: ADD COLUMN, ADD INDEX → rollback by DROP COLUMN, DROP INDEX CONCURRENTLY.
    Constraint additions: DROP CONSTRAINT.
    Default value changes: ALTER COLUMN SET DEFAULT / DROP DEFAULT.
  
  What CANNOT be easily rolled back:
    DROP COLUMN: data gone. Only restore from backup.
    NOT NULL enforcement after backfill: remove constraint quickly, but backfilled data remains.
    Data migrations (backfills): cannot "un-set" values without another backfill.
  
  Two-phase approach (expand/contract):
    EXPAND phase: add new structures without removing old (both coexist). Fully rollbackable.
    CONTRACT phase: remove old structures once all consumers migrated. Harder to rollback.
    Always deploy EXPAND first. Verify. Then CONTRACT as a separate deployment.
    `,
    code: `
-- ===== MIGRATIONS — SQL EXAMPLES =====

-- EXAMPLE 1: Unsafe vs safe column addition patterns

-- UNSAFE (pre-PG11 behavior or for non-constant defaults):
-- Locks table for entire duration on large tables:
-- ALTER TABLE orders ADD COLUMN shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0;
-- On 50M rows: 45 minutes lock time. Production blocked.

-- SAFE PATTERN (all PostgreSQL versions):
-- Step 1: Add nullable column (instant, brief catalog lock only)
ALTER TABLE orders ADD COLUMN shipping_cost NUMERIC(10,2);
-- Step 2: Set server-side default for new rows (instant)
ALTER TABLE orders ALTER COLUMN shipping_cost SET DEFAULT 0;
-- Note: default doesn't backfill existing rows, just applies to future INSERTs

-- Step 3 (out-of-band backfill — see batch update example below)
-- Step 4: Once all rows have values, add NOT NULL (fast if done correctly)

-- FAST for PG11+ with constant defaults (no backfill needed):
-- PostgreSQL 11+ stores the default in the catalog, doesn't rewrite rows.
-- New rows get the value. Old rows get it when first accessed (lazy evaluation).
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
-- Instant on PG11+. 0 rows rewritten. Brief catalog lock only.

-- EXAMPLE 2: Batch backfill — updating 50M rows without locking

DO \$\$
DECLARE
  batch_size   INT  := 5000;
  updated_rows INT;
  total_updated BIGINT := 0;
  min_id       BIGINT;
  max_id       BIGINT;
  current_start BIGINT;
BEGIN
  SELECT MIN(id), MAX(id) INTO min_id, max_id FROM orders WHERE shipping_cost IS NULL;

  IF min_id IS NULL THEN
    RAISE NOTICE 'No rows to backfill.';
    RETURN;
  END IF;

  current_start := min_id;

  LOOP
    EXIT WHEN current_start > max_id;

    -- Update one batch: rows in ID range [current_start, current_start + batch_size)
    UPDATE orders
    SET shipping_cost = CASE
      WHEN amount > 5000 THEN 0          -- Free shipping above ₹5000
      ELSE 49                            -- ₹49 shipping otherwise
    END
    WHERE id >= current_start
      AND id < current_start + batch_size
      AND shipping_cost IS NULL;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    total_updated := total_updated + updated_rows;

    RAISE NOTICE 'Backfilled rows % to %, total updated: %',
      current_start, current_start + batch_size - 1, total_updated;

    current_start := current_start + batch_size;

    -- Small sleep to reduce I/O pressure on production
    PERFORM pg_sleep(0.05);  -- 50ms pause between batches
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total rows updated: %', total_updated;
END;
\$\$;

-- EXAMPLE 3: Safe NOT NULL enforcement after backfill

-- After backfill confirms zero NULLs, add NOT NULL safely:
-- Step A: Add CHECK constraint as NOT VALID (skips full scan, no blocking)
ALTER TABLE orders
  ADD CONSTRAINT chk_shipping_cost_not_null
  CHECK (shipping_cost IS NOT NULL) NOT VALID;

-- Step B: Validate constraint (ShareUpdateExclusiveLock — non-blocking to writes)
-- This scans the table but doesn't block DML operations:
ALTER TABLE orders VALIDATE CONSTRAINT chk_shipping_cost_not_null;

-- Step C: Planner now knows column has no NULLs. Set actual NOT NULL attribute:
ALTER TABLE orders ALTER COLUMN shipping_cost SET NOT NULL;
-- Fast: PostgreSQL trusts the validated CHECK constraint — no scan needed.

-- Step D: Clean up the CHECK constraint (no longer needed):
ALTER TABLE orders DROP CONSTRAINT chk_shipping_cost_not_null;

-- EXAMPLE 4: CREATE INDEX CONCURRENTLY — the only safe index creation in production

-- UNSAFE: CREATE INDEX blocks writes for entire build duration
-- CREATE INDEX idx_orders_customer ON orders (customer_id);  -- DO NOT USE IN PRODUCTION

-- SAFE: CREATE INDEX CONCURRENTLY — reads and writes continue during build
-- MUST be run outside a transaction block (standalone statement):
CREATE INDEX CONCURRENTLY idx_orders_customer_id
  ON orders (customer_id);

-- Check for invalid indexes (CONCURRENTLY can fail leaving invalid index):
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT IN (
    SELECT indexname FROM pg_indexes WHERE indexname IN (
      SELECT indexname FROM pg_stat_user_indexes WHERE idx_scan IS NOT NULL
    )
  );

-- Better: check pg_index for invalid:
SELECT i.relname AS index_name, t.relname AS table_name, ix.indisvalid
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
WHERE NOT ix.indisvalid;
-- If any rows returned: invalid index exists. DROP and recreate.

-- EXAMPLE 5: Zero-downtime FK addition

-- Adding FK to an existing table with millions of rows:

-- UNSAFE: locks both tables during entire validation scan
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
--   FOREIGN KEY (customer_id) REFERENCES customers(id);

-- SAFE: add as NOT VALID first (skips validation, minimal locks)
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  NOT VALID;
-- Fast: just adds constraint definition. New rows validated immediately.
-- Existing rows NOT validated yet.

-- Then validate separately (ShareUpdateExclusiveLock — non-blocking to DML):
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;
-- Now all rows validated. FK fully enforced.

-- EXAMPLE 6: Lock monitoring — detect before running migrations

-- Always run this BEFORE starting a migration on a busy table:
SELECT
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  EXTRACT(EPOCH FROM (NOW() - query_start))::INT AS query_age_seconds,
  LEFT(query, 80) AS query_snippet
FROM pg_stat_activity
WHERE state != 'idle'
  AND datname = current_database()
ORDER BY query_age_seconds DESC NULLS LAST;

-- If any query has been running > 60 seconds: wait or kill before ALTER TABLE.
-- ALTER TABLE will queue behind these queries, blocking all new queries too.

-- Find blocking relationships:
SELECT
  blocked.pid     AS blocked_pid,
  blocked.query   AS blocked_query,
  blocking.pid    AS blocking_pid,
  blocking.query  AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid));

-- EXAMPLE 7: Column rename — the full multi-deploy pattern

-- The table: users with column 'full_name' → rename to 'display_name'

-- Deploy 1: Add new column and update writes:
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Application code (Deploy 1): write to BOTH columns on every INSERT/UPDATE:
-- INSERT INTO users (full_name, display_name, email) VALUES ($1, $1, $2)
-- UPDATE users SET full_name = $1, display_name = $1 WHERE id = $2

-- Backfill (run after Deploy 1, before Deploy 2):
UPDATE users SET display_name = full_name WHERE display_name IS NULL;
-- Can batch this for large tables using the batch pattern above.

-- Deploy 2: Application reads from display_name only, still writes to both.
-- No schema change.

-- Deploy 3: Application writes to display_name only (old column no longer written).
-- No schema change.

-- Deploy 4: Drop old column (after confirming it's no longer used):
ALTER TABLE users DROP COLUMN full_name;
-- Brief AccessExclusiveLock: just a catalog change. Data remains on disk until VACUUM.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM MIGRATION MISTAKES:
---------------------------------------------

BUG 1: CREATE INDEX without CONCURRENTLY — 12-minute production outage
  Scenario: A developer added a new index during a normal business-hours deploy.
    CREATE INDEX idx_orders_status ON orders (status);
    orders table: 80M rows. Index build: 12 minutes.
    During those 12 minutes: all INSERT/UPDATE/DELETE on orders table blocked.
    API endpoints that wrote orders returned 504 Gateway Timeout. 3,000 failed checkout attempts.
  Root cause: CREATE INDEX (without CONCURRENTLY) acquires a SHARE lock that blocks all writes.
  Fix: Always use CREATE INDEX CONCURRENTLY in production.
    If migration tool (Flyway, Liquibase, Alembic) doesn't support it natively:
    mark migration as "manual" and run CREATE INDEX CONCURRENTLY separately from the deploy.
  Prevention: Code review checklist: "Does this migration contain CREATE INDEX without CONCURRENTLY?"

BUG 2: Adding NOT NULL column with dynamic default — full table rewrite on 200M row table
  Scenario: Migration: ALTER TABLE user_events ADD COLUMN batch_id UUID NOT NULL DEFAULT gen_random_uuid();
    gen_random_uuid() is a VOLATILE function (not a constant).
    PostgreSQL must evaluate it for EVERY existing row → 200M row rewrite.
    Migration ran for 4 hours. Table locked the entire time. Complete production outage.
  Root cause: Non-constant (VOLATILE) defaults require row-by-row evaluation and rewrite.
    Even in PostgreSQL 11+: the "constant default optimization" only applies to immutable/stable values.
  Fix:
    Step 1: ALTER TABLE user_events ADD COLUMN batch_id UUID; -- Nullable, no default
    Step 2: Backfill in batches: UPDATE user_events SET batch_id = gen_random_uuid() WHERE id > :last_id LIMIT 1000;
    Step 3: ALTER TABLE user_events ALTER COLUMN batch_id SET NOT NULL; (after backfill)
  Result: Step 1 and 3 are instant. Step 2 runs offline in batches without locking.

BUG 3: Renaming a column in one deployment — application and database out of sync
  Scenario: Developer renamed column 'phone' to 'phone_number' in the same PR as application code.
    Deployment order: database migration runs first, then application code deploys.
    Gap: migration finished (column renamed), but old application code still reading 'phone'.
    Error: "column phone does not exist." All user profile reads failed for 90 seconds.
  Root cause: Blue-green deployment window — old app version runs while new schema is live.
    Even in a "simultaneous" deploy, there's always a window where old code + new schema coexist.
  Fix: Never rename columns. Use the expand-contract pattern:
    Deploy 1: ADD COLUMN phone_number, write to both.
    Deploy 2: Read from phone_number.
    Deploy 3: Remove write to phone.
    Deploy 4: DROP COLUMN phone.

BUG 4: Missing batch sleep — backfill overwhelmed production I/O
  Scenario: Backfill script updated 50M rows in batches of 10,000 with no sleep between batches.
    Script ran at full speed. PostgreSQL I/O utilization: 100%. WAL generation rate: 500MB/s.
    Replicas fell 2 hours behind. Replication lag triggered failover alerts.
    Other queries starved for I/O. Overall p99 latency: 8 seconds (normal: 150ms).
  Root cause: No throttling on backfill. It consumed all available I/O bandwidth.
  Fix:
    Add PERFORM pg_sleep(0.1); between batches (100ms).
    Or: SET LOCAL statement_timeout = '5s'; per batch (limit each batch's impact).
    Monitor: watch replication lag during backfill. If lag grows > 1 minute: increase sleep.
    Use pg_sleep() or application-level sleep to rate-limit the backfill.

BUG 5: Migration lock wait blocking all new queries — thundering herd
  Scenario: ALTER TABLE ran at 2pm on a table with ongoing long queries (reports running).
    ALTER TABLE queued behind a 10-minute report query (waiting for AccessExclusiveLock).
    While ALTER TABLE waited: all NEW queries on that table also queued behind the ALTER TABLE.
    After 30 seconds: queue had 400 waiting queries. App appeared completely hung.
    When the report finished: ALTER TABLE ran (5 seconds), then 400 queries executed — thundering herd.
  Root cause: Lock queue is FIFO. ALTER TABLE is an "exclusive waiter" — all new queries queue behind it.
    Even "harmless" SELECT queries can't proceed while ALTER TABLE is waiting.
  Fix:
    1. Always kill or wait for long-running queries before running ALTER TABLE.
    2. Set lock_timeout on the migration:
       SET lock_timeout = '5s'; ALTER TABLE ...; RESET lock_timeout;
       If can't acquire lock in 5s: migration fails (better than blocking 400 queries for 10 minutes).
    3. Schedule migrations during low-traffic windows.
    4. Use pg_cancel_backend() to cancel long-running queries before migration.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE LOCK BEHAVIOR:
  Table: transactions (id, user_id, amount, status, created_at) — 100M rows, production.
  A developer runs these statements in sequence. For each: (a) what lock is acquired,
  (b) does it block reads? writes? (c) how long is the lock held approximately?

  Statement 1: ALTER TABLE transactions ADD COLUMN processed_at TIMESTAMPTZ;
  Statement 2: ALTER TABLE transactions ADD COLUMN processed BOOLEAN NOT NULL DEFAULT FALSE; (PG11+)
  Statement 3: CREATE INDEX idx_transactions_user ON transactions (user_id);
  Statement 4: CREATE INDEX CONCURRENTLY idx_transactions_status ON transactions (status);
  Statement 5: ALTER TABLE transactions ADD CONSTRAINT chk_positive_amount CHECK (amount > 0) NOT VALID;
  Statement 6: ALTER TABLE transactions VALIDATE CONSTRAINT chk_positive_amount;

  Bonus: Statement 3 and 4 are running concurrently. Statement 3 holds its SHARE lock.
  A concurrent INSERT arrives. Which statement does it block with? Does Statement 4 get blocked?

CHALLENGE 2 — WRITE THE ZERO-DOWNTIME MIGRATION:
  You need to migrate this production schema change on a 200M row orders table.
  The migration must have zero downtime (no query blocking > 1 second).

  Current schema: orders (id, customer_id, total_amount NUMERIC, status TEXT)
  Required changes:
  a) Add column: subtotal NUMERIC NOT NULL (derived: total_amount * 0.9)
  b) Add column: tax_amount NUMERIC NOT NULL (derived: total_amount * 0.1)
  c) Add index: on (customer_id, status) for the query: WHERE customer_id = ? AND status = ?
  d) Add FK: customer_id references customers(id) (table has orphaned customer_ids from old data)
  e) Rename column: status → order_status (app has 3 deployed instances reading 'status')

  For each change:
  1. Write the exact SQL (multiple statements if needed)
  2. State what lock each statement acquires
  3. Specify the deployment sequence (which changes go in Deploy 1, 2, 3...)
  4. Identify which changes need out-of-band backfill scripts

CHALLENGE 3 — BUILD A MIGRATION SAFETY CHECKER:
  Write a PL/pgSQL function or a set of SQL queries that checks a proposed migration
  for safety before running it. The checker should:

  a) Detect long-running queries on the target table that would block the migration:
     Function: check_blocking_queries(table_name TEXT, min_age_seconds INT)
     Returns: table of (pid, duration, query) for all queries older than min_age_seconds on that table.

  b) Check if a table has an invalid index (failed CONCURRENTLY build):
     Function: check_invalid_indexes(table_name TEXT)
     Returns: table of (index_name, definition) for all invalid indexes.

  c) Estimate backfill batch count for a given table and batch size:
     Function: estimate_backfill_batches(table_name TEXT, batch_size INT)
     Returns: (total_rows, batch_count, estimated_minutes) assuming 1000 rows/second with 50ms sleep.

  d) Combine all three into a migration_preflight(table_name TEXT) function that runs all checks
     and returns a JSON report:
     {"blocking_queries": [...], "invalid_indexes": [...], "backfill_estimate": {...}, "safe_to_proceed": boolean}
    `,
    summary: `Zero-downtime database migrations require treating schema changes as multi-step processes spread across multiple deployments, not single ALTER TABLE statements. The three rules that prevent the most incidents: use CREATE INDEX CONCURRENTLY (never without it in production), always add nullable columns before making them NOT NULL, and treat column renames as four-deployment expand-contract operations. Every migration on a large table should be preceded by checking for long-running queries that would queue behind your ALTER TABLE and block all new queries.`
  },

  {
    id: 12,
    title: "PostgreSQL Internals & Advanced Features",
    tag: "UNDERSTANDING THE ENGINE THAT POWERS EVERYTHING",
    color: "#831843",
    tldr: `PostgreSQL's power comes from its architectural choices: MVCC (Multi-Version Concurrency Control) allows readers and writers to coexist without locking each other, at the cost of dead tuple accumulation that VACUUM must periodically clean. Row Level Security enables fine-grained, declarative access control that enforces data visibility at the database level — not the application level. Understanding PostgreSQL-specific features (arrays, composite types, JSONB, table statistics) lets you write dramatically more expressive and efficient SQL than any other database allows.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Why is my table 10× larger than the actual data in it?"
  → MVCC: every UPDATE creates a NEW row version and marks the old one as dead (not deleted).
    1M updates = 1M dead tuples accumulating until VACUUM runs.
  → VACUUM doesn't shrink the file (dead space recycled for new rows). VACUUM FULL shrinks but locks.
  → Table bloat = ratio of actual data to total space. Healthy: bloat < 20%.

"I added an RLS policy but my queries are returning all rows — why is it not enforced?"
  → RLS is disabled by default on tables. Must be enabled: ALTER TABLE t ENABLE ROW LEVEL SECURITY.
  → Also: table owners bypass RLS by default! Must also set: ALTER TABLE t FORCE ROW LEVEL SECURITY.
    (Or: use a separate application role that is NOT the table owner.)
  → Policy without USING clause: no rows visible. Policy with USING (TRUE): all rows visible.

"pg_stats shows n_distinct = -0.3 for user_id — what does that mean?"
  → Negative n_distinct: PostgreSQL uses negative values to represent a FRACTION of total rows.
  → n_distinct = -0.3 means 30% of rows have distinct values (or: distinct values ≈ 0.3 × row_count).
  → n_distinct = 500 means exactly 500 distinct values.
  → correlation = 0.95 means data nearly sorted by this column (index scan will be efficient).
  → correlation = 0.02 means random order (index scan will be expensive — lots of heap page jumps).

"What is xmin/xmax in PostgreSQL rows — I see these in pg_class?"
  → Every heap tuple has system columns: xmin (transaction that inserted it), xmax (transaction that deleted it).
  → MVCC visibility: a tuple is visible if xmin committed before your snapshot AND xmax is 0 (not deleted) or xmax committed after your snapshot.
  → This is how two concurrent transactions each see their own consistent view of the database — no locks needed for reads.

"Can I store arrays directly in PostgreSQL? Why would I do that instead of a junction table?"
  → PostgreSQL supports native arrays: TEXT[], INT[], JSONB[].
  → Use case: small, stable sets (tags on a post, permissions list) where you never query "which posts have tag X?"
    → If you only ever query "what tags does THIS post have?": array in the row. No join needed.
    → If you query "which posts have tag 'python'?": junction table + index. Array requires full scan.
    `,
    analogy: `
THE DOCUMENT VERSION CONTROL ANALOGY:
---------------------------------------
MVCC = Git for Database Rows:
  Every row is like a file in a Git repository.
  When you "update" a file: Git doesn't overwrite the old version.
  Git creates a NEW commit with the new version, marks the old commit as superseded.
  You can still see the old version — it's in Git history.
  
  PostgreSQL does the same:
  UPDATE account SET balance = 500 WHERE id = 1;
  PostgreSQL doesn't overwrite the row. It:
    1. Marks old row's xmax = current transaction ID (like "this commit is superseded").
    2. Creates NEW row with xmin = current transaction ID.
  Concurrent transactions reading account id=1 see: the version whose xmin committed before their snapshot.
  New transaction after commit: sees the new version (old version is "dead").
  
  Dead tuples = obsolete Git commits: still physically on disk, no longer "active."
  VACUUM = garbage collection that prunes old commits no one can see anymore.

VACUUM = THE OFFICE CLEANER WHO REORGANIZES BUT DOESN'T SHRINK THE OFFICE:
  Dead tuples fill desk space in the office (pages in the table file).
  VACUUM: removes papers from desks, marks desks as "available for new papers."
  But: doesn't remove the desks themselves. Office (file) stays the same size.
  New papers can reuse the cleared desks. No disk space reclaimed but no growth.
  
  VACUUM FULL: completely dismantles the office, rebuilds it smaller, reinstalls only live desks.
  Cost: locks the entire office. Nobody can work during the rebuild.
  Use only when: office is 80%+ empty desks and you really need the floor space back.

ROW LEVEL SECURITY = ROWS THAT KNOW WHO CAN SEE THEM:
  Normal SQL: a query sees ALL rows it's authorized to see at the TABLE level.
    If you have SELECT on the table: you see every row.
  
  RLS: each ROW has additional access rules.
    "Only return this order if the requesting user is its customer."
    Even if you have SELECT on the orders table: you only see YOUR orders.
  
  Supabase multi-tenant use case:
    One orders table for all customers. RLS policy: WHERE customer_id = auth.uid().
    Customer A queries: "SELECT * FROM orders" — sees only their orders. Customer B sees only theirs.
    Same table. Same query. Different results based on who's asking.
    Enforced IN THE DATABASE. Can't be bypassed by application bugs.
    Application doesn't need to add WHERE customer_id = ? to every query — database does it automatically.

STATISTICS = THE PLANNER'S MAP:
  Before any journey: you study a map (statistics). Map says: "city center has 10,000 buildings."
  Query planner: "this query returns rows from city center — plan for 10,000 results."
  If map is 5 years old (stale statistics): might say 1,000 buildings. Plan is wrong.
  ANALYZE = updating the map. Always run after bulk data changes.
  
  correlation: "are buildings numbered in order?" High correlation → can walk in a straight line (sequential read).
    Low correlation → buildings randomly numbered → GPS must jump all over the city (random reads). Index scan = expensive.
  n_distinct: "how many unique building types in the city?" Helps planner estimate join result sizes.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — MVCC, RLS, STATISTICS, AND MORE:
------------------------------------------------------------

MVCC INTERNALS:
  Every heap tuple contains hidden system columns:
    xmin TXID: transaction ID that created this tuple (INSERT or UPDATE).
    xmax TXID: transaction ID that deleted/updated this tuple (0 = still live).
    ctid TID: physical location (page_number, offset) — changes on UPDATE (new tuple created).
    cmin/cmax CMDID: command IDs within a transaction (for intra-transaction visibility).
    infomask/infomask2: bit flags for visibility state, transaction commit status, null bitmap, etc.
  
  Visibility check for tuple T, from transaction TXN with snapshot S:
    1. xmin committed before S was taken (inserted before my snapshot) AND
    2. xmax = 0 (never deleted) OR xmax started after S (deleted by a later transaction)
    → If both conditions: tuple is VISIBLE to TXN.
    → This check happens for every tuple access. With visibility maps (all-visible pages): can skip!
  
  Transaction ID (TXID) commitment status:
    PostgreSQL stores a commit log (pg_xact/) — records which TXIDs committed or aborted.
    Visible means: xmin is in pg_xact as "committed."
    Checking pg_xact is fast but happens per-tuple for uncommitted XIDs.
    Committed XIDs get their status cached in the tuple's infomask (hint bits).
    After hint bits set: pg_xact lookup skipped → faster visibility checks.

AUTOVACUUM INTERNALS:
  Autovacuum launcher: one background process that spawns workers.
  Workers: one per database being vacuumed. Max workers: autovacuum_max_workers (default 3).
  
  Trigger: worker checks pg_stat_user_tables.n_dead_tup per table.
    Vacuum threshold: autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × n_live_tup
    Default: 50 + 0.2 × live_rows. High-churn tables need lower scale_factor (e.g., 0.01).
  
  Cost-based throttling: autovacuum_vacuum_cost_limit (default 200) and cost_delay (2ms).
    Prevents autovacuum from monopolizing I/O. But: may cause it to fall behind on busy tables.
    Per-table override: ALTER TABLE t SET (autovacuum_vacuum_cost_limit = 800);
  
  VACUUM FULL: rewrites entire table into a new heap file. ACCESS EXCLUSIVE lock. Old file deleted.
    Use case: table has extreme bloat (> 50% dead tuples) AND disk space is critical.
    Alternative: pg_repack extension — online table rewrite without exclusive lock.

ROW LEVEL SECURITY (RLS):
  Enable:
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orders FORCE ROW LEVEL SECURITY; -- Also applies to table owner
  
  Policy syntax:
    CREATE POLICY policy_name ON table_name
      [AS PERMISSIVE | RESTRICTIVE]
      [FOR SELECT | INSERT | UPDATE | DELETE | ALL]
      [TO role_name]
      [USING (expression)]           -- Filter for SELECT/UPDATE/DELETE (which rows visible)
      [WITH CHECK (expression)];     -- Filter for INSERT/UPDATE (which rows can be written)
  
  Multiple policies: multiple PERMISSIVE policies → OR'd together (any matching = visible).
  RESTRICTIVE policy: AND'd with permissive result. Used for mandatory security requirements.
  
  Supabase JWT integration:
    auth.uid(): returns the current user's UUID from the JWT token.
    auth.role(): returns 'anon', 'authenticated', or custom roles.
    auth.jwt(): returns the full JWT payload (for custom claims).
    
    Example: SELECT * FROM posts WHERE auth.uid() = user_id OR is_public = TRUE;
    This policy: user sees their own posts AND all public posts.
  
  Performance: RLS policies add predicates to every query. Ensure indexed columns are used.
    Bad: USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid())) — subquery per row.
    Good: USING (org_id = get_current_org_id()) — single equality check, index usable.

POSTGRESQL-SPECIFIC TYPES:
  Arrays:
    SELECT ARRAY[1,2,3] AS nums;
    SELECT '{1,2,3}'::INT[] AS nums;
    Operators: @> (contains), <@ (is contained by), && (overlap), || (concatenate), = (equals)
    ANY/ALL: WHERE 'python' = ANY(tags)
    unnest(): expand array to rows: SELECT unnest(ARRAY[1,2,3])
    Index: CREATE INDEX ON posts USING GIN (tags); -- For @>, <@, && operators
  
  Composite types:
    CREATE TYPE address AS (street TEXT, city TEXT, state TEXT, pincode CHAR(6));
    CREATE TABLE users (id BIGSERIAL, name TEXT, home_addr address, work_addr address);
    Query: WHERE (home_addr).city = 'Mumbai'
    Useful: when a concept has multiple sub-fields that always travel together.
  
  Ranges:
    INT4RANGE, TSTZRANGE, DATERANGE — store a range of values.
    CREATE TABLE room_bookings (room_id INT, during TSTZRANGE);
    CREATE INDEX ON room_bookings USING GIST (during); -- For range overlap queries
    WHERE during && tstzrange('2024-01-01', '2024-01-02') -- Overlapping bookings
    EXCLUDE USING GIST (room_id WITH =, during WITH &&); -- No double-bookings constraint!

PLANNER STATISTICS IN DEPTH:
  pg_stats view: derived from pg_statistic, more readable.
  Key columns:
    null_frac: fraction of NULL values. Planner adjusts selectivity estimates.
    n_distinct: distinct value count. Negative = fraction of row count.
      n_distinct = -1.0: all values unique (like primary keys).
      n_distinct = -0.01: only 1% unique (like boolean-like low-cardinality columns).
    most_common_vals: top 100 values (default statistics target).
    most_common_freqs: their frequencies. Planner uses exact frequency for these values.
    histogram_bounds: bucket boundaries. Planner uses for range predicates not in MCVs.
    correlation: Pearson correlation between physical storage order and logical sort order.
      1.0: perfectly ascending (e.g., sequential IDs). Index scan: nearly sequential. Fast.
      0.0: no correlation. Index scan: random heap jumps. May be slower than seq scan.
      -1.0: perfectly descending.
  
  Extended statistics (PostgreSQL 10+):
    CREATE STATISTICS stat_name ON col1, col2 FROM table;
    Captures: correlation between multiple columns (e.g., city and state correlated).
    Without: planner assumes independence. For 1% city selectivity + 1% state selectivity:
      planner estimates 0.01 × 0.01 × n = 0.01% of rows. Actual: 1% (city DETERMINES state).
    With extended statistics: planner knows the dependency → correct estimate.
    `,
    code: `
-- ===== POSTGRESQL INTERNALS & ADVANCED FEATURES — SQL EXAMPLES =====

-- EXAMPLE 1: Observing MVCC system columns and dead tuples

-- See system columns directly (normally hidden):
CREATE TABLE mvcc_demo (id INT, val TEXT);
INSERT INTO mvcc_demo VALUES (1, 'hello');

SELECT xmin, xmax, ctid, id, val FROM mvcc_demo;
-- xmin = transaction ID that inserted this row
-- xmax = 0 (row is live, not deleted)
-- ctid = (0,1) — page 0, slot 1

-- Update creates a NEW tuple version:
UPDATE mvcc_demo SET val = 'world' WHERE id = 1;
SELECT xmin, xmax, ctid, id, val FROM mvcc_demo;
-- xmin = new transaction ID
-- xmax = 0 (new version is live)
-- ctid = (0,2) — page 0, slot 2 (new physical location!)

-- The old tuple at (0,1) is now "dead" — has xmax = previous transaction ID
-- It remains on disk until VACUUM processes it.
-- Proof: pgstattuple extension shows dead tuples:
-- CREATE EXTENSION pgstattuple;
-- SELECT * FROM pgstattuple('mvcc_demo');
-- dead_tuple_count: 1 (the old 'hello' row)

-- EXAMPLE 2: Row Level Security — multi-tenant isolation (Supabase pattern)

CREATE TABLE posts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID      NOT NULL,         -- References auth.users in Supabase
  title       TEXT      NOT NULL,
  body        TEXT,
  is_public   BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (mandatory — does nothing without this):
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;  -- Applies to table owner too

-- Policy: users see their own posts + all public posts:
CREATE POLICY posts_select_policy ON posts
  FOR SELECT
  USING (user_id = auth.uid() OR is_public = TRUE);

-- Policy: users can only insert their own posts:
CREATE POLICY posts_insert_policy ON posts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: users can only update/delete their own posts:
CREATE POLICY posts_update_policy ON posts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY posts_delete_policy ON posts
  FOR DELETE
  USING (user_id = auth.uid());

-- Now: SELECT * FROM posts -- automatically filtered to current user's posts + public posts
-- No WHERE clause needed in application code. Database enforces it.

-- Verify policies:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'posts';

-- EXAMPLE 3: Array columns — when to use them vs junction tables

-- Use case: product tags (read-only set, query is "what tags does this product have?")
CREATE TABLE products (
  id     BIGSERIAL PRIMARY KEY,
  name   TEXT      NOT NULL,
  tags   TEXT[]    NOT NULL DEFAULT '{}',      -- Array of tag strings
  prices NUMERIC[] NOT NULL DEFAULT '{}'       -- Historical price points
);

INSERT INTO products (name, tags, prices) VALUES
  ('iPhone 15', ARRAY['smartphone','apple','5g'], ARRAY[89999.00, 79999.00, 74999.00]),
  ('Samsung S24', ARRAY['smartphone','samsung','5g','android'], ARRAY[79999.00, 74999.00]);

-- GIN index for array containment queries:
CREATE INDEX idx_products_tags ON products USING GIN (tags);

-- Queries:
SELECT name FROM products WHERE tags @> ARRAY['5g'];          -- Products with '5g' tag
SELECT name FROM products WHERE tags && ARRAY['apple','samsung']; -- Overlap (either tag)
SELECT name FROM products WHERE 'apple' = ANY(tags);          -- Alternative ANY syntax
SELECT name, unnest(tags) AS tag FROM products;               -- Expand to one row per tag

-- Array operations:
UPDATE products SET tags = tags || ARRAY['flagship']          -- Append a tag
WHERE name = 'iPhone 15';

UPDATE products SET tags = array_remove(tags, '5g')           -- Remove a specific tag
WHERE name = 'Samsung S24';

SELECT name, array_length(tags, 1) AS tag_count FROM products; -- Count tags per product

-- EXAMPLE 4: Querying and using planner statistics

-- View statistics for a specific column:
SELECT
  tablename,
  attname             AS column_name,
  n_distinct,
  correlation,
  null_frac,
  most_common_vals,
  most_common_freqs,
  array_length(histogram_bounds, 1) AS histogram_buckets
FROM pg_stats
WHERE tablename = 'orders' AND attname IN ('status', 'customer_id', 'created_at')
ORDER BY attname;

-- Interpret correlation values:
SELECT
  attname,
  correlation,
  CASE
    WHEN correlation > 0.9  THEN 'Index scan very efficient (nearly sequential)'
    WHEN correlation > 0.5  THEN 'Index scan somewhat efficient'
    WHEN correlation > -0.5 THEN 'Index scan may be inefficient (random I/O)'
    ELSE 'Index scan very inefficient — consider CLUSTER or seq scan'
  END AS interpretation
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY correlation DESC;

-- Create extended statistics for correlated columns:
-- Scenario: city and state are highly correlated (state always determined by city)
CREATE STATISTICS stat_orders_city_state (dependencies)
  ON shipping_city, shipping_state
  FROM orders;

ANALYZE orders;  -- Must re-analyze to collect the new statistics

-- Verify extended statistics collected:
SELECT stxname, stxkind, stxddependencies
FROM pg_statistic_ext
WHERE stxrelid = 'orders'::regclass;

-- EXAMPLE 5: VACUUM monitoring and tuning per-table autovacuum

-- Check tables that need immediate attention (high dead tuple ratio):
SELECT
  schemaname,
  relname                       AS table_name,
  n_live_tup,
  n_dead_tup,
  ROUND(n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
  last_autovacuum,
  last_autoanalyze,
  autovacuum_count,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS size
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_pct DESC NULLS LAST
LIMIT 20;

-- Per-table autovacuum tuning for high-churn tables:
ALTER TABLE order_events SET (
  autovacuum_vacuum_scale_factor   = 0.01,  -- Vacuum at 1% dead (not 20%)
  autovacuum_vacuum_threshold      = 500,   -- Trigger after 500 dead tuples (not 50)
  autovacuum_vacuum_cost_limit     = 800,   -- Less throttling (default 200)
  autovacuum_vacuum_cost_delay     = 2,     -- 2ms delay between cost limit hits
  autovacuum_analyze_scale_factor  = 0.005  -- Analyze at 0.5% changes (keep stats fresh)
);

-- EXAMPLE 6: Composite types for structured sub-records

CREATE TYPE money_amount AS (
  value    NUMERIC(12,2),
  currency CHAR(3)
);

CREATE TABLE international_orders (
  id       BIGSERIAL PRIMARY KEY,
  customer TEXT     NOT NULL,
  total    money_amount,
  shipping money_amount,
  tax      money_amount
);

INSERT INTO international_orders (customer, total, shipping, tax) VALUES
  ('Priya Sharma', ROW(5999.00, 'INR'), ROW(99.00, 'INR'), ROW(1079.82, 'INR')),
  ('John Smith',   ROW(79.99, 'USD'),   ROW(9.99, 'USD'),  ROW(6.40, 'USD'));

-- Access composite fields:
SELECT
  customer,
  (total).value       AS total_amount,
  (total).currency    AS currency,
  (shipping).value    AS shipping_amount,
  (total).value + (tax).value AS total_with_tax
FROM international_orders;

-- EXAMPLE 7: pg_stats for planner understanding + n_distinct interpretation

-- Show what n_distinct actually means per column:
SELECT
  attname         AS column_name,
  n_distinct,
  CASE
    WHEN n_distinct > 0  THEN n_distinct::TEXT || ' distinct values (absolute)'
    WHEN n_distinct = -1 THEN 'All unique (100% distinct)'
    ELSE ABS(n_distinct) * 100 || '% of rows are distinct'
  END             AS interpretation,
  CASE
    WHEN n_distinct BETWEEN -0.05 AND 0.05 OR (n_distinct > 0 AND n_distinct < 10)
      THEN 'Low cardinality — index scan may not help'
    WHEN n_distinct = -1 OR (n_distinct > 0 AND n_distinct > 1000)
      THEN 'High cardinality — index scan efficient'
    ELSE 'Medium cardinality — depends on query selectivity'
  END             AS cardinality_advice
FROM pg_stats
WHERE tablename = 'users'
ORDER BY attname;

-- Force a statistics re-collection with higher target for skewed columns:
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;  -- Default is 100
ANALYZE orders;
-- Now pg_stats will have up to 500 most_common_vals/histogram_bounds for status column
-- Better estimates for queries filtering on status
    `,
    bugs: `
REAL PRODUCTION BUGS FROM INTERNALS MISUNDERSTANDING:
-----------------------------------------------------

BUG 1: RLS enabled but not enforced — table owner bypasses all policies
  Scenario: A Supabase app had RLS on all tables. Security audit found: the application's
    database role (which was also the table owner) could see ALL rows across all tenants.
    Tenant A's data was accessible from Tenant B's session. Critical security vulnerability.
  Root cause: Table owners bypass RLS by default in PostgreSQL.
    ENABLE ROW LEVEL SECURITY alone is not enough for the table owner.
    The application used the same role that created the tables (the owner).
  Fix:
    ALTER TABLE orders FORCE ROW LEVEL SECURITY; -- Applies to table owner too
    Better: create a separate application role that is NOT the table owner:
    CREATE ROLE app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
    -- app_user is not the owner, so RLS applies without FORCE
    -- Set DATABASE_URL to use app_user credentials, not the superuser/owner
  Prevention: In Supabase, always use the anon/authenticated roles. Never use the postgres superuser role in application code.

BUG 2: Autovacuum failing to keep up — transaction ID wraparound emergency
  Scenario: A PostgreSQL 12 instance at a startup hadn't been monitored for 18 months.
    Database refused all writes: "ERROR: database is not accepting commands to avoid wraparound data loss."
    Tables had billions of dead tuples. Transaction ID age: 2.1 billion (danger zone > 1.5B).
  Root cause: Autovacuum was configured with default settings on a database doing 500K transactions/hour.
    The autovacuum_vacuum_scale_factor of 20% meant tables needed millions of dead tuples before vacuum triggered.
    By the time autovacuum ran, it couldn't keep up with the rate of new dead tuples.
  Emergency fix:
    -- As superuser (still allowed during wraparound protection):
    SET vacuum_freeze_min_age = 0;
    SET vacuum_freeze_table_age = 0;
    VACUUM FREEZE pg_authid;        -- System tables first
    VACUUM FREEZE orders;           -- Then largest/oldest tables
    -- Check progress:
    SELECT datname, age(datfrozenxid) FROM pg_database;
  Prevention: Monitor SELECT max(age(relfrozenxid)) FROM pg_class; alert if > 1B.

BUG 3: VACUUM FULL run on a live production table — hours-long outage
  Scenario: Operations engineer saw "table bloat: orders table is 40GB, should be 8GB."
    Ran VACUUM FULL orders; during peak hours.
    VACUUM FULL acquired ACCESS EXCLUSIVE lock. All queries on orders: blocked.
    Rewrote 40GB table: took 4.5 hours. Entire application functioned at 10% during that time
    (all order-related features down, only features not touching orders worked).
  Root cause: VACUUM FULL = exclusive table lock for the entire duration. Like DROP + recreate.
  Fix: Use pg_repack instead:
    -- Install extension (done once):
    -- CREATE EXTENSION pg_repack;
    -- Run (online, no exclusive lock):
    -- pg_repack -t orders -d mydb
    -- Rewrites table online with only brief locks at start and finish.
  Prevention: Never run VACUUM FULL on a live production table. Use pg_repack or schedule VACUUM FULL during maintenance windows with connection draining.

BUG 4: RLS policy with correlated subquery — query performance degraded 1000×
  Scenario: After enabling RLS, the application's main "show my organization's data" query
    went from 50ms to 45 seconds. Every query was now scanning the entire table.
  Root cause: RLS policy:
    CREATE POLICY org_isolation ON projects
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
    -- This correlated subquery runs once PER ROW of the projects table!
    -- 100,000 rows × 1 subquery each = 100,000 additional queries per request.
  Fix: Use a function that PostgreSQL can call once and inline:
    CREATE POLICY org_isolation ON projects
    USING (org_id = get_user_org_id(auth.uid()));
    -- get_user_org_id is a STABLE function — PostgreSQL evaluates it once per query, not per row.
    -- Or: use a flat equality check if org_id is stored in JWT custom claims:
    USING (org_id = (auth.jwt() ->> 'org_id')::BIGINT);

BUG 5: Ignoring correlation statistics — index scan chosen for poorly correlated column causes 5× slowdown
  Scenario: Date-based reports switched from sequential scan to index scan after "optimization."
    Performance got WORSE. The created_at column had correlation = 0.05 (data inserted out of order — bulk imports from multiple sources mixed timestamps).
  Root cause: With correlation = 0.05, each index scan entry points to a different heap page.
    1,000 matching rows = 1,000 random heap page reads.
    Seq scan: 1,000 rows fetched in ~50 sequential pages reads. 20× fewer I/Os.
    Planner was RIGHT to prefer seq scan; someone overrode it.
  Fix:
    RESET enable_indexscan; -- Remove any enable_indexscan overrides
    Or: CLUSTER orders USING idx_orders_created_at; -- Re-sort table physically by this column (rewrites table, offline)
    Then: correlation improves to ~1.0. Index scans become fast.
  Prevention: Always check pg_stats.correlation for key columns before deciding to force an index.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE MVCC AND RLS BEHAVIOR:
  Table: accounts (id, user_id UUID, balance NUMERIC)
  RLS: ENABLED, FORCED. Policy: USING (user_id = auth.uid())

  Scenario A — Concurrent transactions:
  Setup: Row (id=1, user_id='alice', balance=1000)

  Transaction A (user alice):
  BEGIN; UPDATE accounts SET balance = 500 WHERE id = 1;
  -- NOT YET COMMITTED

  Concurrently, Transaction B (user alice, READ COMMITTED isolation):
  SELECT balance FROM accounts WHERE id = 1;
  a) What does Transaction B see? Why?

  Transaction A: COMMIT;
  Transaction B (still open): SELECT balance FROM accounts WHERE id = 1;
  b) What does Transaction B see now? (READ COMMITTED)
  c) If Transaction B was REPEATABLE READ, what would it see? Why?

  Scenario B — RLS:
  d) User 'bob' runs: SELECT * FROM accounts; What rows does bob see? Why?
  e) The table owner (postgres) runs: SELECT * FROM accounts; What happens?
     What needs to change to make RLS apply to the owner too?
  f) User 'alice' runs: UPDATE accounts SET balance = 9999 WHERE id = 1 AND user_id = 'bob';
     Does this update succeed? Why? (The RLS USING clause is: user_id = auth.uid())
     (Hint: consider what USING does on UPDATE vs WITH CHECK)

CHALLENGE 2 — FIX THE INTERNALS BUGS:
  This multi-tenant SaaS schema has 4 critical issues. Find and fix each.

  CREATE TABLE tenants (id BIGSERIAL PRIMARY KEY, name TEXT);
  CREATE TABLE projects (
    id        BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    name      TEXT   NOT NULL,
    data      JSONB
  );

  -- RLS setup:
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  -- Bug 1: Missing FORCE ROW LEVEL SECURITY

  CREATE POLICY tenant_isolation ON projects
    USING (
      tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    );
  -- Bug 2: This subquery runs per-row (performance)

  -- Bug 3: No index on tenant_id (projects table). RLS policy filters by tenant_id.
  -- What's the performance impact?

  CREATE STATISTICS proj_stats ON tenant_id, name FROM projects;
  -- Bug 4: Statistics created but ANALYZE never run after.
  -- Will these statistics affect the planner?

  Fix all 4 bugs with correct SQL.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete multi-tenant blog platform schema using PostgreSQL internals features.

  Requirements:
  - Multiple tenants (organizations), each with their own users
  - Posts can be public (visible to anyone) or private (only visible to the author)
  - Comments on posts
  - Post tags stored as arrays (queryable: "find all posts with tag X")
  - Full-text search on post title and body
  - Post view count and like count as denormalized counters (maintained by triggers)
  - Complete RLS: users see their own posts + public posts in their tenant's space

  Write:
  1. All CREATE TABLE statements with appropriate constraints and types
     (Use arrays for tags, TSVECTOR for FTS, composite type for author_info)
  2. All indexes (GIN for arrays and FTS, B-tree for FK columns and common filters)
  3. RLS policies (correct USING and WITH CHECK for each operation)
  4. The trigger function that maintains view_count and like_count
  5. A single query that:
     - Searches posts by keyword using FTS
     - Filters to current user's tenant
     - Returns: post title, author name, snippet (ts_headline), tag list, view count, like count
     - Ordered by relevance rank
  6. A monitoring query that shows per-tenant statistics:
     (tenant_name, total_posts, public_posts, avg_post_views, top_tag, last_post_date)
    `,
    summary: `PostgreSQL's internals — MVCC, autovacuum, row-level security, and planner statistics — are not academic topics but practical levers that directly affect application correctness, performance, and security. The three things every PostgreSQL application must have: properly tuned autovacuum to prevent table bloat and transaction ID wraparound, Row Level Security with FORCE enabled (never bypass it via the table owner role), and fresh planner statistics (ANALYZE after bulk loads) so the query planner makes correct decisions based on your actual data distribution.`
  }
];

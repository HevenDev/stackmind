const concepts = [
  {
    id: 6,
    title: "Transactions, Savepoints & Error Handling",
    tag: "ALL OR NOTHING — THE BACKBONE OF DATA INTEGRITY",
    color: "#0F766E",
    tldr: `A database transaction is a group of operations that either ALL succeed (commit) or ALL fail (rollback) — there's no partial success. Drizzle's db.transaction() wraps your async function in a BEGIN/COMMIT block and automatically rolls back on any thrown error. Savepoints let you create partial rollback points inside a transaction, recovering from sub-operation failures without losing earlier work.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My order was created but the payment record wasn't — now the database is inconsistent"
  → Two separate awaits without a transaction: if the second fails, the first is already committed.
  → Solution: wrap both in db.transaction(). If payment insert fails → order insert rolls back too.

"My transaction callback threw an error but the data was still written — why?"
  → Common mistake: catching the error INSIDE the transaction callback and not re-throwing.
  → If you swallow the error (catch without throw), Drizzle sees a resolved promise → COMMITS.
  → Rule: inside a transaction callback, only catch errors you want to handle gracefully AND re-throw.
    Or let them propagate — Drizzle catches unhandled throws and rolls back.

"What's the difference between db.transaction() and a plain try/catch around multiple queries?"
  → try/catch without transaction: if query 2 fails, query 1 is already committed. No atomicity.
  → db.transaction(): wraps everything in BEGIN/COMMIT. Error at any point → full ROLLBACK.
  → The try/catch is still useful AROUND db.transaction() for handling the rollback case in app logic.

"I need to partially rollback inside a transaction — is that possible?"
  → Yes: savepoints. Within a transaction, SAVEPOINT name creates a rollback point.
  → ROLLBACK TO SAVEPOINT name: undo everything since that savepoint, continue the transaction.
  → Drizzle: use tx.execute(sql\`SAVEPOINT name\`) manually. No built-in savepoint API (as of recent versions).

"My nested db.transaction() call — does it create a real nested transaction?"
  → PostgreSQL doesn't support true nested transactions. Drizzle handles nested calls:
  → Outer call: BEGIN. Inner db.transaction() call inside the outer: ignored (uses same connection).
  → If inner throws and you don't catch it: outer also rolls back.
  → For partial inner rollback: use savepoints manually.
    `,
    analogy: `
THE BANK TRANSFER ANALOGY:
---------------------------
Transferring ₹10,000 from Priya's account to Rohan's account.
Two operations: (1) debit Priya ₹10,000, (2) credit Rohan ₹10,000.

WITHOUT TRANSACTION:
  Step 1: Debit Priya. Database: Priya's balance = ₹0. ✓ Committed.
  Server crash here.
  Step 2: Never runs. Rohan still has original balance.
  Result: ₹10,000 vanished into the void. Priya angry. Bank has a problem.

WITH TRANSACTION:
  BEGIN;
    Step 1: Debit Priya. (not yet committed — just staged)
    Server crash here.
  Database: ROLLBACK automatically. Priya's balance restored to original.
  Result: Nothing happened. Consistent state preserved.
  
  Or if both steps succeed: COMMIT. Both changes land atomically.

THE SAVEPOINT = GAME CHECKPOINT:
  You're playing a game with 5 bosses.
  Reach boss 3: save your progress (SAVEPOINT after_boss3).
  Fight boss 4: lose. Instead of restarting from the beginning:
    ROLLBACK TO SAVEPOINT after_boss3 — back to where you were after boss 3.
  Boss 4 defeated is undone. Everything before the savepoint is preserved.
  
  In database terms:
  BEGIN;
    INSERT order... (boss 1)
    INSERT payment... (boss 2, boss 3)
    SAVEPOINT after_payment;
    INSERT loyalty_points... (boss 4 — can fail gracefully)
    [if loyalty_points fails: ROLLBACK TO SAVEPOINT after_payment — order+payment preserved]
    INSERT notification... (boss 5)
  COMMIT;

DRIZZLE'S TRANSACTION CALLBACK = THE ESCROW AGENT:
  You hire an escrow agent (Drizzle) to manage a property transfer.
  You give the agent a list of steps: verify title, transfer deed, register with government.
  Agent says: "I will only finalize the transfer if ALL steps complete successfully."
  If ANY step fails: agent reverses everything done so far. No partial transfer.
  
  db.transaction(async (tx) => {
    // Everything inside uses 'tx' — the escrow agent's connection
    // tx is NOT the same as db — it's bound to the transaction
    await tx.insert(...) // Through the agent
    await tx.update(...) // Through the agent
    // If any line throws: agent reverses all above and propagates the error
  });
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DRIZZLE TRANSACTIONS INTERNALS:
----------------------------------------------------------

HOW db.transaction() WORKS:
  1. Drizzle acquires a connection from the pool (or reuses existing).
  2. Executes: BEGIN (starts the transaction on that connection).
  3. Calls your async callback with tx — a Drizzle instance bound to that connection.
  4. If callback resolves (no throw): executes COMMIT.
  5. If callback throws: executes ROLLBACK, then re-throws the error.
  
  The tx parameter:
    tx is the same Drizzle API as db but bound to the specific transaction connection.
    ALL queries inside the callback MUST use tx, not db.
    Using db inside the callback: goes on a different connection — outside the transaction!
    This is the most common transaction bug in Drizzle.

ISOLATION LEVELS:
  Drizzle supports setting isolation level via options:
    db.transaction(async (tx) => { ... }, {
      isolationLevel: 'read committed' | 'repeatable read' | 'serializable'
    })
  
  PostgreSQL default: READ COMMITTED.
    Each statement sees only committed data at the time it executes.
    Non-repeatable reads possible: re-read same row in same transaction may get different data.
  
  REPEATABLE READ: snapshot taken at start of transaction. Re-reads same data throughout.
    Prevents non-repeatable reads. Still allows phantom rows (new rows added by others).
  
  SERIALIZABLE: transactions behave as if run sequentially. Strictest. May get serialization errors.
    Use for: financial operations where concurrent transactions could cause inconsistency.
    Must retry on SerializationError (SQLSTATE 40001).

SAVEPOINTS IN POSTGRESQL:
  SAVEPOINT sp1;           -- Create checkpoint
  ROLLBACK TO SAVEPOINT sp1; -- Undo to checkpoint (transaction still active)
  RELEASE SAVEPOINT sp1;  -- Discard checkpoint (no rollback, just cleanup)
  
  Drizzle: no native savepoint API. Use tx.execute(sql\`...\`):
    await tx.execute(sql\`SAVEPOINT after_order\`);
    try {
      await tx.insert(loyaltyPoints).values({...});
    } catch (err) {
      await tx.execute(sql\`ROLLBACK TO SAVEPOINT after_order\`);
      // Continue transaction — order is still being created
    }
    await tx.execute(sql\`RELEASE SAVEPOINT after_order\`);

NESTED TRANSACTIONS — DRIZZLE BEHAVIOR:
  await db.transaction(async (outerTx) => {
    await outerTx.insert(orders).values({...});
    
    await outerTx.transaction(async (innerTx) => {
      // In Drizzle: innerTx IS outerTx for PostgreSQL.
      // PostgreSQL has no real nested transactions.
      // Drizzle may use savepoints for nested calls (version-dependent).
      await innerTx.insert(payments).values({...});
    });
    // If innerTx throws: depends on Drizzle version.
    // Safest: manually manage savepoints instead of nesting db.transaction().
  });

ERROR HANDLING PATTERNS:
  Pattern 1 — Let errors propagate (transaction rolls back automatically):
    try {
      await db.transaction(async (tx) => {
        await tx.insert(orders).values({...});
        await tx.insert(payments).values({...}); // Throws on failure
        // Throw propagates → Drizzle: ROLLBACK. All inserts undone.
      });
    } catch (err) {
      // Handle rollback scenario in application code
      if (err.code === '23505') return res.status(409).json({ error: 'duplicate' });
      throw err; // Re-throw unexpected errors
    }
  
  Pattern 2 — Savepoint for optional sub-operations:
    await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({...}).returning();
      
      await tx.execute(sql\`SAVEPOINT sp_loyalty\`);
      try {
        await tx.insert(loyaltyPoints).values({ userId: order.customerId, points: 100 });
      } catch {
        await tx.execute(sql\`ROLLBACK TO SAVEPOINT sp_loyalty\`);
        // Loyalty points failed — OK, order continues
      }
      
      await tx.insert(orderEvents).values({ orderId: order.id, event: 'created' });
      // If this fails: FULL rollback including order (savepoint released with transaction)
    });

TRANSACTION AND CONNECTION POOL:
  Each transaction holds ONE connection for its entire duration.
  With PgBouncer transaction pooling: db.transaction() works correctly — the connection
    is held for the full transaction and returned to pool after COMMIT/ROLLBACK.
  With PgBouncer statement pooling: BREAKS — connection may change between statements.
  Always use session or transaction pooling mode with transactional workloads.
    `,
    code: `
// ===== TRANSACTIONS, SAVEPOINTS & ERROR HANDLING — EXAMPLES =====

// EXAMPLE 1: Basic transaction — order + payment atomically

async function createOrderWithPayment(customerId, amount, paymentMethod) {
  return await db.transaction(async (tx) => {
    // Step 1: Create the order
    const [order] = await tx.insert(orders)
      .values({ customerId, amount: amount.toString(), status: 'pending' })
      .returning({ id: orders.id, publicId: orders.publicId });

    // Step 2: Create the payment record
    // If this throws: Step 1 is automatically rolled back!
    const [payment] = await tx.insert(payments)
      .values({
        orderId: order.id,
        amount: amount.toString(),
        method: paymentMethod,
        status: 'initiated'
      })
      .returning({ id: payments.id });

    // Step 3: Decrement stock for each item (see full example for items loop)
    await tx.update(products)
      .set({ stock: sql\`\${products.stock} - 1\` })
      .where(eq(products.id, 42)); // Simplified for example

    return { orderId: order.id, publicId: order.publicId, paymentId: payment.id };
  });
  // If ANY step throws: ROLLBACK. All three operations undone. Consistent state.
}

// EXAMPLE 2: Error handling around transaction — application-level response mapping

async function handleOrderCreation(req, res) {
  try {
    const result = await createOrderWithPayment(
      req.body.customerId,
      req.body.amount,
      req.body.paymentMethod
    );
    return res.status(201).json({ success: true, ...result });

  } catch (err) {
    // Transaction already rolled back by Drizzle. Handle application-level response:
    if (err.code === '23503') {
      // PostgreSQL FK violation — customer doesn't exist
      return res.status(404).json({ error: 'customer_not_found' });
    }
    if (err.code === '23514') {
      // Check constraint violation — invalid amount or status
      return res.status(400).json({ error: 'invalid_order_data' });
    }
    if (err.message?.includes('Insufficient stock')) {
      return res.status(409).json({ error: 'out_of_stock' });
    }
    // Unknown error — log and return 500
    console.error('Order creation failed:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// EXAMPLE 3: THE CRITICAL BUG — using db inside transaction instead of tx

async function buggyTransaction() {
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({ customerId: 1, amount: '500' }); // ✓ On transaction

    // BUG: using 'db' not 'tx' — this runs on a DIFFERENT connection, outside the transaction!
    await db.insert(payments).values({ orderId: 999, amount: '500' }); // ✗ NOT in transaction!

    throw new Error('Simulated failure');
    // tx operations roll back. But the db.insert(payments) already committed separately!
    // Result: payment record exists, order does not. Inconsistent state!
  });
}

// CORRECT version:
async function correctTransaction() {
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({ customerId: 1, amount: '500' }); // ✓
    await tx.insert(payments).values({ orderId: 999, amount: '500' }); // ✓ Also on tx
    // Both on the same connection. Both roll back together on error.
  });
}

// EXAMPLE 4: Savepoints for optional sub-operations

async function createOrderWithOptionalPerks(customerId, items, couponCode) {
  return await db.transaction(async (tx) => {
    // Core operation — must succeed:
    const [order] = await tx.insert(orders)
      .values({ customerId, amount: '0', status: 'pending' })
      .returning({ id: orders.id });

    // Bulk insert items — must succeed:
    await tx.insert(orderItems).values(items.map(item => ({
      orderId: order.id, productId: item.productId,
      quantity: item.quantity, unitPrice: item.price.toString()
    })));

    // Optional: apply coupon — allowed to fail without killing the order:
    await tx.execute(sql\`SAVEPOINT sp_coupon\`);
    try {
      if (couponCode) {
        const [coupon] = await tx.select().from(coupons)
          .where(and(eq(coupons.code, couponCode), eq(coupons.isActive, true)));
        if (!coupon) throw new Error('Invalid coupon');
        await tx.update(orders)
          .set({ discountAmount: coupon.discountAmount })
          .where(eq(orders.id, order.id));
        await tx.update(coupons)
          .set({ usedCount: sql\`\${coupons.usedCount} + 1\` })
          .where(eq(coupons.id, coupon.id));
      }
    } catch (couponErr) {
      // Coupon failed — rollback just the coupon part, keep the order
      await tx.execute(sql\`ROLLBACK TO SAVEPOINT sp_coupon\`);
      console.warn('Coupon application failed:', couponErr.message);
    }

    // Optional: award loyalty points — also allowed to fail:
    await tx.execute(sql\`SAVEPOINT sp_loyalty\`);
    try {
      await tx.insert(loyaltyTransactions)
        .values({ userId: customerId, points: 50, reason: 'order_placed' });
    } catch {
      await tx.execute(sql\`ROLLBACK TO SAVEPOINT sp_loyalty\`);
    }

    // Mandatory: create order event — must succeed:
    await tx.insert(orderEvents)
      .values({ orderId: order.id, eventType: 'order_created' });

    return { orderId: order.id };
    // If any mandatory step fails: full rollback including order.
  });
}

// EXAMPLE 5: Serializable isolation for concurrent balance updates

async function transferBalance(fromUserId, toUserId, amount) {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // Serializable: guarantees no phantom reads or write skew
        // Must set BEFORE any queries in this transaction
        await tx.execute(sql\`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\`);

        const [sender] = await tx.select({ balance: wallets.balance })
          .from(wallets).where(eq(wallets.userId, fromUserId));

        if (parseFloat(sender.balance) < amount) {
          throw new Error('INSUFFICIENT_FUNDS'); // Will rollback transaction
        }

        await tx.update(wallets)
          .set({ balance: sql\`\${wallets.balance} - \${amount}\` })
          .where(eq(wallets.userId, fromUserId));

        await tx.update(wallets)
          .set({ balance: sql\`\${wallets.balance} + \${amount}\` })
          .where(eq(wallets.userId, toUserId));

        return { success: true };
      }, { isolationLevel: 'serializable' }); // Drizzle option

    } catch (err) {
      if (err.code === '40001' && attempt < MAX_RETRIES - 1) {
        // Serialization failure — retry with exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
        continue;
      }
      throw err;
    }
  }
}

// EXAMPLE 6: Long-running transaction monitoring and timeout

async function processWithTimeout(operationFn, timeoutMs = 30000) {
  // Set statement timeout to prevent runaway transactions:
  return await db.transaction(async (tx) => {
    // Kill transaction if it runs longer than timeoutMs:
    await tx.execute(sql\`SET LOCAL statement_timeout = \${timeoutMs}\`);
    await tx.execute(sql\`SET LOCAL idle_in_transaction_session_timeout = \${timeoutMs}\`);
    return await operationFn(tx);
  });
}

// EXAMPLE 7: Checking if currently inside a transaction

// Drizzle doesn't expose a "isInTransaction()" check directly.
// Pattern: pass tx as parameter to make it explicit:

async function insertOrderEvent(txOrDb, orderId, eventType, metadata = {}) {
  // Works with both db and tx:
  await txOrDb.insert(orderEvents).values({ orderId, eventType, metadata });
}

// Can be called standalone or inside a transaction:
// Standalone: await insertOrderEvent(db, orderId, 'view')
// In transaction: await insertOrderEvent(tx, orderId, 'created')
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TRANSACTION MISUNDERSTANDING:
-------------------------------------------------------

BUG 1: Using db instead of tx — payment committed, order rolled back
  Scenario: E-commerce checkout. Developer accidentally used db for payment insert:
    await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({...}).returning();
      await db.insert(payments).values({ orderId: order.id, ... }); // ← db, not tx!
      throw new Error('Validation failed'); // Simulated error
    });
    Result: payment row created (committed via separate connection).
    Order rolled back (tx connection rolled back).
    10,000 orphan payment records in production over 3 months before discovered.
  Fix: Always use tx for ALL operations inside db.transaction().
    TypeScript helps: tx has the same type as db — no type error. Only discipline prevents this.
    Pattern: rename parameter to make it obvious: async (transaction) => { ... }
    Or: lint rule that warns when db is used inside transaction callbacks.

BUG 2: Swallowed error inside transaction — COMMITS despite "handling" the error
  Scenario: Inventory reservation:
    await db.transaction(async (tx) => {
      try {
        await tx.update(inventory).set({ reserved: sql\`reserved + 1\` }).where(...);
        await tx.insert(reservations).values({...});
      } catch (err) {
        console.error('Reservation failed:', err); // Error swallowed — not re-thrown!
        // Developer thought: "logged the error, transaction will rollback"
      }
      // But: catch doesn't re-throw → callback resolves normally → COMMIT!
    });
    Result: partial state committed. inventory.reserved incremented, reservation row missing.
  Fix: Always re-throw inside transaction callbacks:
    } catch (err) {
      console.error('Reservation failed:', err);
      throw err; // Must re-throw to trigger rollback!
    }

BUG 3: Transaction held open during external API call — lock timeout and pool exhaustion
  Scenario: Payment processing held a transaction open during a 3rd-party payment gateway call:
    await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({...}).returning();
      // BUG: External HTTP call inside transaction!
      const paymentResult = await paymentGateway.charge(order.id, amount); // 5-10s timeout
      await tx.insert(payments).values({ status: paymentResult.status, ...});
    });
    Result: Transaction held DB connection for 5-10 seconds.
    Under load: 50 concurrent checkouts = 50 connections held for 10 seconds each.
    Connection pool exhausted. Other requests: "pool timeout error."
    Also: orders table row locked for 10 seconds — other queries on same order waited.
  Fix: Never make external API calls inside transactions:
    // 1. Insert order OUTSIDE transaction
    const [order] = await db.insert(orders).values({...}).returning();
    // 2. Call external API
    const result = await paymentGateway.charge(order.id, amount);
    // 3. Update order status in short transaction
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ status: result.success ? 'confirmed' : 'failed' })
        .where(eq(orders.id, order.id));
      await tx.insert(payments).values({...});
    });

BUG 4: Retry logic retrying a transaction that partially succeeded
  Scenario: Network timeout after COMMIT sent but before response received.
    Client retried: called the same transaction function again.
    Transaction committed TWICE. Two orders created. Customer charged twice.
  Fix: Use idempotency keys:
    await db.transaction(async (tx) => {
      // Check if already processed:
      const existing = await tx.select().from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey));
      if (existing.length > 0) return existing[0]; // Already done — return success

      return await tx.insert(orders)
        .values({ ..., idempotencyKey })
        .returning();
    });

BUG 5: Forgetting to set isolation level BEFORE first query — has no effect
  Scenario: Developer added serializable isolation to prevent double-spend:
    await db.transaction(async (tx) => {
      const balance = await tx.select().from(wallets)...; // First query runs at default isolation!
      await tx.execute(sql\`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\`); // Too late!
      // SET TRANSACTION must happen before any data access in the transaction.
      // PostgreSQL error: "SET TRANSACTION ISOLATION LEVEL must be called before any query"
    });
  Fix: Set isolation level via Drizzle options (applied at BEGIN):
    await db.transaction(async (tx) => { ... }, { isolationLevel: 'serializable' });
    // OR: Set it as the very first statement before any query:
    await tx.execute(sql\`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\`);
    // Then: first data query
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE TRANSACTION OUTCOME:
  For each scenario, state: (a) does the transaction commit or rollback? (b) what data exists in DB?

  Scenario A:
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ name: 'Priya', email: 'priya@test.com' });
    await tx.insert(orders).values({ customerId: 999, amount: '500' }); // FK: customer 999 doesn't exist
    await tx.insert(logs).values({ message: 'order created' });
  });

  Scenario B:
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ name: 'Rohan', email: 'rohan@test.com' });
    try {
      await tx.insert(orders).values({ customerId: 999, amount: '500' }); // FK violation
    } catch (err) {
      console.log('Order failed, continuing...'); // Error NOT re-thrown
    }
    await tx.insert(logs).values({ message: 'user created' });
  });

  Scenario C:
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ name: 'Arjun', email: 'arjun@test.com' });
    await tx.execute(sql\`SAVEPOINT sp1\`);
    try {
      await tx.insert(invalid_table).values({...}); // Table doesn't exist
    } catch {
      await tx.execute(sql\`ROLLBACK TO SAVEPOINT sp1\`);
    }
    await tx.insert(logs).values({ message: 'done' });
  });

  For B: What is the critical issue with this pattern in production?

CHALLENGE 2 — FIX THE TRANSACTION BUGS:
  This fund withdrawal function has 3 transaction bugs. Find and fix each.

  async function withdrawFunds(userId, amount) {
    let balance;
    // Bug 1: Read outside transaction
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    balance = parseFloat(wallet.balance);

    return await db.transaction(async (tx) => {
      if (balance < amount) throw new Error('Insufficient funds');

      await tx.update(wallets)
        .set({ balance: sql\`\${wallets.balance} - \${amount}\` })
        .where(eq(wallets.userId, userId));

      // Bug 2: External API call inside transaction
      const receipt = await bankApiClient.initiateTransfer(userId, amount);

      // Bug 3: db used instead of tx
      await db.insert(transactions).values({
        userId, amount, receiptId: receipt.id, type: 'withdrawal'
      });

      return receipt;
    });
  }

  Write the corrected version and explain each fix.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete e-commerce checkout transaction for a marketplace (like Meesho).

  The checkout must atomically:
  1. Validate all items are in stock (read with lock: SELECT FOR UPDATE)
  2. Decrement stock for each item ordered
  3. Create the order record
  4. Create all order_items records
  5. Apply coupon if provided (optional — use savepoint, don't fail order if coupon invalid)
  6. Create a wallet_transaction deducting from buyer's wallet
  7. Create wallet_transactions crediting each seller (items may be from different sellers)
  8. Create order_events record for audit

  Requirements:
  - Use SERIALIZABLE isolation
  - Retry up to 3 times on serialization error (SQLSTATE 40001)
  - Return: { orderId, publicId, appliedCoupon: boolean, sellerCredits: number }
  - Handle partial stock (some items available, some not) — fail the whole order with a descriptive error
  - All operations use tx, never db
    `,
    summary: `Transactions are the foundation of data consistency — always use db.transaction() for any operation that touches multiple tables or rows that must succeed or fail together. The two rules that prevent the most production bugs: always use tx (never db) inside a transaction callback, and never make external API calls (HTTP, email, SMS) inside a transaction. Keep transactions short, fast, and free of external I/O.`
  },

  {
    id: 7,
    title: "TypeScript Types from Drizzle Schema",
    tag: "ZERO-COST ABSTRACTIONS — TYPES THAT FLOW FROM SCHEMA TO QUERY",
    color: "#92400E",
    tldr: `Drizzle infers TypeScript types directly from the schema at compile time — no code generation step, no runtime reflection. Every column modifier (.notNull(), .default(), .primaryKey()) shapes both the SQL it generates AND the TypeScript types your code sees. Understanding \$inferSelect, \$inferInsert, and how to create partial/strict variants lets you write fully type-safe data access without ever writing a type annotation manually.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I have to manually write TypeScript interfaces that match my database tables — tedious and error-prone"
  → Drizzle eliminates this entirely. Schema IS the type definition.
  → typeof users.\$inferSelect → automatic TypeScript type for a selected user row.
  → Change column in schema → TypeScript type updates automatically. No drift.

"TypeScript says my insert is valid but PostgreSQL rejects it with NOT NULL violation"
  → Schema column has .notNull() but no .default(). Should be required in insert type.
  → Check: did you define the column correctly? .notNull() without .default() = required in \$inferInsert.
  → Bug source: schema says nullable (missing .notNull()), DB column was manually set NOT NULL.
    Schema/DB drift. Fix: schema must match database exactly.

"I want a type with only some columns — like Pick<User, 'id' | 'name'> — can I get this from Drizzle?"
  → Yes: use db.select({ id: users.id, name: users.name }) — the return type is automatically inferred.
  → Or: type UserSummary = Pick<typeof users.\$inferSelect, 'id' | 'name'>.
  → For insert: create a Partial<typeof users.\$inferInsert> or use specific Omit types.

"I need strict insert validation — users shouldn't be able to provide id or createdAt in inserts"
  → \$inferInsert already marks auto-generated fields as optional.
  → For strict validation: Omit<typeof users.\$inferInsert, 'id' | 'createdAt'> removes them entirely.
  → Use this in your API layer to prevent clients from supplying fields they shouldn't.

"Prisma generates types in a separate .d.ts file via prisma generate — what's Drizzle's equivalent?"
  → Drizzle has no code generation step. Types are inferred from schema at TypeScript compile time.
  → This is the key architectural difference: Drizzle types = TypeScript inference. Prisma types = generated code.
  → Advantage Drizzle: no generated file to commit, no "forgot to run prisma generate" errors.
    `,
    analogy: `
THE BLUEPRINT-DERIVED SPECS ANALOGY:
--------------------------------------
Traditional ORM (like Prisma): two separate documents.
  Document 1: schema.prisma (the blueprint — defines what you want).
  Document 2: Generated types in node_modules/.prisma/client/index.d.ts (the specifications — derived from blueprint).
  
  Problem: if you change the blueprint (schema) but forget to regenerate specs (prisma generate):
  Your code references old specs. Might compile. Wrong at runtime. "Forgot to run generate" is infamous.

Drizzle approach: one document, no derivation step.
  Your schema.ts IS both the blueprint AND the specifications simultaneously.
  TypeScript reads the schema file and derives types as part of normal compilation.
  Change the schema → compile → types updated. Zero extra steps. Zero drift.

\$INFERSELECT vs \$INFERINSERT = READING SPEC vs WRITING SPEC:
  \$inferSelect: "what I get back when I read a row" — ALL columns, nullables included.
    Like a delivery receipt: shows everything that was actually stored.
    A column defined WITHOUT .notNull() → its type includes | null (might be null in DB).
    
  \$inferInsert: "what I need to provide when I write a row" — only REQUIRED fields.
    Like an order form: only fill in what's needed. Pre-filled fields (defaults) are optional.
    A column with .primaryKey() → optional in insert (auto-generated by database).
    A column with .defaultNow() → optional in insert (database sets it automatically).
    A column with .notNull() but NO default → required in insert (you must provide it).
    A column without .notNull() → optional in insert (database allows null).

PICK<> AND OMIT<> = CUSTOMIZING THE SPEC:
  Full blueprint has 20 columns. For a "user listing" API: only need 5 columns.
  
  Pick<typeof users.\$inferSelect, 'id' | 'name' | 'email' | 'avatarUrl' | 'createdAt'>
  → TypeScript type with ONLY those 5 fields. Using other fields: compile error.
  
  For strict insert validation:
  Omit<typeof users.\$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
  → Insert type WITHOUT the auto-fields. Clients can't accidentally supply them.
  → If they try: TypeScript compile error catches it before runtime.

THE COLUMN MODIFIER → TYPE INFERENCE RULES:
  .notNull()     → type: BaseType (no null)           insert: required (unless has default)
  (no modifier)  → type: BaseType | null               insert: optional
  .default(x)    → type: BaseType | null (or BaseType if also .notNull()) insert: optional
  .primaryKey()  → type: BaseType (implies .notNull()) insert: optional (auto-generated)
  .$defaultFn()  → insert: optional (JS-level default)
  .references()  → no effect on TS type, affects SQL FK constraint
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DRIZZLE TYPE INFERENCE INTERNALS:
-------------------------------------------------------------

HOW DRIZZLE INFERS TYPES:
  Drizzle uses TypeScript conditional types and mapped types to infer:
  
  type SelectResult<T extends Table> = {
    [K in keyof T['_']['columns']]: T['_']['columns'][K]['_']['data']
  };
  // Simplified — actual Drizzle implementation is more complex
  
  Each column definition is a TypeScript class with type parameters:
    PgVarchar<{ name: string; notNull: true; ... }> 
    → data type: string (notNull: true removes | null)
    
    PgVarchar<{ name: string; notNull: false; ... }>
    → data type: string | null (notNull: false adds | null)
  
  The \$inferSelect and \$inferInsert type aliases:
    typeof users.\$inferSelect 
    → Equivalent to: { id: number; email: string; name: string; deletedAt: Date | null; ... }
    
    typeof users.\$inferInsert
    → Equivalent to: { id?: number; email: string; name: string; deletedAt?: Date | null; ... }
    // id optional (bigserial), deletedAt optional (nullable column)

PARTIAL SELECT TYPE INFERENCE:
  When you specify columns in .select():
    const result = await db.select({ id: users.id, name: users.name }).from(users);
    // result: { id: number; name: string }[]
    // TypeScript infers the exact shape from the select object. Magic!
  
  When you use SQL expressions:
    const result = await db.select({
      id: users.id,
      totalOrders: sql\`COUNT(\${orders.id})\`.mapWith(Number)
    }).from(users).leftJoin(orders, ...);
    // result: { id: number; totalOrders: number }[]
    // mapWith(Number) tells TypeScript: this expression is a number, not string/unknown
  
  Without .mapWith():
    sql\`COUNT(\${orders.id})\` → result type: string | null (raw SQL result type)
    Always use .mapWith() for typed SQL expressions.

CREATING REUSABLE TYPE UTILITIES:
  // Select types:
  type User = typeof users.\$inferSelect;
  type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  type UserWithoutDates = Omit<User, 'createdAt' | 'updatedAt' | 'deletedAt'>;
  
  // Insert types:
  type NewUser = typeof users.\$inferInsert;
  type UserRegistration = Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
  // → Only: tenantId, email, name, avatarUrl, metadata — what a registration form needs
  
  // Update types (all optional):
  type UserUpdate = Partial<Pick<User, 'name' | 'avatarUrl' | 'metadata'>>;
  // Only mutable fields. id, email, createdAt excluded — can't update those.
  
  // Strict validation:
  type StrictNewOrder = Required<Pick<NewOrder, 'customerId' | 'amount'>> & {
    items: Array<{ productId: number; quantity: number; price: number }>
  };

JOIN RESULT TYPE INFERENCE:
  LEFT JOIN returns nullable right-side columns:
    const result = await db.select({
      orderId: orders.id,
      customerName: users.name  // LEFT JOIN — user may not exist
    }).from(orders).leftJoin(users, eq(orders.customerId, users.id));
    // result: { orderId: number; customerName: string | null }[]
    // users.name is string normally, but LEFT JOIN makes it nullable
  
  INNER JOIN: right side guaranteed to exist — type stays non-nullable:
    .innerJoin(users, eq(orders.customerId, users.id))
    // customerName: string (not | null — inner join guarantees match)
  
  Note: Drizzle's type inference for LEFT JOIN nullability is automatic — it knows
    that LEFT JOIN columns can be null even if the column is defined as NOT NULL.

TYPE-SAFE DYNAMIC QUERIES:
  Building dynamic WHERE conditions with type safety:
    function buildUserFilters(filters: {
      city?: string;
      minAge?: number;
      active?: boolean;
    }) {
      const conditions: SQL[] = [];
      if (filters.city) conditions.push(eq(users.city, filters.city));
      if (filters.minAge) conditions.push(gte(users.age, filters.minAge));
      if (filters.active !== undefined) conditions.push(eq(users.active, filters.active));
      return conditions.length > 0 ? and(...conditions) : undefined;
    }
    
    const where = buildUserFilters({ city: 'Mumbai', active: true });
    const result = await db.select().from(users).where(where);
    // result: (typeof users.\$inferSelect)[] — fully typed

PRISMA TYPE COMPARISON:
  Prisma generates types via prisma generate → node_modules/@prisma/client:
    import { User, Order, Prisma } from '@prisma/client';
    
    User → all fields, nullable based on schema
    Prisma.UserCreateInput → create input type (optional fields with defaults)
    Prisma.UserUpdateInput → update type (all fields optional)
    Prisma.UserWhereInput → filter type
    Prisma.UserSelect → select type (specify which fields to return)
  
  Drizzle equivalent:
    typeof users.\$inferSelect → User
    typeof users.\$inferInsert → Prisma.UserCreateInput equivalent
    Partial<typeof users.\$inferInsert> → Prisma.UserUpdateInput equivalent
    No built-in WHERE input type — use Drizzle helper types (SQL[]) for filter objects
    `,
    code: `
// ===== TYPESCRIPT TYPES FROM DRIZZLE SCHEMA — EXAMPLES =====

// EXAMPLE 1: Complete type inference demonstration

// Schema definition (abbreviated):
// const users = pgTable('users', {
//   id: bigserial('id', { mode: 'number' }).primaryKey(),
//   email: varchar('email', { length: 255 }).notNull().unique(),
//   name: text('name').notNull(),
//   bio: text('bio'),                    // Nullable — no .notNull()
//   role: text('role').notNull().default('member'),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   deletedAt: timestamp('deleted_at'), // Nullable — soft delete
// });

// Inferred SELECT type:
// type User = typeof users.\$inferSelect;
// {
//   id: number;           // bigserial → number (mode: 'number')
//   email: string;        // varchar + .notNull() → string (no null)
//   name: string;         // text + .notNull() → string
//   bio: string | null;   // text without .notNull() → string | null
//   role: string;         // text + .notNull() + .default() → string
//   createdAt: Date;      // timestamp + .notNull() → Date
//   deletedAt: Date | null; // timestamp without .notNull() → Date | null
// }

// Inferred INSERT type:
// type NewUser = typeof users.\$inferInsert;
// {
//   id?: number;           // Optional: bigserial auto-generates
//   email: string;         // Required: .notNull(), no default
//   name: string;          // Required: .notNull(), no default
//   bio?: string | null;   // Optional: nullable column
//   role?: string;         // Optional: has .default('member')
//   createdAt?: Date;      // Optional: has .defaultNow()
//   deletedAt?: Date | null; // Optional: nullable column
// }

// EXAMPLE 2: Creating reusable type utilities from schema types

// Extract the full types:
// type User = typeof users.\$inferSelect;
// type NewUser = typeof users.\$inferInsert;

// For public API responses (exclude sensitive/internal fields):
// type PublicUser = Pick<User, 'id' | 'name' | 'bio' | 'role' | 'createdAt'>;
// Note: email excluded from public profile

// For user registration (what the client sends):
// type UserRegistration = Omit<NewUser, 'id' | 'createdAt' | 'deletedAt' | 'role'>;
// → { email: string; name: string; bio?: string | null }
// Client cannot set id, createdAt, deletedAt, or role (role is set by server)

// For profile update (all fields optional, only mutable fields):
// type UserProfileUpdate = Partial<Pick<User, 'name' | 'bio'>>;
// → { name?: string; bio?: string | null }

// EXAMPLE 3: Type-safe function signatures using schema types

// function createUser(data: UserRegistration): Promise<PublicUser>
async function createUser(data) {
  // TypeScript ensures data has: email (required), name (required), bio (optional)
  // TypeScript prevents: setting id, role, createdAt

  const [user] = await db.insert(users)
    .values({ ...data, role: 'member' }) // role set by server, not client
    .returning({
      id: users.id,
      name: users.name,
      bio: users.bio,
      role: users.role,
      createdAt: users.createdAt
    });
  return user; // Type: Pick<User, 'id' | 'name' | 'bio' | 'role' | 'createdAt'>
}

// EXAMPLE 4: Typed partial select — only fetch what you need

// The return type is automatically inferred from what you select:
async function getUserSummaries() {
  const summaries = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    // Note: NOT selecting bio, metadata, deletedAt, etc.
  }).from(users).where(isNull(users.deletedAt));

  // summaries: { id: number; name: string; email: string }[]
  // TypeScript knows EXACTLY these 3 fields exist. Nothing more. Nothing less.
  return summaries;
}

// Vs SELECT * which returns the full User type:
async function getFullUser(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  // user: User (all 7 fields, nullable ones include | null)
  return user;
}

// EXAMPLE 5: SQL expression types with .mapWith()

async function getUserStats() {
  const stats = await db.select({
    userId: users.id,
    userName: users.name,
    orderCount: sql\`COUNT(\${orders.id})\`.mapWith(Number),        // → number
    totalSpent: sql\`SUM(\${orders.amount}::NUMERIC)\`.mapWith(Number), // → number
    lastOrderAt: sql\`MAX(\${orders.createdAt})\`.mapWith(Date),    // → Date
    avgOrderStr: sql\`AVG(\${orders.amount}::NUMERIC)\`,            // → string (no mapWith!)
  })
  .from(users)
  .leftJoin(orders, eq(orders.customerId, users.id))
  .groupBy(users.id, users.name);

  // Type of each row:
  // {
  //   userId: number;
  //   userName: string;
  //   orderCount: number;       ← mapWith(Number)
  //   totalSpent: number;       ← mapWith(Number)
  //   lastOrderAt: Date;        ← mapWith(Date)
  //   avgOrderStr: string | null; ← no mapWith → raw SQL result type
  // }

  return stats;
}

// EXAMPLE 6: Strict insert validation — rejecting unexpected fields

// Type that only allows what a new order form should have:
// type NewOrderInput = {
//   customerId: number;
//   items: Array<{ productId: number; quantity: number }>;
//   couponCode?: string;
//   shippingAddress: { street: string; city: string; pincode: string };
// };
//
// What's EXCLUDED (server-generated):
// - id (auto-generated)
// - publicId (UUID generated by $defaultFn)
// - status (always starts as 'pending')
// - createdAt (defaultNow())
// - processedAt (null until processed)
// - totalAmount (calculated from items, not trusted from client)

async function createOrderStrict(input) {
  // input type: NewOrderInput — TypeScript prevents id/status/createdAt from being passed
  const totalAmount = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(orders)
      .values({
        customerId: input.customerId,
        amount: totalAmount.toString(),
        status: 'pending',           // Server enforces initial status
        shippingAddress: input.shippingAddress
        // id, publicId, createdAt, processedAt: all handled by DB/Drizzle defaults
      })
      .returning({ id: orders.id, publicId: orders.publicId });
    return order;
  });
}

// EXAMPLE 7: Type-safe dynamic query builder

// Helper type for filter options:
// type UserFilters = {
//   city?: string;
//   role?: typeof users.\$inferSelect['role'];  // 'owner' | 'admin' | 'member' | 'viewer'
//   createdAfter?: Date;
//   search?: string;
// };

async function findUsers(filters) {
  const conditions = [];

  if (filters.city) {
    conditions.push(eq(users.city, filters.city));
  }
  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
    // TypeScript ensures filters.role is one of the valid role values
    // if role column has an enum constraint via CHECK
  }
  if (filters.createdAfter) {
    conditions.push(gte(users.createdAt, filters.createdAfter));
  }
  if (filters.search) {
    conditions.push(ilike(users.name, \`%\${filters.search}%\`));
  }

  // Always exclude soft-deleted:
  conditions.push(isNull(users.deletedAt));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt
  }).from(users).where(whereClause);
  // Return type inferred: { id: number; name: string; email: string; role: string; createdAt: Date }[]
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TYPE INFERENCE MISUNDERSTANDING:
----------------------------------------------------------

BUG 1: Schema/database drift — TypeScript says non-null, database returns null
  Scenario: Developer added .notNull() to an existing column in schema without a migration.
    Schema: email: varchar('email').notNull()
    Database: email column allows NULL (migration never ran).
    TypeScript type: string (not | null — because .notNull() in schema).
    Runtime: some rows have email = null. Application code: user.email.toLowerCase() → TypeError!
  Root cause: Schema says NOT NULL. Database doesn't enforce it. Types lie.
  Fix:
    1. Always run drizzle-kit generate + migrate after every schema change.
    2. Use drizzle-kit push in development to keep DB in sync with schema.
    3. Add CI check: drizzle-kit check to detect schema/DB drift.

BUG 2: Missing .mapWith() on numeric SQL expression — NaN in financial calculations
  Scenario: Invoice total calculation:
    const result = await db.select({
      total: sql\`SUM(amount * quantity)\`
    }).from(invoiceItems);
    const grandTotal = result[0].total + taxAmount;
    // total = '45000.00' (string), taxAmount = 8100 (number)
    // '45000.00' + 8100 = '45000.008100' ← string concatenation! Wrong answer!
    Invoice emailed with grand total: ₹45000.008100
  Root cause: SQL expressions without .mapWith() return string | null from pg driver.
    Adding string + number = string concatenation in JavaScript.
  Fix:
    total: sql\`SUM(amount * quantity)\`.mapWith(Number)
    // Now: 45000 + 8100 = 53100 ✓

BUG 3: Using \$inferInsert when \$inferSelect needed for update — overly strict type
  Scenario: Update endpoint for user profile:
    // type UserUpdate = typeof users.\$inferInsert  ← WRONG! inferInsert for update
    async function updateProfile(id: number, data: typeof users.\$inferInsert) { ... }
    
    // Caller: updateProfile(1, { name: 'Priya' })
    // TypeScript error: "email is required" (email is required in \$inferInsert)
    // Developer confused: "I'm just updating the name, why does email need to be provided?"
  Root cause: \$inferInsert has required fields (notNull, no default). Not right for partial updates.
  Fix:
    type ProfileUpdate = Partial<Pick<typeof users.\$inferSelect, 'name' | 'bio' | 'avatarUrl'>>;
    async function updateProfile(id: number, data: ProfileUpdate) {
      await db.update(users).set(data).where(eq(users.id, id));
    }
    // Now: { name: 'Priya' } is valid. All fields optional.

BUG 4: Left join type not reflecting nullability — undefined check skipped
  Scenario: Getting orders with optional customer:
    const orders = await db.select({
      id: orders.id,
      customerName: users.name  // LEFT JOIN — but dev doesn't realize it can be null
    }).from(orders).leftJoin(users, eq(orders.customerId, users.id));

    for (const order of orders) {
      console.log(order.customerName.toUpperCase()); // TypeError: null.toUpperCase()
    }
    Orders with null customerId: customerName = null. Crash.
  Root cause: Developer didn't check that LEFT JOIN makes joined columns nullable.
    Drizzle DOES type this as string | null — dev ignored the TypeScript warning (! or as string cast).
  Fix:
    console.log(order.customerName?.toUpperCase() ?? 'Unknown Customer');
    Or: use INNER JOIN if customerName is always required.
    Or: COALESCE in SQL: sql\`COALESCE(\${users.name}, 'Unknown')\`.mapWith(String)

BUG 5: \$inferInsert allows optional fields — API accepting unexpected data
  Scenario: User registration API. Developer used:
    type RegBody = typeof users.\$inferInsert
    // \$inferInsert includes: id?, role?, createdAt?, deletedAt?, ...
    
    A sophisticated tester sent: POST /register { email, name, role: 'admin', deletedAt: null }
    Since role is optional in \$inferInsert (has default), TypeScript didn't reject it.
    User was created with role = 'admin' — privilege escalation!
  Root cause: \$inferInsert includes ALL optional fields including server-controlled ones.
  Fix: Create strict input type that only exposes what users can set:
    type RegistrationInput = {
      email: string;
      name: string;
      bio?: string;
    };
    // Role, id, createdAt, deletedAt are NOT in this type.
    // Even if client sends role in request body, TypeScript prevents using it.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE INFERRED TYPES:
  Given this schema:

  const products = pgTable('products', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),    // a
    sku: varchar('sku', { length: 50 }).notNull().unique(),  // b
    name: text('name').notNull(),                           // c
    description: text('description'),                      // d — nullable
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),  // e
    stock: integer('stock').notNull().default(0),          // f
    isActive: boolean('is_active').notNull().default(true), // g
    tags: text('tags').array(),                            // h — nullable array
    createdAt: timestamp('created_at').defaultNow().notNull(), // i
  });

  State the type for each column (a-i) in BOTH \$inferSelect AND \$inferInsert:
  - Is it required or optional in \$inferInsert?
  - Does it include | null in \$inferSelect?
  
  Then write:
  1. A ProductSummary type with only id, name, price, stock, isActive
  2. A NewProductInput type for a creation form (exclude id, createdAt; SKU is required)
  3. A ProductUpdate type for PATCH endpoint (only name, description, price, stock are updatable)

CHALLENGE 2 — FIX THE TYPE BUGS:
  Each code snippet has a type-related bug. Find and fix:

  // Bug 1: Wrong type for update function
  async function updateProduct(id: number, data: typeof products.\$inferInsert) {
    await db.update(products).set(data).where(eq(products.id, id));
  }
  // updateProduct(1, { name: 'New Name' }) ← what's wrong?

  // Bug 2: Incorrect aggregate type
  const result = await db.select({
    total: sql\`SUM(price * stock)\`
  }).from(products);
  const inventoryValue = result[0].total * 1.18; // GST calculation
  // What's wrong? How do you fix it?

  // Bug 3: LEFT JOIN null check missing
  const data = await db.select({
    productName: products.name,
    categoryName: categories.name  // LEFT JOIN
  }).from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));
  return data.map(d => d.categoryName.toUpperCase()); // What fails here?

  // Bug 4: insert type allows server-generated field
  type CreateOrderInput = typeof orders.\$inferInsert;
  function placeOrder(input: CreateOrderInput) { /* ... */ }
  // What field in CreateOrderInput should clients NOT be able to set?
  // How do you prevent it at the type level?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Create a complete type-safe data access layer for a blog platform.

  Schema tables: posts, authors, tags, post_tags (junction), comments

  Build these typed utilities:
  1. All \$inferSelect and \$inferInsert types as named exports
  2. Public API types:
     - PublicPost: id, title, slug, publishedAt, author (name, avatarUrl only)
     - PostSummary: id, title, slug, excerpt (first 150 chars), publishedAt, tagNames (string[])
     - PostDetail: full post with comments and tags
  3. Input types:
     - CreatePostInput: what a POST /posts endpoint accepts (no id, createdAt, updatedAt, authorId — set from session)
     - UpdatePostInput: PATCH endpoint — only title, body, tags, status updatable
  4. A type-safe queryPost(id) function that returns PostDetail | null
  5. A type-safe createPost(authorId, input: CreatePostInput) function that returns PublicPost
  6. Demonstrate that TypeScript prevents: a) passing id in CreatePostInput, b) accessing comment.password (doesn't exist), c) using a non-nullable result without null check after LEFT JOIN
    `,
    summary: `Drizzle's type inference is its superpower: \$inferSelect and \$inferInsert automatically derive the exact TypeScript types your application needs directly from the schema, with no code generation, no separate type files, and no drift. The habit to build: always create narrowed types (Pick, Omit, Partial) for your API boundaries — never expose the raw \$inferInsert type to client input, as it includes optional server-controlled fields that would become security vulnerabilities.`
  },

  {
    id: 8,
    title: "Soft Deletes, Audit Logs & Multi-Tenancy",
    tag: "PRODUCTION PATTERNS EVERY REAL APP NEEDS",
    color: "#3B0764",
    tldr: `Soft deletes (deleted_at timestamp instead of physical DELETE) preserve data for recovery, auditing, and reference integrity while hiding it from normal queries. Audit log columns (created_at, updated_at, created_by) track the who and when of every change. Multi-tenancy via tenant_id row isolation uses a combination of database constraints, Drizzle WHERE conditions, and PostgreSQL Row Level Security to ensure one tenant never sees another's data.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"A user deleted their account. Now their orders show customer_id pointing to a deleted row."
  → Hard delete breaks FK references. Past orders become orphaned.
  → Soft delete: mark user as deleted (deleted_at = NOW()), keep the row. Orders still have valid FK.
  → The "deleted" user is invisible to application queries but present in the database.

"A customer said 'I never placed that order' — we have no way to prove otherwise"
  → No audit trail. created_by, updated_by, created_at, updated_at tell the story.
  → Event sourcing / audit log table: immutable record of every change with who made it.
  → Soft delete adds deleted_at + deleted_by: who deleted it and when.

"Our app serves multiple companies. How do I ensure Company A can't see Company B's data?"
  → Multi-tenancy via tenant_id: every row has a tenant_id column.
  → Application layer: always include WHERE tenant_id = currentTenantId in every query.
  → Database layer (stronger): PostgreSQL Row Level Security enforces at DB level.
  → Drizzle pattern: always filter by tenant_id explicitly (RLS is the safety net, not the strategy).

"I forgot to add the tenant_id filter in one query — entire customer database was exposed"
  → The most catastrophic multi-tenancy bug. Every single query must include tenant filter.
  → Solution: create a withTenant(tenantId) helper that wraps db and injects tenant filter.
  → Defense in depth: application filter + RLS + separate databases (if budget allows).

"I need to query soft-deleted records for an admin "restore" feature — how?"
  → Regular queries: always include WHERE deleted_at IS NULL.
  → Admin queries: omit the deleted_at filter or add WHERE deleted_at IS NOT NULL.
  → Pattern: separate query functions or a flag parameter: getUsers({ includeDeleted: false }).
    `,
    analogy: `
THE ARCHIVE AND VISITOR BADGE ANALOGY:
----------------------------------------
SOFT DELETE = THE ARCHIVE ROOM:
  Company office has thousands of documents (database rows).
  "Deleting" a document = moving it to the archive room (soft delete).
  The document still EXISTS in the archive. Can be retrieved if needed.
  But: day-to-day work ignores the archive. Nobody accidentally uses archived documents.
  
  Application queries: "fetch active documents" → skip the archive room (WHERE deleted_at IS NULL).
  Admin queries: "show archived documents from last month" → look in archive room.
  Recovery: "restore this document" → move it back from archive (set deleted_at = NULL).
  Physical destruction: GDPR compliance → actually delete from archive after 7 years (scheduled hard delete).

AUDIT COLUMNS = THE VISITOR BADGE AND SIGN-IN LOG:
  Every person entering the office signs in (created_by, created_at).
  Every document change: sign it with your name and date (updated_by, updated_at).
  The sign-in log can't be erased — immutable record.
  
  For critical actions: separate audit log table (like a notary record).
    Who changed it, from what value, to what value, when, from what IP address.
    "On 2024-01-15 at 14:32, Priya changed order #4521 status from 'pending' to 'confirmed'."
    This data is gold during disputes, compliance audits, and debugging.

MULTI-TENANCY = THE SHARED OFFICE BUILDING WITH PRIVATE FLOORS:
  One database (shared building). Multiple companies (tenants) on different floors.
  Each floor has a key card (tenant_id) that only opens that floor's doors.
  
  Application-level filter = reception enforcing: "I can see from your badge you're on floor 5."
    Every query: WHERE tenant_id = 5. Like reception checking badge on every interaction.
    Problem: if reception forgets to check (developer forgets WHERE clause) → cross-floor access.
  
  PostgreSQL RLS = elevator with biometric: physically impossible to access wrong floor.
    Even if you tell the elevator "take me to floor 3" — your biometrics say floor 5 only.
    CREATE POLICY: IF floor_id != current_tenant → row invisible. Period. No bypass possible.
    
  Defense in depth: use BOTH application filter AND RLS.
    Application filter: fast (query planner uses index on tenant_id).
    RLS: safety net (catches the forgotten WHERE clause before data leaks).

TENANT_ID HELPER PATTERN = GIVING EVERY VISITOR A COLORED BADGE:
  Instead of manually checking every badge every time:
  Create a function createTenantDb(tenantId) that returns a db-like object
  that AUTOMATICALLY appends WHERE tenant_id = tenantId to every relevant query.
  
  New developer on the team: uses createTenantDb() → can't accidentally forget the filter.
  Existing queries: if they use the helper → tenant isolation guaranteed.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — SOFT DELETES, AUDIT, MULTI-TENANCY INTERNALS:
-------------------------------------------------------------------------

SOFT DELETE SCHEMA PATTERNS:
  Pattern 1 — Simple: deleted_at TIMESTAMPTZ nullable.
    deleted_at IS NULL → active row.
    deleted_at IS NOT NULL → deleted row.
    Restoring: UPDATE SET deleted_at = NULL.
    
  Pattern 2 — Extended: deleted_at + deleted_by + delete_reason.
    More audit data. Useful for "who deleted this and why?"
    
  Pattern 3 — is_deleted BOOLEAN + deleted_at for the timestamp.
    is_deleted: faster index (boolean low-cardinality, small index).
    deleted_at: for queries like "deleted in last 30 days."
    Redundant but sometimes cleaner for application code.
  
  Index strategy:
    Partial index on active rows only (PostgreSQL):
    CREATE INDEX ON users (email) WHERE deleted_at IS NULL;
    → Index size: only active users. Email lookup for active users uses this small, fast index.
    → Without partial index: email lookup scans index including deleted users. Larger, slower.
  
  Foreign key and soft delete interaction:
    Users table with soft delete. Orders references users.customer_id.
    Soft-deleting a user: fine — FK still valid (row exists).
    Hard-deleting a user: FK violation if orders exist with that customer_id.
    → Soft delete is the natural FK-safe delete strategy.
    → Add RESTRICT to FK: can't hard-delete if referenced rows exist (belt and suspenders).

AUDIT LOG COLUMNS vs AUDIT LOG TABLE:
  Audit columns (on every table: created_at, updated_at, created_by, updated_by):
    Pros: simple, built into every row, easy to query.
    Cons: only records current state. History (what the value WAS before) is lost on UPDATE.
    
  Audit log table (separate table: entity_changes):
    Columns: id, table_name, record_id, changed_by, changed_at, action, old_values, new_values (JSONB)
    Pros: full history. Can answer "what was this order's status 3 days ago?"
    Cons: schema complexity, storage cost, query complexity.
    
  Implementation options:
    1. Application-level: write to audit log table before/after each mutation.
       Pro: explicit. Con: can be forgotten; not atomic unless in same transaction.
    2. PostgreSQL trigger: AFTER UPDATE OR DELETE, write to audit log automatically.
       Pro: can't be forgotten; always runs; uses JSONB to capture old/new values.
       Con: trigger in DB, not visible in application code; harder to test.

MULTI-TENANCY PATTERNS:
  Pattern 1 — Separate databases per tenant:
    Strictest isolation. Easiest to query (no tenant_id filtering needed).
    Cost: one database per tenant. Scales to hundreds, not thousands.
    Use for: enterprise customers with strict data residency requirements.
  
  Pattern 2 — Separate schemas per tenant (PostgreSQL schema = namespace):
    One database, multiple schemas (one per tenant). Tables: tenant1.orders, tenant2.orders.
    Query: SET search_path = tenant1; SELECT * FROM orders; — no tenant_id needed.
    Drizzle: schema defined per tenant via pgSchema('tenant1').
    Cost: schema management complexity. Migrations must run on each schema.
    Use for: medium scale, <1000 tenants, when per-tenant customization needed.
  
  Pattern 3 — Shared tables, tenant_id column:
    Most common for SaaS. All tenants share tables. Every row has tenant_id.
    Application: always WHERE tenant_id = :currentTenantId.
    + PostgreSQL RLS as safety net.
    Scale: millions of tenants possible. Cost: must not forget WHERE clause.
    
  Drizzle tenant helper pattern:
    Create a function that returns a "tenanted" query builder:
    function tenantDb(tenantId) {
      return {
        users: {
          findMany: (opts) => db.query.users.findMany({
            ...opts,
            where: and(eq(users.tenantId, tenantId), opts?.where)
          })
        }
      };
    }
    
    Or: wrap individual queries in a higher-order function.

POSTGRESQL RLS FOR MULTI-TENANCY:
  CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::BIGINT);
  
  Application: before queries, set the tenant:
    await db.execute(sql\`SET LOCAL app.current_tenant = \${tenantId}\`);
    // SET LOCAL: session variable that resets at end of transaction
  
  With Supabase: use auth.uid() and a tenant membership table:
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  
  Important: RLS performance. The USING clause runs for every row.
    Subquery in USING: runs per row → N+1 at the database level!
    Better: use a cached function or JWT claim:
    USING (tenant_id = get_current_tenant_id())
    WHERE get_current_tenant_id() is STABLE and returns current_setting('app.current_tenant').
    `,
    code: `
// ===== SOFT DELETES, AUDIT LOGS & MULTI-TENANCY — EXAMPLES =====

// EXAMPLE 1: Soft delete schema pattern with full audit columns

const posts = pgTable('posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'number' }).notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  authorId: bigint('author_id', { mode: 'number' }).notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  // Audit columns:
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .$onUpdateFn(() => new Date()).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }).notNull()
    .references(() => users.id),
  updatedBy: bigint('updated_by', { mode: 'number' })
    .references(() => users.id),
  // Soft delete:
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: bigint('deleted_by', { mode: 'number' })
    .references(() => users.id),
}, (table) => ({
  tenantIdx: index('idx_posts_tenant').on(table.tenantId),
  authorIdx: index('idx_posts_author').on(table.authorId),
  // Partial index: only active posts indexed for status+tenantId lookups
  activeStatusIdx: index('idx_posts_active_status')
    .on(table.tenantId, table.status)
    .where(sql\`\${table.deletedAt} IS NULL\`)
}));

// EXAMPLE 2: Soft delete CRUD functions with tenant isolation

// Helper: base WHERE for active (non-deleted) rows in a tenant
function activePostsWhere(tenantId) {
  return and(eq(posts.tenantId, tenantId), isNull(posts.deletedAt));
}

// Get active posts (never sees deleted rows):
async function getPosts(tenantId, page = 1) {
  return db.select({
    id: posts.id, title: posts.title, status: posts.status, createdAt: posts.createdAt
  })
  .from(posts)
  .where(activePostsWhere(tenantId))
  .orderBy(desc(posts.createdAt))
  .limit(20).offset((page - 1) * 20);
}

// Soft delete (never physically removes):
async function softDeletePost(tenantId, postId, deletedByUserId) {
  const [deleted] = await db.update(posts)
    .set({
      deletedAt: new Date(),
      deletedBy: deletedByUserId
    })
    .where(and(
      eq(posts.id, postId),
      eq(posts.tenantId, tenantId),   // Tenant isolation: can't delete another tenant's posts!
      isNull(posts.deletedAt)          // Only delete active posts
    ))
    .returning({ id: posts.id, deletedAt: posts.deletedAt });

  if (!deleted) throw new Error('Post not found or already deleted');
  return deleted;
}

// Restore soft-deleted post:
async function restorePost(tenantId, postId) {
  const [restored] = await db.update(posts)
    .set({ deletedAt: null, deletedBy: null })
    .where(and(
      eq(posts.id, postId),
      eq(posts.tenantId, tenantId),
      isNotNull(posts.deletedAt)  // Only restore deleted posts
    ))
    .returning({ id: posts.id });

  if (!restored) throw new Error('Post not found or not deleted');
  return restored;
}

// EXAMPLE 3: Audit log table with trigger-based approach

const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'number' }),
  tableName: text('table_name').notNull(),
  recordId: bigint('record_id', { mode: 'number' }).notNull(),
  action: text('action').notNull(),  // 'INSERT' | 'UPDATE' | 'DELETE'
  changedBy: bigint('changed_by', { mode: 'number' }).references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  oldValues: jsonb('old_values'),    // null for INSERT
  newValues: jsonb('new_values'),    // null for DELETE
  ipAddress: text('ip_address'),
  userAgent: text('user_agent')
}, (table) => ({
  recordIdx: index('idx_audit_record').on(table.tableName, table.recordId),
  tenantIdx: index('idx_audit_tenant').on(table.tenantId, table.changedAt.desc())
}));

// Application-level audit logging (within transaction):
async function updateOrderStatus(tx, orderId, tenantId, newStatus, actorId) {
  // Get current state for audit:
  const [current] = await tx.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));

  if (!current) throw new Error('Order not found');

  // Update:
  const [updated] = await tx.update(orders)
    .set({ status: newStatus, updatedBy: actorId })
    .where(eq(orders.id, orderId))
    .returning();

  // Write audit log in same transaction:
  await tx.insert(auditLogs).values({
    tenantId,
    tableName: 'orders',
    recordId: orderId,
    action: 'UPDATE',
    changedBy: actorId,
    oldValues: { status: current.status },
    newValues: { status: newStatus }
  });

  return updated;
}

// EXAMPLE 4: Multi-tenancy helper — inject tenant context automatically

function createTenantContext(tenantId) {
  return {
    // Automatically scoped to tenant — impossible to forget WHERE clause:
    async getPosts(opts = {}) {
      return db.select().from(posts)
        .where(and(
          eq(posts.tenantId, tenantId), // Always injected
          isNull(posts.deletedAt),       // Always exclude deleted
          opts.where                     // Additional caller filters
        ))
        .orderBy(opts.orderBy ?? desc(posts.createdAt))
        .limit(opts.limit ?? 20)
        .offset(opts.offset ?? 0);
    },

    async createPost(authorId, data) {
      return db.insert(posts)
        .values({ ...data, tenantId, createdBy: authorId })  // tenantId always set
        .returning();
    },

    async deletePost(postId, userId) {
      return softDeletePost(tenantId, postId, userId);
    }
  };
}

// Usage: impossible to access wrong tenant's data
// const ctx = createTenantContext(req.user.tenantId);
// const userPosts = await ctx.getPosts({ where: eq(posts.authorId, req.user.id) });

// EXAMPLE 5: PostgreSQL RLS for multi-tenancy (Supabase pattern)

async function setupRLS() {
  // Enable RLS on posts table:
  await db.execute(sql\`ALTER TABLE posts ENABLE ROW LEVEL SECURITY\`);
  await db.execute(sql\`ALTER TABLE posts FORCE ROW LEVEL SECURITY\`);

  // Policy: users can only see rows for their tenant:
  await db.execute(sql\`
    CREATE POLICY tenant_isolation ON posts
    USING (
      tenant_id = current_setting('app.current_tenant_id', true)::BIGINT
    )
  \`);

  // Policy: users can only write to their own tenant:
  await db.execute(sql\`
    CREATE POLICY tenant_write ON posts
    FOR INSERT WITH CHECK (
      tenant_id = current_setting('app.current_tenant_id', true)::BIGINT
    )
  \`);
}

// Set tenant context before queries (per-request middleware):
async function withTenantContext(tenantId, queryFn) {
  return db.transaction(async (tx) => {
    // SET LOCAL resets at end of transaction:
    await tx.execute(sql\`SELECT set_config('app.current_tenant_id', \${tenantId.toString()}, true)\`);
    return queryFn(tx);
  });
}

// EXAMPLE 6: Querying deleted records (admin/recovery features)

// Admin: list recently deleted posts (for recovery UI):
async function getDeletedPosts(tenantId, deletedWithinDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - deletedWithinDays);

  return db.select({
    id: posts.id,
    title: posts.title,
    deletedAt: posts.deletedAt,
    deletedBy: posts.deletedBy,
    deleterName: users.name
  })
  .from(posts)
  .leftJoin(users, eq(posts.deletedBy, users.id))
  .where(and(
    eq(posts.tenantId, tenantId),
    isNotNull(posts.deletedAt),
    gte(posts.deletedAt, cutoff)
  ))
  .orderBy(desc(posts.deletedAt));
}

// EXAMPLE 7: Scheduled hard delete for GDPR compliance

async function purgeOldDeletedRecords(olderThanDays = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  // Hard delete records that were soft-deleted over a year ago:
  const deleted = await db.delete(posts)
    .where(and(
      isNotNull(posts.deletedAt),
      lt(posts.deletedAt, cutoff)
    ))
    .returning({ id: posts.id, tenantId: posts.tenantId });

  console.log(\`Purged \${deleted.length} records soft-deleted before \${cutoff.toISOString()}\`);
  return deleted.length;
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM SOFT DELETE AND MULTI-TENANCY MISTAKES:
-----------------------------------------------------------------

BUG 1: Missing deleted_at filter — deleted posts visible on public blog
  Scenario: Blog platform. Posts table has deleted_at column. Developer added a new endpoint:
    GET /posts → SELECT * FROM posts ORDER BY created_at DESC
    (New developer. Forgot to add WHERE deleted_at IS NULL.)
    Result: soft-deleted posts (including posts removed for policy violations) appeared on the site.
    A user complained that their deleted post was still public. PR nightmare.
  Fix:
    ALWAYS include isNull(posts.deletedAt) in every non-admin query.
    Create a getActivePosts() helper that always includes this filter.
    Pattern: if 90% of queries need this filter, create a default view or helper.
    PostgreSQL view: CREATE VIEW active_posts AS SELECT * FROM posts WHERE deleted_at IS NULL;
    Use active_posts in application queries — can't "forget" the filter.

BUG 2: Missing tenant_id in UPDATE — updated another tenant's record
  Scenario: SaaS CRM. Update contact endpoint:
    await db.update(contacts).set({ name: newName }).where(eq(contacts.id, contactId));
    Missing: AND tenant_id = currentTenantId
    
    Tenant A sent contactId=500 (which belongs to Tenant B).
    Tenant A's user updated Tenant B's contact name. Cross-tenant data modification.
    No error thrown — SQL succeeded silently.
  Root cause: UPDATE affected 1 row regardless of which tenant it belonged to.
  Fix: ALWAYS include tenant_id in UPDATE/DELETE WHERE clause:
    await db.update(contacts)
      .set({ name: newName })
      .where(and(
        eq(contacts.id, contactId),
        eq(contacts.tenantId, currentTenantId)  // MANDATORY
      ));
    If tenant_id doesn't match: 0 rows updated → can detect as "not found" safely.

BUG 3: Soft delete breaking UNIQUE constraint — can't re-register deleted email
  Scenario: Users table: email UNIQUE. Soft-deleted user. New user tries to register with same email.
    INSERT INTO users (email, ...) VALUES ('deleted_user@example.com', ...)
    ERROR: duplicate key value violates unique constraint on email.
    The deleted user's row still occupies the unique email slot.
  Root cause: Standard UNIQUE includes all rows, even soft-deleted ones.
  Fix: Replace standard UNIQUE with partial unique index:
    CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL;
    Now: deleted users' emails are free for re-registration.
    Tradeoff: deleted user could have their email "stolen" by a new registration.
    Solution: on registration, check if email exists in deleted rows → offer account recovery flow.

BUG 4: Audit log not in same transaction — audit lost on rollback
  Scenario: Order status update with audit logging:
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ status: 'confirmed' }).where(...);
    });
    // Audit log written AFTER transaction:
    await db.insert(auditLogs).values({ action: 'status_update', ... }); // Outside tx!
    
    Transaction sometimes rolled back (constraint violations). But audit log was already written!
    Audit log showed "order confirmed" for orders that were never actually confirmed.
    Compliance nightmare.
  Fix: Write audit log INSIDE the same transaction:
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ status: 'confirmed' }).where(...);
      await tx.insert(auditLogs).values({ action: 'status_update', ... }); // In same tx!
    });
    If transaction rolls back: audit log rolls back too. Always consistent.

BUG 5: RLS not FORCED — service account bypasses tenant isolation
  Scenario: Tenant isolation implemented with RLS. Seemed secure.
    Background job (service account) ran reports. Used the postgres superuser role.
    RLS policies don't apply to superusers (and to table owners without FORCE).
    Report query fetched ALL tenants' data. CSV export with data from 500 companies sent to one.
    Security incident. Regulatory notification required.
  Fix:
    ALTER TABLE orders FORCE ROW LEVEL SECURITY; -- Apply to table owner too
    Create a dedicated service account role that is NOT a superuser:
    CREATE ROLE reporting_service;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_service;
    -- RLS applies to reporting_service. Safe.
    Background jobs: use reporting_service credentials, not postgres superuser.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE QUERY BEHAVIOR:
  Users table: id, tenant_id, email (UNIQUE), name, deleted_at (nullable).
  Current data:
    (1, tenant_A, 'priya@test.com', 'Priya', NULL)          — active
    (2, tenant_A, 'rohan@test.com', 'Rohan', '2024-01-01')  — soft deleted
    (3, tenant_B, 'arjun@test.com', 'Arjun', NULL)          — active, different tenant

  a) SELECT query: db.select().from(users).where(eq(users.tenantId, 'tenant_A'))
     How many rows returned? Which rows?

  b) INSERT: db.insert(users).values({ tenantId: 'tenant_A', email: 'rohan@test.com', name: 'New Rohan' })
     Does this succeed? Why? (Standard UNIQUE vs partial UNIQUE — which is in use?)
     What needs to change to allow this insert?

  c) UPDATE: db.update(users).set({ name: 'Hacker' }).where(eq(users.id, 3))
     (Called from Tenant A's context, no tenant_id filter)
     Does this succeed? What's the security impact?

  d) Soft delete + restore cycle:
     Step 1: softDelete(tenantId='tenant_A', userId=1)
     Step 2: softDelete(tenantId='tenant_A', userId=1)  [called again]
     Step 3: restore(tenantId='tenant_A', userId=1)
     What happens at each step? What conditions prevent double-delete issues?

CHALLENGE 2 — FIX THE MULTI-TENANCY BUGS:
  This SaaS billing API has 3 security bugs. Find and fix each.

  // Bug 1: Missing tenant filter on read
  async function getInvoice(invoiceId: number) {
    return db.select().from(invoices).where(eq(invoices.id, invoiceId));
  }

  // Bug 2: Missing tenant filter on update
  async function markInvoicePaid(invoiceId: number, tenantId: number) {
    return db.update(invoices)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(invoices.id, invoiceId)); // tenantId not checked!
  }

  // Bug 3: Audit log outside transaction
  async function cancelSubscription(tenantId: number, subscriptionId: number, userId: number) {
    await db.transaction(async (tx) => {
      await tx.update(subscriptions)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.tenantId, tenantId)));
    });
    // Bug: audit written after transaction
    await db.insert(auditLogs).values({ action: 'cancel_subscription', recordId: subscriptionId, changedBy: userId });
  }

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete multi-tenant document management system.

  Requirements:
  1. Schema: tenants, users, documents, document_versions, audit_logs
     - documents: soft delete with deleted_at, deleted_by
     - documents: full audit columns (created_at, updated_at, created_by, updated_by)
     - document_versions: immutable history of every document change (append-only)
     - Partial unique index: document slug unique within tenant (not globally)

  2. Functions (all tenant-isolated):
     - createDocument(tenantId, authorId, data) → creates document + version 1 entry in document_versions + audit log
     - updateDocument(tenantId, documentId, editorId, changes) → creates new version + updates document + audit log (all in one transaction)
     - softDeleteDocument(tenantId, documentId, deleterId) → soft delete + audit log
     - getDocumentHistory(tenantId, documentId) → all versions, newest first
     - searchDocuments(tenantId, query) → active documents matching query (title/body ILIKE)

  3. Demonstrate that: a) deleting a document doesn't break document_versions history, b) two tenants can have same slug, c) the audit log and version are always consistent with the document state (same transaction), d) listing documents always excludes deleted ones by default
    `,
    summary: `Soft deletes, audit columns, and multi-tenancy are not afterthoughts — they're architectural decisions that must be built into the schema from day one because retrofitting them onto a production system with millions of rows requires painful migrations. The golden rule for multi-tenancy: never write a query on a tenant-scoped table without WHERE tenant_id = :currentTenantId, and back this up with PostgreSQL RLS as the safety net that catches the forgotten WHERE clause before it becomes a security incident.`
  },

  {
    id: 9,
    title: "Drizzle vs Prisma: Feature Matrix & Raw SQL Wins",
    tag: "CHOOSING YOUR WEAPON — AND KNOWING WHEN NEITHER IS ENOUGH",
    color: "#065F46",
    tldr: `Drizzle and Prisma serve different developers and different use cases. Drizzle is a SQL-first TypeScript query builder — lightweight, no codegen, maximum SQL expressiveness, ideal when you want to stay close to the metal. Prisma is a schema-first ORM with a powerful generated client — highest developer ergonomics, excellent for standard CRUD, but opaque SQL generation and limited expressiveness for complex queries. Raw SQL wins when neither can express what you need.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I can't decide between Drizzle and Prisma for my new project — what should I choose?"
  → Wrong question. Right question: what are my query complexity, performance, team, and scale requirements?
  → Prisma: better for teams new to databases, standard CRUD-heavy apps, rapid prototyping.
  → Drizzle: better for complex queries, performance-critical apps, teams comfortable with SQL.

"I'm using Prisma but I need a window function — how do I do it?"
  → Prisma: \$queryRaw\`SELECT ... RANK() OVER (...)\` — full raw SQL needed.
  → Drizzle: sql\`RANK() OVER (...)\` fragment inside typed query — can mix ORM and raw.
  → Key difference: Drizzle's raw SQL mixes with typed queries. Prisma's raw SQL is fully manual.

"Prisma is generating terrible SQL — how do I debug it?"
  → Enable query logging: in client init: log: ['query', 'error', 'warn']
  → Or: set DATABASE_URL_LOG=verbose for full SQL output.
  → Or: use prisma.\$on('query', ...) to log queries programmatically.
  → Drizzle: { logger: true } in drizzle() init. Or: .toSQL() to inspect any query.

"Should I use raw SQL for my reporting queries instead of an ORM?"
  → Yes, for complex reports: raw SQL is often clearer, faster to write, and more maintainable.
  → Rule of thumb: if the SQL is simpler than the ORM equivalent, use SQL.
  → Drizzle + raw SQL: best of both worlds — typed ORM for CRUD, sql\`\` tag or db.execute() for reports.

"What does Drizzle NOT have that Prisma has?"
  → Prisma: nested writes (create user + orders in one call), middleware system, preview features like fullTextSearch.
  → Drizzle: no middleware, no nested writes, no CLI GUI (though Studio exists), smaller ecosystem.
  → Drizzle: more features in core SQL expressiveness (CTEs, window functions via sql tag).
    `,
    analogy: `
THE TOOLS ANALOGY:
-------------------
Database interaction layer = a workshop. You're building furniture (application features).

PRISMA = IKEA FLAT-PACK FURNITURE KIT:
  Beautiful instruction manual (.prisma schema). Everything pre-measured.
  99% of common furniture can be built exactly from the kit. Easy, fast, consistent.
  Step-by-step: run prisma generate → tools are prepared for you automatically.
  Limitations: want to build something unusual (window function, lateral join)?
    Kit doesn't cover it. Must use "custom mode" (\$queryRaw) — back to manual from scratch.
  Best for: teams that want to build standard furniture fast with minimal SQL knowledge.

DRIZZLE = PROFESSIONAL WOODWORKING TOOLS:
  Raw materials + precision tools. No pre-cut pieces.
  db.select().from().where() = circular saw with laser guide. Precise. Fast. Transparent.
  sql\`\` tag = the hand chisel for fine work the machine can't do.
  You see every cut, every joint. Nothing hidden. Full control over the wood.
  Learning curve: must know what you're building (SQL knowledge required).
  Best for: craftspersons who want to see every query, tune every index, handle every edge case.

RAW SQL = BUILDING WITH A PENCIL AND RULER FROM SCRATCH:
  When even the professional tools don't cover the design:
    complex recursive CTE with multiple references,
    lateral join with aggregate sub-queries,
    MERGE statement (PostgreSQL 15+),
    COPY for bulk loading.
  Fall back to: db.execute(sql\`WITH RECURSIVE ...\`)
  Or: use pg library directly, bypassing Drizzle entirely.
  Best for: reporting queries, analytics, migrations, admin tooling.

THE FEATURE MATRIX SCORECARD:
  Expressiveness:      Drizzle ★★★★★  Prisma ★★★☆☆  Raw SQL ★★★★★
  Type Safety:         Drizzle ★★★★★  Prisma ★★★★★  Raw SQL ★★☆☆☆
  DX / Ergonomics:     Drizzle ★★★★☆  Prisma ★★★★★  Raw SQL ★★☆☆☆
  Migrations:          Drizzle ★★★★☆  Prisma ★★★★★  Manual  ★★☆☆☆
  Runtime Weight:      Drizzle ★★★★★  Prisma ★★★☆☆  N/A
  Complex Queries:     Drizzle ★★★★★  Prisma ★★☆☆☆  Raw SQL ★★★★★
  Nested Writes:       Drizzle ★★☆☆☆  Prisma ★★★★★  Varies
  Debugging SQL:       Drizzle ★★★★★  Prisma ★★★☆☆  N/A
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DRIZZLE VS PRISMA INTERNALS AND RAW SQL WINS:
-------------------------------------------------------------------------

PRISMA ARCHITECTURE:
  1. schema.prisma: single source of truth. Defines models, relations, enums.
  2. prisma generate: reads schema → generates PrismaClient in node_modules/@prisma/client.
     Generated code: TypeScript interfaces, model client methods, filter types.
     Must re-run after every schema change. CI must check for this.
  3. prisma migrate dev: compares schema to current DB state → generates SQL migration file.
     Applies migration. Updates migration history table (_prisma_migrations).
  4. PrismaClient: auto-generated. Methods:
     prisma.user.findUnique({ where: ... })
     prisma.user.findMany({ where: ..., include: ..., select: ..., orderBy: ..., skip: ..., take: ... })
     prisma.user.create({ data: ... })
     prisma.user.update({ where: ..., data: ... })
     prisma.user.upsert({ where: ..., create: ..., update: ... })
     prisma.user.delete({ where: ... })
     prisma.user.count({ where: ... })
     prisma.\$transaction([...operations]) or prisma.\$transaction(async (tx) => { ... })
     prisma.\$queryRaw\`...\` → raw SQL, returns typed via Prisma.raw
     prisma.\$executeRaw\`...\` → raw SQL, returns row count

DRIZZLE ARCHITECTURE:
  1. schema.ts: TypeScript file. Define tables via pgTable/mysqlTable/sqliteTable.
  2. NO code generation. TypeScript compiler infers types from schema at compile time.
  3. drizzle-kit generate: reads schema → diffs against snapshot → generates migration SQL file.
     drizzle-kit migrate: applies pending migrations.
     drizzle-kit push: directly applies schema to DB (no migration files — dev only).
  4. Drizzle instance: db = drizzle(client, { schema, logger }).
     db.select().from().where().orderBy().limit().offset() — query builder.
     db.insert(table).values({}).returning() — typed insert.
     db.update(table).set({}).where() — typed update.
     db.delete(table).where() — typed delete.
     db.query.table.findMany({ with: {}, where: ..., columns: ... }) — relational API.
     db.transaction(async (tx) => { ... }) — transactions.
     db.execute(sql\`...\`) — raw SQL with full pg-level return.

WHEN RAW SQL WINS (both Drizzle AND Prisma struggle):
  
  1. Bulk COPY for massive inserts:
     COPY orders FROM '/tmp/orders.csv' CSV HEADER;
     Neither ORM supports COPY. Must use psql or pg COPY stream.
     Drizzle: db.execute(sql\`COPY ....\`) won't work for file-based COPY (psql needed).
     Node: use pg CopyFromStream API directly.
  
  2. Recursive CTE with complex self-reference:
     WITH RECURSIVE org_tree AS (
       SELECT id, parent_id, name, 1 as depth FROM orgs WHERE id = :rootId
       UNION ALL
       SELECT o.id, o.parent_id, o.name, t.depth + 1
       FROM orgs o JOIN org_tree t ON o.parent_id = t.id WHERE t.depth < 10
     )
     SELECT * FROM org_tree ORDER BY depth;
     Drizzle: db.execute(sql\`WITH RECURSIVE ...\`) — full raw SQL. Works.
     Prisma: prisma.\$queryRaw\`WITH RECURSIVE ...\` — full raw SQL. Works.
     Drizzle \$with: available for simpler CTEs without the UNION ALL recursion.
  
  3. MERGE statement (PostgreSQL 15+):
     MERGE INTO target USING source ON (condition)
     WHEN MATCHED THEN UPDATE ...
     WHEN NOT MATCHED THEN INSERT ...;
     Neither ORM has built-in MERGE support. Full raw SQL required.
  
  4. Full-text search with ts_rank:
     Drizzle: possible with sql\`\` fragments — workable.
     Prisma: \$queryRaw required for complex FTS. Prisma has preview fullTextSearch for basic cases.
  
  5. PostgreSQL LISTEN/NOTIFY for real-time:
     Not accessible through Drizzle or Prisma ORM layer.
     Must use pg client directly: client.query('LISTEN channel') + client.on('notification', ...)
  
  6. Partition management:
     CREATE TABLE orders_2024_q1 PARTITION OF orders FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
     Must use raw SQL or migration files.

MIGRATION COMPARISON:
  Drizzle migration workflow:
    1. Edit schema.ts.
    2. drizzle-kit generate → creates 0001_add_column.sql.
    3. Review the .sql file (it's readable SQL).
    4. drizzle-kit migrate → applies it.
    5. Schema snapshot updated.
    
  Prisma migration workflow:
    1. Edit schema.prisma.
    2. prisma migrate dev → generates AND applies migration.
    3. Migration file in prisma/migrations/. Readable SQL.
    4. OR: prisma migrate deploy (production — doesn't create new migration, just applies).
  
  Key difference: Drizzle separates generate and migrate. You can review SQL before applying.
    Prisma migrate dev combines both by default (uses --create-only flag to separate).
    Both generate readable SQL migration files. Both maintain migration history in the database.
    Drizzle rollback: no automatic rollback. Must write rollback SQL manually.
    Prisma rollback: no automatic rollback either. Must write reverse migration.
    `,
    code: `
// ===== DRIZZLE VS PRISMA FEATURE MATRIX & RAW SQL — EXAMPLES =====

// EXAMPLE 1: Same query in Drizzle vs Prisma — side by side

// Goal: "Find active users in Mumbai with their order count and total spent, last 30 days"

// ============ DRIZZLE ============
// What SQL this generates: transparent. You can predict it exactly.
async function getUserStatsD(city, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    orderCount: count(orders.id).mapWith(Number),
    totalSpent: sql\`COALESCE(SUM(\${orders.amount}::NUMERIC), 0)\`.mapWith(Number)
  })
  .from(users)
  .leftJoin(orders, and(
    eq(orders.customerId, users.id),
    gte(orders.createdAt, since),
    ne(orders.status, 'cancelled')
  ))
  .where(and(eq(users.city, city), isNull(users.deletedAt)))
  .groupBy(users.id, users.name, users.email)
  .orderBy(desc(sql\`SUM(\${orders.amount}::NUMERIC)\`));
}

// ============ PRISMA ============
// What SQL Prisma generates: opaque without DEBUG logging
// async function getUserStatsP(city, days) {
//   const since = new Date();
//   since.setDate(since.getDate() - days);
//
//   return prisma.user.findMany({
//     where: { city, deletedAt: null },
//     select: {
//       id: true, name: true, email: true,
//       _count: { select: { orders: { where: {
//         createdAt: { gte: since }, status: { not: 'cancelled' }
//       }}}},
//     },
//     // Note: totalSpent is NOT expressible here in Prisma findMany
//     // Would need groupBy with _sum but that requires separate query
//   });
//   // Prisma limitation: totalSpent from SUM requires prisma.groupBy or $queryRaw
// }

// EXAMPLE 2: Nested writes — Prisma advantage

// ============ PRISMA — Nested write in one call ============
// async function createOrderP(customerId, items) {
//   return prisma.order.create({
//     data: {
//       customerId,
//       amount: items.reduce((s, i) => s + i.price * i.qty, 0),
//       status: 'pending',
//       items: {
//         create: items.map(i => ({   // Nested create — all in one round trip
//           productId: i.productId,
//           quantity: i.qty,
//           unitPrice: i.price
//         }))
//       }
//     },
//     include: { items: true }
//   });
// }

// ============ DRIZZLE — Explicit transaction needed ============
async function createOrderD(customerId, items) {
  return db.transaction(async (tx) => {
    const [order] = await tx.insert(orders)
      .values({ customerId, amount: items.reduce((s, i) => s + i.price * i.qty, 0).toString(), status: 'pending' })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      items.map(i => ({ orderId: order.id, productId: i.productId, quantity: i.qty, unitPrice: i.price.toString() }))
    );
    return order;
  });
  // More verbose than Prisma nested writes. But: explicit, visible, debuggable.
}

// EXAMPLE 3: Complex query where Drizzle wins over Prisma

// Goal: "For each customer, rank their orders by amount and include 30-day running total"
// Prisma: must use \$queryRaw for window functions — no typed return
// Drizzle: can mix sql\`\` fragments within typed query

async function getOrderAnalytics(tenantId) {
  return db.select({
    orderId: orders.id,
    customerId: orders.customerId,
    customerName: users.name,
    amount: orders.amount,
    status: orders.status,
    // Window functions — only possible in Drizzle via sql\`\` tag:
    amountRank: sql\`RANK() OVER (PARTITION BY \${orders.customerId}
                    ORDER BY \${orders.amount}::NUMERIC DESC)\`.mapWith(Number),
    runningTotal: sql\`SUM(\${orders.amount}::NUMERIC) OVER (
                    PARTITION BY \${orders.customerId}
                    ORDER BY \${orders.createdAt}
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                  )\`.mapWith(Number),
    pctOfCustomerTotal: sql\`ROUND(
                    \${orders.amount}::NUMERIC / NULLIF(SUM(\${orders.amount}::NUMERIC)
                    OVER (PARTITION BY \${orders.customerId}), 0) * 100, 2
                  )\`.mapWith(Number)
  })
  .from(orders)
  .innerJoin(users, eq(orders.customerId, users.id))
  .where(and(eq(orders.tenantId, tenantId), ne(orders.status, 'cancelled')));
}

// EXAMPLE 4: Where raw SQL beats both ORMs — recursive CTE

async function getOrgHierarchy(rootOrgId, maxDepth = 10) {
  // Neither Prisma nor Drizzle has a typed recursive CTE API.
  // Must use raw SQL via db.execute():
  const result = await db.execute(sql\`
    WITH RECURSIVE org_tree AS (
      -- Anchor member: start from the root organization
      SELECT
        id, parent_id, name, slug,
        1 AS depth,
        ARRAY[id] AS path,
        name AS path_names
      FROM organizations
      WHERE id = \${rootOrgId}

      UNION ALL

      -- Recursive member: join children
      SELECT
        o.id, o.parent_id, o.name, o.slug,
        t.depth + 1,
        t.path || o.id,
        t.path_names || ' > ' || o.name
      FROM organizations o
      INNER JOIN org_tree t ON o.parent_id = t.id
      WHERE t.depth < \${maxDepth}
        AND NOT (o.id = ANY(t.path))  -- Cycle detection
    )
    SELECT id, parent_id, name, slug, depth, path_names
    FROM org_tree
    ORDER BY depth, name
  \`);

  return result.rows; // Not typed — must manually cast or use Zod to validate
}

// EXAMPLE 5: Prisma debugging — logging generated SQL

// Enable Prisma query logging:
// const prisma = new PrismaClient({
//   log: [
//     { emit: 'event', level: 'query' },
//     { emit: 'stdout', level: 'error' },
//   ],
// });
//
// prisma.\$on('query', (e) => {
//   console.log('Query:', e.query);
//   console.log('Params:', e.params);
//   console.log('Duration:', e.duration + 'ms');
// });

// Drizzle equivalent (simpler):
// const db = drizzle(client, { logger: true }); // Logs all queries
// OR inspect without executing:
// const q = db.select().from(users).where(eq(users.id, 42));
// console.log(q.toSQL()); // { sql: '...', params: [...] }

// EXAMPLE 6: Batch operations — where Drizzle shines

// Drizzle: batch multiple queries efficiently
// import { drizzle } from 'drizzle-orm/neon-http';
// const db = drizzle(neonClient);
// Batch (sends all queries in one HTTP round trip to Neon):
// const [users, orders, stats] = await db.batch([
//   db.select().from(usersTable),
//   db.select().from(ordersTable).limit(10),
//   db.select({ count: count() }).from(productsTable)
// ]);
// Neon HTTP driver: batch sends all queries in one HTTP request = one round trip.
// Great for serverless where connection latency matters.

// EXAMPLE 7: Migration comparison

// Drizzle migration file (generated by drizzle-kit):
// File: 0003_add_tenant_id_to_orders.sql
/*
ALTER TABLE "orders" ADD COLUMN "tenant_id" bigint;
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_orders_tenant" ON "orders" ("tenant_id");
*/

// Prisma migration file (generated by prisma migrate dev):
// File: 20240115143022_add_tenant_id_to_orders/migration.sql
/*
ALTER TABLE "orders" ADD COLUMN "tenant_id" BIGINT;
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");
*/
// Both are readable SQL. Both stored in version control. Both applied via CLI.
// Drizzle: separate generate (review SQL) then migrate (apply). Prisma: combined by default.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ORM CHOICE MISUNDERSTANDING:
------------------------------------------------------

BUG 1: Prisma generating N+1 for nested include on deeply nested model
  Scenario: Dashboard loading "company with departments, each department with employees and their skills."
    prisma.company.findMany({ include: { departments: { include: { employees: { include: { skills: true }}}}}})
    Prisma generated: 1 + N_departments + N_employees queries for skills.
    100 departments × 50 employees = 5,001 queries. Dashboard timeout.
  Root cause: Prisma's include strategy for deep nesting can devolve into multiple batched queries.
    At this depth (4 levels): query count multiplies.
  Fix:
    Option 1: Flatten with multiple explicit queries + manual merge (batch approach).
    Option 2: Use Prisma \$queryRaw with a hand-written JOIN query.
    Option 3: Add pagination at each level (don't load all 50 employees per department).
    Option 4: Switch to Drizzle for this query — use explicit multi-level JOIN with typed columns.

BUG 2: Forgetting prisma generate after schema change — production using old types
  Scenario: Added a new required field 'category' to products model in schema.prisma.
    Developer ran prisma migrate dev (migration ran — category column added to DB).
    Forgot to run prisma generate (PrismaClient not regenerated).
    TypeScript: compiled fine (old generated types: category field doesn't exist).
    Runtime: Prisma created products without category — database rejected with NOT NULL violation.
    CI/CD didn't catch it because generate wasn't in the pipeline.
  Fix:
    Add to package.json: "postinstall": "prisma generate"
    Add to CI: prisma generate && tsc --noEmit (generates fresh types, then type-checks)
    Drizzle: this bug doesn't exist (no generation step).

BUG 3: Using Drizzle for a query that Prisma's nested writes would have handled atomically
  Scenario: User creation with initial settings and profile in Drizzle — three tables.
    Developer wrote three separate db.insert() calls without a transaction.
    Profile insert failed (validation). User and settings rows already committed.
    Orphan user + settings with no profile. Application crash on first login.
  Root cause: Drizzle requires explicit transactions for multi-table writes.
    Prisma nested writes handle this atomically by default.
  Fix (Drizzle): always use db.transaction() for multi-table writes:
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({...}).returning();
      await tx.insert(userSettings).values({ userId: user.id, ...defaults });
      await tx.insert(userProfiles).values({ userId: user.id, ...profileData });
    });

BUG 4: Switching from Prisma to Drizzle mid-project — \$inferInsert breaks existing code
  Scenario: Migration from Prisma to Drizzle. Prisma had generated types:
    Prisma.UserCreateInput → all fields typed, required fields clear.
    Drizzle equivalent: typeof users.\$inferInsert → similar but nullable fields typed differently.
    Existing code passed string values for numeric columns (Prisma accepted '500' as number).
    Drizzle + pg driver: numeric columns must match expected type more strictly.
    Mass TypeScript errors. Some passed silently at compile time but failed at runtime.
  Fix: When migrating ORMs, audit ALL insert/update types carefully.
    Numeric columns: ensure passing string ('500') vs number (500) consistently.
    Date columns: ensure passing Date objects, not ISO strings, where expected.
    Write adapter functions that normalize types during the migration period.

BUG 5: Assuming raw SQL in Prisma \$queryRaw is fully typed — accessing wrong field silently
  Scenario: Prisma raw query:
    const results = await prisma.\$queryRaw\`SELECT id, name, totl_amount FROM orders\`;
    // Typo: totl_amount instead of total_amount
    TypeScript: no error (raw query returns unknown[] by default).
    Runtime: results[0].total_amount → undefined (field doesn't exist due to typo in query).
    Revenue dashboard showed ₹0 for all orders. Bug discovered by finance team 3 weeks later.
  Root cause: \$queryRaw without explicit typing returns unknown[]. No type checking of field names.
  Fix (Prisma): provide explicit type:
    const results = await prisma.\$queryRaw<Array<{ id: number; name: string; total_amount: string }>>\`...\`;
    TypeScript still won't catch the column name typo (types are manually declared, not derived from SQL).
  Fix (Drizzle): use db.select() with typed columns → compile-time validation:
    db.select({ id: orders.id, name: users.name, totalAmount: orders.totalAmount })
    Column name typo → TypeScript error at compile time.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE FEATURE FEASIBILITY:
  For each requirement, state: (a) Can Drizzle handle it natively? (b) Can Prisma handle it natively?
  (c) If not, what's the workaround? (d) Which tool would you recommend for this specific requirement?

  1. UPSERT: Insert a product, update price if SKU already exists.
  2. Window function: DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC)
  3. Nested create: Create a user AND their default wallet AND initial settings in one call.
  4. Recursive CTE: Build a full category tree from parent_id self-reference.
  5. Prepared statement: Define a query once, execute it 1000 times with different params.
  6. Soft delete with partial unique index: deleted emails can be re-registered.
  7. Migration rollback: undo the last migration if it caused issues.
  8. Full-text search with ranking: ts_rank(tsvector, tsquery) for search results.
  9. Batch insert 100K rows efficiently.
  10. Type-safe return type from a complex raw SQL query.

CHALLENGE 2 — CONVERT BETWEEN ORMS:
  Convert this Prisma query to its Drizzle equivalent:

  // PRISMA VERSION:
  const result = await prisma.order.findMany({
    where: {
      customer: { city: 'Delhi', deletedAt: null },
      status: { in: ['pending', 'confirmed'] },
      createdAt: { gte: new Date('2024-01-01') },
      items: { some: { product: { category: 'electronics' } } }
    },
    include: {
      customer: { select: { name: true, email: true } },
      items: {
        include: { product: { select: { name: true, price: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20, skip: 0,
  });

  For the Drizzle version:
  a) Write the query builder version (db.select().from()...) — note: Drizzle doesn't directly
     support "items: { some: { product: ... } }" — show how to express this condition.
  b) Write the relational API version (db.query.orders.findMany({ with: ... })) — handle the nested include.
  c) What does Prisma do with the "items: { some: ... }" condition that's elegant?
     What does Drizzle require instead? What are the tradeoffs?

CHALLENGE 3 — BUILD FROM SCRATCH (RAW SQL WINS):
  Build a complete analytics report that requires raw SQL (ORM can't express it cleanly).

  Report: "Monthly Cohort Retention Report" for a SaaS app.
  Definition: For each signup cohort (month of registration), show what % of users
  were still active (had at least one session) in each subsequent month.

  Data: users (id, created_at), user_sessions (id, user_id, created_at)

  Expected output:
  cohort_month | month_1_retention | month_2_retention | ... | month_12_retention

  Requirements:
  1. Write the complete raw SQL using CTEs and window functions / conditional aggregates
  2. Execute via db.execute(sql\`...\`) with parameters for cohort date range
  3. Define a TypeScript type for the return row
  4. Why can't Drizzle's query builder or Prisma's findMany() express this query?
     (Explain the specific SQL constructs that require raw SQL)
  5. Add a Zod schema for runtime validation of the raw SQL results
    `,
    summary: `Drizzle and Prisma are not competitors but different tools for different jobs — Drizzle for SQL-first development with full expressiveness and zero magic, Prisma for schema-first development with maximum DX and nested write ergonomics. The decision rule: if you want to see and control every SQL query, choose Drizzle; if you want the ORM to handle 90% of CRUD automatically, choose Prisma. For either tool, raw SQL (db.execute or \$queryRaw) is the always-available escape hatch when the ORM can't express what you need.`
  },

  {
    id: 10,
    title: "Trigram Search, Serverless Drivers & Production Patterns",
    tag: "FINISHING THE STACK — SEARCH, SCALE, AND REAL-WORLD PATTERNS",
    color: "#7F1D1D",
    tldr: `pg_trgm (trigram search) enables fuzzy, typo-tolerant text search using GIN indexes — without the complexity of full-text search. Serverless drivers (Neon HTTP, Supabase) replace persistent TCP connections with HTTP-based queries, solving the ephemeral-connection problem in serverless environments. Cursor-based pagination, prepared statements, and batch queries are the final production patterns that separate a demo app from a system that handles real load.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My LIKE '%search%' is slow and doesn't handle typos — how do I add real search?"
  → LIKE with leading wildcard: can't use B-tree index. Full table scan every time.
  → pg_trgm + GIN index: breaks text into 3-character trigrams and indexes them.
  → 'hello' → trigrams: '  h', ' he', 'hel', 'ell', 'llo', 'lo ' — all indexed.
  → Fuzzy search: similarity('priya', 'pryia') > 0.3 — typo tolerant!
  → Query: WHERE name % 'priya' — uses GIN index on trigrams. Fast even with leading wildcard.

"My Vercel Edge Function can't connect to PostgreSQL — connection refused"
  → Edge functions and serverless Lambdas: no persistent TCP connections allowed.
  → Traditional pg library: requires a TCP connection that stays alive.
  → Neon serverless driver: sends SQL over HTTP. No persistent connection needed.
  → Each query = one HTTP request. Works from any stateless environment.

"I have 20 database calls in one API route — can I parallelize them?"
  → Yes: Promise.all([query1, query2, ...]) runs them concurrently (parallel, different connections).
  → Or: Neon/PlanetScale HTTP batch API — sends all queries in ONE HTTP request.
  → For Drizzle: db.batch([query1, query2, ...]) with Neon HTTP driver → one round trip.
  → Caveat: parallel queries use multiple connections. Don't parallelize inside a transaction.

"How do I prevent SQL injection when building dynamic search queries?"
  → Drizzle's sql\`\` tag: always uses parameterized queries for values.
  → Dynamic column names: must be validated against allowlist before using.
  → Never: sql\`WHERE \${columnName} = \${value}\` where columnName is user input.
  → Safe: sql\`WHERE \${table.safeColumn} = \${userProvidedValue}\` — column is from schema (safe), value is parameterized.

"What's the best way to handle large INSERT batches in Drizzle?"
  → db.insert(table).values([...array]) — Drizzle batches all values in one INSERT.
  → For very large arrays (>10K rows): chunk into batches of 1000.
  → Use db.batch() with Neon HTTP for batches across multiple tables in one round trip.
    `,
    analogy: `
THE PHONE BOOK AND POSTAL SERVICE ANALOGY:
-------------------------------------------
LIKE '%search%' = READING THE ENTIRE PHONE BOOK:
  To find everyone whose name CONTAINS "sharma": read every single entry.
  No index helps with a leading wildcard. 1 million entries = 1 million reads.
  Slow. Gets slower as the phone book grows.

PG_TRGM + GIN INDEX = THE CROSS-REFERENCE INDEX:
  Before publishing, every 3-character sequence from every name is indexed:
  "Priya Sharma" → trigrams: ['Pri', 'riy', 'iya', ' Sh', 'Sha', 'har', 'arm', 'rma']
  GIN index: lookup any trigram instantly.
  
  Search for "Sharma": find all entries containing the trigrams of "Sharma".
  Even with leading wildcard: GIN index handles it (trigrams cover all positions).
  Fuzzy match: "Sharme" → most trigrams match "Sharma" → similarity score high → found!
  
  similarity('Sharma', 'Sharma') = 1.0 — exact match
  similarity('Sharma', 'Sharme') = 0.7 — typo, still high similarity
  similarity('Sharma', 'Smith') = 0.1 — very different

SERVERLESS DRIVER = POSTAL MAIL vs PHONE CALL:
  Traditional TCP connection = phone call:
    Must establish a live connection (dial, wait for answer).
    Call stays open for the conversation. Stateful.
    Serverless: can't hold a phone call open. Function dies after execution. Call drops.
  
  Neon HTTP driver = postal mail:
    Write your query (letter). Send it (HTTP POST). Receive response (reply letter).
    No continuous connection. Send from anywhere. Function can die immediately after sending.
    Perfect for stateless environments (Lambda, Vercel Edge, Cloudflare Workers).
    
    Tradeoff: postal mail has higher per-message latency than a phone call.
    But: with batch queries, send multiple letters in one envelope. Round-trip paid once.

BATCH QUERIES = MULTIPLE ITEMS IN ONE ENVELOPE:
  Without batching: 5 queries = 5 HTTP round trips = 5 × 50ms = 250ms.
  With Neon batch: 5 queries = 1 HTTP round trip = 1 × 50ms + processing = ~80ms.
  
  db.batch([q1, q2, q3, q4, q5]) → Neon receives all 5 queries, executes them all,
  returns all results in one response. One envelope, five letters inside.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — TRIGRAM SEARCH, SERVERLESS DRIVERS, BATCH QUERIES:
------------------------------------------------------------------------------

PG_TRGM INTERNALS:
  Setup: CREATE EXTENSION pg_trgm;
  
  How trigrams work:
    Text is padded with two spaces before first char and one after last: '  hello '
    Trigrams: every consecutive 3-char sequence: '  h', ' he', 'hel', 'ell', 'llo', 'lo '
    Short text: trigram count = length + 2 (padded).
  
  Functions and operators:
    show_trgm('hello') → array of trigrams (debugging)
    similarity(a, b) → float 0-1, ratio of shared trigrams to total unique trigrams
    word_similarity(word, text) → max similarity of word to any word in text
    strict_word_similarity(word, text) → strict version
    
    % operator: a % b → true if similarity(a,b) > pg_trgm.similarity_threshold (default 0.3)
    <% operator: word <% text → word_similarity
    <<% : strict_word_similarity
    
    ILIKE and LIKE: pg_trgm enables GIN/GIST indexes for these operators too!
    ILIKE '%search%' → with GIN index → fast even with leading wildcard.
  
  Index types:
    GIN: faster for static data. Better for LIKE/ILIKE. Larger index.
    GIST: faster for writes (lower update cost). Better for similarity % operator.
    
    CREATE INDEX ON users USING GIN (name gin_trgm_ops);
    CREATE INDEX ON users USING GIN (name gin_trgm_ops, email gin_trgm_ops); -- Multi-column GIN
    CREATE INDEX ON users USING GIST (name gist_trgm_ops); -- For % operator + ORDER BY similarity
  
  Performance tuning:
    SET pg_trgm.similarity_threshold = 0.3; -- Lower = more fuzzy, more results
    SET pg_trgm.word_similarity_threshold = 0.6; -- For word_similarity
    For sorted-by-relevance results: use GIST + ORDER BY name <-> 'search' (distance operator)

NEON SERVERLESS DRIVER:
  How it works:
    Traditional pg library: TCP connection pool. Long-lived connection.
    Neon serverless: each query = HTTP POST to Neon's HTTP proxy.
    Proxy: receives HTTP, establishes connection to PostgreSQL, executes query, returns HTTP response.
    
  Drizzle + Neon:
    // import { neon } from '@neondatabase/serverless';
    // import { drizzle } from 'drizzle-orm/neon-http';
    // const sql = neon(process.env.DATABASE_URL!);
    // const db = drizzle(sql, { schema });
    
  Batch API:
    db.batch([...]) — sends all queries in one HTTP request. Atomic (all or nothing within batch? No — just bundled).
    Note: db.batch() is NOT a transaction. Queries run independently.
    For transactional batch: use db.transaction() (uses WebSocket connection, not HTTP).
  
  WebSocket driver (for transactions in Neon):
    // import { Pool } from '@neondatabase/serverless';
    // const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // const db = drizzle(pool); // Uses WebSocket — supports transactions
    
  Neon latency considerations:
    First query "cold start": ~200ms (establishes connection to Neon).
    Subsequent queries: ~5-20ms overhead (HTTP vs TCP: ~0.5ms).
    Batch all queries for an endpoint: amortize the round-trip cost.

SUPABASE CONNECTION:
  Supabase has TWO connection modes:
  
  Direct (port 5432): standard PostgreSQL TCP. Use for migrations, admin, long transactions.
    // import { drizzle } from 'drizzle-orm/node-postgres';
    // import { Pool } from 'pg';
    // const pool = new Pool({ connectionString: DIRECT_DATABASE_URL });
    // const db = drizzle(pool);
  
  Pooler via Supavisor (port 6543): transaction pooling. Use for application queries.
    Same Drizzle API. Different connection string (port 6543).
    Handles thousands of concurrent connections via 20-50 real PostgreSQL connections.
  
  With RLS and auth:
    Supabase client: automatically includes auth headers.
    Drizzle with Supabase: must manually set auth context via SET LOCAL.

PREPARED STATEMENTS DEEP DIVE:
  db.select().from(users).where(eq(users.id, sql.placeholder('id'))).prepare('getUserById')
  
  What PostgreSQL does:
    PREPARE getUserById (bigint) AS SELECT ... FROM users WHERE id = $1
    → Query plan cached. Not re-parsed, not re-planned for each execution.
  
  Benefits:
    1. Performance: skip parse + plan for every call (saves 0.5-5ms per query in warm cases).
    2. Security: parameters always separated from SQL. Can't inject via parameters.
    3. Less network: protocol-level prepared statements send only parameter values, not full SQL.
  
  When to use:
    Queries called hundreds of times per second (login, session lookup, product fetch).
    Queries with stable structure but varying parameters.
  
  When NOT to use:
    Queries where the plan varies significantly by parameter value (skewed data distribution).
    Queries that are rarely called.
    Queries with dynamic columns or tables (can't be prepared).

BATCH INSERT PATTERNS:
  Pattern 1 — Single bulk INSERT (Drizzle default):
    db.insert(products).values([{...}, {...}, ...1000items])
    → Single SQL: INSERT INTO products (cols) VALUES (...), (...), ... (1000 VALUE tuples)
    → Fastest for same-table inserts. One round trip.
  
  Pattern 2 — Chunked bulk insert (for very large arrays):
    for (const chunk of chunks(items, 1000)) {
      await db.insert(products).values(chunk);
    }
    → Avoids single huge SQL statement. PostgreSQL query parser has limits (~65K bind params).
  
  Pattern 3 — COPY (fastest, requires raw SQL or pg stream):
    Not available through Drizzle API. Must use pg client directly with COPY stream.
    For 1M+ rows: COPY is 10-100× faster than INSERT.
  
  Pattern 4 — db.batch() (Neon HTTP — multiple different queries in one round trip):
    const [users, products, stats] = await db.batch([
      db.select().from(usersTable).limit(10),
      db.select().from(productsTable).where(eq(products.isActive, true)),
      db.select({ count: count() }).from(ordersTable)
    ]);
    → All three queries sent in one HTTP request. Returns typed results for each.
    `,
    code: `
// ===== TRIGRAM SEARCH, SERVERLESS DRIVERS & PRODUCTION PATTERNS — EXAMPLES =====

// EXAMPLE 1: pg_trgm setup and fuzzy search

async function setupTrigrams() {
  await db.execute(sql\`CREATE EXTENSION IF NOT EXISTS pg_trgm\`);

  // Create GIN index for fast ILIKE and similarity queries:
  await db.execute(sql\`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_trgm
    ON users USING GIN (name gin_trgm_ops)
  \`);
  await db.execute(sql\`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
    ON products USING GIN (name gin_trgm_ops)
  \`);
}

// Fuzzy search with similarity score — typo tolerant:
async function fuzzySearchUsers(searchQuery, limit = 20) {
  // similarity() > threshold: finds "priya" even if user typed "pryia"
  return db.execute(sql\`
    SELECT
      id, name, email,
      similarity(name, \${searchQuery}) AS score
    FROM users
    WHERE
      name % \${searchQuery}           -- Uses GIN index via trigram similarity
      AND deleted_at IS NULL
    ORDER BY score DESC
    LIMIT \${limit}
  \`);
}

// Fast ILIKE with GIN index (leading wildcard no longer a problem):
async function searchByName(searchQuery) {
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email
  })
  .from(users)
  .where(and(
    sql\`\${users.name} ILIKE \${'%' + searchQuery + '%'}\`, // GIN index used!
    isNull(users.deletedAt)
  ))
  .limit(20);
}

// Combined: ILIKE + similarity for ranking:
async function smartSearch(query) {
  return db.execute(sql\`
    SELECT
      id, name, email, city,
      CASE
        WHEN name ILIKE \${query + '%'} THEN 3.0        -- Exact prefix: highest rank
        WHEN name ILIKE \${'%' + query + '%'} THEN 2.0  -- Contains: medium rank
        ELSE similarity(name, \${query})                 -- Fuzzy: base rank
      END AS relevance_score
    FROM users
    WHERE
      (name ILIKE \${'%' + query + '%'} OR name % \${query})
      AND deleted_at IS NULL
    ORDER BY relevance_score DESC, name
    LIMIT 20
  \`);
}

// EXAMPLE 2: Neon serverless driver setup

// For serverless environments (Vercel Edge, Cloudflare Workers):
// import { neon } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-http';
// import * as schema from './schema';

// HTTP driver (stateless — for most serverless queries):
// const sql = neon(process.env.DATABASE_URL);
// const db = drizzle(sql, { schema });

// For transactions in serverless (uses WebSocket):
// import { Pool } from '@neondatabase/serverless';
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const db = drizzle(pool, { schema });

// Regular queries work identically to non-serverless Drizzle:
// const users = await db.select().from(usersTable).limit(10);

// EXAMPLE 3: Neon batch queries — multiple queries in one HTTP round trip

async function getPageData(userId, tenantId) {
  // Without batching: 4 separate HTTP round trips to Neon
  // const user = await db.select().from(users).where(eq(users.id, userId));
  // const orders = await db.select().from(orders).where(eq(orders.customerId, userId)).limit(5);
  // const stats = await db.select({ count: count() }).from(orders)...;
  // const notifications = await db.select().from(notifications).where(...)...;

  // WITH batching: 1 HTTP round trip for all 4 queries:
  // const [userResult, ordersResult, statsResult, notifResult] = await db.batch([
  //   db.select({ id: users.id, name: users.name, email: users.email })
  //     .from(users).where(eq(users.id, userId)),
  //
  //   db.select({ id: orders.id, amount: orders.amount, status: orders.status, createdAt: orders.createdAt })
  //     .from(orders).where(eq(orders.customerId, userId))
  //     .orderBy(desc(orders.createdAt)).limit(5),
  //
  //   db.select({ total: count() }).from(orders).where(eq(orders.customerId, userId)),
  //
  //   db.select({ id: notifications.id, message: notifications.message })
  //     .from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
  //     .limit(10)
  // ]);

  // return {
  //   user: userResult[0],
  //   recentOrders: ordersResult,
  //   totalOrders: statsResult[0].total,
  //   unreadNotifications: notifResult
  // };
  // All typed — TypeScript infers correct types for each query result.
  return {}; // Placeholder since we can't import neon in string content
}

// EXAMPLE 4: Prepared statements for hot paths

// Define once at module level (not inside request handler):
// const getUserByEmail = db.select()
//   .from(users)
//   .where(and(eq(users.email, sql.placeholder('email')), isNull(users.deletedAt)))
//   .limit(1)
//   .prepare('get_user_by_email');

// const getOrderById = db.select()
//   .from(orders)
//   .where(and(eq(orders.id, sql.placeholder('id')), eq(orders.tenantId, sql.placeholder('tenantId'))))
//   .prepare('get_order_by_id');

// Execute many times — plan cached after first call:
// const user = await getUserByEmail.execute({ email: 'priya@example.com' });
// const order = await getOrderById.execute({ id: 42, tenantId: 1 });

// For auth middleware — called on EVERY request. Prepared statement saves ~2ms per request.
// At 1000 req/s: saves 2 seconds of query planning overhead per second. Real savings!

// EXAMPLE 5: Chunked bulk insert for large datasets

async function bulkInsertProducts(products) {
  const CHUNK_SIZE = 1000;
  let inserted = 0;

  // Chunk to avoid hitting PostgreSQL's bind parameter limit (~65535):
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);

    await db.insert(productsTable).values(
      chunk.map(p => ({
        sku: p.sku,
        name: p.name,
        price: p.price.toString(),
        stock: p.stock,
        categoryId: p.categoryId
      }))
    ).onConflictDoUpdate({
      target: productsTable.sku,
      set: {
        name: sql\`excluded.name\`,
        price: sql\`excluded.price\`,
        stock: sql\`excluded.stock\`
      }
    });

    inserted += chunk.length;
    console.log(\`Inserted \${inserted}/\${products.length} products...\`);
  }

  return inserted;
}

// EXAMPLE 6: Complete cursor pagination with trigram search

async function searchProducts(searchQuery, cursor, limit = 20) {
  const conditions = [eq(productsTable.isActive, true)];

  if (searchQuery) {
    // Trigram similarity OR exact ILIKE match:
    conditions.push(sql\`(
      \${productsTable.name} ILIKE \${'%' + searchQuery + '%'}
      OR \${productsTable.name} % \${searchQuery}
    )\`);
  }

  // Cursor condition — compound cursor for stable ordering:
  if (cursor) {
    const { id, score } = JSON.parse(Buffer.from(cursor, 'base64').toString());
    conditions.push(
      or(
        lt(sql\`similarity(\${productsTable.name}, \${searchQuery || ''})\`, score),
        and(
          sql\`similarity(\${productsTable.name}, \${searchQuery || ''}) = \${score}\`,
          lt(productsTable.id, id)
        )
      )
    );
  }

  const rows = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    price: productsTable.price,
    stock: productsTable.stock,
    score: searchQuery
      ? sql\`similarity(\${productsTable.name}, \${searchQuery})\`.mapWith(Number)
      : sql\`1.0\`.mapWith(Number)
  })
  .from(productsTable)
  .where(and(...conditions))
  .orderBy(
    desc(searchQuery ? sql\`similarity(\${productsTable.name}, \${searchQuery})\` : productsTable.id),
    desc(productsTable.id)
  )
  .limit(limit);

  const nextCursor = rows.length === limit
    ? Buffer.from(JSON.stringify({ id: rows.at(-1).id, score: rows.at(-1).score })).toString('base64')
    : null;

  return { results: rows, nextCursor };
}

// EXAMPLE 7: Supabase connection with connection pooler

// Production Supabase setup — application uses pooler, migrations use direct:
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';
//
// Application queries (through Supavisor pooler, port 6543):
// const appPool = new Pool({
//   connectionString: process.env.DATABASE_POOLER_URL, // port 6543
//   max: 5,            // Per-instance pool size (Supavisor handles actual PG connections)
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 5000,
// });
// const db = drizzle(appPool, { schema });
//
// Migrations (direct connection, port 5432):
// const migrationPool = new Pool({ connectionString: process.env.DATABASE_DIRECT_URL });
// const migrationDb = drizzle(migrationPool);
// await migrate(migrationDb, { migrationsFolder: './drizzle' });
// await migrationPool.end();
    `,
    bugs: `
REAL PRODUCTION BUGS FROM SEARCH, DRIVERS, AND BATCH PATTERNS:
--------------------------------------------------------------

BUG 1: pg_trgm extension missing — similarity() function not found
  Scenario: Developer added trigram search to the query:
    WHERE name % \${searchQuery}
    Local dev: worked (pg_trgm installed locally).
    Production: ERROR: operator does not exist: text % unknown
    Staging environment skipped. Production database missing the extension.
  Root cause: pg_trgm is a PostgreSQL extension. Must be explicitly installed per-database.
    Local dev DB had it. Production didn't.
  Fix:
    Add to initial migration:
    await db.execute(sql\`CREATE EXTENSION IF NOT EXISTS pg_trgm\`);
    Or: add to the very first migration SQL file:
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    Always: verify extension availability in CI against a production-like database.

BUG 2: GIN trigram index not used — query falls back to sequential scan
  Scenario: Added GIN index on name column for trigram search. Queries still slow (full scan).
    EXPLAIN showed: Seq Scan on users. Index never used.
    Check: query used name LIKE \`\${query}%\` (starts-with LIKE, NOT %query%).
    Problem: starts-with LIKE (\`priya%\`) can use a B-tree index (prefix scan). Doesn't NEED GIN.
    But: the query also had a LOWER() call: LOWER(name) LIKE LOWER(\`\${query}%\`).
    LOWER() prevents the B-tree index. And the GIN index was on name, not LOWER(name).
    Result: no index used. Full scan.
  Fix:
    CREATE INDEX ON users USING GIN (LOWER(name) gin_trgm_ops);
    -- OR: use ILIKE directly (PostgreSQL's ILIKE with GIN trigram index works without LOWER):
    WHERE name ILIKE \${'%' + query + '%'}  -- GIN index used automatically with pg_trgm

BUG 3: Neon serverless db.batch() used for transactions — data inconsistency
  Scenario: Checkout function used db.batch() for "efficiency":
    await db.batch([
      db.update(inventory).set({ reserved: sql\`reserved + 1\` }).where(...),
      db.insert(orders).values({...}),
      db.insert(payments).values({...})
    ]);
    Appeared to work. Under failure conditions: second query failed.
    First query (inventory update) committed. Second (order) failed. Third never ran.
    Inventory reserved but no order created. Reservation leaked.
  Root cause: db.batch() is NOT a transaction. Each query is independent.
    If query 2 fails: query 1 is already committed.
  Fix: Use db.transaction() for operations that must be atomic:
    await db.transaction(async (tx) => {
      await tx.update(inventory).set({ reserved: sql\`reserved + 1\` }).where(...);
      await tx.insert(orders).values({...});
      await tx.insert(payments).values({...});
    });
    db.batch() is for read-only parallel queries or truly independent writes.

BUG 4: Prepared statement parameter mismatch — wrong results silently
  Scenario: Prepared statement for order lookup:
    const getOrder = db.select().from(orders)
      .where(eq(orders.id, sql.placeholder('orderId')))
      .prepare('get_order');
    
    Developer added a second call but mistakenly used wrong placeholder name:
    const result = await getOrder.execute({ order_id: 42 }); // 'order_id' not 'orderId'!
    
    Drizzle used undefined for the placeholder. PostgreSQL received: WHERE id = NULL.
    Result: empty array (no rows match WHERE id = NULL). No error thrown!
    Application showed "Order not found" for every valid order ID for 2 days before detected.
  Fix:
    Type the placeholder execute object:
    // type GetOrderParams = { orderId: number };
    // const result = await getOrder.execute({ orderId: 42 }); // TypeScript: 'order_id' not valid
    Drizzle's prepared statement execute function IS typed based on placeholder names.
    If TypeScript complains: you have a typo. If you used 'as any': you bypassed safety.

BUG 5: Bulk insert exceeding PostgreSQL bind parameter limit
  Scenario: Importing a CSV with 5,000 products. Single bulk insert:
    await db.insert(products).values(allProductsArray); // 5,000 items × 8 columns = 40,000 bind params
    ERROR: too many bind parameters. PostgreSQL limit: 65,535.
    With 10 columns per row: limit is 6,553 rows per INSERT statement.
    Developer had 10-column products. At 7,000 rows: crash.
  Root cause: PostgreSQL bind parameter limit is 65,535 total per query.
    N_rows × N_columns must be < 65,535.
    5,000 rows × 10 columns = 50,000 — below limit. But with wider tables: easily exceeded.
  Fix: Always chunk bulk inserts:
    const SAFE_CHUNK = Math.floor(65000 / NUM_COLUMNS); // e.g., 65000/10 = 6500
    for (let i = 0; i < items.length; i += SAFE_CHUNK) {
      await db.insert(products).values(items.slice(i, i + SAFE_CHUNK));
    }
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE SEARCH BEHAVIOR:
  pg_trgm installed. GIN index on users.name using gin_trgm_ops.
  Users in database: 'Priya Sharma', 'Rahul Sharma', 'Priyanka Singh', 'Rajesh Kumar'

  For each search query, predict which users are returned (and why):
  a) WHERE name ILIKE '%Sharma%'
     → Which users? Does the GIN index help? Why?

  b) WHERE name % 'Sharme'   (% operator, default threshold 0.3)
     → Which users? What is similarity('Sharma', 'Sharme') approximately?

  c) WHERE name % 'Priy'
     → Which users? Why might 'Priyanka Singh' not match despite starting with 'Priy'?
     (Hint: trigram count for short query vs long text)

  d) WHERE similarity(name, 'Kumar') > 0.5 ORDER BY similarity(name, 'Kumar') DESC
     → Which users? In what order?

  e) If you had 1 million users and no GIN index, how many rows does (a) scan?
     With GIN index, approximately how many trigrams does it look up? Which is faster?

CHALLENGE 2 — FIX THE SEARCH AND BATCH BUGS:
  This search-and-import endpoint has 3 bugs. Find and fix each.

  // Bug 1: Search without index-usable condition
  async function searchProducts(query: string) {
    return db.execute(sql\`
      SELECT id, name, price FROM products
      WHERE LOWER(name) LIKE LOWER(\${query + '%'})
    \`);
  }

  // Bug 2: Batch used as transaction
  async function processCheckout(userId: number, items: any[]) {
    const results = await db.batch([
      db.update(inventory).set({ reserved: sql\`reserved + 1\` })
        .where(inArray(inventory.productId, items.map(i => i.id))),
      db.insert(orders).values({ customerId: userId, amount: '5000' }),
    ]);
    return results;
  }

  // Bug 3: Bulk insert without chunking
  async function importInventory(records: any[]) {
    // records.length could be 100,000
    await db.insert(inventory).values(records); // No chunking!
  }

  Write the fixed version of each function.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a production-ready product search API for an e-commerce platform.

  Features required:
  1. Fuzzy search: typo-tolerant search on product name and brand
     (e.g., "Samsumg" matches "Samsung")
  2. Filter: category, priceMin, priceMax, inStock (boolean), rating (>= threshold)
  3. Sort: by relevance (similarity score), price asc/desc, rating desc, newest
  4. Cursor-based pagination (not offset) with relevance-aware cursor
  5. Auto-complete: fast prefix suggestions (e.g., "Sams" → ['Samsung Galaxy S24', ...])
  6. Recent searches: store per-user recent searches (last 10) in a searches table

  Implement:
  a) Schema: products table with indexes needed for all operations above
     (which index for ILIKE? which for similarity? which for sort/filter combos?)
  b) searchProducts(query, filters, cursor, limit) function using Drizzle + sql\`\`
  c) getAutoComplete(prefix, limit=5) function — uses different index than fuzzy search
  d) saveRecentSearch(userId, query) + getRecentSearches(userId) functions
  e) A performance analysis:
     - How many rows does each query scan with your indexes?
     - What's the index type for each operation (B-tree vs GIN vs GIST)?
     - At 10M products, what's the expected query time for each operation?
    `,
    summary: `pg_trgm trigram search, serverless HTTP drivers, and production patterns like batch queries and prepared statements are the capstone skills that make the difference between a Drizzle app that works in development and one that performs under real production load. The three non-negotiable habits: always install pg_trgm extensions in migrations (not manually), use db.transaction() for atomic multi-step writes (never db.batch()), and chunk large bulk inserts to stay below PostgreSQL's 65,535 bind parameter limit.`
  }
];

const concepts = [
  {
    id: 5,
    title: "Window Functions",
    tag: "ANALYTICS WITHOUT LOSING YOUR ROWS",
    color: "#0F766E",
    tldr: `Window functions perform calculations across a set of rows related to the current row — without collapsing those rows into a group like GROUP BY does. Every row keeps its identity while gaining a new computed column derived from its "window" of neighbors. They are the foundation of every serious analytics query: rankings, running totals, moving averages, period-over-period comparisons, and cohort analysis.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I need a rank within each department BUT I also need all the original row columns"
  → GROUP BY collapses rows — you lose individual row data.
  → Window functions compute rank PER ROW without collapsing. Every row stays. Every column kept.
  → RANK() OVER (PARTITION BY dept ORDER BY salary DESC) gives rank per department per employee.

"What's the difference between RANK(), DENSE_RANK(), and ROW_NUMBER()?"
  → ROW_NUMBER(): always unique. Tied rows get different arbitrary numbers. 1, 2, 3, 4.
  → RANK(): tied rows get SAME rank. Leaves a gap after ties. 1, 1, 3, 4 (no 2).
  → DENSE_RANK(): tied rows get SAME rank. NO gap. 1, 1, 2, 3.
  → Use ROW_NUMBER() for pagination (must be unique). RANK()/DENSE_RANK() for competition rankings.

"How do I calculate month-over-month growth without a self-join?"
  → LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month) gives previous month's revenue.
  → Growth = (current - LAG) / LAG × 100. Single scan. No self-join needed.

"My running total query is wrong after PARTITION BY"
  → PARTITION BY resets the window per group. SUM() OVER (PARTITION BY customer_id ORDER BY date)
    gives running total PER CUSTOMER, resetting to 0 for each new customer.
  → If you want global running total: SUM() OVER (ORDER BY date) — no PARTITION BY.

"ROWS BETWEEN vs RANGE BETWEEN — what's the difference?"
  → ROWS BETWEEN: physical rows (exact count). ROWS BETWEEN 6 PRECEDING AND CURRENT ROW = last 7 rows.
  → RANGE BETWEEN: logical range based on values. RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
    = all rows within 6 days of current row's date value (handles gaps in dates correctly).
    `,
    analogy: `
THE SPORTS LEADERBOARD ANALOGY:
---------------------------------
You're running a cricket tournament with 50 players. Each player has: name, team, runs scored.

GROUP BY (what you already know):
  GROUP BY team → COLLAPSES to 5 team rows. Individual player data GONE.
  You get: team name, total team runs. That's it.

WINDOW FUNCTION (what you need):
  You still want ALL 50 rows (one per player).
  BUT each row now has EXTRA COMPUTED COLUMNS: their rank within the tournament, their rank within their team.
  No rows collapsed. No data lost. Just new columns added.

ROW_NUMBER vs RANK vs DENSE_RANK — The Cricket Tie-Breaker:
  Arjun: 95 runs. Priya: 95 runs. Rohan: 82 runs.
  
  ROW_NUMBER:   Arjun=1, Priya=2, Rohan=3  (arbitrary tiebreak — strictly unique)
  RANK:         Arjun=1, Priya=1, Rohan=3  (tie = same rank, gap after: no rank 2)
  DENSE_RANK:   Arjun=1, Priya=1, Rohan=2  (tie = same rank, no gap)
  
  Scoreboard in cricket tournament: DENSE_RANK (Rohan is genuinely "2nd best", not "3rd")
  Pagination (show page 2 = rows 11-20): ROW_NUMBER (must be unique, no gaps)

LAG/LEAD = COMPARING TO YOUR NEIGHBOR IN THE STANDINGS:
  LAG(runs, 1): "How many runs did the player above me score?"
  LEAD(runs, 1): "How many runs will the player below me score?"
  
  Month-over-month revenue: LAG(revenue, 1) OVER (ORDER BY month)
  "Previous month's revenue" — compare without joining the table to itself.

PARTITION BY = SEPARATE SCOREBOARDS PER TEAM:
  RANK() OVER (ORDER BY runs DESC) → global rank across all 50 players.
  RANK() OVER (PARTITION BY team ORDER BY runs DESC) → rank within each team (5 separate rankings, reset per team).
  PARTITION BY is like saying: "run this window function INDEPENDENTLY for each group."

ROWS BETWEEN = SLIDING WINDOW ON A SCOREBOARD:
  "7-match rolling average for each player" = last 7 matches, average score.
  Window slides: match 7 includes matches 1-7. Match 8 includes matches 2-8. Oldest falls off.
  SUM() OVER (PARTITION BY player ORDER BY match_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) / 7
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — WINDOW FUNCTION INTERNALS:
------------------------------------------------------

THE OVER() CLAUSE:
  Syntax: function_name(args) OVER (window_definition)
  window_definition = [PARTITION BY expr] [ORDER BY expr] [frame_clause]
  
  Execution order (critical to understand):
    1. FROM + JOIN — assemble base rows
    2. WHERE — filter rows
    3. GROUP BY + aggregate functions — collapse rows (if any)
    4. HAVING — filter groups
    5. Window functions — computed HERE on the result set after steps 1-4
    6. SELECT — project columns
    7. ORDER BY (outside OVER) — sort final result
    8. LIMIT/OFFSET
  
  Window functions run AFTER WHERE and GROUP BY but BEFORE final ORDER BY.
  This means: you CAN'T filter on window function results in WHERE. Use a CTE or subquery.
  WRONG: SELECT * FROM t WHERE ROW_NUMBER() OVER (...) <= 3; -- ERROR
  RIGHT: SELECT * FROM (SELECT *, ROW_NUMBER() OVER (...) AS rn FROM t) sub WHERE rn <= 3;

WINDOW FRAME CLAUSE:
  Default frame (when ORDER BY present): RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  Default frame (when no ORDER BY): ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING (entire partition)
  
  Frame units:
    ROWS: physical row count. Fast, predictable.
    RANGE: value-based range. Handles equal values in ORDER BY as a group.
    GROUPS: PostgreSQL 11+. Count of distinct ORDER BY value groups.
  
  Frame boundaries:
    UNBOUNDED PRECEDING: start of partition
    n PRECEDING: n rows/range before current
    CURRENT ROW: the current row (or group for RANGE mode)
    n FOLLOWING: n rows/range after current
    UNBOUNDED FOLLOWING: end of partition
  
  Examples:
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- Running total (cumulative)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW          -- 7-row rolling window
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING          -- Centered moving average (7-row)
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING  -- Reverse running total (remaining)
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING -- Entire partition (useful for %)

RANK FUNCTIONS — EXACT BEHAVIOR:
  ROW_NUMBER(): assigns unique sequential integers. No duplicates. No gaps.
    Tie-breaking is arbitrary (undefined order between equal rows).
    Use for: pagination, top-N-per-group (where uniqueness required).
  
  RANK(): assigns same rank to ties. Leaves gaps (rank 1, 1, 3 — no rank 2).
    The gap = number of rows that tied.
    Use for: competition rankings where ties mean "both are 1st, next is 3rd."
  
  DENSE_RANK(): assigns same rank to ties. NO gaps (rank 1, 1, 2).
    Use for: bucket numbering, grade tiers, any rank where gaps are confusing.
  
  NTILE(n): divides partition into n roughly equal buckets.
    Assigns bucket number 1 to n. Useful for quartiles, deciles, percentiles.
    NTILE(4) → quartile. NTILE(10) → decile. NTILE(100) → percentile.
    Not always exactly equal: if rows not divisible by n, earlier buckets get one extra row.

LAG / LEAD:
  LAG(column, offset, default) OVER (...)
    column: value to retrieve
    offset: how many rows back (default 1)
    default: value if no previous row exists (default NULL)
  
  LEAD(column, offset, default) OVER (...)
    Same but looks forward.
  
  Common use cases:
    Month-over-month: current - LAG(revenue) / LAG(revenue) * 100
    Day-over-day: LAG(value, 1) OVER (PARTITION BY user_id ORDER BY date)
    Find previous status: LAG(status) OVER (PARTITION BY order_id ORDER BY changed_at)
    Gap detection: date - LAG(date) OVER (ORDER BY date) > INTERVAL '1 day' → gap exists

FIRST_VALUE / LAST_VALUE / NTH_VALUE:
  FIRST_VALUE(col) OVER (...): value from the first row of the window frame.
  LAST_VALUE(col) OVER (...): value from the last row of the window frame.
    CRITICAL: LAST_VALUE default frame is CURRENT ROW (not end of partition)!
    To get true last value: LAST_VALUE(col) OVER (...ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
  NTH_VALUE(col, n): value from the nth row of the window frame.

PERFORMANCE CONSIDERATIONS:
  Window functions require sorting the input (if ORDER BY specified in OVER).
  Each DISTINCT window spec requires a separate sort pass.
  Multiple windows with same ORDER BY: PostgreSQL may optimize to single sort.
  
  Optimization: define named windows to reuse:
    SELECT ..., RANK() OVER w, LAG(val) OVER w
    FROM t
    WINDOW w AS (PARTITION BY dept ORDER BY salary DESC);
  
  Large partitions: window sort can spill to disk if > work_mem.
  For very large datasets: consider materializing intermediate results.
    `,
    code: `
-- ===== WINDOW FUNCTIONS — SQL EXAMPLES =====

-- Setup: sales data for a SaaS company (monthly revenue per product)
CREATE TABLE monthly_revenue (
  product     TEXT,
  month       DATE,          -- First day of month
  revenue     NUMERIC(12,2),
  customers   INT
);

INSERT INTO monthly_revenue VALUES
  ('Basic',    '2024-01-01', 150000, 300),
  ('Basic',    '2024-02-01', 162000, 324),
  ('Basic',    '2024-03-01', 158000, 316),
  ('Pro',      '2024-01-01', 480000, 160),
  ('Pro',      '2024-02-01', 520000, 173),
  ('Pro',      '2024-03-01', 495000, 165),
  ('Enterprise','2024-01-01',1200000, 40),
  ('Enterprise','2024-02-01',1350000, 45),
  ('Enterprise','2024-03-01',1280000, 43);

-- EXAMPLE 1: ROW_NUMBER vs RANK vs DENSE_RANK
-- Scenario: Rank salesperson performance — ties handled differently

CREATE TABLE sales_reps (
  name       TEXT,
  region     TEXT,
  deals_won  INT,
  revenue    NUMERIC(10,2)
);
INSERT INTO sales_reps VALUES
  ('Arjun Sharma',  'North', 42, 2100000),
  ('Priya Mehta',   'North', 38, 1950000),
  ('Rohan Patel',   'South', 42, 2100000),  -- Tied with Arjun!
  ('Ananya Singh',  'South', 35, 1750000),
  ('Kiran Rao',     'West',  29, 1450000),
  ('Meera Nair',    'West',  42, 2100000);  -- Third with same deals_won

SELECT
  name,
  region,
  deals_won,
  ROW_NUMBER() OVER (ORDER BY deals_won DESC, revenue DESC) AS row_num,
  RANK()       OVER (ORDER BY deals_won DESC)               AS rank,
  DENSE_RANK() OVER (ORDER BY deals_won DESC)               AS dense_rank
FROM sales_reps
ORDER BY deals_won DESC, name;

-- Result:
-- Arjun  42  1  1  1
-- Meera  42  2  1  1
-- Rohan  42  3  1  1
-- Priya  38  4  4  2  ← RANK skips 2,3; DENSE_RANK doesn't
-- Ananya 35  5  5  3
-- Kiran  29  6  6  4

-- EXAMPLE 2: PARTITION BY — rank within each region independently
SELECT
  name,
  region,
  deals_won,
  RANK() OVER (PARTITION BY region ORDER BY deals_won DESC) AS regional_rank,
  RANK() OVER (ORDER BY deals_won DESC)                     AS global_rank
FROM sales_reps
ORDER BY region, regional_rank;

-- EXAMPLE 3: LAG / LEAD — month-over-month revenue growth
SELECT
  product,
  month,
  revenue,
  LAG(revenue, 1, 0) OVER (PARTITION BY product ORDER BY month) AS prev_month_revenue,
  revenue - LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month) AS mom_change,
  ROUND(
    (revenue - LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month))
    / NULLIF(LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month), 0) * 100,
    1
  ) AS mom_growth_pct,
  LEAD(revenue, 1) OVER (PARTITION BY product ORDER BY month) AS next_month_preview
FROM monthly_revenue
ORDER BY product, month;

-- EXAMPLE 4: Running total and moving average
-- Scenario: Daily orders for Flipkart — cumulative revenue and 7-day rolling average

CREATE TABLE daily_orders (
  order_date  DATE,
  order_count INT,
  revenue     NUMERIC(12,2)
);

-- Running cumulative total:
SELECT
  order_date,
  revenue,
  SUM(revenue) OVER (ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,

  -- 7-day moving average (current + 6 preceding):
  ROUND(AVG(revenue) OVER (ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2)     AS rolling_7day_avg,

  -- % of total period revenue:
  ROUND(revenue / SUM(revenue) OVER () * 100, 2)      AS pct_of_total
FROM daily_orders
ORDER BY order_date;

-- EXAMPLE 5: NTILE — bucketing customers into spend quartiles
-- Scenario: Segment Zomato customers by lifetime value for marketing campaigns

WITH customer_ltv AS (
  SELECT
    customer_id,
    SUM(amount) AS lifetime_value
  FROM orders
  GROUP BY customer_id
)
SELECT
  customer_id,
  lifetime_value,
  NTILE(4) OVER (ORDER BY lifetime_value DESC) AS ltv_quartile,
  CASE NTILE(4) OVER (ORDER BY lifetime_value DESC)
    WHEN 1 THEN 'Platinum'
    WHEN 2 THEN 'Gold'
    WHEN 3 THEN 'Silver'
    ELSE        'Bronze'
  END AS segment
FROM customer_ltv
ORDER BY lifetime_value DESC;

-- EXAMPLE 6: FIRST_VALUE / LAST_VALUE for cohort comparison
-- Scenario: For each product, what % of current month revenue vs the best month?

SELECT
  product,
  month,
  revenue,
  FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY revenue DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS best_month_revenue,
  ROUND(revenue /
    FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY revenue DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) * 100, 1) AS pct_of_best
FROM monthly_revenue
ORDER BY product, month;

-- LAST_VALUE gotcha — must explicitly extend frame:
SELECT
  product,
  month,
  revenue,
  -- WRONG: default frame ends at CURRENT ROW — last_value = current row's revenue!
  LAST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month)               AS wrong_last,
  -- CORRECT: extend frame to end of partition
  LAST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)                  AS correct_last
FROM monthly_revenue
ORDER BY product, month;

-- EXAMPLE 7: TOP-N PER GROUP — the most common window function interview question
-- "Get the top 2 revenue-generating products per region"

WITH ranked AS (
  SELECT
    region,
    product,
    total_revenue,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY total_revenue DESC) AS rn
  FROM regional_product_revenue  -- hypothetical pre-aggregated table
)
SELECT region, product, total_revenue
FROM ranked
WHERE rn <= 2
ORDER BY region, rn;

-- Real-world: top 3 orders per customer (pagination within groups)
WITH ranked_orders AS (
  SELECT
    o.*,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY amount DESC, created_at DESC
    ) AS rn
  FROM orders o
)
SELECT customer_id, id AS order_id, amount, status, created_at
FROM ranked_orders
WHERE rn <= 3
ORDER BY customer_id, rn;

-- EXAMPLE 8: Named window for reuse (performance optimization)
-- Avoid repeating the same OVER clause multiple times

SELECT
  product,
  month,
  revenue,
  customers,
  LAG(revenue)   OVER w AS prev_revenue,
  LAG(customers) OVER w AS prev_customers,
  SUM(revenue)   OVER w AS running_revenue,
  AVG(revenue)   OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3mo_avg
FROM monthly_revenue
WINDOW w AS (PARTITION BY product ORDER BY month)
ORDER BY product, month;
    `,
    bugs: `
REAL PRODUCTION BUGS FROM WINDOW FUNCTION MISUNDERSTANDING:
-----------------------------------------------------------

BUG 1: Filtering on window function result in WHERE clause — syntax error or wrong results
  Scenario: "Get the top-performing sales rep per region" query returned ALL reps, not just top.
  Wrong code:
    SELECT name, region, RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
    FROM sales_reps
    WHERE rnk = 1; -- ERROR: column "rnk" does not exist in WHERE clause
  Root cause: Window functions execute AFTER WHERE. You can't filter on their results in WHERE.
  Fix: Wrap in a subquery or CTE:
    WITH ranked AS (
      SELECT name, region,
             RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
      FROM sales_reps
    )
    SELECT * FROM ranked WHERE rnk = 1;

BUG 2: LAST_VALUE returning current row's value instead of partition's last value
  Scenario: "Flag which orders are each customer's most recent" — all orders flagged as most recent.
  Wrong code:
    SELECT order_id, customer_id,
           LAST_VALUE(order_id) OVER (PARTITION BY customer_id ORDER BY created_at) AS latest_order
    FROM orders;
    -- latest_order = order_id for EVERY row (default frame ends at CURRENT ROW)
  Root cause: Default frame with ORDER BY is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.
    LAST_VALUE within that frame = the current row itself.
  Fix: Explicitly extend the frame:
    LAST_VALUE(order_id) OVER (
      PARTITION BY customer_id ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )
  Or use FIRST_VALUE with DESC order instead:
    FIRST_VALUE(order_id) OVER (PARTITION BY customer_id ORDER BY created_at DESC)

BUG 3: LAG without default returning NULL for first row — division by zero or NULL propagation
  Scenario: Month-over-month growth dashboard showed NULL for January (first month of data).
    NULL growth rate displayed as "0%" after COALESCE — misleading to stakeholders.
  Wrong code:
    (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month) * 100
    -- For first row: LAG() = NULL. NULL arithmetic = NULL.
  Fix: Use LAG's third argument (default) or NULLIF:
    LAG(revenue, 1, NULL) OVER (...) -- NULL means "no prior period" — display as "N/A" not "0%"
    -- In application: if growth_pct IS NULL then show "First period" not "0%"
  Better fix: be explicit about the no-prior-period case:
    CASE WHEN LAG(revenue) OVER (...) IS NULL THEN NULL
         ELSE ROUND((revenue - LAG(revenue) OVER (...)) / LAG(revenue) OVER (...) * 100, 1)
    END AS mom_growth_pct

BUG 4: ROW_NUMBER used for competition ranking — ties broken arbitrarily, users complain
  Scenario: Gaming leaderboard used ROW_NUMBER for rankings. Two players with same score:
    one appeared as rank 1, other as rank 2. Players complained (correctly) that the ranking was unfair.
  Root cause: ROW_NUMBER is non-deterministic for ties — arbitrary result, not reproducible.
  Fix:
    DENSE_RANK() OVER (ORDER BY score DESC) AS rank
    -- Both players show rank 1. Next player shows rank 2.
  Lesson: ROW_NUMBER for pagination. RANK/DENSE_RANK for meaningful rankings.

BUG 5: Running total reset unexpectedly — forgot PARTITION BY scope
  Scenario: "Cumulative revenue this year per product line" report showed wrong totals.
    The running sum was global across all products, not per-product.
  Wrong code:
    SUM(revenue) OVER (ORDER BY product, month) -- Accumulates across ALL products!
  Root cause: No PARTITION BY means one global window over all rows.
    Ordering by product then month doesn't create per-product windows.
  Fix:
    SUM(revenue) OVER (PARTITION BY product ORDER BY month) -- Resets for each product
  Lesson: PARTITION BY = one independent window per group. ORDER BY within OVER = sort within window.
    Confusing ORDER BY (outside OVER) with ORDER BY (inside OVER) is the #1 window function mistake.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Table: scores (player TEXT, game INT, score INT)
  Data: ('Alice',1,100), ('Alice',2,100), ('Alice',3,80), ('Bob',1,95), ('Bob',2,100), ('Bob',3,100)

  Predict the exact output for each query:

  a) SELECT player, game, score,
          ROW_NUMBER() OVER (ORDER BY score DESC) AS rn,
          RANK()       OVER (ORDER BY score DESC) AS rnk,
          DENSE_RANK() OVER (ORDER BY score DESC) AS dr
     FROM scores ORDER BY score DESC, player, game;
     (Show all 6 rows with their rn, rnk, dr values)

  b) SELECT player, game, score,
          SUM(score) OVER (PARTITION BY player ORDER BY game
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
          LAG(score, 1, 0) OVER (PARTITION BY player ORDER BY game) AS prev_score
     FROM scores ORDER BY player, game;
     (Show all 6 rows — what is Alice's running_total after game 3? Bob's prev_score for game 2?)

  c) SELECT player, NTILE(2) OVER (ORDER BY SUM(score) DESC) AS bucket
     FROM scores GROUP BY player;
     (Only 2 rows. Which player is in bucket 1? Which in 2?)

CHALLENGE 2 — FIX THE WINDOW FUNCTION BUG:
  This retention cohort query should show, for each signup month, how many users
  were still active 30, 60, and 90 days later. It has 3 bugs. Find and fix them.

  WITH cohorts AS (
    SELECT
      DATE_TRUNC('month', signup_date) AS cohort_month,
      user_id,
      signup_date
    FROM users
  ),
  activity AS (
    SELECT DISTINCT user_id, DATE_TRUNC('month', activity_date) AS active_month
    FROM user_events
  ),
  retention AS (
    SELECT
      c.cohort_month,
      COUNT(DISTINCT c.user_id) AS cohort_size,
      -- Bug 1: LAG used where LEAD should be, or vice versa?
      LAG(COUNT(DISTINCT a30.user_id)) OVER (ORDER BY c.cohort_month) AS retained_30d,
      -- Bug 2: this subquery won't work as a window function argument
      COUNT(DISTINCT a60.user_id) OVER (PARTITION BY c.cohort_month) AS retained_60d,
      -- Bug 3: dividing by cohort_size before it's finalized
      COUNT(DISTINCT a90.user_id)::FLOAT / cohort_size AS retention_90d_rate
    FROM cohorts c
    LEFT JOIN activity a30 ON a30.user_id = c.user_id
      AND a30.active_month = c.cohort_month + INTERVAL '1 month'
    LEFT JOIN activity a60 ON a60.user_id = c.user_id
      AND a60.active_month = c.cohort_month + INTERVAL '2 months'
    LEFT JOIN activity a90 ON a90.user_id = c.user_id
      AND a90.active_month = c.cohort_month + INTERVAL '3 months'
    GROUP BY c.cohort_month
  )
  SELECT * FROM retention ORDER BY cohort_month;

  Describe each bug and write the corrected query.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete "Sales Performance Dashboard" query for a D2C brand with these metrics,
  all in a SINGLE SQL query (use CTEs and window functions):

  Input tables: orders (customer_id, product_id, amount, created_at), products (id, name, category)

  Required output columns per product per month:
  1. product_name, category, month
  2. monthly_revenue (sum of orders that month)
  3. prev_month_revenue (using LAG)
  4. mom_growth_pct (month-over-month % change, NULL for first month)
  5. running_revenue_ytd (cumulative within the year)
  6. revenue_rank_this_month (DENSE_RANK among all products by revenue that month)
  7. category_rank_this_month (DENSE_RANK within category by revenue that month)
  8. rolling_3mo_avg (3-month moving average)
  9. pct_of_category_revenue (this product's revenue as % of its category total that month)
  10. is_best_month (boolean: TRUE if this month is the product's highest-ever revenue)

  Ensure: NULL safety for LAG (first month), correct PARTITION BY for each metric,
  correct frame clause for rolling average and running total.
    `,
    summary: `Window functions are the most powerful analytics tool in SQL — they compute rankings, running totals, moving averages, and period comparisons in a single scan without collapsing rows. The two most important rules: window functions execute after WHERE (filter results using a CTE wrapper), and LAST_VALUE requires an explicit UNBOUNDED FOLLOWING frame (otherwise it just returns the current row). Master ROW_NUMBER for pagination, RANK/DENSE_RANK for competition, LAG/LEAD for period comparisons, and PARTITION BY to scope windows per group.`
  },

  {
    id: 6,
    title: "Transactions & ACID",
    tag: "THE CONTRACT BETWEEN YOU AND YOUR DATA",
    color: "#BE185D",
    tldr: `A transaction is a sequence of SQL operations treated as a single logical unit — either all succeed (COMMIT) or all fail (ROLLBACK). ACID properties (Atomicity, Consistency, Isolation, Durability) are the guarantees PostgreSQL makes about data integrity. Isolation levels control how concurrent transactions see each other's in-progress work, with each level preventing different anomalies (dirty reads, non-repeatable reads, phantom reads) at the cost of more locking. Deadlocks happen when transactions wait on each other in a cycle — prevention requires consistent lock ordering.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I updated account balances in two separate queries — the server crashed between them, now money is missing"
  → Atomicity: wrap both updates in a transaction. Either both commit or both roll back.
  → No "partial success" state possible. The system is always consistent.

"Two users simultaneously checked that a discount code 'has 1 use left' — both used it"
  → Race condition from read-modify-write pattern without proper isolation.
  → SELECT ... FOR UPDATE locks the row at read time → second transaction waits until first commits.

"What isolation level should I use? READ COMMITTED vs SERIALIZABLE?"
  → READ COMMITTED (default PostgreSQL): sees only committed data. No dirty reads.
    Risk: two reads in same transaction may see different data (non-repeatable read).
  → SERIALIZABLE: transactions behave as if run serially. Highest isolation, most blocking.
  → For most OLTP: READ COMMITTED + SELECT ... FOR UPDATE for critical reads.

"My transaction is deadlocked — what does that mean and how do I fix it?"
  → Transaction A holds lock on Row 1, waits for Row 2.
    Transaction B holds lock on Row 2, waits for Row 1. Circular wait = deadlock.
  → PostgreSQL detects it (after deadlock_timeout, default 1 second) and kills one transaction.
  → Prevention: always lock rows in the same order across all code paths.

"What is SERIALIZABLE isolation and when does it actually abort a transaction?"
  → SERIALIZABLE uses Serializable Snapshot Isolation (SSI) in PostgreSQL.
  → Detects "write skew" anomalies (two transactions each read data and write based on it).
  → Aborts the "pivot" transaction — application must retry. Not just locking — proactive detection.
    `,
    analogy: `
THE BANK TRANSFER ANALOGY:
---------------------------
Priya wants to transfer ₹10,000 from her savings account to Rohan's account.
This requires: DEBIT Priya's account + CREDIT Rohan's account = 2 operations.

ATOMICITY — All or Nothing:
  Without atomicity: DEBIT succeeds, then server crashes before CREDIT.
  Priya loses ₹10,000. Rohan gets nothing. Money vanishes.
  
  With atomicity: both operations are ONE transaction.
  Crash between them? On recovery: neither operation happened. Priya still has her ₹10,000.
  "The transaction either fully happened, or fully didn't happen."

CONSISTENCY — Rules Enforced at Every Step:
  Rule: account balance cannot go below -₹10,000 (overdraft limit).
  Transaction tries to debit ₹50,000 from a ₹1,000 account.
  The CHECK CONSTRAINT fires → transaction rejected → both operations rolled back.
  Database is always in a "valid" state — no rule is ever violated mid-transaction.

ISOLATION — Transactions Don't Peek at Each Other's Work:
  Scenario: Bank's end-of-day report is running (reads all balances).
  Simultaneously: Priya's transfer is in-progress (debited but not yet credited).
  
  Without isolation: report sees Priya's account -₹10,000, Rohan's unchanged = ₹10,000 "missing".
  With READ COMMITTED isolation: report only sees COMMITTED data.
    Either sees old state (before debit) OR new state (after credit). Never the "half-done" state.

DURABILITY — Committed Means Forever:
  Transaction commits. Power cuts 1 millisecond later.
  Durability guarantee: the committed transfer is preserved.
  WAL was fsynced before commit returned. On recovery: transfer is there.

ISOLATION LEVELS = SLIDING SCALE OF PROTECTION:
  READ UNCOMMITTED (forbidden in PostgreSQL): can see mid-transaction dirty data.
    Like looking at Priya's transfer before it completes — you see the debit but not the credit.
  
  READ COMMITTED (PostgreSQL default): sees committed data as of EACH STATEMENT.
    Each SQL statement gets a fresh "snapshot." Safe from dirty reads.
    Risk: two SELECT statements in same transaction may see different data.
  
  REPEATABLE READ: sees committed data as of TRANSACTION START.
    Both SELECT statements see the same snapshot. Safe from non-repeatable reads.
    Risk: a new INSERT committed after your transaction started can appear in later reads (phantom).
  
  SERIALIZABLE: strongest. No anomalies. Transactions behave as if sequential.
    Cost: more overhead, potential transaction aborts. Application must handle retries.

DEADLOCK = TWO PEOPLE BLOCKING EACH OTHER:
  Priya is transferring to Rohan: locks Priya's account first, then tries to lock Rohan's.
  Simultaneously: Rohan is transferring to Priya: locks Rohan's account first, then tries to lock Priya's.
  Both are now waiting. Forever. Deadlock.
  
  Solution: always lock accounts in ORDER OF account_id.
  Both transactions lock smaller_id first → no circular wait → no deadlock.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ACID AND ISOLATION INTERNALS:
---------------------------------------------------------

ACID PROPERTIES — PRECISE DEFINITIONS:

Atomicity:
  Implemented via WAL and ROLLBACK.
  During a transaction: all changes buffered in WAL buffer + modified pages in buffer pool.
  On ROLLBACK: WAL records "this transaction aborted." Buffer pool pages reverted (or ignored).
  On crash mid-transaction: recovery replays WAL up to last checkpoint, ignores in-progress txns.
  PostgreSQL: every statement has an implicit savepoint. Statement failure → statement rollback only
    (unless you're using explicit transaction BEGIN/COMMIT).

Consistency:
  Enforced by: CHECK constraints, NOT NULL, UNIQUE constraints, FK constraints, trigger-enforced rules.
  All constraints evaluated at COMMIT time (unless DEFERRED constraints used).
  If ANY constraint fails at commit: entire transaction rolls back.
  DEFERRABLE constraints: can be checked at end of transaction instead of after each statement.
    Useful for: circular FK references, loading data with self-referential rows.

Isolation (PostgreSQL implementation):
  PostgreSQL uses MVCC (Multi-Version Concurrency Control) for most isolation.
  Readers don't block writers. Writers don't block readers.
  
  Snapshot: at transaction start (or statement start for READ COMMITTED), a snapshot is taken.
    The snapshot defines: which transaction IDs are visible (committed before snapshot time).
    Tuple visibility: visible if xmin committed before snapshot AND (xmax is 0 OR xmax committed after snapshot).
  
  Lock types (in order of restriction):
    ACCESS SHARE: read lock (SELECT). Compatible with everything except ACCESS EXCLUSIVE.
    ROW SHARE: SELECT ... FOR UPDATE/SHARE.
    ROW EXCLUSIVE: INSERT, UPDATE, DELETE.
    SHARE UPDATE EXCLUSIVE: VACUUM, CREATE INDEX CONCURRENTLY.
    SHARE: CREATE INDEX (non-concurrent).
    SHARE ROW EXCLUSIVE: rare.
    EXCLUSIVE: rare.
    ACCESS EXCLUSIVE: ALTER TABLE, DROP TABLE, VACUUM FULL. Blocks everything.

ISOLATION LEVELS — WHICH PHENOMENA THEY PREVENT:
  
  Phenomenon       | READ COMMITTED | REPEATABLE READ | SERIALIZABLE
  Dirty Read       | Prevented      | Prevented       | Prevented
  Non-Repeatable   | Possible       | Prevented       | Prevented
  Phantom Read     | Possible       | Prevented*      | Prevented
  Write Skew       | Possible       | Possible        | Prevented
  
  *PostgreSQL REPEATABLE READ also prevents phantom reads (unlike SQL standard which allows it).
  
  Dirty Read: reading another transaction's uncommitted changes.
    PostgreSQL: impossible even at READ UNCOMMITTED (treated as READ COMMITTED).
  
  Non-Repeatable Read: re-reading same row returns different data (committed by another txn between reads).
    Example: read balance (₹1000), another txn commits (balance now ₹500), re-read (₹500).
  
  Phantom Read: re-reading a range returns different rows (new rows inserted by another committed txn).
    Example: COUNT(*) WHERE status='pending' returns 5, another txn inserts, re-count returns 6.
  
  Write Skew: two transactions each read data and make write decisions based on what they read.
    Example: Doctor on-call system. Two doctors both check "is anyone else on call?" (no). Both go off-call.
    Result: no doctor on call — violates constraint. Neither saw the other's write.
    Prevented only by SERIALIZABLE.

SELECT FOR UPDATE / SHARE:
  SELECT ... FOR UPDATE: acquires ROW EXCLUSIVE lock on selected rows. Other FOR UPDATE waits.
    Use for: read-modify-write patterns where you need the value to stay stable.
    Example: SELECT balance FROM accounts WHERE id = 42 FOR UPDATE; -- Lock before debit.
  
  SELECT ... FOR SHARE: acquires ROW SHARE lock. Multiple FOR SHARE compatible; FOR UPDATE waits.
    Use for: reading data you want stable while allowing others to read (but not write).
  
  NOWAIT: fail immediately if lock unavailable. Don't queue.
    SELECT ... FOR UPDATE NOWAIT; -- Returns error if row already locked.
  
  SKIP LOCKED: skip rows that are locked. Great for job queues.
    SELECT * FROM jobs WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
    Multiple workers each grab one job without competing.

SAVEPOINTS:
  SAVEPOINT sp1; -- Create a named checkpoint within a transaction.
  ROLLBACK TO SAVEPOINT sp1; -- Rollback to checkpoint (transaction continues).
  RELEASE SAVEPOINT sp1; -- Release savepoint (no longer rollbackable to it).
  
  Use case: complex transactions where partial rollback needed.
  ORM use: SQLAlchemy uses savepoints for nested transactions.

DEADLOCK DETECTION AND PREVENTION:
  PostgreSQL deadlock detection: deadlock_timeout (default 1000ms = 1 second).
    After waiting for a lock for deadlock_timeout: check for deadlock cycle.
    If deadlock found: abort the "youngest" transaction (least work done).
    Error: "ERROR: deadlock detected"
  
  Monitoring: SET log_lock_waits = ON; (logs any lock wait > deadlock_timeout).
  
  Prevention strategies:
    1. Consistent lock ordering: always lock rows in primary key order.
    2. Short transactions: hold locks briefly. Commit quickly.
    3. Use advisory locks for application-level resources.
    4. Avoid user-facing delays within transactions (no HTTP calls inside BEGIN/COMMIT).

ADVISORY LOCKS:
  Application-managed locks (not tied to specific rows/tables).
  pg_try_advisory_lock(key): acquire lock, return FALSE if already held (non-blocking).
  pg_advisory_lock(key): acquire lock, wait if already held (blocking).
  pg_advisory_unlock(key): release.
  
  Session vs transaction:
    pg_advisory_lock(): session-level (held until connection closes or explicit unlock).
    pg_advisory_xact_lock(): transaction-level (automatically released on commit/rollback).
  
  Use cases:
    - Prevent duplicate background jobs (lock on job_type_id).
    - Application-level "pessimistic locking" for resources not represented as DB rows.
    - Distributed leader election (first server to acquire lock becomes leader).
    `,
    code: `
-- ===== TRANSACTIONS & ACID — SQL EXAMPLES =====

-- EXAMPLE 1: Atomic bank transfer — the canonical transaction example
-- Scenario: UPI transfer of ₹5000 from Priya (account 101) to Rohan (account 202)

CREATE TABLE accounts (
  id         BIGSERIAL PRIMARY KEY,
  owner_name TEXT          NOT NULL,
  balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT balance_non_negative CHECK (balance >= 0) -- Consistency rule
);

INSERT INTO accounts (id, owner_name, balance) VALUES
  (101, 'Priya Sharma', 15000.00),
  (202, 'Rohan Mehta',  8000.00);

-- CORRECT: Atomic transfer in a single transaction
BEGIN;
  -- Lock both rows in ID order (smaller ID first) to prevent deadlocks
  SELECT id, balance FROM accounts WHERE id IN (101, 202) ORDER BY id FOR UPDATE;

  UPDATE accounts SET balance = balance - 5000 WHERE id = 101;
  UPDATE accounts SET balance = balance + 5000 WHERE id = 202;

  -- Verify no negative balance (belt-and-suspenders — CHECK constraint also guards this)
  DO \$\$
  BEGIN
    IF EXISTS (SELECT 1 FROM accounts WHERE id = 101 AND balance < 0) THEN
      RAISE EXCEPTION 'Insufficient funds in account 101';
    END IF;
  END;
  \$\$;

COMMIT;

-- If anything fails between BEGIN and COMMIT: automatic ROLLBACK.
-- Power cut after first UPDATE but before second: WAL recovery ignores incomplete txn.

-- EXAMPLE 2: Isolation levels — demonstrating READ COMMITTED vs REPEATABLE READ

-- Session A: starts a transaction and reads
BEGIN;  -- Session A
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 101; -- Sees: 10000

-- [Session B, concurrently]: commits an update
BEGIN;  -- Session B
UPDATE accounts SET balance = balance + 1000 WHERE id = 101;
COMMIT; -- Session B commits

-- Session A: re-reads the same row
SELECT balance FROM accounts WHERE id = 101;
-- READ COMMITTED:   sees 11000 (new committed value — snapshot is per-statement)
-- REPEATABLE READ:  sees 10000 (same snapshot as start of transaction)
COMMIT;  -- Session A

-- EXAMPLE 3: SELECT FOR UPDATE — prevent race conditions on inventory
-- Scenario: Two users simultaneously try to buy the last item in stock

CREATE TABLE inventory (
  product_id BIGINT PRIMARY KEY,
  product_name TEXT,
  stock INT NOT NULL CHECK (stock >= 0)
);
INSERT INTO inventory VALUES (1, 'iPhone 15 Pro', 1); -- Last unit!

-- WRONG: Race condition (both sessions read stock=1, both proceed to decrement)
-- Session A and B both run: SELECT stock FROM inventory WHERE product_id = 1; -- both see 1
-- Session A: UPDATE inventory SET stock = stock - 1 WHERE product_id = 1;
-- Session B: UPDATE inventory SET stock = stock - 1 WHERE product_id = 1; -- stock goes to -1!

-- CORRECT: Lock the row at read time
BEGIN;
-- Lock the row — second concurrent transaction waits here until first commits
SELECT stock FROM inventory WHERE product_id = 1 FOR UPDATE;

-- Now safe: we hold the lock, stock value is stable
UPDATE inventory SET stock = stock - 1
WHERE product_id = 1 AND stock > 0;

-- Check if update succeeded (might be 0 if lock was released and stock already decremented)
GET DIAGNOSTICS row_count = ROW_COUNT;
-- If row_count = 0: another transaction beat us, stock already 0

COMMIT;

-- EXAMPLE 4: Job queue with SKIP LOCKED — multiple workers, no collisions
-- Scenario: Background email delivery queue (like Postman / AWS SES)

CREATE TABLE email_jobs (
  id          BIGSERIAL PRIMARY KEY,
  to_email    TEXT    NOT NULL,
  subject     TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts    INT NOT NULL DEFAULT 0
);

-- Worker process: atomically claim one job, preventing other workers from taking it
BEGIN;
WITH claimed AS (
  SELECT id FROM email_jobs
  WHERE status = 'pending' AND attempts < 3
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED  -- Skip rows locked by other workers
  LIMIT 1
)
UPDATE email_jobs
SET status = 'processing', attempts = attempts + 1
WHERE id = (SELECT id FROM claimed)
RETURNING *; -- Returns the claimed job

-- [Process the email here — outside the transaction ideally, or with a timeout]

-- Mark as sent:
UPDATE email_jobs SET status = 'sent' WHERE id = :job_id;
COMMIT;

-- EXAMPLE 5: Savepoints — partial rollback within a transaction
-- Scenario: Bulk user import — skip invalid records, keep valid ones

BEGIN;
INSERT INTO users (name, email) VALUES ('Arjun Singh', 'arjun@example.com');

SAVEPOINT before_second_insert;
INSERT INTO users (name, email) VALUES ('Invalid User', 'arjun@example.com'); -- Duplicate email!
-- ERROR: duplicate key value violates unique constraint "users_email_key"

-- Without savepoint: entire transaction would fail
-- With savepoint: rollback to just before the failing insert
ROLLBACK TO SAVEPOINT before_second_insert;

-- Continue with next valid record:
INSERT INTO users (name, email) VALUES ('Priya Patel', 'priya@example.com');
COMMIT;
-- Result: Arjun and Priya inserted. Invalid user skipped. Transaction succeeded partially.

-- EXAMPLE 6: Advisory locks — preventing duplicate background jobs
-- Scenario: Daily report generation job — prevent two servers from running it simultaneously

-- Try to acquire advisory lock for "daily_report" job (use a consistent integer key)
-- Hash the job name to an integer:
DO \$\$
DECLARE
  lock_key BIGINT := hashtext('daily_report_job');
  acquired BOOLEAN;
BEGIN
  -- Non-blocking: returns false if another server holds the lock
  SELECT pg_try_advisory_xact_lock(lock_key) INTO acquired;
  
  IF NOT acquired THEN
    RAISE NOTICE 'Another server is already running daily_report_job. Skipping.';
    RETURN;
  END IF;
  
  -- Lock acquired. Run the job.
  RAISE NOTICE 'Running daily_report_job...';
  -- [... report generation logic ...]
  -- Lock automatically released on transaction end (xact-level advisory lock)
END;
\$\$;

-- EXAMPLE 7: Deadlock prevention — consistent lock ordering
-- Scenario: Money transfers that could deadlock

-- DANGEROUS: Transfer A→B and B→A simultaneously = deadlock
-- Thread 1: BEGIN; UPDATE accounts SET balance=balance-X WHERE id=:source; (locks id=1)
-- Thread 2: BEGIN; UPDATE accounts SET balance=balance-X WHERE id=:source; (locks id=2)
-- Thread 1: UPDATE accounts SET balance=balance+X WHERE id=:target; (waits for id=2)
-- Thread 2: UPDATE accounts SET balance=balance+X WHERE id=:target; (waits for id=1 — DEADLOCK)

-- SAFE: Always lock in ascending ID order
CREATE OR REPLACE FUNCTION safe_transfer(
  p_from BIGINT, p_to BIGINT, p_amount NUMERIC
) RETURNS VOID AS \$\$
BEGIN
  -- Lock accounts in consistent order (smaller ID first)
  IF p_from < p_to THEN
    PERFORM balance FROM accounts WHERE id = p_from FOR UPDATE;
    PERFORM balance FROM accounts WHERE id = p_to   FOR UPDATE;
  ELSE
    PERFORM balance FROM accounts WHERE id = p_to   FOR UPDATE;
    PERFORM balance FROM accounts WHERE id = p_from FOR UPDATE;
  END IF;
  
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
END;
\$\$ LANGUAGE plpgsql;

-- Both concurrent transfers now acquire locks in the same order → no deadlock cycle possible

-- EXAMPLE 8: SERIALIZABLE isolation — write skew prevention
-- Scenario: Hospital on-call system where at least 1 doctor must always be on call

CREATE TABLE doctors (
  id      BIGSERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  on_call BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO doctors VALUES (1, 'Dr. Priya', TRUE), (2, 'Dr. Rohan', TRUE);

-- With READ COMMITTED: write skew possible! Both doctors see "2 on call", both go off-call.
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Each doctor's session runs this:
DO \$\$
DECLARE on_call_count INT;
BEGIN
  SELECT COUNT(*) INTO on_call_count FROM doctors WHERE on_call = TRUE;
  IF on_call_count > 1 THEN
    UPDATE doctors SET on_call = FALSE WHERE id = :my_id;
  END IF;
END;
\$\$;

COMMIT;
-- PostgreSQL SERIALIZABLE: one of the two transactions will get:
-- ERROR: could not serialize access due to read/write dependencies among transactions
-- Application must retry the aborted transaction.
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TRANSACTION MISUNDERSTANDING:
-------------------------------------------------------

BUG 1: No transaction around a multi-step operation — partial failure leaves inconsistent state
  Scenario: Razorpay-style payment processing: (1) deduct wallet balance, (2) create payment record,
    (3) send confirmation notification. Server OOM-killed after step 1, before step 2.
    Customer's balance was deducted but no payment record existed. Customer charged but payment invisible.
  Root cause: Three separate SQL statements without a wrapping transaction.
  Fix:
    BEGIN;
    UPDATE wallets SET balance = balance - :amount WHERE user_id = :user_id;
    INSERT INTO payments (...) VALUES (...);
    -- Notification sent AFTER commit (outside transaction — notifications are out-of-band)
    COMMIT;
  Rule: Any multi-step operation that must succeed or fail together → wrap in a transaction.

BUG 2: Long-running transaction with user input inside — holding locks for minutes
  Scenario: E-commerce checkout flow: BEGIN transaction → show user "confirm your order?" page
    → wait for user to click OK (30 seconds) → COMMIT. During wait: row-level locks held.
    At peak load (1000 concurrent checkouts): lock waits cascaded, 200+ transactions queued.
    Page response times went from 200ms to 45 seconds.
  Root cause: Never put user interaction (HTTP request/response round-trip) inside a database transaction.
    Transactions should be milliseconds, not seconds.
  Fix: Read → show user → user confirms → BEGIN → re-read with FOR UPDATE → write → COMMIT.
    The transaction wraps only the final write, not the user interaction.

BUG 3: Deadlock from inconsistent table update order — random occurrence, hard to reproduce
  Scenario: Order processing had two code paths: "update inventory then order" and "update order then inventory."
    Under load, ~0.1% of orders failed with "deadlock detected." Retried successfully but caused alert noise.
  Root cause:
    Path A: UPDATE orders SET status='confirmed' WHERE id=:id; -- Locks orders row
            UPDATE inventory SET stock=stock-1 WHERE product_id=:pid; -- Waits for inventory
    Path B: UPDATE inventory SET stock=stock-1 WHERE product_id=:pid; -- Locks inventory
            UPDATE orders SET status='confirmed' WHERE id=:id; -- Waits for orders = DEADLOCK
  Fix: Enforce consistent table update order in all code paths:
    Always update orders first, then inventory. (Or use a single function that enforces this.)
  Prevention: Code review rule — "all code paths that touch multiple tables must update in alphabetical table order."

BUG 4: Isolation level mismatch — reports showing inconsistent data mid-day
  Scenario: Financial dashboard showed account balances that didn't reconcile.
    Total debits didn't equal total credits. Dashboard ran during peak transaction processing.
  Root cause: Dashboard queries ran at READ COMMITTED (default). Long-running report executed multiple
    SELECT statements; each statement got a new snapshot. Between statements, transactions committed.
    The report saw beginning of one transaction and end of another — inconsistent state.
  Fix: Run long reports at REPEATABLE READ:
    BEGIN;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    -- All queries in this transaction see the same snapshot
    SELECT SUM(amount) FROM debits WHERE date = TODAY;
    SELECT SUM(amount) FROM credits WHERE date = TODAY;
    COMMIT;
  Alternative: Use materialized views or snapshot tables populated transactionally.

BUG 5: Forgetting COMMIT — transaction held open indefinitely, blocking VACUUM
  Scenario: Developer tested a migration in psql, ran BEGIN + some ALTER TABLEs, got distracted,
    left the psql session open. AUTOVACUUM on the modified tables was blocked for 6 hours.
    Table bloat grew. Production slowdown. pg_stat_activity showed the idle transaction.
  Root cause: An open transaction (even idle) holds a transaction ID. VACUUM cannot remove dead
    tuples newer than the oldest open transaction. Table bloat accumulated.
  Detection:
    SELECT pid, now() - xact_start AS duration, state, query
    FROM pg_stat_activity
    WHERE xact_start IS NOT NULL AND now() - xact_start > INTERVAL '5 minutes'
    ORDER BY duration DESC;
  Fix: pg_terminate_backend(pid); -- Kill the idle transaction.
  Prevention: idle_in_transaction_session_timeout = '5min'; -- Auto-kill idle-in-transaction sessions.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE ISOLATION BEHAVIOR:
  Two concurrent sessions run these transactions. Predict what each reads.

  Setup: accounts table: (id=1, balance=₹1000), (id=2, balance=₹2000)

  Session A starts first (REPEATABLE READ):
  BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
  SELECT SUM(balance) FROM accounts; -- (a) Result: ___

  Session B starts and commits (READ COMMITTED):
  BEGIN;
  UPDATE accounts SET balance = balance + ₹500 WHERE id = 1;
  COMMIT;

  Session A continues (same transaction, after Session B committed):
  SELECT balance FROM accounts WHERE id = 1; -- (b) What does Session A see? ___
  SELECT SUM(balance) FROM accounts;          -- (c) Sum: ___
  COMMIT;

  Now new Session C (READ COMMITTED) starts after everything:
  SELECT SUM(balance) FROM accounts; -- (d) Sum: ___

  Questions:
  e) If Session A was READ COMMITTED instead of REPEATABLE READ, how would (b) and (c) differ?
  f) What phenomenon does (b)+(c) demonstrate if Session A is REPEATABLE READ?
  g) What phenomenon would be possible if Session A was READ COMMITTED and ran (b) then (c)?

CHALLENGE 2 — FIX THE DEADLOCK-PRONE CODE:
  This ticket booking system has a deadlock-prone pattern. Identify it and fix it.

  -- Booking function (called concurrently by many users):
  CREATE OR REPLACE FUNCTION book_seats(
    p_user_id INT, p_event_id INT, p_seat_ids INT[]
  ) RETURNS BOOLEAN AS \$\$
  DECLARE
    seat_id INT;
  BEGIN
    BEGIN
      -- Bug 1: locks seats in array order (not sorted) — different orderings = deadlock
      FOREACH seat_id IN ARRAY p_seat_ids LOOP
        UPDATE seats
        SET status = 'booked', user_id = p_user_id
        WHERE id = seat_id AND status = 'available';
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Seat % not available', seat_id;
        END IF;
      END LOOP;
      
      -- Bug 2: long operation inside transaction (send confirmation email)
      PERFORM send_booking_confirmation_email(p_user_id, p_event_id);
      
      RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Bug 3: catches all exceptions including SQLSTATE 40P01 (deadlock)
      -- without re-raising — silently swallows deadlock errors
      RETURN FALSE;
    END;
  END;
  \$\$ LANGUAGE plpgsql;

  Fix all 3 bugs. Write the corrected function.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement a complete "Double-Entry Bookkeeping" ledger system in PostgreSQL.

  Requirements:
  - Every financial transaction records TWO entries: a debit and a credit
  - The sum of all entries must always equal zero (fundamental accounting rule)
  - No money can be created or destroyed
  - Full audit trail: every entry has who created it, when, and the reason
  - An account's balance = SUM of all its credit entries - SUM of all its debit entries

  Tables to create: accounts, ledger_entries, transactions (the parent event)

  Write:
  1. The CREATE TABLE statements with appropriate constraints
  2. A function transfer(from_account, to_account, amount, description) that:
     - Creates a transaction record
     - Creates exactly 2 ledger entries (debit + credit)
     - Validates the accounting equation holds after each transfer
     - Wraps everything in a transaction
  3. A view account_balances that shows current balance per account
  4. A CHECK that enforces the double-entry invariant (sum of all entries = 0)
     (Hint: this is tricky in SQL — use a deferred constraint trigger)
    `,
    summary: `Transactions are the foundation of data integrity — wrap every multi-step operation in BEGIN/COMMIT and let PostgreSQL's ACID guarantees handle crashes, rollbacks, and isolation. The two most critical operational habits are: never hold transactions open during user interactions (seconds of lock holding kills throughput), and always acquire locks in a consistent order across all code paths (inconsistent ordering is the primary cause of deadlocks in production).`
  },

  {
    id: 7,
    title: "Query Optimization & EXPLAIN ANALYZE",
    tag: "DIAGNOSING YOUR SLOW QUERIES LIKE A DETECTIVE",
    color: "#92400E",
    tldr: `EXPLAIN ANALYZE is your X-ray machine for slow queries — it shows exactly what PostgreSQL's query planner chose to do and how long each step actually took. The planner estimates costs using statistics (updated by ANALYZE), picks between sequential scans, index scans, and bitmap scans, and decides join algorithms. Knowing how to read EXPLAIN output, recognize bad plans, and fix them (with the right index, fresh statistics, or query rewrite) is the most important production DBA skill.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My query is slow but I have an index — why isn't it being used?"
  → Stale statistics: ANALYZE was never run after a bulk load. Planner thinks 1,000 rows exist, actually 10M.
  → Column in function: WHERE LOWER(email) = ? — index on email not used.
  → Result set too large: index scan for 40% of table is slower than sequential scan.
  → OR conditions: WHERE a = 1 OR b = 2 — can't use single index for both conditions.

"EXPLAIN shows cost=50000 — is that bad? What units are those?"
  → Costs are in "page read units" — not milliseconds. Cost=1.0 ≈ one sequential page read.
  → seq_page_cost = 1.0 (baseline). random_page_cost = 4.0 (HDD). For SSD: set random_page_cost=1.1.
  → High cost alone isn't the problem — it's relative. Compare with EXPLAIN ANALYZE actual time.

"What is a bitmap scan and why does PostgreSQL use it?"
  → Index Scan: read index entry → immediately fetch heap row → repeat. Random I/O pattern.
  → Bitmap Index Scan: read ALL matching index entries first → build bitmap of pages to fetch.
    Then Bitmap Heap Scan: fetch pages in sequential order from bitmap. Converts random → sequential!
  → Used when: moderate number of rows (too many for pure index scan, too few for full seq scan).

"My CTE is slower than a subquery — why?"
  → Pre-PostgreSQL 13: CTEs were "optimization fences" — materialized as temporary tables.
    Planner couldn't push predicates through CTEs. Result: full CTE evaluated even if outer WHERE filtered most rows.
  → PostgreSQL 13+: CTEs inlined by default (like subqueries) unless NOT MATERIALIZED specified.
  → Use MATERIALIZED if you actually want the fence (e.g., CTE called multiple times).

"How do I find the slowest queries in production without running EXPLAIN on everything?"
  → pg_stat_statements: tracks every query's total execution time, call count, avg time.
  → Find top-10 queries by total CPU time → those are the ones to optimize first.
    `,
    analogy: `
THE GPS NAVIGATION ANALOGY:
-----------------------------
You ask GPS to route from Mumbai to Bangalore. The GPS (query planner) must choose a route.

THE QUERY PLANNER = GPS ROUTE SELECTION:
  The GPS considers multiple routes (different join orders, index vs seq scan).
  It uses estimated travel times (statistics: row counts, data distribution).
  It picks the route with the lowest total estimated cost.
  Sometimes it's wrong — construction not on the map (stale statistics).

SEQUENTIAL SCAN = HIGHWAY (BROAD, FAST FOR LONG DISTANCES):
  No turns, no decision points. Just read every page in order.
  Best for: large result sets (> 10% of table). Database "pre-fetches" ahead (read-ahead buffer).
  Like highway: fast for 100km, but not worth getting on for a 2km trip.

INDEX SCAN = CITY STREETS WITH SHORTCUTS:
  GPS says "turn left at page 2547, go to tuple 14."
  Each turn = a random I/O to a potentially different disk location.
  Best for: highly selective queries returning < 1-5% of rows.
  Like city streets: fast for short precise trips, but many turns on a long journey = slow.

BITMAP INDEX SCAN = COLLECTING ADDRESSES, THEN DRIVING EFFICIENTLY:
  Phase 1 (Bitmap Index Scan): scan the index, collect ALL matching row addresses.
    Build a memory bitmap: "pages 12, 47, 89, 234 contain matching rows."
  Phase 2 (Bitmap Heap Scan): fetch those pages in ORDER — sequential-ish access!
    Like: writing down all addresses first, then sorting them by proximity, then visiting in order.
  Best for: moderate selectivity (1-10% of rows). Fewer random I/Os than index scan at scale.

EXPLAIN ANALYZE = THE POST-TRIP GPS LOG:
  EXPLAIN: the planned route BEFORE driving. Estimated times.
  EXPLAIN ANALYZE: the actual log AFTER driving. Real times, real row counts.
  
  The critical insight: compare "rows=100" (estimated) vs "rows=15234" (actual).
  Big discrepancy = stale statistics = planner made a bad decision based on wrong map data.
  Fix: ANALYZE the table → refresh the map.

CTE OPTIMIZATION FENCE = A REST STOP ON THE HIGHWAY:
  Pre-13: CTE is a mandatory rest stop. You must stop there, park, fully complete that leg.
    Even if your final destination is 2 minutes away and the rest stop is 30 minutes out.
  Post-13: planner can skip the rest stop (inline CTE) if it's faster to go direct.
  MATERIALIZED keyword: force the rest stop. Useful when the CTE result is used multiple times.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — EXPLAIN ANATOMY AND PLANNER:
--------------------------------------------------------

READING EXPLAIN OUTPUT:
  EXPLAIN (FORMAT TEXT) SELECT ...;
  
  Output is a tree of plan nodes. Each node shows:
    Node type: Seq Scan, Index Scan, Hash Join, Nested Loop, etc.
    Cost: (startup_cost..total_cost)
    Rows: estimated row count output by this node
    Width: estimated average row width in bytes
  
  EXPLAIN ANALYZE adds:
    Actual time: (first_row_ms..last_row_ms)
    Actual rows: real row count output
    Loops: how many times this node was executed (e.g., inner side of nested loop)
    Buffers (with BUFFERS option): cache hits/misses, read/written
  
  Read bottom-up: leaf nodes execute first, results feed parent nodes.
  Actual cost of node = node_time × loops (loops is multiplied in for inner nodes of nested loops).

KEY PLAN NODES:
  Seq Scan: reads entire table from first page to last. Cheapest for large result sets.
  Index Scan: navigates B-tree, fetches each matching heap tuple. Random I/O per tuple.
  Index Only Scan: navigates B-tree, returns data FROM INDEX. No heap access (covering index).
  Bitmap Index Scan → Bitmap Heap Scan: two-phase. Builds page bitmap then fetches.
  Nested Loop: for each outer row, scan inner relation. O(outer × inner). Good with index on inner.
  Hash Join: build hash table from smaller input, probe with larger. O(n+m). Needs work_mem.
  Merge Join: sort both inputs, scan together. O(n log n). Good for pre-sorted inputs.
  Hash Aggregate: GROUP BY using hash table. O(n) space.
  Sort: sorts rows. May spill to disk if > work_mem.

COST MODEL:
  The cost units are abstract, based on relative costs of operations.
  seq_page_cost = 1.0 (reference cost for reading one sequential page)
  random_page_cost = 4.0 default (4× more expensive for HDD random read)
    SET random_page_cost = 1.1; for SSDs (random reads near-sequential speed)
  cpu_tuple_cost = 0.01 (per row processing cost)
  cpu_index_tuple_cost = 0.005 (per index entry cost)
  cpu_operator_cost = 0.0025 (per operator call, e.g., =, <)
  
  startup_cost: cost to return FIRST row (e.g., sort must fully complete before first row output)
  total_cost: cost to return ALL rows
  
  For LIMIT queries: planner considers that you don't need all rows.
    Low startup_cost plans (nested loop) favored over low total_cost plans (hash join) when LIMIT used.

PLANNER STATISTICS (pg_statistic):
  ANALYZE collects:
    n_distinct: estimated number of distinct values (negative = fraction of total, e.g., -0.3 = 30% unique)
    most_common_vals: top N values by frequency
    most_common_freqs: frequency of each most_common_val
    histogram_bounds: bucket boundaries for range queries
    correlation: how well physical order matches logical order (1.0 = perfectly correlated)
  
  correlation matters: column with correlation ≈ 1.0 → index scan much cheaper (clustered access).
    correlation ≈ 0 → index scan requires random I/O for each row → planner prefers seq scan.
  
  Statistics targets: ALTER TABLE t ALTER COLUMN c SET STATISTICS 500; (default 100)
    Higher target = more histogram buckets = better estimates for skewed distributions.
    Important for columns with many distinct values or non-uniform distribution.

COMMON PLAN PROBLEMS AND FIXES:
  
  1. Wrong row estimate → bad join order or wrong algorithm:
     Fix: ANALYZE the relevant tables. Check n_distinct for key columns.
     Check: pg_stats WHERE tablename='t' AND attname='col';
  
  2. Sequential scan when index should help:
     Causes: no index, function wrapping, OR conditions, low cardinality, too many rows returned.
     Check: EXPLAIN (ANALYZE, BUFFERS) shows "Rows Removed by Filter: X" — how many rows scanned vs returned.
  
  3. Nested loop when hash join expected (or vice versa):
     Causes: work_mem too low (forces nested loop over hash join), stale statistics.
     Fix: SET enable_hashjoin = ON; SET work_mem = '256MB'; then re-test.
  
  4. Sort spilling to disk:
     EXPLAIN ANALYZE shows: "Sort Method: external merge  Disk: 450kB"
     Fix: SET work_mem = '256MB'; or add an index that already provides sorted order.

OR CONDITIONS AND INDEXES:
  WHERE a = 1 OR b = 2 cannot use a single index on (a, b) directly.
  PostgreSQL solution: BitmapOr of two separate bitmap index scans.
    Bitmap Index Scan on idx_a → bitmap1
    Bitmap Index Scan on idx_b → bitmap2
    BitmapOr(bitmap1, bitmap2) → Bitmap Heap Scan
  
  So: separate indexes on (a) and (b) handle OR better than composite (a, b).

CTE BEHAVIOR (PostgreSQL version matters):
  Pre-13: WITH cte AS (...) always materialized. Fence = no predicate pushdown.
  13+: CTEs inlined by default unless:
    - RECURSIVE (always materialized)
    - CTE referenced more than once (might materialize for efficiency)
    - WITH ... AS MATERIALIZED (explicit)
  
  To force inline in any version: SELECT * FROM (SELECT ...) subq WHERE ...
  To force fence in 13+: WITH cte AS MATERIALIZED (SELECT ...) SELECT ...

PARALLEL QUERY:
  PostgreSQL can use multiple workers for seq scans, aggregates, hash joins, sorts.
  max_parallel_workers_per_gather = 2 (default). max_parallel_workers = 8 (default).
  
  min_parallel_table_scan_size = 8MB (table must be at least this big for parallelism).
  min_parallel_index_scan_size = 512kB.
  
  Check if parallel is used: EXPLAIN shows "Workers Planned: 2" and "Gather" node.
  Disable for debugging: SET max_parallel_workers_per_gather = 0;
    `,
    code: `
-- ===== QUERY OPTIMIZATION & EXPLAIN ANALYZE — SQL EXAMPLES =====

-- EXAMPLE 1: Reading EXPLAIN ANALYZE output — annotated

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY, customer_id BIGINT,
  status TEXT, amount NUMERIC, created_at TIMESTAMPTZ
);
CREATE INDEX idx_orders_customer ON orders (customer_id);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.amount, o.status
FROM orders o
WHERE o.customer_id = 42 AND o.status = 'pending';

/* Example output:
Index Scan using idx_orders_customer on orders  (cost=0.43..45.32 rows=3 width=32)
                                                 (actual time=0.048..0.071 rows=2 loops=1)
  Index Cond: (customer_id = 42)
  Filter: ((status)::text = 'pending')       ← Applied AFTER index lookup (not in index!)
  Rows Removed by Filter: 7                  ← 7 rows fetched from heap, 5 discarded
  Buffers: shared hit=12                     ← 12 buffer pool hits (0 disk reads — fully cached)
Planning Time: 0.123 ms
Execution Time: 0.142 ms

Key observations:
- rows=3 (estimated) vs rows=2 (actual): close estimate — stats are fresh
- "Filter" after Index Cond = heap rows fetched then filtered (status not in index)
- Fix: CREATE INDEX ON orders (customer_id, status) — status in composite index avoids heap fetch
- Buffers: shared hit=12, read=0 — fully in cache, no disk I/O
*/

-- EXAMPLE 2: Diagnosing a bad row estimate → slow query

-- After a bulk load of 10M rows:
COPY orders FROM '/data/orders.csv' CSV HEADER;
-- Statistics still show old count!

EXPLAIN (ANALYZE) SELECT COUNT(*) FROM orders WHERE status = 'shipped';
/* Planner estimates rows=1000 (stale). Chooses seq scan.
   Actually 3M rows. Plan is now "accidentally correct" — seq scan IS optimal for 3M rows.
   But if it chose a bad join order based on wrong estimate, query could be 100× slower.
*/

-- Fix: update statistics immediately after bulk load
ANALYZE orders;

-- Verify statistics are fresh:
SELECT
  tablename,
  attname,
  n_distinct,
  most_common_vals,
  most_common_freqs
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'status';

-- EXAMPLE 3: OR condition — how PostgreSQL handles it with BitmapOr

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY, category TEXT, brand TEXT, price NUMERIC
);
CREATE INDEX idx_prod_category ON products (category);
CREATE INDEX idx_prod_brand    ON products (brand);

EXPLAIN SELECT * FROM products WHERE category = 'Electronics' OR brand = 'Samsung';
/* BitmapOr output:
Bitmap Heap Scan on products
  Recheck Cond: ((category = 'Electronics') OR (brand = 'Samsung'))
  ->  BitmapOr
        ->  Bitmap Index Scan on idx_prod_category
              Index Cond: (category = 'Electronics')
        ->  Bitmap Index Scan on idx_prod_brand
              Index Cond: (brand = 'Samsung')

Two separate bitmap scans combined with BitmapOr → one heap scan in page order.
Better than two separate index scans (avoids duplicate heap fetches).
*/

-- EXAMPLE 4: CTE optimization fence — before and after PostgreSQL 13

-- Table: user_events (user_id, event_type, created_at)
CREATE INDEX ON user_events (event_type, created_at);

-- Pre-13 behavior (CTE always materialized — fence):
-- EXPLAIN shows: CTE Scan, not Index Scan
WITH recent_purchases AS (
  SELECT user_id, created_at
  FROM user_events
  WHERE event_type = 'purchase'                -- Predicate INSIDE cte: can use index
)
SELECT * FROM recent_purchases
WHERE created_at > NOW() - INTERVAL '7 days';  -- This predicate NOT pushed into CTE in pre-13

-- Post-13 default (inlined — planner combines predicates):
-- EXPLAIN shows: Index Scan with both conditions combined

-- Force materialization (fence) in 13+:
WITH recent_purchases AS MATERIALIZED (
  SELECT user_id, created_at FROM user_events WHERE event_type = 'purchase'
)
SELECT * FROM recent_purchases WHERE created_at > NOW() - INTERVAL '7 days';
-- EXPLAIN: CTE Scan (materialized) — explicitly fenced

-- Use MATERIALIZED when: CTE used multiple times in the query (avoid recomputation)
-- Don't use MATERIALIZED when: CTE used once and you want predicate pushdown

-- EXAMPLE 5: pg_stat_statements — finding slowest queries in production

-- Enable (one time, as superuser):
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find top-10 queries by total execution time:
SELECT
  round(total_exec_time::numeric, 2)  AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2)   AS avg_ms,
  round(stddev_exec_time::numeric, 2) AS stddev_ms,
  round(total_exec_time / sum(total_exec_time) OVER () * 100, 1) AS pct_total,
  LEFT(query, 100)                    AS query_snippet
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Find queries with worst estimates (actual vs planned rows mismatch):
-- Use pg_stat_statements combined with EXPLAIN on identified queries.

-- Reset stats (do before a load test to get clean measurements):
SELECT pg_stat_statements_reset();

-- EXAMPLE 6: work_mem and sort spill diagnosis

-- Identify sorts spilling to disk in current session:
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id
ORDER BY SUM(amount) DESC;

/* If output shows:
   Sort  (cost=... actual time=...)
     Sort Key: (sum(orders.amount)) DESC
     Sort Method: external merge  Disk: 32600kB  ← SPILL TO DISK
   Fix:
*/
SET work_mem = '256MB';  -- Current session only

EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id ORDER BY SUM(amount) DESC;
-- Sort Method: quicksort  Memory: 2048kB  ← In memory now

RESET work_mem;

-- EXAMPLE 7: Subquery vs JOIN vs CTE — performance comparison

-- Scenario: Find customers who have placed orders > ₹50,000

-- Method 1: Correlated subquery (SLOW for large tables — O(n) subquery per outer row)
EXPLAIN ANALYZE
SELECT * FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.amount > 50000
);
-- Often good if EXISTS short-circuits; PostgreSQL may optimize to semi-join anyway

-- Method 2: JOIN with DISTINCT (planner may use same semi-join plan as EXISTS)
EXPLAIN ANALYZE
SELECT DISTINCT c.*
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.amount > 50000;

-- Method 3: IN subquery (PostgreSQL 13+: usually same plan as EXISTS)
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE amount > 50000);

-- Check if plans are identical:
-- PostgreSQL usually rewrites these to equivalent HashJoin or MergeJoin semi-join plans.
-- Actual performance difference: negligible with modern planner.
-- Code readability: use EXISTS for "does any row exist" semantics.
-- Use JOIN when you need columns from both tables.

-- EXAMPLE 8: Parallel query — enabling and monitoring

-- Show current parallel settings:
SHOW max_parallel_workers_per_gather;
SHOW max_parallel_workers;

-- Force parallel for testing (lower threshold):
SET min_parallel_table_scan_size = '0';  -- Parallelize even small tables
SET max_parallel_workers_per_gather = 4;

EXPLAIN (ANALYZE, BUFFERS)
SELECT category, SUM(amount) FROM orders GROUP BY category;
/* With parallelism:
Finalize GroupAggregate
  ->  Gather
        Workers Planned: 2
        Workers Launched: 2      ← 2 parallel workers used
        ->  Partial GroupAggregate
              ->  Parallel Seq Scan on orders
*/

RESET min_parallel_table_scan_size;
RESET max_parallel_workers_per_gather;
    `,
    bugs: `
REAL PRODUCTION BUGS FROM QUERY OPTIMIZATION MISUNDERSTANDING:
---------------------------------------------------------------

BUG 1: Stale statistics after ETL load — planner chooses wrong join algorithm, query 100× slower
  Scenario: Nightly ETL loaded 50M new rows into sales_fact table. Morning reports ran for 4 hours
    (normally 3 minutes). No schema changes, no infrastructure changes.
  Root cause: ANALYZE not run after ETL load. pg_statistic still showed old row count (2M, not 52M).
    Planner estimated a hash join would fit in work_mem (based on 2M rows). With 52M rows: enormous spill.
    Also: join order wrong — planner chose small-table as inner, which was actually larger.
  Fix: Add ANALYZE to end of ETL pipeline (mandatory, like COMMIT):
    COPY sales_fact FROM ... ;
    ANALYZE sales_fact;
    -- Or: use CREATE STATISTICS for correlated columns that affect estimates.
  Result: queries back to 3 minutes after ANALYZE.

BUG 2: random_page_cost set for HDD on an SSD server — index scans avoided unnecessarily
  Scenario: Cloud PostgreSQL instance on NVMe SSD. Simple primary key lookups using sequential scans
    instead of index scans for queries returning ~5% of rows. Performance was 10× worse than expected.
  Root cause: random_page_cost default = 4.0 (assumes HDD where random reads are 4× slower than sequential).
    On SSD: random reads are nearly as fast as sequential reads.
    With random_page_cost = 4.0: planner over-penalizes index scans → prefers seq scan too often.
  Fix in postgresql.conf (for SSD servers):
    random_page_cost = 1.1    # SSD: random ≈ sequential
    effective_cache_size = '48GB'  # Reflect actual OS page cache + shared_buffers
  After fix: index scans used appropriately, query time dropped from 800ms to 12ms.

BUG 3: CTE optimization fence causing full table scan (pre-PostgreSQL 13)
  Scenario: Query ran in 50ms on dev (PostgreSQL 14). Identical query on production (PostgreSQL 12) ran 45 seconds.
  Root cause: CTE materialized in PostgreSQL 12. The CTE selected from a 100M row table.
    Outer WHERE clause (date filter) not pushed inside the CTE — full 100M row materialization.
    In PostgreSQL 14: CTE inlined, date filter pushed inside → only 10K rows materialized.
  Fix for PostgreSQL 12:
    Move the date filter INSIDE the CTE:
    WITH filtered AS (SELECT * FROM events WHERE created_at > NOW() - INTERVAL '7 days')
    -- Not: WITH all_events AS (SELECT * FROM events) ... WHERE created_at > ...
  General rule: always put as many filters as possible INSIDE the CTE, not in the outer query.

BUG 4: Missing index on FK column — full table scan on every join
  Scenario: "Get orders with customer city" query ran fine for years. After customer table grew to 5M rows:
    query suddenly took 12 seconds (was 200ms). No schema changes.
  Root cause: Joining orders (10M rows) to customers (5M rows) via orders.customer_id.
    No index on orders.customer_id. Join algorithm: hash join was using seq scan of orders.
    At 10M orders: hash build table too large for work_mem → batch spill to disk.
    Also: plan switched from nested loop (fast with small customer table) to hash join (slow without index).
  Fix:
    CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);
    Now: nested loop join using index on orders.customer_id — back to 180ms.
  Prevention: always create an index on every FK column (automatic in some databases, not PostgreSQL).

BUG 5: Work_mem set too high globally — out of memory crashes under concurrent load
  Scenario: DBA saw hash join spills in EXPLAIN. Set work_mem = '2GB' in postgresql.conf globally.
    Next day under production load: PostgreSQL OOM-killed by Linux kernel. Server crash.
  Root cause: work_mem is PER SORT/HASH OPERATION, PER SESSION, and can be multiplied by parallel workers.
    200 concurrent sessions × 5 operations each × 2GB = 2 TERABYTES potentially allocated.
    Actual RAM: 64GB. OOM inevitable.
  Fix: Keep work_mem globally conservative (4MB-64MB). Increase per-session for known heavy queries:
    SET work_mem = '512MB';  -- In the application layer, before the specific heavy query only
    RESET work_mem;           -- Reset immediately after
  Formula: work_mem_safe = RAM / (max_connections × expected_concurrent_sorts × parallel_workers)
    For 64GB RAM, 200 connections, 3 sorts/query, 2 workers: 64GB / (200×3×2) ≈ 55MB per sort.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — READ THE EXPLAIN OUTPUT:
  Interpret this EXPLAIN (ANALYZE, BUFFERS) output:

  Hash Join  (cost=1842.00..9823.47 rows=12450 width=52) (actual time=18.234..142.331 rows=3 loops=1)
    Hash Cond: (o.customer_id = c.id)
    Buffers: shared hit=4821 read=1204
    ->  Seq Scan on orders o  (cost=0.00..7115.00 rows=500000 width=28)
                               (actual time=0.012..89.443 rows=500000 loops=1)
          Filter: (amount > 100000)
          Rows Removed by Filter: 490000
          Buffers: shared hit=3814 read=1204
    ->  Hash  (cost=1230.00..1230.00 rows=49760 width=24) (actual time=17.902..17.902 rows=49760 loops=1)
          Buckets: 65536  Batches: 1  Memory Usage: 3187kB
          Buffers: shared hit=1007
          ->  Seq Scan on customers c  (cost=0.00..1230.00 rows=49760 width=24)
                                        (actual time=0.010..8.234 rows=49760 loops=1)
  Planning Time: 1.203 ms
  Execution Time: 142.451 ms

  Answer these questions:
  a) Which table is the "build" side and which is the "probe" side of the hash join? Why?
  b) rows=12450 (estimated) vs rows=3 (actual) — what does this massive discrepancy indicate?
     What should you do to fix it?
  c) "Rows Removed by Filter: 490000" — what does this tell you about the orders scan?
     What would fix this? Write the CREATE INDEX statement.
  d) Batches: 1 — what does this mean? Would Batches: 4 be better or worse?
  e) Buffers: shared read=1204 (orders scan) vs read=0 (customers scan) — why the difference?

CHALLENGE 2 — FIX THE SLOW QUERY:
  This query takes 8 seconds on a 5M row events table. Fix it.

  -- Slow:
  SELECT
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS events,
    COUNT(DISTINCT user_id) AS unique_users
  FROM user_events
  WHERE
    EXTRACT(YEAR FROM created_at) = 2024 AND  -- Bug 1: function prevents index use
    event_type IN ('purchase', 'signup') AND
    UPPER(country) = 'INDIA'                  -- Bug 2: function prevents index use
  GROUP BY 1
  ORDER BY 1;

  Existing indexes: (created_at), (event_type), (country)

  a) Explain why each "Bug" prevents index use.
  b) Rewrite the WHERE clause to use the existing indexes.
  c) Design the optimal composite index for this query (considering the GROUP BY too).
  d) Would a partial index help here? Write it if yes.

CHALLENGE 3 — BUILD A QUERY HEALTH DASHBOARD:
  Write a comprehensive PostgreSQL monitoring query set for production use.

  Query 1: "Slow Query Report"
  Using pg_stat_statements, show the top 15 queries by total_exec_time.
  Include: calls, avg_ms, total_ms, stddev_ms, % of total DB time, first 120 chars of query.
  Add: a "severity" column — 'CRITICAL' if avg_ms > 1000, 'WARNING' if > 100, else 'OK'.

  Query 2: "Missing FK Indexes"
  Find all foreign key columns that have no index (a common oversight).
  Join pg_constraint, pg_attribute, pg_class, pg_indexes.
  Output: table name, column name, referenced table — "these FK columns have no index."

  Query 3: "Table Bloat Estimate"
  Using pg_class and pg_stat_user_tables, estimate bloat.
  dead_tuple_ratio = n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)
  Show: table, live rows, dead rows, dead%, table size, estimated wasted space.
  Flag tables where dead% > 15% as needing VACUUM.

  Query 4: "Long-Running Queries Alert"
  From pg_stat_activity, find queries running longer than 30 seconds.
  Show: pid, duration, state, wait_event_type, wait_event, truncated query.
  Include: the pg_terminate_backend() call to kill each (as a CASE statement or comment).
    `,
    summary: `EXPLAIN ANALYZE is the single most important diagnostic tool in PostgreSQL — reading its output tells you exactly why a query is slow (wrong algorithm, wrong index, wrong statistics, memory spill) and what to fix. The three-step optimization process is: run EXPLAIN ANALYZE, identify the largest discrepancy between estimated and actual rows (indicates stale statistics), and check whether the expensive scan has a usable index or needs one created. pg_stat_statements in production tells you which queries to optimize next.`
  },

  {
    id: 8,
    title: "Advanced SQL Patterns",
    tag: "UNLOCKING THE FULL POWER OF SQL",
    color: "#4C1D95",
    tldr: `Beyond basic SELECT, PostgreSQL offers a rich set of advanced features that eliminate entire categories of application-layer complexity: recursive CTEs traverse tree structures in pure SQL; UPSERT atomically inserts or updates without race conditions; JSONB stores and queries semi-structured data with GIN-indexed operators; full-text search ranks documents by relevance; LATERAL joins run correlated subqueries per row; and GENERATE_SERIES creates synthetic date spines for gap-free reporting. Together these patterns replace entire microservices with a few lines of SQL.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I need to query a category tree — do I have to do this in application code with recursive function calls?"
  → No. WITH RECURSIVE in SQL traverses any depth of adjacency-list hierarchy in one query.
  → No N+1 queries. No application logic. Runs server-side with a single round-trip.

"My INSERT OR UPDATE pattern has a race condition — two concurrent INSERTs both find no existing row"
  → Classic "check-then-act" race: both check if row exists (no), both try to insert → duplicate key error.
  → Fix: INSERT ... ON CONFLICT DO UPDATE — atomic at the database level. No race condition possible.

"I'm storing user preferences in a JSONB column — how do I query and index it efficiently?"
  → JSONB: binary JSON with GIN index support. Query operators: @> (contains), ? (key exists), #>> (path).
  → CREATE INDEX ON users USING GIN (preferences); — enables fast @> containment queries.

"Full-text search with LIKE '%keyword%' is slow and doesn't rank by relevance"
  → LIKE '%keyword%' = full table scan. No ranking. No stemming. No synonym support.
  → tsvector + tsquery + GIN index: O(1) lookup for matching documents, ranked by ts_rank().
  → Handles stemming: 'running' matches 'run', 'runs'. Handles stop words (the, a, is).

"I need to get the top 3 orders for EACH customer — how without N+1 or complex joins?"
  → LATERAL join: runs a subquery once per outer row. Like a for-loop in SQL.
  → SELECT c.*, top_orders.* FROM customers c, LATERAL (SELECT * FROM orders WHERE customer_id = c.id ORDER BY amount DESC LIMIT 3) top_orders;
    `,
    analogy: `
ADVANCED SQL PATTERNS — ANALOGIES:
------------------------------------

RECURSIVE CTE = A FAMILY TREE SEARCH ALGORITHM IN ONE QUERY:
  You're building a family tree app. Data: person_id, name, parent_id.
  Naive approach: fetch root, then fetch root's children, then their children — N database round trips.
  WITH RECURSIVE: give me the root, then keep following parent→child links until no more children.
  It's like telling the database: "Start here. Keep going deeper until you hit leaves. Return everyone."
  One query, one round trip, any depth. The database does the recursive work server-side.

UPSERT = AN "UPDATE OR INSERT" VENDING MACHINE:
  You put a coin in (try to INSERT).
  Slot already has something (duplicate key)? REPLACE it (DO UPDATE).
  Slot empty? Fill it with new product (INSERT succeeds).
  
  No race condition: the decision is made atomically by the database.
  No "check if exists, then insert or update" — that pattern has a TOCTOU gap.
  INSERT ... ON CONFLICT DO UPDATE is one atomic operation.

JSONB = A LABELED FILING CABINET INSIDE A TABLE COLUMN:
  Traditional column: one piece of paper per slot. Fixed format.
  JSONB column: an entire filing cabinet per row. Flexible structure. Each row's cabinet can look different.
  
  GIN index on JSONB: an index that points to every label in every cabinet.
  "Find all rows where the cabinet contains a label 'city' = 'Mumbai'" → GIN index lookup, not full scan.
  
  @> operator: "contains" — does this JSON object contain this subset?
  ? operator: "key exists" — is this key present in the JSON object?

FULL-TEXT SEARCH = A SMART LIBRARIAN vs A DUMB CTRL+F:
  LIKE '%keyword%' = CTRL+F: finds exact string match. No intelligence. Reads every page.
  Full-text search = librarian: "Books about running" → finds running, runs, ran, runner.
    Ranks by relevance (how many times the word appears, in title vs body).
    Skips stop words (the, a, in, is).
    One lookup in the index → matching documents in milliseconds.
  
  tsvector: pre-processed document ("running → run, books → book, the → [removed]")
  tsquery: pre-processed search query ("running & books" → "run & book")
  GIN index: the librarian's card catalog. O(1) lookup by lexeme.

LATERAL JOIN = A FOR-LOOP INSIDE SQL:
  Normal subquery: runs ONCE for the entire outer query.
  LATERAL subquery: runs ONCE PER ROW of the outer query (but as a set, not nested queries).
  
  Like Python: [get_top_orders(customer) for customer in customers]
    But in SQL, it's one query, not a loop that makes N database calls.
  
  Use when: you need to run a complex subquery "for each row" of the outer table.
  Examples: top-N per group, apply a function to each row, pagination per group.

GENERATE_SERIES = CREATING A PERFECTLY UNIFORM RULER:
  Problem: "Daily revenue for January." But some days had zero orders — they're missing from orders table.
  JOIN with orders: those days disappear from results.
  GENERATE_SERIES('2024-01-01', '2024-01-31', INTERVAL '1 day'): 31 rows, one per day, guaranteed.
  LEFT JOIN orders to this series: zero-revenue days appear as 0 instead of missing.
  Perfect for: time-series reports, gap detection, synthetic test data.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ADVANCED PATTERN INTERNALS:
-------------------------------------------------------

RECURSIVE CTEs:
  WITH RECURSIVE cte AS (
    anchor_query          -- Non-recursive base case (seed rows)
    UNION ALL
    recursive_query       -- References cte itself, adds new rows each iteration
  )
  SELECT * FROM cte;
  
  Execution:
    1. Run anchor query → initial result set (iteration 0).
    2. Run recursive query with input = previous iteration's result → new rows (iteration 1).
    3. Repeat until recursive query returns 0 rows (termination).
    4. Final result = UNION ALL of all iterations.
  
  UNION vs UNION ALL:
    UNION ALL: include all rows, including duplicates. Faster. Use when no cycles.
    UNION: deduplicate between iterations. Slower but handles cycles automatically.
  
  Cycle prevention (for graphs with cycles):
    Track visited node IDs in an array:
    ARRAY[root_id] AS path, root_id = ANY(path) AS is_cycle
  
  Termination guarantee: always required. If recursive query always returns rows → infinite loop.
  Depth limit: no built-in limit. Protect with: WHERE depth < 100 or cycle detection.
  
  Applications:
    Org chart traversal (employees → managers)
    Category hierarchy (categories → parent_categories)
    Bill of materials (products → component parts → sub-components)
    Graph shortest path (with careful design)
    Calendar/date series (generate recursive date ranges)

UPSERT — INSERT ... ON CONFLICT:
  INSERT INTO table (cols) VALUES (vals)
  ON CONFLICT (conflict_target)
  DO UPDATE SET col = EXCLUDED.col
  
  conflict_target: unique column(s) or constraint name.
    ON CONFLICT (email) — single unique column
    ON CONFLICT (user_id, date) — composite unique key
    ON CONFLICT ON CONSTRAINT constraint_name — named constraint
  
  EXCLUDED: the virtual table of the rows that would have been inserted.
    SET updated_at = EXCLUDED.updated_at updates with the would-be-inserted value.
    SET count = table.count + 1 uses the existing row's value.
  
  DO NOTHING: silently ignore conflicts (idempotent inserts).
    INSERT INTO settings (key, value) VALUES ('theme', 'dark')
    ON CONFLICT (key) DO NOTHING; -- Don't overwrite existing user preference
  
  Conditional update: only update if new value is "better":
    ON CONFLICT (id) DO UPDATE SET amount = GREATEST(EXCLUDED.amount, table.amount);
  
  Atomicity: the entire INSERT + conflict check + UPDATE is one atomic operation.
    No gap for concurrent sessions to insert a duplicate between check and action.

JSONB OPERATORS AND INDEXING:
  ->  : returns JSONB value by key/index. data->'city' → "Mumbai" (JSONB string)
  ->> : returns TEXT value by key/index. data->>'city' → Mumbai (plain text, comparable)
  #>  : returns JSONB at path. data#>'{address,city}' → "Mumbai"
  #>> : returns TEXT at path. data#>>'{address,city}' → Mumbai
  @>  : contains. data @> '{"city":"Mumbai"}' → true if object contains this subset
  <@  : is contained by. '{"city":"Mumbai"}' <@ data → same, reversed
  ?   : key exists. data ? 'city' → true if top-level key 'city' exists
  ?|  : any key exists. data ?| ARRAY['city','country'] → true if either key exists
  ?&  : all keys exist. data ?& ARRAY['city','country'] → true if both keys exist
  ||  : concatenate/merge. data || '{"extra":true}' → merged object
  -   : remove key. data - 'temp_field' → object without key
  
  Index types:
    GIN (Generalized Inverted Index): for @>, ?, ?|, ?& operators. Index ALL keys.
      CREATE INDEX ON profiles USING GIN (preferences);
    GIN with jsonb_path_ops: smaller index, only supports @>. Better for @> heavy workloads.
      CREATE INDEX ON profiles USING GIN (preferences jsonb_path_ops);
    B-tree on extracted value: for equality/range on specific key.
      CREATE INDEX ON profiles ((data->>'city')); -- Text B-tree for city lookups

FULL-TEXT SEARCH:
  tsvector: processed document. Reduces words to lexemes. Removes stop words.
    to_tsvector('english', 'PostgreSQL is running fast') → 'fast':4 'postgresql':1 'run':3
    Stored in a column: ALTER TABLE articles ADD COLUMN fts_vector TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
  
  tsquery: processed search query.
    to_tsquery('english', 'running & database') → 'run' & 'databas'
    plainto_tsquery: parses natural language (no operators needed). Best for user input.
    phraseto_tsquery: matches exact phrase sequence.
    websearch_to_tsquery: Google-like syntax (quotes for phrases, minus for exclusion).
  
  GIN index on tsvector column: fast lookup.
    CREATE INDEX ON articles USING GIN (fts_vector);
  
  Matching operator: @@ (document @@ query)
    fts_vector @@ to_tsquery('english', 'database & fast') → true/false
  
  Ranking:
    ts_rank(fts_vector, query): term frequency ranking.
    ts_rank_cd(fts_vector, query): cover density (proximity of terms) ranking.
    Higher = more relevant.

LATERAL JOINS:
  SELECT outer.*, inner.*
  FROM outer_table outer
  CROSS JOIN LATERAL (
    SELECT * FROM inner_table WHERE inner_table.outer_id = outer.id
    ORDER BY some_col LIMIT 3
  ) AS inner;
  
  The LATERAL keyword: allows the subquery to reference columns from the outer query.
  Without LATERAL: subquery can't reference outer.id (evaluated independently).
  
  Performance: PostgreSQL executes the lateral subquery once per outer row.
    With proper index on inner_table.outer_id: O(outer_rows × log(inner_rows)).
    N+1 semantics but in SQL — one query, no round trips.
  
  LEFT JOIN LATERAL: include outer rows even when lateral subquery returns no rows.
    (Like LEFT JOIN but subquery can reference outer row columns.)
  
  Use cases:
    Top-N per group (more readable than window function approach for complex cases)
    Apply a function or aggregate per row
    Unnest and process arrays per row
    Row-by-row JSON transformation

FILTER CLAUSE IN AGGREGATES:
  COUNT(*) FILTER (WHERE condition): count only rows matching condition.
  SUM(col) FILTER (WHERE status = 'delivered'): sum only delivered orders.
  
  Equivalent to: SUM(CASE WHEN status='delivered' THEN col ELSE 0 END)
  But cleaner, more readable, and can be used with any aggregate function.
  
  Pivot table use:
    SELECT
      month,
      COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
      COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM orders
    GROUP BY month;
    `,
    code: `
-- ===== ADVANCED SQL PATTERNS — SQL EXAMPLES =====

-- EXAMPLE 1: Recursive CTE — category tree traversal with depth and path
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, parent_id BIGINT REFERENCES categories(id)
);
INSERT INTO categories VALUES
  (1,'All Products',NULL),(2,'Electronics',1),(3,'Clothing',1),(4,'Phones',2),
  (5,'Laptops',2),(6,'Smartphones',4),(7,'Feature Phones',4),(8,'Gaming Laptops',5),
  (9,'Men',3),(10,'Women',3),(11,'T-Shirts',9);

WITH RECURSIVE category_path AS (
  -- Anchor: root categories
  SELECT
    id, name, parent_id,
    0                 AS depth,
    ARRAY[id]         AS path_ids,
    name::TEXT        AS full_path
  FROM categories WHERE parent_id IS NULL

  UNION ALL

  -- Recursive: children of current level
  SELECT
    c.id, c.name, c.parent_id,
    cp.depth + 1,
    cp.path_ids || c.id,
    cp.full_path || ' > ' || c.name
  FROM categories c
  JOIN category_path cp ON c.parent_id = cp.id
  WHERE NOT c.id = ANY(cp.path_ids)  -- Cycle protection
)
SELECT
  id,
  repeat('  ', depth) || name     AS indented_name,
  depth,
  full_path,
  array_length(path_ids, 1) - 1   AS level_count
FROM category_path
ORDER BY path_ids;

-- Get all ancestors of a given node (path to root):
WITH RECURSIVE ancestors AS (
  SELECT id, name, parent_id FROM categories WHERE id = 6  -- Smartphones

  UNION ALL

  SELECT c.id, c.name, c.parent_id
  FROM categories c
  JOIN ancestors a ON c.id = a.parent_id
)
SELECT id, name FROM ancestors ORDER BY id;
-- Returns: 6 Smartphones, 4 Phones, 2 Electronics, 1 All Products

-- EXAMPLE 2: UPSERT — atomic insert-or-update patterns

CREATE TABLE product_inventory (
  product_id  BIGINT  PRIMARY KEY,
  warehouse   TEXT    NOT NULL DEFAULT 'main',
  stock       INT     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upsert: insert new product stock or update existing quantity
INSERT INTO product_inventory (product_id, stock, updated_at)
VALUES (101, 50, NOW())
ON CONFLICT (product_id)
DO UPDATE SET
  stock      = product_inventory.stock + EXCLUDED.stock,  -- Add to existing stock
  updated_at = EXCLUDED.updated_at;
-- Atomic: no race condition between "check exists" and "insert/update"

-- Idempotent insert (event deduplication — common in Kafka consumers):
CREATE TABLE processed_events (
  event_id   UUID PRIMARY KEY,
  payload    JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO processed_events (event_id, payload)
VALUES ('3f2504e0-4f89-11d3-9a0c-0305e82c3301', '{"type":"payment","amount":5000}')
ON CONFLICT (event_id) DO NOTHING;  -- Safe to call multiple times — exactly-once semantics

-- Conditional upsert: only update if new price is lower (price floor protection):
CREATE TABLE price_history (
  product_id BIGINT PRIMARY KEY,
  min_price  NUMERIC(10,2),
  current_price NUMERIC(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO price_history (product_id, min_price, current_price)
VALUES (101, 999.00, 1299.00)
ON CONFLICT (product_id)
DO UPDATE SET
  min_price     = LEAST(price_history.min_price, EXCLUDED.current_price),
  current_price = EXCLUDED.current_price,
  updated_at    = NOW()
WHERE EXCLUDED.current_price <> price_history.current_price;  -- Only if price actually changed

-- EXAMPLE 3: JSONB — flexible user preferences with GIN indexing

CREATE TABLE user_profiles (
  user_id     BIGINT PRIMARY KEY,
  name        TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'
);

-- GIN index for fast containment queries:
CREATE INDEX idx_profiles_prefs_gin ON user_profiles USING GIN (preferences);

INSERT INTO user_profiles VALUES
  (1, 'Priya Sharma',  '{"theme":"dark","lang":"hi","city":"Mumbai","notifications":{"email":true,"sms":false}}'),
  (2, 'Rohan Mehta',   '{"theme":"light","lang":"en","city":"Delhi","notifications":{"email":true,"sms":true}}'),
  (3, 'Ananya Patel',  '{"theme":"dark","lang":"en","city":"Bangalore","notifications":{"email":false,"sms":true}}');

-- Find users with dark theme in Mumbai (uses GIN index):
SELECT user_id, name FROM user_profiles
WHERE preferences @> '{"theme":"dark","city":"Mumbai"}';
-- Returns Priya only

-- Find users with email notifications enabled (nested JSON path):
SELECT user_id, name FROM user_profiles
WHERE preferences @> '{"notifications":{"email":true}}';

-- Extract a specific value (text):
SELECT user_id, preferences->>'city' AS city FROM user_profiles;

-- Update a specific key without replacing the whole object:
UPDATE user_profiles
SET preferences = preferences || '{"theme":"system"}'  -- Merge: overwrite theme key only
WHERE user_id = 1;

-- Remove a key:
UPDATE user_profiles
SET preferences = preferences - 'lang'
WHERE user_id = 2;

-- Aggregate: count users per city from JSONB:
SELECT
  preferences->>'city'   AS city,
  COUNT(*)               AS user_count
FROM user_profiles
GROUP BY preferences->>'city'
ORDER BY user_count DESC;

-- EXAMPLE 4: Full-text search — product catalog search with ranking

CREATE TABLE products (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  fts_vector  TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||        -- Title: highest weight
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||  -- Desc: medium
    setweight(to_tsvector('english', COALESCE(category, '')), 'C')    -- Category: lower
  ) STORED
);

-- GIN index on generated tsvector column:
CREATE INDEX idx_products_fts ON products USING GIN (fts_vector);

INSERT INTO products (name, description, category) VALUES
  ('Samsung Galaxy S24', 'Flagship Android smartphone with AI features and 200MP camera', 'Smartphones'),
  ('iPhone 15 Pro', 'Apple flagship phone with titanium design and A17 Pro chip', 'Smartphones'),
  ('OnePlus 12', 'Fast charging flagship with Snapdragon 8 Gen 3 processor', 'Smartphones'),
  ('Dell XPS 15', 'Premium laptop for creators with OLED display', 'Laptops');

-- Full-text search: "flagship android camera" (phrase-style with websearch syntax)
SELECT
  id,
  name,
  ts_rank(fts_vector, query)    AS rank,
  ts_headline('english', description, query, 'MaxWords=20, MinWords=5') AS snippet
FROM products,
     websearch_to_tsquery('english', 'flagship android camera') AS query
WHERE fts_vector @@ query
ORDER BY rank DESC;

-- Returns Samsung (matches flagship, android, camera in description) ranked first
-- ts_headline: shows matched keywords highlighted in the snippet

-- EXAMPLE 5: LATERAL join — top 3 orders per customer without window functions

SELECT
  c.id    AS customer_id,
  c.name  AS customer_name,
  top_o.order_id,
  top_o.amount,
  top_o.status
FROM customers c
CROSS JOIN LATERAL (
  SELECT id AS order_id, amount, status
  FROM orders
  WHERE customer_id = c.id          -- References outer row!
  ORDER BY amount DESC
  LIMIT 3
) AS top_o
ORDER BY c.id, top_o.amount DESC;

-- LEFT JOIN LATERAL: include customers with no orders (lateral returns empty → include anyway)
SELECT c.id, c.name, COALESCE(last_order.amount, 0) AS last_order_amount
FROM customers c
LEFT JOIN LATERAL (
  SELECT amount FROM orders
  WHERE customer_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) AS last_order ON TRUE;  -- ON TRUE because lateral already handles the join condition

-- EXAMPLE 6: FILTER clause — pivot table without CASE WHEN

-- Monthly order status breakdown — compact with FILTER:
SELECT
  DATE_TRUNC('month', created_at)::DATE                          AS month,
  COUNT(*)                                                        AS total_orders,
  COUNT(*) FILTER (WHERE status = 'delivered')                   AS delivered,
  COUNT(*) FILTER (WHERE status = 'pending')                     AS pending,
  COUNT(*) FILTER (WHERE status = 'cancelled')                   AS cancelled,
  SUM(amount) FILTER (WHERE status = 'delivered')                AS delivered_revenue,
  SUM(amount) FILTER (WHERE status = 'cancelled')                AS cancelled_revenue,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'cancelled')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  )                                                               AS cancel_rate_pct
FROM orders
GROUP BY 1
ORDER BY 1;

-- EXAMPLE 7: GENERATE_SERIES — date spine for gap-free reports

-- Daily revenue report — ensures days with zero orders appear (not missing!)
WITH date_spine AS (
  SELECT generate_series(
    '2024-01-01'::DATE,
    '2024-01-31'::DATE,
    INTERVAL '1 day'
  )::DATE AS day
),
daily_revenue AS (
  SELECT
    created_at::DATE AS day,
    COUNT(*)         AS orders,
    SUM(amount)      AS revenue
  FROM orders
  WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
  GROUP BY created_at::DATE
)
SELECT
  ds.day,
  COALESCE(dr.orders,  0) AS orders,
  COALESCE(dr.revenue, 0) AS revenue
FROM date_spine ds
LEFT JOIN daily_revenue dr ON dr.day = ds.day
ORDER BY ds.day;
-- Every January day appears, zero-revenue days show 0 not missing row

-- Generate series for test data (1 million synthetic orders):
INSERT INTO orders (customer_id, amount, status, created_at)
SELECT
  (random() * 10000)::BIGINT + 1            AS customer_id,
  round((random() * 50000)::NUMERIC, 2)     AS amount,
  (ARRAY['pending','shipped','delivered','cancelled'])[ceil(random()*4)::INT] AS status,
  NOW() - (random() * INTERVAL '365 days')  AS created_at
FROM generate_series(1, 1000000);
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ADVANCED SQL PATTERN MISUNDERSTANDING:
-----------------------------------------------------------------

BUG 1: Recursive CTE without cycle detection — infinite loop crashes the server
  Scenario: Org chart query ran fine in staging (clean data). In production: ran for 45 minutes, consumed
    all memory, server OOM-killed. Data entry error created a manager cycle: A→B→C→A.
  Root cause: WITH RECURSIVE without cycle detection. Infinite loop: kept following A→B→C→A→B→C...
    PostgreSQL has no automatic depth limit for recursive CTEs.
  Fix: Track visited IDs in an array path:
    SELECT id, manager_id, ARRAY[id] AS visited
    UNION ALL
    SELECT e.id, e.manager_id, visited || e.id
    FROM employees e JOIN cte ON e.manager_id = cte.id
    WHERE NOT e.id = ANY(visited)  -- Stop if we'd revisit a node
  Also: add application-level validation to prevent circular FK references on INSERT/UPDATE.

BUG 2: UPSERT with DO UPDATE missing WHERE clause — always updates, even with identical data
  Scenario: Product sync job ran every 5 minutes, updating 500K product rows via UPSERT.
    Database write I/O was extremely high despite most products not changing between syncs.
    WAL generation was 10× expected.
  Root cause: ON CONFLICT DO UPDATE always wrote new values, even when they were identical.
    Each identical "update" creates a new tuple version (MVCC) → dead tuple → WAL record → bloat.
  Fix: Add WHERE clause to prevent unnecessary updates:
    ON CONFLICT (product_id) DO UPDATE
    SET name = EXCLUDED.name, price = EXCLUDED.price, updated_at = NOW()
    WHERE products.name IS DISTINCT FROM EXCLUDED.name
       OR products.price IS DISTINCT FROM EXCLUDED.price;
    -- IS DISTINCT FROM: NULL-safe inequality. Only update if something actually changed.
  Result: WAL generation dropped 90%. Bloat virtually eliminated.

BUG 3: JSONB @> query without GIN index — full table scan on 50M row table
  Scenario: User segmentation query ("find all users in Mumbai who prefer dark theme") took 90 seconds.
    Development had 10,000 rows — 0.2s. Production: 50M rows — nobody noticed until launch day.
  Root cause: CREATE INDEX on preferences column used default B-tree index (not GIN).
    B-tree index cannot be used for @> (containment) operator. Full table scan.
  Fix:
    CREATE INDEX CONCURRENTLY idx_prefs_gin ON user_profiles USING GIN (preferences);
    -- B-tree index on entire JSONB column is useless for @> queries
  For specific key equality (not containment): B-tree on extracted value:
    CREATE INDEX ON user_profiles ((preferences->>'city')); -- For = queries on specific keys
    Query: WHERE preferences->>'city' = 'Mumbai'; -- Uses this B-tree index

BUG 4: to_tsvector called per-query instead of stored — full table FTS scan every time
  Scenario: Product search feature was fast for first 6 months. After product catalog grew to 2M items:
    search took 8-15 seconds.
  Root cause: WHERE to_tsvector('english', name || ' ' || description) @@ query
    to_tsvector() called on every row, every query. Cannot be indexed (different call per row).
    With 2M products: 2M tsvector computations per search request.
  Fix: Store the tsvector (compute once, use many times):
    ALTER TABLE products ADD COLUMN fts_vector TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || COALESCE(description, ''))) STORED;
    CREATE INDEX ON products USING GIN (fts_vector);
    Query: WHERE fts_vector @@ to_tsquery('english', 'smartphone');
    -- GIN index lookup: O(1) — back to <50ms even with 2M products.

BUG 5: LATERAL join without index on join column — N sequential scans (N+1 in disguise)
  Scenario: "Latest order per customer" query using LATERAL ran fine for 1K customers.
    With 500K customers: query took 12 minutes.
  Wrong code:
    FROM customers c
    CROSS JOIN LATERAL (
      SELECT * FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1
    ) latest
    -- No index on orders.customer_id — each lateral subquery: full sequential scan of orders!
    -- 500K customers × full scan of 10M order rows = 5 TRILLION row reads attempted
  Root cause: LATERAL is not magic — it still needs proper indexes for performance.
    Each lateral iteration is an independent query. Without index: sequential scan each time.
  Fix:
    CREATE INDEX ON orders (customer_id, created_at DESC); -- Covers the lateral subquery
    -- Now: each lateral iteration = index scan (O(log n) per customer)
    -- 500K customers × O(log 10M) ≈ 23 index pages = 11.5M index reads (manageable)
  Result: 12 minutes → 8 seconds.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Given: categories (1,'Root',NULL), (2,'A',1), (3,'B',1), (4,'A1',2), (5,'A2',2), (6,'B1',3)
  And: a deliberate cycle added: UPDATE categories SET parent_id = 4 WHERE id = 2; (A's parent = A1!)

  a) Run this query WITHOUT cycle protection. What happens?
     WITH RECURSIVE tree AS (
       SELECT id, name, parent_id, 0 AS depth FROM categories WHERE parent_id IS NULL
       UNION ALL
       SELECT c.id, c.name, c.parent_id, t.depth + 1
       FROM categories c JOIN tree t ON c.parent_id = t.id
     )
     SELECT * FROM tree;

  b) Add cycle protection using a visited array. Write the corrected query.
     Which rows are returned? Which are skipped due to cycle detection?

  c) Given the original (non-cyclic) data, write a query that returns
     ONLY leaf nodes (nodes with no children) using the recursive CTE.
     (Hint: a leaf is a node whose id appears in NO row's parent_id)

CHALLENGE 2 — FIX THE UPSERT AND JSONB BUGS:
  This product catalog sync function has 3 bugs. Find and fix them.

  -- Sync product from external API response:
  CREATE OR REPLACE FUNCTION sync_product(
    p_sku TEXT, p_data JSONB
  ) RETURNS VOID AS \$\$
  BEGIN
    INSERT INTO products (sku, name, price, attributes)
    VALUES (
      p_sku,
      p_data->>'name',
      (p_data->>'price')::NUMERIC,
      p_data->'attributes'  -- Bug 1: should this use -> or ->>? What type does each return?
    )
    ON CONFLICT (sku)
    DO UPDATE SET
      name   = EXCLUDED.name,
      price  = EXCLUDED.price,
      attributes = products.attributes || EXCLUDED.attributes;
      -- Bug 2: || merges JSONB — does this ADD attributes or REPLACE them?
      -- If p_data has {"color":"red"} and existing has {"color":"blue","size":"L"}:
      -- What is the result of || ? Is that what we want for a sync?

    -- Bug 3: querying JSONB without appropriate index
    -- This will full-scan if called after sync for "find all red products":
    PERFORM id FROM products WHERE attributes @> '{"color":"red"}';
    -- What index type is needed here?

  END;
  \$\$ LANGUAGE plpgsql;

  Fix all 3 bugs and explain the correct behavior.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete product search and analytics system using advanced SQL patterns.

  Part A — Full-Text Search with Facets:
  Given: products (id, name, description, category, price, attributes JSONB, fts_vector TSVECTOR)

  Write a search function that accepts: query_text, category_filter (optional), max_price (optional),
  attribute_filter JSONB (optional), page_number, page_size.

  The function should:
  1. Full-text search on fts_vector using websearch_to_tsquery
  2. Filter by category if provided
  3. Filter by max_price if provided
  4. Filter by attribute containment if provided (e.g., {"color":"red","size":"M"})
  5. Return results ranked by ts_rank
  6. Include: id, name, price, rank, snippet (ts_headline), total_count (window function)
  7. Paginate correctly (OFFSET/LIMIT or keyset pagination)

  Part B — Category Tree with Product Counts:
  Write a single recursive CTE query that returns the complete category tree with,
  for each category:
  - depth, indented name, full path
  - direct_product_count (products directly in this category)
  - total_product_count (products in this category AND all its descendants)
  (Hint for total count: use a second recursive CTE or a lateral join to count recursively)

  Part C — GENERATE_SERIES Analytics:
  Write a query showing "revenue by hour of day and day of week" using generate_series
  to ensure all 168 time slots (24 hours × 7 days) appear even if no orders occurred.
  Include: day_of_week (0=Sun to 6=Sat), hour (0-23), avg_revenue, order_count.
  Sort by day_of_week, hour.
    `,
    summary: `Advanced SQL patterns replace entire layers of application code with database-native operations: recursive CTEs eliminate tree-traversal application logic, UPSERT atomically handles the insert-or-update race condition that plagues hand-coded check-then-act patterns, JSONB with GIN indexes provides flexible schema evolution without sacrificing queryability, and LATERAL joins express "for-each-row" logic as a single server-side operation. Master these patterns and you'll write less application code, fewer database round trips, and more maintainable data logic.`
  }
];

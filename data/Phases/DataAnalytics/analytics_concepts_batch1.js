const concepts = [
  {
    id: 1,
    title: "Measurement Scales & Data Types",
    tag: "WHAT YOUR DATA ACTUALLY IS — AND WHAT YOU CAN DO WITH IT",
    color: "#1D4ED8",
    tldr: `Every piece of data belongs to one of four measurement scales — nominal, ordinal, interval, or ratio — and the scale determines which mathematical operations are meaningful. Applying the wrong operation (like averaging PIN codes or computing a ratio of Celsius temperatures) produces a number that looks valid but means nothing. Understanding scales is the first defence against analytically nonsensical conclusions.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I averaged customer city codes and got 3.7 — is Mumbai better than Delhi?"
  → City codes are NOMINAL. Averaging them is meaningless. The "3.7" is pure noise.
  → Valid operations on nominal: count, mode, frequency table. Nothing else.

"I subtracted two satisfaction scores (1-5 scale) — is that valid?"
  → Satisfaction ratings are ORDINAL. The difference (4 - 2 = 2) looks like a number.
  → But is the gap between 1 and 2 the same size as between 4 and 5? Almost certainly not.
  → Ordinal: order is meaningful, but intervals between values are NOT guaranteed equal.
  → Subtraction on ordinal data produces a number, but not a meaningful one.

"Is 40°C twice as hot as 20°C?"
  → Celsius is INTERVAL scale. Has equal intervals. But NO true zero point.
  → 0°C does not mean "no temperature." Ratios are meaningless on interval scales.
  → Kelvin is RATIO scale (0 K = absolute zero). 400 K IS twice as hot as 200 K.
  → The expression "40°C / 20°C = twice as hot" is physically wrong.

"Can I compute the mean of a 5-star rating column?"
  → Controversial. Ratings are technically ordinal.
  → In practice the industry treats Likert/star ratings as pseudo-interval and computes means.
  → The mean of ratings is useful heuristically (product ranking) but not strictly valid.
  → Be explicit: "treating as approximately interval scale" when reporting.

"My analysis crashed because a ZIP code column is typed INTEGER — so I averaged it"
  → Type coercion bug: numeric storage does NOT equal numeric meaning. ZIP codes are nominal.
  → Always ask: "Is this a number I can do arithmetic on, or a number used as a label?"
  → Phone numbers, Aadhaar numbers, employee IDs, product SKUs: all stored as numbers, all nominal.

NULL vs ZERO vs MISSING:
  → NULL: the value was not recorded or not applicable. Different from zero.
  → Zero: a measured value that happens to be zero (₹0 spend = made a purchase, paid nothing).
  → Missing: a data collection failure. Should be imputed or excluded, never silently treated as zero.
  → Bug: replacing NULL with 0 for revenue turns "no data" into "₹0 revenue."
    A customer who never visited has NULL visits, not 0 visits. The distinction matters
    for retention analysis — you might count them as "active with zero activity" vs "not in cohort."
    `,
    analogy: `
THE JERSEY NUMBER, RANKING, TEMPERATURE, HEIGHT ANALOGY:
---------------------------------------------------------
NOMINAL = JERSEY NUMBERS ON A CRICKET TEAM:
  Rohit Sharma wears #45. Virat Kohli wears #18.
  Does 45 > 18 mean Rohit is "better"? No. The numbers are just labels.
  Can you average jersey numbers? (45 + 18) / 2 = 31.5 — meaningless. No player wears 31.5.
  Valid operations: "How many players wear each number?" (count/frequency). That is it.

  Real data examples: gender, city, product category, user ID, phone number, PIN code.

ORDINAL = MOVIE STAR RATINGS:
  5 stars is better than 3 stars. Order is meaningful. Clear ranking.
  But: is the gap between 2 and 3 stars the same size as between 4 and 5 stars?
  Probably not — humans do not rate on a perfectly linear scale.

  Can you subtract ratings? 5 - 3 = 2. Does "2 stars of difference" mean something concrete? No.
  Valid: rank, compare (greater/less), median (middle value), mode.
  Not valid: mean (technically), subtraction, multiplication.

  Real data: satisfaction ratings (1-5), education level, pain scale (1-10), contest rankings.

INTERVAL = CELSIUS TEMPERATURE:
  20°C and 30°C: the 10-degree gap is meaningful and consistent. Equal intervals throughout.
  But 0°C does not mean "no temperature." It is an arbitrary freezing point of water.
  "It is twice as hot today" (40°C vs 20°C) is WRONG. No true zero point.

  Can you add/subtract? Yes: "5°C warmer" is valid.
  Can you multiply/divide (ratios)? No: "twice as hot" is meaningless.

  Real data: calendar years (gap meaningful, ratio not), IQ scores, SAT scores.

RATIO = HEIGHT, WEIGHT, INCOME, DISTANCE:
  Priya is 160 cm. A post is 80 cm tall. True zero exists: 0 cm = no height.
  So: Priya IS twice as tall as the post. Valid ratio.
  All arithmetic operations valid: +, −, ×, ÷, mean, median, geometric mean, coefficient of variation.

  Real data: age, income (₹), distance (km), time duration, count of items, page views.

THE THREE-QUESTION TEST:
  1. Does the order matter? No → Nominal. Yes → continue.
  2. Are the intervals equal? No → Ordinal. Yes → continue.
  3. Is there a true zero? No → Interval. Yes → Ratio.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — SCALES, OPERATIONS, AND EDGE CASES:
--------------------------------------------------------------

VALID OPERATIONS BY SCALE (COMPLETE MATRIX):
  Operation              Nominal  Ordinal  Interval  Ratio
  --------------------------------------------------------
  Equality (=, ≠)           ✓        ✓        ✓        ✓
  Ordering (<, >)           ✗        ✓        ✓        ✓
  Addition / Subtraction    ✗        ✗        ✓        ✓
  Multiplication / Div      ✗        ✗        ✗        ✓
  Mode                      ✓        ✓        ✓        ✓
  Median                    ✗        ✓        ✓        ✓
  Arithmetic mean           ✗       ✗*        ✓        ✓
  Geometric mean            ✗        ✗        ✗        ✓
  Coefficient of variation  ✗        ✗        ✗        ✓

  * = technically invalid but widely done in practice for Likert scales

TYPE COERCION BUGS IN REAL ANALYSIS:
  Bug class 1 — numeric storage, nominal meaning:
    ZIP codes stored as INTEGER → GROUP BY or SUM accidentally runs without error.
    Employee ID as INTEGER → avg(employee_id) returns 50234 — meaningless.

  Bug class 2 — ordinal treated as interval:
    NPS score (0-10) averaged across segments. Technically invalid but industry-standard.
    Problem: two teams both with average NPS 7.5 but very different distributions
    (one: all 7s and 8s; other: half 0s and half 10s). Mean hides the critical shape.
    Always report mean + distribution visualisation for ordinal data.

  Bug class 3 — interval treated as ratio:
    Year 2024 / Year 2020 = 1.002 — completely meaningless.
    Temperature ratios in Celsius: "twice as hot" is wrong.
    Detection: ask "does zero mean 'none of this thing'?" before computing ratios.

NULL vs ZERO vs MISSING — DEEP DISTINCTIONS:
  NULL: "We do not know" or "not applicable."
    SQL: NULL ≠ NULL (NULL = NULL evaluates to NULL, not TRUE).
    AVG(column) in SQL: ignores NULLs automatically.
    AVG of [100, NULL, 200] = 150, not 100. COUNT(column) counts only non-NULL rows.

  ZERO: a measured value that happens to be zero.
    ₹0 discount applied. Real data — customer existed, got no discount.
    Replacing NULL with 0 turns "no data" into "measured zero." Changes the analysis.

  MISSING: data collection failure. The value SHOULD exist but does not.
    Treatment depends entirely on WHY it is missing (MCAR / MAR / MNAR — see concept 3).

  Practical test: ask "if I replace NULL with 0, does it change the business meaning?"
    NULL visits + 0 = counts them as "0 visits" = present in cohort.
    This changes retention rates, engagement metrics, averages — fundamentally wrong.

DISCRETE vs CONTINUOUS (WITHIN RATIO SCALE):
  Discrete: integer-valued. Count of purchases, number of children.
    You cannot have 2.7 children. Use Poisson or negative binomial, not normal distribution.
  Continuous: can take any value in a range. Weight, duration, revenue.
    Approximate with continuous distributions (normal, log-normal, etc.).
  Misclassification: treating discrete counts as continuous leads to wrong distribution assumptions.
    `,
    code: `
// ===== MEASUREMENT SCALES & DATA TYPES — CODE EXAMPLES =====

// EXAMPLE 1: Identifying scale types and valid operations

const example1 = \`
# import pandas as pd
# import numpy as np

data = {
    'customer_id':  [101, 102, 103, 104, 105],   # NOMINAL — ID label, not quantity
    'city_code':    [1, 2, 1, 3, 2],              # NOMINAL — code for Mumbai/Delhi etc.
    'satisfaction': [4, 2, 5, 3, 4],              # ORDINAL — 1-5 scale, unequal gaps
    'order_year':   [2022, 2023, 2022, 2024, 2023],# INTERVAL — year, no true zero
    'spend_inr':    [1500, 0, 3200, 850, 4100],   # RATIO — ₹, true zero = no spend
    'age':          [28, 34, 22, 45, 31]           # RATIO — years, true zero exists
}
df = pd.DataFrame(data)

# VALID: count frequency of city codes (nominal → frequency table)
print(df['city_code'].value_counts())

# INVALID: mean of city codes — nonsensical!
# df['city_code'].mean()  ← produces 1.8 — "average city" means nothing

# VALID: median satisfaction (ordinal → rank operations ok)
print(df['satisfaction'].median())  # → 4.0

# VALID: mean spend (ratio → all arithmetic valid)
print(df['spend_inr'].mean())  # → ₹1930.0

# VALID: year difference (interval → subtraction ok)
df['years_as_customer'] = df['order_year'] - 2020  # ✓

# INVALID: year ratio
# df['year_ratio'] = df['order_year'] / 2020  ← 2022/2020 is meaningless
\`;

// EXAMPLE 2: Type coercion bug — phone number as numeric

const example2 = \`
# Bug: phone stored as int64, accidentally included in aggregation
df['phone'] = [9876543210, 9123456789, 8001234567, 7890123456, 9900112233]

# This runs without error but is completely wrong:
print(df['phone'].mean())  # → 9178266091 — "average phone number" is nonsense!
print(df['phone'].sum())   # → totally meaningless large integer

# Fix: store as string so arithmetic fails explicitly (a good thing!)
df['phone'] = df['phone'].astype(str)
# Now df['phone'].mean() raises TypeError — which is exactly what we want.

# In SQL: keep label-numbers as VARCHAR:
# CREATE TABLE customers (phone VARCHAR(15), pincode VARCHAR(6));
# Never: SELECT AVG(pincode) FROM customers — but VARCHAR prevents this accident.
\`;

// EXAMPLE 3: NULL vs Zero vs Missing — Python

const example3 = \`
# import numpy as np
# import pandas as pd

# Monthly revenue per customer:
# NULL = never purchased this month
# 0    = purchased but paid ₹0 (fully discounted order)
# NaN  = data pipeline failure — we simply do not know

revenue = pd.Series([1500.0, 0.0, None, 3200.0, None, 0.0, 850.0])

# Mistake: replace NaN with 0 (treats "no data" as "₹0 spend")
wrong_mean = revenue.fillna(0).mean()   # → 795.7  (artificially low)
print(f"Wrong mean (NaN→0): ₹{wrong_mean:.1f}")

# Correct: pandas ignores NaN in mean automatically
correct_mean = revenue.mean()           # → 1387.5
print(f"Correct mean (NaN excluded): ₹{correct_mean:.1f}")

# Count distinctions:
print(f"Non-null count: {revenue.count()}")       # 5
print(f"Zero values:    {(revenue == 0).sum()}")   # 2
print(f"NaN count:      {revenue.isna().sum()}")   # 2

# Business distinction:
# Zero-spend customers: active, returned, but bought nothing → include in retention
# NaN customers: data pipeline issue → investigate, do not impute silently
\`;

// EXAMPLE 4: NULL traps in SQL

const example4 = \`
-- NULL propagates through arithmetic — silently produces wrong answers

-- Bug: if ANY quarter is NULL, annual_revenue becomes NULL (not partial sum)
SELECT customer_id,
       revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4 AS annual_revenue
FROM customer_revenue;

-- Fix option A: treat NULL as 0 only when 0 IS the right business meaning
SELECT customer_id,
       COALESCE(revenue_q1, 0) + COALESCE(revenue_q2, 0) +
       COALESCE(revenue_q3, 0) + COALESCE(revenue_q4, 0) AS annual_revenue
FROM customer_revenue;

-- Fix option B: flag incomplete records rather than impute
SELECT customer_id,
       CASE
           WHEN revenue_q1 IS NULL OR revenue_q2 IS NULL
             OR revenue_q3 IS NULL OR revenue_q4 IS NULL
           THEN NULL
           ELSE revenue_q1 + revenue_q2 + revenue_q3 + revenue_q4
       END AS annual_revenue,
       (revenue_q1 IS NULL OR revenue_q2 IS NULL
        OR revenue_q3 IS NULL OR revenue_q4 IS NULL) AS has_missing_quarters
FROM customer_revenue;

-- NULL comparison trap:
SELECT * FROM orders WHERE discount_code = NULL;   -- WRONG: returns 0 rows always
SELECT * FROM orders WHERE discount_code IS NULL;  -- CORRECT
\`;

// EXAMPLE 5: Ordinal encoding trap in machine learning

const example5 = \`
# from sklearn.preprocessing import LabelEncoder, OrdinalEncoder

education_nominal = ['MBA', 'B.Tech', 'PhD', 'B.Com', 'MBA']  # No inherent order

# WRONG: LabelEncoder assigns arbitrary integers to nominal data
# le = LabelEncoder()
# encoded = le.fit_transform(education_nominal)
# → [2, 0, 3, 1, 2]  ML model now thinks B.Com(1) > B.Tech(0) — false relationship!

# CORRECT for nominal: One-Hot Encoding
# pd.get_dummies(pd.Series(education_nominal), prefix='edu')
# Creates: edu_B.Com, edu_B.Tech, edu_MBA, edu_PhD  (binary flags, no false order)

# CORRECT for ordinal: explicit order mapping
education_ordinal = ['High School', 'B.Tech', 'MBA', 'PhD', 'B.Tech']
order = ['High School', 'B.Tech', 'MBA', 'PhD']
# oe = OrdinalEncoder(categories=[order])
# encoded_ordinal = oe.fit_transform([[e] for e in education_ordinal])
# → [[0.], [1.], [2.], [3.], [1.]]  order is intentional and documented
\`;

// EXAMPLE 6: Scale detection heuristic

const example6 = \`
def infer_scale_type(series, name=""):
    dtype = series.dtype
    n_unique = series.nunique()
    n_total = len(series)

    if dtype == 'object' or str(dtype) == 'category':
        if n_unique / n_total < 0.05:
            return f"{name}: NOMINAL ({n_unique} categories)"
        return f"{name}: NOMINAL (high cardinality — might be ID/label)"

    if pd.api.types.is_integer_dtype(dtype):
        if series.min() > 100000:
            return f"{name}: WARNING — possible NOMINAL (ID/code?)"
        if n_unique <= 10 and series.min() >= 1:
            return f"{name}: Possibly ORDINAL (integer scale 1-{series.max()})"
        return f"{name}: Possibly RATIO (count data)"

    if pd.api.types.is_float_dtype(dtype):
        if series.min() >= 0:
            return f"{name}: Likely RATIO (non-negative continuous)"
        return f"{name}: Possibly INTERVAL (continuous, can be negative)"

    return f"{name}: Unknown — inspect manually"

# Test:
for col in df.columns:
    print(infer_scale_type(df[col], col))
# This is a heuristic only — domain knowledge always overrides it
\`;

// EXAMPLE 7: Column metadata pattern to prevent future misuse

const example7 = \`
COLUMN_SCALES = {
    'customer_id':    {'scale': 'nominal',  'ops': ['count', 'groupby', 'filter']},
    'city':           {'scale': 'nominal',  'ops': ['count', 'groupby', 'mode']},
    'satisfaction':   {'scale': 'ordinal',  'ops': ['count', 'median', 'rank', 'mode']},
    'order_year':     {'scale': 'interval', 'ops': ['count', 'diff', 'mean', 'median']},
    'spend_inr':      {'scale': 'ratio',    'ops': ['all']},
    'age':            {'scale': 'ratio',    'ops': ['all']},
}

def safe_mean(df, col):
    scale = COLUMN_SCALES.get(col, {}).get('scale', 'unknown')
    if scale in ('nominal', 'ordinal'):
        print(f"WARNING: mean() on {scale} column '{col}' may be meaningless.")
        print(f"Consider mode() for nominal, median() for ordinal instead.")
    return df[col].mean()

safe_mean(df, 'satisfaction')  # → prints warning, then returns value
safe_mean(df, 'spend_inr')     # → clean result, no warning
\`;
    `,
    bugs: `
REAL ANALYTICAL BUGS FROM SCALE MISUNDERSTANDING:
-------------------------------------------------

BUG 1: Averaging PIN codes — "average location" analysis
  Scenario: An analyst ran a segment analysis and computed avg(pincode) grouped by segment.
    SQL: SELECT segment, AVG(pincode) AS avg_location FROM customers GROUP BY segment;
    Result: Segment A = 400023.4, Segment B = 560089.1
    Reported: "Segment A customers are located slightly north of Segment B."
    PIN codes are NOMINAL. The numeric values carry no geographic ordering.
    400023 is in South Mumbai. 400001 is also Mumbai. 560001 is Bangalore.
    The arithmetic average of PIN codes is geographically meaningless.
  Fix: Use mode (most common PIN) or a frequency table or convert to city names first.
    SELECT segment, MODE() WITHIN GROUP (ORDER BY pincode) AS modal_pincode
    FROM customers GROUP BY segment;

BUG 2: Treating NULL as zero in revenue rollups — inflated user base, deflated ARPU
  Scenario: E-commerce team reported "average daily revenue per user: ₹47."
    Query: SELECT AVG(COALESCE(daily_revenue, 0)) FROM user_daily_activity;
    70% of rows had NULL revenue (users who did not open the app that day).
    COALESCE turned those NULLs into ₹0, pulling the average from ₹157 to ₹47.
    The metric should have been "average revenue per ACTIVE user" (exclude non-openers).
  Fix:
    -- Revenue per active user (non-null):
    SELECT AVG(daily_revenue) FROM user_daily_activity WHERE daily_revenue IS NOT NULL;
    -- Revenue per all users (treating inactive as ₹0 intentionally):
    SELECT SUM(COALESCE(daily_revenue,0)) / COUNT(DISTINCT user_id) FROM user_daily_activity;

BUG 3: Year ratio calculation in a financial report
  Scenario: Finance analyst computed "revenue ratio": revenue_2024 / 2024 as "per-year unit."
    A subtler version: computed AVG(order_year) = 2022.4 and divided metrics by it.
    2022.4 as a denominator has no business meaning — it is an interval scale value.
    Report figures looked reasonable numerically but were dimensionally nonsensical.
  Fix: Use revenue values (ratio scale) for ratios. Use year differences for durations.
    NEVER divide by a calendar year. Subtract years for time elapsed.

BUG 4: Encoding nominal categories as integer → ML learns false ordering
  Scenario: Product category encoded: Electronics=1, Clothing=2, Food=3, Books=4.
    Gradient boosting trained with this encoding.
    Model learned: Books(4) has roughly 4× the "category weight" of Electronics(1).
    "Average category" appeared as a top feature — capturing encoding artifact, not real signal.
    Model performed poorly on new categories and on cross-category comparisons.
  Fix: One-hot encode nominal categories before training.
    pd.get_dummies(df['category'], prefix='cat', drop_first=True)
    Categories become binary flags with no implied ordering.

BUG 5: Combining mixed-scale columns into a "total score"
  Scenario: Customer survey with 10 questions.
    Q1–Q5: Satisfaction 1-5 (ordinal). Q6–Q8: Frequency "Never/Sometimes/Often/Always" coded 0-3.
    Q9: Net Promoter Score 0-10 (ordinal). Q10: Days since last purchase (ratio).
    Total Score = sum of all 10 columns.
    Q10 (days: range 0–365) dominated the sum numerically, overriding all satisfaction signals.
    Two customers with identical satisfaction profiles but different recency got wildly different scores.
  Fix: Normalise each scale to [0,1] before combining:
    df['q1_norm'] = (df['q1'] - 1) / 4        # 1-5 → 0-1
    df['q6_norm'] = df['q6'] / 3               # 0-3 → 0-1
    df['nps_norm'] = df['q9'] / 10             # 0-10 → 0-1
    # Q10 should not be in the composite — it measures a different concept entirely.
    df['composite'] = df[['q1_norm','q6_norm','nps_norm']].mean(axis=1)
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — CLASSIFY AND PREDICT:
  A dataset has these columns. For each: (a) state the measurement scale,
  (b) give one valid and one invalid statistical operation, (c) state the correct storage type.

  1. employee_id: values like 10234, 10235, 10236
  2. performance_rating: "Exceeds", "Meets", "Below"
  3. office_temp_celsius: 22.5, 24.0, 19.8
  4. salary_inr: 45000, 72000, 130000
  5. aadhaar_number: 12-digit national ID
  6. customer_nps: 0 to 10
  7. days_on_platform: 0, 45, 367, 12
  8. order_status: "pending", "shipped", "delivered", "cancelled"

  For column 6 (NPS): write the SQL to compute BOTH the technically valid aggregate
  AND the industry-standard approximate aggregate. Explain when you would use each.

CHALLENGE 2 — FIX THE ANALYTICAL BUGS:
  This SQL query has 3 scale-related mistakes. Find and fix each.

  SELECT
      city_code,
      AVG(city_code)              AS average_city,        -- Mistake 1
      AVG(customer_satisfaction)  AS avg_satisfaction,    -- Possibly Mistake 2
      SUM(signup_year)            AS total_years,         -- Mistake 3
      SUM(orders_placed)          AS total_orders         -- Is this valid?
  FROM customers
  GROUP BY city_code;

  For each mistake: (a) which scale is being misused?
  (b) what does the result look like — a number or an error?
  (c) why is the result misleading?
  (d) what is the correct operation?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Design a Python class DataColumn(values, scale_type) that enforces scale-appropriate operations.

  Requirements:
  1. Constructor stores values as a pandas Series and stores scale_type.
  2. Valid scale_types: 'nominal', 'ordinal', 'interval', 'ratio'.
  3. Methods:
     - mean(): returns float for interval/ratio; raises ValueError for nominal/ordinal.
     - median(): valid for ordinal/interval/ratio; raises for nominal.
     - mode(): always valid; returns most frequent value.
     - ratio(other): returns self/other only if both are 'ratio' scale; raises otherwise.
     - compare(op): valid for ordinal and above; raises for nominal.
  4. to_ml_features(): for nominal → one-hot DataFrame; ordinal → integer-encoded Series
     with explicit ordering argument; interval/ratio → standardised (z-score) Series.
  5. Write 3 pytest-style test functions proving invalid operations raise and valid ones succeed.
    `,
    summary: `Every analysis starts by asking "what can I actually do with this data?" — and the answer depends entirely on the measurement scale. The two costliest mistakes in practice are treating nominal labels (IDs, codes, categories) as quantities, and replacing NULL with zero when NULL means "not applicable" rather than "zero value" — both produce plausible-looking numbers that are analytically wrong.`
  },

  {
    id: 2,
    title: "Descriptive Statistics — Mean, Median, Variance & Traps",
    tag: "SUMMARISING DATA WITHOUT LYING TO YOURSELF",
    color: "#047857",
    tldr: `Mean, median, variance, and standard deviation are the vocabulary of data summaries, but each has failure modes. Means are destroyed by outliers — the one ₹5-crore CEO salary averaged with 99 ₹5-lakh salaries pushes the mean far above what any typical employee earns. Population statistics divide by N; sample statistics divide by N-1 (Bessel's correction) to avoid underestimating spread. The averaging-of-averages trap — taking a simple mean of group percentages as if they represent the overall rate — is a surprisingly common error that produces wrong answers even from correct individual group calculations.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"The average salary at our company is ₹15L — most employees seem underpaid relative to that"
  → One outlier (founder at ₹5 crore) can make the mean meaningless for the typical employee.
  → Median salary (₹5.5L) is far more representative when the distribution is skewed.
  → Rule: when data is skewed or has outliers, report the median. Mean tells you "sum per capita."

"I computed std dev as 120 but the library gives 127 — why the difference?"
  → Population std dev (σ): divide by N. Use when you have ALL the data.
  → Sample std dev (s): divide by N-1 (Bessel's correction). Use when you have a sample.
  → pandas .std() defaults to ddof=1 (sample). numpy .std() defaults to ddof=0 (population).
  → The mismatch between libraries is the ddof difference — always check which you need.

"I averaged the conversion rates of 5 cities (20%, 15%, 25%, 18%, 22%) to get 20% overall"
  → Averaging-averages trap. The correct overall rate is:
    total_conversions / total_visitors (NOT the average of the 5 rates).
  → If City A had 10 visitors and City B had 10 000, City A's 25% rate should not count equally.
  → Weighted average: Σ(rate_i × n_i) / Σ(n_i) — correct.
  → Simple average of rates: only valid when all groups have identical sample sizes.

"What does variance mean intuitively?"
  → Variance: average of squared deviations from the mean. Measures spread.
  → Why square? Makes all deviations positive and penalises large deviations more.
  → Problem: units are squared (₹²). Std deviation = √variance returns to original units.

"My data has mean=100, std=50. Is a std of 50 high or low?"
  → Coefficient of Variation (CV) = std / mean = 50%. Relative measure of spread.
  → CV < 15%: low spread. 15–35%: moderate. > 35%: high variability, investigate.
  → CV enables comparing spread across datasets with different means and units.
    `,
    analogy: `
THE SALARY PARTY ANALOGY — MEAN VS MEDIAN:
-------------------------------------------
10 data scientists at a party. Salaries: ₹8L, ₹9L, ₹10L, ₹11L, ₹9L, ₹12L, ₹10L, ₹11L, ₹9L, ₹10L.
Mean: ₹99L / 10 = ₹9.9L. Median: ₹10L. Close — distribution is roughly symmetric.

Then the founder walks in. Her salary: ₹50 crore.
Mean: (₹99L + ₹500L) / 11 = ₹54.5L.  "Average salary is ₹54.5L!"
Median: Still ₹10L (middle value barely moved — just one person shifted).

Mean is the "centre of mass" — one iron cannonball (outlier) shifts it dramatically.
Median is the "middle person in the lineup" — she barely moves when one extreme value is added.

Which is "correct"? Neither — they answer DIFFERENT questions:
  Mean: "If we pooled all salaries equally, what would each person receive?"
  Median: "What does a typical employee earn?"

POPULATION vs SAMPLE — THE FACTORY INSPECTION ANALOGY:
-------------------------------------------------------
A factory makes 10 million ball bearings. Quality team wants to measure diameter spread.

Population: measure ALL 10 million. Divide by N. Perfect information.
Sample: pick 100 random bearings. Estimate population spread from the sample.

Problem: our sample tends to cluster toward the mean. Extreme values are rare in small samples.
The sample slightly underestimates the true population variance.

Bessel's correction (N-1 instead of N): mathematically compensates for this underestimate.
The last data point is not "free" — given the mean and N-1 points, the last is determined.
"Degrees of freedom": only N-1 of the N deviations are truly independent.
N-1 matters most for small samples (N=5: 20% correction). Negligible for large N (N=1000: 0.1%).

THE AVERAGING-AVERAGES TRAP — THE SCHOOL SCORES EXAMPLE:
---------------------------------------------------------
School A: 300 students, 80% pass rate.
School B: 100 students, 60% pass rate.

Simple average of rates: (80% + 60%) / 2 = 70%.
Correct overall rate: (300 × 0.8 + 100 × 0.6) / (300 + 100) = (240 + 60) / 400 = 75%.

Why the difference? School A has 3× more students but receives only equal weight in the simple average.
Whenever groups have unequal sizes, simple averaging of rates or percentages is wrong.

VARIANCE vs STD DEV — THE AREA vs LENGTH ANALOGY:
--------------------------------------------------
If data is in ₹, variance is in ₹² (rupees squared — what does that mean?).
Std deviation = √(₹²) = ₹. Back to a meaningful unit you can communicate.
Variance is like area (m²); std deviation is the side length of that square (m).
We almost always report std deviation because it shares units with the data.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — STATISTICS INTERNALS AND EDGE CASES:
---------------------------------------------------------------

WHEN THE MEAN BREAKS DOWN:
  1. Extreme outliers: a single far-away value shifts the mean dramatically.
  2. Skewed distributions: mean ≠ centre of the typical data.
     Right skew (long right tail): mean > median > mode. Income, house prices, traffic.
     Left skew (long left tail): mean < median < mode. Age at death in rich countries.
  3. Multimodal data: mean falls between peaks, may represent no real value in the data.
     Example: bimodal age distribution (20s and 60s customers). Mean = 40 → no actual customer.
  4. Harmonic mean for rates: mean of (a/b) ≠ mean(a) / mean(b).

BESSEL'S CORRECTION — MATHEMATICAL INTUITION:
  Sample variance: s² = Σ(xi − x̄)² / (N−1)

  Why N-1? When we compute deviations from the SAMPLE MEAN (x̄) instead of the TRUE MEAN (μ):
    x̄ is computed to minimise the sum of squared deviations — it fits the sample perfectly.
    This causes each deviation to be slightly smaller than the true deviation from μ.
    The sample underestimates population variance systematically.
    Dividing by N-1 inflates the estimate to correct for this shrinkage.

  When to use N vs N-1:
    N: you have the complete population (all orders last year, all 200 employees).
    N-1: you have a sample (1000 users from 10M, survey of 500 from 50 000).

  Library defaults:
    pd.Series.std()         → ddof=1 (Bessel correction, sample std dev)
    np.std(array)           → ddof=0 (population std dev)
    np.std(array, ddof=1)   → matches pandas
    SQL STDDEV()            → population std dev in most databases
    SQL STDDEV_SAMP()       → sample std dev (N-1)

AVERAGING AVERAGES — FULL TAXONOMY:
  Fails when: groups have different sizes AND you need the overall aggregate.

  Case 1 — Unequal group sizes (most common):
    City A (1000 customers): 20% churn. City B (100 customers): 30% churn.
    Simple avg: 25%. Correct weighted avg: (1000×0.2 + 100×0.3) / 1100 = 21%.

  Case 2 — Percentage of different denominators:
    Q1 revenue grew 20%. Q2 grew 30%.
    Arithmetic avg: 25% — wrong for compound growth.
    Correct compound growth rate: √(1.20 × 1.30) − 1 ≈ 24.9% (geometric mean).

  Case 3 — Jensen's Inequality (averages of nonlinear functions):
    E[f(X)] ≥ f(E[X]) when f is convex.
    Average of (1/x) ≠ 1/average(x). Use harmonic mean for averaging speeds/rates.

COEFFICIENT OF VARIATION (CV):
  Metric A: mean=100, std=20. CV = 20%.
  Metric B: mean=10, std=5. CV = 50%.
  Absolute std comparison says A is more variable. But B has 2.5× relative variability.
  CV = std / mean: unitless, comparable across different scales and units.
  Limitation: meaningless when mean can be zero or negative (profit/loss data).

PERCENTILES AND ROBUST STATISTICS:
  p50 (median), p25 (Q1), p75 (Q3). IQR = Q3 − Q1: spread of middle 50%.
  p95, p99: tail behaviour — critical for latency and performance metrics.
  Trimmed mean: remove bottom and top X% then compute mean. Robust midpoint.
  Winsorised mean: cap extremes at boundary values (p95). Pulls outliers in rather than removing.
    `,
    code: `
// ===== MEAN, MEDIAN, VARIANCE & TRAPS — CODE EXAMPLES =====

// EXAMPLE 1: Mean vs median — impact of outliers

const example1 = \`
# import pandas as pd
# import numpy as np

salaries = pd.Series([6, 7, 8, 9, 10, 9, 8, 11, 10, 250])  # 250L = founder (₹ Lakhs)

print(f"Mean salary:   ₹{salaries.mean():.1f}L")    # → ₹32.8L (massively inflated)
print(f"Median salary: ₹{salaries.median():.1f}L")  # → ₹9.0L (representative)
print(f"Mode salary:   ₹{salaries.mode()[0]:.1f}L") # → most frequent

skewness = salaries.skew()
if abs(skewness) > 1:
    print(f"Skewness = {skewness:.2f}: SKEWED → report MEDIAN, not mean")
else:
    print(f"Skewness = {skewness:.2f}: SYMMETRIC → mean is appropriate")

# Trimmed mean: remove top 1 outlier then compute
trimmed_mean = salaries.drop(salaries.nlargest(1).index).mean()
print(f"Trimmed mean (excluding top outlier): ₹{trimmed_mean:.1f}L")  # → ₹8.7L
\`;

// EXAMPLE 2: Population vs sample std dev (Bessel's correction)

const example2 = \`
# import numpy as np
# import pandas as pd

sample = np.array([10.02, 9.98, 10.01, 10.00, 9.99, 10.03, 9.97, 10.02])  # 8 ball bearings (mm)

pop_std  = np.std(sample, ddof=0)   # divide by N   → population
samp_std = np.std(sample, ddof=1)   # divide by N-1 → sample (Bessel)
pd_std   = pd.Series(sample).std()  # pandas default ddof=1

print(f"Population std (ddof=0): {pop_std:.5f} mm")   # → 0.01822
print(f"Sample std     (ddof=1): {samp_std:.5f} mm")  # → 0.01952
print(f"Pandas .std():           {pd_std:.5f} mm")    # matches samp_std

# Difference is larger for small N:
tiny = np.array([10.0, 10.5, 9.5])   # N = 3
print(f"N=3 population std: {np.std(tiny, ddof=0):.4f}")  # → 0.4082
print(f"N=3 sample std:     {np.std(tiny, ddof=1):.4f}")  # → 0.5000 (22% larger!)

# Rule: if these 8 bearings are a SAMPLE from a batch of millions → ddof=1.
# If they ARE the entire population of interest → ddof=0.
\`;

// EXAMPLE 3: The averaging-averages trap

const example3 = \`
# import pandas as pd

city_data = pd.DataFrame({
    'city':        ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
    'visitors':    [50000,    30000,    45000,        8000,      5000],
    'conversions': [5000,     2700,     6750,          960,       450]
})
city_data['conv_rate'] = city_data['conversions'] / city_data['visitors']

# WRONG: simple average of rates (treats all cities equally regardless of volume)
wrong_rate = city_data['conv_rate'].mean()
print(f"WRONG overall rate (avg of rates): {wrong_rate:.2%}")   # → 14.1%

# CORRECT: total conversions / total visitors
correct_rate = city_data['conversions'].sum() / city_data['visitors'].sum()
print(f"CORRECT overall rate: {correct_rate:.2%}")              # → 11.7%

# The 2.4 percentage-point gap matters enormously for budget decisions!
# SQL equivalent:
# SELECT
#     SUM(conversions)::FLOAT / SUM(visitors)  AS correct_rate,
#     AVG(conversions::FLOAT / visitors)        AS wrong_rate
# FROM city_conversions;
\`;

// EXAMPLE 4: Variance additivity — why we work in variance space

const example4 = \`
# import numpy as np

# Restaurant bill = food_cost + service_charge (independent random variables)
food_std    = 150   # ₹150 variability in food cost
service_std = 30    # ₹30 variability in service charge

# WRONG: std devs do NOT add
wrong_total_std = food_std + service_std
print(f"WRONG total std: ₹{wrong_total_std}")  # ₹180

# CORRECT: variances add, then take sqrt
correct_total_std = np.sqrt(food_std**2 + service_std**2)
print(f"CORRECT total std: ₹{correct_total_std:.1f}")  # ₹152.96

# Why this matters:
# Portfolio risk, combining measurement errors, A/B test power calculations
# all require working in variance space (squared units) before taking the root.
\`;

// EXAMPLE 5: SQL comprehensive descriptive statistics

const example5 = \`
-- PostgreSQL descriptive stats in a single query
SELECT
    COUNT(*)                                              AS total_rows,
    COUNT(revenue)                                        AS non_null_count,
    COUNT(*) - COUNT(revenue)                             AS null_count,
    ROUND(AVG(revenue), 2)                                AS mean_revenue,
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY revenue) AS median_revenue,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY revenue) AS q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY revenue) AS q3,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY revenue) -
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY revenue) AS iqr,
    ROUND(STDDEV_SAMP(revenue), 2)                        AS sample_stddev,
    ROUND(STDDEV_POP(revenue),  2)                        AS population_stddev,
    ROUND(MIN(revenue), 2)                                AS min_val,
    ROUND(MAX(revenue), 2)                                AS max_val
FROM orders
WHERE order_date >= '2024-01-01';
\`;

// EXAMPLE 6: Geometric mean for compound growth rates

const example6 = \`
# import numpy as np
# import pandas as pd

# Year-over-year growth rates for Meesho-style startup:
growth_rates = pd.Series([0.20, 0.35, -0.10, 0.45, 0.28])

# WRONG: arithmetic mean of growth rates
wrong_avg = growth_rates.mean()
print(f"Arithmetic mean growth: {wrong_avg:.2%}")   # → 23.6%

# CORRECT: geometric mean of (1 + rate) factors
factors = 1 + growth_rates
n = len(factors)
geo_mean = factors.prod() ** (1/n) - 1
print(f"Geometric mean growth (CAGR): {geo_mean:.2%}")  # → 21.5%

# Verify: ₹100 grown at each rate
end_val = 100 * factors.prod()
cagr_check = (end_val / 100) ** (1/n) - 1
print(f"₹100 → ₹{end_val:.2f} over {n} years")
print(f"CAGR verification: {cagr_check:.2%}")  # must match geo_mean
\`;

// EXAMPLE 7: Robust summary statistics function

const example7 = \`
def robust_summary(series, label="column"):
    clean = series.dropna()
    mean   = clean.mean()
    median = clean.median()
    std    = clean.std()
    cv     = std / mean * 100 if mean != 0 else float('nan')

    result = {
        'label':          label,
        'n':              len(clean),
        'null_pct':       f"{series.isnull().mean()*100:.1f}%",
        'mean':           round(mean, 2),
        'median':         round(median, 2),
        'std_sample':     round(std, 2),
        'cv_pct':         round(cv, 1),
        'skewness':       round(clean.skew(), 3),
        'p25':            round(clean.quantile(0.25), 2),
        'p75':            round(clean.quantile(0.75), 2),
        'iqr':            round(clean.quantile(0.75) - clean.quantile(0.25), 2),
        'min':            round(clean.min(), 2),
        'max':            round(clean.max(), 2),
    }
    # Auto-recommendations
    if abs(result['skewness']) > 1:
        result['recommendation'] = "SKEWED — report median, not mean"
    elif result['cv_pct'] > 35:
        result['recommendation'] = "HIGH VARIABILITY — investigate subgroups"
    else:
        result['recommendation'] = "OK"
    return result

# Test:
data = pd.Series([5, 7, 8, 8, 9, 10, 11, 11, 12, 500])
print(robust_summary(data, 'test_series'))
\`;
    `,
    bugs: `
REAL ANALYTICAL BUGS FROM STATISTICS MISUNDERSTANDING:
------------------------------------------------------

BUG 1: Arithmetic mean of growth rates — wrong business forecast
  Scenario: A startup's revenue grew: +100%, +50%, −50%, +100% over four years.
    Analyst reported average growth: (100 + 50 − 50 + 100) / 4 = 50%.
    Board approved headcount and inventory budgets based on 50% growth expectation.
    Reality: ₹100 × 2.0 × 1.5 × 0.5 × 2.0 = ₹300 over 4 years.
    CAGR: (300/100)^(1/4) − 1 = 31.6%. Not 50%.
    The −50% year devastates compound growth but is weighted equally in arithmetic mean.
    Hiring was 60% overstaffed for actual growth trajectory.
  Fix: Use geometric mean (CAGR) for any growth rate averaging.
    CAGR = (end_value / start_value)^(1/n) − 1

BUG 2: numpy ddof=0 vs pandas ddof=1 — borderline quality control failure
  Scenario: QC team sampled 10 ball bearings. Specification: std dev < 0.02 mm.
    np.std(sample) returned 0.018 mm. "Within spec — ship the batch."
    np.std uses ddof=0 by default. Sample std dev (ddof=1) would have been 0.019 mm — still within spec.
    But for a tighter spec of 0.019 mm, the batch would have shipped incorrectly.
    The root cause: wrong ddof silently changed the answer without any error.
  Fix: For QC using samples from a batch — always use ddof=1 (sample estimate).
    np.std(sample, ddof=1) or pd.Series(sample).std()
    Document the formula used in all QC procedures. Never assume library defaults.

BUG 3: Simple average of percentages across unequal groups — wrong KPI reported to leadership
  Scenario: Marketing team averaged CTR across 5 channels:
    Email (100k impressions, 4%), Social (20k, 8%), Search (5k, 6%),
    Display (200k, 1%), Influencer (2k, 5%).
    Simple average: (4+8+6+1+5)/5 = 4.8%. Reported to leadership as "overall campaign CTR."
    Actual CTR: (4000+1600+300+2000+100) / 327000 = 2.45%.
    Display channel has 200k impressions at 1% CTR and dominates — but got equal weight.
    Budget decisions were made against a 4.8% CTR benchmark that did not exist.
  Fix: Always weight by the denominator.
    total_clicks / total_impressions for overall CTR. Never average percentages across unequal denominators.

BUG 4: Mean of a bimodal distribution — product built for nobody
  Scenario: Customer age for a fintech app: mostly 22–28 (young retail investors) and 45–55 (HNIs).
    Bimodal distribution. Mean age = 37. No actual customer is around 37.
    Product team designed features for "the average 37-year-old."
    Features missed both segments. Churn spiked. User research revealed the two distinct groups.
    Product required a costly redesign into two separate modes.
  Fix: Always plot the distribution before reporting mean.
    When mean and median differ by > 30%, investigate bimodality.
    For bimodal data: segment first, analyse each mode separately.

BUG 5: SQL AVG ignoring NULLs — support metric looks great, hides dropped calls
  Scenario: Support team tracked call resolution times. Dropped calls had NULL resolve_time.
    SELECT AVG(resolve_time) FROM support_calls; → 4.2 minutes. "Excellent!"
    Reality: 30% of calls were dropped (NULL resolve_time = "customer gave up, unresolved").
    Among completed calls only: 4.2 min. Including the 30% failure rate → crisis.
  Fix: Explicitly compute both metrics:
    SELECT
        AVG(resolve_time)                                       AS avg_resolved_only,
        COUNT(*) FILTER (WHERE resolve_time IS NULL)::FLOAT /
        COUNT(*)                                                AS drop_rate,
        COUNT(*) FILTER (WHERE resolve_time IS NULL)           AS dropped_calls
    FROM support_calls;
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Given this dataset: [2, 4, 4, 4, 5, 5, 7, 9, 9, 100]

  a) Compute: mean, median, mode, range, IQR, sample std dev (ddof=1), population std dev (ddof=0).
  b) The value 100 is replaced with 10. How does each statistic change?
     Which statistics are most affected and which are robust to this change?
  c) Is the original dataset positively skewed, negatively skewed, or symmetric? Explain.
  d) Without outlier 100: mean = 5.44, std = 2.46. CV = ?
     With outlier 100: mean = 14.9, std = 29.9. CV = ?
     What does the large change in CV tell you about the impact of the outlier?
  e) Write SQL to compute mean, median (PERCENTILE_CONT), IQR, and STDDEV_SAMP
     from a table called measurements(value FLOAT).

CHALLENGE 2 — FIX THE AVERAGING TRAP:
  A retail chain has 4 stores. A junior analyst reports: "Average margin = 13.25%"
  using: (12 + 8 + 15 + 18) / 4.

  Store    Revenue     Margin%
  Mumbai   ₹50L        12%
  Delhi    ₹80L        8%
  Pune     ₹20L        15%
  Chennai  ₹10L        18%

  a) What is the CORRECT overall margin%? Show the full calculation.
  b) How large is the analyst's error in percentage points?
  c) Which store distorts the simple average most, and why?
  d) Write the SQL query that produces the correct weighted margin.
  e) Under what circumstances would a simple average of margins be valid?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a robust_summary function for production analytics use.

  Input: any pandas Series (numeric).
  Output: a dictionary containing:
    count (non-null), null_count, null_pct, mean, trimmed_mean (5% each side),
    median, std_sample (ddof=1), cv_pct, min, p5, p25, p75, p95, max,
    iqr, skewness, excess_kurtosis, outlier_count (IQR method, 1.5× fence),
    recommendation: auto-flag if mean/median differ by > 20% (use median)
      or if cv_pct > 35 (investigate sub-groups) or if |skewness| > 1 (log-transform candidate).

  Test on: [5, 7, 8, 8, 9, 10, 11, 11, 12, 500]
  Verify: trimmed_mean should be closer to the median than the raw mean.
    `,
    summary: `Mean is fragile; median is robust — always check for outliers and skewness before deciding which to report. The two habits most worth forming are: always use numpy ddof=1 when working with a sample (not the full population), and always weight group percentages by their denominators before computing an overall rate — simple averaging of averages is almost always wrong.`
  },

  {
    id: 3,
    title: "Data Cleaning — Missing Values, Outliers & Dirty Data",
    tag: "GARBAGE IN, GARBAGE OUT — HOW TO MAKE DATA TRUSTWORTHY",
    color: "#B45309",
    tldr: `Data cleaning is not just "fixing errors" — it requires understanding WHY data is missing or malformed before deciding how to handle it. The MCAR/MAR/MNAR framework determines whether missingness can be safely imputed or whether any imputation will introduce bias. Outlier handling, deduplication, and cross-column validation are not mechanical steps — each decision changes what population your analysis describes.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I filled all missing values with the column mean — is that good practice?"
  → Depends entirely on WHY values are missing. Three mechanisms, three different treatments.
  → MCAR (Missing Completely At Random): randomness unrelated to any variable.
    Mean imputation: acceptable with low missingness (< 5%).
  → MAR (Missing At Random): missingness explained by OTHER observed variables.
    Example: high-income users are less likely to fill in a salary field.
    Safe to impute using a model that includes income proxies.
  → MNAR (Missing Not At Random): missingness caused BY the value itself.
    Example: very sick patients miss health check-ins because they are too ill to attend.
    Filling with the group mean hides the most important signal in the data.
    The missingness IS the finding.

"I removed every row containing a NULL — now my analysis has a systematic bias"
  → Listwise deletion: only valid if data is MCAR.
  → If MAR or MNAR: deleted rows are not a random subsample → biased conclusions.
  → Example: removing customers with NULL phone numbers.
    These may be privacy-conscious users with a specific demographic profile.
    Deletion creates a biased sample — your retention metrics now exclude a systematic segment.

"My outlier detection flagged 5% of rows — should I remove them all?"
  → NO. Outliers are not automatically errors. Three types:
    1. Measurement errors: genuinely impossible values (age = 200, revenue = −₹50000).
    2. Data entry errors: accidental typos (₹10000 entered as ₹1000000).
    3. Real extreme values: valid data at the tail of the distribution.
  → Removing real extreme values changes your population definition. Do it deliberately.
  → Always ask: "Is this value possible in reality?" before removal.

"My dataset has duplicates — I removed them by exact-match deduplication"
  → Exact deduplication misses fuzzy duplicates: same person, different spelling.
  → 'Priya Sharma' vs 'Priya Sharma ' (trailing space) → not caught.
  → 'priya.sharma@gmail.com' and 'Priya.Sharma@gmail.com' → case-sensitive match fails.
  → Business duplicate: same customer registered twice with different email addresses.

"I cleaned each column separately — but the resulting row-level combinations are impossible"
  → Cross-column validation: after cleaning individual columns, check their relationships.
  → ship_date < order_date: individually valid dates, but impossible in combination.
  → age=8, employment_status='full-time': both values individually valid, impossible together.
    `,
    analogy: `
THE MEDICAL RECORDS ANALOGY — WHY MISSING DATA IS NOT RANDOM:
--------------------------------------------------------------
MCAR = RANDOM COFFEE SPILL ON PATIENT FILES:
  A random selection of old paper files have water damage. Patients who survived,
  recovered, got sicker — all equally affected. The damage is unrelated to content.
  Solution: analyse undamaged files as a representative sample of the full population.
  Mean imputation or listwise deletion is defensible.

MAR = HOSPITAL SWITCHED FROM PAPER TO DIGITAL IN 2020:
  Records are complete for patients who registered after 2020. Pre-2020 patients
  have incomplete electronic records. Missingness is explained by registration_date — an
  observed variable in the dataset. If you know whether someone registered before or after 2020,
  you can account for the missingness pattern.
  Solution: impute using registration_date as a predictor. Or analyse periods separately.

MNAR = PATIENTS TOO SICK TO ATTEND FOLLOW-UP APPOINTMENTS:
  Follow-up outcome data is missing for the SICKEST patients. They physically could not come in.
  The people with missing outcome data are not a random sample — they are the worst cases.
  Imputing with "average of those who attended" = average of the healthier patients.
  This would make the treatment look far more effective than it is.
  Solution: you cannot simply impute MNAR. Must redesign collection (home visits, phone calls).
  The missingness is the most important finding in the dataset.

IQR FENCE = THE REASONABLE RANGE TEST:
  Q1 − 1.5×IQR and Q3 + 1.5×IQR define the "whisker" boundaries.
  Values outside: potential outliers — flag for review, not automatic removal.
  Use 3× IQR for "extreme outliers" that are almost certainly errors.
  Analogy: a cricket bat weighing 5 kg (IQR flags it). A bat weighing 50 kg (extreme flag — almost certainly wrong).

MODIFIED Z-SCORE = THE ROBUST OUTLIER DETECTOR:
  Standard Z-score uses mean and std dev — both sensitive to the outliers they are meant to detect.
  Modified Z-score uses median and MAD (Median Absolute Deviation) instead.
  MAD = median of |xi − median|. Robust: one extreme value cannot inflate the MAD much.
  Threshold: |modified Z| > 3.5 flags an outlier.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — MISSING DATA TAXONOMY AND CLEANING INTERNALS:
------------------------------------------------------------------------

MCAR / MAR / MNAR — FORMAL DEFINITIONS:
  Let M = missingness indicator (1 = missing, 0 = observed), Y = the data.

  MCAR: P(M | Y) = P(M).  Missingness independent of data.
    Test: compare observed-group vs missing-group on all OTHER variables.
    If no significant differences → MCAR candidate.
    Example: random sensor dropout due to power fluctuation.

  MAR: P(M | Y) = P(M | Y_observed).  Missingness depends on OTHER observed variables.
    Cannot test directly (you do not have the missing values), but plausible in many contexts.
    Example: women less likely to report income; missingness depends on gender (observed).
    Treatment: multiple imputation (MICE), predictive imputation using observed variables.

  MNAR: P(M | Y) depends on Y_missing itself.  Unresolvable statistically.
    Requires domain knowledge or data collection redesign.
    Detection: domain knowledge, not statistical tests.
    Example: high earners skip income fields because they do not want to disclose.

IMPUTATION STRATEGIES — RANKED BY SOPHISTICATION:
  1. Mean/Median imputation:
     Fast, simple. Reduces variance artificially. Distorts correlations between columns.
     Defensible only for MCAR data with < 5% missingness.

  2. Forward/backward fill (time series):
     Fill with the previous (or next) known value. Valid when values change slowly.
     Bad for spiky data (daily transactions) or long gaps.

  3. KNN imputation:
     Use K nearest neighbours to predict the missing value.
     Preserves local data structure better than global mean.
     Computationally expensive for large datasets.

  4. Multiple Imputation (MICE — Multivariate Imputation by Chained Equations):
     Impute M times with different random draws; analyse all M datasets; pool results.
     Gold standard for MAR data. Accounts for uncertainty in imputed values.
     Python: sklearn IterativeImputer. R: mice package.

  5. Model-based imputation:
     Train a supervised model (Random Forest, XGBoost) to predict the missing column.
     Uses all available features. Best for structured data with predictable patterns.

OUTLIER DETECTION METHODS:
  IQR method (non-parametric, robust):
    Lower fence = Q1 − 1.5 × IQR.  Upper fence = Q3 + 1.5 × IQR.
    Strength: no distribution assumption. Works for skewed data.
    Weakness: may flag too many points in fat-tailed distributions.

  Z-score method (parametric, assumes normality):
    z = (x − mean) / std.  Flag if |z| > 3.
    Weakness: both mean and std are inflated by the outliers being detected.
    Circular: outliers inflate std, making other outliers appear less extreme.

  Modified Z-score (robust):
    MAD = median of |xi − median|.
    modified_z = 0.6745 × (x − median) / MAD.
    Flag if |modified_z| > 3.5.
    Strength: median and MAD are unaffected by extreme values.

  Isolation Forest (ML-based, multivariate):
    Randomly partitions data. Outliers require fewer splits to isolate.
    Best for high-dimensional data. sklearn.ensemble.IsolationForest.
    contamination parameter: expected fraction of outliers.

DEDUPLICATION STRATEGIES:
  Exact: hash all key columns, drop identical rows. Catches perfect duplicates.
  Normalise first: lowercase, strip whitespace, standardise phone format.
  Fuzzy: Levenshtein or Jaro-Winkler distance for name matching.
    "Priya Sharma" vs "Priya Sharmu" → edit distance 1 → potential duplicate.
  Blocking: group by postcode or first two letters before pairwise comparison to avoid O(N²).
  Business rules: same email OR same phone+name → flag as potential duplicate.

DATA QUALITY DIMENSIONS:
  Completeness: % non-null per column.
  Uniqueness: % unique values in key columns.
  Consistency: values match expected format (phone = 10 digits, pincode = 6 digits).
  Accuracy: values match reality (hard to validate automatically; domain knowledge required).
  Timeliness: data freshness (last_updated, pipeline latency).
  Validity: values within allowed ranges and of the correct type.
    `,
    code: `
// ===== DATA CLEANING — CODE EXAMPLES =====

// EXAMPLE 1: Diagnosing missing data mechanism (MCAR test)

const example1 = \`
# import pandas as pd
# import numpy as np
# from scipy import stats

df = pd.DataFrame({
    'customer_id':  range(1, 11),
    'age':          [25, 32, None, 45, 28, None, 61, 38, None, 52],
    'income_inr':   [40000, 85000, None, 120000, 55000, None, 200000, 75000, None, 180000],
    'premium_plan': [0, 1, 1, 1, 0, 1, 1, 0, 0, 1]
})

# Step 1: Quantify missingness
print(df.isnull().mean().mul(100).round(1).astype(str) + '%')

# Step 2: Is age-missingness related to premium_plan? (MCAR test)
missing_mask = df['age'].isnull()
rate_missing  = df[missing_mask]['premium_plan'].mean()
rate_observed = df[~missing_mask]['premium_plan'].mean()
print(f"Premium rate where age MISSING:  {rate_missing:.2f}")
print(f"Premium rate where age OBSERVED: {rate_observed:.2f}")

# If the two rates differ significantly → NOT MCAR (MAR or MNAR candidate)
# Chi-square test:
# contingency = pd.crosstab(df['premium_plan'], missing_mask)
# chi2, p, _, _ = stats.chi2_contingency(contingency)
# if p < 0.05: print("Missingness is associated with premium_plan → NOT MCAR")
\`;

// EXAMPLE 2: Comparing imputation strategies for skewed data

const example2 = \`
# import numpy as np
# import pandas as pd
# from sklearn.impute import SimpleImputer

np.random.seed(42)
revenue = np.random.lognormal(mean=10, sigma=1.5, size=1000)
mask = np.random.choice([True, False], size=1000, p=[0.05, 0.95])
revenue_missing = revenue.copy()
revenue_missing[mask] = np.nan

# Strategy 1: mean imputation (biased for skewed distributions)
mean_imp = SimpleImputer(strategy='mean')
rev_mean = mean_imp.fit_transform(revenue_missing.reshape(-1,1)).flatten()

# Strategy 2: median imputation (better for right-skewed data)
med_imp = SimpleImputer(strategy='median')
rev_median = med_imp.fit_transform(revenue_missing.reshape(-1,1)).flatten()

# Compare errors on the known-missing positions:
true_vals    = revenue[mask]
mean_mae     = np.abs(rev_mean[mask]   - true_vals).mean()
median_mae   = np.abs(rev_median[mask] - true_vals).mean()
print(f"Mean imputation MAE:   {mean_mae:.2f}")
print(f"Median imputation MAE: {median_mae:.2f}")
# For right-skewed revenue, median is typically closer to the true values
\`;

// EXAMPLE 3: IQR, Z-score, and modified Z-score outlier detection

const example3 = \`
# import pandas as pd
# import numpy as np

daily_sales = pd.Series([
    12500, 13200, 11800, 14100, 12900, 13500, 11200,
    45000,   # Holiday spike — REAL extreme value (Diwali sale)
    12800, 13100,
    1300,    # Likely data entry error (₹1300 instead of ₹13000)
    14200, 12600,
    99999    # Clearly wrong entry
])

# IQR method:
Q1, Q3 = daily_sales.quantile(0.25), daily_sales.quantile(0.75)
IQR = Q3 - Q1
iqr_outliers = daily_sales[(daily_sales < Q1-1.5*IQR) | (daily_sales > Q3+1.5*IQR)]
print(f"IQR fences: [{Q1-1.5*IQR:.0f}, {Q3+1.5*IQR:.0f}]")
print(f"IQR flags: {iqr_outliers.values}")

# Modified Z-score (robust to the very outliers it detects):
median = daily_sales.median()
MAD = np.abs(daily_sales - median).median()
mod_z = 0.6745 * (daily_sales - median) / MAD
robust_outliers = daily_sales[np.abs(mod_z) > 3.5]
print(f"Modified Z-score flags: {robust_outliers.values}")

# Decision: ₹45000 (Diwali) — real event, keep or model separately.
# ₹1300 — investigate (likely typo). ₹99999 — almost certainly wrong, investigate.
# Never remove without domain investigation!
\`;

// EXAMPLE 4: Deduplication with normalisation and fuzzy matching

const example4 = \`
# import pandas as pd

customers = pd.DataFrame({
    'name':  ['Priya Sharma', 'Priya Sharma', 'priya sharma', 'Priya Sharmu', 'Rohan Mehta'],
    'email': ['priya@gmail.com', 'priya@gmail.com', 'PRIYA@gmail.com', 'priya@gmail.com', 'rohan@gmail.com'],
    'phone': ['9876543210', '9876543210', '9876543210', '9876543211', '8765432109']
})

# Step 1: normalise before deduplication
customers['email_norm'] = customers['email'].str.lower().str.strip()
customers['name_norm']  = customers['name'].str.lower().str.strip()

# Step 2: exact dedup on normalised email
clean = customers.drop_duplicates(subset=['email_norm'], keep='first')
print(f"Before: {len(customers)} rows → After exact email dedup: {len(clean)} rows")

# Step 3: flag near-duplicates for human review
# (requires: pip install rapidfuzz)
# from rapidfuzz import fuzz
# pairs = []
# for i, r1 in clean.iterrows():
#     for j, r2 in clean.iterrows():
#         if i < j:
#             sim = fuzz.ratio(r1['name_norm'], r2['name_norm'])
#             if sim > 85:
#                 pairs.append({'row1': r1['name'], 'row2': r2['name'], 'similarity': sim})
# if pairs: print("Potential near-duplicates (review manually):", pairs)
\`;

// EXAMPLE 5: Cross-column validation

const example5 = \`
# import pandas as pd

orders = pd.DataFrame({
    'order_id':    [1001, 1002, 1003, 1004, 1005],
    'order_date':  pd.to_datetime(['2024-01-10','2024-01-15','2024-01-20','2024-01-25','2024-01-30']),
    'ship_date':   pd.to_datetime(['2024-01-12','2024-01-08',None,'2024-01-26','2024-01-28']),
    'revenue':     [1500, 2000, 0, 3500, -100],
    'items_sold':  [3, 5, 2, 8, 0],
    'customer_age':[28, 17, 45, 150, 33]
})

violations = []

# Rule 1: ship_date must be on or after order_date
bad = orders[orders['ship_date'] < orders['order_date']]
if len(bad): violations.append(f"Ship before order date: {len(bad)} row(s) — order_ids {bad['order_id'].tolist()}")

# Rule 2: revenue must be non-negative (refunds tracked separately)
bad = orders[orders['revenue'] < 0]
if len(bad): violations.append(f"Negative revenue: {len(bad)} row(s)")

# Rule 3: positive revenue implies at least one item sold
bad = orders[(orders['revenue'] > 0) & (orders['items_sold'] == 0)]
if len(bad): violations.append(f"Revenue > 0 but items_sold = 0: {len(bad)} row(s)")

# Rule 4: human age must be within plausible range
bad = orders[(orders['customer_age'] < 0) | (orders['customer_age'] > 120)]
if len(bad): violations.append(f"Impossible age: {len(bad)} row(s)")

for v in violations:
    print(f"DATA QUALITY VIOLATION: {v}")
\`;

// EXAMPLE 6: SQL deduplication with ROW_NUMBER

const example6 = \`
-- Keep the most recently inserted record for each logical duplicate
WITH ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id, order_date, ROUND(amount)
            ORDER BY created_at DESC   -- prefer the latest version
        ) AS rn
    FROM orders_raw
)
SELECT * FROM ranked WHERE rn = 1;

-- Flag data quality issues in SQL:
SELECT
    order_id,
    CASE WHEN ship_date < order_date   THEN 'ERROR: shipped before ordered'    END AS issue_ship,
    CASE WHEN revenue < 0              THEN 'WARNING: negative revenue'        END AS issue_rev,
    CASE WHEN revenue > 0
          AND items_sold = 0           THEN 'ERROR: revenue with zero items'   END AS issue_items,
    CASE WHEN customer_age > 120
          OR customer_age < 0          THEN 'ERROR: impossible age'            END AS issue_age
FROM orders
WHERE ship_date < order_date
   OR revenue < 0
   OR (revenue > 0 AND items_sold = 0)
   OR customer_age NOT BETWEEN 0 AND 120;
\`;

// EXAMPLE 7: Data quality report generator

const example7 = \`
def data_quality_report(df, key_cols=None):
    report = []
    for col in df.columns:
        s = df[col]
        n = len(s)
        nulls = s.isnull().sum()
        row = {
            'column':      col,
            'dtype':       str(s.dtype),
            'null_pct':    f"{nulls/n*100:.1f}%",
            'unique_count':s.nunique(),
        }
        if pd.api.types.is_numeric_dtype(s):
            c = s.dropna()
            Q1, Q3 = c.quantile(0.25), c.quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((c < Q1-1.5*IQR) | (c > Q3+1.5*IQR)).sum()
            row.update({'min': c.min(), 'max': c.max(), 'outlier_count': outliers})
        flags = []
        if nulls/n > 0.1:              flags.append(f"HIGH_NULL({nulls/n:.0%})")
        if s.nunique() == 1:           flags.append("CONSTANT")
        if s.nunique() == n and (key_cols is None or col not in key_cols):
            flags.append("ALL_UNIQUE(ID?)")
        row['flags'] = ', '.join(flags) if flags else 'OK'
        report.append(row)
    return pd.DataFrame(report)
\`;
    `,
    bugs: `
REAL ANALYTICAL BUGS FROM DATA CLEANING MISTAKES:
-------------------------------------------------

BUG 1: MNAR treated as MCAR — biased clinical study conclusions
  Scenario: Medical study tracking recovery post-surgery. Follow-up survey was voluntary.
    25% of patients did not respond. Team did listwise deletion (removed those rows).
    Analysis: "Average recovery time: 14 days. 85% recovered fully."
    Reality: non-responders were mostly the patients who had NOT recovered or had complications.
    They stopped responding because they were still sick or readmitted.
    After investigation: true recovery rate was 64%, average time 24 days.
    Published results had to be retracted. Ethics board notified.
  Fix: Never use listwise deletion without testing WHY data is missing.
    Compare demographics of missing vs non-missing groups on ALL observed variables.
    For clinical outcomes data: assume MNAR by default. Use sensitivity analysis.

BUG 2: Removing seasonal outliers — forecast was 26% too low
  Scenario: Analyst computing average daily revenue for annual forecasting.
    Applied IQR outlier removal (standard 1.5× fence). Removed top 5% of revenue days.
    Removed days included: Diwali, New Year, Independence Day, Republic Day — all real peaks.
    Forecast: ₹1.2L/day × 365 = ₹4.38 crore.
    Actual revenue: ₹5.9 crore. Forecast was 26% too low.
    Warehouse under-stocked for peak events. ₹80L in lost sales from stockouts.
  Fix: Domain-validated outlier treatment. Seasonal events are NOT statistical outliers.
    Segment data: regular days vs known peak days → forecast each separately.
    Document the definition of "outlier" before running any detection algorithm.

BUG 3: Forward-fill contaminated the baseline for growth calculations
  Scenario: Daily stock price data, missing values on weekends/holidays forward-filled.
    Monday's "price" was Friday's price (fill). Computed week-over-week change for each day.
    Monday change = 0% (same as Friday). This pulled the mean daily growth artificially low.
    A strategy that relied on mean daily growth was systematically undercalibrated.
  Fix: For time series with known periodic gaps: handle by period explicitly.
    For random missing: linear interpolation between surrounding values.
    Mark filled values with a flag column: is_imputed = True.
    Never compute rates of change across a boundary where one side is an imputed value.

BUG 4: Deduplication on order_id only — lost legitimate transactions
  Scenario: Payment system dedup: "remove duplicate order_ids."
    A customer placed 2 separate orders on the same day, same amount (₹599 each), for two gifts.
    A frontend bug assigned them the same order_id.
    After deduplication: one order removed. ₹599 charged twice, one gift never shipped.
    After investigation: 847 similar cases in the same 3-month period.
  Fix: Deduplication key must distinguish truly unique records.
    Use composite key: (customer_id, product_id, order_timestamp, amount).
    Treat ID collisions as a separate data quality bug — log and alert, do not silently drop.

BUG 5: Inconsistent datetime formats across source systems — retention analysis off by 30 days
  Scenario: Joining sales data from two regional systems.
    System A: DD/MM/YYYY (Indian format). System B: MM/DD/YYYY (US format).
    Ambiguous dates like 01/02/2024 parsed without error in both systems.
    January 2 and February 1 were merged as the same date.
    Cohort analysis: users "acquired in January" mixed with February cohort.
    Retention metrics were wrong for all ambiguous dates. Discovered 3 months later.
  Fix: Standardise to ISO 8601 (YYYY-MM-DD) at ingestion in every pipeline.
    Specify format explicitly: pd.to_datetime(df['date'], format='%d/%m/%Y')
    Validate post-parse: assert month between 1 and 12, day between 1 and 31.
    For multi-source joins: add a source_system column, parse each separately.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — CLASSIFY THE MISSING DATA MECHANISM:
  For each scenario: classify as MCAR, MAR, or MNAR. Justify your answer.
  Then state the appropriate treatment strategy.

  a) 15% of users skipped the "annual income" field in a survey.
     Younger users (18–25) are significantly more likely to skip.

  b) A IoT temperature sensor randomly misses 2% of readings.
     Engineers confirm failures are due to random power dips unrelated to temperature.

  c) In a credit scoring dataset, applicants with very low income leave "asset_value" blank.
     They do not own assets and there is nothing to fill in.

  d) In an e-commerce dataset, purchase_amount is NULL for 30% of sessions.
     These NULLs correspond to users who browsed but did not complete a purchase.

  e) In a hospital study, 20% of patients did not complete the 6-month follow-up.
     Non-completers had similar baseline health scores but lived significantly farther from the clinic.

CHALLENGE 2 — FIX THE CLEANING PIPELINE:
  This cleaning function has 4 bugs. Identify and fix each.

  def clean_orders(df):
      # Bug 1: fills ALL NaN with 0 regardless of column semantics
      df = df.fillna(0)

      # Bug 2: removes Diwali and holiday revenue spikes as "outliers"
      Q1, Q3 = df['revenue'].quantile([0.25, 0.75])
      IQR    = Q3 - Q1
      df = df[(df['revenue'] >= Q1 - 1.5*IQR) & (df['revenue'] <= Q3 + 1.5*IQR)]

      # Bug 3: deduplicates on order_id only (misses collisions)
      df = df.drop_duplicates(subset=['order_id'])

      # Bug 4: no cross-column validation at all
      return df

  Rewrite clean_orders with: column-specific NULL handling, outlier flagging (not removal),
  composite-key deduplication, and at least three cross-column validation rules.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a production data quality pipeline for an e-commerce orders dataset.

  Input columns: order_id, customer_id, product_id, quantity, unit_price, revenue,
  order_date, ship_date, customer_age, customer_city, payment_method.

  Pipeline requirements:
  1. For each column: compute null%, unique%, dtype. Flag HIGH_NULL (> 10%), CONSTANT, ALL_UNIQUE.
  2. Diagnose missingness mechanism: for each column with > 5% missing, run a Kruskal-Wallis
     or chi-square test against every other variable. If any p < 0.05 → flag NOT_MCAR.
  3. Apply column-appropriate imputation:
     - Numeric skewed (skewness > 1): median.
     - Numeric symmetric: mean.
     - Categorical: mode.
     - Date columns: flag as UNRESOLVABLE — do not fill.
  4. Outlier detection using modified Z-score only (not standard Z-score). Explain why.
     Flag (add boolean column is_outlier_<col>), never drop silently.
  5. Cross-column rules: at least 6 business rules producing a violations report.
  6. Deduplication: exact on composite key (customer_id, product_id, order_date, revenue),
     then flag rows where same customer bought same product within 60 seconds (possible double-submit).
  7. Return: (cleaned_df, quality_report_df, violations_df) as a named tuple.
    `,
    summary: `Data cleaning is a decision-making process, not a mechanical pipeline — every choice about missing values, outliers, and duplicates encodes an assumption about WHY the problem exists. The MCAR/MAR/MNAR framework is the foundation: if you cannot classify why data is missing, you cannot know whether your imputation is introducing systematic bias that will corrupt every analysis built on top of it.`
  },

  {
    id: 4,
    title: "Exploratory Data Analysis (EDA)",
    tag: "ASK QUESTIONS FIRST, PLOT SECOND — HOW TO ACTUALLY UNDERSTAND DATA",
    color: "#6D28D9",
    tldr: `EDA is a mindset, not a checklist of charts. The core discipline is formulating a specific question before choosing a visualisation or statistic — chart-first EDA produces beautiful plots that answer no question. Univariate analysis describes each variable individually (distribution, shape, outliers); bivariate analysis explores pairwise relationships; and understanding skewness, kurtosis, and the limits of the correlation coefficient prevents common analytical mistakes.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I made 20 charts for my EDA — is that thorough?"
  → Depends entirely on whether each chart answers a question.
  → Random chart generation is not EDA. It is decoration.
  → Real EDA: write your questions BEFORE opening a notebook.
    "What drives churn?" → chart churn rate by segment, not a histogram of every column.

"My correlation matrix shows r = 0.82 — they are strongly related!"
  → Pearson correlation measures LINEAR relationship only.
  → Two variables can have a perfect nonlinear relationship and still yield r = 0.
  → Anscombe's Quartet: four datasets with identical mean, variance, and correlation (r = 0.816)
    but completely different shapes — one linear, one parabolic, one with one outlier, one vertical.
  → Always plot the scatter before interpreting any correlation coefficient.

"My skewness value is 1.3 — what does that mean?"
  → Positive skew: long right tail. A few very large values pull the mean rightward.
  → Mode < median < mean. Income, house prices, website traffic — all right-skewed.
  → Negative skew: long left tail. Mode > median > mean.
  → |skewness| > 1: substantially skewed. Report median, consider log transform.

"What does kurtosis tell me that skewness does not?"
  → Skewness: asymmetry (which tail is longer).
  → Kurtosis: tail heaviness (how extreme are the extremes?).
  → High excess kurtosis (> 0, leptokurtic): fat tails — extreme values occur more often than a normal distribution predicts. Financial returns.
  → Low excess kurtosis (< 0, platykurtic): thin tails — uniform-ish, rarely extreme.
  → Excess kurtosis > 2: your variance estimate likely understates tail risk.

"All my correlations are below 0.3 but my model performs well — why?"
  → Pearson only captures linear marginal relationships.
  → Tree models capture nonlinear effects and variable interactions.
  → Low marginal correlations do NOT mean variables are uninformative.
  → Use mutual information or post-model SHAP values for nonlinear importance.
    `,
    analogy: `
THE DETECTIVE ANALOGY — QUESTION-FIRST EDA:
--------------------------------------------
A detective does not arrive at a crime scene and start photographing everything randomly.
They arrive with specific questions:
  "Who had motive?"   "What time did this occur?"   "Are there witnesses?"
Each question directs specific evidence collection.

BAD ANALYST: Generates 30 charts. "Here are histograms of every column."
  Nobody learns anything. Nobody knows what to do. Dashboard becomes shelf-ware.

GOOD ANALYST:
  Question 1: "Why did churn increase in Q3?"
  → Chart: churn rate by month. Confirm Q3 spike.
  → Chart: churn rate by segment Q3 vs Q2. Which segments drove it?
  → Chart: NPS for churned vs retained users in Q3. Was satisfaction the driver?
  Each chart answers a question and raises the next one.

ANSCOMBE'S QUARTET = IDENTICAL FINGERPRINTS THAT ARE NOT THE SAME PERSON:
  Four datasets, each with:
    Mean X = 9, Mean Y = 7.5, Variance X = 11, Variance Y = 4.12, r = 0.816.
  Dataset I: Clean linear relationship. Linear regression is appropriate.
  Dataset II: Perfect parabola (y = x²). Same correlation. Linear model is wrong.
  Dataset III: Perfect line except for one high-leverage outlier driving the statistics.
  Dataset IV: All X values identical except one. The one point "creates" the correlation.
  
  Lesson: identical summary statistics can hide completely different data structures.
  ALWAYS visualise before modelling.

SKEWNESS = THE LEANING DISTRIBUTION:
  Right-skewed: most arrows cluster near the bullseye (centre), but a few fly far to the right.
  Income data: most people earn ₹3–15L; a few earn ₹1000L+. Mean flies right of median.
  Left-skewed: like exam scores where most students score 70–95%, a few fail badly.

KURTOSIS = THE SHAPE OF THE TAILS:
  Normal distribution: kurtosis = 3, excess kurtosis = 0.
  Fat tails (excess kurtosis > 0): extreme values more frequent than normal predicts.
    Stock market: "1-in-100-year" crashes happen every 10 years. Fat tails.
  Thin tails (excess kurtosis < 0): extreme values rarer than normal.
    Uniformly distributed exam scores (flat, no extremes).
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — EDA INTERNALS AND STATISTICAL MEASURES:
-----------------------------------------------------------------

QUESTION-FIRST EDA FRAMEWORK:
  Before opening the notebook, write down:
  1. Business objective: what decision will this analysis inform?
  2. Hypothesis list: what patterns do you EXPECT to find?
  3. Questions prioritised by business value.
  Then: for each question, select the appropriate visualisation and statistic.

  EDA stages:
  1. Familiarisation: dtypes, shape, missingness, sample rows.
  2. Univariate: distribution of each variable independently.
  3. Bivariate: pairwise relationships (continuous-continuous, categorical-continuous).
  4. Multivariate: three-way interactions, segment-level patterns, time trends.
  5. Hypothesis formulation: document findings and implications.

SKEWNESS — FORMAL DEFINITION:
  Pearson's moment skewness = E[(X − μ)³] / σ³  (third standardised moment).

  Interpretation:
    0: symmetric.
    > 0: right skew — longer right tail.
    < 0: left skew — longer left tail.
    > 1 or < −1: substantially skewed → use median, consider log transform.
    > 2: highly skewed → log or Box-Cox transform strongly recommended.

  Common right-skewed: income, wealth, page views, session duration, time-to-purchase.
  Common left-skewed: age at death (developed countries), exam scores (ceiling effect).

  Log transform for right skew: if X > 0 and skewed, log(X) ≈ normal.
    Cannot transform 0 or negative values → use log(X + 1) or log(X − min + ε).

KURTOSIS — FORMAL DEFINITION:
  Kurt = E[(X − μ)⁴] / σ⁴  (fourth standardised moment).
  Excess kurtosis = Kurt − 3 (so standard normal has excess kurtosis = 0).

  pandas .kurt() returns excess kurtosis.
  scipy.stats.kurtosis() also returns excess kurtosis by default.
  Some texts report raw kurtosis (3 for normal) — always clarify which.

  Leptokurtic (excess > 0): fat tails. More extreme events than normal predicts.
    Financial returns, earthquake magnitudes, server response times under load.
  Platykurtic (excess < 0): thin tails, flat-topped distribution.
    Uniform-ish distributions. Maximum-entropy distributions.

PEARSON vs SPEARMAN vs KENDALL:
  Pearson (r): linear correlation. Continuous, approximately normal. Sensitive to outliers.
  Spearman (ρ): rank-based. Captures MONOTONIC relationships. Robust to outliers.
    Use for: ordinal data, non-normal continuous data, heavy outliers.
  Kendall (τ): pair concordance. More robust than Spearman for small samples.

  Large gap |Pearson − Spearman| > 0.15 → relationship is nonlinear or outlier-driven.
  Always compute both for exploratory work.

CORRELATION HEATMAP LIMITATIONS:
  1. Only pairwise — interaction effects invisible.
  2. Pearson only — nonlinear relationships missed.
  3. Spurious correlations: r = 0.9 between ice cream sales and drownings (hot weather confound).
  4. Multicollinearity: highly correlated features distort regression coefficients.
     Diagnose with VIF (Variance Inflation Factor), not just the heatmap.
  5. Statistical vs practical significance: with N = 1M, even r = 0.01 is significant at p < 0.05
     but explains 0.01% of variance — useless. Always report effect size alongside p-value.

UNIVARIATE ANALYSIS — CHART SELECTION:
  Continuous → Histogram, KDE plot, Box plot, Violin plot.
  Discrete/low cardinality → Bar chart of value counts.
  Binary → Percentage bar chart.
  Time series → Line plot at appropriate resolution; decompose into trend + seasonal + residual.

BIVARIATE ANALYSIS — CHART SELECTION:
  Continuous × Continuous → Scatter plot + both Pearson and Spearman correlation.
  Categorical × Continuous → Box plots or violin plots per category + ANOVA or t-test.
  Categorical × Categorical → Heatmap of counts or %; chi-square test of independence.
  Time × Continuous → Line chart with smoothing (rolling average).
    `,
    code: `
// ===== EDA — CODE EXAMPLES =====

// EXAMPLE 1: Question-first EDA structure

const example1 = \`
# Context: e-commerce app, Q3 churn increased. Why?
# QUESTIONS written before any chart:
#   Q1: Which customer segments have the highest churn rate?
#   Q2: Did satisfaction scores drop for churned users vs retained?
#   Q3: Is there a usage pattern (logins, purchases) that predicts churn?

# import pandas as pd
# import numpy as np

df = pd.read_csv('customers.csv')

# Step 1: Data familiarisation
print(df.shape)
print(df.dtypes)
print(df.isnull().mean().mul(100).round(1))
print(df.head(3))

# Answering Q1: churn rate by segment (answers a specific question, not random chart)
churn_by_seg = (df.groupby('segment')['churned']
                  .agg(['mean','count'])
                  .rename(columns={'mean':'churn_rate','count':'n'})
                  .sort_values('churn_rate', ascending=False))
print(churn_by_seg)
# This directly answers Q1. Every subsequent chart follows a question.
\`;

// EXAMPLE 2: Complete univariate profile

const example2 = \`
# import pandas as pd
# import numpy as np
# from scipy import stats

def univariate_profile(series, name="variable"):
    clean = series.dropna()
    mean, median = clean.mean(), clean.median()
    std, skew, kurt = clean.std(), clean.skew(), clean.kurtosis()

    print(f"=== {name} ===")
    print(f"N: {len(clean)} | NaN: {series.isnull().sum()}")
    print(f"Range: [{clean.min():.2f}, {clean.max():.2f}]")
    print(f"Mean: {mean:.2f} | Median: {median:.2f}")
    print(f"Std (sample): {std:.2f} | IQR: {clean.quantile(0.75)-clean.quantile(0.25):.2f}")

    skew_flag = " ← SUBSTANTIAL SKEW (use median)" if abs(skew) > 1 else ""
    kurt_flag = " ← FAT TAILS (outlier-prone)"     if kurt > 2    else ""
    print(f"Skewness: {skew:.3f}{skew_flag}")
    print(f"Excess Kurtosis: {kurt:.3f}{kurt_flag}")

    # Normality test for moderate N:
    if len(clean) < 5000:
        _, p = stats.shapiro(clean)
        print(f"Shapiro-Wilk p={p:.4f}", "← NOT normal" if p < 0.05 else "← Approximately normal")

    # Log-transform suggestion:
    if skew > 1 and (clean > 0).all():
        log_skew = np.log(clean).skew()
        print(f"Log-transform would reduce skewness to: {log_skew:.3f}")

# Usage:
np.random.seed(42)
revenue = pd.Series(np.random.lognormal(mean=10, sigma=1.5, size=1000))
univariate_profile(revenue, "Daily Revenue (₹)")
\`;

// EXAMPLE 3: Bivariate analysis with Anscombe's lesson

const example3 = \`
# import numpy as np
# import pandas as pd
# from scipy import stats

def bivariate_analysis(df, x_col, y_col):
    valid = df[[x_col, y_col]].dropna()
    x, y = valid[x_col], valid[y_col]

    pearson_r,  pearson_p  = stats.pearsonr(x, y)
    spearman_r, spearman_p = stats.spearmanr(x, y)

    print(f"Pearson  r = {pearson_r:.3f}  (p={pearson_p:.4f})")
    print(f"Spearman ρ = {spearman_r:.3f}  (p={spearman_p:.4f})")

    if abs(pearson_r - spearman_r) > 0.15:
        print("⚠ Large Pearson–Spearman gap: likely nonlinear relationship or outlier-driven")

    # Residual plot — pattern indicates nonlinearity:
    m, b = np.polyfit(x, y, 1)
    residuals = y - (m * x + b)
    if abs(np.corrcoef(m*x+b, residuals)[0,1]) > 0.2:
        print("⚠ Residuals correlated with fitted values → relationship is nonlinear")

    print("→ Visualise the scatter before concluding anything from r alone (Anscombe's lesson)")

bivariate_analysis(df, 'website_speed_s', 'conversion_rate')
\`;

// EXAMPLE 4: Correlation heatmap with significance filtering

const example4 = \`
# import pandas as pd
# import numpy as np
# import seaborn as sns
# from scipy.stats import pearsonr

def smart_corr_heatmap(df, threshold=0.05):
    num_df = df.select_dtypes(include=np.number)
    corr   = num_df.corr()

    # Compute p-values and mask non-significant pairs:
    pvals = pd.DataFrame(index=corr.index, columns=corr.columns, dtype=float)
    for c1 in corr.columns:
        for c2 in corr.columns:
            if c1 == c2:
                pvals.loc[c1, c2] = 0.0
            else:
                valid = num_df[[c1, c2]].dropna()
                _, p  = pearsonr(valid[c1], valid[c2])
                pvals.loc[c1, c2] = p

    insig_mask = pvals >= threshold  # mask out non-significant correlations

    # sns.heatmap(corr, mask=insig_mask, annot=True, fmt='.2f',
    #             cmap='RdBu_r', center=0, vmin=-1, vmax=1)

    # Flag multicollinearity candidates:
    high = [(c1,c2,corr.loc[c1,c2])
            for c1 in corr.columns for c2 in corr.columns
            if c1 < c2 and abs(corr.loc[c1,c2]) > 0.8]
    if high:
        print("High correlations (|r| > 0.8) — check for multicollinearity:")
        for c1, c2, r in sorted(high, key=lambda x: abs(x[2]), reverse=True):
            print(f"  {c1} × {c2}: r = {r:.3f}")

    # IMPORTANT: high correlation ≠ causation. Check for confounders!
\`;

// EXAMPLE 5: Detecting bimodal distributions

const example5 = \`
# import numpy as np
# import pandas as pd
# from scipy.signal import find_peaks
# from scipy.stats import gaussian_kde

def check_bimodality(series, name="variable"):
    clean = series.dropna().values
    kde   = gaussian_kde(clean)
    x     = np.linspace(clean.min(), clean.max(), 300)
    dens  = kde(x)
    peaks, _ = find_peaks(dens, height=dens.max()*0.1, distance=len(x)//10)

    if len(peaks) >= 2:
        print(f"⚠ {name}: BIMODAL ({len(peaks)} modes detected)")
        print(f"   Mode approx values: {x[peaks].round(1)}")
        print(f"   Mean ({clean.mean():.1f}) falls between modes — misleading summary!")
        print("   Recommendation: segment data and analyse each mode separately.")
    else:
        print(f"{name}: Unimodal — mean/median are reasonable summaries.")

# Example: customer ages for a fintech app
np.random.seed(42)
young_investors = np.random.normal(loc=25, scale=3, size=600)
senior_HNIs     = np.random.normal(loc=52, scale=5, size=400)
age_data = pd.Series(np.concatenate([young_investors, senior_HNIs]))
check_bimodality(age_data, "Customer Age")
\`;

// EXAMPLE 6: EDA for categorical vs numeric — with statistical test

const example6 = \`
# import pandas as pd
# from scipy import stats

def cat_vs_num(df, cat_col, num_col):
    groups = {name: grp[num_col].dropna().values
              for name, grp in df.groupby(cat_col)}

    print(f"\\n{num_col} by {cat_col}:")
    for name, vals in groups.items():
        print(f"  {name}: n={len(vals)}, median={np.median(vals):.2f}, mean={np.mean(vals):.2f}")

    # Statistical test:
    if len(groups) == 2:
        t, p = stats.ttest_ind(*groups.values())
        print(f"Independent t-test: t={t:.3f}, p={p:.4f}")
    else:
        f, p = stats.f_oneway(*groups.values())
        print(f"One-way ANOVA: F={f:.3f}, p={p:.4f}")

    if p < 0.05:
        print("→ Statistically significant difference between groups (p < 0.05)")
        # Always also report effect size (Cohen's d for 2 groups, η² for ANOVA)
    else:
        print("→ No statistically significant difference detected")

cat_vs_num(df, 'plan_type', 'lifetime_value_inr')
\`;

// EXAMPLE 7: Full EDA pipeline function

const example7 = \`
def run_eda_pipeline(df, target_col=None):
    print("=" * 55)
    print("PHASE 1: FAMILIARISATION")
    print("=" * 55)
    print(f"Shape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    missing = df.isnull().mean().mul(100).round(1)
    print("Missing > 0:\\n", missing[missing > 0].sort_values(ascending=False))

    print("\\n" + "=" * 55)
    print("PHASE 2: UNIVARIATE")
    print("=" * 55)
    for col in df.select_dtypes(include=np.number).columns:
        sk = df[col].skew()
        ku = df[col].kurtosis()
        flag = ""
        if abs(sk) > 1: flag += " [SKEWED]"
        if ku > 2:       flag += " [FAT TAILS]"
        print(f"  {col}: skew={sk:.2f}, excess_kurt={ku:.2f}{flag}")

    print("\\n" + "=" * 55)
    print("PHASE 3: BIVARIATE VS TARGET")
    print("=" * 55)
    if target_col:
        num_cols = df.select_dtypes(include=np.number).columns.drop(target_col, errors='ignore')
        corr = df[num_cols].corrwith(df[target_col]).sort_values(key=abs, ascending=False)
        print(f"Top correlations with '{target_col}' (Pearson):")
        print(corr.head(8).round(3))

    print("\\n" + "=" * 55)
    print("PHASE 4: WRITE YOUR HYPOTHESES")
    print("=" * 55)
    print("H1: [fill in from Phase 1–3 findings]")
    print("H2: [fill in from Phase 1–3 findings]")
    print("→ Each hypothesis should specify: direction, variable, segment, expected magnitude.")
\`;
    `,
    bugs: `
REAL ANALYTICAL BUGS FROM EDA MISTAKES:
----------------------------------------

BUG 1: Correlation heatmap without scatter — false confidence in a linear model
  Scenario: Analyst saw r = 0.78 between website_speed and conversion_rate.
    Built linear regression: "Each 1-second improvement → 2.3% conversion increase."
    Model deployed. Speed improved. Zero change in conversions.
    Investigation: scatter showed a THRESHOLD effect — below 3 seconds no benefit.
    Above 3 seconds: every additional second caused a steep non-linear drop.
    Linear model captured the general direction but missed the business-critical threshold.
  Fix: Always plot the scatter before modelling. Check residuals after fitting.
    Use polynomial or piecewise regression when residuals show a systematic pattern.

BUG 2: Ignoring bimodality — features designed for the average nobody
  Scenario: Product team ran EDA on session durations. Mean = 8.3 min, median = 5.1 min.
    All UX features designed for "the 8-minute user."
    Later analysis: 60% of sessions were 1–3 minutes (quick task completion).
    40% were 15–25 minutes (deep browsing). Almost no 8-minute sessions existed.
    Features fit neither segment. Churn spiked post-launch.
  Fix: When mean and median differ by > 50%, investigate for bimodality.
    Plot a KDE to identify multiple peaks. Segment and analyse each mode separately.

BUG 3: Chart-first EDA — 15 dashboards, zero decisions made
  Scenario: Data team presented executive dashboard with 15 interactive charts.
    Executive: "This is beautiful. What should I do with it?"
    Team: "You can filter by date range and region!"
    No specific questions had been answered. No recommendations made.
    ₹40L consulting engagement. Dashboard became shelf-ware within 6 weeks.
  Fix: Start with the decisions the stakeholder must make.
    "You need to decide: invest in City A or City B next quarter."
    One chart: ROI by city with confidence intervals. That is the deliverable.
    EDA purpose is always "what should we do?" not "here is all the data."

BUG 4: Pearson vs Spearman mismatch — wrong predictor dropped
  Scenario: Analyst computed Pearson r = 0.23 between days_to_first_purchase and lifetime_value.
    Conclusion: "Weak relationship. Time-to-first-purchase is not predictive of LTV."
    Product team invested in other features for 6 months.
    A follow-up analyst computed Spearman ρ = 0.61 on the same variables.
    The relationship was strongly monotonic but nonlinear — Pearson missed it completely.
    Days-to-first-purchase was one of the strongest LTV predictors.
  Fix: Always compute both Pearson and Spearman for exploratory work.
    Report both. If |Pearson − Spearman| > 0.2: relationship is nonlinear or outlier-driven.

BUG 5: Statistical significance without effect size — "significant" but useless
  Scenario: EDA found r = 0.08 between email_open_rate and purchase_probability.
    N = 2,000,000. p = 0.0001. "Statistically significant! Let's optimise email open rates."
    r² = 0.0064. Email open rate explains 0.64% of purchase variance.
    Full email optimisation campaign. Open rates improved 15%. Purchases: unchanged.
    With N = 2M, r = 0.08 is significant at any threshold. Practically worthless.
  Fix: Always report r² (practical effect size) alongside p-value.
    With large N: only consider correlations where r² > 0.05 (explains > 5% of variance).
    Rule: "statistically significant" is a threshold; "practically significant" is a judgement.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE ANALYTICAL CONCLUSION:
  A dataset of 500 job applicants: years_experience (0–20), test_score (0–100), hired (0/1).

  Computed statistics:
  - Mean years_experience = 6.2, Median = 5.0, Skewness = 1.8
  - Mean test_score = 74.3, Median = 76.0, Skewness = −0.4
  - Pearson r (hired vs experience) = 0.31, Spearman ρ = 0.45
  - Pearson r (hired vs test_score) = 0.52, Spearman ρ = 0.53

  a) For years_experience: should the summary report mean or median? Why?
  b) The Pearson–Spearman gap for experience (0.31 vs 0.45): what does this suggest?
  c) If you plotted years_experience vs hired: what shape would you expect?
  d) Which is the better predictor of hiring? How would you communicate this?
  e) A manager asks: "Should we always prefer candidates with 10+ years experience?"
     What additional EDA would you do before answering?

CHALLENGE 2 — FIX THE EDA APPROACH:
  A junior analyst submitted this EDA report. Identify 4 methodological problems.

  "EDA Report — Customer Dataset"
  1. Plotted histograms for all 47 columns.
  2. Generated Pearson correlation heatmap of all numeric columns.
  3. Noted: "r = −0.63 between customer_age and app_usage_minutes. Interesting finding!"
  4. Noted: "purchase_frequency has mean = 2.3, skewness = 2.1.
     The average customer buys 2.3 times per year."
  5. Ran chi-square test on all 47 column pairs. Found 12 significant pairs (p < 0.05).
  6. Conclusion: "Dataset looks clean and ready for modelling."

  For each problem: (a) what is wrong, (b) what should have been done instead.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a question-driven EDA for a subscription app churn dataset.

  Columns: user_id, plan_type (free/basic/premium), signup_date, last_active_date,
  sessions_last_30d, features_used_count, support_tickets, churned (0/1).

  Business question: "Premium users churn at 8% vs 3% for basic — why?"

  Requirements:
  1. Write 5 specific hypotheses BEFORE any code (each must specify: variable, direction, segment).
  2. For each hypothesis: state the exact plot type and statistic to test it.
  3. Stratified bivariate analysis: sessions_last_30d vs churned, separately for each plan_type.
     Are the relationships different across plan types? (Use Spearman ρ per stratum.)
  4. Cohort analysis: churn rate by signup_month cohort (last 12 months).
     Is churn worsening over time or is it stable?
  5. Compute Spearman correlation between all numeric features and churned.
     Annotate each with: ρ value, p-value, and practical significance flag (|ρ| > 0.15).
  6. Write a 3-bullet findings summary with one recommended action per finding.
    `,
    summary: `EDA is detective work — each chart should answer a question you wrote down before opening the notebook. The two disciplines that separate rigorous EDA from decorative chart-making are: formulate your hypotheses first, and always plot the scatter before trusting any correlation coefficient — Anscombe's Quartet proves that identical statistics can hide completely different data structures.`
  },

  {
    id: 5,
    title: "SQL Analytics — Window Functions, CTEs & Cohort Queries",
    tag: "THE SQL PATTERNS THAT POWER EVERY ANALYTICS DASHBOARD",
    color: "#0F766E",
    tldr: `SQL window functions (ROW_NUMBER, RANK, LAG/LEAD, SUM OVER, AVG OVER) compute calculations across related rows without collapsing them the way GROUP BY does. CTEs break complex multi-step analyses into readable, named intermediate steps. Combined with CASE WHEN for cohort segmentation and date arithmetic for retention queries, these patterns form the backbone of analytical SQL used in every modern data warehouse.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I want both individual rows AND a group aggregate — GROUP BY removes my rows"
  → GROUP BY: collapses rows. One row per group with the aggregate. Individual rows gone.
  → PARTITION BY (window): computes aggregate per group and keeps all rows.
  → Example: revenue AND running total per user in one query.
    GROUP BY SUM: one row per user with their total. Individual transactions vanish.
    SUM() OVER (PARTITION BY user_id ORDER BY date): running total on every row. All rows kept.

"How do I compute month-over-month growth without a messy self-join?"
  → LAG(column, 1) OVER (ORDER BY date): gives the previous row's value.
  → mom_growth = (revenue - LAG(revenue)) / LAG(revenue) * 100.
  → Cleaner and far more readable than: JOIN orders o1 ON o1.month = o2.month - interval '1 month'.

"My query works but it is 5 levels of nested subqueries — unreadable"
  → CTEs (WITH clauses): give names to intermediate query results.
  → Define up to N named steps; the final SELECT combines them.
  → Readable, testable, and maintainable. Each CTE can be run independently for debugging.

"How do I find the N-th most recent purchase per customer?"
  → ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) = N.
  → Filter WHERE rn = N. Clean, efficient, no complex self-join needed.

"What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?"
  → ROW_NUMBER: always unique sequential numbers, even for ties. 1, 2, 3, 4.
  → RANK: ties get the same rank; next rank is skipped. 1, 2, 2, 4 (no 3).
  → DENSE_RANK: ties get the same rank; no gap afterwards. 1, 2, 2, 3.
  → For "top 3 sellers": DENSE_RANK ensures ties are included fairly.

"How do I compute a 7-day rolling average without Python?"
  → AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).
  → The ROWS frame clause defines how many preceding rows to include in the window.
    `,
    analogy: `
THE SCHOOL REPORT CARD ANALOGY — GROUP BY vs WINDOW FUNCTIONS:
---------------------------------------------------------------
CLASS REPORT (GROUP BY):
  Teacher issues ONE class-level summary row per class:
    "Class A: average score 72. Highest 95. Lowest 45."
  Individual students disappear. "How did Priya do relative to the class?" — unanswerable.
  This is GROUP BY: aggregate and collapse. All individual rows gone.

INDIVIDUAL REPORT WITH CLASS CONTEXT (WINDOW FUNCTION):
  Every student receives their own row with individual score AND class-level stats:
    Priya | 88 | Rank: 3 | Class average: 72 | Above average: YES
    Rohan | 65 | Rank: 12 | Class average: 72 | Above average: NO
  All rows kept. Group stats attached to each row.
  This is PARTITION BY: compute group aggregates, attach them to every individual row.

LAG/LEAD = THE PROGRESS TRACKING SYSTEM:
  Without LAG: "Priya scored 85 in Term 2." Better or worse than Term 1?
  Unknown without another query. Would require a self-join.

  With LAG: Term 2 result AND Term 1 result on the SAME row:
    Priya | Term 2: 85 | Term 1 (LAG): 78 | Improvement: +7

  LAG looks backward; LEAD looks forward.
  No self-join required. Clean, readable SQL.

CTE = THE WHITEBOARD PROBLEM-SOLVING APPROACH:
  Complex question: "Find customers who bought in Month 1 but not Month 2,
  who were in the top 20% by revenue in Month 1."

  Without CTE: one massive nested subquery nobody can debug or maintain.

  WITH CTEs:
    Step 1 (month1_buyers):  all customers who purchased in Month 1.
    Step 2 (top_20pct):      filter to top 20% by revenue from month1_buyers.
    Step 3 (month2_buyers):  all customers who purchased in Month 2.
    Final SELECT: top_20pct LEFT JOIN month2_buyers WHERE month2_id IS NULL.
  Each step has a name, is independently testable, and reads like plain English.

MOVING AVERAGE = THE SMOOTHED TREND LINE:
  Raw daily revenue: ₹12k, ₹5k, ₹48k, ₹11k, ₹14k, ₹50k — spiky, noisy.
  7-day moving average: ₹20k, ₹21k, ₹22k, ₹24k — smooth, trend visible.
  AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — WINDOW FUNCTIONS AND ANALYTICAL SQL:
---------------------------------------------------------------

WINDOW FUNCTION SYNTAX:
  function_name(args) OVER (
      PARTITION BY partition_columns    -- Optional: groups (rows kept, unlike GROUP BY)
      ORDER BY sort_columns             -- Required for position-based functions (LAG, RANK, etc.)
      [frame_clause]                    -- Optional: defines the sliding window
  )

  Frame clause options:
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      → Running total (default for cumulative SUM/AVG).
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      → 7-row moving window (current + prior 6).
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
      → Centred 7-row window (3 before, current, 3 after).
    RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
      → Time-based window: all rows within the past 7 days, regardless of row count.
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      → Entire partition (same as no frame clause for SUM).

  ROWS vs RANGE:
    ROWS: counts physical rows. "Previous 7 rows" = exactly 7 rows above.
    RANGE: value-based. "Previous 7 days" = all rows with date within 7 days of current.
    For date-based rolling averages: RANGE is usually more appropriate (handles gaps in dates).

RANKING FUNCTIONS DEEP DIVE:
  ROW_NUMBER(): unique sequential number. Ties broken arbitrarily by engine.
    Use for: pagination (LIMIT N OFFSET M alternative), deduplication (keep rn=1), sampling.

  RANK(): ties get the same rank; following rank is skipped.
    1, 2, 2, 4 → no third place. Like Olympic podium — two silver, no bronze.

  DENSE_RANK(): ties get same rank; no skip.
    1, 2, 2, 3 → third distinct rank level exists even though two people share second.
    Use for: finding Nth distinct salary band, Nth product category.

  NTILE(n): divides ordered rows into n equal buckets (1 to n).
    NTILE(4) → quartile bucket (1=bottom, 4=top).
    NTILE(100) → percentile bucket.
    Remainder rows allocated to earlier buckets (NTILE(4) for 7 rows: sizes 2,2,2,1).

  PERCENT_RANK(): (rank − 1) / (total rows − 1). Range 0 to 1.
  CUME_DIST(): proportion of rows with value ≤ current value.

LAG AND LEAD — COMMON PATTERNS:
  LAG(value, offset, default_if_null) OVER (PARTITION BY ... ORDER BY ...)
  LEAD(value, offset, default_if_null) OVER (PARTITION BY ... ORDER BY ...)

  1. Month-over-month growth:
     (revenue - LAG(revenue,1,0)) / NULLIF(LAG(revenue,1,0), 0) * 100

  2. Days between repeat purchases:
     order_date - LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date)

  3. Repeat purchase flag:
     CASE WHEN LAG(user_id) OVER (ORDER BY created_at) = user_id THEN 1 ELSE 0 END

  4. Next event type in a session:
     LEAD(event_type) OVER (PARTITION BY session_id ORDER BY event_ts)

  5. First value in partition:
     FIRST_VALUE(signup_date) OVER (PARTITION BY customer_id ORDER BY signup_date)

  6. Last value (needs explicit frame!):
     LAST_VALUE(date) OVER (PARTITION BY user_id ORDER BY date
       ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)

GROUP BY vs PARTITION BY:
  GROUP BY:    aggregates and collapses rows. One output row per group.
  PARTITION BY: defines the group for window calculation. All input rows preserved.

  Can combine both in one query:
    SELECT
        user_id, order_date, revenue,
        SUM(revenue) OVER (PARTITION BY user_id) AS user_total_revenue,  -- window
        AVG(revenue) OVER ()                      AS global_avg_revenue   -- global window
    FROM orders;

CTE BEST PRACTICES:
  Use when:
  - Query needs 3+ logical steps.
  - Same subquery referenced more than once.
  - Recursive queries (hierarchies, org charts, connected graphs).
  - Debugging: comment out the final SELECT and run the CTE SELECT alone.

  Recursive CTE pattern:
    WITH RECURSIVE tree AS (
        SELECT id, parent_id, name, 1 AS depth
        FROM employees
        WHERE parent_id IS NULL          -- anchor: root nodes
        UNION ALL
        SELECT e.id, e.parent_id, e.name, t.depth + 1
        FROM employees e
        JOIN tree t ON e.parent_id = t.id  -- recursive step
    )
    SELECT * FROM tree ORDER BY depth, name;

RETENTION QUERY PATTERNS:
  Day-N retention: % of Day-0 users who return on Day N.

  Step 1: find each user's first event date (cohort assignment).
  Step 2: for each user in the cohort, find whether they had an event on Day N.
  Step 3: aggregate by cohort_date.

  WITH cohorts AS (
      SELECT user_id, MIN(DATE(event_time)) AS cohort_date
      FROM events GROUP BY user_id
  ),
  day7_activity AS (
      SELECT DISTINCT c.user_id, c.cohort_date
      FROM cohorts c
      JOIN events e ON c.user_id = e.user_id
       AND DATE(e.event_time) = c.cohort_date + INTERVAL '7 days'
  )
  SELECT
      c.cohort_date,
      COUNT(DISTINCT c.user_id)   AS cohort_size,
      COUNT(DISTINCT d.user_id)   AS day7_retained,
      ROUND(COUNT(DISTINCT d.user_id)::NUMERIC / COUNT(DISTINCT c.user_id) * 100, 1) AS day7_rate
  FROM cohorts c
  LEFT JOIN day7_activity d ON c.user_id = d.user_id
  GROUP BY c.cohort_date
  ORDER BY c.cohort_date;
    `,
    code: `
// ===== SQL ANALYTICS — CODE EXAMPLES =====

// EXAMPLE 1: GROUP BY vs PARTITION BY — the fundamental difference

const example1 = \`
-- GROUP BY: one row per customer. Individual orders gone.
SELECT customer_id, SUM(amount) AS total_spent
FROM orders
GROUP BY customer_id;

-- PARTITION BY: all order rows kept. Group total attached to each row.
SELECT
    order_id,
    customer_id,
    amount,
    SUM(amount) OVER (PARTITION BY customer_id)        AS customer_total,
    amount / SUM(amount) OVER (PARTITION BY customer_id) AS pct_of_customer_total,
    SUM(amount) OVER ()                                AS grand_total,
    RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rank_within_customer
FROM orders
ORDER BY customer_id, order_id;
-- All original rows present. No GROUP BY anywhere.
\`;

// EXAMPLE 2: ROW_NUMBER, RANK, DENSE_RANK — and when to use each

const example2 = \`
-- Customer revenue ranking — three functions, three behaviours for ties:
SELECT
    customer_id,
    total_revenue,
    ROW_NUMBER()   OVER (ORDER BY total_revenue DESC) AS row_num,     -- 1,2,3,4,5 (no ties)
    RANK()         OVER (ORDER BY total_revenue DESC) AS rank_val,    -- 1,2,2,4,5 (skip 3)
    DENSE_RANK()   OVER (ORDER BY total_revenue DESC) AS dense_rank,  -- 1,2,2,3,4 (no skip)
    NTILE(4)       OVER (ORDER BY total_revenue DESC) AS quartile,    -- 1,1,2,2,3,3,4,4
    PERCENT_RANK() OVER (ORDER BY total_revenue DESC) AS pct_rank     -- 0.0 to 1.0
FROM (
    SELECT customer_id, SUM(amount) AS total_revenue
    FROM orders
    GROUP BY customer_id
) t;

-- Use case: top-N per category
-- "Top 2 sellers per city (include ties at position 2)":
WITH ranked AS (
    SELECT seller_id, city, monthly_gmv,
           DENSE_RANK() OVER (PARTITION BY city ORDER BY monthly_gmv DESC) AS dr
    FROM seller_monthly_stats
    WHERE month = '2024-09-01'
)
SELECT * FROM ranked WHERE dr <= 2;
\`;

// EXAMPLE 3: LAG and LEAD — month-over-month analysis

const example3 = \`
-- Monthly revenue with MoM growth rate (no self-join needed):
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', order_date)  AS month,
        SUM(amount)                       AS revenue
    FROM orders
    GROUP BY 1
)
SELECT
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month)               AS prev_month_revenue,
    revenue - LAG(revenue, 1) OVER (ORDER BY month)     AS absolute_change,
    ROUND(
        (revenue - LAG(revenue,1) OVER (ORDER BY month))
        / NULLIF(LAG(revenue,1) OVER (ORDER BY month), 0) * 100
    , 1)                                                 AS mom_growth_pct,
    -- Year-over-year using LAG with offset=12:
    LAG(revenue, 12) OVER (ORDER BY month)              AS same_month_last_year,
    ROUND(
        (revenue - LAG(revenue,12) OVER (ORDER BY month))
        / NULLIF(LAG(revenue,12) OVER (ORDER BY month), 0) * 100
    , 1)                                                 AS yoy_growth_pct
FROM monthly
ORDER BY month;
\`;

// EXAMPLE 4: Running totals and moving averages

const example4 = \`
-- Daily orders: running total, 7-day moving average, 7-day sum:
SELECT
    order_date,
    daily_orders,
    -- Running total from day 1:
    SUM(daily_orders) OVER (ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)   AS running_total,
    -- 7-day moving average (current + prior 6 days):
    ROUND(AVG(daily_orders) OVER (ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1)       AS ma_7d,
    -- 28-day moving sum:
    SUM(daily_orders) OVER (ORDER BY order_date
        ROWS BETWEEN 27 PRECEDING AND CURRENT ROW)          AS rolling_28d_sum,
    -- Centred 7-day average (3 before + current + 3 after):
    ROUND(AVG(daily_orders) OVER (ORDER BY order_date
        ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING), 1)       AS centred_ma_7d
FROM daily_order_counts
ORDER BY order_date;
\`;

// EXAMPLE 5: CTE for readable multi-step cohort analysis

const example5 = \`
-- "Which acquisition channels produce customers with highest 90-day LTV?"
WITH
-- Step 1: assign each user to their first-touch channel and cohort week
user_cohorts AS (
    SELECT
        user_id,
        channel,
        DATE_TRUNC('week', MIN(created_at))  AS cohort_week,
        MIN(created_at)                       AS first_seen
    FROM user_events
    WHERE event_type = 'signup'
    GROUP BY user_id, channel
),
-- Step 2: sum revenue in the first 90 days per user
user_revenue_90d AS (
    SELECT
        o.user_id,
        SUM(o.amount) AS revenue_90d
    FROM orders o
    JOIN user_cohorts uc ON o.user_id = uc.user_id
    WHERE o.order_date <= uc.first_seen + INTERVAL '90 days'
    GROUP BY o.user_id
),
-- Step 3: join and aggregate by channel
channel_summary AS (
    SELECT
        uc.channel,
        uc.cohort_week,
        COUNT(DISTINCT uc.user_id)              AS cohort_size,
        COUNT(DISTINCT ur.user_id)              AS buyers,
        SUM(COALESCE(ur.revenue_90d, 0))        AS total_revenue_90d,
        AVG(COALESCE(ur.revenue_90d, 0))        AS avg_ltv_90d
    FROM user_cohorts uc
    LEFT JOIN user_revenue_90d ur ON uc.user_id = ur.user_id
    GROUP BY uc.channel, uc.cohort_week
)
-- Final: readable output
SELECT
    channel,
    cohort_week,
    cohort_size,
    buyers,
    ROUND(buyers::NUMERIC / cohort_size * 100, 1)  AS conversion_pct,
    ROUND(avg_ltv_90d, 2)                           AS avg_90d_ltv_inr
FROM channel_summary
ORDER BY cohort_week, avg_ltv_90d DESC;
\`;

// EXAMPLE 6: CASE WHEN for cohort segmentation

const example6 = \`
-- Segment customers by RFM (Recency, Frequency, Monetary) using CASE WHEN:
WITH rfm_raw AS (
    SELECT
        customer_id,
        MAX(order_date)                               AS last_order_date,
        COUNT(*)                                      AS order_count,
        SUM(amount)                                   AS total_spend,
        CURRENT_DATE - MAX(order_date)                AS days_since_last_order
    FROM orders
    GROUP BY customer_id
),
rfm_scored AS (
    SELECT *,
        CASE
            WHEN days_since_last_order <= 30  THEN 3   -- Recent
            WHEN days_since_last_order <= 90  THEN 2   -- Lapsing
            ELSE 1                                     -- Churned
        END AS recency_score,
        CASE
            WHEN order_count >= 10 THEN 3
            WHEN order_count >= 3  THEN 2
            ELSE 1
        END AS frequency_score,
        CASE
            WHEN total_spend >= 50000 THEN 3
            WHEN total_spend >= 10000 THEN 2
            ELSE 1
        END AS monetary_score
    FROM rfm_raw
)
SELECT
    customer_id,
    recency_score, frequency_score, monetary_score,
    recency_score + frequency_score + monetary_score AS rfm_total,
    CASE
        WHEN recency_score = 3 AND frequency_score = 3 AND monetary_score = 3
            THEN 'Champions'
        WHEN recency_score = 3 AND frequency_score >= 2
            THEN 'Loyal'
        WHEN recency_score = 1 AND frequency_score >= 2
            THEN 'At Risk'
        WHEN recency_score = 1 AND frequency_score = 1
            THEN 'Lost'
        ELSE 'Potential Loyalist'
    END AS rfm_segment
FROM rfm_scored
ORDER BY rfm_total DESC;
\`;

// EXAMPLE 7: Day-N retention cohort query

const example7 = \`
-- Day-1, Day-7, Day-30 retention for weekly signup cohorts:
WITH cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('week', MIN(event_date)) AS cohort_week,
        MIN(event_date)                      AS day0
    FROM app_events
    WHERE event_type = 'signup'
    GROUP BY user_id
),
activity AS (
    -- All event dates per user
    SELECT DISTINCT user_id, event_date FROM app_events
),
retention_flags AS (
    SELECT
        c.cohort_week,
        c.user_id,
        MAX(CASE WHEN a.event_date = c.day0 + 1  THEN 1 ELSE 0 END) AS day1,
        MAX(CASE WHEN a.event_date = c.day0 + 7  THEN 1 ELSE 0 END) AS day7,
        MAX(CASE WHEN a.event_date = c.day0 + 30 THEN 1 ELSE 0 END) AS day30
    FROM cohorts c
    LEFT JOIN activity a ON c.user_id = a.user_id
    GROUP BY c.cohort_week, c.user_id
)
SELECT
    cohort_week,
    COUNT(*)                                           AS cohort_size,
    ROUND(AVG(day1)  * 100, 1)                         AS day1_retention_pct,
    ROUND(AVG(day7)  * 100, 1)                         AS day7_retention_pct,
    ROUND(AVG(day30) * 100, 1)                         AS day30_retention_pct
FROM retention_flags
GROUP BY cohort_week
ORDER BY cohort_week;
\`;
    `,
    bugs: `
REAL ANALYTICAL BUGS FROM SQL ANALYTICS MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: GROUP BY used where PARTITION BY was needed — rows collapsed, analysis wrong
  Scenario: Analyst wanted "each order's revenue as % of that customer's total."
    Wrote: SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id;
    Then tried to join back to the orders table to compute the percentage.
    Self-join produced duplicate rows for customers with multiple orders on the same date.
    Final % figures were wrong for 23% of customers (those with date collisions in the join).
  Fix: Use a window function — no join needed, no duplicates possible:
    SELECT order_id, customer_id, amount,
           amount / SUM(amount) OVER (PARTITION BY customer_id) * 100 AS pct_of_total
    FROM orders;

BUG 2: LAST_VALUE without frame clause — always returns current row's value
  Scenario: Analyst wanted first and last order date per customer on each row.
    FIRST_VALUE worked correctly. LAST_VALUE always returned the current row's date.
    Report showed identical "first order" and "last order" for every transaction.
    Retention calculations: all customers looked like they made only one purchase.
  Root cause: LAST_VALUE default frame = RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.
    With this frame: "last value up to current row" = current row itself.
  Fix: Always specify an explicit unbounded frame for LAST_VALUE:
    LAST_VALUE(order_date) OVER (
        PARTITION BY customer_id ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_order_date

BUG 3: Moving average ROWS vs RANGE — gaps in daily data cause wrong averages
  Scenario: Daily sales moving average for product inventory planning.
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW.
    On Sundays (no orders): Sunday row is absent from the table.
    The "7-day" average for Monday used the prior 6 rows — but those 6 rows
    covered 8 calendar days (skipped Sunday). The "7-day" average was actually a "8-day" average.
    Inventory orders were 15% too low due to underestimated demand.
  Fix: Generate a complete date spine first (every calendar day), then fill missing days with 0.
    Or use RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW for true calendar windows.

BUG 4: Retention query using INNER JOIN instead of LEFT JOIN — inflated retention rates
  Scenario: Day-7 retention query joined events to cohorts with INNER JOIN.
    Users who did NOT return on Day 7 had no event row → excluded by INNER JOIN.
    Only retained users appeared. "Day-7 retention: 82%!" — looked amazing.
    Actual retention (LEFT JOIN, count NULLs as not-retained): 34%.
    Roadmap decisions were made on 82% retention that did not exist.
  Fix: ALWAYS use LEFT JOIN from cohorts to activity for retention queries.
    A missing row means the user did NOT return → counts as 0 in the average.
    COUNT(DISTINCT activity.user_id) / COUNT(DISTINCT cohort.user_id) for the rate.

BUG 5: CTE referenced in wrong order — circular reference error
  Scenario: Analyst split a query into CTEs for readability. One CTE referenced another
    that had not been defined yet. PostgreSQL error: "relation X does not exist."
    Analyst spent 90 minutes debugging, suspecting a schema issue.
  Root cause: CTEs must be defined BEFORE they are referenced.
    In a WITH block: order matters. Later CTEs can reference earlier ones, not vice versa.
    (Exception: RECURSIVE CTEs — these use UNION ALL with a self-reference by design.)
  Fix: Order CTEs from most foundational (raw data, simple filters) to most derived (complex joins, final aggregates).
    Name CTEs with the progression: raw → filtered → enriched → aggregated → final.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE SQL OUTPUT:
  Given this table: orders(order_id, customer_id, amount, order_date)
  Rows: (1, 'C1', 100, '2024-01-10'), (2, 'C1', 200, '2024-01-15'),
        (3, 'C2', 150, '2024-01-12'), (4, 'C1', 50, '2024-01-20'),
        (5, 'C2', 300, '2024-01-18')

  For each query: predict the output (all rows, all columns, exact values):

  a) SELECT order_id, customer_id, amount,
            SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS running_total
     FROM orders ORDER BY customer_id, order_date;

  b) SELECT order_id, customer_id, amount,
            ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn,
            RANK()       OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rnk
     FROM orders;
     (Does ROW_NUMBER differ from RANK here? Why or why not?)

  c) SELECT order_id, customer_id, amount,
            LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount,
            amount - LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY order_date) AS change
     FROM orders ORDER BY customer_id, order_date;

  d) What is the difference in output between these two queries?
     Query A: SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id;
     Query B: SELECT DISTINCT customer_id, SUM(amount) OVER (PARTITION BY customer_id) FROM orders;

CHALLENGE 2 — FIX THE SQL BUGS:
  Each query has one bug. Identify it and write the corrected version.

  -- Bug 1: LAST_VALUE always returns current row's amount
  SELECT order_id, customer_id,
         LAST_VALUE(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS last_order_amount
  FROM orders;

  -- Bug 2: Moving average "7 days" but skips weekends (no rows on weekends in table)
  SELECT order_date, daily_revenue,
         AVG(daily_revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
           AS moving_avg_7d
  FROM daily_sales;

  -- Bug 3: Retention rate looks 100% because of wrong join type
  SELECT c.cohort_week, COUNT(DISTINCT a.user_id)::FLOAT / COUNT(DISTINCT c.user_id) AS day7_retention
  FROM cohorts c
  INNER JOIN day7_activity a ON c.user_id = a.user_id  -- Bug is here
  GROUP BY c.cohort_week;

CHALLENGE 3 — BUILD FROM SCRATCH:
  Write a complete analytical SQL solution for a B2B SaaS subscription platform.

  Tables: users(user_id, signup_date, plan, company_id, country),
          events(user_id, event_type, event_date),
          revenue(user_id, month, mrr_inr)

  Produce a single SQL script (with CTEs) that computes all of the following:

  1. Monthly Active Users (MAU): count of distinct users with at least one event per month.
     Show month, MAU, MoM MAU change (absolute and %).

  2. Revenue metrics per month: total MRR, new MRR (users with no prior revenue),
     expansion MRR (existing users with higher MRR than prior month),
     churned MRR (users with MRR last month but none this month).

  3. Day-1, Day-7, Day-30 retention for weekly signup cohorts.
     Each row: cohort_week, cohort_size, day1_pct, day7_pct, day30_pct.

  4. Top 3 companies by MRR per country (use DENSE_RANK, show ties).

  5. User segmentation: classify each user as 'Power' (≥ 20 events/month),
     'Regular' (5–19), 'Light' (1–4), or 'Inactive' (0 events).
     Show current month's distribution of users across segments.

  All steps must use CTEs with descriptive names. No nested subqueries.
  Annotate each CTE with a one-line comment explaining its purpose.
    `,
    summary: `Window functions are the bridge between row-level data and group-level analysis — PARTITION BY gives you the aggregate without losing the individual row, LAG/LEAD gives you time-series comparisons without self-joins, and CTEs turn an unreadable wall of nested SQL into a step-by-step documented analysis. Master these three patterns and you can answer almost any analytical question directly in SQL without exporting to Python first.`
  }
];

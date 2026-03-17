const concepts = [
  {
    id: 6,
    title: "Probability Distributions for Analytics",
    tag: "THE SHAPE OF YOUR DATA",
    color: "#E63946",
    tldr: `Most analytics metrics follow predictable mathematical shapes. Knowing which distribution fits your data tells you what's normal, what's an anomaly, and what statistical tests you can safely use. Misidentifying the distribution is the root cause of most broken dashboards and wrong A/B test conclusions.`,
    problem: `You look at your revenue data and compute the average: ₹45,000 per user. You set targets, build dashboards, and alert when daily revenue drops below this average. Then you discover your "average" user doesn't exist — 80% of users spend under ₹5,000 and a handful of whales spend ₹5,00,000+. Your average is being dragged by outliers and your alerts are constantly wrong. The metric that looked clean on the dashboard is actually a fiction — a number that describes almost nobody in your actual user base.

Or you run a conversion rate experiment. You assume the data is normally distributed and use a t-test. But conversion rate is a proportion (0 to 1), not a continuous variable. Your p-values are wrong and you're shipping features that don't actually work. You'd have been better off flipping a coin.

Or you're monitoring API errors per minute. You freak out when you see 12 errors in a minute vs your usual 8. But is 12 statistically unusual? Without knowing the Poisson distribution, you can't answer that. And if you escalate every 12-error minute when it's actually within normal variance, you'll create alert fatigue and start ignoring alerts — until a real 60-error minute gets missed.

Or you model session duration with the mean. Your mean session is 4.5 minutes. You A/B test a new feature and the mean goes to 4.7 minutes. Significant win! But the distribution is log-normal — your median went from 1.2 minutes to 1.1 minutes. Most users are actually spending LESS time on the key actions. The mean rose because a few power users went from 30 minutes to 45 minutes. Your "win" is a loss.

Or your data science team builds an anomaly detection system for daily revenue using ±2 standard deviations. The system alerts constantly. The business ignores it. Revenue drops 40% one day — nobody notices because alerts have been crying wolf for months. The root cause: they applied normal-distribution thresholds to log-normally distributed revenue, so the lower-bound threshold was negative (revenue can't be negative!) and the upper-bound was far too low.

Understanding distributions answers:
- What does "normal" look like for THIS specific metric?
- Which outliers are genuine signals vs expected random variance?
- What statistical test is valid for this data type?
- How wide should my alert thresholds be — and should they be symmetric?
- When someone says "the average," is that number even meaningful?
- Why do two teams report different "average revenue" from the same dataset?`,
    analogy: `Think of distributions like different types of queues and situations you encounter in India:

NORMAL DISTRIBUTION = The height of people standing in a queue at a Mumbai local train station. Most people are near the average height. Very tall or very short people exist but are rare, and they're symmetric — for every very-tall person, there's a roughly equally rare very-short person. If you measure 1000 people, you get that classic bell curve. 68% fall within one standard deviation of average. The key property: the distribution is symmetric. The mean equals the median equals the mode — all three land at the same number. Useful for: test scores, measurement errors, aggregate daily active users (large sums of many independent variables), temperature readings.

LOG-NORMAL DISTRIBUTION = The income of people in that same Mumbai train queue. A chai wallah earns ₹8,000/month. An IT engineer earns ₹80,000/month. A startup founder might earn ₹80 lakhs/month. You cannot have negative income (lower bound at zero). The distribution has a long right tail. Most people cluster at the low end; a few extreme outliers on the right drag the mean far above the median. If you plot raw income: right-skewed. If you take log(income) and plot that: beautiful bell curve. This is the log-normal transformation trick. Revenue per user, time spent on app (most users: 2 min, some: 2 hours), company valuations, city populations — all log-normal. The "average income" is misleading; use the MEDIAN. The median is the amount where half earn more and half earn less — it actually describes a real person. Arithmetic mean describes nobody.

BINOMIAL DISTRIBUTION = Flipping a coin N times and counting heads. Each user either converts (heads) or doesn't (tails). With 10,000 users and 5% conversion rate, what's the probability of getting exactly 523 conversions? Binomial tells you. The key property: outcomes are binary (yes/no, success/failure), each trial is independent, probability stays constant across trials. Real analytics use: conversion rates, click-through rates, email open rates, any "did this particular user do X or not" metric. When n is large enough (n*p > 5), binomial approximates normal — this is why you can use z-tests for proportions.

POISSON DISTRIBUTION = Counting how many auto-rickshaws pass Dadar station in exactly 10 minutes. Some 10-minute windows: 8 autos. Some: 2 autos. Occasionally: 0 or 15. The average rate is known (say, 6 per 10 minutes). Events happen independently — one auto arriving doesn't make the next more or less likely. The magical property: variance EQUALS mean. If mean=6, variance=6, standard deviation=sqrt(6)=2.45. So seeing 12 autos (z=2.45) happens about 1.4% of the time — unusual but not impossible. Seeing 20 autos (z=5.7) is essentially impossible — something extraordinary happened. Useful for: API errors per hour, support tickets per day, transactions per minute, page views per second, goals scored per match.

THE CENTRAL LIMIT THEOREM (CLT) = The magic averaging spell. Imagine you run a food delivery app. Individual order values follow a log-normal distribution — most orders are ₹150–400, a few catering orders are ₹5,000+. But if you calculate the average order value for each day across 10,000 orders, those DAILY AVERAGES follow a normal distribution, even though individual orders don't. Why? Because averaging smooths out extremes. The CLT says: no matter how weird your underlying distribution is, if you take large enough samples and average them, the distribution of sample means will be normal. This is why most statistical tests (t-tests, z-tests) work even on non-normal data — they're operating on averages, not individual values. The spell requires n > 30 to work (roughly), though for heavy-tailed distributions like log-normal, you often need n > 100 for reliable normality.`,
    deep: `NORMAL DISTRIBUTION — THE 68-95-99.7 RULE IN DEPTH
The normal distribution N(μ, σ²) is fully described by mean μ and standard deviation σ.
- 68.27% of data falls within μ ± 1σ
- 95.45% of data falls within μ ± 2σ  
- 99.73% of data falls within μ ± 3σ
- 99.9937% within ± 4σ (used for Six Sigma quality control)

This means if your daily active users average 100,000 with σ=5,000:
- A day with 95,000 or 105,000 users: totally normal (within 1σ), happens 32% of days
- A day with 90,000 users (2σ below): happens only 2.3% of the time — worth monitoring
- A day with 85,000 users (3σ below): happens 0.13% of the time — major incident, page on-call
- A day with 80,000 users (4σ below): happens 0.003% of the time — something is catastrophically wrong

Z-score = (observation - mean) / std_dev
Z > 3 or Z < -3 is your general "something is wrong" signal.
But the right threshold depends on context:
- High-stakes financial monitoring: use 2σ alerts
- Noisy consumer metrics: use 3σ to avoid alert fatigue
- Safety-critical systems: use 4σ+

WHEN IS DATA ACTUALLY NORMALLY DISTRIBUTED?
Normal distribution emerges when many small, independent, additive factors combine.
Test scores: sum of performance on many independent questions → normal
Daily active users: sum of many independent user decisions → approximately normal (for large n)
Manufacturing measurements: sum of many small random errors → normal (Central Limit Theorem applied to error terms)

NOT normal:
- Any metric with a hard lower bound (revenue, time on site, order value)
- Any metric that's a ratio or proportion (CTR, conversion rate, bounce rate)  
- Count data (errors per hour, orders per minute)
- Any metric where extreme values are common

NORMALITY TESTS you can actually use:
1. Visual: histogram should look symmetric and bell-shaped
2. Q-Q plot: if data is normal, points follow a straight diagonal line
3. Skewness: |skewness| < 0.5 suggests approximate normality. >1 is meaningfully skewed.
4. Kurtosis: normal distribution has kurtosis=3. Heavy-tailed data has higher kurtosis.
5. Shapiro-Wilk test (in Python: scipy.stats.shapiro) — formal statistical test for normality

In SQL (BigQuery): 
CORR(log_revenue, normal_quantile) — if correlation > 0.99, data is approximately normal
Or: STDDEV/AVG ratio (coefficient of variation) — if CV > 1.0, data is likely not normal

LOG-NORMAL DISTRIBUTION — DEEP TECHNICAL UNDERSTANDING
If X is log-normally distributed, then Y = ln(X) is normally distributed.

The log-normal distribution has two parameters:
μ_log = mean of ln(X) — this is NOT the mean of X itself
σ_log = std dev of ln(X)

Key statistics of the original X:
- Median of X = exp(μ_log)  ← USE THIS as your central tendency
- Mean of X = exp(μ_log + σ_log²/2)  ← always higher than median
- Variance of X = (exp(σ_log²) - 1) * exp(2*μ_log + σ_log²)
- Mode of X = exp(μ_log - σ_log²)  ← always lower than median

Example with revenue data: μ_log = 6.5, σ_log = 1.2
- Median revenue = exp(6.5) = ₹665
- Mean revenue = exp(6.5 + 1.44/2) = exp(7.22) = ₹1,368 — 2x the median!
- Mode revenue = exp(6.5 - 1.44) = exp(5.06) = ₹158 — where most users cluster

The gap between mode, median, and mean grows with σ_log. If σ_log > 1.5, your mean is so distorted that it's practically useless for per-user analysis.

WHY REVENUE IS MULTIPLICATIVE (creating log-normal):
Additive noise → normal distribution
Multiplicative noise → log-normal distribution

Revenue = base_price × (1 + discount%) × (1 + upsell%) × quantity × loyalty_factor
Each factor multiplies. Taking log: log(revenue) = log(base) + log(1+discount) + log(1+upsell) + log(quantity) + log(loyalty)
Sum of many independent terms → normal distribution by CLT
Therefore log(revenue) is normal → revenue is log-normal

BINOMIAL DISTRIBUTION — WHAT ANALYSTS ACTUALLY NEED TO KNOW
X ~ Binomial(n, p) where n = number of users, p = true conversion probability
- Mean = n*p
- Variance = n*p*(1-p)
- Standard error of the sample proportion = sqrt(p*(1-p)/n)

The standard error is what matters for A/B testing. It tells you:
"How much does my measured conversion rate fluctuate just due to sampling randomness?"

With n=1000, p=0.05: SE = sqrt(0.05*0.95/1000) = 0.0069 = 0.69pp
95% CI for rate: 5% ± 1.96*0.69pp = [3.65%, 6.35%]
With n=10000: SE = 0.22pp → 95% CI = [4.57%, 5.43%] — much tighter

This is why bigger samples give you more precise estimates.

WILSON SCORE INTERVAL — better than naive ±z*SE for extreme proportions:
When p is near 0 or 1, the symmetric confidence interval can include negative rates.
Use the Wilson score interval instead:
center = (p + z²/2n) / (1 + z²/n)
margin = z * sqrt(p(1-p)/n + z²/4n²) / (1 + z²/n)
where z = 1.96 for 95% CI

This always stays within [0, 1] — use this for click rates, conversion rates near 0% or 100%.

POISSON DISTRIBUTION — THE COUNT METRIC'S BIBLE
X ~ Poisson(λ) where λ = expected count per time interval
- Mean = λ
- Variance = λ  ← THIS IS THE KEY INSIGHT
- Std dev = sqrt(λ)
- P(X = k) = (λ^k * e^-λ) / k!

The variance-equals-mean property is diagnostic. If you have count data where variance >> mean,
you have OVERDISPERSED data → consider Negative Binomial distribution instead.
If variance << mean → UNDERDISPERSED (rare in practice).

Overdispersion in practice:
- Errors per hour: if some hours are "broken" and get 10x normal errors, variance >> mean
- Transactions per minute: weekdays vs weekends might have different λ values → mixture of Poissons → overdispersed
- Fix: model separately for each "regime" or use Negative Binomial

Poisson control charts for monitoring:
Upper Control Limit (UCL) = λ + 3*sqrt(λ)
Lower Control Limit (LCL) = max(0, λ - 3*sqrt(λ))  ← must be non-negative!

For λ=50 errors/hour: UCL = 50 + 3*7.07 = 71.2, LCL = 50 - 21.2 = 28.8
Alert if: hourly errors > 72 (spike) or < 28 (suspiciously low — are logs broken?)

CHOOSING THE RIGHT DISTRIBUTION — COMPLETE DECISION TREE:
Step 1: Is the outcome binary per trial? (yes/no per user) → BINOMIAL
Step 2: Is it counting events in a time window? → POISSON (check overdispersion)
Step 3: Is the data bounded at 0 with right skew? → LOG-NORMAL (check mean/median > 1.5x)
Step 4: Is the data symmetric around a center? → NORMAL (verify with histogram)
Step 5: Is the data bounded [0,1]? (rates, fractions) → BETA distribution
Step 6: Ordinal data (ratings 1-5)? → Non-parametric (Mann-Whitney U test)

WHEN CLT KICKS IN — PRACTICAL REQUIREMENTS:
- Simple symmetric distributions: n > 30 is often enough
- Moderate skew (log-normal with σ_log < 1): n > 100
- Heavy skew (revenue, very long tail): n > 500–1000
- For reliable p-values in A/B tests with conversion rates: n > 1000 per group
- For revenue metrics: n > 5000 per group (due to whale effect)

REAL NUMBERS: A Swiggy-like delivery app
Orders per hour: Poisson(λ=2400) → control charts: UCL=2547, LCL=2253
Revenue per order: Log-normal(μ_log=5.1, σ_log=0.8) → median=₹164, mean=₹196
Delivery success rate: Binomial(p=0.94) per order → for 10k orders, SE=0.0024
Daily active restaurants: Approximately Normal due to CLT (sum of many regions)

DISTRIBUTION IDENTIFICATION CHEATSHEET:
| Sign | Distribution |
|---|---|
| Mean/Median ratio > 1.5 | Log-normal |
| Variance ≈ Mean | Poisson |
| Data is 0 or 1 per observation | Bernoulli / Binomial |
| Symmetric histogram | Normal |
| Long right tail, can't be negative | Log-normal |
| Two separate clusters in histogram | Mixture (segment separately!) |`,
    code: `// CONCEPT 6: Probability Distributions in Analytics

// Example 1: Z-score anomaly detection for DAU with weekday-aware baseline
function detectDauAnomaly(historicalDauByWeekday, todayDau, todayWeekday) {
  // CRITICAL: Compare Monday to Monday, not Monday to Sunday
  // Different weekdays have vastly different user volumes
  const weekdayHistory = historicalDauByWeekday[todayWeekday] || [];
  
  if (weekdayHistory.length < 4) {
    return { alert: 'INSUFFICIENT_DATA', message: 'Need at least 4 same-weekday data points' };
  }
  
  const mean = weekdayHistory.reduce((a, b) => a + b, 0) / weekdayHistory.length;
  const variance = weekdayHistory.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / weekdayHistory.length;
  const stdDev = Math.sqrt(variance);
  const zScore = (todayDau - mean) / stdDev;
  
  // 68-95-99.7 rule thresholds
  if (Math.abs(zScore) > 3) return { alert: 'CRITICAL', zScore: zScore.toFixed(2), message: \`Beyond 3σ — investigate immediately. Expected ~\${mean.toFixed(0)} ± \${stdDev.toFixed(0)}, got \${todayDau}\` };
  if (Math.abs(zScore) > 2) return { alert: 'WARNING', zScore: zScore.toFixed(2), message: \`Beyond 2σ — monitor closely\` };
  if (Math.abs(zScore) > 1) return { alert: 'MILD', zScore: zScore.toFixed(2), message: \`Within normal range but elevated\` };
  return { alert: 'NORMAL', zScore: zScore.toFixed(2), message: 'Within expected range' };
}

// Monday DAU history over last 8 Mondays:
const history = { 1: [95000, 98000, 102000, 99000, 97000, 101000, 96000, 100000] }; // weekday 1 = Monday
detectDauAnomaly(history, 78000, 1);
// mean=98500, std=2200, z=(78000-98500)/2200 = -9.3 → CRITICAL


// Example 2: Log-normal revenue — complete statistical picture
function describeLogNormalData(values, label = 'Revenue') {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  
  // Arithmetic statistics (misleading for log-normal)
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  const skewness = values.reduce((s, x) => s + Math.pow((x - mean) / std, 3), 0) / n;
  
  // Percentiles (the right way to understand log-normal)
  const p = pct => sorted[Math.floor(pct / 100 * n)];
  
  // Log-space statistics (the correct analysis)
  const logValues = values.filter(x => x > 0).map(Math.log);
  const logMean = logValues.reduce((a, b) => a + b, 0) / logValues.length;
  const logStd = Math.sqrt(logValues.reduce((s, x) => s + Math.pow(x - logMean, 2), 0) / logValues.length);
  
  // Back-transform key statistics
  const medianEstimate = Math.exp(logMean);
  const meanEstimate = Math.exp(logMean + logStd * logStd / 2);
  
  // Is data log-normal? Check mean/median ratio
  const meanToMedianRatio = mean / p(50);
  const isLikelyLogNormal = meanToMedianRatio > 1.5 || Math.abs(skewness) > 1;
  
  return {
    label,
    n,
    // Arithmetic (use only if normal)
    arithmeticMean: \`₹\${mean.toFixed(0)}\`,
    stdDev: \`₹\${std.toFixed(0)}\`,
    skewness: skewness.toFixed(2),
    // Percentile-based (always safe to report)
    p10: \`₹\${p(10)}\`,
    p25: \`₹\${p(25)}\`,
    median: \`₹\${p(50)}\`,
    p75: \`₹\${p(75)}\`,
    p90: \`₹\${p(90)}\`,
    p99: \`₹\${p(99)}\`,
    // Log-normal analysis
    logNormalMedianEstimate: \`₹\${medianEstimate.toFixed(0)}\`,
    logNormalMeanEstimate: \`₹\${meanEstimate.toFixed(0)}\`,
    meanToMedianRatio: meanToMedianRatio.toFixed(2),
    isLikelyLogNormal,
    recommendation: isLikelyLogNormal 
      ? \`⚠️ Data appears log-normal (mean/median=\${meanToMedianRatio.toFixed(1)}x). Report median=₹\${p(50)}, P90=₹\${p(90)}. Avoid using arithmetic mean.\`
      : \`✅ Data appears approximately normal. Arithmetic mean is safe to use.\`
  };
}

// Example data: ₹ revenue per user for an edtech app like Unacademy
const revenueData = [199, 299, 399, 499, 499, 699, 999, 999, 1499, 1999, 2999, 4999, 9999, 19999, 49999];
const analysis = describeLogNormalData(revenueData, 'Subscription Revenue');
// arithmeticMean: ₹6,594 (misleading — 80% of users pay less than this)
// median: ₹999 (this is what the typical user actually pays)
// meanToMedianRatio: 6.6x → strongly log-normal


// Example 3: Binomial — confidence interval with Wilson Score (handles extreme proportions)
function wilsonScoreCI(conversions, n, confidence = 0.95) {
  const p = conversions / n;
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const z2 = z * z;
  
  // Wilson score interval — stays within [0,1] unlike naive ± z*SE
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const margin = (z / (1 + z2 / n)) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  
  // Naive interval for comparison
  const naiveSE = Math.sqrt(p * (1 - p) / n);
  const naiveLower = p - z * naiveSE;
  const naiveUpper = p + z * naiveSE;
  
  return {
    observedRate: (p * 100).toFixed(3) + '%',
    wilsonCI: \`[\${((center - margin) * 100).toFixed(3)}%, \${((center + margin) * 100).toFixed(3)}%]\`,
    naiveCI: \`[\${(naiveLower * 100).toFixed(3)}%, \${(naiveUpper * 100).toFixed(3)}%]\`,
    naiveHasProblem: naiveLower < 0 ? '⚠️ Naive CI goes negative — use Wilson' : '✅ Naive CI is OK here',
    sampleSizeContext: n < 100 ? 'Small sample: definitely use Wilson' : n < 1000 ? 'Medium sample: Wilson recommended' : 'Large sample: both intervals similar'
  };
}

// Low click-through rate: 3 clicks from 500 impressions (0.6% CTR)
wilsonScoreCI(3, 500);
// naiveCI lower bound = -0.1% (impossible!) — Wilson fixes this: [0.14%, 1.8%]

// Standard checkout rate: 847 from 18320
wilsonScoreCI(847, 18320);
// Both intervals nearly identical for large n — either works


// Example 4: Poisson control chart for SRE monitoring
function buildPoissonControlChart(historicalCounts) {
  // Estimate lambda from historical data
  const lambda = historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length;
  const stdDev = Math.sqrt(lambda);
  
  // Control limits
  const ucl3sigma = lambda + 3 * stdDev;  // Upper Control Limit (99.7% normal)
  const lcl3sigma = Math.max(0, lambda - 3 * stdDev);  // Lower Control Limit (must be ≥ 0)
  const ucl2sigma = lambda + 2 * stdDev;  // Warning level
  
  // Evaluate each recent observation
  const evaluate = (observed) => {
    const z = (observed - lambda) / stdDev;
    return {
      observed,
      z: z.toFixed(2),
      status: observed > ucl3sigma ? '🚨 CRITICAL — beyond 3σ' 
             : observed > ucl2sigma ? '⚠️ WARNING — beyond 2σ'
             : observed < lcl3sigma ? '🔍 LOW ANOMALY — suspiciously quiet (check logging!)'
             : '✅ Normal',
      lambdaEstimate: lambda.toFixed(1),
      ucl: ucl3sigma.toFixed(1),
      lcl: lcl3sigma.toFixed(1)
    };
  };
  
  return { lambda, ucl3sigma, lcl3sigma, evaluate };
}

// Razorpay-style payment failures monitoring
// Historical failures per minute: [12,8,9,11,10,13,7,10,11,9,12,8]
const chart = buildPoissonControlChart([12,8,9,11,10,13,7,10,11,9,12,8]);
// lambda=10.17, UCL=19.7, LCL=0.7
chart.evaluate(25);  // 🚨 CRITICAL — z=4.7
chart.evaluate(2);   // 🔍 LOW ANOMALY — payment processor might be down, rejecting before reaching us


// Example 5: SQL — detect log-normal revenue with percentile analysis
/*
-- In BigQuery/Snowflake: comprehensive distribution analysis
SELECT
  -- Arithmetic stats (for normal-distributed data only)
  ROUND(AVG(revenue_inr), 0)                                         AS arithmetic_mean,
  ROUND(STDDEV(revenue_inr), 0)                                      AS std_dev,
  ROUND(STDDEV(revenue_inr) / AVG(revenue_inr), 2)                   AS coeff_of_variation,
  -- Skewness proxy: if mean >> median, data is right-skewed
  ROUND(AVG(revenue_inr) / APPROX_QUANTILES(revenue_inr, 100)[OFFSET(50)], 2) AS mean_to_median_ratio,
  -- Log-normal analysis
  ROUND(EXP(AVG(LN(revenue_inr))), 0)                                AS geometric_mean_aka_median_estimate,
  -- Percentile breakdown (always report these for revenue)
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(10)], 0)           AS p10,
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(25)], 0)           AS p25,
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(50)], 0)           AS median_p50,
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(75)], 0)           AS p75,
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(90)], 0)           AS p90,
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(99)], 0)           AS p99,
  -- Concentration: what % of revenue comes from top 1%?
  ROUND(APPROX_QUANTILES(revenue_inr, 100)[OFFSET(99)] / 
        AVG(revenue_inr) * 100, 0)                                   AS p99_as_pct_of_mean,
  -- Distribution classification helper
  CASE
    WHEN AVG(revenue_inr) / APPROX_QUANTILES(revenue_inr, 100)[OFFSET(50)] > 3 
      THEN 'STRONGLY LOG-NORMAL — use median and percentiles'
    WHEN AVG(revenue_inr) / APPROX_QUANTILES(revenue_inr, 100)[OFFSET(50)] > 1.5 
      THEN 'MODERATELY SKEWED — prefer median'
    ELSE 'APPROXIMATELY SYMMETRIC — mean is reasonable'
  END AS distribution_type
FROM transactions
WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND revenue_inr > 0
  AND status = 'completed';
*/


// Example 6: Central Limit Theorem — visual proof with Indian salary data
function demonstrateCLT(populationData, sampleSize, numSamples) {
  // Population can be ANY distribution — log-normal salary data, for instance
  const populationMean = populationData.reduce((a, b) => a + b, 0) / populationData.length;
  const populationStd = Math.sqrt(
    populationData.reduce((s, x) => s + Math.pow(x - populationMean, 2), 0) / populationData.length
  );
  
  const sampleMeans = [];
  for (let i = 0; i < numSamples; i++) {
    // Draw random sample from the (potentially non-normal) population
    const sample = Array.from({ length: sampleSize }, () => 
      populationData[Math.floor(Math.random() * populationData.length)]
    );
    const sampleMean = sample.reduce((a, b) => a + b, 0) / sample.length;
    sampleMeans.push(sampleMean);
  }
  
  // These sample means should be approximately normally distributed
  const meanOfMeans = sampleMeans.reduce((a, b) => a + b, 0) / sampleMeans.length;
  const stdOfMeans = Math.sqrt(sampleMeans.reduce((s, x) => s + Math.pow(x - meanOfMeans, 2), 0) / sampleMeans.length);
  
  // Theoretical prediction from CLT: Standard Error = population_std / sqrt(n)
  const theoreticalSE = populationStd / Math.sqrt(sampleSize);
  
  // Verify CLT is working: stdOfMeans should be close to theoreticalSE
  const cltAccuracy = Math.abs(stdOfMeans - theoreticalSE) / theoreticalSE * 100;
  
  return {
    populationShape: 'log-normal (skewed)',
    sampleSize,
    meanOfSampleMeans: meanOfMeans.toFixed(0),
    populationMean: populationMean.toFixed(0),
    empiricalSE: stdOfMeans.toFixed(0),
    theoreticalSE: theoreticalSE.toFixed(0),
    cltAccuracy: \`CLT prediction is \${(100 - cltAccuracy).toFixed(1)}% accurate\`,
    insight: \`Even though raw salaries are log-normal (skewed), sample means of n=\${sampleSize} are approximately normal. This is WHY t-tests work on non-normal data — they test the MEAN, which is approximately normal by CLT.\`
  };
}

// Salary data for 10,000 Indian employees (log-normal distributed)
// Most earn ₹20k-60k/month; a few senior engineers earn ₹5L+
// CLT says: sample averages from groups of 50+ will be normally distributed
// demonstrateCLT(salaryData, 50, 1000) → proves CLT empirically


// Example 7: Choosing test based on distribution — practical decision function
function chooseStatisticalTest(metricType, sampleSize, notes = '') {
  const tests = {
    conversion_rate: {
      test: 'Two-proportion z-test',
      assumption: 'Binomial data, each user is independent yes/no',
      pythonCode: 'from statsmodels.stats.proportion import proportions_ztest',
      sqlApproach: 'Calculate SE = sqrt(p*(1-p)/n), z = diff/SE, lookup p-value',
      watch_out: 'Use Wilson CI if conversion rate < 2% or > 98%'
    },
    revenue_per_user: {
      test: 'Mann-Whitney U test OR t-test on log(revenue)',
      assumption: 'Log-normal, independent users',
      pythonCode: 'scipy.stats.mannwhitneyu(control, treatment) OR scipy.stats.ttest_ind(np.log(control), np.log(treatment))',
      sqlApproach: 'Compare median revenue using approximate quantiles; bootstrap for confidence intervals',
      watch_out: 'Never use raw t-test on revenue — log-transform first or use non-parametric test'
    },
    event_count: {
      test: 'Poisson rate test OR negative binomial if overdispersed',
      assumption: 'Events are independent, constant rate',
      pythonCode: 'from scipy.stats import poisson; poisson.sf(observed-1, expected)',
      sqlApproach: 'Calculate z = (observed - lambda) / sqrt(lambda) for large lambda (>30)',
      watch_out: 'Check if variance ≈ mean. If variance >> mean, use negative binomial.'
    },
    session_duration: {
      test: 'Mann-Whitney U test OR t-test on log(duration)',
      assumption: 'Log-normal, independent sessions',
      pythonCode: 'scipy.stats.mannwhitneyu or scipy.stats.ttest_ind on log-transformed values',
      sqlApproach: 'Compare median duration; be suspicious of mean duration changes',
      watch_out: 'Session duration is almost always log-normal. Report median, not mean.'
    },
    star_rating: {
      test: 'Mann-Whitney U test (ordinal data)',
      assumption: 'Ordinal scale, non-parametric',
      pythonCode: 'scipy.stats.mannwhitneyu(control_ratings, treatment_ratings)',
      sqlApproach: 'Compare median ratings and distribution of rating counts',
      watch_out: 'Never use t-test on 1-5 ratings. The difference between 1 and 2 is NOT the same as between 4 and 5.'
    }
  };
  
  const result = tests[metricType] || { test: 'Unknown metric type', assumption: 'Analyze your data first' };
  return {
    ...result,
    sampleSizeAdequate: sampleSize > 1000 ? '✅ Large enough for most tests' : sampleSize > 200 ? '⚠️ Borderline — results may be noisy' : '🚨 Too small — be very cautious about conclusions',
    notes
  };
}`,
    bugs: `BUG 1: Using arithmetic mean for log-normal revenue data
SYMPTOM: "Our average revenue per user is ₹8,500" — but only 12% of users actually spend that much. Revenue targets and user segments are completely wrong.
ROOT CAUSE: Revenue follows log-normal distribution. 10 users spending ₹500 and 1 user spending ₹50,000 gives mean ₹5,000 — but 91% of users are below the "average."
FIX: Always report median AND percentiles (P25, P50, P75, P90) for revenue. Use geometric mean for ratios. Only use arithmetic mean when data passes a normality check (histogram shows bell curve, skewness < 0.5).

BUG 2: Running t-tests on conversion rates
SYMPTOM: A/B test shows p=0.03, team ships feature. Revenue drops. Re-analysis reveals the "significant" difference was within normal binomial variance.
ROOT CAUSE: Conversion rate is a proportion (bounded 0–1), not a continuous normal variable. T-test assumes normality. With small sample sizes or extreme proportions (p<0.05 or p>0.95), t-test gives wrong p-values.
FIX: Use z-test for proportions (two-proportion z-test). In Python: statsmodels.stats.proportion.proportions_ztest(). In SQL: calculate standard error as sqrt(p*(1-p)/n) and compute z-score manually.

BUG 3: Treating Poisson variance as "noise to ignore"
SYMPTOM: Engineers ignore error spikes because "it's always noisy." A Poisson process with mean 50 will naturally produce values between 30–70. But a spike to 120 (z=9.9) gets dismissed as normal variance.
ROOT CAUSE: Team doesn't know the Poisson std dev = sqrt(mean). They eyeball charts without statistical reference lines.
FIX: Draw ±2σ and ±3σ bands on all time-series charts for count metrics. For Poisson metric with mean λ, alert at λ + 3*sqrt(λ). Build this into your monitoring dashboards.

BUG 4: Ignoring CLT requirements — running stats on tiny samples
SYMPTOM: A/B test with 50 users per group shows "statistically significant" lift. Feature ships. No lift in production with 50,000 users.
ROOT CAUSE: CLT requires n > 30 for sample means to approximate normality, but the real requirement for reliable p-values in business metrics is usually n > 1,000 for proportions and n > 200 for means. With n=50, variance is so high that random chance produces "significant" results.
FIX: Always calculate required sample size BEFORE running experiments. Use power analysis: n = 2 * ((z_alpha + z_beta)^2 * p*(1-p)) / (delta^2) for proportions. Minimum detectable effect of 1pp on 5% base rate requires ~8,000 users per group.

BUG 5: Applying 3σ anomaly detection to log-normal data
SYMPTOM: Revenue anomaly alerts fire constantly (too sensitive on low days) but miss real spikes on high-revenue days.
ROOT CAUSE: The 68-95-99.7 rule only applies to normal distributions. Revenue is log-normal, so the distribution is asymmetric. A 3σ lower bound on raw revenue will be unrealistically low; a 3σ upper bound will miss real anomalies that are in the long right tail.
FIX: Log-transform revenue before computing mean/std for anomaly detection. Alert when log(revenue) falls outside log_mean ± 3*log_std. This treats the log-normal data as normal in log space, where the 68-95-99.7 rule correctly applies.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
Given a Poisson process with historical mean λ=200 errors/day:
Today you observe 243 errors. Is this statistically anomalous?
Calculate: z = (243 - 200) / sqrt(200)
What is z? Is 243 within the 99.7% range? What would a "3σ anomaly" threshold be?

Expected answer: z = (243-200)/14.14 = 3.04. Yes, it's just barely anomalous (beyond 3σ). The 3σ upper threshold is 200 + 3*14.14 = 242.4. So 243 errors would trigger a critical alert. A good monitoring system would page on-call.

CHALLENGE 2 — FIX THE BUG:
This code computes a revenue alert threshold and it's wrong:
\`\`\`
const revenues = [500, 800, 1200, 2000, 5000, 8000, 15000, 50000, 120000];
const mean = revenues.reduce((a,b) => a+b) / revenues.length; // 22,500
const std = Math.sqrt(revenues.reduce((s,x) => s + Math.pow(x-mean,2),0) / revenues.length);
const alertThreshold = mean - 2 * std; // Negative number — broken!
console.log(\`Alert if revenue drops below ₹\${alertThreshold}\`);
\`\`\`
Why is alertThreshold negative? Fix this for log-normal revenue data.

FIX: Revenue is log-normal. Work in log space:
const logRev = revenues.map(Math.log);
const logMean = logRev.reduce((a,b)=>a+b)/logRev.length;
const logStd = Math.sqrt(logRev.reduce((s,x)=>s+Math.pow(x-logMean,2),0)/logRev.length);
const alertThreshold = Math.exp(logMean - 2*logStd); // Always positive, meaningful

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a function distributeAndAlert(metricName, historicalValues, todayValue) that:
1. Detects whether the data is approximately log-normal (check if mean/median > 2)
2. If log-normal: log-transforms before computing z-score
3. If normal: uses raw values for z-score
4. Returns alert level: NORMAL/WARNING/CRITICAL based on 1σ/2σ/3σ
5. Returns human-readable message explaining what percentile today's value is

Test with: historicalValues = [1000 daily revenue values from a log-normal distribution], todayValue = ₹15,000`,
    summary: `The distribution of your data determines which statistics are valid, which thresholds make sense, and which tests you can trust. Revenue is log-normal (use median, log-transform), conversion rates are binomial (use proportion z-tests), event counts are Poisson (std dev = sqrt(mean)), and only aggregate averages reliably follow normal distribution via the CLT.`
  },

  {
    id: 7,
    title: "Hypothesis Testing & Experiment Design",
    tag: "PROVING YOUR FEATURE WORKS",
    color: "#2D6A4F",
    tldr: `Hypothesis testing is the framework that decides whether an observed difference is real or just random luck. Most A/B tests in industry are run incorrectly — the p-value is misunderstood, tests are peeked at early, and multiple comparisons inflate false positives. Getting this right separates data-driven decisions from expensive mistakes.`,
    problem: `Rahul's team runs an A/B test. After 3 days, the new checkout flow shows +12% conversion with p=0.04. They ship it. Revenue drops. Post-mortem reveals they peeked at the test 7 times before stopping, the actual effect was noise, and they had 80% power to detect a 5% lift but ran the test for only 30% of the required sample size. The product was fine. The process was broken.

Or: Pooja's growth team tests 20 different button colors simultaneously. Two of them show p < 0.05. She ships both. Neither works in production. The problem: if you run 20 tests, you expect 1 false positive at p=0.05 by pure chance — it's literally baked into the math. She found 2 — both were almost certainly false positives. She didn't test hypotheses; she found random noise and called it signal.

Or: The data science team celebrates a p=0.03 result saying "there's a 97% chance the feature works." Wrong. P-value does NOT tell you the probability that your hypothesis is true. This is the most common and most dangerous misunderstanding in all of analytics. Thousands of product decisions get made on this fallacy every day.

Or: A startup's growth team runs A/B tests but has only 200 users per day. They test for 7 days, get 1,400 users per group. The minimum detectable effect at this sample size is ±8 percentage points. The actual feature effect is +2pp — which is commercially meaningful but statistically invisible. They kill the feature, call it "no effect," and miss a real improvement.

Or: The analysis team monitors the A/B test dashboard daily and stops when p=0.049. They think they're being rigorous. They're not — peeking 14 times and stopping at the first "significant" result inflates the true Type I error rate from 5% to ~40%. Nearly half their "discoveries" are false.

Or: An analyst runs separate t-tests for 12 different user segments (age groups, cities, device types). In 2 segments, p < 0.05. She concludes the feature works for these segments. But with 12 tests at α=0.05, the chance of at least one false positive is 46%. Both "significant" segments are probably noise.

These mistakes collectively cost companies crores of rupees in bad product decisions, wasted engineering sprints, and destroyed user trust from shipping features that don't work. Understanding hypothesis testing properly isn't academic — it's commercial survival.`,
    analogy: `THE COURTROOM ANALOGY for Null Hypothesis and p-value:

Imagine you're a judge. A defendant (your new feature) stands accused of... doing nothing (the null hypothesis: H0 = "the feature has no effect").

THE NULL HYPOTHESIS is "innocent until proven guilty." You start assuming the feature has zero effect. You need evidence to prove otherwise.

THE ALTERNATIVE HYPOTHESIS (H1) is the prosecution's claim: "This feature increases conversion rate."

THE P-VALUE is: "If this defendant were truly innocent (H0 true), how likely is it that we'd see evidence this extreme just by random chance?" A p-value of 0.03 means: IF the feature truly has no effect, there's a 3% chance we'd see a difference this large by random sampling alone.

It does NOT mean: "There's a 97% chance the feature works." Just like "unlikely innocent" ≠ "definitely guilty."

TYPE I ERROR (False Positive) = Convicting an innocent person. You reject H0 when it's actually true. You ship a feature that doesn't work. Rate = α (usually 0.05 = 5% false positive rate).

TYPE II ERROR (False Negative) = Acquitting a guilty person. You fail to reject H0 when the feature actually works. You kill a good feature. Rate = β (often 0.20 = 20% false negative rate).

STATISTICAL POWER = 1 - β = probability of detecting a real effect. 80% power means: if the feature truly lifts conversion by X%, you'll detect it 80% of the time.

PEEKING = Like the judge looking at partial trial evidence and declaring a verdict every day. You're more likely to catch a moment when random chance makes things look significant. Stopping early on a "significant" peek inflates your Type I error massively.`,
    deep: `THE ANATOMY OF A HYPOTHESIS TEST — COMPLETE WALKTHROUGH

Step 1: Define hypotheses BEFORE collecting data (pre-registration)
H0 (null): Conversion rate Control = Conversion rate Treatment  [p_c = p_t]
H1 (alternative): p_t > p_c [one-tailed] or p_t ≠ p_c [two-tailed]
Always use TWO-TAILED in business unless you are 100% certain about direction AND there's a strong reason (regulatory, safety) to not test the other direction. One-tailed tests have more power but mislead when the effect goes the unexpected direction.

Pre-registration is the practice of writing down your hypothesis, primary metric, and sample size BEFORE running the experiment. It prevents HARKing (Hypothesizing After Results are Known) and p-hacking.

Step 2: Set significance level α and power (1-β) based on stakes
α = 0.05 (5% false positive rate): standard for most product decisions
α = 0.01 (1% false positive rate): high-stakes (pricing changes, major feature rollouts)
α = 0.10 (10% false positive rate): acceptable for low-stakes exploratory tests
Power = 0.80 (80%): standard. You'll miss 20% of real effects.
Power = 0.90 (90%): high-stakes, where missing a real improvement is costly.

There's a fundamental trade-off: higher power requires larger sample size. α=0.01 with 90% power requires roughly 2.5x the sample of α=0.05 with 80% power.

Step 3: Calculate required sample size — BEFORE the experiment
For two proportions (conversion rate test):
n = 2 * (z_α/2 + z_β)² * p̄(1-p̄) / δ²

Where:
- z_α/2 = 1.96 (for α=0.05, two-tailed)
- z_β = 0.842 (for 80% power)  
- z_β = 1.282 (for 90% power)
- p̄ = average of expected control and treatment proportions
- δ = minimum detectable effect (MDE) — the SMALLEST effect worth acting on

Example: Control converts at 5%, you want to detect a 1pp lift (to 6%)
p̄ = 0.055, δ = 0.01
n = 2 * (1.96+0.842)² * 0.055*0.945 / 0.01²
n = 2 * 7.85 * 0.052 / 0.0001 = 8,164 per group ≈ 16,500 total

This is why most startup A/B tests are wildly underpowered — with 500 users/day and 50% allocation, you'd need 33 days for this test, but teams stop after 5 days.

For means (revenue, session duration):
n = 2 * (z_α/2 + z_β)² * σ² / δ²
where σ = standard deviation of the metric and δ = minimum detectable difference

For continuous metrics with high variance (revenue), required sample sizes can be 10x larger than for proportions.

Step 4: Run test WITHOUT peeking — commit to the plan
Collect the pre-determined sample size. Do not check results mid-experiment.
If you must check for operational reasons (safety, major incident), pre-specify exactly when you'll look and correct for it with Bonferroni or sequential testing methods.

Step 5: Compute test statistic and p-value
For proportions (two-proportion z-test):
z = (p_t - p_c) / sqrt(p̄(1-p̄)(1/n_t + 1/n_c))
p-value = 2 * P(Z > |z|) for two-tailed test

For means (Welch's t-test — doesn't assume equal variance):
t = (x̄_t - x̄_c) / sqrt(s²_t/n_t + s²_c/n_c)
degrees of freedom via Welch-Satterthwaite equation

Step 6: Make a decision and report correctly
- If p < α: "Statistically significant evidence that treatment differs from control. Estimated effect: Xpp (95% CI: [Y, Z])"
- If p ≥ α: "Insufficient evidence to detect the specified minimum effect. Test was powered at 80% to detect ≥ 1pp. We cannot conclude the effect is zero."
Never say "no effect" when you fail to reject H0. Say "no DETECTABLE effect at this power level."

P-VALUE: WHAT IT MEANS VS WHAT PEOPLE THINK IT MEANS
CORRECT: p=0.03 means "if H0 were true (no effect), there's a 3% chance of observing a difference at least this large by random sampling"
WRONG (common): "There's a 97% chance the feature works"
WRONG (common): "There's only 3% chance we made a mistake"
WRONG (common): "The effect size is meaningful"
WRONG (common): "This result will replicate 97% of the time"

The correct interpretation requires thinking about it conditionally on H0 being true. The probability that H1 is true is NOT given by the p-value — that requires Bayesian reasoning and a prior probability.

EFFECT SIZE — the number people forget:
Statistical significance ≠ practical significance.
A sample of 10 million users can detect a 0.001pp conversion rate change as "statistically significant" — but who cares?
Always report:
1. Absolute effect: +0.46pp (treatment is 4.62% vs control 5.08%)
2. Relative effect: +9.9% lift
3. Confidence interval: [+0.08pp, +0.84pp] — this is the range of plausible true effects
4. Business impact: at 100,000 daily visitors, +0.46pp × 100,000 × ₹1,200 AOV = ₹5.5L daily incremental revenue

THE MULTIPLE TESTING PROBLEM — by the numbers:
If you run k independent tests each at α=0.05:
Family-wise error rate (FWER) = 1 - (1-0.05)^k
k=1: 5%  k=5: 22.6%  k=10: 40.1%  k=20: 64.2%  k=50: 92.3%

This means running a "dashboard" with 50 metrics and looking for anything that moved is basically guaranteed to find 2-3 false positives — even if the feature does nothing.

BONFERRONI CORRECTION: divide α by k → α' = 0.05/k
- Conservative (controls FWER)
- Often too strict for exploratory analysis (kills real discoveries)
- Use when you care about making even ONE false positive claim

BENJAMINI-HOCHBERG (BH) PROCEDURE: controls False Discovery Rate (FDR)
- Less conservative than Bonferroni
- Expected proportion of false discoveries among all rejections = FDR level (usually 10%)
- Preferred for exploratory metric analysis and genomics-style studies
- Process: rank all p-values. For p(i): compare to (i/k)*FDR_level. Reject all with p ≤ threshold.

BH in practice for 15 metric tests, FDR=10%:
Sort p-values: 0.002, 0.008, 0.015, 0.03, 0.04, 0.09, ...
Threshold for rank i: i/15 * 0.10
Rank 1: threshold=0.0067, p=0.002 ✓
Rank 2: threshold=0.0133, p=0.008 ✓
Rank 3: threshold=0.020, p=0.015 ✓
Rank 4: threshold=0.0267, p=0.03 — just barely rejected
Rank 5: threshold=0.0333, p=0.04 ✓
Rank 6: threshold=0.040, p=0.09 ✗ — not significant, all remaining also rejected

THE PEEKING PROBLEM — technical explanation:
Each statistical test has a "rejection region" for the test statistic. Every time you peek and apply a stopping rule, you're adding another chance to hit the rejection region. The probability of hitting the rejection region at least once across K peeks is roughly:
α_effective ≈ 1 - (1 - α)^K  (roughly, for independent tests)

If you peek daily for 14 days and stop when p<0.05:
α_effective ≈ 1 - 0.95^14 ≈ 0.51 — you've turned a 5% test into a coin flip!

More precisely, with continuous monitoring the α inflation depends on the RATIO of final to current sample size. Lan-DeMets spending functions and O'Brien-Fleming boundaries provide valid stopping rules that maintain overall α while allowing interim analyses.

SEQUENTIAL TESTING / mSPRT (always-valid p-values):
The mixture Sequential Probability Ratio Test generates p-values that are valid at any sample size.
At any point in time, if p < α_sequential, you can stop and reject H0.
The α_sequential for continuous monitoring is set such that the overall Type I error rate stays at α.
Netflix, Spotify, and Airbnb use variants of sequential testing to enable valid early stopping.

BAYESIAN A/B TESTING — THE FULL PICTURE:
Frequentist question: "Is the difference statistically significant?" (reject/not reject H0)
Bayesian question: "Given this data, what's the probability treatment is better, and by how much?"

Step 1: Choose a prior distribution for the conversion rate
- Uninformative prior: Beta(1, 1) = uniform over [0,1]
- Informative prior: Beta(α, β) where α/(α+β) = historical conversion rate
  e.g., 5% historical rate with moderate confidence: Beta(5, 95) or Beta(50, 950)

Step 2: Observe data and update to posterior
For binomial data: Posterior = Beta(prior_α + conversions, prior_β + non-conversions)
After 500 conversions out of 10,000: Beta(1+500, 1+9500) = Beta(501, 9501)
Posterior mean = 501/(501+9501) = 5.01% — essentially the observed rate (data dominated prior)

Step 3: Compute decision metrics
P(Treatment > Control): Monte Carlo simulation or closed-form calculation
Expected loss: E[max(p_c - p_t, 0)] = expected profit per user you leave on table by choosing wrong arm
Credible interval: [5th, 95th percentile of posterior difference] = 90% credible interval for the true lift

Step 4: Decision criteria
Stop and ship: P(Treatment > Control) > 0.95 (or 0.99 for high-stakes)
Stop and reject: P(Treatment > Control) < 0.05 (treatment is likely worse)
Continue: 0.05 ≤ P ≤ 0.95 (too uncertain)

Bayesian ADVANTAGES:
- No fixed sample size needed — can stop as soon as sufficiently certain
- Output is intuitive: "87% probability treatment wins"
- Can incorporate business knowledge (prior)
- Expected loss framework directly connects to business impact

Bayesian CAUTIONS:
- Prior choice is subjective and affects results (especially with small samples)
- Harder to explain to non-technical stakeholders than "p < 0.05"
- "87% probability treatment wins" can still be wrong 13% of the time — this still needs to be understood`,
    code: `// CONCEPT 7: Hypothesis Testing — From Setup to Decision

// Example 1: Sample size calculator (must run BEFORE experiment)
function calculateSampleSize(baselineRate, minimumDetectableEffect, alpha = 0.05, power = 0.80) {
  // z-scores for common alpha and power values
  const zAlpha = { 0.05: 1.96, 0.01: 2.576, 0.10: 1.645 };
  const zBeta = { 0.80: 0.842, 0.90: 1.282, 0.95: 1.645 };
  
  const z1 = zAlpha[alpha] || 1.96;
  const z2 = zBeta[power] || 0.842;
  const pTreatment = baselineRate + minimumDetectableEffect;
  const pBar = (baselineRate + pTreatment) / 2;
  
  // Two-proportion z-test formula
  const n = 2 * Math.pow(z1 + z2, 2) * pBar * (1 - pBar) / Math.pow(minimumDetectableEffect, 2);
  
  return {
    perGroup: Math.ceil(n),
    total: Math.ceil(n) * 2,
    runtime: \`At 10,000 visitors/day: \${(Math.ceil(n) * 2 / 10000).toFixed(1)} days\`,
    parameters: { baselineRate, minimumDetectableEffect, alpha, power }
  };
}

// Vikram's checkout test: 5% baseline, want to detect 1pp lift to 6%
const sampleSize = calculateSampleSize(0.05, 0.01);
// → perGroup: 16,539, total: 33,078 — need ~3.3 days at 10k visitors/day


// Example 2: Two-proportion z-test for conversion rates
function twoProportionZTest(controlConversions, controlVisitors, treatConversions, treatVisitors) {
  const pc = controlConversions / controlVisitors;    // control conversion rate
  const pt = treatConversions / treatVisitors;         // treatment conversion rate
  const delta = pt - pc;                               // observed difference
  
  // Pooled proportion
  const pPooled = (controlConversions + treatConversions) / (controlVisitors + treatVisitors);
  
  // Standard error under H0
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/controlVisitors + 1/treatVisitors));
  const zStat = delta / se;
  
  // Approximate p-value for two-tailed test using normal CDF approximation
  // Using Abramowitz and Stegun approximation for erfc
  const absZ = Math.abs(zStat);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const pOneTail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const pValue = 2 * pOneTail;  // two-tailed
  
  // 95% confidence interval for the difference
  const seForCI = Math.sqrt(pc*(1-pc)/controlVisitors + pt*(1-pt)/treatVisitors);
  const ci95Lower = delta - 1.96 * seForCI;
  const ci95Upper = delta + 1.96 * seForCI;
  
  return {
    controlRate: (pc * 100).toFixed(2) + '%',
    treatmentRate: (pt * 100).toFixed(2) + '%',
    absoluteLift: (delta * 100).toFixed(2) + 'pp',
    relativeLift: ((delta / pc) * 100).toFixed(1) + '%',
    zStatistic: zStat.toFixed(3),
    pValue: pValue.toFixed(4),
    significant: pValue < 0.05,
    ci95: \`[\${(ci95Lower*100).toFixed(2)}pp, \${(ci95Upper*100).toFixed(2)}pp]\`,
    recommendation: pValue < 0.05 
      ? (delta > 0 ? 'SHIP: Treatment is significantly better' : 'DO NOT SHIP: Treatment is significantly worse')
      : 'INCONCLUSIVE: Insufficient evidence to decide'
  };
}

// Ananya's payment page test: Control 847/18320, Treatment 921/18150
const testResult = twoProportionZTest(847, 18320, 921, 18150);
// → controlRate: 4.62%, treatmentRate: 5.08%, absoluteLift: +0.46pp, p=0.021 → SHIP


// Example 3: Bonferroni correction for multiple tests
function multipleTestingCorrection(pValues, method = 'bonferroni') {
  const k = pValues.length;
  
  if (method === 'bonferroni') {
    const adjustedAlpha = 0.05 / k;
    return pValues.map((p, i) => ({
      test: \`Test \${i + 1}\`,
      rawPValue: p,
      adjustedThreshold: adjustedAlpha.toFixed(4),
      significant: p < adjustedAlpha,
      note: p < 0.05 && p >= adjustedAlpha ? 'Sig without correction but NOT with Bonferroni' : ''
    }));
  }
  
  if (method === 'bh') {  // Benjamini-Hochberg (less conservative, preferred)
    const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    const significant = new Array(k).fill(false);
    let lastSig = -1;
    
    for (let rank = k - 1; rank >= 0; rank--) {
      const threshold = (rank + 1) / k * 0.05;
      if (sorted[rank].p <= threshold) {
        lastSig = rank;
        break;
      }
    }
    
    for (let rank = 0; rank <= lastSig; rank++) {
      significant[sorted[rank].i] = true;
    }
    
    return pValues.map((p, i) => ({ test: \`Test \${i + 1}\`, rawPValue: p, significant: significant[i] }));
  }
}

// Growth team ran 15 button color tests — 3 showed p < 0.05
const pValuesFromExperiments = [0.31, 0.72, 0.04, 0.18, 0.09, 0.03, 0.55, 0.41, 0.89, 0.07, 0.16, 0.048, 0.62, 0.38, 0.91];
// With Bonferroni: threshold = 0.05/15 = 0.0033 — none are significant!
// With BH: might accept 1-2 — much less conservative


// Example 4: Bayesian A/B test — probability treatment beats control
function bayesianAB(controlConversions, controlVisitors, treatConversions, treatVisitors, simulations = 100000) {
  // Beta distribution parameters (conjugate prior to binomial)
  // Prior: Beta(1,1) = uniform
  const alphaControl = 1 + controlConversions;
  const betaControl = 1 + (controlVisitors - controlConversions);
  const alphaTreat = 1 + treatConversions;
  const betaTreat = 1 + (treatVisitors - treatConversions);
  
  // Monte Carlo simulation to find P(Treatment > Control)
  let treatWins = 0;
  
  // Sample from Beta distributions using approximation
  function betaSample(alpha, beta) {
    // Wilson-Hilferty approximation for quick simulation
    const u = Math.random();
    // Simplified: use normal approximation to beta for large alpha+beta
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const std = Math.sqrt(variance);
    return Math.max(0, Math.min(1, mean + std * (Math.random() * 2 - 1) * 1.7));
  }
  
  for (let i = 0; i < simulations; i++) {
    const pControl = betaSample(alphaControl, betaControl);
    const pTreat = betaSample(alphaTreat, betaTreat);
    if (pTreat > pControl) treatWins++;
  }
  
  const probTreatBetter = treatWins / simulations;
  
  return {
    probTreatmentWins: (probTreatBetter * 100).toFixed(1) + '%',
    recommendation: probTreatBetter > 0.95 
      ? 'SHIP (>95% confidence treatment wins)'
      : probTreatBetter > 0.90 
        ? 'LIKELY SHIP (90-95% confidence)'
        : probTreatBetter < 0.40 
          ? 'DO NOT SHIP (treatment likely worse)'
          : 'INCONCLUSIVE — collect more data'
  };
}`,
    bugs: `BUG 1: Stopping the test early because p < 0.05 (peeking problem)
SYMPTOM: A/B test is checked daily. On day 4 of a planned 14-day test, p=0.031. Team ships the feature. No measurable improvement in production.
ROOT CAUSE: At α=0.05, if you peek at 7 intermediate points and stop when significant, your true Type I error rate is ~0.14. The "significant" result on day 4 was likely random noise — you caught the test at a lucky moment.
FIX: (1) Commit to sample size before running. (2) Use sequential testing methods (mSPRT) that allow valid early stopping. (3) Use Bayesian methods with explicit stopping rules. (4) If you must peek, use Bonferroni correction on the number of peeks.

BUG 2: Running an underpowered experiment
SYMPTOM: Experiment runs for 5 days, shows p=0.12, team concludes "the feature has no effect." Feature gets killed. 6 months later, competitor ships a nearly identical feature with massive success.
ROOT CAUSE: With only 500 users/group, the test had 22% power to detect a real 2pp lift. There was a 78% chance of missing the real effect. "Fail to reject H0" ≠ "H0 is true."
FIX: Calculate power BEFORE the experiment. If power < 80%, either run longer, increase traffic allocation, or explicitly acknowledge the experiment is exploratory. Never conclude "no effect" from an underpowered test.

BUG 3: Misinterpreting p-value as probability of hypothesis being true
SYMPTOM: Dashboard shows "p=0.02, so there's a 98% chance our new feature increases revenue." Leadership makes decisions based on this framing. Multiple "98% certain" features show no effect at launch.
ROOT CAUSE: p-value = P(data | H0 is true), NOT P(H1 is true | data). The second is what everyone wants — it requires Bayesian reasoning and a prior probability that H1 is true.
FIX: Train the whole team: p < 0.05 means "this result would happen less than 5% of the time by random chance if there were no effect." Use Bayesian A/B testing output ("87% probability treatment wins") for intuitive communication with stakeholders.

BUG 4: Multiple comparisons inflation in metric-heavy dashboards
SYMPTOM: Dashboard shows 50 metrics for every A/B test. Team looks for any metric that "moves" and declares success. Always finds 2-3 significant metrics.
ROOT CAUSE: With 50 metrics and α=0.05, you expect 2-3 false positives even if the feature does absolutely nothing. This is garden of forking paths / HARKing (Hypothesizing After Results are Known).
FIX: Pre-register your primary metric and 2-3 secondary metrics BEFORE the experiment. Apply Bonferroni or BH correction to secondary metrics. Treat all other metric movements as exploratory signals requiring follow-up experiments, not conclusions.

BUG 5: Using the wrong statistical test for the metric type
SYMPTOM: Revenue per user is tested with a t-test. Results are noisy and inconclusive even with large samples.
ROOT CAUSE: Revenue is right-skewed (log-normal). T-test assumes normality. With high skewness, t-test p-values are unreliable. A few high-revenue outliers can dominate the variance, making the test insensitive.
FIX: For revenue metrics: (1) Use Mann-Whitney U test (non-parametric, no normality assumption). (2) Log-transform revenue, run t-test on log(revenue). (3) Use a trimmed mean test (exclude top/bottom 1%). (4) Bootstrap the confidence interval for the mean difference.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
An experiment has: α=0.05, power=0.80, true effect=0.
The team runs the experiment correctly and gets p=0.03.
They ship the feature. What is this an example of?
If the team runs 100 such null experiments over a year, how many will they incorrectly ship?

Answer: This is a Type I error (false positive). With α=0.05, you expect 5 false positives per 100 null experiments. The feature does nothing but the random variation produced a significant-looking result.

CHALLENGE 2 — FIX THE BUG:
The following experiment decision logic is wrong. Find all 3 bugs:
\`\`\`
// "Stop when p < 0.05 on any check"
function runExperiment(data) {
  for (let day = 1; day <= 30; day++) {
    const dayData = data.filter(d => d.day <= day);
    const { pValue } = twoProportionZTest(...dayData);
    if (pValue < 0.05) {  // BUG: peeking — inflates false positive rate
      return { decision: 'SHIP', day, pValue };
    }
  }
  // BUG: Concluding "no effect" without checking if adequately powered
  // BUG: No minimum sample size — could stop after day 1 with 10 users
  return { decision: 'NO EFFECT', day: 30 };
}
\`\`\`

FIX: Pre-calculate required sample size. Run until that sample is collected (not based on time). Do not check p-value until required sample size is reached. If no significant result: report power achieved, not "no effect."

CHALLENGE 3 — BUILD FROM SCRATCH:
Build an experiment planner function experimentPlanner(baseline, mde, dailyTraffic, testAllocation) that:
1. Calculates required sample size per group
2. Calculates experiment duration in days
3. Calculates statistical power if experiment is cut short at 50% of required sample
4. Outputs a warning if the MDE would result in < 1% relative lift (not practically meaningful)
5. Recommends Bayesian approach if daily traffic is < 1000 (frequentist won't converge in time)`,
    summary: `The p-value is a measure of surprise under the null hypothesis, not a probability that your feature works — and running tests with insufficient sample size, multiple comparisons, or early stopping turns your A/B testing program into an expensive random number generator. Design experiments with pre-calculated sample sizes, single primary metrics, and the discipline to not peek.`
  },

  {
    id: 8,
    title: "Metrics Frameworks: What to Measure and Why",
    tag: "NUMBERS THAT ACTUALLY MATTER",
    color: "#6B35A3",
    tldr: `The hardest part of analytics isn't calculating metrics — it's choosing the right ones. Vanity metrics make you feel good but don't drive decisions. A North Star Metric aligns the entire company. Without proper LTV/CAC economics, funnel metrics, and counter-metrics, teams optimize for the wrong thing and miss what's actually broken.`,
    problem: `Deepa's app has 10 million downloads. She reports this to investors. But daily active users are 50,000 (0.5% of installs). The download metric is a vanity metric — it looks impressive but doesn't reflect actual value delivery.

Or: Suresh's team is celebrating 40% month-over-month growth in registered users. But they don't track activation rate. 80% of users never complete onboarding. They're pouring marketing budget into a leaky bucket.

Or: The product team increases DAU by redesigning the home feed to be more addictive. Engagement goes up. But satisfaction scores fall, support tickets spike, and 30-day retention drops. They optimized a metric without a counter-metric to detect quality degradation.

Or: The business targets MAU. Teams game it — send daily notification spam, add forced re-engagement flows. MAU goes up, but L30 (true active users who opened the app in last 30 days) stays flat. The metric was gameable and didn't represent real value.

Getting metrics right means understanding: What is the one number that best captures value delivered? How do I decompose it into actionable sub-metrics? What could go wrong if I optimize this metric without constraints?`,
    analogy: `THE CAR DASHBOARD ANALOGY:

Your North Star Metric is the SPEEDOMETER — the one primary indicator of whether you're making progress. For Uber it's "trips per week." For Netflix it's "hours streamed per member." For Swiggy it's "orders delivered per week." Everything else exists to explain why the speedometer reads what it does.

VANITY METRICS are like your car's ODOMETER — total miles driven ever. Impressive number (10 million km!), but doesn't tell you if you're going the right direction or if the car is healthy.

ACTIONABLE METRICS are like FUEL LEVEL + ENGINE TEMPERATURE — they directly drive decisions. Low fuel? Fill up. High temp? Pull over. These metrics have a clear owner and a clear action when they change.

DAU/MAU RATIO is your car's EFFICIENCY — how much of your "registered users" (full tank potential) are you actually converting to "daily active" (useful driving)? A ratio of 0.20 means only 20% of your MAU actually show up daily.

LTV/CAC RATIO is your PROFIT MARGIN PER TRIP. You spend ₹500 (CAC) to acquire a user. If they generate ₹2,000 in lifetime value (LTV), LTV/CAC = 4x — healthy. If LTV/CAC < 1, you're losing money on every user at scale.

COUNTER-METRICS are your WARNING LIGHTS — they exist to prevent you from "cheating" by flooring the accelerator and destroying the engine. If engagement goes up but customer satisfaction goes down, something is wrong.

THE METRICS TREE is your CAR'S DIAGNOSTIC SYSTEM — it breaks down "why is the speedometer low?" into: Is it engine (product quality)? Fuel (marketing)? Destination (wrong user segment)? Tires (onboarding)?`,
    deep: `NORTH STAR METRIC FRAMEWORK — FULL DESIGN PROCESS

A North Star Metric (NSM) must satisfy ALL of these criteria:
1. Directly correlates with long-term revenue or company survival (not a proxy of a proxy of revenue)
2. Measurable with minimal lag — weekly or daily, not quarterly. Quarterly NSMs are useless for steering.
3. Understandable by the CEO, engineer, designer, and support agent equally
4. Sensitive enough to detect real changes without overreacting to noise (not just yearly step changes)
5. NOT gameable without actually delivering value — this is the hardest criterion

Bad NSM examples and WHY they fail:
- "Total downloads ever": Can't go down. Not sensitive. Doesn't reflect active users.
- "Registered users": Easily gamed (buy installs). Includes dead accounts.
- "Revenue": Doesn't distinguish healthy revenue from discount-driven spikes.
- "NPS score": Lagging indicator. Changes quarterly. Easy to game with survey timing.

Good NSM examples:
- Spotify: "Time spent listening per member per week" — can't game by spamming, directly measures value
- Airbnb: "Nights booked" — captures both supply (hosts) and demand (guests) health
- Zepto: "Orders delivered per week" — covers supply chain, delivery, and demand simultaneously
- Duolingo: "Daily Active Learners" — but ONLY learners who complete a lesson (not just opens)
- PhonePe: "Successful transactions per week" — measures actual value exchange, not just app opens
- LinkedIn: "Members who made a meaningful professional connection in the last 30 days"

The NSM sits at the top of a METRICS TREE that you use to diagnose WHY it changed:
NSM (e.g., "Weekly Orders Delivered")
├── ACQUISITION: New users with first order in the week
│   ├── Paid acquisition: Orders from paid channels / cost
│   ├── Organic acquisition: Orders from SEO, referral, word-of-mouth
│   └── Reactivation: Churned users who placed an order this week
├── ACTIVATION: % of newly installed users who place their FIRST order within 7 days
│   ├── Onboarding completion rate
│   ├── Time to first order (P50, P90)
│   └── First order success rate (not cancelled/failed)
├── ENGAGEMENT: Orders per active user per week (frequency)
│   ├── Category breadth: avg categories ordered per user
│   ├── Session-to-order conversion: sessions that result in an order
│   └── Reorder rate: % of users who ordered last week who ordered this week
├── RETENTION: % of users who ordered in the past 30 days (L30)
│   ├── D7 retention of new users
│   ├── Monthly churn rate by cohort
│   └── Resurrection rate (previously churned users returning)
└── MONETIZATION: Revenue per order, take rate
    ├── Average Order Value (AOV)
    ├── Delivery fee acceptance rate
    └── Premium tier adoption

DAU / MAU / WAU — THE FULL CRITIQUE:

These metrics sound precise but are actually ambiguous. The biggest problem: what counts as "active"?

Weak definition: "Any app event including background push-open" — inflates by 2-3x
Medium definition: "User opened the app and had at least one foreground session"
Strong definition: "User completed at least one core product action (order, message, play, etc.)"
Best definition: "User extracted meaningful value from the product today"

For a food delivery app, "opened app" might be 5x higher than "placed order" — they're completely different user populations. Building metrics on weak activity definitions creates vanity metrics that feel good but predict nothing.

DAU/MAU RATIO (stickiness) benchmarks by product type:
- Messaging / social (WhatsApp, Instagram): 60-80% — users open daily
- Utility apps (banking, email): 30-50% — opens several times per week
- Content (Netflix, YouTube): 15-30% — most users don't watch every day
- Marketplaces (Amazon, Flipkart): 5-15% — purchase intent is infrequent
- Travel (MakeMyTrip): 1-3% — booking is rare by nature

A stickiness of 20% isn't "bad" for all apps — it depends entirely on category. Comparing your stickiness to a competitor without accounting for category is meaningless.

L7 / L28 (ROLLING) vs CALENDAR (MAU):
Classic MAU = users active in the calendar month of January (1st–31st)
Rolling L28 = users active in the last 28 days from today
L28 is more stable and doesn't have month-boundary discontinuities.
Use L28 for dashboards. Use calendar months for investor reporting (familiar convention).

LTV / CAC ECONOMICS — THE COMPLETE PICTURE:

LTV CALCULATION (full version):
LTV = ARPU_monthly * Gross_Margin_% / Monthly_Churn_Rate
     = ARPU * GM / Churn

But this assumes constant ARPU. For expanding revenue (B2B, upsell):
LTV = ARPU_month1 * Σ(t=0 to ∞) [(1-churn)^t * (ARPU_growth_factor)^t] / discount_rate

Simplified expansion-adjusted LTV:
LTV = ARPU / (Churn - ARPU_growth_rate)  [if growth_rate < churn]

Example: ARPU₁=₹500/month, GM=60%, monthly churn=5%, monthly ARPU growth=2%
LTV = 500 * 0.60 / (0.05 - 0.02) = ₹300 / 0.03 = ₹10,000

ARPU BREAKDOWN:
ARPU ≠ Revenue/Users (this is average, often distorted by non-paying users)
Better: ARPPU = Revenue / Paying Users (average revenue per PAYING user)
Even better: Break out by tier — free users vs basic vs premium

CAC BREAKDOWN:
Blended CAC = Total Sales & Marketing Spend / New Customers
This hides channel-level differences. Build CAC per channel:
- Google Search CAC: ₹400
- Facebook CAC: ₹650  
- Influencer CAC: ₹1,200
- Organic/SEO CAC: ₹80 (just content production cost)

Then compare to channel-specific LTV (acquisition channel predicts retention):
Organic LTV: ₹8,000 → LTV/CAC = 100x
Google Search LTV: ₹5,000 → LTV/CAC = 12.5x
Facebook LTV: ₹3,200 → LTV/CAC = 4.9x
Influencer LTV: ₹2,100 → LTV/CAC = 1.75x — barely viable

CHURN ANALYSIS — BEYOND THE SINGLE NUMBER:
Monthly Churn = Users who churned / Users at start of month
But "churned" needs a definition: no activity in 30 days? 60 days? No purchase in 90 days?
Different definitions give wildly different numbers — standardize and document.

Churn by segment usually reveals the actual problem:
- New user churn (< 30 days old): usually activation/onboarding failure
- Mid-term churn (30-90 days): usually engagement/habit formation failure
- Long-term churn (> 90 days): usually product-market fit or competitive loss

Voluntary vs Involuntary churn:
Voluntary: user chose to leave
Involuntary: payment failure, expired card, account issues
These have completely different fixes. Track separately.

COUNTER-METRICS — HOW TO DESIGN THEM:
Every primary metric needs a "guardrail" — a metric that detects if you're achieving the primary metric through harmful means.

Primary: DAU → Counter: Notification opt-out rate, 30-day retention, app store rating
Primary: Revenue → Counter: Refund rate, support ticket volume, NPS, 90-day churn
Primary: Session length → Counter: Task completion rate, user satisfaction score, D30 retention
Primary: Page views → Counter: Bounce rate, scroll depth, return visitor rate
Primary: Registrations → Counter: Activation rate, 7-day retention, spam account rate

The counter-metric requirement forces teams to ask: "How could someone game this primary metric in a way that hurts users?" Then measure the harm signal.

METRICS TREE vs METRICS DASHBOARD:
A dashboard shows you 50 numbers. A metrics tree shows you HOW they relate.
The tree structure: NSM is root. Each branch = a dimension of NSM. Each leaf = actionable metric with a clear owner.

Building the tree:
1. Start with NSM
2. Write: NSM = f(Acquisition, Activation, Retention, Monetization) — the AARRR decomposition
3. For each: identify the 2-3 sub-metrics that drive it most
4. For each sub-metric: identify which team/feature owns it
5. The tree is done when each leaf has a clear owner and a clear action when it drops

Without the tree, dashboards are noise. With the tree, a drop in NSM has a path to a root cause within minutes.`,
    code: `// CONCEPT 8: Metrics Framework Implementation

// Example 1: LTV/CAC Calculator with payback period
function calculateUnitEconomics(arpu, grossMarginPct, monthlyChurnRate, cac) {
  // LTV calculation
  const avgLifespanMonths = 1 / monthlyChurnRate;
  const ltv = arpu * (grossMarginPct / 100) * avgLifespanMonths;
  const ltvCacRatio = ltv / cac;
  
  // Payback period
  const monthlyContribution = arpu * (grossMarginPct / 100);
  const paybackMonths = cac / monthlyContribution;
  
  // Annual churn
  const annualChurn = (1 - Math.pow(1 - monthlyChurnRate, 12)) * 100;
  
  return {
    ltv: \`₹\${ltv.toFixed(0)}\`,
    cac: \`₹\${cac}\`,
    ltvCacRatio: ltvCacRatio.toFixed(2) + 'x',
    paybackMonths: paybackMonths.toFixed(1),
    annualChurnRate: annualChurn.toFixed(1) + '%',
    health: ltvCacRatio > 3 ? '✅ HEALTHY' : ltvCacRatio > 1 ? '⚠️ MARGINAL' : '🚨 DESTROYING VALUE',
    insight: ltvCacRatio < 3 
      ? \`To reach 3x LTV/CAC: either reduce churn to \${((1/(3*cac/(arpu*grossMarginPct/100)))*100).toFixed(1)}%/month OR reduce CAC to ₹\${(ltv/3).toFixed(0)}\`
      : 'Economics look solid — focus on scaling acquisition'
  };
}

// Meesho-style marketplace: ARPU ₹300/mo, 55% margin, 8% monthly churn, CAC ₹400
const economics = calculateUnitEconomics(300, 55, 0.08, 400);
// → LTV: ₹2,063, LTV/CAC: 5.16x, Payback: 2.4 months — very healthy!


// Example 2: DAU/MAU stickiness with quality filter
/*
-- SQL: Stickiness with core action filter (not just "app open")
WITH daily_active AS (
  SELECT
    DATE(event_time) AS activity_date,
    user_id,
    COUNT(DISTINCT session_id) AS sessions,
    COUNT(CASE WHEN event_name = 'order_placed' THEN 1 END) AS orders_placed
  FROM events
  WHERE event_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND event_name IN ('order_placed', 'product_viewed', 'cart_added', 'checkout_started')
  GROUP BY 1, 2
),
monthly_active AS (
  SELECT COUNT(DISTINCT user_id) AS mau FROM daily_active
),
quality_daily AS (
  SELECT 
    activity_date,
    COUNT(DISTINCT user_id) AS raw_dau,
    -- Quality DAU: users who completed a meaningful action
    COUNT(DISTINCT CASE WHEN orders_placed > 0 OR sessions >= 2 THEN user_id END) AS quality_dau
  FROM daily_active
  GROUP BY 1
)
SELECT
  qd.activity_date,
  qd.raw_dau,
  qd.quality_dau,
  ma.mau,
  ROUND(qd.raw_dau / ma.mau * 100, 1) AS raw_stickiness_pct,
  ROUND(qd.quality_dau / ma.mau * 100, 1) AS quality_stickiness_pct
FROM quality_daily qd
CROSS JOIN monthly_active ma
ORDER BY activity_date;
*/


// Example 3: Metrics tree builder — decompose North Star
function buildMetricsTree(northStarValue, components) {
  // Check if components multiply up to NSM
  const calculated = components.acquisition * components.activation 
    * components.engagementMultiplier * components.retentionFactor;
  
  const gap = northStarValue - calculated;
  
  // Find biggest opportunity (which lever has most room to improve)
  const benchmarks = {
    activationRate: { current: components.activation, benchmark: 0.60, label: 'Activation' },
    d30Retention: { current: components.retentionFactor, benchmark: 0.40, label: 'D30 Retention' }
  };
  
  const opportunities = Object.entries(benchmarks)
    .map(([key, val]) => ({
      metric: val.label,
      current: (val.current * 100).toFixed(1) + '%',
      benchmark: (val.benchmark * 100) + '%',
      gap: ((val.benchmark - val.current) * 100).toFixed(1) + 'pp',
      impact: ((val.benchmark - val.current) * northStarValue).toFixed(0) + ' additional NSM units'
    }))
    .sort((a, b) => parseFloat(b.gap) - parseFloat(a.gap));
  
  return {
    northStar: northStarValue,
    breakdown: components,
    biggestOpportunity: opportunities[0],
    treeHealth: gap < northStarValue * 0.1 ? 'CONSISTENT' : 'DISCREPANCY — check data'
  };
}


// Example 4: Cohort vs aggregate — detecting hidden retention problem
/*
-- SQL: Cohort retention that reveals problems hidden by growth
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC(MIN(created_at), MONTH) AS cohort_month
  FROM users
  GROUP BY user_id
),
monthly_activity AS (
  SELECT
    user_id,
    DATE_TRUNC(event_time, MONTH) AS activity_month
  FROM events
  WHERE event_name = 'order_placed'
  GROUP BY 1, 2
),
cohort_data AS (
  SELECT
    uc.cohort_month,
    DATE_DIFF(ma.activity_month, uc.cohort_month, MONTH) AS months_since_acquisition,
    COUNT(DISTINCT uc.user_id) AS retained_users
  FROM user_cohorts uc
  JOIN monthly_activity ma USING (user_id)
  GROUP BY 1, 2
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size FROM user_cohorts GROUP BY 1
)
SELECT
  cd.cohort_month,
  cs.cohort_size,
  cd.months_since_acquisition,
  cd.retained_users,
  ROUND(cd.retained_users / cs.cohort_size * 100, 1) AS retention_pct
FROM cohort_data cd
JOIN cohort_sizes cs USING (cohort_month)
WHERE cd.months_since_acquisition BETWEEN 0 AND 12
ORDER BY 1, 3;
-- If retention_pct drops from Month1-cohort=45% to Month6-cohort=28%,
-- product quality is degrading even if aggregate DAU looks stable
*/


// Example 5: Net Revenue Retention calculation
function calculateNRR(startingMRR, expansionMRR, contractionMRR, churnedMRR) {
  const endingMRR = startingMRR + expansionMRR - contractionMRR - churnedMRR;
  const nrr = (endingMRR / startingMRR) * 100;
  
  return {
    startingMRR: \`₹\${(startingMRR/100000).toFixed(1)}L\`,
    endingMRR: \`₹\${(endingMRR/100000).toFixed(1)}L\`,
    nrr: nrr.toFixed(1) + '%',
    interpretation: nrr >= 120 
      ? '🚀 ELITE: Revenue grows without new customers (best-in-class SaaS)' 
      : nrr >= 100 
        ? '✅ HEALTHY: Existing customers expand enough to offset churn'
        : nrr >= 85 
          ? '⚠️ WARNING: Churn is outpacing expansion — fix retention'
          : '🚨 CRISIS: Massive revenue leak — investigate churn causes immediately'
  };
}
// B2B SaaS: Starting MRR ₹50L, Expansion ₹8L, Contraction ₹2L, Churn ₹3L
// NRR = (50+8-2-3)/50 * 100 = 106% ✅`,
    bugs: `BUG 1: Reporting MAU as "active users" without defining "active"
SYMPTOM: Product claims 5M monthly active users. But analysis reveals 3.2M of them only opened a push notification (which counts as an "app open" event) and immediately closed the app. True engaged users are 1.8M.
ROOT CAUSE: "Active" was defined as "any app event in 30 days" including passive opens. This is a vanity metric that makes the product look 2.8x healthier than it is. Monetization, retention, and engagement predictions based on this number will be wildly off.
FIX: Define "active" as "completed at least one core action" (e.g., placed order, sent message, played content). Document this definition in a central metrics glossary. Apply it consistently across all dashboards and investor reports.

BUG 2: Using aggregate retention to hide cohort deterioration
SYMPTOM: D30 retention looks flat at 35% for 6 months. Team is happy — "retention is stable." But growth is slowing. Analysis reveals recent cohorts have 25% D30 retention; old cohorts averaging 55% are propping up the aggregate number.
ROOT CAUSE: Aggregate retention mixes cohorts of different quality. As old high-quality cohorts age out of the 30-day window, aggregate retention will suddenly drop — but you won't see it coming with aggregate analysis.
FIX: Always track retention BY COHORT. Plot retention curves separately for each monthly acquisition cohort. The trend of cohort retention over time is the true leading indicator of product health.

BUG 3: Optimizing LTV/CAC by cutting CAC without considering quality
SYMPTOM: Growth team reduces CAC from ₹600 to ₹300 by shifting budget to low-cost channels. LTV/CAC jumps from 3x to 6x. Team celebrates. 90 days later, NRR drops from 105% to 85% — the cheaper users have 3x higher churn.
ROOT CAUSE: CAC optimization without segmenting by channel quality. Cheap channels often bring lower-intent users with worse LTV. LTV/CAC should be calculated PER ACQUISITION CHANNEL, not in aggregate.
FIX: Build a channel-level LTV/CAC model. Track D30 retention and 3-month ARPU by acquisition channel. Cheap CAC with low LTV is worse than expensive CAC with high LTV. Use LTV/CAC payback period as the decision metric.

BUG 4: No counter-metrics leading to metric gaming
SYMPTOM: Product team is tasked with increasing DAU. They add aggressive daily notification campaigns. DAU goes up 15%. But app store ratings drop from 4.3 to 3.8, uninstall rate triples, and 6-month retention drops 20pp.
ROOT CAUSE: Single metric optimization without guardrail metrics. The team found the easiest path to increasing DAU — spam users into opening the app — which works short-term but destroys long-term value.
FIX: Every primary metric needs counter-metrics. For DAU: counter with uninstall rate, notification opt-out rate, and D30 retention. If counter-metrics move adversely, the DAU gain is not acceptable. Frame this as: "Increase DAU while maintaining D30 retention ≥ 38% and uninstall rate ≤ 1.5%."

BUG 5: Confusing revenue growth with healthy unit economics
SYMPTOM: Startup reports 200% YoY revenue growth. CAC is ₹800. ARPU is ₹150/month. Gross margin is 40%. The more they grow, the more money they lose.
ROOT CAUSE: LTV = 150 * 0.40 * (1/0.10) = ₹600. CAC = ₹800. LTV/CAC = 0.75x < 1. Growing revenue on negative unit economics burns cash exponentially. The revenue metric obscures the destruction of value.
FIX: Track LTV/CAC and payback period BEFORE scaling acquisition. A business with LTV/CAC < 1 should NOT grow faster until economics improve. Investors often push for growth metrics — the analyst's job is to surface the unit economic reality.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A company has: MAU = 500,000, DAU = 60,000, DAU/MAU stickiness = 12%.
They run a notification campaign that increases DAU to 80,000. New DAU/MAU = 16%.
But D30 retention for the new users drops from 35% to 22%.
Is this campaign a success? Calculate the 3-month impact on active user base assuming 10,000 new users/month.

Answer: Short-term DAU looks better. But long-term: lower-quality users (22% D30 vs 35%) will result in ~4,000 fewer retained users per cohort per month. After 3 months, you've built a leakier bucket. The campaign is a failure by cohort retention standards.

CHALLENGE 2 — FIX THE BUG:
This metrics dashboard is reporting incorrect stickiness:
\`\`\`sql
-- BROKEN: This double-counts users active on multiple days
SELECT
  COUNT(DISTINCT user_id) AS mau,
  SUM(daily_users) AS "total DAU" -- This is not average DAU!
FROM (
  SELECT DATE(event_time), COUNT(DISTINCT user_id) as daily_users
  FROM events GROUP BY 1
) daily
\`\`\`
Rewrite this to correctly compute: (1) True MAU, (2) Average DAU over the month, (3) Stickiness ratio.

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a metricsHealthCheck(metrics) function that takes an object with: dau, mau, newUsersThisMonth, d30Retention, arpu, grossMarginPct, monthlyChurn, cac.
Return a report that: (1) Calculates stickiness and flags if < 15%, (2) Calculates LTV/CAC and flags if < 3x, (3) Detects if DAU growth is masking retention problems (DAU growing but D30 retention declining), (4) Recommends top priority: acquisition, activation, retention, or monetization.`,
    summary: `The North Star Metric is your compass — everything else is navigation. But picking the wrong metric, failing to segment by cohort, or optimizing without counter-metrics turns your analytics practice into a sophisticated way of fooling yourself. Great metrics are specific, causal, hard to game, and paired with guardrails.`
  },

  {
    id: 9,
    title: "Cohort Retention Analysis",
    tag: "WHO STAYS AND WHO LEAVES",
    color: "#0077B6",
    tldr: `Cohort retention analysis tracks groups of users acquired in the same time period to see how their behavior evolves over time. It's the gold standard for measuring product-market fit, detecting product quality changes, and distinguishing real growth from churn-masked flatness. A retention curve that flattens above 0% is the most reliable signal of product-market fit.`,
    problem: `Kavita's app shows flat DAU for 3 months. The growth team is confused — they're acquiring 50,000 new users per month. The retention team is confused — they think D30 retention of 30% is fine.

The problem: every month, 30,000 of last month's users churn. The 50,000 new users are exactly replacing them. The aggregate DAU metric looks stable, but the product is a leaky bucket — not growing, just maintaining equilibrium through acquisition. Without cohort analysis, this is invisible.

Or: A fintech app launches a new onboarding flow. Aggregate D7 retention looks fine (25%). But cohort analysis shows the June cohort (new onboarding) has 15% D7 retention while May cohort (old onboarding) had 35%. The new onboarding is destroying retention. Without cohort segmentation, you'd miss this for months.

Or: An analyst sees a "smile curve" — retention that dips sharply in months 2-3 then recovers in months 6-12. They panic and try to fix month 3. But the smile curve is actually showing resurrection: users who left came back because of a new feature. Misreading retention curve shapes leads to wrong interventions.`,
    analogy: `THE SCHOOL BATCH ANALOGY:

Imagine tracking what happens to every graduating batch from an engineering college over time.

COHORT = One graduating batch (e.g., the 2020 batch). All 500 students who graduated in 2020.

RETENTION CURVE = What percentage of the 2020 batch is still working in tech by each year after graduation:
Year 0 (graduation): 100%
Year 1: 85% (some went abroad, some left tech)
Year 2: 72%
Year 3: 65%
Year 4: 63%
Year 5: 62%
Year 6: 62% ← THE CURVE HAS FLATTENED!

THE FLATNESS = THE KEY SIGNAL. When a cohort's retention curve stops declining and flattens, it means you've found the "core" group who will stay forever. In product terms: the users who truly get value from the product.

If the 2022 batch shows Year 2 retention of only 55% (vs 72% for 2020 batch), something changed — maybe college quality dropped, or industry demand shifted. This is exactly what cohort analysis detects: changes in product or acquisition quality across batches.

THE SMILE CURVE = Imagine the 2021 batch: 85% at year 1, drops to 60% by year 2 (many left for startups), then RISES to 70% by year 4 (startup bubble burst, they returned). The curve dips then rises — a smile. This isn't bad retention; it's RESURRECTION. Users left but came back. Without seeing the curve shape, you'd misdiagnose this.

TRIANGULAR HEATMAP = Picture a spreadsheet where rows = cohort months (Jan, Feb, Mar...) and columns = months since acquisition (M0, M1, M2...). Each cell = retention %. Older cohorts have more data (more columns filled in). Newer cohorts have fewer columns. The filled cells form a triangle. Darker green = better retention. Sudden color changes in a column = product change in that period.`,
    deep: `BUILDING A COHORT RETENTION TABLE — COMPLETE GUIDE

WHAT IS A COHORT?
A cohort is a group of users who share a common starting event within a defined time period. The most common cohort definition is users who performed their FIRST meaningful action in the same week or month. The cohort date is fixed — it never changes for a user. A user who first ordered on January 15th is forever in the January cohort, whether you analyze them in February or in December.

The standard cohort retention table has:
- Rows: Cohort definition period (usually weekly or monthly)
- Columns: Periods since acquisition (Week 0, Week 1, Week 2... or M0, M1, M2...)
- Values: % of original cohort still active in that period
Period 0 is always 100% by definition.
Every subsequent period shows retention decay.

WHY COHORT ANALYSIS BEATS AGGREGATE:
Scenario: Monthly DAU is flat at 500,000 for 6 months.
Naive conclusion: "Retention is stable."
Cohort reality:
- Jan cohort: M6 retention = 45%
- Feb cohort: M5 retention = 38%
- Mar cohort: M4 retention = 30%
- Apr cohort: M3 retention = 25%
- May cohort: M2 retention = 20%
- Jun cohort: M1 retention = 15%

Cohort retention is DECLINING sharply. But new user acquisition is perfectly filling the gap, making aggregate DAU look flat. This is the "leaky bucket with a hose" problem — you're pouring more water in faster to hide the leak.

If you don't look at cohorts, you'll think you have a stable product. If you do, you realize you're in a race against an accelerating churn rate. The fix (retention) is very different from what the aggregate metric implies.

CLASSIC vs ROLLING RETENTION — TECHNICAL DETAILS:

CLASSIC (N-day) retention = % of Day 0 users who were active on EXACTLY Day N
Rolling (unbounded) retention = % of Day 0 users who were active AT LEAST ONCE from Day N onwards
Bounded rolling = % of Day 0 users who were active at least once within Days (N-W) to N (where W is a window)

Example: D7 retention definitions compared
Classic D7: Active on exactly day 7 → most restrictive
Window D7 (days 6-8): Active in ± 1 day window around day 7 → slightly higher
Rolling 7-day (days 4-7): Active at least once between days 4-7 → much higher
Unbounded rolling from day 7: Active at least once on or after day 7, ever → highest

Typical ratio: Rolling D7 is 1.4–2x higher than Classic D7.
Products should choose based on their natural usage frequency:
- Daily-use apps (WhatsApp, Instagram, Spotify): use Classic D7 — daily usage is the expectation
- Weekly-use apps (meal planning, budget tracking): use window retention (days 6-8 or 5-9)
- Infrequent apps (travel, tax filing, car insurance): use monthly rolling retention

DOCUMENT YOUR DEFINITION. Changing it later is worse than having the "wrong" definition.

WHAT GOOD RETENTION LOOKS LIKE — BENCHMARKS:

Consumer Social (Facebook, Instagram equivalent):
D1: >50%, D7: >25%, D30: >15%, M6: >8%

Short-form video / content (YouTube Shorts, Reels type):
D1: >60%, D7: >35%, D30: >20%

E-commerce / Delivery (Zomato, Amazon):
D7: >20%, D30: >10%, M3: >6% (purchase frequency is naturally lower)

Mobile gaming:
D1: >40%, D7: >15%, D30: >5%, M6: >2%

B2B SaaS (tools embedded in workflow):
D30: >70%, M3: >55%, M6: >45%, M12: >35% (churn is catastrophic for B2B)

Communication / Messaging:
D1: >75%, D7: >55%, D30: >35% (if people don't use it daily, they delete it)

The key is comparing yourself against your own previous cohorts and industry benchmarks, not arbitrary numbers.

THE RETENTION CURVE SHAPES — ANALYTICAL CLASSIFICATION:

1. HEALTHY FLATTENING CURVE (PMF indicator):
Path: Steep initial drop → gradual flattening → flat plateau above 0%
Example: 100% → 55% → 38% → 30% → 28% → 27% → 27% → 27%
The plateau (27%) is your "retained core" — users who truly need the product.
This is the #1 signal of product-market fit from retention data.
The plateau level matters:
- >40%: Exceptional. You have a very strong core user base.
- 20-40%: Good. PMF exists for a meaningful segment.
- 10-20%: Moderate. PMF exists but may be niche or partial.
- <10%: Weak. Most users eventually churn. Need to find and focus on the segment that doesn't.

2. STILL-DECLINING CURVE (no PMF):
Path: 100% → 45% → 28% → 16% → 9% → 5% → 3% → 1.5%...
Never flattens. Every cohort eventually churns to near-zero.
Interpretation: No user segment has found this product to be truly indispensable.
Action: Stop optimizing growth. Do qualitative interviews. Find if ANY segment has a flat curve.

3. SMILE CURVE (resurrection signal):
Path: 100% → 40% → 22% → 15% → 18% → 24% → 28%
Dips then rises. Users who left are coming back.
Could be caused by: seasonal patterns, major new feature, re-engagement campaign, lifecycle event.
CRITICAL: Do not panic about the dip and ship emergency retention fixes. Wait and see if recovery follows. Check if the same pattern exists in prior year's cohorts at the same calendar time (seasonality).

4. INVERSE RETENTION (deep engagement, slow start):
Path: 100% → 65% → 70% → 75% → 78% → 80% → 81%
Retention INCREASES after the initial period. Users who survive the first period become more engaged.
Seen in: B2B tools (teams slowly integrate the product), productivity apps (users who build habits go deeper), reference tools (infrequent use is still high value).

5. TWO-TIER CURVE (mixed user quality):
Path: Drops from 100% to 45% very quickly, then SLOWLY drops from 45% to 35% over many months.
The quick initial drop = low-intent users who tried and left.
The slow gradual decay from 45% = core users with real intent.
Segment your cohort: users from paid acquisition often drive the initial fast drop. Organic users are the 45% who stuck.

PRODUCT-MARKET FIT SIGNAL — QUANTITATIVE DEFINITION:
PMF threshold from retention: your D30 (or M1) retention flattens above 20-30% in your organic segment.
Why organic? Paid users are incentivized to install and may not represent true product-value users.
Why 20-30%? This means at least 1 in 4 to 1 in 5 non-incentivized users find the product indispensable enough to return monthly.

Additional signals that strengthen the PMF case:
- Organic word-of-mouth drives a meaningful % of new installs (K-factor > 0.3)
- Users push back emotionally when you try to shut the product down (Sean Ellis test: >40% "very disappointed")
- Retention of the core segment has IMPROVED over time (your product is getting better for the people it serves)

READING THE TRIANGULAR HEATMAP:
The triangular shape arises because newer cohorts have fewer data points (fewer columns filled in).
A Jan cohort tracked in June has 6 months of data.
A June cohort tracked in June has 0 months of data (it just started).

Reading patterns:
VERTICAL pattern (looking down a column): How is M3 retention changing across all cohorts?
If M3 retention goes: 42%, 40%, 37%, 33%, 28% (declining for each new cohort)
→ Product quality is degrading. Recent users find less value at the 3-month mark.

HORIZONTAL pattern (looking across a row): One cohort's retention journey.
Steep drop then plateau = healthy. Never plateauing = no PMF.

DIAGONAL pattern (looking at the same calendar period across cohorts):
If everyone in March (regardless of cohort age) shows unusually low retention
→ Something happened in March (bad product release, competitor launch, seasonal event)

COLOR DENSITY changes across the heatmap are often the fastest way to spot a product change.

RESURRECTION ANALYSIS — THE FULL TREATMENT:
Definition: User who was inactive for X+ days (common: 30, 60, or 90 days) who becomes active again.
Resurrection rate = Resurrected users this month / Users who had churned in the past

Why resurrection matters:
1. Resurrected users have a second chance at conversion — they already know the product
2. High resurrection rate can inflate "retention" if you're not careful (they count as "retained" in rolling retention windows)
3. Resurrection often happens due to a trigger — new feature, re-engagement email, friend invitation
4. If 30% of your "retained" users are actually resurrections, your organic retention is weaker than it looks

Resurrection analysis questions:
- What % of active users this month were inactive last month? (Resurrection contribution to DAU)
- What triggered resurrection? (Which notification/email/feature update drove them back?)
- What do resurrected users do when they return? (One-time peek or genuine re-engagement?)
- How long does the resurrection stick? (Track retention from resurrection date, not original signup date)

CHURN COHORT SURVIVORSHIP:
Track not just "still active" but "never churned" vs "churned and came back" (resurrected).
Three possible states per user per period:
1. Active (retained)
2. Inactive (churned)
3. Resurrected (was inactive, now active)

A retention curve that shows 35% at M6 could mean:
- 35% never churned (high-value, habitual users) — good signal
- 15% never churned + 20% resurrected — mixed signal, resurrection is masking weaker organic retention
Tracking these separately gives you a clearer picture of true product stickiness.`,
    code: `// CONCEPT 9: Cohort Retention Analysis

// Example 1: Core cohort retention SQL — the triangular heatmap query
/*
-- BigQuery / Snowflake: Generate cohort retention table
-- This is the foundational query every analyst should know cold
WITH user_first_activity AS (
  -- Define cohort: MONTH of first meaningful action per user
  -- Use the FIRST qualifying action — this is the cohort date, fixed forever
  SELECT
    user_id,
    DATE_TRUNC(MIN(event_time), MONTH) AS cohort_month,
    MIN(event_time) AS first_event_time
  FROM events
  WHERE event_name = 'order_placed'  -- your "activation" event — be specific!
  GROUP BY user_id
),
user_monthly_activity AS (
  -- All MONTHS each user was active (placed an order) after cohort month
  SELECT DISTINCT
    user_id,
    DATE_TRUNC(event_time, MONTH) AS activity_month
  FROM events
  WHERE event_name = 'order_placed'
),
cohort_size AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_users
  FROM user_first_activity
  GROUP BY 1
),
monthly_retention AS (
  SELECT
    ufa.cohort_month,
    -- Number of months since cohort started (0 = cohort month itself)
    DATE_DIFF(uma.activity_month, ufa.cohort_month, MONTH) AS months_since_acquisition,
    COUNT(DISTINCT ufa.user_id) AS retained_users
  FROM user_first_activity ufa
  JOIN user_monthly_activity uma USING (user_id)
  WHERE uma.activity_month >= ufa.cohort_month  -- only from cohort month onwards
  GROUP BY 1, 2
)
SELECT
  mr.cohort_month,
  cs.cohort_users,
  mr.months_since_acquisition AS period,
  mr.retained_users,
  ROUND(mr.retained_users / cs.cohort_users * 100, 1) AS retention_pct,
  -- Visual heatmap classification for BI tools (Looker, Tableau)
  CASE
    WHEN mr.retained_users / cs.cohort_users >= 0.40 THEN '🟢 HIGH'
    WHEN mr.retained_users / cs.cohort_users >= 0.20 THEN '🟡 MEDIUM'
    WHEN mr.retained_users / cs.cohort_users >= 0.08 THEN '🟠 LOW'
    ELSE '🔴 CRITICAL'
  END AS retention_tier,
  -- IMPORTANT: Period 0 is always 100% by definition
  -- If period 0 != 100%, something is wrong with your cohort definition
  ROUND(mr.retained_users / FIRST_VALUE(mr.retained_users)
    OVER (PARTITION BY mr.cohort_month ORDER BY mr.months_since_acquisition) * 100, 1) AS pct_of_cohort_peak
FROM monthly_retention mr
JOIN cohort_size cs USING (cohort_month)
-- Only include cohorts that have had enough time to be meaningful
WHERE cs.cohort_users >= 100  -- filter tiny cohorts — statistical noise
ORDER BY mr.cohort_month, mr.months_since_acquisition;
*/


// Example 2: Detect retention trend across cohorts (is product improving or degrading?)
/*
-- Look DOWN columns: Is each new cohort retaining better or worse at M3?
-- This is the most important single query for product health monitoring
WITH cohort_retention AS (
  -- Use the cohort retention query from Example 1 as a CTE here
  SELECT * FROM cohort_retention_table
),
pivoted AS (
  SELECT
    cohort_month,
    cohort_users,
    -- Pivot key retention milestones
    MAX(CASE WHEN period = 1 THEN retention_pct END) AS m1_retention,
    MAX(CASE WHEN period = 3 THEN retention_pct END) AS m3_retention,
    MAX(CASE WHEN period = 6 THEN retention_pct END) AS m6_retention,
    MAX(CASE WHEN period = 12 THEN retention_pct END) AS m12_retention
  FROM cohort_retention
  GROUP BY 1, 2
)
SELECT
  cohort_month,
  cohort_users,
  m1_retention,
  m3_retention,
  m6_retention,
  m12_retention,
  -- MoM change in M3 retention — the key health signal
  m3_retention - LAG(m3_retention) OVER (ORDER BY cohort_month) AS m3_retention_mom_change,
  -- 3-month rolling average to smooth noise
  AVG(m3_retention) OVER (ORDER BY cohort_month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS m3_retention_3mo_avg,
  -- Flag if declining for 3+ consecutive months
  CASE
    WHEN m3_retention < LAG(m3_retention) OVER (ORDER BY cohort_month)
     AND LAG(m3_retention) OVER (ORDER BY cohort_month) < LAG(m3_retention, 2) OVER (ORDER BY cohort_month)
     AND LAG(m3_retention, 2) OVER (ORDER BY cohort_month) < LAG(m3_retention, 3) OVER (ORDER BY cohort_month)
    THEN '🚨 DECLINING 3+ MONTHS — URGENT'
    WHEN m3_retention < LAG(m3_retention) OVER (ORDER BY cohort_month)
    THEN '⚠️ DECLINING'
    ELSE '✅ STABLE/IMPROVING'
  END AS trend_signal
FROM pivoted
WHERE cohort_month <= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)  -- only include mature cohorts
ORDER BY cohort_month;
*/


// Example 3: JavaScript — classify retention curve shape
function classifyRetentionCurve(retentionByPeriod) {
  // retentionByPeriod: [{period: 0, rate: 1.0}, {period:1, rate:0.45}, ...]
  const rates = retentionByPeriod.map(r => r.rate);
  const periods = retentionByPeriod.map(r => r.period);
  
  if (rates.length < 4) return { shape: 'INSUFFICIENT_DATA', message: 'Need at least 4 data points to classify curve' };
  
  // Find the trough (lowest point after period 0)
  let troughIdx = 1;
  for (let i = 2; i < rates.length; i++) {
    if (rates[i] < rates[troughIdx]) troughIdx = i;
  }
  const trough = { period: periods[troughIdx], rate: rates[troughIdx] };
  
  // Check for smile: significant rise AFTER the trough (>3pp)
  const maxAfterTrough = Math.max(...rates.slice(troughIdx + 1));
  const riseAfterTrough = maxAfterTrough - trough.rate;
  const hasSmile = riseAfterTrough > 0.03 && troughIdx < rates.length - 2;
  
  // Check for flattening: last 3 periods change < 2pp
  const tail = rates.slice(-3);
  const tailRange = Math.max(...tail) - Math.min(...tail);
  const hasFlattened = tailRange < 0.02;
  const tailLevel = tail[tail.length - 1];
  
  // Check for inverse (rising) retention
  const isInverse = rates.slice(1, 4).every((r, i) => r >= rates[i]);
  
  // Still declining: trough at end, no flattening
  const stillDeclining = troughIdx === rates.length - 1 && tailLevel < 0.08;
  
  // PMF level assessment
  const pmfLevel = tailLevel > 0.40 ? 'EXCEPTIONAL PMF'
                 : tailLevel > 0.25 ? 'STRONG PMF'
                 : tailLevel > 0.15 ? 'MODERATE PMF — find the high-retention segment'
                 : tailLevel > 0.05 ? 'WEAK PMF — product works for a niche only'
                 : 'NO PMF SIGNAL — consider fundamental pivots';
  
  if (hasSmile) {
    return {
      shape: 'SMILE_CURVE',
      troughPeriod: trough.period,
      troughRate: (trough.rate * 100).toFixed(1) + '%',
      recoveryRate: (maxAfterTrough * 100).toFixed(1) + '%',
      interpretation: \`Retention dipped to \${(trough.rate*100).toFixed(1)}% at period \${trough.period} then recovered to \${(maxAfterTrough*100).toFixed(1)}%. Users are resurrecting.\`,
      action: 'Identify the event that triggered resurrection (new feature, re-engagement campaign, seasonal). Build this trigger into a systematic reactivation program.',
      pmfLevel
    };
  }
  
  if (isInverse) {
    return {
      shape: 'INVERSE_RETENTION',
      interpretation: 'Retention INCREASES in early periods. Early survivors become more engaged over time — classic B2B SaaS pattern.',
      action: 'Focus on maximizing period-1 survival. Those who stay become deeply embedded. Identify what the period-1 survivors do that others do not.',
      pmfLevel
    };
  }
  
  if (hasFlattened && tailLevel > 0.08) {
    return {
      shape: 'HEALTHY_FLATTENING',
      floorLevel: (tailLevel * 100).toFixed(1) + '%',
      interpretation: \`Retention has stabilized at ~\${(tailLevel*100).toFixed(1)}%. This is your core user base.\`,
      action: tailLevel > 0.25
        ? 'Strong PMF confirmed. Focus on growth — your retention floor can support scaling.'
        : 'PMF exists but floor is modest. Identify what makes retained users different and optimize acquisition to attract more of them.',
      pmfLevel
    };
  }
  
  if (stillDeclining) {
    return {
      shape: 'STILL_DECLINING',
      currentRate: (tailLevel * 100).toFixed(1) + '%',
      interpretation: 'Retention has not flattened. Every cohort will eventually churn to near-zero.',
      action: 'STOP scaling acquisition. Do qualitative user research. Find ANY user segment with flat retention and build for them exclusively.',
      pmfLevel: 'NO PMF SIGNAL'
    };
  }
  
  return {
    shape: 'NORMAL_DECAY',
    interpretation: 'Standard decay, still trending down. More time needed to determine if it will flatten.',
    action: 'Wait for more data. Track whether each new cohort has a higher or lower floor at the same period.',
    pmfLevel
  };
}


// Example 4: Rolling vs Classic retention comparison SQL
/*
-- Shows the gap between the two definitions — helps normalize benchmark comparisons
SELECT
  cohort_date,
  COUNT(DISTINCT ufa.user_id) AS cohort_size,
  
  -- Classic D7: active on EXACTLY day 7
  COUNT(DISTINCT CASE
    WHEN DATE_DIFF(e.event_date, ufa.first_date, DAY) = 7
    THEN e.user_id END) AS classic_d7_users,
    
  -- Window D7: active between day 5–9 (±2 day window)
  COUNT(DISTINCT CASE
    WHEN DATE_DIFF(e.event_date, ufa.first_date, DAY) BETWEEN 5 AND 9
    THEN e.user_id END) AS window_d7_users,
    
  -- Rolling D7: active at least once in days 1-7
  COUNT(DISTINCT CASE
    WHEN DATE_DIFF(e.event_date, ufa.first_date, DAY) BETWEEN 1 AND 7
    THEN e.user_id END) AS rolling_d7_users,
    
  -- Ratios to understand the gap
  ROUND(COUNT(DISTINCT CASE WHEN DATE_DIFF(e.event_date, ufa.first_date, DAY) = 7 THEN e.user_id END)
    / COUNT(DISTINCT ufa.user_id) * 100, 1) AS classic_d7_pct,
    
  ROUND(COUNT(DISTINCT CASE WHEN DATE_DIFF(e.event_date, ufa.first_date, DAY) BETWEEN 1 AND 7 THEN e.user_id END)
    / COUNT(DISTINCT ufa.user_id) * 100, 1) AS rolling_d7_pct

FROM user_first_activity ufa
LEFT JOIN daily_activity_events e USING (user_id)
WHERE e.event_date >= ufa.first_date
GROUP BY cohort_date
ORDER BY cohort_date;
-- Typical finding: rolling D7 is 1.4–2x higher than classic D7
-- If competitor claims "35% D7 retention" and you have "25% D7 retention"
-- Make sure you're comparing the same definition before panicking!
*/


// Example 5: Detect resurrection users and separate from organic retention
/*
-- Separately track: (1) Never churned, (2) Resurrected, for cleaner PMF signal
WITH user_monthly_status AS (
  SELECT
    ufa.user_id,
    ufa.cohort_month,
    months.activity_month,
    DATE_DIFF(months.activity_month, ufa.cohort_month, MONTH) AS period,
    CASE WHEN uma.user_id IS NOT NULL THEN 1 ELSE 0 END AS was_active
  FROM user_first_activity ufa
  CROSS JOIN (SELECT DISTINCT DATE_TRUNC(event_time, MONTH) AS activity_month FROM events) months
  LEFT JOIN user_monthly_activity uma 
    ON ufa.user_id = uma.user_id AND months.activity_month = uma.activity_month
  WHERE months.activity_month >= ufa.cohort_month
),
user_with_gaps AS (
  SELECT
    user_id, cohort_month, activity_month, period, was_active,
    -- Was user active in the PREVIOUS month?
    LAG(was_active, 1, 0) OVER (PARTITION BY user_id ORDER BY activity_month) AS was_active_prev_month
  FROM user_monthly_status
)
SELECT
  cohort_month,
  period,
  COUNT(DISTINCT user_id) AS cohort_size,
  -- True retained: active this month AND was active last month (never churned in this gap)
  SUM(CASE WHEN was_active = 1 AND was_active_prev_month = 1 THEN 1 ELSE 0 END) AS continuously_retained,
  -- Resurrected: active this month but NOT active last month (came back after a gap)
  SUM(CASE WHEN was_active = 1 AND was_active_prev_month = 0 AND period > 1 THEN 1 ELSE 0 END) AS resurrected,
  -- Total active (what normal retention reports)
  SUM(was_active) AS total_active,
  -- PMF-clean retention (exclude resurrections for true stickiness signal)
  ROUND(SUM(CASE WHEN was_active = 1 AND was_active_prev_month = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT user_id) * 100, 1) AS clean_retention_pct,
  ROUND(SUM(was_active) / COUNT(DISTINCT user_id) * 100, 1) AS total_retention_pct
FROM user_with_gaps
GROUP BY 1, 2
ORDER BY 1, 2;
*/


// Example 6: Segment retention by acquisition channel to find true PMF
/*
-- Organic users almost always have higher retention than paid users
-- THIS is the query that reveals your true product retention floor
SELECT
  acq.acquisition_channel,
  ufa.cohort_month,
  COUNT(DISTINCT ufa.user_id) AS cohort_size,
  ROUND(AVG(CASE WHEN mr.period = 1 THEN mr.retention_pct END), 1) AS avg_m1_retention,
  ROUND(AVG(CASE WHEN mr.period = 3 THEN mr.retention_pct END), 1) AS avg_m3_retention,
  ROUND(AVG(CASE WHEN mr.period = 6 THEN mr.retention_pct END), 1) AS avg_m6_retention,
  -- Difference between organic and overall (size of "quality gap")
  ROUND(AVG(CASE WHEN mr.period = 3 THEN mr.retention_pct END)
    - AVG(AVG(CASE WHEN mr.period = 3 THEN mr.retention_pct END)) OVER (), 1) AS m3_vs_avg_gap
FROM user_first_activity ufa
JOIN user_acquisition_data acq USING (user_id)
JOIN monthly_retention_by_user mr USING (user_id, cohort_month)
GROUP BY 1, 2
HAVING COUNT(DISTINCT ufa.user_id) >= 200  -- statistical minimum per segment
ORDER BY 1, 2;
-- If organic M3=45% and paid_social M3=18%, your product's true retention floor is 45%
-- Paid channels are masking this by bringing low-quality users
-- Two possible fixes: (1) improve paid user experience, (2) reduce paid spend and focus on organic
*/`,
    bugs: `BUG 1: Mixing acquisition channels in cohort analysis and drawing wrong PMF conclusion
SYMPTOM: D30 retention = 22%. Team concludes "no PMF, product needs fundamental changes." Months of work follows. But underlying organic cohort has 48% D30 retention.
ROOT CAUSE: Blended cohorts mix high-LTV organic users with low-LTV paid users who respond to incentives but don't stick. The blended number masks the product's true retention potential.
FIX: Always segment cohort retention by acquisition source (organic search, paid social, referral, direct). The organic retention number is your baseline product quality signal. Report both blended and segmented retention.

BUG 2: Confusing classic and rolling retention benchmarks
SYMPTOM: Competitor reports "30% Day-7 retention" using rolling (any activity in days 4-7). Your product reports "18% Day-7 retention" using classic (active on exactly day 7). Team panics about 12pp gap. Gap is actually 2pp after normalizing.
ROOT CAUSE: Industry benchmarks use different retention definitions. Classic D7 is typically 30-50% lower than rolling D7 for intermittent-use apps.
FIX: Document your retention definition clearly. When comparing to benchmarks, clarify which definition they used. For internal tracking: pick one definition and never change it (changing retention definition is worse than having an imperfect definition).

BUG 3: Panicking about smile curve and making destructive interventions
SYMPTOM: Month 3 retention for the January cohort drops from 25% to 18%. PM mandates "emergency retention sprint." Team adds re-engagement popups, email blasts, and forced tutorials. But by month 5, retention rises back to 26%. The "smile" was a seasonal dip + resurrection. The interventions added noise and user annoyance.
ROOT CAUSE: Analyst didn't recognize the smile curve pattern. The dip was seasonal (users less active in March due to exams/festivals) and followed by natural resurrection in May.
FIX: Before acting on a retention dip, check: (1) Is this the same dip seen in cohorts from 1-2 years ago at the same calendar time? (2) Are users resurrecting 2-3 months later? If yes, this is seasonal — wait and see, don't intervene.

BUG 4: Reporting retention on too-small cohorts creating noisy signals
SYMPTOM: Weekly cohort retention chart is extremely volatile — 45% one week, 22% the next, 38% the next. Team keeps chasing the noise, shipping and reverting changes based on weekly cohort swings.
ROOT CAUSE: Weekly cohorts often have 500-2,000 users. A retention rate has standard error of sqrt(p*(1-p)/n). With n=500, p=0.35, SE=2.1pp — so the 95% CI for weekly retention is ±4.1pp, meaning swings of 10pp are entirely random. 
FIX: Use monthly cohorts for stable retention signals (n > 5,000 per cohort). Use weekly cohorts only for directional, short-term monitoring with explicit uncertainty bands displayed on charts.

BUG 5: Defining "active" inconsistently across time periods in the cohort
SYMPTOM: Cohort retention chart shows a suspicious jump in M6 retention. Investigation reveals the analytics team changed the definition of "active" from "app open" to "core action completed" midway through the analysis period.
ROOT CAUSE: Retroactive changes to event tracking or active-user definition invalidate historical cohort comparisons. M6 using the new definition is not comparable to M1 using the old definition.
FIX: Treat event tracking changes as breaking changes. When definition changes, create a new cohort series starting from the change date. Maintain parallel tracking with both definitions for 3 months before fully deprecating the old definition.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A product has these monthly retention rates for the January cohort:
M0: 100%, M1: 45%, M2: 30%, M3: 22%, M4: 20%, M5: 19%, M6: 19%, M7: 20%, M8: 22%, M9: 21%, M10: 21%

What curve shape is this? What does it mean for the product? Should the team be worried about the M3 dip?

Answer: This is a smile curve. Retention drops through M3, flattens slightly, then ticks up in M7-M8. This suggests user resurrection — likely triggered by a new feature or seasonal event. The product also has a sticky core (~20%). This is actually a positive signal. The team should identify what caused the resurrection and build campaigns around it rather than "fixing" M3.

CHALLENGE 2 — FIX THE BUG:
This retention query produces incorrect results because it double-counts users:
\`\`\`sql
SELECT
  cohort_month,
  period,
  COUNT(user_id) / cohort_size AS retention  -- BUG: user_id not distinct!
FROM (
  SELECT u.cohort_month, e.period, e.user_id, cs.cohort_size
  FROM user_cohorts u
  JOIN events e ON u.user_id = e.user_id  -- BUG: no period alignment
  JOIN cohort_sizes cs ON u.cohort_month = cs.cohort_month
)
GROUP BY cohort_month, period, cohort_size
\`\`\`
Identify both bugs and rewrite correctly.

CHALLENGE 3 — BUILD FROM SCRATCH:
Write a JavaScript function buildRetentionTable(events, cohortGranularity) where events is an array of {userId, timestamp} objects.
The function should:
1. Group users into cohorts by first event (week or month based on cohortGranularity)
2. For each subsequent period, calculate what % of each cohort was active
3. Return a 2D array ready for rendering as a heatmap
4. Classify each cell as 'high' (>30%), 'medium' (15-30%), 'low' (5-15%), 'critical' (<5%)
5. Add a method to detect if the latest 3 cohorts show declining M3 retention (product quality signal)`,
    summary: `A retention curve that flattens above zero is the closest thing analytics has to proof of product-market fit — and cohort analysis is the only way to see it. Aggregate metrics hide what's really happening; only by tracking groups of users from their first day can you distinguish a thriving product from one that's frantically replacing the users it's losing.`
  },

  {
    id: 10,
    title: "Funnel Analysis & Attribution",
    tag: "WHERE USERS DROP AND WHY",
    color: "#D4801A",
    tldr: `Funnel analysis tracks users through sequential steps and quantifies where they drop off. Attribution analysis determines which marketing touchpoints deserve credit for conversions. Together they answer "where are we losing users?" and "which channels actually drive our best users?" — the two most commercially valuable analytical questions in product and growth.`,
    problem: `Arjun's e-commerce app has 100,000 daily visitors but only 1,800 orders. That's a 1.8% overall conversion rate. His manager says "improve conversion" — but where? Without funnel analysis, this is impossibly vague. The problem could be the product page (too slow), the cart page (confusing UX), the checkout (too many fields), or the payment page (too many failures).

Funnel analysis reveals: 60% reach product page → 40% add to cart → 28% start checkout → 12% reach payment → 8% complete payment. The biggest drop is at payment (33% drop in last step). The fix is targeted: improve payment success rate, not redesign the whole checkout.

Or: Shreya's growth team is allocating ₹50 lakhs monthly across Google Ads, Facebook, and influencers. Last-touch attribution shows Google drives 70% of conversions (users search for the product right before buying). So they cut Facebook budget. Conversions collapse. Why? Facebook was driving top-of-funnel awareness. Users discovered the product on Facebook, thought about it for a week, then searched on Google. Last-touch attribution gave Google 100% credit for what was actually Facebook's work.

Attribution is one of the most contested and commercially important problems in analytics. Getting it wrong misallocates marketing budgets by millions of rupees and causes growth teams to kill their best channels.`,
    analogy: `THE CRICKET MATCH ANALOGY for Funnel:

Imagine a cricket match as your conversion funnel:
1. Tickets sold (Awareness): 100,000 people hear about the match
2. People who actually travel to stadium (Acquisition): 60,000 
3. People who find their seats and stay (Activation): 45,000
4. People who watch the whole match (Engagement): 30,000
5. People who buy merchandise (Conversion): 3,000

Each step has a DROP-OFF RATE. The biggest drop (40%) happens at step 1→2 (awareness to actually showing up). This is where you focus resources, not on improving merchandise sales.

THE LEAKY BUCKET = The stadium itself. Even if you sell all 100,000 tickets, if people can't find the venue, the gates are confusing, or the seats are bad, they leave before the match. Fixing acquisition without fixing the leaky funnel is pouring water into a bucket with holes. You need to fix the holes FIRST.

MICRO vs MACRO CONVERSIONS:
MACRO = Buying merchandise (the ultimate goal)
MICRO = Finding seats, buying food, cheering a wicket (smaller actions that lead to the macro)

Track micro-conversions because they predict macro ones. If a user adds to cart (micro), they're 8x more likely to purchase (macro) than a user who only views the product.

THE ATTRIBUTION ANALOGY = A cricket team wins a match. Who gets credit?
FIRST-TOUCH = The opener who scored the first 50 runs (got the chase started) → over-credits awareness channels
LAST-TOUCH = The finisher who hit the last six (closed the chase) → over-credits bottom-of-funnel channels
LINEAR = Equal credit to all 11 players → probably fair but ignores actual impact
TIME DECAY = More credit to players who batted closer to the end → over-credits bottom-of-funnel
DATA-DRIVEN = Use match statistics to determine each player's actual contribution → most accurate but requires lots of data`,
    deep: `FUNNEL ANALYSIS — COMPLETE TECHNICAL GUIDE

WHY FUNNEL ANALYSIS IS THE HIGHEST-ROI ANALYTICS TASK:
Overall conversion rate (e.g., 1.8%) is actionable only when decomposed into steps.
A 1.8% overall conversion rate could mean:
- Scenario A: 90% reach checkout, 2% complete payment → fix payment
- Scenario B: 15% add to cart, 12% purchase → fix product-to-cart conversion
- Scenario C: 5% reach the product page (traffic problem), 36% purchase once there → fix discovery/SEO

The interventions are completely different. Without funnel analysis, you're optimizing blind.

SEQUENTIAL EVENT FUNNEL — THE TECHNICAL CHALLENGE:
The naive approach: COUNT users who triggered each event.
The problem: This counts ANY event, in ANY order, at ANY time. A user who happened to hit the payment page before viewing a product (via a deep link) inflates Step 4. A user who viewed a product in January and purchased in October inflates the overall conversion rate.

The correct approach: Sequential, time-windowed funnels.
Requirements:
1. Each step must occur AFTER the previous step (timestamp ordering)
2. All steps must occur within a defined TIME WINDOW (e.g., 7 days from first step)
3. Each user is counted AT MOST ONCE per funnel attempt (use their FIRST qualifying sequence)
4. Multiple funnel attempts per user within the window: usually count only the FIRST attempt (unless you're analyzing re-attempts separately)

FUNNEL METRICS GLOSSARY:
Step conversion rate = Users completing step N / Users who entered step N-1
Cumulative conversion rate = Users completing the last step / Users entering the first step
Drop-off rate = 1 - step conversion rate = % of users who failed to proceed
Absolute drop-off = Users who dropped at step N (how many people in absolute terms)
Median time between steps = How long the typical user takes to move from step A to B
P90 time between steps = The 90th percentile — your "slow path" users

The MOST IMPORTANT INSIGHT: A high drop-off at a LATE step is often more impactful to fix than a moderate drop-off at an early step, because those late-step users are already highly intent.

FUNNEL ANALYSIS vs FLOW ANALYSIS:
Funnel analysis: Predefined linear sequence of steps. Measures conversion through that specific path.
Flow analysis: How do users ACTUALLY navigate? What paths do they take that you didn't expect? Where do users go when they don't follow the funnel?

Both are necessary:
- Funnel: tells you how the designed conversion path is performing
- Flow: tells you what users are actually doing (maybe there's a shortcut path you didn't know about, or a detour that predicts churn)

LEAKY BUCKET — FULL QUANTIFICATION:
Monthly Revenue = New Users × Activation Rate × Conversion Rate × ARPU
If Monthly Churn consumes C% of MRR each month:
Steady state Revenue = New MRR × (1/Churn Rate) [geometric series]

Leaky bucket visualization:
New users in: 50,000/month
Activated: 40% = 20,000/month
D30 retention: 30% = 6,000 stay after month 1
M3 retention: 18% = 2,700 become "loyal" users

If 2,700 loyal users × 5% monthly churn = 135 loyal users churning per month
And you're adding 2,700 new loyal users per month
Net loyal user growth: 2,700 - 135 = 2,565/month → healthy growth

But if D30 retention drops to 10%:
1,000 loyal users per month × 5% churn = 50 churning
Net growth: 1,000 - 50 = 950/month → massive slowdown

This is the math behind "fix retention before scaling acquisition."
If your D30 retention is 10%, acquiring 3x more users gives you 3x the leak too.

MICRO vs MACRO CONVERSIONS — FULL FRAMEWORK:

Macro conversions (ultimate business goals):
- Subscription purchase
- First order placement
- Account opening / KYC completion
- Form submission / lead generation
- App installation

Micro conversions (behavioral leading indicators):
- Email address submission
- Product page view > 30 seconds
- Add to wishlist
- Start of checkout
- Calculator / tool usage
- Video play > 50% completion
- Push notification opt-in

Why micro conversions matter for analytics:
1. More data points: If only 2% make a purchase but 35% add to wishlist, you have 17.5x more data for optimization
2. Statistical power: Testing on micro conversions reaches significance faster
3. Predictive value: Users who add to wishlist are 8-12x more likely to purchase — tracking this predicts future macro conversions
4. Segmentation: Micro conversion behavior segments users by intent level

Funnel with micro conversions for an edtech app like Byju's:
Website visit → Content page view (MC1: 60%) → Free trial signup (MC2: 25% of visitors) → Complete first lesson (MC3: 40% of signups) → Complete 5 lessons (MC4: 30% of lesson completers) → View pricing page (MC5: 25%) → Purchase subscription (MACRO: 15% of pricing page viewers)

Overall conversion: visitor to subscriber = 0.60 × 0.25 × 0.40 × 0.30 × 0.25 × 0.15 = 0.068% 
But each micro conversion step is a separate opportunity for optimization.

ATTRIBUTION MODELS — THE FULL TECHNICAL PICTURE:

THE FUNDAMENTAL PROBLEM:
A typical converting customer's journey (from CRED or similar fintech):
Day 1: Sees YouTube ad (awareness)
Day 3: Clicks on Instagram story (consideration)
Day 8: Googles "best credit card bill pay app" and sees organic result (consideration)
Day 9: Sees retargeting display ad on news site
Day 10: Googles "CRED app download" and clicks paid search ad → downloads → converts

Which channel gets credit for the conversion?

1. FIRST-TOUCH ATTRIBUTION: 100% credit to YouTube ad
- Strength: Measures what introduced the brand
- Weakness: Everything else (especially the critical decision-making phase) gets zero credit
- Best for: Understanding brand awareness → purchase journey. Used by CMOs to justify brand spend.

2. LAST-TOUCH ATTRIBUTION: 100% credit to paid search
- Strength: Simple to implement (default in most analytics tools including GA4 before change)
- Weakness: Systematically over-credits bottom-funnel channels (SEM, retargeting)
- Best for: Optimizing direct response campaigns. Terrible for planning overall channel mix.

3. LINEAR: 20% credit to each of the 5 touchpoints
- Strength: No channel is ignored
- Weakness: Treats all touchpoints as equally valuable (YouTube ad on Day 1 ≠ last-click search)
- Best for: Situations where all touchpoints in the consideration cycle are similar in nature

4. TIME DECAY: Exponentially more credit closer to conversion
- Common half-life: 7 days
- Day 10 search ad: gets the most (e.g., 35%)
- Day 9 display: gets next most (25%)
- Day 8 organic: 20%
- Day 3 Instagram: 12%
- Day 1 YouTube: 8%
- Strength: Intuitive — the "closer" a touchpoint is to conversion, the more it "caused" it
- Weakness: Under-credits long-term brand building

5. U-SHAPED / POSITION-BASED: 40% first, 40% last, 20% across middle
- Rationale: First touchpoint (brand introduction) and last touchpoint (conversion catalyst) both deserve credit
- Strength: Best of both worlds for first and last
- Weakness: Middle touchpoints (nurturing) get under-credited

6. DATA-DRIVEN / ALGORITHMIC ATTRIBUTION:

MARKOV CHAIN APPROACH:
Build a graph of channel sequences: {YouTube → Instagram → Search → Purchase} 
For each channel, calculate: removal effect = how much does conversion rate drop if we remove this channel from all paths?
Removal effect = true incremental contribution of the channel.

Example: Remove YouTube from all paths → conversion rate drops from 5% to 3.8%
YouTube's contribution = (5% - 3.8%) / 5% = 24% of conversions
Run this for each channel and normalize to sum to 100%.

Requires: Minimum 1,000 converting paths per channel combination. Below this, estimates are noisy.

SHAPLEY VALUE APPROACH (from cooperative game theory):
Fairly distribute "credit" (conversion) among "players" (channels) by:
1. Enumerate all possible subsets of channels
2. For each subset: calculate conversion rate with and without each channel
3. Average the marginal contribution across all subsets
4. Shapley value for channel C = weighted average of marginal contributions across all possible coalitions

This is computationally expensive (2^k calculations for k channels) but produces the fairest attribution.
In practice: use the Shapley value for strategic channel budget decisions (quarterly), Markov chains for weekly operational optimization.

HOLDOUT TESTING (THE ONLY GROUND TRUTH):
All attribution models are correlational. The only way to measure true INCREMENTAL contribution is a randomized holdout:
1. Randomly assign 10-20% of your DMA (designated market area) or user segments to NOT receive a channel
2. Measure conversion rate difference between exposed and not-exposed groups
3. Difference = true incremental lift from that channel

Challenges: expensive to run, takes 4-8 weeks, only works for stoppable channels (can't "turn off" organic search), requires geographic separation to avoid contamination.

ATTRIBUTION WINDOWS:
The attribution window determines how far back you look for touchpoints.
Common windows: 1 day, 7 days, 28 days, 90 days
For products with short consideration cycles (food delivery): 7-day window
For products with long consideration cycles (mortgage, health insurance): 90-day window
For B2B SaaS with 6-month sales cycles: 180-day or longer

Using too short a window = under-counting upper-funnel channels
Using too long a window = including touchpoints that had nothing to do with this conversion

CROSS-DEVICE ATTRIBUTION:
The same user might see your Facebook ad on mobile, research on desktop, and convert on mobile again.
Without cross-device matching, these appear as 3 different users.
Methods:
- Deterministic: User logs in on both devices → same user ID (most accurate)
- Probabilistic: Same IP, similar browsing pattern, same time zone → likely same user (less accurate)
The gap between deterministic and probabilistic matching is often 20-40% of the user base.`,
    code: `// CONCEPT 10: Funnel Analysis & Attribution

// Example 1: Sequential funnel with strict time window — production-grade SQL
/*
-- BigQuery: Strict sequential funnel with multiple safety guarantees
-- Guarantees: (1) Sequential order, (2) Time window, (3) Each user counted once
WITH funnel_step_times AS (
  SELECT
    user_id,
    -- Get the FIRST time each user completed each funnel step
    MIN(CASE WHEN event_name = 'product_page_view'   THEN event_time END) AS s1_time,
    MIN(CASE WHEN event_name = 'add_to_cart'          THEN event_time END) AS s2_time,
    MIN(CASE WHEN event_name = 'checkout_started'     THEN event_time END) AS s3_time,
    MIN(CASE WHEN event_name = 'payment_info_entered' THEN event_time END) AS s4_time,
    MIN(CASE WHEN event_name = 'order_placed'         THEN event_time END) AS s5_time
  FROM events
  WHERE event_time >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    AND event_name IN ('product_page_view','add_to_cart','checkout_started','payment_info_entered','order_placed')
  GROUP BY user_id
),
sequential_validation AS (
  SELECT
    user_id,
    s1_time,
    -- Sequential: each step's time must be AFTER the previous
    -- Time window: all steps must occur within 24 hours of step 1
    CASE WHEN s2_time > s1_time AND TIMESTAMP_DIFF(s2_time, s1_time, HOUR) <= 24 THEN s2_time END AS s2_seq,
    CASE WHEN s3_time > s2_time AND TIMESTAMP_DIFF(s3_time, s1_time, HOUR) <= 24 THEN s3_time END AS s3_seq,
    CASE WHEN s4_time > s3_time AND TIMESTAMP_DIFF(s4_time, s1_time, HOUR) <= 24 THEN s4_time END AS s4_seq,
    CASE WHEN s5_time > s4_time AND TIMESTAMP_DIFF(s5_time, s1_time, HOUR) <= 24 THEN s5_time END AS s5_seq,
    -- Time between steps (user experience signals)
    TIMESTAMP_DIFF(s2_time, s1_time, MINUTE) AS min_s1_to_s2,
    TIMESTAMP_DIFF(s3_time, s2_time, MINUTE) AS min_s2_to_s3,
    TIMESTAMP_DIFF(s4_time, s3_time, MINUTE) AS min_s3_to_s4,
    TIMESTAMP_DIFF(s5_time, s4_time, MINUTE) AS min_s4_to_s5
  FROM funnel_step_times
  WHERE s1_time IS NOT NULL  -- must have entered the funnel
)
SELECT
  -- Step counts
  COUNT(*)                              AS s1_product_view,
  COUNT(s2_seq)                         AS s2_add_to_cart,
  COUNT(s3_seq)                         AS s3_checkout_start,
  COUNT(s4_seq)                         AS s4_payment_info,
  COUNT(s5_seq)                         AS s5_order_placed,
  -- Step conversion rates
  ROUND(COUNT(s2_seq) / COUNT(*) * 100, 1)             AS s1_to_s2_pct,
  ROUND(COUNT(s3_seq) / NULLIF(COUNT(s2_seq),0) * 100, 1) AS s2_to_s3_pct,
  ROUND(COUNT(s4_seq) / NULLIF(COUNT(s3_seq),0) * 100, 1) AS s3_to_s4_pct,
  ROUND(COUNT(s5_seq) / NULLIF(COUNT(s4_seq),0) * 100, 1) AS s4_to_s5_pct,
  -- Overall funnel conversion
  ROUND(COUNT(s5_seq) / COUNT(*) * 100, 2)             AS overall_cvr_pct,
  -- Time analysis (UX signals — high time = confusion or distraction)
  ROUND(APPROX_QUANTILES(min_s1_to_s2, 100)[OFFSET(50)], 0) AS median_min_to_add_cart,
  ROUND(APPROX_QUANTILES(min_s4_to_s5, 100)[OFFSET(50)], 0) AS median_min_to_payment,
  ROUND(APPROX_QUANTILES(min_s4_to_s5, 100)[OFFSET(90)], 0) AS p90_min_to_payment
FROM sequential_validation;
*/


// Example 2: Funnel segmentation — find where each device type breaks down
/*
-- Segment funnel by device type AND acquisition channel simultaneously
-- This 2D segmentation usually reveals the most actionable insight
SELECT
  device_type,
  acquisition_channel,
  COUNT(*) AS s1_users,
  ROUND(COUNT(s2_seq) / COUNT(*) * 100, 1) AS cart_add_pct,
  ROUND(COUNT(s3_seq) / NULLIF(COUNT(s2_seq),0) * 100, 1) AS checkout_start_pct,
  ROUND(COUNT(s4_seq) / NULLIF(COUNT(s3_seq),0) * 100, 1) AS payment_info_pct,
  ROUND(COUNT(s5_seq) / NULLIF(COUNT(s4_seq),0) * 100, 1) AS payment_complete_pct,
  ROUND(COUNT(s5_seq) / COUNT(*) * 100, 2) AS overall_cvr,
  -- Identify the "worst step" for this segment
  CASE
    WHEN COUNT(s2_seq)/NULLIF(COUNT(*),0) < 0.30 THEN 'Fix: Product → Cart (browse to intent)'
    WHEN COUNT(s3_seq)/NULLIF(COUNT(s2_seq),0) < 0.55 THEN 'Fix: Cart → Checkout (friction or trust)'
    WHEN COUNT(s4_seq)/NULLIF(COUNT(s3_seq),0) < 0.60 THEN 'Fix: Checkout → Payment (address/delivery friction)'
    WHEN COUNT(s5_seq)/NULLIF(COUNT(s4_seq),0) < 0.75 THEN 'Fix: Payment entry → Complete (payment failures)'
    ELSE 'Funnel looks healthy for this segment'
  END AS priority_fix
FROM sequential_validation sv
JOIN user_device_channel udc USING (user_id)
GROUP BY 1, 2
HAVING COUNT(*) >= 100  -- minimum for statistical reliability
ORDER BY overall_cvr DESC;
-- Common finding: mobile + paid_social has 40% lower overall CVR than desktop + organic
-- This tells you: mobile checkout UX needs work OR paid_social users have lower intent
*/


// Example 3: Attribution model comparison — full implementation with validation
function compareAttributionModels(userJourneys) {
  // userJourneys: [{userId, touchpoints: [{channel, time}], converted, conversionValue}]
  
  const models = { firstTouch: {}, lastTouch: {}, linear: {}, timeDecay: {}, uShaped: {} };
  let totalActualRevenue = 0;
  
  userJourneys.filter(j => j.converted).forEach(journey => {
    const touches = journey.touchpoints;
    const n = touches.length;
    const value = journey.conversionValue;
    totalActualRevenue += value;
    
    if (n === 0) return;
    
    // Helper to add credit
    const addCredit = (model, channel, amount) => {
      model[channel] = (model[channel] || 0) + amount;
    };
    
    // 1. FIRST TOUCH: all credit to first touchpoint
    addCredit(models.firstTouch, touches[0].channel, value);
    
    // 2. LAST TOUCH: all credit to last touchpoint
    addCredit(models.lastTouch, touches[n-1].channel, value);
    
    // 3. LINEAR: equal split across all touchpoints
    touches.forEach(t => addCredit(models.linear, t.channel, value / n));
    
    // 4. TIME DECAY: exponential decay from conversion, half-life = 7 days
    const conversionTime = new Date(touches[n-1].time).getTime();
    const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
    const rawWeights = touches.map(t => {
      const age = conversionTime - new Date(t.time).getTime();
      return Math.pow(0.5, age / halfLifeMs);
    });
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    touches.forEach((t, i) => addCredit(models.timeDecay, t.channel, value * rawWeights[i] / totalWeight));
    
    // 5. U-SHAPED: 40% first, 40% last, 20% split across middle
    if (n === 1) {
      addCredit(models.uShaped, touches[0].channel, value);
    } else if (n === 2) {
      addCredit(models.uShaped, touches[0].channel, value * 0.5);
      addCredit(models.uShaped, touches[1].channel, value * 0.5);
    } else {
      addCredit(models.uShaped, touches[0].channel, value * 0.40);
      addCredit(models.uShaped, touches[n-1].channel, value * 0.40);
      const midCredit = value * 0.20 / (n - 2);
      touches.slice(1, -1).forEach(t => addCredit(models.uShaped, t.channel, midCredit));
    }
  });
  
  // VALIDATION: Each model's total attributed revenue must equal actual revenue
  const validateModel = (model, modelName) => {
    const totalAttributed = Object.values(model).reduce((a, b) => a + b, 0);
    const error = Math.abs(totalAttributed - totalActualRevenue) / totalActualRevenue;
    if (error > 0.001) {
      console.warn(\`Attribution model \${modelName} has \${(error*100).toFixed(2)}% attribution error — check logic\`);
    }
    return totalAttributed;
  };
  
  Object.entries(models).forEach(([name, model]) => validateModel(model, name));
  
  // Format results for comparison
  const allChannels = [...new Set(userJourneys.flatMap(j => j.touchpoints.map(t => t.channel)))];
  return {
    totalActualRevenue: \`₹\${totalActualRevenue.toLocaleString('en-IN')}\`,
    channelComparison: allChannels.map(channel => ({
      channel,
      firstTouch: \`₹\${(models.firstTouch[channel]||0).toFixed(0)}\`,
      lastTouch: \`₹\${(models.lastTouch[channel]||0).toFixed(0)}\`,
      linear: \`₹\${(models.linear[channel]||0).toFixed(0)}\`,
      timeDecay: \`₹\${(models.timeDecay[channel]||0).toFixed(0)}\`,
      uShaped: \`₹\${(models.uShaped[channel]||0).toFixed(0)}\`,
      // The gap between first-touch and last-touch reveals "assist" value
      assistValue: \`₹\${((models.firstTouch[channel]||0) - (models.lastTouch[channel]||0)).toFixed(0)}\`,
      insight: (models.firstTouch[channel]||0) > (models.lastTouch[channel]||0) * 1.5
        ? 'TOP-FUNNEL DRIVER: Gets first-touch credit but loses out in last-touch'
        : (models.lastTouch[channel]||0) > (models.firstTouch[channel]||0) * 1.5
          ? 'CLOSER: Rarely introduces users but often seals the deal'
          : 'BALANCED: Contributes across the funnel'
    }))
  };
}


// Example 4: Drop-off analysis with opportunity sizing and prioritization
function analyzeFunnelDropoff(funnelData, aovInr = 1200, dailyTraffic = null) {
  // funnelData: [{step: 'Product View', users: 100000}, ...]
  const overallCVR = funnelData[funnelData.length - 1].users / funnelData[0].users;
  
  return funnelData.map((step, i) => {
    if (i === 0) return {
      step: step.step,
      users: step.users.toLocaleString('en-IN'),
      dropoffRate: 'N/A (entry point)',
      dropoffUsers: 0,
      priority: 'ENTRY',
      opportunityRevenue: 'N/A'
    };
    
    const prev = funnelData[i - 1];
    const dropoffRate = ((prev.users - step.users) / prev.users) * 100;
    const dropoffUsers = prev.users - step.users;
    
    // Priority based on BOTH absolute volume AND drop-off rate
    const priority = dropoffRate > 50 ? 'CRITICAL'
                   : dropoffRate > 35 ? 'HIGH'
                   : dropoffRate > 20 ? 'MEDIUM'
                   : 'LOW';
    
    // Revenue opportunity: if we improve this step's CVR by 10pp, how much revenue gained?
    // A user who drops at step N-1 but would have converted: value = their probability of reaching end * AOV
    const opportunityUsers = Math.round(dropoffUsers * 0.1);  // 10% recovery
    const opportunityRevenue = opportunityUsers * overallCVR * aovInr;
    
    // Daily revenue opportunity (if daily traffic provided)
    const dailyOpportunity = dailyTraffic 
      ? \`₹\${((dailyTraffic / funnelData[0].users) * opportunityRevenue).toLocaleString('en-IN')}/day potential\`
      : null;
    
    // Diagnosis based on step name and drop-off rate
    const diagnoses = {
      'add_to_cart': dropoffRate > 60 ? 'DIAGNOSIS: Product-price mismatch, trust issues, or UX friction showing product info' : '',
      'checkout_start': dropoffRate > 45 ? 'DIAGNOSIS: Cart abandonment — re-engagement email could recover 15-20% of dropoffs' : '',
      'payment_info': dropoffRate > 40 ? 'DIAGNOSIS: Payment form friction — reduce fields, add saved addresses, offer more payment methods' : '',
      'order_placed': dropoffRate > 30 ? 'DIAGNOSIS: Payment failures — check success rate by payment method, add retry logic' : ''
    };
    
    const stepKey = step.step.toLowerCase().replace(/\s+/g, '_');
    
    return {
      step: step.step,
      users: step.users.toLocaleString('en-IN'),
      dropoffRate: dropoffRate.toFixed(1) + '%',
      dropoffUsers: dropoffUsers.toLocaleString('en-IN'),
      priority,
      opportunityRevenue: \`₹\${opportunityRevenue.toLocaleString('en-IN')} (10% recovery scenario)\`,
      dailyOpportunity,
      diagnosis: diagnoses[stepKey] || ''
    };
  });
}

// Arjun's Meesho-like e-commerce funnel with ₹850 AOV
const funnel = [
  { step: 'Product Page', users: 100000 },
  { step: 'Add to Cart', users: 42000 },
  { step: 'Checkout Start', users: 28000 },
  { step: 'Payment Page', users: 12000 },
  { step: 'Order Placed', users: 8000 }
];
const dropoffReport = analyzeFunnelDropoff(funnel, 850, 100000);
// Product→Cart: 58% drop → HIGH priority → 10% recovery = ₹19,720 additional revenue
// Payment→Order: 33% drop → HIGH priority → DIAGNOSIS: payment failures


// Example 5: Multi-touch attribution SQL — building the journey table
/*
-- Step 1: Build ordered touchpoint sequences for converting users
WITH conversion_events AS (
  SELECT
    user_id,
    MIN(event_time) AS conversion_time,
    SUM(order_value_inr) AS total_conversion_value
  FROM order_events
  WHERE event_name = 'order_placed'
    AND event_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY user_id
),
touchpoint_history AS (
  SELECT
    s.user_id,
    s.session_start_time,
    s.utm_source AS channel,
    s.utm_medium,
    ce.conversion_time,
    ce.total_conversion_value,
    -- Rank touchpoints chronologically
    ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.session_start_time) AS touch_rank,
    COUNT(*) OVER (PARTITION BY s.user_id) AS total_touches
  FROM sessions s
  JOIN conversion_events ce USING (user_id)
  WHERE s.session_start_time <= ce.conversion_time  -- only pre-conversion touches
    AND s.session_start_time >= TIMESTAMP_SUB(ce.conversion_time, INTERVAL 30 DAY)  -- 30-day window
    AND s.utm_source IS NOT NULL  -- only attributed sessions
)
SELECT
  user_id,
  conversion_time,
  total_conversion_value,
  total_touches,
  channel,
  touch_rank,
  -- Attribution weights per model — computed in SQL for efficiency
  CASE total_touches
    WHEN 1 THEN total_conversion_value  -- single touch: full credit
    ELSE
      CASE
        WHEN touch_rank = 1 THEN total_conversion_value * 0.40  -- U-shaped: 40% first
        WHEN touch_rank = total_touches THEN total_conversion_value * 0.40  -- 40% last
        ELSE total_conversion_value * 0.20 / (total_touches - 2)  -- 20% middle
      END
  END AS u_shaped_credit,
  -- Time decay credit
  ROUND(
    EXP(-0.1 * DATE_DIFF(conversion_time, session_start_time, DAY)) /
    SUM(EXP(-0.1 * DATE_DIFF(conversion_time, session_start_time, DAY))) OVER (PARTITION BY user_id)
    * total_conversion_value, 2
  ) AS time_decay_credit
FROM touchpoint_history
ORDER BY user_id, touch_rank;
*/


// Example 6: Funnel re-engagement — identifying cart abandoners for campaigns
/*
-- Find users who dropped at checkout (high-intent abandoners) for retargeting
SELECT
  sv.user_id,
  MIN(sv.s1_time) AS funnel_entry_time,
  MAX(COALESCE(sv.s3_seq, sv.s2_seq, sv.s1_time)) AS last_completed_step,
  CASE
    WHEN sv.s2_seq IS NOT NULL AND sv.s3_seq IS NULL THEN 'cart_abandoner'        -- added to cart, never checked out
    WHEN sv.s3_seq IS NOT NULL AND sv.s4_seq IS NULL THEN 'checkout_abandoner'    -- started checkout, no payment
    WHEN sv.s4_seq IS NOT NULL AND sv.s5_seq IS NULL THEN 'payment_abandoner'     -- entered payment, never completed
    ELSE 'completed'
  END AS abandonment_type,
  -- What products did they abandon?
  STRING_AGG(DISTINCT ca.product_name, ', ') AS abandoned_products,
  SUM(ca.product_price_inr) AS cart_value_inr
FROM sequential_validation sv
LEFT JOIN cart_items ca ON sv.user_id = ca.user_id
  AND ca.added_at BETWEEN sv.s1_time AND COALESCE(sv.s5_seq, TIMESTAMP_ADD(sv.s1_time, INTERVAL 24 HOUR))
WHERE sv.s2_seq IS NOT NULL  -- must have added to cart
  AND sv.s5_seq IS NULL        -- must NOT have completed purchase
  AND sv.s1_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)  -- recent abandoners
GROUP BY sv.user_id, sv.s2_seq, sv.s3_seq, sv.s4_seq, sv.s5_seq
HAVING cart_value_inr > 300  -- only retarget meaningful cart values
ORDER BY cart_value_inr DESC;
-- This query feeds your cart abandonment email/push campaign
-- Expected recovery rate: 5-15% of abandoners → significant revenue impact
*/`,
    bugs: `BUG 1: Not enforcing sequential order in funnel SQL (non-ordered funnel)
SYMPTOM: Checkout funnel shows 35% overall conversion but it includes users who "checked out" before ever "viewing a product" (bot traffic, direct links, app deep-links). The funnel inflates conversion by counting non-sequential journeys.
ROOT CAUSE: SQL joins events without enforcing temporal order. A user who hits the payment page directly (no product view) gets counted at all steps by a naive join.
FIX: Use window functions to rank events by time per user. Only count a user in step N if they have a qualifying event for step N-1 at an EARLIER timestamp. In SQL: filter with WHERE step2_time > step1_time. Use QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time) to get first occurrence of each step.

BUG 2: Attributing ALL revenue to last-touch channel, killing top-of-funnel spend
SYMPTOM: Attribution dashboard shows Google Search drives 68% of conversions (last touch). Leadership cuts Instagram and YouTube budget by 80%. Three months later, Google Search volume drops 45% as brand awareness fades. Revenue drops 30%.
ROOT CAUSE: Last-touch attribution can't see that Instagram was building the brand intent that led users to search on Google. The funnel often looks like: Instagram Ad → YouTube Ad → Google Search → Purchase. Last touch credits Google entirely.
FIX: Run a holdout test. Pause Instagram in 5 test cities for 4 weeks. Measure if Google Search volume (and conversions) drops in test cities vs control. The drop = Instagram's true contribution. Use this to build a more accurate attribution model. Supplement with data-driven attribution (Markov chains) using the full journey data.

BUG 3: Ignoring the time window in funnel analysis
SYMPTOM: Overall conversion rate is reported as 8.5%. Finance team uses this to forecast revenue. Actual revenue is 60% lower than forecast.
ROOT CAUSE: The funnel SQL joins all historical events without a time window. A user who viewed a product in January and placed an order in October is counted as a conversion in the funnel. In reality, these are completely different sessions. The "funnel" is measuring lifetime behavior, not a conversion window.
FIX: Enforce a session-level or time-window-level funnel. All funnel steps must occur within a defined window (e.g., 24 hours for e-commerce, 30 days for SaaS signup). Users who hit step 1 and step 5 with a 9-month gap are not in the same funnel attempt.

BUG 4: Reporting conversion rate without segmenting new vs returning users
SYMPTOM: Team "improves" conversion rate from 4.2% to 5.1%. Celebrated as a win. But new user conversion actually dropped from 2.1% to 1.8%. The overall improvement came entirely from increased returning user traffic during a sale event.
ROOT CAUSE: Blended conversion rate mixes new users (low trust, high friction) with returning users (high trust, low friction, often repeat purchases). A sale drives returning user surge → blended CVR improves → masks new user experience degradation.
FIX: Always segment conversion rates by user type (new vs returning), acquisition channel, and cohort. Report these separately. A meaningful improvement in new user conversion is much more valuable and harder to achieve than a returning user bump.

BUG 5: Double-counting conversions in multi-touch attribution
SYMPTOM: Total attributed revenue from attribution model = ₹2.4 Crores, but actual revenue = ₹80 Lakhs. Attribution model shows 3x the actual revenue.
ROOT CAUSE: Each conversion is being distributed across all touchpoints but the SUM of all credited revenue equals actual conversions × touchpoints per journey instead of actual conversions × conversion value. The analyst summed the full conversion value per touchpoint instead of the distributed portion.
FIX: In attribution, the SUM of all credits across all channels for a single conversion should equal exactly 1 conversion (or 1x the conversion value). Validate: total attributed conversions across all channels = total actual conversions. If not equal, there's a bug in the credit distribution logic.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A funnel has these absolute user counts: 
Step 1 (Visit): 50,000 | Step 2 (Sign Up): 12,000 | Step 3 (Activate): 7,200 | Step 4 (Subscribe): 1,080

Calculate: (a) Each step's conversion rate, (b) The biggest absolute drop-off step, (c) The biggest % drop-off step, (d) Overall funnel conversion rate.

Answer: (a) S1→S2: 24%, S2→S3: 60%, S3→S4: 15% (b) Biggest absolute drop: S1→S2 (38,000 users lost) (c) Biggest % drop: S3→S4 (85% drop-off) (d) Overall: 1,080/50,000 = 2.16%. Priority: fix S3→S4 (subscription conversion) — it's the biggest % bottleneck despite coming late in funnel.

CHALLENGE 2 — FIX THE BUG:
This attribution code credits the wrong amount:
\`\`\`javascript
function linearAttribution(journey) {
  const value = journey.conversionValue;
  journey.touchpoints.forEach(touch => {
    // BUG: gives full value to each touchpoint instead of split
    channelCredits[touch.channel] += value; // Should be: value / journey.touchpoints.length
  });
}
// After running on 1000 journeys with avg 3 touchpoints:
// Total credited revenue = 3x actual revenue!
\`\`\`
Fix the bug. Then add a validation that asserts total_attributed_revenue === total_actual_revenue.

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a complete funnelAnalyzer(events, funnelDefinition) function where:
- events: array of {userId, eventName, timestamp, channel, deviceType}
- funnelDefinition: {steps: ['product_view','add_to_cart','checkout','purchase'], windowDays: 7}

The function should:
1. Build sequential funnels per user respecting the time window
2. Return step-by-step conversion rates
3. Segment conversion rates by deviceType
4. Return the median time between each step
5. Flag the step with highest drop-off (the "biggest leak") as the priority fix
6. Return simple first-touch and last-touch attribution for converting users`,
    summary: `Funnel analysis tells you WHERE your product is broken; attribution tells you WHICH marketing channels deserve your budget. Both require careful SQL engineering to enforce sequential ordering and time windows — and both require skepticism, because last-touch attribution systematically under-values awareness channels, and aggregate funnels systematically hide the segment-level problems that are actually fixable.`
  }
];

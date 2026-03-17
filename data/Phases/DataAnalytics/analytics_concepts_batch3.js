const concepts = [
  {
    id: 11,
    title: "Time Series Analysis & Forecasting",
    tag: "READING THE RHYTHM OF YOUR DATA",
    color: "#C77DFF",
    tldr: `Time series data has four components layered on top of each other: trend, seasonality, cycles, and noise. Separating these components is what makes forecasting possible and anomaly detection meaningful. Without decomposition, you can't tell if today's revenue drop is a real problem, a seasonal dip, or just random noise.`,
    problem: `Priya's growth dashboard shows DAU dropped 15% this week. She escalates to the CEO. Engineers spend two days investigating. Root cause: it's Diwali week — the app serves corporate users who are on holiday. The "drop" happens every year at the exact same time. Nobody looked at the year-over-year comparison.

Or: Rohit's team builds an alert that fires when weekly revenue drops more than 10% week-over-week. It fires every January (post-holiday slowdown), every summer (B2B clients on vacation), and every time there's a long weekend. The team spends 30% of their time investigating seasonal noise. Nobody has adjusted for seasonality.

Or: An analyst presents a "trend line" on monthly revenue that shows strong growth. But monthly revenue has massive seasonal swings — peaks in November (Diwali sales), troughs in February. The trend line is being pulled by seasonal spikes, not genuine growth. The real underlying trend is actually flat.

Or: The data team builds a 3-month revenue forecast using a simple moving average. The forecast completely misses the Diwali peak because moving averages are blind to seasonal patterns. The business overstocks inventory in October based on the forecast and runs out in November.

Or: An engineer monitors API response times with a 7-day SMA alert. The alert completely misses a slow degradation trend because the 7-day average smooths out the gradual rise over weeks. By the time the SMA crosses the threshold, the system is already critically slow.

Understanding time series means being able to answer: Is this change a trend, a cycle, a seasonal effect, or just noise? Which are you responsible for fixing, and which should you just explain?`,
    analogy: `THE MUMBAI LOCAL TRAIN ANALOGY for time series decomposition:

Imagine you're counting how many passengers board at Dadar station per hour, every hour, for 3 years. Your raw data is a jagged, complex line. But it's actually made of 4 overlapping patterns stacked on top of each other:

TREND = The overall direction over years. Is the network getting more popular? Maybe ridership grows 3% per year as the city grows. If you squint past all the noise and zoom out, the line is slowly going up. This is the trend component.

SEASONALITY = The predictable, repeating pattern within a fixed period. Daily: rush hours at 8-10am and 6-8pm. Weekly: fewer passengers on Sunday. Annual: lower ridership in May-June (school holidays), spikes during festival days. Seasonality is REGULAR and PREDICTABLE — it happens at the same time every cycle.

CYCLICALITY = Longer, irregular economic waves. During an economic boom (2015-2018), more people commute for work. During recession or COVID, ridership drops. Cycles are multi-year patterns that don't have a fixed, predictable period — unlike seasonality. Very hard to model; most business analytics ignores this and focuses on trend + seasonality.

NOISE (Residual) = The unexplained random variation after you've extracted trend, seasonality, and cycles. A random strike, an unusual cricket match, a bridge closure. Noise is what's left over. If your noise is large relative to signal, your forecasts will be unreliable.

The decomposition formula:
Additive model: Y = Trend + Seasonality + Cycle + Noise  [use when seasonal swings are roughly constant in size]
Multiplicative model: Y = Trend × Seasonality × Cycle × Noise  [use when seasonal swings grow WITH the trend — common in revenue data]

SMA vs EMA — THE SMOOTHING DIAL:
SIMPLE MOVING AVERAGE (SMA) = Take the average of the last N values. Like a sliding window. Each data point in the window gets equal weight. Good for removing noise. Slow to react to trend changes.

EXPONENTIAL MOVING AVERAGE (EMA) = Give more weight to recent data, exponentially less weight to older data. The smoothing factor α (alpha, between 0 and 1) controls how quickly it forgets. High α (0.9): reacts fast, captures trends, more noisy. Low α (0.1): very smooth, reacts slowly, lags behind.

Think of SMA as asking 10 people their opinion equally. EMA is asking the same 10 people but trusting the most recent one 50%, the next one 25%, the next 12.5%, and so on.`,
    deep: `TIME SERIES DECOMPOSITION — TECHNICAL DEEP DIVE

ADDITIVE vs MULTIPLICATIVE DECOMPOSITION:
Additive: Y_t = T_t + S_t + C_t + ε_t
Use when seasonal amplitude is roughly CONSTANT regardless of trend level.
Example: A retail store sells 1000 extra units every December regardless of overall sales level.
Diagnostic: Plot the raw series. If the seasonal swings look the same height throughout, use additive.

Multiplicative: Y_t = T_t × S_t × C_t × ε_t
Use when seasonal amplitude GROWS with the trend (proportional).
Example: A startup's December spike is always "30% above average," not always "+₹10L."
As the business grows, the absolute December spike grows too.
Diagnostic: If seasonal swings get wider as the trend rises, use multiplicative.

To apply multiplicative decomposition:
Take log(Y_t) → converts multiplicative to additive: log(Y) = log(T) + log(S) + log(C) + log(ε)
Do additive decomposition on log-transformed data, then exponentiate back.

CLASSICAL DECOMPOSITION STEPS:
1. Estimate trend (T): Apply a centered moving average of length = seasonal period.
   For monthly data with annual seasonality (period=12): use 12-month centered MA.
   Centered MA: average of observations at t-6 through t+6 (requires future data — hence "centered").
   This is why classical decomposition can't produce trend estimates at the edges of the series.

2. Detrend: Remove trend from original series.
   Additive: detrended_t = Y_t - T_t
   Multiplicative: detrended_t = Y_t / T_t

3. Estimate seasonal component (S): For each season (e.g., each month), average the detrended values across all years.
   January seasonal index = mean of all detrended January values
   Normalize: ensure seasonal indices sum to 0 (additive) or average to 1 (multiplicative).

4. Calculate residuals: ε_t = Y_t - T_t - S_t (additive)

STL DECOMPOSITION (Seasonal-Trend decomposition using LOESS):
More robust than classical decomposition.
Uses LOESS (locally weighted regression) to estimate trend — handles non-linear trends.
Handles missing values and outliers better than classical.
Allows seasonal component to evolve over time (the seasonal pattern can change year to year).
Industry standard for serious time series analysis in Python: seasonal_decompose() vs STL() from statsmodels.

YoY vs MoM — WHEN TO USE EACH:
Year-over-Year (YoY): This month vs same month last year.
USE YoY when: seasonality is significant, you want to see real growth removing seasonal effect.
LIMITATION: YoY is blind to what happened in the LAST 11 months. A huge spike in July won't show in YoY until next July.
YoY formula: (this_month - same_month_last_year) / same_month_last_year × 100%

Month-over-Month (MoM): This month vs last month.
USE MoM when: tracking short-term momentum, business is not seasonal, or you've already seasonally adjusted.
LIMITATION: Massive seasonality will dominate MoM signal. February → March jump always looks big because of calendar effects.

BEST PRACTICE: Report BOTH.
Headline: "Revenue grew 18% YoY — strong underlying growth"
Context: "MoM growth of +3% is consistent with seasonal pattern (April is historically +2-4% vs March)"
Anomaly: "However, MoM of +3% is below our typical +5-8% for this month — worth investigating"

SEASONALITY ADJUSTMENT (SEASONAL DECOMPOSITION):
A seasonally adjusted series = original series with seasonal component removed.
Seasonally adjusted Y_t = Y_t - S_t (additive) or Y_t / S_t (multiplicative)
This is what government statistics agencies do to unemployment data, GDP, etc.
Benefit: MoM comparisons on seasonally adjusted data are meaningful.

Seasonal index example for a delivery app:
Month: J  F  M  A  M  J  J  A  S  O  N  D
Index: 0.85 0.80 0.95 0.98 1.02 0.95 0.90 0.92 1.05 1.15 1.35 1.20
(Values > 1 = above average month; values < 1 = below average month)
November is 35% above average; February is 20% below average.
To adjust February revenue ₹85L: ₹85L / 0.80 = ₹106.25L (what it WOULD have been in a normal month)

FORECASTING METHODS — CONCEPTUAL:

1. NAIVE FORECAST: Next value = last value. Or next period = same period last year.
   Best for: baseline comparison, highly stable metrics.
   "Naive YoY": forecast(Nov 2025) = actual(Nov 2024) × (1 + recent_growth_rate)
   
2. SIMPLE MOVING AVERAGE (SMA):
   SMA_n = (Y_t + Y_{t-1} + ... + Y_{t-n+1}) / n
   Forecast: next period = SMA of last N periods.
   Best for: removing short-term noise. Useless for trending data (always lags behind).

3. EXPONENTIAL SMOOTHING (EWM / Holt-Winters):
   Simple exponential smoothing: F_{t+1} = α × Y_t + (1-α) × F_t
   α = smoothing factor (0 to 1). High α = more reactive. Low α = more smooth.
   Holt's linear: adds a trend component. Double exponential smoothing.
   Holt-Winters: adds seasonality. Triple exponential smoothing.
   Formula for Holt-Winters additive:
     Level: L_t = α(Y_t - S_{t-m}) + (1-α)(L_{t-1} + B_{t-1})
     Trend: B_t = β(L_t - L_{t-1}) + (1-β)B_{t-1}
     Season: S_t = γ(Y_t - L_t) + (1-γ)S_{t-m}
     Forecast: F_{t+h} = L_t + h×B_t + S_{t-m+h}
   Best for: data with trend and seasonality. Most used model in business forecasting.

4. ARIMA (AutoRegressive Integrated Moving Average):
   AR(p): Autoregressive — current value depends on past p values. Captures momentum.
   I(d): Integrated — differencing d times makes the series stationary (removes trend).
   MA(q): Moving average — current value depends on past q forecast errors.
   ARIMA(1,1,1): use 1 lag of the series, difference once, use 1 lag of error.
   Stationarity requirement: ARIMA needs the series to have constant mean/variance.
   Use Augmented Dickey-Fuller test to check stationarity.
   For seasonal data: SARIMA(p,d,q)(P,D,Q)m adds seasonal AR, I, MA terms.
   Best for: complex time series with autocorrelation structure. Requires statistical expertise to tune.

5. PROPHET (Facebook/Meta's model):
   Additive model: Y(t) = trend(t) + seasonality(t) + holidays(t) + noise
   Trend: piecewise linear or logistic growth with automatic changepoint detection.
   Seasonality: Fourier series representation (handles multiple seasonal periods).
   Handles missing data, outliers, and holiday effects out-of-the-box.
   Best for: business time series with strong seasonality and holidays. Analyst-friendly.

ANOMALY DETECTION IN TIME SERIES:
Method 1: Statistical bounds on residuals after decomposition.
After decomposing Y = T + S + ε, monitor residuals (ε).
Alert when |ε_t| > 3 × std(residuals) [3-sigma rule].

Method 2: Prediction interval.
Build a forecast. Alert when actuals fall outside the 95% or 99% prediction interval.

Method 3: Robust anomaly detection (IQR method):
IQR = Q75 - Q25 of residuals.
Anomaly if: residual < Q25 - 1.5×IQR (low outlier) or > Q75 + 1.5×IQR (high outlier)
More resistant to extreme values than std-based methods.

Method 4: Change point detection (PELT, BOCPD).
Detects structural breaks — when the LEVEL of a metric permanently shifts.
Useful for detecting: product changes that altered user behavior, data pipeline breaks, external market shifts.

DATE SPINE in SQL — THE FOUNDATION:
A date spine is a table with one row per date (or per date+dimension combination).
Without a date spine, dates with zero activity simply don't appear in your query results.
This makes trend charts with gaps, averages that exclude zero-days (always too high), and missing data look like present data.

Building a date spine:
In BigQuery: GENERATE_DATE_ARRAY(start_date, end_date, INTERVAL 1 DAY)
In Snowflake: DATEADD(day, seq4(), '2024-01-01') via GENERATOR
In PostgreSQL: generate_series('2024-01-01'::date, '2024-12-31'::date, '1 day'::interval)
Always LEFT JOIN your event data TO the spine — not the other way around.`,
    code: `// CONCEPT 11: Time Series Analysis & Forecasting

// Example 1: Simple Moving Average vs Exponential Moving Average
function computeSMAandEMA(data, smaPeriod = 7, emaAlpha = 0.3) {
  // data: array of {date, value} sorted by date ascending
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    // SMA: simple average of last N values (equal weights)
    let sma = null;
    if (i >= smaPeriod - 1) {
      const window = data.slice(i - smaPeriod + 1, i + 1);
      sma = window.reduce((sum, d) => sum + d.value, 0) / smaPeriod;
    }
    
    // EMA: exponentially weighted — recent values count more
    // EMA_t = alpha * value_t + (1 - alpha) * EMA_{t-1}
    let ema = null;
    if (i === 0) {
      ema = data[0].value;  // seed with first value
    } else {
      ema = emaAlpha * data[i].value + (1 - emaAlpha) * result[i - 1].ema;
    }
    
    result.push({
      date: data[i].date,
      value: data[i].value,
      sma7: sma ? Math.round(sma) : null,
      ema: Math.round(ema),
      // EMA reacts faster to trend changes — SMA lags behind
    });
  }
  
  return result;
}

// Daily revenue data for a Zepto-like delivery app (₹ in thousands)
const dailyRevenue = [
  { date: '2025-01-01', value: 4200 },
  { date: '2025-01-02', value: 3800 },  // lower on holidays
  { date: '2025-01-03', value: 5100 },
  { date: '2025-01-04', value: 5400 },
  { date: '2025-01-05', value: 5200 },
  { date: '2025-01-06', value: 5600 },
  { date: '2025-01-07', value: 4900 },  // Sunday drop
  { date: '2025-01-08', value: 5300 },
];
// At index 6 (Jan 7): SMA7 = avg(all 7 days) — smoothed
// EMA reacts more to the Sunday drop than SMA does


// Example 2: YoY vs MoM calculation with seasonality context
function calculateGrowthRates(monthlyData) {
  // monthlyData: [{year, month, revenue}, ...] sorted chronologically
  
  return monthlyData.map((curr, idx) => {
    // MoM: compare to previous month
    const prevMonth = monthlyData[idx - 1];
    const mom = prevMonth
      ? ((curr.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1) + '%'
      : null;
    
    // YoY: compare to same month last year
    const sameMonthLastYear = monthlyData.find(
      d => d.year === curr.year - 1 && d.month === curr.month
    );
    const yoy = sameMonthLastYear
      ? ((curr.revenue - sameMonthLastYear.revenue) / sameMonthLastYear.revenue * 100).toFixed(1) + '%'
      : null;
    
    // Seasonal context: is MoM movement expected?
    // Use the previous year's MoM as a seasonal benchmark
    const prevMonthLastYear = monthlyData.find(
      d => d.year === curr.year - 1 && d.month === (curr.month === 1 ? 12 : curr.month - 1)
    );
    const lastYearMom = (prevMonthLastYear && sameMonthLastYear)
      ? ((sameMonthLastYear.revenue - prevMonthLastYear.revenue) / prevMonthLastYear.revenue * 100).toFixed(1) + '%'
      : null;
    
    return {
      period: \`\${curr.year}-\${String(curr.month).padStart(2,'0')}\`,
      revenue: \`₹\${curr.revenue.toLocaleString('en-IN')}K\`,
      momGrowth: mom,
      yoyGrowth: yoy,
      lastYearMomBenchmark: lastYearMom,
      // If MoM << lastYearMom at the same month, that's a real signal
      signal: mom && lastYearMom
        ? (parseFloat(mom) < parseFloat(lastYearMom) - 5
          ? '⚠️ Below seasonal benchmark'
          : '✅ Within seasonal norm')
        : 'Insufficient data'
    };
  });
}


// Example 3: Date spine SQL — never miss a zero-activity day
/*
-- BigQuery: Generate a complete date spine and LEFT JOIN event data
-- Without this, days with zero orders are simply missing from your results
WITH date_spine AS (
  SELECT
    date_day
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY),  -- start: 90 days ago
      CURRENT_DATE(),                               -- end: today
      INTERVAL 1 DAY
    )
  ) AS date_day
),
daily_orders AS (
  SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(order_value_inr) AS total_revenue_inr,
    COUNT(DISTINCT user_id) AS unique_customers
  FROM orders
  WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND status = 'delivered'
  GROUP BY 1
)
SELECT
  ds.date_day,
  EXTRACT(DAYOFWEEK FROM ds.date_day) AS day_of_week,  -- 1=Sunday, 7=Saturday
  COALESCE(do.order_count, 0) AS order_count,           -- 0 for missing days, not NULL!
  COALESCE(do.total_revenue_inr, 0) AS total_revenue_inr,
  COALESCE(do.unique_customers, 0) AS unique_customers,
  -- 7-day SMA directly in SQL using window function
  ROUND(AVG(COALESCE(do.order_count, 0)) OVER (
    ORDER BY ds.date_day
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 1) AS sma_7day_orders,
  -- Flag weekends for context
  CASE WHEN EXTRACT(DAYOFWEEK FROM ds.date_day) IN (1, 7) THEN TRUE ELSE FALSE END AS is_weekend
FROM date_spine ds
LEFT JOIN daily_orders do ON ds.date_day = do.order_date
ORDER BY ds.date_day;
-- Critical: The LEFT JOIN ensures zero-order days appear as 0, not as gaps
-- SMA_7 will now correctly include zero-order days in the average
*/


// Example 4: Seasonal decomposition and anomaly detection
function decomposeAndDetectAnomalies(monthlyData, seasonPeriod = 12) {
  // monthlyData: array of numeric values, length should be >= 2 * seasonPeriod
  const n = monthlyData.length;
  
  // Step 1: Estimate trend using centered moving average
  const halfWindow = Math.floor(seasonPeriod / 2);
  const trend = monthlyData.map((_, i) => {
    if (i < halfWindow || i >= n - halfWindow) return null;
    const window = monthlyData.slice(i - halfWindow, i + halfWindow + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
  
  // Step 2: Detrend (multiplicative: ratio of actual to trend)
  const detrended = monthlyData.map((y, i) => trend[i] ? y / trend[i] : null);
  
  // Step 3: Seasonal indices — average detrended value for each season position
  const seasonalIndices = Array(seasonPeriod).fill(null).map((_, s) => {
    const seasonValues = detrended
      .filter((v, i) => v !== null && i % seasonPeriod === s);
    return seasonValues.length > 0
      ? seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length
      : 1;
  });
  
  // Normalize: seasonal indices should average to 1.0 (multiplicative)
  const avgIndex = seasonalIndices.reduce((a, b) => a + b, 0) / seasonPeriod;
  const normalizedSeasonalIndices = seasonalIndices.map(s => s / avgIndex);
  
  // Step 4: Seasonally adjusted series
  const seasonallyAdjusted = monthlyData.map((y, i) => {
    const idx = normalizedSeasonalIndices[i % seasonPeriod];
    return Math.round(y / idx);
  });
  
  // Step 5: Residuals = actual / (trend × seasonal)
  const residuals = monthlyData.map((y, i) => {
    if (!trend[i]) return null;
    const expected = trend[i] * normalizedSeasonalIndices[i % seasonPeriod];
    return y / expected;
  });
  
  // Step 6: Anomaly detection on residuals (IQR method — robust to outliers)
  const validResiduals = residuals.filter(r => r !== null);
  const sortedRes = [...validResiduals].sort((a, b) => a - b);
  const q25 = sortedRes[Math.floor(sortedRes.length * 0.25)];
  const q75 = sortedRes[Math.floor(sortedRes.length * 0.75)];
  const iqr = q75 - q25;
  const anomalyLow = q25 - 1.5 * iqr;
  const anomalyHigh = q75 + 1.5 * iqr;
  
  const anomalies = residuals.map((r, i) => {
    if (r === null) return null;
    if (r > anomalyHigh) return { index: i, type: 'HIGH', residual: r.toFixed(3) };
    if (r < anomalyLow) return { index: i, type: 'LOW', residual: r.toFixed(3) };
    return null;
  }).filter(Boolean);
  
  return {
    seasonalIndices: normalizedSeasonalIndices.map(s => s.toFixed(3)),
    seasonallyAdjustedSeries: seasonallyAdjusted,
    anomalies,
    interpretation: anomalies.length === 0
      ? 'No significant anomalies detected after removing trend and seasonality'
      : \`\${anomalies.length} anomalies detected at indices: \${anomalies.map(a => a.index).join(', ')}\`
  };
}


// Example 5: Naive forecast with YoY growth rate
function naiveForecast(historicalMonthly, monthsToForecast = 3) {
  // Use last year's same months, adjusted by recent growth trend
  const lastYearGrowthRates = [];
  
  for (let i = 12; i < historicalMonthly.length; i++) {
    const yoyRate = historicalMonthly[i] / historicalMonthly[i - 12] - 1;
    lastYearGrowthRates.push(yoyRate);
  }
  
  // Use median YoY growth rate of last 3 months as the growth assumption
  const recentRates = lastYearGrowthRates.slice(-3).sort((a, b) => a - b);
  const medianGrowthRate = recentRates[Math.floor(recentRates.length / 2)];
  
  const forecasts = [];
  for (let h = 1; h <= monthsToForecast; h++) {
    const baseValue = historicalMonthly[historicalMonthly.length - 12 + h - 1];
    const forecastValue = Math.round(baseValue * (1 + medianGrowthRate));
    const ciWidth = Math.round(forecastValue * 0.10 * Math.sqrt(h));  // uncertainty grows with horizon
    
    forecasts.push({
      horizon: \`+\${h} month\`,
      forecast: \`₹\${forecastValue.toLocaleString('en-IN')}K\`,
      confidenceInterval: \`[₹\${(forecastValue - ciWidth).toLocaleString('en-IN')}K, ₹\${(forecastValue + ciWidth).toLocaleString('en-IN')}K]\`,
      growthAssumption: (medianGrowthRate * 100).toFixed(1) + '% YoY',
      note: h > 2 ? '⚠️ Longer-horizon forecasts have high uncertainty' : '✅ Short-horizon forecast'
    });
  }
  
  return { medianYoYGrowthRate: (medianGrowthRate * 100).toFixed(1) + '%', forecasts };
}


// Example 6: Seasonality-aware alerting SQL
/*
-- Alert only when value deviates from what's EXPECTED for this time of year
-- Much more intelligent than raw WoW or MoM alerts
WITH historical_seasonal_baseline AS (
  SELECT
    EXTRACT(WEEK FROM order_date) AS week_of_year,
    EXTRACT(DAYOFWEEK FROM order_date) AS day_of_week,
    AVG(daily_orders) AS avg_orders,
    STDDEV(daily_orders) AS std_orders,
    COUNT(*) AS data_points
  FROM daily_order_aggregates
  WHERE order_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)
                       AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)
  GROUP BY 1, 2
  HAVING COUNT(*) >= 2  -- need at least 2 data points for meaningful baseline
),
today_vs_baseline AS (
  SELECT
    t.order_date,
    t.daily_orders AS actual_orders,
    b.avg_orders AS expected_orders,
    b.std_orders,
    -- Z-score: how many standard deviations from the seasonal expectation?
    (t.daily_orders - b.avg_orders) / NULLIF(b.std_orders, 0) AS seasonal_z_score
  FROM daily_order_aggregates t
  JOIN historical_seasonal_baseline b
    ON EXTRACT(WEEK FROM t.order_date) = b.week_of_year
    AND EXTRACT(DAYOFWEEK FROM t.order_date) = b.day_of_week
  WHERE t.order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
)
SELECT
  order_date,
  actual_orders,
  ROUND(expected_orders) AS expected_orders,
  ROUND(seasonal_z_score, 2) AS z_score,
  CASE
    WHEN seasonal_z_score < -3 THEN '🚨 CRITICAL DROP vs seasonal expectation'
    WHEN seasonal_z_score < -2 THEN '⚠️ WARNING: Below seasonal expectation'
    WHEN seasonal_z_score > 3  THEN '🎉 EXCEPTIONAL: Well above expectation'
    ELSE '✅ Within seasonal norms'
  END AS alert_level
FROM today_vs_baseline
ORDER BY order_date;
-- This fires ONLY when something is genuinely unusual for THIS time of year
-- No false alarms for Diwali dips or weekend drops
*/`,
    bugs: `BUG 1: Comparing MoM growth for a highly seasonal business without adjustment
SYMPTOM: November MoM growth is +25% and team celebrates. December MoM is -15% and team panics. February MoM is -8% and people start questioning the product. Three emergency meetings in 3 months, all for normal seasonality.
ROOT CAUSE: Using raw MoM on seasonal data treats seasonal effects as real business changes. A Diwali spike in November is not "strong growth" — it's the calendar. A January slowdown is not "concerning decline" — it's also the calendar.
FIX: For seasonal businesses, always use YoY as the primary growth metric. Report MoM only with a historical benchmark: "November MoM was +25%, which is in line with the typical November MoM of +22–28% over the last 3 years." Build seasonality-adjusted metrics into your BI layer.

BUG 2: Missing zero-value days in time series SQL (the invisible gap problem)
SYMPTOM: Average daily orders looks suspiciously high. Investigation reveals there were 3 days with zero orders (system outage) that are simply absent from the events table. Average is computed over 27 days instead of 30, inflating it by ~12%.
ROOT CAUSE: SQL queries on event tables only return rows where events exist. Days with zero events produce no rows. Queries that aggregate without a date spine silently exclude these days.
FIX: Always build your time series query around a date spine (GENERATE_DATE_ARRAY in BigQuery). LEFT JOIN event data to the spine. Use COALESCE(COUNT(event), 0) not COUNT(event). The spine guarantees every date has a row, even with zero values.

BUG 3: Using SMA for trending data — the permanent lag problem
SYMPTOM: Revenue is growing steadily. The 30-day SMA dashboard line is always ₹2-3L below the actual current revenue. Teams set monthly targets based on the SMA, which is already obsolete by the time it's calculated. Growth looks artificially slow.
ROOT CAUSE: SMA lags by approximately N/2 periods for a linear trend. A 30-day SMA on a growing trend will always be about 15 days behind reality. For a business growing ₹200K/day, that's a persistent ₹3M underestimate.
FIX: Use EMA instead of SMA for trending metrics. EMA with alpha=0.3 gives much less lag while still smoothing noise. Alternatively, use the HP (Hodrick-Prescott) filter or STL decomposition to separate trend from noise without the lag artifact.

BUG 4: Treating seasonally adjusted numbers as real revenue
SYMPTOM: Analytics team reports "seasonally adjusted revenue was ₹12.4 Cr in February." Finance team uses this number for budget planning. Actual February revenue was ₹8.9 Cr. Significant budget mismatch for Q1.
ROOT CAUSE: Seasonally adjusted numbers are a statistical construct — they represent what revenue WOULD have been if there were no seasonal effects. They are useful for measuring underlying trend and growth rates but should NEVER be used as actual revenue figures for financial planning.
FIX: Clearly label all seasonally adjusted metrics as "SA" or "seasonally adjusted." Never mix raw and adjusted numbers in the same table. Finance planning always uses raw (unadjusted) actuals and raw forecasts. Seasonally adjusted metrics go in analytics/growth reports only.

BUG 5: Anomaly detection on raw time series instead of residuals
SYMPTOM: Revenue anomaly alert fires every November (Diwali peak) and every February (post-holiday trough). Engineers investigate both as "anomalies." After 12 months, they stop trusting the alert system entirely. A real anomaly in August (data pipeline break) goes unnoticed.
ROOT CAUSE: Applying statistical anomaly detection (z-score, IQR) directly to the raw time series conflates seasonal patterns with true anomalies. The "anomaly" detector sees November revenue as "too high" compared to the year's average — but it's just Diwali.
FIX: Always run anomaly detection on the RESIDUALS from decomposition, not on the raw series. Decompose first (remove trend + seasonality), then apply z-score or IQR anomaly detection to what remains. A true anomaly is something that deviates from what the trend + seasonality model expected.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A business has monthly revenue with seasonal indices:
Jan=0.75, Feb=0.70, Mar=0.90, Apr=0.95, May=1.00, Jun=0.90, Jul=0.85, Aug=0.88, Sep=1.05, Oct=1.20, Nov=1.45, Dec=1.25

Actual February revenue = ₹63L. What is the seasonally adjusted February revenue?
If the trend (underlying growth) shows ₹90L as the expected "average month" value, is February above or below trend?

Answer: Seasonally adjusted = ₹63L / 0.70 = ₹90L. February is exactly on trend. The "low" revenue in February is entirely explained by seasonality — no cause for concern. YoY growth rate should be computed on these seasonally adjusted numbers to see real underlying growth.

CHALLENGE 2 — FIX THE BUG:
This time series SQL is wrong — it misses zero-order days in the average:
\`\`\`sql
SELECT
  DATE(created_at) AS order_date,
  COUNT(*) AS daily_orders,
  AVG(COUNT(*)) OVER (ORDER BY DATE(created_at) ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS sma_7d
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
ORDER BY 1
\`\`\`
Two bugs: (1) no date spine means zero-order days are missing, (2) AVG(COUNT(*)) is a double aggregation. Fix both.

FIX:
WITH spine AS (SELECT date_day FROM UNNEST(GENERATE_DATE_ARRAY(DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), CURRENT_DATE())) AS date_day),
daily AS (SELECT DATE(created_at) AS d, COUNT(*) AS cnt FROM orders GROUP BY 1)
SELECT spine.date_day, COALESCE(daily.cnt, 0) AS daily_orders,
  AVG(COALESCE(daily.cnt, 0)) OVER (ORDER BY spine.date_day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS sma_7d
FROM spine LEFT JOIN daily ON spine.date_day = daily.d ORDER BY 1

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a seasonalityAwareAlert(dailySeries, lookbackYears=2) function that:
1. Takes an array of {date, value} objects covering multiple years
2. For each day of week × week of year combination, computes the historical mean and std
3. For each day in the last 7 days, computes the z-score vs the seasonal baseline
4. Returns alerts only when |z-score| > 2.5
5. Includes in each alert: the actual value, expected value, z-score, and a human-readable explanation
Test: Ensure a Diwali spike does NOT trigger an alert if it matches historical Diwali levels`,
    summary: `Time series data is never just a trend — it's a superposition of trend, seasonality, cycles, and noise. The analyst's job is to decompose these layers, report growth on seasonally adjusted numbers (using YoY for seasonal businesses), build anomaly detection on residuals not raw values, and always anchor SQL time series queries to a date spine so zero-activity days aren't silently erased.`
  },

  {
    id: 12,
    title: "Correlation, Causation & Statistical Traps",
    tag: "WHY YOUR INSIGHT MIGHT BE A LIE",
    color: "#F4845F",
    tldr: `Correlation measures how two variables move together — but correlation is not causation, and even strong correlations can be completely spurious. Simpson's Paradox, confounding variables, and the difference between observational and experimental data are the most dangerous traps in analytics. Getting this wrong turns data-driven decisions into expensive mistakes.`,
    problem: `Akash notices that users who use the dark mode feature have 40% higher 30-day retention than users who don't. He recommends forcing all users onto dark mode. Product team ships it. Retention is unchanged.

The problem: dark mode users are power users — they're the kind of people who explore app settings, which means they're already highly engaged. Dark mode didn't cause the retention; it was a signal of the underlying engagement level. The correlation was real. The causation was wrong.

Or: A data analyst reports "cities where we have more delivery partners show 25% higher order values." Leadership concludes: "Add more delivery partners everywhere to increase order values." They hire 500 more delivery partners in Tier 2 cities. Order values don't move.

The problem: high-order-value cities attract more delivery partners because they're profitable markets. The relationship goes the other way. This is reverse causation — confusing which direction the arrow points.

Or: An analyst finds that ice cream sales and drowning rates are highly correlated (r=0.85). She recommends reducing ice cream sales to reduce drownings. The real cause: hot weather drives both ice cream sales AND swimming. Weather is a confounding variable.

Or: A new onboarding flow is tested and the overall completion rate is 68%. Broken down by user segment, the rate is 64% for mobile and 71% for desktop — both WORSE than the old flow (which was 65% mobile, 70% desktop). But the new flow looks better in aggregate because it was shown more to desktop users who convert better anyway. This is Simpson's Paradox.

These mistakes cost companies crores in misguided initiatives, wasted engineering, and decisions that move in the opposite direction of what data suggested.`,
    analogy: `THE DETECTIVE ANALOGY for causal reasoning:

A good detective doesn't arrest someone just because they were at the scene of the crime (correlation). They need to establish: motive (mechanism), means (plausibility), and no alibi (ruling out alternatives).

CORRELATION = Being at the scene. A and B happen together.
CAUSATION = Being the killer. A actually produces B through a chain of events.
SPURIOUS CORRELATION = Two people both at the scene, both innocent — a third party (confounder) brought both there.

THE ICE CREAM AND DROWNING EXAMPLE:
Ice cream sales correlate with drowning deaths (r≈0.85). Does eating ice cream cause drowning?
No. Both are caused by hot weather. Hot weather → people buy ice cream. Hot weather → people swim → some drown. The "correlation" between ice cream and drownings is purely mediated by the hidden third variable: temperature. This is a CONFOUNDER.

CONFOUNDER = A variable that causes BOTH X and Y, creating an apparent correlation between X and Y even though there's no causal relationship between them.

REVERSE CAUSATION = The relationship runs the other way than you assumed.
"Premium app users have more friends in-app." Does premium cause more friends, or do users with more friends monetize better and therefore convert to premium? Often the latter. The causal arrow is reversed.

SIMPSON'S PARADOX = THE MAGIC TRICK:
Imagine two hospitals. Hospital A: 70% surgery survival. Hospital B: 90% surgery survival.
You'd always choose Hospital B, right?

But wait — look at patient condition:
Hospital A treats mostly severe cases: severe=65% survival, mild=95% survival (avg 70%)
Hospital B treats mostly mild cases: severe=55% survival, mild=92% survival (avg 90%)

Hospital A has BETTER survival rates for BOTH severe AND mild cases!
But because Hospital A treats more severe cases (a different mix), its AGGREGATE rate looks worse.

The aggregate tells you the wrong story. Segment matters. This is exactly what happens when you look at A/B test results without segmenting by user type, or when you look at company-wide conversion rates without breaking down by traffic source.

THE DIFFERENCE-IN-DIFFERENCES TECHNIQUE:
The gold standard when you can't randomize.
Instead of comparing treated vs untreated at one time point,
compare: (treated after - treated before) - (control after - control before)
This subtracts the time trend that would have happened anyway, leaving only the treatment effect.
It's like comparing the CHANGE in the treatment group to the CHANGE in the control group.`,
    deep: `PEARSON CORRELATION COEFFICIENT — WHAT IT ACTUALLY MEASURES

r = Σ[(x_i - x̄)(y_i - ȳ)] / [n × σ_x × σ_y]

r ranges from -1 to +1:
r = +1: perfect positive linear relationship
r = -1: perfect negative linear relationship  
r = 0: no LINEAR relationship (there could still be a strong non-linear relationship!)
r = 0.7–1.0: strong positive
r = 0.4–0.7: moderate positive
r = 0.2–0.4: weak positive

CRITICAL LIMITATIONS OF PEARSON r:
1. Only measures LINEAR relationships. r=0 for y=x² even though x perfectly predicts y.
2. Sensitive to outliers. One extreme point can change r from 0.1 to 0.8.
3. Assumes continuous, normally distributed variables. Don't use for ordinal/categorical data.
4. Correlation with a non-stationary time series is almost always spurious.
5. r doesn't tell you about effect size or practical significance.

SPURIOUS CORRELATION SOURCES:
1. Common cause (confounding): X and Y are both caused by Z.
   Example: Shoe size correlates with reading ability in children — both caused by age.
   
2. Coincidence: Enough variables, and some will correlate by chance.
   At α=0.05, ~5% of randomly generated variable pairs will show p<0.05.
   With 1,000 pairs, ~50 will be "significant" by pure chance.
   
3. Non-stationarity in time series: Two trending variables will almost always correlate.
   "Cheese consumption correlates with death by bedsheet tangling" — both trended upward.
   Always detrend time series before computing correlation.
   
4. Ecological fallacy: Correlation at group level doesn't imply correlation at individual level.
   Countries with higher chocolate consumption have more Nobel laureates — but individual chocolate
   consumption doesn't predict individual Nobel prizes.

5. Selection bias: The sample you're measuring is not representative.
   "App users with 5-star ratings give 20% more tips" — but high-rated restaurants attract different
   customers, who have different tipping behavior regardless of the rating.

CONFOUNDING — TECHNICAL TREATMENT:
A confounding variable C is one that:
1. Causes or correlates with X (the exposure/treatment)
2. Independently causes Y (the outcome)
3. Is NOT on the causal path from X to Y

Directed Acyclic Graph (DAG) notation:
C → X (confounder affects treatment)
C → Y (confounder affects outcome)
X → ? → Y (is the treatment effect real?)

Methods to control for confounders:
1. Randomization (A/B testing): Randomly assign treatment → confounders are equally distributed across groups → their effect cancels out. Gold standard.
2. Regression adjustment: Include confounder as a covariate in the regression model. Controls for its effect.
3. Stratification: Analyze separately within each level of the confounder.
4. Matching: Pair treated and untreated units with similar confounder values.
5. Instrumental Variables (IV): Find a variable that causes treatment but has no direct effect on outcome — uses this "instrument" to isolate the causal effect.
6. Propensity Score Matching: Estimate probability of receiving treatment given confounders; match treated and untreated units with similar propensity scores.

SIMPSON'S PARADOX — TECHNICAL EXPLANATION:
Simpson's Paradox occurs when a trend appears in several groups but disappears or reverses when groups are combined.

Mathematical source: The weighted average of several group proportions is not the simple average — it's weighted by group SIZE. If group sizes differ systematically between comparison groups, the weights distort the aggregate picture.

Example: New checkout flow A vs B
Group: Mobile users    → A: 100/1000=10% | B: 200/2000=10% (tie)
Group: Desktop users   → A: 300/600=50%  | B: 200/500=40%  (A wins)
Aggregate             → A: 400/1600=25% | B: 400/2500=16% (A wins in aggregate too — no paradox here)

vs.
Group: Mobile users    → A: 50/1000=5%   | B: 200/2000=10% (B wins)
Group: Desktop users   → A: 350/500=70%  | B: 90/300=30%   (A wins)
Aggregate             → A: 400/1500=26.7%| B: 290/2300=12.6% (A wins in aggregate)

Paradox version:
Group: Mobile         → A: 50/1000=5%   | B: 200/2000=10% (B wins for mobile)
Group: Desktop        → A: 200/300=66.7%| B: 80/500=16%   (A wins for desktop)
Aggregate             → A: 250/1300=19.2%| B: 280/2500=11.2% (A "wins" in aggregate — but B wins in both subgroups... wait, let me recalculate)

The key: subgroup sizes create a confounding weight. Simpson's Paradox occurs when treatment is confounded with group membership.

PREVENTION: Always check treatment assignment is balanced across important subgroups. The question "is this result driven by a subgroup size imbalance?" should be asked for every aggregated result.

OBSERVATIONAL vs EXPERIMENTAL DATA:
Observational: You observe what naturally happens. No randomization. Confounders lurk everywhere.
Experimental: You randomly assign treatment. Confounders are controlled by randomization.

In product analytics, most of your data is OBSERVATIONAL:
- Users who used feature X vs didn't: self-selection. Feature users are different people.
- Users who upgraded vs didn't: selection bias. Upgraders have different intent.
- High-LTV users vs low-LTV: different user segments with different characteristics.

The danger: you analyze observational data as if it were experimental.
"Feature X users have 2x retention" → "We should push Feature X to all users"
But Feature X users may be power users who would have had 2x retention regardless.

QUASI-EXPERIMENTAL METHODS for observational data:

1. DIFFERENCE-IN-DIFFERENCES (DiD):
   Setting: A feature is rolled out to some cities/segments but not others.
   Treatment effect = (Treated_after - Treated_before) - (Control_after - Control_before)
   Key assumption: "Parallel trends" — control group shows what the treatment group WOULD have done without treatment.
   
   DiD in SQL:
   SELECT
     period,
     AVG(metric) FILTER (WHERE is_treated = 1) AS treated_avg,
     AVG(metric) FILTER (WHERE is_treated = 0) AS control_avg,
     AVG(metric) FILTER (WHERE is_treated = 1) - AVG(metric) FILTER (WHERE is_treated = 0) AS diff
   FROM data
   GROUP BY period
   -- DiD = diff_after - diff_before

2. REGRESSION DISCONTINUITY (RDD):
   Setting: Treatment is assigned based on a threshold (e.g., users who signed up before date X got feature, after didn't).
   Assumption: Users just above and below the threshold are essentially the same.
   Effect = difference in outcome between just above and just below the threshold.

3. SYNTHETIC CONTROL:
   Build a "synthetic" control unit from a weighted combination of other units that mimics the treated unit's pre-treatment trend.
   Compare actual treated unit to its synthetic counterfactual after treatment.
   Used by Abadie & Gardeazabal to study the economic impact of terrorism.`,
    code: `// CONCEPT 12: Correlation, Causation & Statistical Traps

// Example 1: Pearson correlation with outlier sensitivity demonstration
function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) throw new Error('Arrays must have same length >= 2');
  
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0, sumSqX = 0, sumSqY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  
  const r = numerator / Math.sqrt(sumSqX * sumSqY);
  
  // t-test for significance of correlation
  const tStat = r * Math.sqrt((n - 2) / (1 - r * r));
  
  return {
    r: r.toFixed(4),
    rSquared: (r * r).toFixed(4),
    tStatistic: tStat.toFixed(3),
    interpretation: Math.abs(r) > 0.7 ? 'Strong' : Math.abs(r) > 0.4 ? 'Moderate' : 'Weak',
    direction: r > 0 ? 'Positive' : 'Negative',
    warning: Math.abs(r) > 0.5 && n < 30
      ? '⚠️ Small sample — correlation may not be reliable'
      : Math.abs(r) > 0.8
        ? '⚠️ Strong correlation found. Check for: (1) confounders, (2) reverse causation, (3) spurious coincidence BEFORE concluding causation'
        : ''
  };
}

// Zomato-like food delivery: correlation between delivery speed and re-order rate
const avgDeliveryMinutes = [32, 28, 45, 38, 25, 52, 30, 35, 42, 28, 26, 40];
const reorderRatePct    = [68, 72, 55, 61, 78, 48, 70, 64, 57, 75, 80, 60];
const deliveryReorderCorr = pearsonCorrelation(avgDeliveryMinutes, reorderRatePct);
// r ≈ -0.95 (strong negative — faster delivery → higher reorder)
// But: Is this causal? Or are popular restaurants both faster AND have higher reorder rates
// because they're just better restaurants? Need a controlled experiment to be sure.


// Example 2: Detecting and controlling for a confounding variable
function analyzWithConfounder(data) {
  // data: [{treatment: bool, outcome: number, confounder: string}]
  // e.g., treatment=used_dark_mode, outcome=d30_retention, confounder=user_type (power/casual)
  
  const segments = [...new Set(data.map(d => d.confounder))];
  
  // Aggregate (potentially misleading) result
  const treated = data.filter(d => d.treatment);
  const untreated = data.filter(d => !d.treatment);
  const avgTreated = treated.reduce((s, d) => s + d.outcome, 0) / treated.length;
  const avgUntreated = untreated.reduce((s, d) => s + d.outcome, 0) / untreated.length;
  
  // Stratified result (controlling for confounder)
  const stratifiedResults = segments.map(seg => {
    const segTreated = data.filter(d => d.treatment && d.confounder === seg);
    const segUntreated = data.filter(d => !d.treatment && d.confounder === seg);
    const segTreatedAvg = segTreated.length > 0
      ? segTreated.reduce((s, d) => s + d.outcome, 0) / segTreated.length : null;
    const segUntreatedAvg = segUntreated.length > 0
      ? segUntreated.reduce((s, d) => s + d.outcome, 0) / segUntreated.length : null;
    return {
      segment: seg,
      treatedN: segTreated.length,
      untreatedN: segUntreated.length,
      treatedAvg: segTreatedAvg ? segTreatedAvg.toFixed(1) : 'N/A',
      untreatedAvg: segUntreatedAvg ? segUntreatedAvg.toFixed(1) : 'N/A',
      liftInSegment: (segTreatedAvg && segUntreatedAvg)
        ? ((segTreatedAvg - segUntreatedAvg) / segUntreatedAvg * 100).toFixed(1) + '%'
        : 'N/A'
    };
  });
  
  // Simpson's Paradox check: does aggregate lift disagree with all segment lifts?
  const aggregateLift = ((avgTreated - avgUntreated) / avgUntreated * 100).toFixed(1);
  const allSegmentLiftsNegative = stratifiedResults
    .filter(s => s.liftInSegment !== 'N/A')
    .every(s => parseFloat(s.liftInSegment) < 0);
  const simpsonDetected = parseFloat(aggregateLift) > 0 && allSegmentLiftsNegative;
  
  return {
    aggregateAnalysis: {
      treatedAvg: avgTreated.toFixed(1),
      untreatedAvg: avgUntreated.toFixed(1),
      aggregateLift: aggregateLift + '%',
      warning: '⚠️ This is the unadjusted (potentially confounded) result'
    },
    stratifiedAnalysis: stratifiedResults,
    simpsonParadoxDetected: simpsonDetected,
    recommendation: simpsonDetected
      ? '🚨 SIMPSONS PARADOX: Aggregate shows positive lift but EVERY segment shows negative lift. The aggregate is WRONG. Use the stratified results.'
      : 'Check if stratified lifts tell the same story as aggregate lift.'
  };
}


// Example 3: Difference-in-Differences calculation
function differenceInDifferences(data) {
  // data: [{group: 'treated'|'control', period: 'before'|'after', value: number, n: number}]
  
  const get = (group, period) => {
    const d = data.find(r => r.group === group && r.period === period);
    return d ? d.value : null;
  };
  
  const treatedBefore = get('treated', 'before');
  const treatedAfter  = get('treated', 'after');
  const controlBefore = get('control', 'before');
  const controlAfter  = get('control', 'after');
  
  const treatedChange = treatedAfter - treatedBefore;
  const controlChange = controlAfter - controlBefore;
  const didEstimate = treatedChange - controlChange;
  
  // The counterfactual: what WOULD the treated group have done without treatment?
  const counterfactual = treatedBefore + controlChange;
  
  return {
    treatedBefore: treatedBefore.toFixed(2),
    treatedAfter: treatedAfter.toFixed(2),
    controlBefore: controlBefore.toFixed(2),
    controlAfter: controlAfter.toFixed(2),
    treatedChange: (treatedChange >= 0 ? '+' : '') + treatedChange.toFixed(2),
    controlChange: (controlChange >= 0 ? '+' : '') + controlChange.toFixed(2),
    counterfactual: counterfactual.toFixed(2),
    didEstimate: (didEstimate >= 0 ? '+' : '') + didEstimate.toFixed(2),
    interpretation: \`Without the intervention, treated group would have gone from \${treatedBefore.toFixed(2)} to \${counterfactual.toFixed(2)} (following control trend). Instead went to \${treatedAfter.toFixed(2)}. Net causal effect: \${didEstimate >= 0 ? '+' : ''}\${didEstimate.toFixed(2)}\`,
    assumption: 'Assumes parallel trends: treated and control groups would have followed same trajectory without treatment'
  };
}

// Example: New feature rolled out to Delhi, not to Mumbai
// Conversion rate before/after rollout
const didData = [
  { group: 'treated', period: 'before', value: 4.2, n: 5000 },  // Delhi before
  { group: 'treated', period: 'after',  value: 5.8, n: 5200 },  // Delhi after
  { group: 'control', period: 'before', value: 4.0, n: 4800 },  // Mumbai before
  { group: 'control', period: 'after',  value: 4.3, n: 5100 },  // Mumbai after (time trend)
];
const result = differenceInDifferences(didData);
// Treated change: +1.6pp. Control change: +0.3pp (time trend).
// DiD estimate: +1.3pp — this is the true causal effect of the feature


// Example 4: Simpson's Paradox SQL detection
/*
-- Check if a result holds in EVERY subgroup (not just aggregate)
WITH aggregate_result AS (
  SELECT
    'aggregate' AS segment,
    AVG(CASE WHEN new_flow = 1 THEN converted ELSE NULL END) AS new_flow_cvr,
    AVG(CASE WHEN new_flow = 0 THEN converted ELSE NULL END) AS old_flow_cvr,
    COUNT(*) AS total_users
  FROM checkout_experiment
),
segment_results AS (
  SELECT
    device_type AS segment,
    AVG(CASE WHEN new_flow = 1 THEN converted ELSE NULL END) AS new_flow_cvr,
    AVG(CASE WHEN new_flow = 0 THEN converted ELSE NULL END) AS old_flow_cvr,
    COUNT(*) AS total_users
  FROM checkout_experiment
  GROUP BY device_type
)
SELECT
  segment,
  ROUND(new_flow_cvr * 100, 2) AS new_flow_cvr_pct,
  ROUND(old_flow_cvr * 100, 2) AS old_flow_cvr_pct,
  ROUND((new_flow_cvr - old_flow_cvr) * 100, 2) AS lift_pp,
  total_users,
  CASE
    WHEN (new_flow_cvr - old_flow_cvr) > 0 THEN '✅ New flow wins'
    WHEN (new_flow_cvr - old_flow_cvr) < 0 THEN '❌ Old flow wins'
    ELSE '➖ Tie'
  END AS verdict
FROM (SELECT * FROM aggregate_result UNION ALL SELECT * FROM segment_results)
ORDER BY segment = 'aggregate' DESC, lift_pp DESC;
-- If aggregate shows ✅ but all segments show ❌: SIMPSONS PARADOX detected!
*/


// Example 5: Testing for spurious correlation in time series
function detrend(series) {
  // Remove linear trend before computing correlation
  // to avoid spurious correlation from two trending variables
  const n = series.length;
  const x = Array.from({length: n}, (_, i) => i);
  
  // Compute linear trend using least squares
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  const slope = series.reduce((s, y, i) => s + (i - meanX) * (y - meanY), 0) /
                series.reduce((s, _, i) => s + Math.pow(i - meanX, 2), 0);
  const intercept = meanY - slope * meanX;
  
  // Return detrended series (residuals from linear fit)
  return series.map((y, i) => y - (slope * i + intercept));
}

// Revenue and competitor's revenue — both trending up, so high correlation even if unrelated
// Always detrend before correlating time series!
const myRevenue = [100, 115, 125, 140, 155, 170, 185, 200, 210, 225];
const iceCreamSales = [80, 92, 105, 112, 125, 138, 150, 162, 175, 188]; // both trending up!

const rawCorr = pearsonCorrelation(myRevenue, iceCreamSales);
// r ≈ 0.99 — "amazing correlation!" — but it's SPURIOUS (two trending series)

const detrendedRevenue = detrend(myRevenue);
const detrendedIceCream = detrend(iceCreamSales);
const corrAfterDetrending = pearsonCorrelation(detrendedRevenue, detrendedIceCream);
// r ≈ 0.12 — much lower after removing trend — the "correlation" was just two growing businesses`,
    bugs: `BUG 1: Recommending causal action based on observational correlation
SYMPTOM: Analytics shows that users who receive push notifications have 2x higher 30-day retention than users who don't. Team recommends sending push notifications to ALL users. Opt-out rate spikes 40%, and overall retention drops.
ROOT CAUSE: Users who don't opt out of push notifications are already highly engaged users — they opted IN, which is itself a signal of high intent. The correlation between notifications and retention was real, but the causation was reversed: high engagement causes both notification tolerance AND high retention. Forcing notifications on low-engagement users didn't replicate the effect.
FIX: Never recommend a feature rollout based solely on correlations from users who self-selected into that feature. Run a proper A/B experiment where you randomly assign push notifications to a segment of ALL users (including those who wouldn't naturally opt in). The experiment result is the causal effect.

BUG 2: Missing a confounder that explains the entire observed effect
SYMPTOM: Analysis shows restaurants with higher Zomato ratings receive 35% more orders per day than lower-rated ones. Recommendation: improve rating by responding to reviews → more orders. Operations team spends 3 months on review management. No improvement in orders.
ROOT CAUSE: Both high ratings AND high order volume are caused by a third variable: restaurant quality and popularity. Good restaurants get high ratings AND high orders because they're good. Rating management doesn't improve restaurant quality, so it doesn't improve orders.
FIX: Build a causal model (DAG) before making recommendations. Ask: "What else might cause both X and Y?" List at least 3 potential confounders and think through whether each could explain the entire correlation. For strong business claims, run an experiment to isolate the effect.

BUG 3: Reporting aggregate results that are reversed by Simpson's Paradox
SYMPTOM: A/B test for new checkout flow shows Treatment wins: 24% vs 21% overall conversion. Feature ships. Next month, mobile conversion is down 3pp and desktop conversion is up 1pp. Net effect: negative for the majority mobile user base.
ROOT CAUSE: Treatment was shown more to desktop users (who have higher baseline conversion). The aggregate number was dominated by the higher-converting desktop group, masking the mobile degradation. This is Simpson's Paradox.
FIX: For every A/B test result, always segment by device type, acquisition channel, new vs returning user, and any other axis that could have different baseline conversion rates. Report segment-level results alongside aggregate. If segments tell a different story than aggregate, the aggregate may be misleading — choose the segment-level results for product decisions.

BUG 4: Correlating two non-stationary time series (spurious regression)
SYMPTOM: Analyst runs correlation between company revenue and national GDP — finds r=0.96 and declares "our revenue is highly tied to GDP growth." Reports this as strategic insight. Investors are impressed. But the "correlation" completely disappears when both series are detrended.
ROOT CAUSE: Both revenue and GDP trend upward over time. Any two variables that both trend upward will show high correlation — even shoe sizes and cloud computing market cap. This is called spurious regression or non-stationary correlation.
FIX: Always detrend time series before computing correlations. Use first differences (X_t - X_{t-1}) or regression residuals. If two detrended series still correlate, the correlation is meaningful. If it disappears after detrending, it was spurious. Apply the ADF (Augmented Dickey-Fuller) test to check for non-stationarity before correlating.

BUG 5: Using Pearson correlation on ordinal or bounded data
SYMPTOM: NPS score (range -100 to +100) is correlated with revenue using Pearson r. Strong positive correlation found and reported. Stakeholders start optimizing NPS specifically. But NPS and revenue relationship is non-linear — very high NPS has diminishing returns, and there's a floor effect at low NPS.
ROOT CAUSE: Pearson correlation assumes linear relationships between continuous unbounded variables. NPS is bounded and has floor/ceiling effects. The linear assumption is violated, making Pearson r misleading.
FIX: For bounded or ordinal variables (NPS, ratings 1-5, percentages), use Spearman rank correlation instead. Spearman measures monotonic relationships without assuming linearity. Also visualize with a scatter plot — a picture will immediately show whether the relationship is linear, curved, or has kinks.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
An analyst studies two hospitals:
Hospital A treats 700 severe patients (85% survival) and 300 mild patients (97% survival) → overall: 88%
Hospital B treats 100 severe patients (80% survival) and 900 mild patients (95% survival) → overall: 93.5%

Hospital A has BETTER survival for BOTH severe (85% > 80%) and mild (97% > 95%) cases.
Yet Hospital B has higher overall survival (93.5% > 88%).

How is this possible? Which hospital should you choose for your surgery and why?

Answer: This is Simpson's Paradox. Hospital A specializes in severe cases (70% of its patients), which have inherently lower survival rates, dragging down the aggregate. Hospital B mostly handles mild cases. If your condition is known: always choose Hospital A — it performs better for both categories. Aggregate statistics here are actively misleading because patient mix is different.

CHALLENGE 2 — FIX THE BUG:
This analysis is supposed to identify which marketing channel causally drives the best users, but has a fundamental flaw:
\`\`\`sql
SELECT
  acquisition_channel,
  AVG(d30_retention) AS avg_retention,
  AVG(ltv_90d_inr) AS avg_ltv
FROM users
GROUP BY acquisition_channel
ORDER BY avg_ltv DESC
-- Conclusion: "Organic search produces users with 3x LTV vs paid social — invest in SEO"
\`\`\`
What are 2 reasons this query can't support the causal conclusion, and how would you improve it?

FIX: (1) Self-selection confound: users who find you via organic search are already high-intent. This is correlation, not causation. (2) Temporal confound: older users (with more time to generate LTV) may be over-represented in organic because paid scaled up recently. Fix: At minimum, add cohort controls (compare same acquisition month), add user demographic controls, and ideally run a holdout experiment where you vary organic SEO exposure and measure LTV of the experimental groups.

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a causalityChecker(observedData, proposedCause, proposedEffect) function that:
1. Computes the correlation between the two variables (Pearson r)
2. For each potential confounder variable in observedData, computes partial correlation (correlation after removing the confounder's linear effect from both variables)
3. Computes how much of the original correlation remains after controlling for the strongest confounder
4. Flags if r drops by > 50% when controlling for any single confounder (suggests confounding)
5. Returns a structured causal assessment: LIKELY CAUSAL / POSSIBLY CONFOUNDED / PROBABLY SPURIOUS
Include: a recommendation for what experiment to run to establish causality`,
    summary: `Correlation is a description of data; causation is a claim about the world — and the gap between them is where most analytical mistakes live. Before turning any correlation into a recommendation, ask: could a confounder explain this? Could the causal arrow be reversed? Does the result hold in every subgroup (Simpson's Paradox)? If you can't run an experiment, use difference-in-differences or regression adjustment to get as close to causal as the data allows.`
  },

  {
    id: 13,
    title: "Data Visualization & Dashboard Design",
    tag: "MAKING DATA SPEAK WITHOUT WORDS",
    color: "#06A77D",
    tldr: `A chart is a form of communication, not a proof of work. The goal is always to minimize cognitive load and maximize the signal reaching the viewer's brain. Chart crimes — truncated axes, dual Y-axes, 3D pies, rainbow palettes — aren't just ugly, they actively mislead. Good dashboards have a hierarchy: headline → context → detail, not fifty equally-weighted numbers.`,
    problem: `Neha presents a dashboard showing user growth. There are 14 charts, each a different chart type, all with different color schemes. The CEO asks "Is this good or bad?" Neha spends 5 minutes explaining context. The CEO is confused. No decision is made.

Or: A team builds a bar chart showing revenue. The Y-axis starts at ₹95L, not ₹0. A bar that represents ₹96L appears 10x taller than a bar representing ₹95L — a 1% difference looks like a 10x difference. The CEO says "the August number is catastrophically low!" It's down 1%.

Or: Someone uses a dual Y-axis chart with "Users" on the left (0 to 1,000,000) and "Revenue" on the right (0 to ₹100L). They align them so the lines cross perfectly. Stakeholders conclude "users and revenue move together perfectly." But the scales were chosen to create that visual alignment — it's an illusion. You can make any two lines appear perfectly correlated or perfectly uncorrelated by adjusting the two Y-axis scales.

Or: An analyst puts 8 metrics on a single dashboard slide for the weekly review. All metrics are green (good). One metric is borderline, but it's in position 6 of 8. Nobody notices. The company misses an important early warning signal.

Or: A product manager asks for a pie chart comparing 7 product categories. The smallest slice is labeled "3.2%" and the second smallest is "3.8%." Nobody can visually distinguish these slices. A simple bar chart ranked by size would communicate the comparison in milliseconds.

Good visualization design is not about aesthetics. It's about cognitive efficiency: how quickly can the viewer extract the correct insight from the display?`,
    analogy: `THE AIRPORT SIGN DESIGN ANALOGY:

Walk into any major airport. Signs work because they follow strict visual communication principles. Let's use them to understand dashboard design.

PREATTENTIVE ATTRIBUTES = Things your brain processes before you consciously "look" — before you even start reading. In an airport, the EXIT sign is red and large because those properties are processed preattentively. Your eye goes there first, instantly, without effort.

In data viz, preattentive attributes are:
- COLOR (hue, saturation) — fastest visual channel. Red = danger. Green = good. Don't use color for decoration.
- SIZE — bigger = more. A longer bar is immediately "more" than a shorter bar.
- POSITION — top/left = first in Western reading convention. Position on a scale (x-axis, y-axis) is the most accurate channel for comparison.
- SHAPE — circle vs square vs triangle. Good for categorical encoding. Hard to quantify.

CHART SELECTION = Choosing the right type of sign. Imagine an airport using a pie chart to show "which terminals are in which direction." Disastrous. You'd never find your gate. Different messages need different visual formats.

DATA-INK RATIO = Edward Tufte's principle: remove anything that isn't communicating data. Airport signs work because they have zero decoration — just the information. Every grid line, border, shadow, and 3D effect in your chart that doesn't carry data should be deleted. Less is more.

DASHBOARD HIERARCHY = The airport's information architecture. At the entrance: big signs with terminal letters (headline). As you get closer: gate numbers (context). At the gate: boarding info (detail). You're never overwhelmed with all information at once — it's revealed progressively based on proximity and need.

3D PIE CHART = An airport sign that's been rotated 45 degrees and embossed with shadows. You can tell yourself it looks cool, but the "N" in "NORTH" is now ambiguous because perspective distortion has changed the apparent proportions. All 3D in data visualization is like this — it adds visual complexity that your brain has to mentally undo before reading the actual data.`,
    deep: `CHART SELECTION FRAMEWORK — CHOOSING THE RIGHT VISUAL

Start with: What RELATIONSHIP am I showing?

1. COMPARISON across categories → Bar chart (horizontal for long names) or dot plot
   BAD: Pie chart (humans are terrible at comparing angles and areas)
   GOOD: Ranked bar chart (sort by value for instant ranking comprehension)
   When to use pie: ONLY for showing "part of a whole" with 2-3 categories where the relative size of each is the main message. Never for > 4 categories.

2. TREND over time → Line chart (one or few variables) or area chart (cumulative)
   BAD: Bar chart for dense time series (too much visual noise)
   GOOD: Line chart with annotations marking key events
   Key: Always include reference lines (e.g., weekly average, last year's value)

3. DISTRIBUTION of a single variable → Histogram, box plot, or violin plot
   BAD: Bar chart of means (hides distribution shape — the average user doesn't exist)
   GOOD: Box plot (shows median, IQR, outliers) or violin (shows full density)
   For large datasets: ridgeline plots show distribution evolution over time

4. RELATIONSHIP between two continuous variables → Scatter plot
   BAD: Line chart (implies sequential order where none exists)
   GOOD: Scatter with regression line and confidence band; color-encode a third variable

5. PART-TO-WHOLE → Treemap (for hierarchical composition) or stacked bar
   BAD: 3D pie (perspective distorts proportions)
   GOOD: 100% stacked bar if you need to show change in composition over time

6. GEO DISTRIBUTION → Choropleth map (color encoding by region)
   DANGER: Choropleth map bias — large geographic areas appear more important.
   Better for population data: cartogram or bubble map

7. CORRELATION MATRIX across many variables → Heatmap with color intensity
   Example: Correlation matrix of 10 metrics: color = correlation strength

PREATTENTIVE ATTRIBUTES — COGNITIVE HIERARCHY:
Your visual system processes these in roughly this order of speed:
1. COLOR (distinguishing the red alert from all other elements) — ~100ms
2. POSITION (where is it on the scale?) — most ACCURATE channel for quantitative comparison
3. LENGTH/SIZE (bar height, bubble area) — good for magnitude comparison
4. ANGLE/SLOPE — mediocre accuracy (why pie charts fail)
5. SHAPE — good for categorical grouping, poor for quantitative comparison
6. CURVATURE, TEXTURE, SHADING — slowest, least accurate

Rules for color in data:
- Use a SINGLE highlight color for emphasis (everything else gray/neutral)
- Avoid rainbow palettes (they imply false ordering and confuse colorblind users)
- Red/green colorblindness affects 8% of men — use red/blue or orange/blue instead
- Categorical palette: 5-7 distinct colors max. Beyond 7 categories, use other encodings.
- Sequential scale (light → dark): for ordered data (low → high revenue)
- Diverging scale (blue → white → red): for data with meaningful center (negative → zero → positive growth)

CHART CRIMES — THE FULL LIST:

1. TRUNCATED Y-AXIS (The #1 Offense):
   Starting a bar chart Y-axis at anything other than 0.
   Effect: Makes differences look proportionally larger than they are.
   The rule: Bar charts MUST start at 0 because bar HEIGHT encodes the value. If you truncate, the visual encoding is wrong.
   Exception: Line charts and scatter plots can have non-zero axes if the goal is to show variation within a range, AND the context makes this clear (e.g., a stock price chart).

2. DUAL Y-AXIS:
   Two different metrics on the same chart with two independent Y-axes.
   Problem: You can make ANY two variables appear perfectly correlated or perfectly uncorrelated by scaling the axes differently. The visual correlation is entirely under the designer's (possibly biased) control.
   Exception: Only acceptable for metrics that are measured on the same subject and have a genuine relationship (e.g., temperature in °C and °F on the same chart — truly the same underlying quantity).
   Alternative: Use two separate charts placed side-by-side with consistent time axes.

3. 3D CHARTS (Any and All):
   3D effects create perspective distortion that makes accurate reading impossible.
   The "back" slices of a 3D pie appear smaller than they are. The "tilted" bars in a 3D bar chart are impossible to compare accurately.
   There is NEVER a valid reason to use a 3D chart. It is always a crime against accurate communication.

4. PIE CHART WITH > 4 CATEGORIES:
   Humans are very poor at comparing angles and areas.
   For 5+ categories, a ranked bar chart communicates rank and magnitude instantly.
   Even 3-4 category pie charts: only use when relative size IS the message AND precise comparison is not needed.

5. RAINBOW/TRAFFIC LIGHT COLOR MAPPING without meaning:
   Using red/amber/green for status implies a threshold-based judgment. If thresholds aren't clearly defined and justified, traffic lights are misleading (who decided 80% is "amber"?).
   Arbitrary rainbow gradients on charts where color doesn't map to any meaningful quantity.

6. CHART SPAGHETTI (> 5 lines on a line chart):
   Every line gets its own color. Users can't distinguish them. Small multiples (separate charts for each category) are always better than a spaghetti chart.

7. AREA CHART FOR INDEPENDENT CATEGORIES:
   Stacking independent categories in an area chart implies they're parts of a whole when they're not. Only stack areas when the sum IS meaningful.

DATA-INK RATIO (Tufte):
Data-ink ratio = data ink / total ink used in the chart
Maximize this ratio by removing:
- Background colors in chart area
- Grid lines (use only light gray horizontal reference lines if needed)
- Chart borders
- 3D effects, shadows, gradients
- Redundant axis labels (if the pattern is clear, you don't need every label)
- Legends where direct labeling is possible

DASHBOARD HIERARCHY:
Level 1 — HEADLINE (above the fold, first glance):
The ONE metric that summarizes everything. "Orders: 45,230 this week (+8% YoY ✅)"
If someone has 5 seconds, this is all they should need.

Level 2 — CONTEXT (second glance, 30 seconds):
The 3-5 metrics that explain the headline. Why is it 8%? Which segments drove it?
Brief sparklines, delta indicators, segment breakdown.

Level 3 — DETAIL (analysis, 5 minutes):
Full tables, trend charts, cohort breakdowns, segmentation.
Used for investigation after the headline raises a question.

ACTIONABLE vs VANITY DASHBOARDS:
Vanity dashboard: Shows you all the metrics that make you feel good. No owner, no target, no decision implied.
Actionable dashboard: Every metric has an owner, a target, and a decision it enables.

For each metric on your dashboard, ask:
- Who owns this number? (If nobody, delete it)
- What do you DO differently if it's up vs down? (If the answer is the same either way, delete it)
- What's the target and timeframe? (If no target, it's a decorative number)

NARRATIVE ARC in data presentations:
Structure your data story like a news article:
1. HEADLINE: The single most important finding ("Revenue missed plan by 12% in Q3")
2. LEAD: Context and cause ("Driven by a 25% drop in Tier 2 city GMV following competitor discounting")
3. BODY: Evidence and breakdown (charts, tables, segment analysis)
4. CONCLUSION: So what? ("Recommendation: Hold pricing, focus on loyalty program in affected cities")

Avoid "data dumps" — presenting data chronologically or alphabetically with no editorial judgment. The viewer's job is not to find the insight; your job is to present it clearly.`,
    code: `// CONCEPT 13: Data Visualization Principles

// Example 1: Chart type recommender based on data shape
function recommendChartType(dataDescription) {
  const {
    numVariables,
    variableTypes,   // 'continuous', 'categorical', 'time', 'geographic', 'ordinal'
    numCategories,
    goal             // 'compare', 'trend', 'distribution', 'relationship', 'composition', 'geographic'
  } = dataDescription;
  
  const recommendations = {
    compare: {
      rule: numCategories <= 8 ? 'Horizontal Bar Chart (sorted by value)' : 'Dot Plot or filtered bar chart',
      avoid: 'Pie chart (humans cannot compare angles accurately)',
      tip: 'Sort bars by value unless order has inherent meaning (months, ordinal scale)'
    },
    trend: {
      rule: numVariables <= 3 ? 'Line Chart' : 'Small Multiples (separate line charts)',
      avoid: 'Stacked bar chart for time series with many categories (spaghetti)',
      tip: 'Annotate key events directly on the line. Use reference lines for targets/averages.'
    },
    distribution: {
      rule: numVariables === 1 
        ? (numCategories <= 5 ? 'Box Plot' : 'Violin Plot or Histogram')
        : 'Scatter Plot with marginal histograms',
      avoid: 'Bar chart of mean only — hides the distribution shape',
      tip: 'Always show N (sample size). A distribution of 10 points vs 10,000 is very different.'
    },
    relationship: {
      rule: 'Scatter Plot',
      avoid: 'Line chart (implies time sequence), Correlation matrix for > 8 variables',
      tip: 'Add a regression line with confidence interval. Color a third variable if present.'
    },
    composition: {
      rule: numCategories <= 3 ? 'Pie Chart (only if relative size is the message)' : '100% Stacked Bar or Treemap',
      avoid: '3D pie (NEVER — perspective distorts proportions)',
      tip: 'Treemap for hierarchical composition. Waterfall chart for showing how components add up to a total.'
    },
    geographic: {
      rule: 'Choropleth Map (color by value) or Bubble Map (size by value)',
      avoid: '3D globe charts, misleading geographic projections',
      tip: 'Large areas (Rajasthan) will visually dominate even if low-value. Consider cartogram for population data.'
    }
  };
  
  const rec = recommendations[goal] || { rule: 'Unknown goal — describe what question you want to answer', avoid: '', tip: '' };
  
  return {
    recommendedChart: rec.rule,
    avoidChart: rec.avoid,
    designTip: rec.tip,
    colorGuidance: numCategories <= 2 
      ? 'Single highlight color for the important bar; gray for all others'
      : numCategories <= 7 
        ? 'Categorical palette (ColorBrewer qualitative scheme). Avoid rainbow.'
        : 'Too many categories for color encoding — use small multiples or aggregate smaller categories into "Other"',
    accessibilityNote: 'Test with Coblis colorblind simulator. Prefer orange/blue over red/green.'
  };
}

// Usage:
recommendChartType({ numVariables: 1, variableTypes: ['categorical'], numCategories: 12, goal: 'compare' });
// → Horizontal Bar Chart (sorted), avoid pie, too many categories for standard color palette


// Example 2: Detecting chart crimes programmatically
function auditChart(chartConfig) {
  const crimes = [];
  const suggestions = [];
  
  // Crime 1: Truncated Y-axis on bar chart
  if (chartConfig.type === 'bar' && chartConfig.yAxisMin && chartConfig.yAxisMin > 0) {
    crimes.push({
      crime: '🚨 TRUNCATED Y-AXIS',
      severity: 'HIGH',
      description: \`Bar chart Y-axis starts at \${chartConfig.yAxisMin} not 0. This makes differences look \${(chartConfig.yAxisMin / (chartConfig.yMax - chartConfig.yAxisMin) * 100 + 100).toFixed(0)}% larger than reality.\`,
      fix: 'Set yAxisMin = 0 for ALL bar charts. Use a line chart if you want to show variation within a narrow range.'
    });
  }
  
  // Crime 2: Dual Y-axis
  if (chartConfig.dualYAxis) {
    crimes.push({
      crime: '⚠️ DUAL Y-AXIS',
      severity: 'HIGH',
      description: 'Dual Y-axis allows arbitrary visual correlation/divergence by choosing axis scales.',
      fix: 'Use two separate side-by-side charts. Or index both metrics to 100 at the start date and plot on the same axis.'
    });
  }
  
  // Crime 3: 3D effects
  if (chartConfig.is3D) {
    crimes.push({
      crime: '🚨 3D CHART',
      severity: 'HIGH',
      description: '3D perspective distorts proportions. The "back" elements appear smaller than they are.',
      fix: 'Remove all 3D effects. There is never a valid reason for 3D in data visualization.'
    });
  }
  
  // Crime 4: Pie chart with too many slices
  if (chartConfig.type === 'pie' && chartConfig.numCategories > 4) {
    crimes.push({
      crime: '⚠️ PIE CHART OVERLOAD',
      severity: 'MEDIUM',
      description: \`Pie chart with \${chartConfig.numCategories} categories. Humans cannot compare angles accurately beyond 3-4 slices.\`,
      fix: 'Replace with a horizontal bar chart sorted by value. Add the actual percentages as labels.'
    });
  }
  
  // Crime 5: Too many lines
  if (chartConfig.type === 'line' && chartConfig.numLines > 5) {
    crimes.push({
      crime: '⚠️ SPAGHETTI CHART',
      severity: 'MEDIUM',
      description: \`Line chart with \${chartConfig.numLines} lines. Viewers cannot distinguish them.\`,
      fix: 'Use small multiples (one panel per line). Or show only the top 3-5 and aggregate the rest into "Other".'
    });
  }
  
  // Crime 6: Rainbow color palette
  if (chartConfig.colorPalette === 'rainbow' || chartConfig.colorPalette === 'jet') {
    crimes.push({
      crime: '⚠️ RAINBOW PALETTE',
      severity: 'MEDIUM',
      description: 'Rainbow/jet palettes imply false ordering and are terrible for colorblind viewers (8% of men).',
      fix: 'Use ColorBrewer palettes. Sequential: Blues/Greens. Diverging: RdBu/PiYG. Categorical: Set1/Paired.'
    });
  }
  
  return {
    chartType: chartConfig.type,
    crimesFound: crimes.length,
    crimes,
    overallScore: crimes.filter(c => c.severity === 'HIGH').length === 0
      ? (crimes.length === 0 ? '✅ No issues found' : '⚠️ Minor issues')
      : '🚨 Critical chart crimes detected'
  };
}


// Example 3: Data-ink ratio calculator (conceptual)
function dataInkAudit(chartElements) {
  // chartElements: {hasGridLines, has3DEffect, hasShadow, hasChartBorder, hasBackgroundColor,
  //                hasLegend, hasDirectLabels, numAnnotations, numDataPoints}
  
  const inkItems = [];
  
  if (chartElements.hasGridLines)       inkItems.push({ element: 'Grid lines', isDataInk: false, remove: 'Replace with light reference lines at meaningful values only (e.g., 0, target)' });
  if (chartElements.has3DEffect)        inkItems.push({ element: '3D effects', isDataInk: false, remove: 'Always remove — adds zero information, distorts proportions' });
  if (chartElements.hasShadow)          inkItems.push({ element: 'Shadows/gradients', isDataInk: false, remove: 'Remove — pure decoration' });
  if (chartElements.hasChartBorder)     inkItems.push({ element: 'Chart border', isDataInk: false, remove: 'Remove — the chart area is implied by axes' });
  if (chartElements.hasBackgroundColor) inkItems.push({ element: 'Colored background', isDataInk: false, remove: 'Use white or very light gray. Dark backgrounds require inverting all colors.' });
  if (chartElements.hasLegend && chartElements.hasDirectLabels) inkItems.push({ element: 'Legend (redundant)', isDataInk: false, remove: 'If you have direct labels, remove the legend — it forces eye movement back and forth' });
  
  const nonDataInkCount = inkItems.filter(i => !i.isDataInk).length;
  const dataInkRatio = 1 - (nonDataInkCount / (chartElements.numDataPoints + nonDataInkCount));
  
  return {
    dataInkRatio: dataInkRatio.toFixed(2),
    rating: dataInkRatio > 0.8 ? '✅ Excellent' : dataInkRatio > 0.6 ? '⚠️ Needs cleanup' : '🚨 Too cluttered',
    itemsToRemove: inkItems.filter(i => !i.isDataInk),
    tufteQuote: '"Above all else, show the data." — Edward Tufte'
  };
}


// Example 4: Actionable dashboard metric checker
function auditDashboardMetric(metric) {
  const issues = [];
  
  if (!metric.owner) issues.push('❌ No owner assigned — who is responsible for this number?');
  if (!metric.target) issues.push('❌ No target defined — how do you know if this is good or bad?');
  if (!metric.decisionRules) issues.push('❌ No decision rules — what do you DO differently based on this metric?');
  if (!metric.updateFrequency) issues.push('⚠️ No update frequency — how stale could this number be?');
  if (!metric.counterMetric) issues.push('⚠️ No counter-metric — could this be gamed without consequences?');
  
  // Check if it's a vanity metric
  const vanitySignals = [
    { signal: metric.canOnlyGrow, message: 'Cumulative metric that can only go up is a vanity metric' },
    { signal: !metric.actionableIfDown, message: 'No action planned if metric drops — why track it?' },
    { signal: metric.isAggregateCumulative, message: 'Total/all-time metrics are vanity — use rate or rolling window instead' }
  ];
  
  const vanityIssues = vanitySignals.filter(v => v.signal).map(v => \`⚠️ \${v.message}\`);
  
  return {
    metricName: metric.name,
    isActionable: issues.length === 0 && vanityIssues.length === 0,
    infrastructureIssues: issues,
    vanityMetricWarnings: vanityIssues,
    verdict: issues.length + vanityIssues.length === 0
      ? '✅ Actionable metric — keep on dashboard'
      : issues.length >= 3
        ? '🚨 Remove from dashboard or fix before adding'
        : '⚠️ Needs improvement before this metric drives decisions'
  };
}

// Example audit of common dashboard metrics:
auditDashboardMetric({
  name: 'Total Downloads All Time',
  owner: null,
  target: null,
  decisionRules: null,
  isAggregateCumulative: true,
  canOnlyGrow: true,
  actionableIfDown: false
});
// → 🚨 Remove from dashboard. Vanity metric. No owner. No target. Can never go down.


// Example 5: Dashboard hierarchy SQL — building a headline metric with context
/*
-- Pattern: Headline number → WoW/YoY context → segment breakdown
-- This structure maps directly to the 3-level dashboard hierarchy

WITH date_context AS (
  SELECT
    CURRENT_DATE() AS today,
    DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AS last_week_start,
    DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AS two_weeks_ago_start,
    DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) AS last_year_today
),
-- LEVEL 1: HEADLINE — the single number that summarizes everything
headline AS (
  SELECT
    'Week of ' || CAST(DATE_TRUNC(CURRENT_DATE(), WEEK) AS STRING) AS period,
    SUM(order_value_inr) / 1e5 AS revenue_lakhs,  -- in lakhs for readability
    COUNT(DISTINCT order_id) AS total_orders,
    COUNT(DISTINCT user_id) AS unique_customers
  FROM orders
  WHERE DATE(created_at) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND CURRENT_DATE()
    AND status = 'delivered'
),
-- LEVEL 2: CONTEXT — is this week good or bad vs reference periods?
wow_yoy AS (
  SELECT
    'This Week' AS period,
    SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN order_value_inr END) AS this_week,
    SUM(CASE WHEN DATE(created_at) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN order_value_inr END) AS last_week,
    SUM(CASE WHEN DATE(created_at) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) - 7 AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) THEN order_value_inr END) AS same_week_last_year
  FROM orders
  WHERE status = 'delivered'
    AND DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) - 7
),
-- LEVEL 3: DETAIL — segment breakdown for investigation
segment_breakdown AS (
  SELECT
    city_tier,
    COUNT(DISTINCT order_id) AS orders,
    SUM(order_value_inr) AS revenue,
    ROUND(SUM(order_value_inr) / SUM(SUM(order_value_inr)) OVER () * 100, 1) AS revenue_share_pct
  FROM orders o
  JOIN users u USING (user_id)
  WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND status = 'delivered'
  GROUP BY city_tier
)
SELECT * FROM headline;
SELECT *, ROUND((this_week - last_week) / last_week * 100, 1) AS wow_pct,
          ROUND((this_week - same_week_last_year) / same_week_last_year * 100, 1) AS yoy_pct FROM wow_yoy;
SELECT * FROM segment_breakdown ORDER BY revenue DESC;
*/`,
    bugs: `BUG 1: Truncated Y-axis hiding the true magnitude of a problem
SYMPTOM: Bar chart shows August revenue at bar height 2cm and September revenue at bar height 0.5cm. CEO declares "September was a disaster!" Post-meeting analysis reveals: August=₹98L, September=₹96L — a 2% decline. The Y-axis started at ₹90L, making a 2% decline look like an 80% decline.
ROOT CAUSE: Bar chart Y-axis was configured with a non-zero minimum (₹90L) in the BI tool. The heights of bars encode the visual "distance from zero" that viewers automatically interpret as the full value.
FIX: All bar charts MUST start at 0. This is not a style choice — it's about accurate encoding. If the range of variation is truly so narrow that a 0-baseline chart is uninformative, switch to a line chart (which encodes values as positions, not bar heights). A line chart can have non-zero axes without the same misleading effect.

BUG 2: Dual Y-axis chart creating illusory correlation
SYMPTOM: Dashboard shows DAU on left axis and Revenue on right axis on the same chart. Lines move perfectly together — stakeholders conclude "more DAU directly drives more revenue, it's clearly causal." Strategy is built around this. But investigation shows correlation is 0.12 on monthly data — the visual alignment was constructed by choosing axis scales.
ROOT CAUSE: The person who built the chart scaled both axes so they "line up" visually. This is done constantly in financial presentations to make a desired narrative look obvious. The visual alignment has zero statistical meaning.
FIX: Delete dual Y-axis charts from your BI tool. Use two separate charts side-by-side with the same time range. If you want to show a genuine relationship, use a scatter plot where time is not encoded visually.

BUG 3: Pie chart with 7 segments — nobody can read it
SYMPTOM: Weekly review slide shows a pie chart of "Revenue by Product Category" with 7 slices. Smallest slices are labeled 3.2%, 3.8%, 4.1% — visually identical. Key insight (accessories category grew from 3.2% to 8.5% in 3 months) is completely invisible. The CEO never notices.
ROOT CAUSE: Pie charts encode values as angles and areas — the least accurate visual channels after position and length. Humans cannot distinguish angle differences of < 5-7 degrees reliably, and cannot compare non-adjacent slices.
FIX: Use a horizontal bar chart, sorted by value (largest to smallest). The 8.5% accessories bar is visually clearly larger than the 3.2% bar from last month. Add YoY delta labels directly on bars. The insight becomes unmissable.

BUG 4: Rainbow color palette that encodes false order
SYMPTOM: A heatmap uses a rainbow/jet color palette (blue→cyan→green→yellow→red) to show conversion rates from 0% to 20%. Users assume yellow means "medium" and red means "high" — which is correct. But red also means "danger/bad" in every other context. Stakeholders panic seeing red values that are actually the BEST performing segments (highest conversion).
ROOT CAUSE: Rainbow palettes are perceptually non-uniform and carry cultural meaning (red = bad, green = good) that conflicts with the data. For sequential data (0 to 20%), the right palette is a single-hue sequential scale (light blue → dark blue), where darkness reliably encodes magnitude without misleading cultural connotations.
FIX: For values where higher = better: single-hue sequential (Blues, Greens). For values where there's a meaningful center (growth rate from -20% to +20%): diverging scale (Red = negative, White = zero, Blue = positive). For categorical data with no order: qualitative ColorBrewer palette. Never use rainbow/jet.

BUG 5: Reporting 50 metrics with no hierarchy — nobody knows what matters
SYMPTOM: Weekly business review has a 25-slide deck with 50+ charts. Attendees spend the meeting asking "what does this mean?" and "is this good?" The meeting runs over, and the one critical insight (new user activation rate dropped 8pp) is on slide 19 in a table. No action is taken because time runs out.
ROOT CAUSE: The dashboard is a data dump, not a communication tool. Every metric is treated with equal visual weight. There is no editorial judgment about what matters most.
FIX: Implement the 3-level hierarchy: (1) Slide 1 = ONE headline metric with traffic light status and one-sentence explanation. (2) Slides 2-4 = 3-5 context metrics that explain the headline. (3) Appendix = all supporting detail for those who want to investigate. The CEO's job should be to react to the headline, not to find it.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A bar chart shows 3 months of revenue:
- Jan: bar height represents ₹95.2L (Y-axis starts at ₹94L, ends at ₹96L)
- Feb: bar height represents ₹94.1L
- Mar: bar height represents ₹95.8L

A viewer looks at the chart and says "February was terrible — revenue was barely positive!"
How many times taller is the January bar vs the February bar in this chart?
What is the actual percentage difference in revenue between January and February?
What should the Y-axis minimum be?

Answer: Jan bar visual height = 95.2 - 94 = 1.2 units. Feb bar = 94.1 - 94 = 0.1 units. Jan bar is 12x taller in the chart despite being only (95.2-94.1)/94.1 = 1.2% higher in revenue. The chart makes a 1.2% difference look like a 12x difference. Y-axis should start at 0.

CHALLENGE 2 — FIX THE BUG:
This BI tool configuration produces a misleading chart. Identify all 4 problems:
\`\`\`json
{
  "chartType": "bar3D",
  "yAxisMin": 50,
  "yAxisMax": 100,
  "colorPalette": "rainbow",
  "numCategories": 9,
  "showLegend": true,
  "showDirectLabels": false,
  "title": "Revenue by State (% of Target)",
  "dualYAxis": false
}
\`\`\`

Problems: (1) bar3D — 3D distorts proportions, use flat bar; (2) yAxisMin=50 — truncated axis for bar chart, must start at 0; (3) rainbow colorPalette — for 9 states with no meaningful order, use qualitative palette (Set1/Pastel); (4) showLegend=true with showDirectLabels=false — force the eye to scan legend, then scan bars; reverse: use direct labels and remove legend.

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a dashboardNarrative(metrics) function that takes weekly metrics and generates a structured narrative:
1. Identifies the ONE most significant change (biggest absolute delta vs last week)
2. Determines if the change is positive, negative, or neutral for the business
3. Checks if the change is within seasonal norms (compare to same week last year)
4. Returns a 3-sentence headline narrative: (1) what happened, (2) is it expected seasonally, (3) what to watch next
5. Categorizes each metric as HEADLINE / CONTEXT / DETAIL based on its weekly change magnitude
Test: weekly_orders +8%, weekly_revenue +3%, new_user_activations -15%, d7_retention unchanged`,
    summary: `A chart is a communication tool, not a decoration — and every design choice either helps or hurts the viewer's ability to extract the correct insight quickly. Start bars at zero, kill dual axes, ban all 3D, choose chart types that match the relationship being shown, and build dashboards in a headline→context→detail hierarchy so stakeholders can get the key insight in 5 seconds if they need to.`
  },

  {
    id: 14,
    title: "Machine Learning for Analysts",
    tag: "WHEN TO USE A MODEL, WHEN NOT TO",
    color: "#EF233C",
    tldr: `Analysts don't need to build ML models from scratch, but they need to understand when ML helps vs when it's overkill, how to segment users with RFM and clustering, what precision/recall/AUC-ROC actually mean, and — critically — when a SQL query or a simple rule beats a complex model. The biggest ML mistake analysts make is applying a model when the problem doesn't need one.`,
    problem: `Sanjay builds a churn prediction model. It achieves 95% accuracy. He deploys it to target at-risk users with re-engagement campaigns. The campaigns have no effect.

Investigation reveals: 93% of users don't churn in any given month. A model that predicts "nobody will churn" for everyone would achieve 93% accuracy while being completely useless. His model learned to say "not churn" for almost everyone. The accuracy metric was misleading because the classes are highly imbalanced.

Or: A data team spends 3 months building an ML model to predict which users will upgrade to premium. The model achieves AUC-ROC of 0.82. A product manager then asks: "What if we just target everyone who's been active for > 30 days AND viewed the pricing page > 2 times?" This simple rule captures 78% of the conversions the ML model would have captured — with zero model training, zero infrastructure, and full interpretability.

Or: An analyst runs K-means clustering on user behavioral data and gets 5 clusters. She labels them: "Power users," "Casual users," "Dormant users," etc. She presents this to the product team. The product manager asks: "What's the difference between cluster 2 and cluster 3? Why are they separate?" The analyst can't explain it — the clusters were defined by an algorithm, not by business logic. The segments are mathematically sound but operationally unusable.

Or: A model is trained on historical data and achieves excellent performance. It's deployed in production. 6 months later, its predictions become terrible. Nobody notices for 3 months because nobody set up monitoring. The model experienced concept drift — the relationship between features and the target changed as user behavior evolved.

ML is a powerful tool that can genuinely help analytics. But most analysts apply it wrong — using it to solve problems that don't need it, evaluating it with the wrong metrics, and failing to maintain it after deployment.`,
    analogy: `THE RESTAURANT KITCHEN ANALOGY for ML types:

A restaurant kitchen has different tools for different jobs. Using the wrong tool doesn't just give bad results — it makes the job harder.

REGRESSION (predicting a number) = An oven. You put in ingredients (features), you get out a temperature reading (continuous value). "Given this user's behavior, predict their LTV for the next 90 days." "Given last week's metrics, predict next week's revenue."

CLASSIFICATION (predicting a category) = A taster/sorter. You put in a dish, it comes out sorted into categories: "this is a good dessert" or "this is not a good dessert." "Will this user churn? Yes or No." "Will this user upgrade? Yes/No." The output is a category, not a number (though the model also gives you a probability, which you then threshold).

CLUSTERING (finding groups without labels) = A head chef who looks at the full menu and groups dishes by similarity without being told the categories. "These 3 dishes all use similar spice profiles — they're a group." K-means does this for users: "Find me K natural groupings in the data." You don't tell it what groups to find — it discovers them.

RFM SEGMENTATION = A loyalty program that a smart manager designed without any algorithms. R=Recency (how recently did you visit?), F=Frequency (how often do you come?), M=Monetary (how much do you spend?). Score each dimension 1-5, combine the scores, define meaningful buckets ("Champions" = high R + high F + high M). This is a business-logic-driven segmentation. It's interpretable. Every stakeholder understands "Champions vs At-Risk vs Lost."

TRAIN/TEST SPLIT = Recipe testing in a test kitchen before putting it on the main menu. You develop the recipe (train) on the test kitchen's ingredients. Then you test it with fresh ingredients (test set) to see if it actually works in the real world. If you taste-test using the same ingredients you developed with, you'll overfit to those specific ingredients and the dish will taste different when using different ones.

OVERFITTING = A chef who memorizes every single dish ordered by the 20 regulars. He's perfect with those 20 people. But when a new customer orders "something like a chicken curry but not too spicy," he's helpless — he only knows the exact 20 dishes he memorized, not the underlying principles of Indian cooking.`,
    deep: `ML CONCEPTS FOR ANALYSTS — WHAT YOU ACTUALLY NEED TO KNOW

REGRESSION vs CLASSIFICATION vs CLUSTERING:

REGRESSION: Predicting a continuous value.
Examples in analytics: LTV prediction, demand forecasting, price optimization, estimated time of delivery.
Common algorithms: Linear regression (baseline), Random Forest Regressor, Gradient Boosting (XGBoost/LightGBM).
Evaluation: MAE (Mean Absolute Error), RMSE (Root Mean Squared Error), MAPE (Mean Absolute Percentage Error).
MAPE = Average of |actual - predicted| / actual × 100%
Good MAPE benchmark: <10% for business forecasting (though this depends heavily on what you're predicting).

CLASSIFICATION: Predicting which category something belongs to.
Examples: Churn prediction (will churn / won't churn), fraud detection (fraud / not fraud), lead scoring (high-intent / low-intent).
Common algorithms: Logistic regression (interpretable baseline), Random Forest, XGBoost, neural networks.
Binary classification outputs a PROBABILITY (0 to 1). You choose a THRESHOLD to convert to a class.
Threshold = 0.5 by default. But you can tune this based on business cost:
- Fraud detection: set threshold low (0.2) — prefer catching more fraud even at cost of false positives
- Premium upsell campaign: set threshold high (0.7) — only contact users who are very likely to convert

CLUSTERING: Finding natural groups in data without predefined labels.
Examples: User segmentation, product grouping, anomaly detection.
K-means: assign K cluster centers. Repeatedly assign each point to its nearest center and recompute centers.
Output: cluster assignments for each data point.
Key parameter: K (number of clusters). Use elbow method (plot inertia vs K, find the "elbow") or silhouette score.
Critical limitation: K-means assumes clusters are roughly spherical and similar in size. DBSCAN is better for irregular shapes.

RFM SEGMENTATION — THE ANALYST'S BEST FRIEND:
Recency (R): Days since last purchase (lower = better, user is more recent)
Frequency (F): Number of purchases in last 90 days (higher = better)
Monetary (M): Total spend in last 90 days (higher = better)

Scoring: Rank each user 1-5 for each dimension using quintiles.
R=5: purchased in last 7 days. R=1: purchased 90+ days ago.

RFM Segments (business-defined, not algorithm-defined):
Champions:    R=5, F=5, M=5 — Best users. Reward them.
Loyal Users:  R=3-5, F=3-5 — Buy regularly. Upsell.
At-Risk:      R=1-2, F=3-5 — Used to buy often, now gone quiet. Re-engage urgently.
Hibernating:  R=1-2, F=1-2 — Low activity, low spend. Win-back campaign.
Lost:         R=1, F=1, M=1 — Gone. Expensive to reactivate.
New Users:    R=5, F=1 — Just bought. Onboard well. Potential champions.
Promising:    R=4-5, F=1-2 — Recent but infrequent. Convert to loyal.

Why RFM often beats ML for segmentation:
1. Business-interpretable: "Champions" means something to a PM. "Cluster 3" doesn't.
2. Actionable: Different campaign for each segment.
3. Stable: Doesn't change unpredictably when retrained.
4. Auditable: You can explain exactly why a user is in a segment.

TRAIN/TEST SPLIT AND OVERFITTING:
The machine learning workflow:
1. Split data: 70% train, 15% validation (hyperparameter tuning), 15% test (held-out final evaluation)
2. Train model on training set only
3. Evaluate on test set — this is the estimate of true generalization performance
4. NEVER use test set during development (data leakage)

Overfitting signs:
- Training accuracy >> Test accuracy (e.g., 98% train, 72% test — model memorized training data)
- Model performance degrades rapidly as time passes after training (concept drift)
- Model has very high complexity (100+ features, deep trees) on a small dataset (< 10,000 rows)

Time-based splitting for temporal data (CRITICAL):
WRONG: Random 70/30 split on historical data
RIGHT: First N months = train, last M months = test
Reason: In real business applications, you train on past data and predict future. Random splits allow "future data" to inform "past predictions" — training on data from later periods then testing on earlier periods.

Cross-validation: Instead of one train/test split, use K-fold:
Split data into K equal folds. For each fold: train on K-1 folds, test on the remaining fold.
Average performance across K folds = more stable estimate of true performance.
For time series: use expanding window cross-validation (never use future to predict past).

MODEL EVALUATION — THE FULL PICTURE:

CONFUSION MATRIX for binary classification:
                  Predicted Positive   Predicted Negative
Actual Positive:  True Positive (TP)   False Negative (FN) — model missed it
Actual Negative:  False Positive (FP)  True Negative (TN) — model correctly said no

ACCURACY = (TP + TN) / Total — MISLEADING when classes are imbalanced
PRECISION = TP / (TP + FP) — "Of users predicted to churn, what % actually did?"
RECALL (Sensitivity) = TP / (TP + FN) — "Of all users who actually churned, what % did we catch?"
F1 SCORE = 2 × (Precision × Recall) / (Precision + Recall) — harmonic mean of both

When to optimize Precision vs Recall:
High Precision (low FP): When false alarms are costly. Spam filtering (marking real emails as spam).
High Recall (low FN): When missing a case is costly. Cancer screening (missing a cancer case), fraud detection.

AUC-ROC (Area Under the ROC Curve):
ROC curve: plots True Positive Rate (Recall) vs False Positive Rate at all threshold values.
AUC = Area under this curve. Ranges from 0.5 (random guessing) to 1.0 (perfect).
AUC = probability that a randomly chosen positive example ranks higher than a randomly chosen negative.
AUC > 0.8: Good. AUC > 0.9: Excellent. AUC = 0.5: Useless.
AUC is threshold-independent — it measures overall discrimination ability regardless of threshold choice.

FEATURE ENGINEERING for analysts:
Raw data rarely goes directly into ML models. Feature engineering = transforming raw data into useful signals.

Common transformations:
- Log transformation for skewed continuous features (revenue, counts)
- Age from date: days since signup → numeric
- Binning: convert continuous to categorical (days_since_order → recency bucket: 0-7, 7-30, 30-90)
- Interaction features: session_count × avg_session_duration = total time spent
- Rolling aggregates: avg_order_value_last_30d, max_session_length_last_7d
- Boolean flags: has_ever_made_a_purchase, has_used_feature_x
- Time-based features: day_of_week, is_weekend, days_since_last_promo

Data leakage is the #1 failure mode:
If you include features that are computed using future information, the model will appear to work perfectly in testing but fail in production.
Example: Including "total lifetime orders" when predicting whether someone will make a purchase in the next 7 days — this uses information that includes orders that happened AFTER the prediction date.
Always use features computed from data that would be available AT THE TIME of prediction.

WHEN NOT TO USE ML:
1. You don't have enough data: < 1,000 labeled examples for classification.
2. A simple rule works almost as well: IF days_since_order > 30 AND lifetime_orders > 3, THEN at_risk.
3. Interpretability is required: regulators, legal, or stakeholders need to understand why.
4. You can't maintain the model: retraining, monitoring, and updating requires ongoing investment.
5. The data distribution changes rapidly: model will be stale almost immediately.
6. The problem is actually a query problem: SQL with the right joins answers the business question directly.
7. The model output doesn't connect to a clear action: "interesting but so what?"

The 80/20 rule of ML in analytics: 80% of business analytics value comes from:
well-structured SQL queries, cohort analysis, funnel analysis, RFM segmentation, and clear dashboards.
The last 20% comes from sophisticated ML. Start with the simple things.`,
    code: `// CONCEPT 14: ML for Analysts

// Example 1: RFM segmentation — the business-logic-driven approach
function computeRFM(transactions, analysisDate = new Date()) {
  // transactions: [{userId, orderDate: Date, orderValueInr: number}]
  // Group by user
  const userMetrics = {};
  
  transactions.forEach(t => {
    if (!userMetrics[t.userId]) {
      userMetrics[t.userId] = { orders: [], totalSpend: 0 };
    }
    userMetrics[t.userId].orders.push(new Date(t.orderDate));
    userMetrics[t.userId].totalSpend += t.orderValueInr;
  });
  
  // Compute R, F, M for each user
  const rfmData = Object.entries(userMetrics).map(([userId, data]) => {
    const sortedDates = data.orders.sort((a, b) => b - a);
    const lastOrderDate = sortedDates[0];
    const recencyDays = Math.floor((analysisDate - lastOrderDate) / (1000 * 60 * 60 * 24));
    const frequency = data.orders.length;
    const monetary = data.totalSpend;
    
    return { userId, recencyDays, frequency, monetary };
  });
  
  // Score each dimension using quintile ranks (1-5)
  const scoreQuintile = (values, ascending = true) => {
    // ascending = true means lower value = better score (for recency: fewer days = better)
    const sorted = [...values].sort((a, b) => a - b);
    const quintileSize = sorted.length / 5;
    return values.map(v => {
      const rank = sorted.indexOf(v);
      const quintile = Math.min(5, Math.floor(rank / quintileSize) + 1);
      return ascending ? 6 - quintile : quintile;  // flip for ascending: 1=best, 5=worst
    });
  };
  
  const recencies = rfmData.map(u => u.recencyDays);
  const frequencies = rfmData.map(u => u.frequency);
  const monetaries = rfmData.map(u => u.monetary);
  
  const rScores = scoreQuintile(recencies, true);   // lower recency days = score 5
  const fScores = scoreQuintile(frequencies, false); // higher frequency = score 5
  const mScores = scoreQuintile(monetaries, false);  // higher monetary = score 5
  
  // Assign business segments based on R, F, M scores
  const assignSegment = (r, f, m) => {
    if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
    if (r >= 3 && f >= 3) return 'Loyal Users';
    if (r >= 4 && f <= 2) return 'Promising (New or Returning)';
    if (r <= 2 && f >= 3 && m >= 3) return '🚨 At-Risk (High Value, Gone Quiet)';
    if (r <= 2 && f <= 2 && m >= 3) return 'Cant Lose (Were Big Spenders)';
    if (r <= 2 && f <= 2 && m <= 2) return 'Hibernating';
    if (r >= 4 && f === 1) return 'New Customers';
    return 'Needs Attention';
  };
  
  return rfmData.map((user, i) => ({
    userId: user.userId,
    recencyDays: user.recencyDays,
    frequency: user.frequency,
    monetary: \`₹\${user.monetary.toLocaleString('en-IN')}\`,
    rScore: rScores[i],
    fScore: fScores[i],
    mScore: mScores[i],
    rfmScore: \`\${rScores[i]}\${fScores[i]}\${mScores[i]}\`,
    segment: assignSegment(rScores[i], fScores[i], mScores[i])
  }));
}

// RFM SQL implementation — production-ready
/*
WITH user_rfm_raw AS (
  SELECT
    user_id,
    -- Recency: days since last order (lower = better)
    DATE_DIFF(CURRENT_DATE(), MAX(DATE(created_at)), DAY) AS recency_days,
    -- Frequency: number of orders in last 90 days
    COUNT(DISTINCT CASE WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) THEN order_id END) AS frequency_90d,
    -- Monetary: total spend in last 90 days
    SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) THEN order_value_inr ELSE 0 END) AS monetary_90d
  FROM orders
  WHERE status = 'delivered'
  GROUP BY user_id
),
rfm_scored AS (
  SELECT
    user_id, recency_days, frequency_90d, monetary_90d,
    -- Score 1-5 using NTILE (quintile buckets)
    6 - NTILE(5) OVER (ORDER BY recency_days ASC)  AS r_score,  -- lower days = higher score
    NTILE(5) OVER (ORDER BY frequency_90d ASC)      AS f_score,
    NTILE(5) OVER (ORDER BY monetary_90d ASC)       AS m_score
  FROM user_rfm_raw
)
SELECT
  user_id, recency_days, frequency_90d,
  ROUND(monetary_90d) AS monetary_90d_inr,
  r_score, f_score, m_score,
  CONCAT(r_score, f_score, m_score) AS rfm_code,
  CASE
    WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
    WHEN r_score >= 3 AND f_score >= 3                  THEN 'Loyal Users'
    WHEN r_score >= 4 AND f_score <= 2                  THEN 'Promising'
    WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At-Risk'
    WHEN r_score <= 2 AND f_score <= 2 AND m_score >= 3 THEN 'Cannot Lose Them'
    WHEN r_score <= 2 AND f_score <= 2 AND m_score <= 2 THEN 'Hibernating'
    WHEN r_score >= 4 AND f_score = 1                   THEN 'New Customers'
    ELSE 'Needs Attention'
  END AS rfm_segment
FROM rfm_scored;
*/


// Example 2: Confusion matrix and evaluation metrics
function evaluateClassifier(predictions) {
  // predictions: [{actual: 0|1, predicted: 0|1, probability: 0-1}]
  
  let tp = 0, fp = 0, fn = 0, tn = 0;
  
  predictions.forEach(p => {
    if (p.actual === 1 && p.predicted === 1) tp++;
    else if (p.actual === 0 && p.predicted === 1) fp++;
    else if (p.actual === 1 && p.predicted === 0) fn++;
    else tn++;
  });
  
  const total = tp + fp + fn + tn;
  const positiveTotal = tp + fn;  // all actual positives
  
  const accuracy  = (tp + tn) / total;
  const precision = tp / (tp + fp) || 0;
  const recall    = tp / (tp + fn) || 0;
  const f1        = 2 * precision * recall / (precision + recall) || 0;
  const fpr       = fp / (fp + tn) || 0;  // false positive rate
  
  // Imbalance check
  const positiveRate = positiveTotal / total;
  const baselineAccuracy = Math.max(positiveRate, 1 - positiveRate);
  
  return {
    confusionMatrix: { tp, fp, fn, tn },
    metrics: {
      accuracy: (accuracy * 100).toFixed(1) + '%',
      precision: (precision * 100).toFixed(1) + '%',
      recall: (recall * 100).toFixed(1) + '%',
      f1Score: f1.toFixed(3),
      falsePositiveRate: (fpr * 100).toFixed(1) + '%'
    },
    contextualAnalysis: {
      positiveClassRate: (positiveRate * 100).toFixed(1) + '%',
      baselineAccuracy: (baselineAccuracy * 100).toFixed(1) + '%',
      accuracyVsBaseline: accuracy > baselineAccuracy
        ? \`✅ Model outperforms baseline by \${((accuracy - baselineAccuracy) * 100).toFixed(1)}pp\`
        : \`🚨 Model DOES NOT outperform trivial baseline! Check for class imbalance.\`
    },
    businessInterpretation: {
      precision: \`Of every 100 users we predict will churn, \${(precision * 100).toFixed(0)} actually do churn.\`,
      recall: \`Of every 100 users who actually churned, we caught \${(recall * 100).toFixed(0)} of them.\`,
      missedChurners: fn,
      falseAlarms: fp
    }
  };
}


// Example 3: Elbow method for choosing K in K-means (simplified)
function elbowMethod(inertiaByK) {
  // inertiaByK: [{k: 1, inertia: 50000}, {k: 2, inertia: 35000}, ...]
  // Inertia = sum of squared distances to nearest cluster center (lower = more compact clusters)
  
  // Find the "elbow" = point where adding more clusters gives diminishing returns
  const improvements = inertiaByK.slice(1).map((point, i) => ({
    k: point.k,
    inertia: point.inertia,
    inertiaReduction: inertiaByK[i].inertia - point.inertia,
    reductionRate: (inertiaByK[i].inertia - point.inertia) / inertiaByK[i].inertia
  }));
  
  // Find where marginal improvement drops below 15% (rule of thumb)
  const elbowPoint = improvements.find(p => p.reductionRate < 0.15);
  const recommendedK = elbowPoint ? elbowPoint.k - 1 : improvements[improvements.length - 1].k;
  
  return {
    analysis: improvements,
    recommendedK,
    interpretation: \`K=\${recommendedK} appears to be the elbow point — adding more clusters beyond this gives diminishing improvement in cluster compactness.\`,
    caveat: 'Always validate cluster interpretability with business stakeholders. K with best math score may not produce the most actionable segments.'
  };
}


// Example 4: Simple rule vs ML — when to skip the model
function simpleRuleVsML(users) {
  // Evaluate a simple business rule against a hypothetical ML model
  // Rule: "likely to churn if: no order in 21+ days AND lifetime orders <= 3"
  
  const CHURN_THRESHOLD_DAYS = 21;
  const CHURN_THRESHOLD_ORDERS = 3;
  
  let ruleTP = 0, ruleFP = 0, ruleFN = 0, ruleTN = 0;
  
  users.forEach(user => {
    const rulePredictsChurn = user.daysSinceOrder >= CHURN_THRESHOLD_DAYS
                              && user.lifetimeOrders <= CHURN_THRESHOLD_ORDERS;
    
    if (rulePredictsChurn && user.actuallyChurned) ruleTP++;
    else if (rulePredictsChurn && !user.actuallyChurned) ruleFP++;
    else if (!rulePredictsChurn && user.actuallyChurned) ruleFN++;
    else ruleTN++;
  });
  
  const rulePrecision = ruleTP / (ruleTP + ruleFP);
  const ruleRecall = ruleTP / (ruleTP + ruleFN);
  
  return {
    simpleRule: {
      description: \`days_since_order >= \${CHURN_THRESHOLD_DAYS} AND lifetime_orders <= \${CHURN_THRESHOLD_ORDERS}\`,
      precision: (rulePrecision * 100).toFixed(1) + '%',
      recall: (ruleRecall * 100).toFixed(1) + '%',
      usersTargeted: ruleTP + ruleFP,
      advantages: ['Fully interpretable', 'No training required', 'Instant deployment', 'No maintenance', 'Auditable']
    },
    recommendation: rulePrecision > 0.5 && ruleRecall > 0.4
      ? '✅ Simple rule is good enough — do not build an ML model. Ship the rule in SQL.'
      : '⚠️ Simple rule has poor precision or recall — ML model may add value. Justify the complexity cost.'
  };
}`,
    bugs: `BUG 1: Using accuracy as the primary metric for an imbalanced classification problem
SYMPTOM: Churn prediction model reports 96% accuracy. Team celebrates and deploys re-engagement campaigns to all "predicted churners." Campaign has 3% click rate — worse than a random email. Investigation shows model predicted "no churn" for 96% of users because only 4% actually churn.
ROOT CAUSE: With 4% positive rate, a model that always says "no churn" achieves 96% accuracy without learning anything. Accuracy is completely uninformative when classes are imbalanced. The model learned the trivial "always say negative" strategy.
FIX: For imbalanced problems (where positive class is <20%), use Precision, Recall, F1, or AUC-ROC as your primary metric — never accuracy alone. During training, use class weights (weight positive class by 1/positive_rate) to make the model pay more attention to the minority class. Also try SMOTE oversampling of the minority class.

BUG 2: Data leakage from using future information in features
SYMPTOM: ML model predicts 30-day churn with AUC=0.97 in validation. After deployment, AUC drops to 0.61. The gap is massive.
ROOT CAUSE: The feature "total_lifetime_orders" was included as a feature. When training, this value includes orders made during the 30-day prediction window — i.e., for churners (who make fewer future orders), the feature is lower. The model learned "users with fewer total orders churn more" — which is trivially true because churned users, by definition, made fewer future orders.
FIX: For any temporal prediction (will X happen in the next 30 days?), all features must be computed using ONLY data available BEFORE the prediction date. Create a feature computation pipeline with a strict "feature date" (the moment of prediction), and audit every feature to ensure no future data is included. Temporal train/test splits help detect this: if validation AUC >> test AUC (where test is truly future data), you have leakage.

BUG 3: K-means clustering on unscaled features
SYMPTOM: K-means produces clusters where one cluster = all high-revenue users, another = all low-revenue users, and the behavioral features (sessions, retention) are completely ignored. The clusters are pure revenue buckets, not behavioral segments.
ROOT CAUSE: K-means uses Euclidean distance. Revenue in rupees (0 to ₹50,000) completely dominates session count (0 to 50) because the scale difference is 1,000x. The algorithm effectively ignores session count because moving ₹1,000 in revenue space is a much larger "distance" than any behavioral metric change.
FIX: Always standardize (z-score normalize) or min-max scale all features before K-means. After scaling: revenue and session count are on the same 0-1 or -3 to +3 scale. Consider also whether all features SHOULD have equal weight — if you care more about behavioral features, use weighted scaling.

BUG 4: Using ML when a simple SQL rule would work just as well
SYMPTOM: Data science team spends 6 weeks building, tuning, and deploying a lead scoring model. Model achieves F1=0.72. After deployment, the sales team doesn't trust it because they can't explain why a specific lead got a score of 0.67.
ROOT CAUSE: The business problem was to identify "high-value B2B leads who are likely to convert." Analysis of the model's feature importances reveals: 3 features explain 85% of variance — company size (>500 employees), industry (fintech/ecommerce), and number of product page views (>5). A simple rule would have captured nearly all the value with full interpretability.
FIX: Before building any ML model, try to solve the problem with a simple rule (IF A AND B AND C THEN high-priority). Measure the rule's precision/recall. Only build an ML model if: (a) the rule achieves poor performance AND (b) you have the data, infrastructure, and maintenance capacity for a model. In this case, the rule would have saved 5 weeks of work.

BUG 5: Model deployed without monitoring, silently degrading (concept drift)
SYMPTOM: A recommendation model was deployed 8 months ago. CTR was 12% at launch. Current CTR is 6.5%. Nobody noticed until a quarterly review because there was no monitoring.
ROOT CAUSE: Concept drift — the relationship between user features and their preferences changed over time (new product categories launched, competitor entered market, user base expanded to new demographics). The model was still serving recommendations from its training distribution which no longer matched current user behavior.
FIX: All deployed ML models need: (1) Performance monitoring dashboard: track model's primary metric (CTR, precision, recall) weekly. (2) Data drift detection: monitor the distribution of input features. If distributions shift significantly, retrain. (3) Retraining schedule: at minimum, retrain quarterly. (4) Champion/challenger testing: always run a small % of traffic through a newly trained model before full deployment. Never deploy a model and leave it unmonitored.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
A fraud detection model has these results:
Total transactions: 100,000. Actual frauds: 500 (0.5%).
Model predictions: Predicted fraud: 600. True Positives: 400.

Calculate: (a) False Positives, (b) False Negatives, (c) Accuracy, (d) Precision, (e) Recall.
Is 99.5% accuracy a useful metric here? Why or why not?

Answer: FP = 600-400 = 200. FN = 500-400 = 100. TN = 100,000 - 500 - 200 = 99,300. Accuracy = (400+99,300)/100,000 = 99.7%. Precision = 400/600 = 66.7%. Recall = 400/500 = 80%. Accuracy is misleading — a model that flags nothing would be 99.5% accurate! What matters: Recall (we catch 80% of frauds — 100 real frauds missed) and Precision (33% of fraud alerts are false alarms — investigate cost of false positives).

CHALLENGE 2 — FIX THE BUG:
An RFM analysis has a problem with how it assigns "Champions":
\`\`\`sql
SELECT user_id,
  NTILE(5) OVER (ORDER BY days_since_order DESC) AS r_score,  -- BUG!
  NTILE(5) OVER (ORDER BY order_count ASC) AS f_score,        -- BUG!
  NTILE(5) OVER (ORDER BY total_spend ASC) AS m_score
FROM user_summary
\`\`\`
Two bugs: (1) R score ORDER should be ASC (fewer days = better = higher score), but NTILE(5) gives rank 1 to smallest values — so we need either DESC ordering OR we subtract from 6. (2) F score ORDER should give highest frequency the highest score — needs DESC, not ASC.

FIX:
r_score: 6 - NTILE(5) OVER (ORDER BY days_since_order ASC) — fewer days = lower rank = then we flip to 5
OR: NTILE(5) OVER (ORDER BY days_since_order DESC)
f_score: NTILE(5) OVER (ORDER BY order_count DESC)
m_score: NTILE(5) OVER (ORDER BY total_spend DESC)

CHALLENGE 3 — BUILD FROM SCRATCH:
Build a modelVsRuleComparison(labeledData, ruleFunction, modelProbabilities, threshold=0.5) that:
1. Evaluates the rule function on the labeled data
2. Evaluates the ML model (using probabilities and threshold) on the same data
3. Computes Precision, Recall, F1 for both
4. Computes the "value add" of the model over the rule: (model_F1 - rule_F1) / rule_F1
5. Returns a recommendation: if value_add < 20%, recommend using the rule; else recommend the model
6. Includes an interpretability score: rules always = 10/10, tree models = 6/10, neural nets = 2/10`,
    summary: `ML is a tool, not a destination — and for most analytics problems, a well-structured SQL query, an RFM segmentation, or a simple business rule delivers 80% of the value with 10% of the complexity. When you do use ML, evaluate with Precision/Recall/AUC-ROC (not accuracy), prevent data leakage through strict temporal splits, and always monitor model performance after deployment because concept drift is inevitable.`
  },

  {
    id: 15,
    title: "The Modern Analytics Stack & Data Trust",
    tag: "HOW RELIABLE NUMBERS ACTUALLY GET MADE",
    color: "#3A86FF",
    tldr: `Data doesn't just "exist" — it flows through a carefully engineered pipeline from source systems through ingestion, warehousing, transformation, and serving layers before it reaches your dashboard. Understanding this stack is the difference between an analyst who says "the numbers show X" and one who says "I can tell you exactly where X came from, what assumptions were made, and why you can trust it." Data trust is earned through lineage, quality checks, and a single source of truth.`,
    problem: `Vikram presents Q3 revenue to the board. The CFO says "that's not what my Excel model shows." The Head of Sales says "our CRM shows different numbers." The Head of Product says "our dashboard shows something different again." Three different people, three different numbers, all "correct" from their respective data sources. The board has no idea what to believe.

This is the data trust crisis — and it's the default state at most companies. Without a single source of truth, every team builds their own numbers from their own data, with their own definitions and filters. All are "accurate" in some sense and none are comparable.

Or: An analyst runs a critical query and gets results in 2 minutes. She uses those results in a board presentation. Later that day, a data engineer notices the ETL pipeline broke 3 days ago. The numbers in the board presentation were based on stale, 3-day-old data. The analyst had no idea.

Or: A company migrates their payment system. Revenue numbers in the data warehouse suddenly drop 40% for 2 weeks. Engineers fix the pipeline bug. But nobody knows which dashboards, reports, or models were affected. There's no lineage tracking. The fix takes 3 weeks instead of 3 days.

Or: A "data quality check" catches that 15% of user IDs in the analytics database don't match any user in the production database. Investigation reveals a data engineering bug from 6 months ago that introduced ghost user IDs. Six months of cohort analysis, retention metrics, and LTV models are potentially incorrect.

Without understanding the analytics stack, you can't diagnose these problems, you can't prevent them, and you can't help engineers fix them. Stack literacy is not optional for a serious data analyst.`,
    analogy: `THE WATER SUPPLY SYSTEM ANALOGY:

Think of your data like water delivered to your home. You turn on the tap and water comes out. But you don't think about the entire system that made that possible — source, treatment, pipes, pressure. When the tap runs dry or the water is brown, you need to know the system.

DATA SOURCES = Natural water sources (rivers, groundwater, rainfall).
Your raw data comes from: your app's production database (PostgreSQL, MySQL), your mobile app's event tracking (Firebase, Mixpanel), your payment system (Stripe, Razorpay), your CRM (Salesforce), third-party APIs.
These sources are messy, inconsistent, and designed for operational use — not analytics.

INGESTION = Water pumps. Extracting water from the source and moving it to treatment.
Your data tools: Fivetran, Airbyte, Stitch — they copy data from source systems to your data warehouse on a schedule (hourly, daily). Like pumps, they need to be monitored: is the pump running? Is the flow rate right?

DATA WAREHOUSE = Water treatment plant. All the messy raw water comes here, gets cleaned and standardized.
BigQuery, Snowflake, Redshift, Databricks. This is where raw, messy source data is stored in its original form. It's centralized, queryable, and historical (you can query last year's data).

TRANSFORM (dbt) = The filtration and purification stage. Raw water → drinking water.
dbt (data build tool) takes raw tables from the warehouse and builds clean, tested, documented models — the tables analysts actually query. Staging → intermediate → mart layers. Business logic lives here (how is "active user" defined? when does an order count as revenue?).

BI / SERVING LAYER = Your home's pipes and taps. The clean water (data) delivered to each room (use case).
Looker, Tableau, Metabase, Mode, PowerBI. Your dashboards, reports, self-service queries. This is what most people see. If the water at the tap is brown, the problem could be at any layer — you have to trace back to find it.

METRICS LAYER = The water quality standards. A centralized definition of what "clean" means.
dbt Metrics, Looker Explores, Airbnb Minerva. Defines "Daily Active Users" in ONE place. Every dashboard, every analyst, every report uses this same definition. No more "my DAU vs your DAU."

DATA LINEAGE = Tracing the water back to its source. Which pipe, which treatment stage, which source?
dbt lineage DAG shows you: this dashboard metric depends on → this dbt model → which depends on → this staging model → which reads from → this raw Fivetran table → which pulls from → this production database table.
When something breaks, lineage tells you: every downstream report affected by this upstream change.

STAR SCHEMA = The water distribution grid. Organized for efficient delivery to many users simultaneously.
Not a pile of pipes — a structured hub-and-spoke design: one central FACT table (what happened: orders, sessions, events) and multiple DIMENSION tables (who/what/where/when: users, products, locations, dates).`,
    deep: `THE ANALYTICS STACK — TECHNICAL DEEP DIVE

LAYER 1: DATA SOURCES
Operational systems are NOT designed for analytics:
- Production databases optimize for transactional throughput (OLTP: Online Transactional Processing)
- Row-level locking, normalized schemas, no historical data, small result sets
- Running analytics queries directly on production databases KILLS production performance
- Source data has inconsistencies: NULL values, duplicate records, format inconsistencies

Categories:
- Databases: PostgreSQL, MySQL, MongoDB (via CDC or batch export)
- Event streams: Kafka, Kinesis (real-time event data)
- SaaS tools: Salesforce, HubSpot, Stripe via REST APIs
- Files: CSV/Excel uploads, S3/GCS buckets
- Partner data: third-party data shares, data marketplaces

LAYER 2: INGESTION (ELT vs ETL)
Old paradigm — ETL (Extract, Transform, Load): transform data before loading. Expensive compute outside warehouse.
New paradigm — ELT (Extract, Load, Transform): load raw data first, transform inside the warehouse using SQL. Cheaper, faster, easier to debug.

Managed ELT tools: Fivetran, Airbyte, Stitch.
They handle: incremental updates (only new/changed rows), schema changes, retries, monitoring.
Custom pipelines: Apache Airflow / Prefect for orchestration, custom Python/Spark for transformation.

Ingestion patterns:
Full refresh: delete and reload entire table. Simple but expensive for large tables.
Incremental (append): add only new rows based on a timestamp. Fast but misses updates to existing rows.
CDC (Change Data Capture): stream every INSERT/UPDATE/DELETE from source database. Complete but complex.

LAYER 3: DATA WAREHOUSE
Designed for OLAP (Online Analytical Processing):
- Columnar storage: data stored by column, not by row. Dramatically faster for aggregation queries (SUM, AVG, COUNT).
- Massively Parallel Processing (MPP): queries distributed across hundreds of nodes.
- Compression: columnar data compresses 10x better than row data.
- No indexes (mostly): full table scans are fast because of MPP and columnar.

BigQuery: serverless, pay-per-query, excellent for irregular/spiky usage.
Snowflake: decouples storage and compute, excellent for multi-team environments.
Redshift: tightly coupled with AWS ecosystem, good for predictable heavy workloads.
Databricks (Lakehouse): combines data lake (cheap storage) with warehouse (SQL query performance).

Raw data lands in a schema like: raw.fivetran.orders (exactly as it came from source).
NEVER transform raw data directly — always work through a transformation layer.

LAYER 4: TRANSFORMATION (dbt)
dbt (data build tool) brings software engineering practices to SQL:
- Version control (git): all transformation logic in SQL files, committed to git.
- Testing: built-in tests for every model (not_null, unique, accepted_values, relationships).
- Documentation: auto-generated data catalog with column descriptions.
- Lineage DAG: visual map of how every model depends on every other model.
- Modularity: build complex models by composing simpler ones (CTEs → referenced models).

dbt model layers (standard pattern):
STAGING models (stg_*): One-to-one with source tables. Clean, rename, cast, deduplicate. No business logic.
INTERMEDIATE models (int_*): Join multiple staging models. Prepare data for marts. Some business logic.
MART models (fct_*, dim_*): Business-facing tables. Full business logic. What analysts query.

Example dbt model: stg_orders.sql
\`\`\`sql
-- Staging model: clean raw orders, no business logic
SELECT
  id AS order_id,
  user_id,
  CAST(created_at AS TIMESTAMP) AS created_at,
  UPPER(TRIM(status)) AS status,  -- normalize
  amount_paise / 100.0 AS amount_inr,  -- convert to meaningful unit
  COALESCE(delivery_partner_id, 'unassigned') AS delivery_partner_id
FROM {{ source('raw', 'orders') }}
WHERE id IS NOT NULL  -- filter obviously bad rows
\`\`\`

dbt TEST example:
\`\`\`yaml
version: 2
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: status
        tests:
          - accepted_values:
              values: ['PENDING', 'DELIVERED', 'CANCELLED', 'FAILED']
      - name: amount_inr
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"
\`\`\`

STAR SCHEMA — THE DIMENSIONAL MODEL:
Designed for analytics query performance and business comprehension.
FACT TABLE: Contains measurable events (orders, sessions, transactions, page views).
- Usually has many rows (millions to billions)
- Contains foreign keys to dimension tables
- Contains quantitative measures (order_value, session_duration, click_count)
- Grain: one row per [unit of measurement] (one row per order, one row per session)

DIMENSION TABLE: Contains descriptive attributes for the "who, what, where, when."
- Usually has fewer rows (thousands to millions)
- dim_user: user_id, name, city, acquisition_channel, signup_date, tier
- dim_product: product_id, name, category, brand, price_inr
- dim_date: date, day_of_week, week_of_year, is_holiday, fiscal_quarter
- Denormalized: all relevant attributes in one table (no further JOINs needed)

Star schema query pattern:
\`\`\`sql
SELECT
  dd.fiscal_quarter,
  du.city_tier,
  dp.category,
  SUM(fo.order_value_inr) AS total_revenue,
  COUNT(DISTINCT fo.order_id) AS total_orders
FROM fct_orders fo
JOIN dim_date dd ON fo.order_date = dd.date
JOIN dim_user du ON fo.user_id = du.user_id
JOIN dim_product dp ON fo.product_id = dp.product_id
WHERE dd.fiscal_year = 2025
GROUP BY 1, 2, 3
\`\`\`
Simple, fast, and business-readable — the star schema's design goal.

DATA FRESHNESS SLAs:
Every data asset should have a documented freshness SLA:
Real-time: < 1 minute lag (streaming, for fraud detection or live dashboards)
Near-real-time: < 15 minutes (hourly aggregates refreshed frequently)
Daily: updated by 8am (most business dashboards — acceptable for strategic decisions)
Weekly: updated by Monday 8am (cohort retention, LTV models)

Freshness monitoring in dbt:
\`\`\`yaml
sources:
  - name: raw
    freshness:
      warn_after: {count: 6, period: hour}
      error_after: {count: 24, period: hour}
    tables:
      - name: orders
        loaded_at_field: _fivetran_synced
\`\`\`

DATA QUALITY CHECKS — THE FIVE DIMENSIONS:
1. COMPLETENESS: Are all expected rows present? (Row count vs expected, NULL rate per column)
2. UNIQUENESS: No duplicate primary keys. (COUNT(*) == COUNT(DISTINCT primary_key))
3. VALIDITY: Values within expected ranges/formats. (Amount >= 0, date within bounds, status in accepted values)
4. CONSISTENCY: Same entity looks the same across tables. (user_id in orders exists in users table)
5. TIMELINESS: Data is fresh enough for its purpose. (MAX(loaded_at) within SLA)

DATA TRUST PROBLEM and the METRICS LAYER:
The core problem: the same metric computed in 3 different ways gives 3 different answers.
"Daily Active Users" in the product dashboard ≠ "Daily Active Users" in the growth dashboard ≠ what the CEO quotes.

Why? Because each team defined "active" differently:
- Product team: any session event
- Growth team: any purchase event
- CEO: "opened app" from marketing analytics

The metrics layer is a single place where business metric definitions are written ONCE and shared everywhere:
- dbt Metrics: define metrics in YAML in the dbt project. All BI tools query the same metric definitions.
- Looker Explores: define LookML metrics that all Looker dashboards reference.
- Airbnb Minerva / Lyft Amundsen: internal tools for metric governance.

A metric definition includes: SQL expression, time grain, dimensions it can be sliced by, owner, last updated.

DATA LINEAGE:
Column-level lineage: this "total_revenue" column in this dashboard came from → fct_orders.order_value → stg_orders.amount_inr → raw.orders.amount_paise → source: Stripe API.
When a source changes, lineage tells you every downstream artifact affected.
Tools: dbt (model-level lineage built-in), DataHub, Apache Atlas, Monte Carlo (for observability).

When the payment team changes how they record order amounts, lineage immediately surfaces: "This change will affect 3 dbt models, 5 dashboards, and 2 ML model training datasets."`,
    code: `// CONCEPT 15: Analytics Stack & Data Trust

// Example 1: dbt-style data quality checks in pure SQL
/*
-- Run these checks as part of your dbt tests or a daily data quality job
-- Each check should return 0 rows when data is healthy

-- CHECK 1: Completeness — orders table shouldn't have NULLs in critical fields
SELECT 'null_order_ids' AS check_name, COUNT(*) AS failing_rows
FROM raw.orders WHERE order_id IS NULL
UNION ALL
SELECT 'null_user_ids', COUNT(*) FROM raw.orders WHERE user_id IS NULL
UNION ALL
SELECT 'null_amounts', COUNT(*) FROM raw.orders WHERE amount_paise IS NULL

UNION ALL

-- CHECK 2: Uniqueness — each order_id should appear only once
SELECT 'duplicate_order_ids', COUNT(*) - COUNT(DISTINCT order_id)
FROM raw.orders

UNION ALL

-- CHECK 3: Validity — amounts should be positive, statuses should be valid
SELECT 'negative_amounts', COUNT(*)
FROM raw.orders WHERE amount_paise < 0
UNION ALL
SELECT 'invalid_status', COUNT(*)
FROM raw.orders
WHERE status NOT IN ('PENDING', 'DELIVERED', 'CANCELLED', 'FAILED', 'PROCESSING')

UNION ALL

-- CHECK 4: Consistency — every order's user_id must exist in users table
SELECT 'orphan_order_user_ids', COUNT(DISTINCT o.user_id)
FROM raw.orders o
LEFT JOIN raw.users u ON o.user_id = u.user_id
WHERE u.user_id IS NULL

UNION ALL

-- CHECK 5: Timeliness — data should be fresh (loaded within last 6 hours)
SELECT 'stale_data',
  CASE WHEN MAX(_fivetran_synced) < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
       THEN 1 ELSE 0 END
FROM raw.orders;
-- If any check returns > 0, alert the data engineering team
*/


// Example 2: Star schema query — fact + dimensions
/*
-- Production analytics query using star schema
-- Fast, readable, business-oriented
SELECT
  -- Time dimension
  dd.week_start_date,
  dd.fiscal_quarter,
  dd.is_holiday_week,
  
  -- User dimension
  du.acquisition_channel,
  du.city_tier,
  du.user_tenure_bucket,  -- 'new' / 'established' / 'veteran'
  
  -- Product dimension
  dp.category,
  dp.is_premium_product,
  
  -- Facts (aggregated measures from the fact table)
  COUNT(DISTINCT fo.order_id) AS total_orders,
  COUNT(DISTINCT fo.user_id) AS unique_buyers,
  ROUND(SUM(fo.order_value_inr), 0) AS total_revenue_inr,
  ROUND(AVG(fo.order_value_inr), 0) AS avg_order_value_inr,
  ROUND(SUM(fo.order_value_inr) / COUNT(DISTINCT fo.user_id), 0) AS revenue_per_buyer_inr,
  
  -- Derived metrics
  COUNT(DISTINCT fo.order_id) / COUNT(DISTINCT du.user_id) AS orders_per_active_user,
  SUM(CASE WHEN fo.is_repeat_order THEN 1 ELSE 0 END) / COUNT(*) AS repeat_order_rate

FROM fct_orders fo
-- Join to dimension tables (all LEFT JOINs in case dimension data is missing)
LEFT JOIN dim_date     dd ON fo.order_date = dd.date
LEFT JOIN dim_user     du ON fo.user_id    = du.user_id
LEFT JOIN dim_product  dp ON fo.product_id = dp.product_id

WHERE fo.order_date BETWEEN '2025-01-01' AND '2025-12-31'
  AND fo.order_status = 'DELIVERED'

GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
ORDER BY dd.week_start_date, total_revenue_inr DESC;
*/


// Example 3: Data freshness checker in JavaScript
function checkDataFreshness(dataSources) {
  // dataSources: [{name, lastUpdated: Date, slaHours, criticalityLevel}]
  
  const now = new Date();
  
  return dataSources.map(source => {
    const ageHours = (now - new Date(source.lastUpdated)) / (1000 * 60 * 60);
    const isStale = ageHours > source.slaHours;
    const isWarning = ageHours > source.slaHours * 0.75;
    
    // Impact assessment
    const impactLevel = isStale
      ? source.criticalityLevel === 'high' ? '🚨 CRITICAL: High-impact source is stale'
        : source.criticalityLevel === 'medium' ? '⚠️ WARNING: Medium-impact source needs refresh'
        : '⚠️ LOW: Low-impact source is stale'
      : '✅ Fresh';
    
    return {
      source: source.name,
      lastUpdated: source.lastUpdated,
      ageHours: ageHours.toFixed(1),
      slaHours: source.slaHours,
      status: isStale ? 'STALE' : isWarning ? 'WARNING' : 'FRESH',
      impact: impactLevel,
      action: isStale
        ? \`Immediately check \${source.name} pipeline. Dashboards may show outdated data.\`
        : 'No action needed'
    };
  }).sort((a, b) => parseFloat(b.ageHours) - parseFloat(a.ageHours));
}

// Example freshness check for Nykaa-like analytics stack:
const sources = [
  { name: 'fct_orders (BigQuery)', lastUpdated: new Date(Date.now() - 2*60*60*1000), slaHours: 6, criticalityLevel: 'high' },
  { name: 'dim_user (dbt model)', lastUpdated: new Date(Date.now() - 5*60*60*1000), slaHours: 6, criticalityLevel: 'high' },
  { name: 'stg_events (Fivetran)', lastUpdated: new Date(Date.now() - 30*60*1000), slaHours: 1, criticalityLevel: 'high' },
  { name: 'ml_churn_scores', lastUpdated: new Date(Date.now() - 30*60*60*1000), slaHours: 24, criticalityLevel: 'medium' },
];
// Returns freshness status for each source, sorted by staleness


// Example 4: Metrics layer — defining a single source of truth
/*
-- dbt Metrics definition (YAML) — the single source of truth for key business metrics

metrics:
  - name: daily_active_users
    label: Daily Active Users (DAU)
    description: >
      Users who placed at least one order OR had at least one app session of > 30 seconds.
      Definition owned by: Product Analytics team. Last reviewed: 2025-01-15.
      DO NOT use raw event counts for DAU — always use this metric.
    model: ref('fct_daily_user_activity')
    calculation_method: count_distinct
    expression: user_id
    timestamp: activity_date
    dimensions:
      - acquisition_channel
      - city_tier
      - device_type
    filters:
      - field: is_quality_session
        operator: '='
        value: 'true'  -- must be > 30 second session, not just a notification open
  
  - name: weekly_revenue
    label: Weekly Revenue (₹)
    description: >
      Total GMV of successfully delivered orders placed in the week.
      Excludes cancelled orders, refunded orders, and test orders.
      IMPORTANT: This is GMV (Gross Merchandise Value), not net revenue. For net revenue, use net_weekly_revenue.
    model: ref('fct_orders')
    calculation_method: sum
    expression: order_value_inr
    timestamp: order_date
    filters:
      - field: order_status
        operator: '='
        value: 'DELIVERED'
      - field: is_test_order
        operator: '='
        value: 'false'
*/


// Example 5: Data lineage impact analysis
function analyzeLineageImpact(changedSource, lineageGraph) {
  // lineageGraph: {nodeId: {name, type, dependsOn: [nodeIds], downstreamOf: [nodeIds]}}
  // Returns: all downstream nodes affected by a change to changedSource
  
  const affected = new Set();
  const queue = [changedSource];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (affected.has(current)) continue;
    if (current !== changedSource) affected.add(current);
    
    // Find all nodes that depend on the current node
    const dependents = Object.entries(lineageGraph)
      .filter(([_, node]) => node.dependsOn.includes(current))
      .map(([id, _]) => id);
    
    queue.push(...dependents);
  }
  
  const affectedNodes = [...affected].map(id => lineageGraph[id]);
  
  // Categorize impact
  const dashboards = affectedNodes.filter(n => n.type === 'dashboard');
  const dbtModels = affectedNodes.filter(n => n.type === 'dbt_model');
  const mlModels = affectedNodes.filter(n => n.type === 'ml_model');
  
  return {
    changedSource,
    totalAffected: affected.size,
    affectedDashboards: dashboards.map(d => d.name),
    affectedDbtModels: dbtModels.map(m => m.name),
    affectedMLModels: mlModels.map(m => m.name),
    urgencyLevel: dashboards.length > 3 || mlModels.length > 0 ? 'HIGH' : 'MEDIUM',
    recommendation: \`Changing \${changedSource} will affect \${dashboards.length} dashboards, \${dbtModels.length} dbt models, and \${mlModels.length} ML models. Coordinate with: \${[...new Set(affectedNodes.map(n => n.owner))].join(', ')} before making this change.\`
  };
}


// Example 6: Data contract — agreed schema between producer and consumer
function validateDataContract(data, contract) {
  // contract: {columns: [{name, type, nullable, minValue, maxValue, acceptedValues}]}
  const violations = [];
  
  contract.columns.forEach(col => {
    const values = data.map(row => row[col.name]);
    
    // Check for NULLs in non-nullable columns
    if (!col.nullable) {
      const nullCount = values.filter(v => v === null || v === undefined).length;
      if (nullCount > 0) {
        violations.push({ column: col.name, type: 'NULL_VIOLATION', count: nullCount,
          message: \`\${nullCount} NULL values in non-nullable column \${col.name}\` });
      }
    }
    
    // Check numeric bounds
    if (col.minValue !== undefined) {
      const below = values.filter(v => v !== null && v < col.minValue).length;
      if (below > 0) violations.push({ column: col.name, type: 'BELOW_MIN', count: below,
        message: \`\${below} values below minimum \${col.minValue} in \${col.name}\` });
    }
    
    // Check accepted values (categorical)
    if (col.acceptedValues) {
      const accepted = new Set(col.acceptedValues);
      const invalid = values.filter(v => v !== null && !accepted.has(v));
      if (invalid.length > 0) violations.push({ column: col.name, type: 'INVALID_VALUE',
        examples: [...new Set(invalid)].slice(0, 3),
        message: \`Invalid values found in \${col.name}: \${[...new Set(invalid)].slice(0,3).join(', ')}\` });
    }
  });
  
  return {
    valid: violations.length === 0,
    violationCount: violations.length,
    violations,
    summary: violations.length === 0
      ? '✅ Data contract satisfied — safe to use downstream'
      : \`🚨 \${violations.length} contract violations — do not use this data in production models until fixed\`
  };
}`,
    bugs: `BUG 1: Multiple definitions of the same metric causing conflicting reports
SYMPTOM: Monday business review: Product team reports DAU=145,000. Marketing team reports DAU=189,000. Engineering reports DAU=122,000. CEO asks "which one is right?" Meeting derails into a 45-minute debate about definitions. No strategic decisions made.
ROOT CAUSE: Three teams are computing "Daily Active Users" with three different definitions:
Product: any session_start event (includes 1-second accidental opens)
Marketing: any firebase_app_open event (includes background pushes)
Engineering: users who completed at least one core action (placed order, searched, added to cart)
All are "correct" by their own definition. None are comparable.
FIX: Implement a metrics layer (dbt Metrics, Looker Explores, or even a documented Google Sheet with canonical definitions). Define "DAU" once, with exact SQL, exact event names, exact filters. Every team uses this definition. Every dashboard references the same underlying model. This is non-negotiable for data-driven culture.

BUG 2: No date spine in time series — silent zero-day exclusion inflates averages
SYMPTOM: "Average daily orders" dashboard reports 4,200/day. Operations team plans capacity based on this. Actual peak days are severely under-resourced. Investigation: there were 8 days with system outages where zero orders were placed. These days don't appear in the orders table, so they're excluded from the average. True average = 4,200 × 30/(30-8) = 5,727 orders on operational days — and the "average" is used to plan for ALL 30 days including the zero days.
ROOT CAUSE: Event-table-based time series query without a date spine. Days with no events = no rows = excluded from aggregation. The denominator is wrong.
FIX: Build all time series queries on a date spine (GENERATE_DATE_ARRAY in BigQuery). LEFT JOIN event data to the spine. COALESCE missing values to 0. Track zero-order days explicitly — they may be important signals (outages, holidays) or should at minimum be excluded intentionally with documentation.

BUG 3: Direct-to-production-database analytics queries causing production outages
SYMPTOM: On a Monday morning, the e-commerce website goes down. Checkout fails for 20,000 users. Revenue loss: ₹35L in 45 minutes. Root cause: an analyst ran a complex retention analysis query directly on the production PostgreSQL database. The query held table locks and consumed all available connections.
ROOT CAUSE: Analytics queries (which often require full table scans across millions of rows) were running directly on the OLTP production database. Production databases are designed for small, fast, indexed queries — not full-table analytics. A single analytics query can consume enough resources to deny service to actual users.
FIX: NEVER run analytics queries on production databases. Set up read replicas for direct-database queries if needed. Ideally, all analytics should run on a data warehouse (BigQuery, Snowflake) that is completely separate from production. Establish a data engineering process that copies production data to the warehouse on a schedule.

BUG 4: dbt model changes breaking downstream dashboards without warning
SYMPTOM: Tuesday morning: 15 dashboards show errors. Investigation: a dbt engineer renamed a column from "revenue_inr" to "gmv_inr" in a core fact table on Monday evening. Every downstream dashboard that referenced "revenue_inr" broke simultaneously. The engineer didn't know which dashboards to warn.
ROOT CAUSE: No lineage tracking, no impact analysis before the change. The change seemed small (a column rename) but had broad downstream impact. Without lineage, there's no way to know what depends on what.
FIX: Use dbt's built-in lineage DAG to understand the impact of any change before making it. For breaking changes: (1) Add the new column alongside the old one, (2) Notify all downstream owners, (3) Give a migration window (2 weeks), (4) Only then delete the old column. Adopt a semantic versioning approach for dbt models: breaking changes require communication. This is standard software engineering practice applied to data.

BUG 5: Training ML model on data with schema drift, silently producing garbage predictions
SYMPTOM: A lead scoring model was trained 9 months ago. Its precision has been degrading slowly but nobody noticed because monitoring was not set up. Investigation reveals: 4 months ago, the CRM system changed the "company_size" field from a text category ("small/medium/large") to a numeric employee count. The ML feature engineering code still treated it as categorical, resulting in numerical employee counts being one-hot encoded as categories. The model was consuming completely wrong features.
ROOT CAUSE: No input schema validation on the ML prediction pipeline. No model performance monitoring. Schema changes in source systems silently changed the semantics of model inputs. This is "concept drift" caused by data pipeline changes, not actual behavioral drift.
FIX: (1) Validate input schema at prediction time — fail loudly if expected features are missing or have unexpected types/distributions. (2) Monitor model performance metrics (AUC, precision) weekly. Set alerts when performance drops >10% from baseline. (3) Monitor feature distributions: if the distribution of any feature shifts significantly vs training distribution, investigate before it breaks the model. (4) Add a "data contract" between the feature engineering pipeline and the model — both parties agree on the schema.`,
    challenge: `CHALLENGE 1 — PREDICT THE OUTPUT:
An analyst queries what she thinks is "today's revenue" from the BI tool. The result is ₹48.3L.
Actual revenue (from the payment system): ₹52.1L.
The difference is 7.3%.

Three potential causes: (a) Fivetran sync is delayed — data warehouse is 6 hours behind, (b) The dbt model filters for "DELIVERED" status but ₹3.8L of orders are in "PROCESSING" status at query time, (c) Revenue in the analytics system excludes cancelled orders that were refunded today (₹1.4L total).

Can all three causes be true simultaneously? What is the total gap explanation? Which is the most important to fix and why?

Answer: Yes, all three can compound. Actual pipeline: 52.1L total. Minus PROCESSING (3.8L) = 48.3L delivered. The 6-hour sync delay may or may not contribute depending on when orders were placed. The ₹1.4L refunds are correctly excluded if the metric is "net revenue." The most important fix: document exactly what the metric means (gross GMV vs net revenue vs delivered-only revenue) and ensure the BI tool label matches the definition.

CHALLENGE 2 — FIX THE BUG:
This dbt model has a data quality issue that will cause incorrect aggregations:
\`\`\`sql
-- fct_orders.sql
SELECT
  o.order_id,
  o.user_id,
  o.created_at,
  o.amount_inr,
  u.city,
  u.acquisition_channel
FROM stg_orders o
LEFT JOIN stg_users u ON o.user_id = u.user_id
-- No WHERE clause filtering
-- No deduplication
\`\`\`
Problems: (1) No deduplication — if stg_orders has duplicate order_ids (a common raw data issue), fct_orders will too, causing double-counting in all downstream revenue metrics. (2) No quality filters — test orders, refunded orders, and NULL user_ids will all be included.

FIX: Add QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1 for deduplication. Add WHERE clause: is_test_order = FALSE AND status != 'REFUNDED'. Add dbt tests: not_null and unique on order_id.

CHALLENGE 3 — BUILD FROM SCRATCH:
Design a dataQualityMonitor(tableName, checks, alertThreshold) function that:
1. Accepts an array of check definitions: {name, type: 'null_rate'|'uniqueness'|'row_count'|'value_range', column?, threshold?}
2. Simulates running each check on data (use a passed dataset array)
3. Returns: pass/fail for each check, overall data quality score (% checks passing)
4. Generates a freshness report: marks data as "STALE" if a timestamp column exceeds the SLA
5. Triggers an alert (console.warn) if overall score drops below alertThreshold (e.g., 80%)
6. Returns a structured report with: table name, check results, overall score, recommended actions for each failure`,
    summary: `Data doesn't just appear on dashboards — it travels through a pipeline of sources, ingestion, warehousing, transformation, and serving layers, accumulating errors and assumptions at every step. The analyst who understands this stack can trace any number to its origin, diagnose any discrepancy, and earn the trust of stakeholders by answering "I know exactly what this number means and where it came from" — which is the most powerful statement in analytics.`
  }
];

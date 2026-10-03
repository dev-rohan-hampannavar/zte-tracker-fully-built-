import type { Lesson } from "./types";

export const DATA_AI_LESSONS: Lesson[] = [
  {
    id: "data-sql-joins",
    familyId: "data-ai",
    module: "SQL for analysis",
    title: "Joins that don't lie",
    minutes: 35,
    objectives: ["Choose the right join for the question you are asking", "Predict row counts before you run a query", "Spot the fan-out that silently inflates totals"],
    explain: [
      "A join combines rows from two tables where a condition matches. INNER JOIN keeps only rows that match on both sides. LEFT JOIN keeps every row from the left table and fills the right side with NULL when nothing matches. Most analysis mistakes come from picking the wrong one, or from not knowing how many rows the result should have.",
      "Before you write a join, ask what one row of each table represents. If customers has one row per customer and orders has one row per order, joining them gives one row per order. Summing a customer-level number such as a credit limit after that join counts it once per order. This is called fan-out, and it is the most common reason totals look too high.",
      "A reliable habit is to check the count first. Count the rows in the left table, run the join, and count again. If the number grows when you expected it to stay the same, a key is not unique on the right side. Fix the grain of your data before you aggregate.",
      "Readable queries prevent join mistakes. Alias every table with a short, meaningful name, qualify every column with its alias, and put each join condition on its own line so mistakes stand out. Build the query in small steps, checking the output after each join, instead of writing a hundred lines and debugging them all at once. When a number matters, reconcile it against a simple independent query, such as a plain count, before you trust it.",
    ],
    keyIdeas: ["Every table has a grain: one row per what?", "LEFT JOIN plus a WHERE filter on the right table silently becomes an INNER JOIN", "Aggregate at the right grain first, then join", "Compare row counts before and after each join"],
    example: {
      title: "Revenue per customer without double counting",
      lang: "sql",
      code: `-- orders: one row per order (order_id, customer_id, amount)
-- customers: one row per customer (customer_id, name, segment)

WITH order_totals AS (
  SELECT customer_id,
         COUNT(*)    AS orders,
         SUM(amount) AS revenue
  FROM orders
  GROUP BY customer_id
)
SELECT c.segment,
       COUNT(*)                         AS customers,
       COALESCE(SUM(t.revenue), 0)      AS revenue
FROM customers c
LEFT JOIN order_totals t USING (customer_id)
GROUP BY c.segment;`,
      walkthrough: ["The CTE collapses orders to one row per customer first, so the grain matches customers.", "LEFT JOIN keeps customers who have never ordered, so the customer count is honest.", "COALESCE turns the NULL revenue of non-buyers into 0 so the sum stays meaningful."],
    },
    practice: [
      { task: "Take any two tables you can access and write down what one row of each means. Predict the row count of the join, then check it.", hint: "If the number is larger than the left table, find the key that repeats on the right." },
      { task: "Rewrite a query that joins orders to order_items and sums order totals so that it no longer double counts.", hint: "Aggregate order_items to the order level in a CTE, then join." },
    ],
    quiz: [
      { q: "A LEFT JOIN from customers to orders adds WHERE orders.status = 'paid'. What effect does that filter have?", options: ["Nothing, LEFT JOIN is unaffected", "It removes customers with no matching paid order, behaving like an INNER JOIN", "It keeps all customers and shows NULL for unpaid orders", "It raises an error"], answer: 1, why: "Rows with no match have NULL in orders.status, and NULL = 'paid' is not true, so they are filtered out. Put the condition in the ON clause to keep them." },
      { q: "customers has 1,000 rows. After joining orders the result has 4,200 rows. What does that most likely mean?", options: ["The database made a mistake", "Customers can have many orders, so the join result is at order grain", "The join used the wrong table", "Some customers are duplicated in the customers table"], answer: 1, why: "One-to-many joins produce one row per child row. Summing customer-level columns after this join will overcount." },
      { q: "What is the safest first step when a total looks too high after a join?", options: ["Add DISTINCT to the SELECT", "Compare row counts before and after the join and check key uniqueness", "Switch to a FULL JOIN", "Round the result"], answer: 1, why: "DISTINCT can hide the problem or remove real rows. Checking counts and keys finds the actual cause." },
    ],
    pitfalls: ["Using DISTINCT to make duplicates disappear without understanding why they appeared", "Filtering the right table in WHERE after a LEFT JOIN", "Joining on a column that is not unique on one side"],
  },
  {
    id: "data-sql-windows",
    familyId: "data-ai",
    module: "SQL for analysis",
    title: "Window functions: ranking and running totals",
    minutes: 40,
    objectives: ["Calculate per-group rankings without collapsing rows", "Build running totals and moving averages", "Compare each row to the previous one with LAG"],
    explain: [
      "A window function calculates a value across a set of rows related to the current row, but unlike GROUP BY it does not collapse them. Every input row stays in the output, with the extra column attached. That makes it ideal for rankings, running totals, and comparisons to a previous period.",
      "The OVER clause defines the window. PARTITION BY splits rows into groups, like GROUP BY would. ORDER BY sets the order inside each group. An optional frame, such as ROWS BETWEEN 6 PRECEDING AND CURRENT ROW, limits how many rows are included. Without a frame, a running aggregate with ORDER BY includes everything from the start of the partition to the current row.",
      "ROW_NUMBER gives unique positions, RANK leaves gaps after ties, and DENSE_RANK does not. LAG and LEAD read the previous or next row, which is how you compute day-over-day or month-over-month change in one query.",
      "Frames are where most window-function bugs hide. With ORDER BY and no explicit frame, the default frame runs from the first row of the partition to the current row, and for ties it includes all rows with the same ordering value. That is usually what you want for a running total, but it surprises people using LAST_VALUE or moving averages. When in doubt, write the frame explicitly with ROWS BETWEEN so the intent is visible to the next reader.",
    ],
    keyIdeas: ["PARTITION BY is the group, ORDER BY is the sequence", "ROW_NUMBER, RANK and DENSE_RANK differ only in how they treat ties", "LAG gives the previous row so you can compute change", "Filter on window results by wrapping the query in a CTE"],
    example: {
      title: "Top product per category and month-over-month growth",
      lang: "sql",
      code: `WITH monthly AS (
  SELECT category, product,
         DATE_TRUNC('month', sold_at) AS month,
         SUM(revenue) AS revenue
  FROM sales
  GROUP BY 1, 2, 3
), ranked AS (
  SELECT *,
         RANK() OVER (PARTITION BY category, month
                      ORDER BY revenue DESC) AS rnk,
         LAG(revenue) OVER (PARTITION BY category, product
                            ORDER BY month)  AS prev_revenue
  FROM monthly
)
SELECT category, month, product, revenue,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS growth_pct
FROM ranked
WHERE rnk = 1;`,
      walkthrough: ["The first CTE sets the grain: one row per category, product and month.", "RANK numbers products inside each category and month by revenue. LAG looks at the same product's previous month.", "NULLIF avoids dividing by zero. Filtering rnk = 1 must happen outside the window query, so a second CTE is needed."],
    },
    practice: [
      { task: "Write a query that returns each customer's three most recent orders using ROW_NUMBER.", hint: "Partition by customer, order by order date descending, keep rows where the number is 3 or less." },
      { task: "Compute a 7-day moving average of daily signups.", hint: "Use AVG with ROWS BETWEEN 6 PRECEDING AND CURRENT ROW, ordered by date. Make sure every date has a row." },
    ],
    quiz: [
      { q: "Which function leaves no gaps in rank numbers after ties?", options: ["ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE"], answer: 2, why: "DENSE_RANK gives tied rows the same rank and continues with the next integer. RANK would skip numbers." },
      { q: "Why can't you put a window function directly in a WHERE clause?", options: ["It is slow", "WHERE runs before window functions are calculated", "Window functions only work in HAVING", "It is allowed in all databases"], answer: 1, why: "The logical order is FROM, WHERE, GROUP BY, window functions, then SELECT and ORDER BY. Wrap the query in a CTE or subquery to filter on the result." },
      { q: "What does LAG(revenue) OVER (PARTITION BY product ORDER BY month) return for a product's first month?", options: ["0", "The same month's revenue", "NULL", "An error"], answer: 2, why: "There is no previous row, so LAG returns NULL unless you supply a default as its third argument." },
    ],
    pitfalls: ["Forgetting ORDER BY inside OVER for ranking and LAG", "Moving averages over data with missing days", "Dividing by a previous value that can be zero"],
  },
  {
    id: "data-sql-cohorts",
    familyId: "data-ai",
    module: "SQL for analysis",
    title: "Cohorts and retention in SQL",
    minutes: 40,
    objectives: ["Define a cohort and a retention period", "Build a retention table with plain SQL", "Read a retention curve and say what it implies"],
    explain: [
      "A cohort is a group of users who share a starting event in the same period, for example everyone who signed up in January. Retention asks what fraction of each cohort is still active n periods later. Looking at cohorts instead of one blended number stops new-user growth from hiding a leaky product.",
      "To build it, assign each user a cohort month from their first event. Then, for every activity record, compute how many months have passed since that cohort month. Count the distinct users active at each offset and divide by the size of the cohort. The result is a triangle: older cohorts have more offsets than recent ones.",
      "Always write down your definition of active. Logging in, making a purchase and viewing a page give different curves. A good analyst states the definition next to the chart so a reader cannot misinterpret it.",
      "When you present retention, show the table as a heat map or a set of curves, one line per cohort, and annotate the events that might explain changes, such as a pricing change or a new onboarding flow. Compare cohorts that are the same age, because comparing a two-month-old cohort with a twelve-month-old one mixes up age and quality. A small, labelled chart with a stated definition is more useful to a manager than a large unlabelled table.",
    ],
    keyIdeas: ["Cohort = shared starting period; offset = time since start", "Retention = active users at offset divided by cohort size", "Count distinct users, not events", "State the activity definition on every chart"],
    example: {
      title: "Monthly signup cohorts and 0–3 month retention",
      lang: "sql",
      code: `WITH first_seen AS (
  SELECT user_id, DATE_TRUNC('month', MIN(created_at)) AS cohort
  FROM events
  GROUP BY user_id
), activity AS (
  SELECT DISTINCT user_id,
         DATE_TRUNC('month', created_at) AS active_month
  FROM events
  WHERE event_name = 'purchase'
), offsets AS (
  SELECT f.cohort,
         a.user_id,
         (EXTRACT(YEAR FROM a.active_month) - EXTRACT(YEAR FROM f.cohort)) * 12
         + EXTRACT(MONTH FROM a.active_month) - EXTRACT(MONTH FROM f.cohort) AS month_offset
  FROM first_seen f
  JOIN activity a USING (user_id)
)
SELECT cohort, month_offset, COUNT(DISTINCT user_id) AS active_users
FROM offsets
WHERE month_offset BETWEEN 0 AND 3
GROUP BY cohort, month_offset
ORDER BY cohort, month_offset;`,
      walkthrough: ["first_seen finds each user's starting month; activity lists the months a user purchased.", "offsets computes calendar months between the two; the final query counts distinct users at each offset.", "Divide each count by the cohort's month 0 count in a final step or a spreadsheet to get percentages."],
    },
    practice: [
      { task: "Add a column with the cohort size and compute retention percentage.", hint: "Join back to a CTE that counts users per cohort, then divide." },
      { task: "Change the definition of active from purchase to any event. How does the curve change, and which one would the business care about?", hint: "Write one sentence explaining the difference in what each version measures." },
    ],
    quiz: [
      { q: "Why use COUNT(DISTINCT user_id) in a retention query?", options: ["It is faster", "A user may have many events in a month but should count once", "COUNT does not work with user ids", "It removes NULLs"], answer: 1, why: "Retention is about people. Counting events would let heavy users inflate the number." },
      { q: "In a retention triangle, why do recent cohorts have fewer columns?", options: ["Data is missing", "They haven't had time to reach later offsets", "They are smaller", "A bug in the query"], answer: 1, why: "A cohort from last month can only be observed at offset 0 and 1. Do not treat the missing future as zero." },
      { q: "Overall retention looks stable but each cohort's retention is falling. What explains this?", options: ["Impossible", "Growth in new users is masking decline in older cohorts", "The database is wrong", "Seasonality always causes this"], answer: 1, why: "Blended metrics weight larger new cohorts heavily. Cohort tables expose the real trend." },
    ],
    pitfalls: ["Treating missing future periods as zeros", "Switching the activity definition between charts", "Mixing calendar months with 30-day windows"],
  },
  {
    id: "data-pandas-shape",
    familyId: "data-ai",
    module: "Python and data wrangling",
    title: "pandas: groupby, merge and the shape of data",
    minutes: 40,
    objectives: ["Summarise data with groupby and named aggregations", "Merge tables safely and validate the result", "Reshape between long and wide formats"],
    explain: [
      "pandas works best when you think in columns and apply operations to whole columns at once. groupby splits a table into groups, applies an aggregation to each, and combines the results. Named aggregation lets you choose clear output column names in the same call.",
      "merge is pandas' join. The how argument controls inner, left, right and outer behaviour, exactly as in SQL. The validate argument is a safety net: validate='one_to_one' or 'many_to_one' raises an error if the keys are not unique where you expect them to be, which catches fan-out before it corrupts your numbers.",
      "Data comes in long form (one row per observation) and wide form (one column per category). Long form is better for grouping and plotting; wide form is better for reading and some models. pivot_table and melt convert between them.",
      "A few habits make pandas code trustworthy. Print the shape and a few rows after every merge or filter so you notice surprises early. Set explicit dtypes or parse dates when you load data, because a column of numbers stored as text sorts alphabetically and sums wrongly. Keep raw data untouched and write your cleaning as a script, so anyone, including you next month, can rerun it from the original file and get the same result.",
    ],
    keyIdeas: ["Operate on columns, avoid row loops", "Use named aggregation for readable results", "merge(..., validate=...) catches broken keys", "Check df.shape and df.isna().sum() after every step"],
    example: {
      title: "Revenue by segment with a validated merge",
      lang: "python",
      code: `import pandas as pd

orders = pd.read_csv("orders.csv", parse_dates=["created_at"])
customers = pd.read_csv("customers.csv")

df = orders.merge(customers, on="customer_id",
                  how="left", validate="many_to_one")
assert len(df) == len(orders), "merge changed the row count"

summary = (
    df.assign(month=df["created_at"].dt.to_period("M"))
      .groupby(["segment", "month"], as_index=False)
      .agg(orders=("order_id", "nunique"),
           revenue=("amount", "sum"),
           buyers=("customer_id", "nunique"))
)
print(summary.sort_values(["segment", "month"]).head())`,
      walkthrough: ["validate='many_to_one' fails loudly if customers has duplicate ids.", "The assert is a second guard: a left merge from orders should keep the row count.", "Named aggregation produces orders, revenue and buyers columns in one step."],
    },
    practice: [
      { task: "Load a CSV, print shape, dtypes and missing values per column, and write down three issues you would fix.", hint: "Look for numbers stored as text, dates stored as text and inconsistent category spellings." },
      { task: "Turn a long table of month, product, revenue into a wide table with one column per product.", hint: "df.pivot_table(index='month', columns='product', values='revenue', aggfunc='sum')" },
    ],
    quiz: [
      { q: "What does merge(validate='many_to_one') do?", options: ["Speeds up the merge", "Raises an error if the right table's key is not unique", "Drops duplicate rows", "Converts the result to long format"], answer: 1, why: "It checks key uniqueness on the right side, protecting you from accidental row multiplication." },
      { q: "Which is generally better for grouping and plotting?", options: ["Wide format", "Long format", "Neither", "Nested lists"], answer: 1, why: "Long format has one observation per row, so groupby and plotting libraries work directly on columns." },
      { q: "Why avoid looping over DataFrame rows?", options: ["It is illegal", "Vectorised column operations are shorter and much faster", "Loops lose the index", "pandas does not allow it"], answer: 1, why: "Column-wise operations run in optimised compiled code; Python row loops are slow and harder to read." },
    ],
    pitfalls: ["Chained assignment that silently changes a copy", "Forgetting to parse dates so sorting is alphabetical", "Merging on a key with whitespace or case differences"],
  },
  {
    id: "data-stats-ci",
    familyId: "data-ai",
    module: "Statistics you actually use",
    title: "Sampling, confidence intervals and what they mean",
    minutes: 35,
    objectives: ["Explain why a sample estimate has uncertainty", "Compute and interpret a confidence interval", "Say what a confidence interval does not mean"],
    explain: [
      "You rarely see a whole population, so you measure a sample and estimate the truth from it. A different sample would give a slightly different answer. The standard error describes how much the estimate typically varies: for a mean, it is the standard deviation divided by the square root of the sample size. Quadrupling the sample halves the error.",
      "A 95% confidence interval is a range built by a procedure that, if repeated on many samples, would contain the true value about 95% of the time. For a mean with a reasonably large sample, a common approximation is the estimate plus or minus roughly two standard errors. The width tells you how precise your estimate is.",
      "What it is not: it is not a 95% probability that this one interval contains the truth in the everyday sense, and it says nothing about bias. A biased sample, such as surveying only existing customers, produces a narrow interval around the wrong number. Sampling design matters more than the formula.",
      "Intervals also change how you compare groups. Two overlapping intervals do not by themselves prove there is no difference, and non-overlapping ones do not guarantee a large one, so build an interval for the difference itself when you need to compare. For small samples or skewed data, the simple plus-or-minus formula is unreliable. Bootstrapping, which resamples your data many times and looks at the spread of the estimate, is a flexible and intuitive alternative worth learning.",
    ],
    keyIdeas: ["Standard error shrinks with the square root of sample size", "Interval width communicates precision", "Bias cannot be fixed by a bigger sample", "Always report an interval, not just a point estimate"],
    example: {
      title: "A conversion rate with an honest interval",
      lang: "python",
      code: `import math

visitors = 2400
signups = 168
p = signups / visitors                 # 0.07
se = math.sqrt(p * (1 - p) / visitors)  # standard error of a proportion
low, high = p - 1.96 * se, p + 1.96 * se

print(f"Conversion: {p:.1%} (95% CI {low:.1%} to {high:.1%})")
# Conversion: 7.0% (95% CI 6.0% to 8.0%)`,
      walkthrough: ["p is the observed conversion rate. The standard error for a proportion is the square root of p(1 - p) divided by n.", "1.96 standard errors on each side gives the 95% interval.", "Report it as a range: 'around 7%, plausibly between 6% and 8%'."],
    },
    practice: [
      { task: "Recompute the interval above for 600 visitors with the same rate. How much wider is it?", hint: "Width scales with 1 divided by the square root of n, so it should be about twice as wide." },
      { task: "Describe a sampling plan for estimating average delivery time that would be biased, and fix it.", hint: "Think about who is missing from your sample." },
    ],
    quiz: [
      { q: "You quadruple your sample size. What happens to the standard error of a mean?", options: ["It halves", "It quarters", "It stays the same", "It doubles"], answer: 0, why: "Standard error scales with 1 over the square root of n, and the square root of 4 is 2." },
      { q: "Which statement about a 95% confidence interval is most accurate?", options: ["There is a 95% chance the sample mean is correct", "The method produces intervals that contain the true value in about 95% of repeated samples", "95% of individual data points fall inside it", "It removes bias"], answer: 1, why: "The guarantee is about the procedure over repeated sampling, not about individual data points." },
      { q: "A survey only reaches current customers. A larger sample will...", options: ["Remove the bias", "Narrow the interval but keep the bias", "Widen the interval", "Make results random"], answer: 1, why: "More data reduces random error, not systematic error from who you sampled." },
    ],
    pitfalls: ["Reading the interval as the range of individual values", "Ignoring bias because the sample is large", "Reporting a single number with no uncertainty"],
  },
  {
    id: "data-stats-ab",
    familyId: "data-ai",
    module: "Statistics you actually use",
    title: "A/B tests without fooling yourself",
    minutes: 40,
    objectives: ["Plan an A/B test with a primary metric and sample size", "Avoid peeking and multiple-comparison traps", "Report results with an effect size and an interval"],
    explain: [
      "An A/B test randomly assigns users to a control and a variant and compares an outcome. Random assignment is what lets you claim the change caused the difference. Before you start, write down one primary metric, the smallest effect worth acting on, and how many users you need. If you skip this, you will find patterns in noise.",
      "Sample size depends on the baseline rate, the minimum detectable effect, the significance level and the power. Detecting a small lift in a low-conversion metric needs many users. Run the test for whole weeks so day-of-week effects balance out, and do not stop early because the result looks good. Repeatedly peeking and stopping when p drops below 0.05 inflates false positives dramatically.",
      "When you report, give the lift, an interval for it and whether it clears your threshold. A statistically significant 0.1% lift may not justify the cost of shipping. A non-significant result with a wide interval means 'we cannot tell', not 'no effect'.",
      "Practical tests also need guardrail metrics, which are things that must not get worse while you improve the main one. If a new checkout raises conversion but also doubles refund requests or page load time, the headline win is misleading. Decide guardrails before the test, check them alongside the primary metric, and write down what you will do if one is violated. Also check that the split is balanced: if the groups are not roughly the sizes you intended, something is wrong with assignment.",
    ],
    keyIdeas: ["Decide the metric, effect size and sample size up front", "Run for full weeks and do not stop early", "Testing many metrics inflates false positives: pick one primary", "Report effect size with an interval, not just a p-value"],
    example: {
      title: "Two-proportion z-test for conversion",
      lang: "python",
      code: `import math

def ab_summary(conv_a, n_a, conv_b, n_b):
    p_a, p_b = conv_a / n_a, conv_b / n_b
    diff = p_b - p_a
    se = math.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b)
    ci = (diff - 1.96 * se, diff + 1.96 * se)
    return p_a, p_b, diff, ci

p_a, p_b, diff, ci = ab_summary(conv_a=480, n_a=8000, conv_b=540, n_b=8000)
print(f"A {p_a:.2%}  B {p_b:.2%}  lift {diff:+.2%}  95% CI {ci[0]:+.2%} to {ci[1]:+.2%}")
# A 6.00%  B 6.75%  lift +0.75%  95% CI -0.01% to +1.51%`,
      walkthrough: ["The interval for the difference is built from both groups' standard errors.", "Here the interval just touches zero: a lift of about three-quarters of a point is plausible, but so is no effect.", "The honest conclusion is 'promising but inconclusive: extend the test or accept the risk'."],
    },
    practice: [
      { task: "Write a one-page test plan for a checkout change: hypothesis, primary metric, minimum effect, sample size estimate, run length and stop rule.", hint: "Estimate the daily traffic and divide the required sample by it to get the number of days." },
      { task: "Simulate 1,000 A/A tests (no real difference) and count how often you see p below 0.05. Then check after every 100 users and stop at the first success. What changes?", hint: "Peeking raises the false-positive rate well above 5%." },
    ],
    quiz: [
      { q: "Why run an A/B test for whole weeks?", options: ["Traffic is cheaper", "User behaviour varies by day of week", "Tools require it", "To increase significance"], answer: 1, why: "Weekday and weekend behaviour differ, so partial weeks bias the comparison." },
      { q: "You check results daily and stop as soon as p < 0.05. What is the risk?", options: ["None", "A much higher false-positive rate", "Lower power", "Biased assignment"], answer: 1, why: "Every look is another chance to see a fluke. Fix the sample size in advance or use methods designed for sequential testing." },
      { q: "A test shows no significant difference and a very wide interval. What should you conclude?", options: ["The change does nothing", "The test was too small to tell", "The variant is worse", "The metric is invalid"], answer: 1, why: "Absence of evidence is not evidence of absence. A wide interval means the test lacked precision." },
    ],
    pitfalls: ["Testing ten metrics and reporting the one that won", "Changing the experiment while it runs", "Declaring victory on a lift too small to matter"],
  },
  {
    id: "data-ml-leakage",
    familyId: "data-ai",
    module: "Machine learning foundations",
    title: "Train, validate, test: avoiding leakage",
    minutes: 40,
    objectives: ["Split data correctly for honest evaluation", "Recognise the common forms of data leakage", "Build a baseline before a complex model"],
    explain: [
      "A model is only useful if it works on data it has not seen. So you split your data: the training set to fit the model, a validation set to choose settings, and a test set you touch once at the end for an honest estimate. If you tune on the test set, it stops being a test.",
      "Leakage happens when information the model would not have at prediction time sneaks into training. Examples: a column that is created after the outcome, such as refund_issued when predicting churn; scaling or imputing with statistics from the full dataset before splitting; and random splitting of time-ordered data so the model trains on the future. Leaky models look brilliant in development and fail in production.",
      "Start with a baseline: predict the majority class or the previous value. Then fit a simple model such as logistic regression. A complex model is only worth its cost if it clearly beats these. Wrapping preprocessing and the model in a pipeline ensures every step is fit only on training data.",
      "Cross-validation gives a more stable estimate than one split, especially with small data. It splits the training data into folds, trains on all but one and validates on the held-out fold, then averages the scores. Use grouped folds when rows from the same customer or device appear more than once, otherwise the same entity appears in both training and validation and inflates the score. Keep a final untouched test set for one last honest check.",
    ],
    keyIdeas: ["Never tune on the test set", "Fit preprocessing on training data only, using a pipeline", "Split time-based data by time, not randomly", "Beat a simple baseline before adding complexity"],
    example: {
      title: "A leak-safe pipeline with a baseline",
      lang: "python",
      code: `from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)

baseline = DummyClassifier(strategy="prior").fit(X_train, y_train)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
model.fit(X_train, y_train)

for name, m in [("baseline", baseline), ("logistic", model)]:
    auc = roc_auc_score(y_test, m.predict_proba(X_test)[:, 1])
    print(name, round(auc, 3))`,
      walkthrough: ["stratify keeps the class balance the same in both splits.", "The pipeline fits the scaler on training data only, then applies it unchanged to test data.", "Comparing with the baseline shows whether the model adds real value."],
    },
    practice: [
      { task: "List every feature in a dataset you know and mark whether it would exist at the moment you need a prediction.", hint: "Anything recorded after the outcome is a leak candidate." },
      { task: "Split a time-ordered dataset by date and compare the score to a random split. Explain the difference.", hint: "The random split usually looks better because the model sees the future." },
    ],
    quiz: [
      { q: "You standardise all features using the whole dataset and then split. What is wrong?", options: ["Nothing", "Test-set statistics leaked into training", "The model will underfit", "Scaling must happen after training"], answer: 1, why: "Means and standard deviations from the test rows influenced the training data. Fit scalers on training data only." },
      { q: "Predicting next month's churn with a random train/test split of two years of data is risky because...", options: ["It is too slow", "The model may train on information from the future", "Churn is random", "Random splits are illegal"], answer: 1, why: "Time-based problems need time-based splits so evaluation mimics real use." },
      { q: "Why train a baseline model first?", options: ["To waste time", "To know whether complexity actually helps", "Baselines are required by law", "To tune hyperparameters"], answer: 1, why: "A simple benchmark tells you how much value a more complex model really adds." },
    ],
    pitfalls: ["A feature derived from the target", "Tuning many models against the same test set", "Reporting accuracy on heavily imbalanced data"],
  },
  {
    id: "data-ml-metrics",
    familyId: "data-ai",
    module: "Machine learning foundations",
    title: "Metrics: precision, recall and thresholds",
    minutes: 35,
    objectives: ["Read a confusion matrix", "Choose between precision, recall and F1 for a real problem", "Move a classification threshold deliberately"],
    explain: [
      "A classifier's predictions fall into four boxes: true positives, false positives, true negatives and false negatives. Accuracy, the share of correct predictions, is misleading when classes are imbalanced. If only 1% of transactions are fraud, a model that always says 'not fraud' is 99% accurate and useless.",
      "Precision answers: of everything the model flagged, how much was right? Recall answers: of everything that was really positive, how much did the model find? They trade off. Flagging more cases raises recall but lowers precision. F1 is the harmonic mean, useful as a single number, but the right balance depends on the cost of each kind of error.",
      "Most models output a probability, and the threshold that turns it into a yes or no is a business decision. Missing a cancer screening result is costlier than a false alarm, so you favour recall. Sending a promotion to everyone is cheap, so you can accept low precision. Choose the threshold using the costs, not the default of 0.5.",
      "Probabilities should also be calibrated, which means that among cases scored 0.8, about eighty percent should turn out positive. A model can rank well, with a high ROC AUC, and still give misleading probabilities. If decisions depend on the number itself, such as pricing a risk, check a calibration plot and consider recalibrating. Finally, monitor the metrics after launch, because real-world data drifts and a model that was good last quarter can quietly decay.",
    ],
    keyIdeas: ["Accuracy hides problems on imbalanced data", "Precision = TP / (TP + FP); recall = TP / (TP + FN)", "The threshold is a business decision", "Report metrics together with the base rate"],
    example: {
      title: "Choosing a threshold by cost",
      lang: "python",
      code: `import numpy as np

# y_true: 0/1 labels, scores: predicted probabilities
cost_fp, cost_fn = 5, 100      # a miss is 20x worse than a false alarm

best = None
for t in np.linspace(0.05, 0.95, 19):
    pred = scores >= t
    fp = np.sum(pred & (y_true == 0))
    fn = np.sum(~pred & (y_true == 1))
    total = fp * cost_fp + fn * cost_fn
    if best is None or total < best[1]:
        best = (round(t, 2), total)
print("Best threshold:", best)`,
      walkthrough: ["We assign a cost to each error type from the business context.", "We try many thresholds and total the cost of mistakes at each.", "The cheapest threshold is usually well below 0.5 when misses are expensive."],
    },
    practice: [
      { task: "Take a confusion matrix with 90 TP, 30 FP, 10 FN and 870 TN. Compute accuracy, precision, recall and F1.", hint: "Precision = 90/120, recall = 90/100." },
      { task: "Pick a real classification problem and argue whether precision or recall matters more, and what you would set the threshold to.", hint: "Estimate the cost of each type of error in time or money." },
    ],
    quiz: [
      { q: "99% of emails are not spam. A model that labels everything 'not spam' has 99% accuracy. What does that show?", options: ["It is excellent", "Accuracy is a poor metric for imbalanced classes", "The data is wrong", "Recall is 99%"], answer: 1, why: "It finds none of the spam, so recall is 0. Use precision, recall or a cost-based measure." },
      { q: "Missing a true case is very costly. Which should you favour?", options: ["Higher precision", "Higher recall", "Higher accuracy", "More features"], answer: 1, why: "Recall measures the share of real positives caught. Lowering the threshold raises it at the cost of more false alarms." },
      { q: "Why is the default threshold of 0.5 often wrong?", options: ["Probabilities are unreliable", "Error costs and class balance are rarely symmetrical", "Libraries use another default", "It is always correct"], answer: 1, why: "The best threshold depends on what each mistake costs and how rare the positive class is." },
    ],
    pitfalls: ["Reporting only accuracy", "Optimising a metric nobody will act on", "Choosing a threshold on the test set"],
  },
];

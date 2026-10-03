import type { Lesson } from "./types";

const base = { familyId: "data-ai", pathId: "data-analyst" } as const;

export const DATA_ANALYST_LESSONS: Lesson[] = [
  {
    ...base,
    id: "da-sheets-lookups",
    module: "Spreadsheets that scale",
    title: "Lookups, conditional sums and pivots",
    minutes: 40,
    objectives: ["Join two sheets with XLOOKUP or INDEX/MATCH", "Summarise with SUMIFS and COUNTIFS instead of manual filtering", "Build a pivot table and know when to use formulas instead"],
    explain: [
      "Spreadsheets are the first tool most analysts use and the one stakeholders trust, so fluency matters. The most valuable skill is joining data. A lookup finds a value in one table using a key from another, exactly like a join in SQL. XLOOKUP takes the value to find, the column to search, and the column to return, and lets you say what to show when nothing matches. In older versions, INDEX combined with MATCH does the same job.",
      "The second skill is summarising with conditions. SUMIFS adds up a column where one or more conditions hold, and COUNTIFS counts rows that meet them. Because the formula reads the live data, the totals update when the data changes, unlike a number you computed by filtering and copying. Use absolute references, with dollar signs, on ranges so you can fill a formula down or across without it drifting.",
      "Pivot tables are the fastest way to explore. Drag a field to rows, another to columns and a numeric field to values, and you get a cross-tabulation in seconds. Use them to find the shape of the data and to check your formulas, then build the final, auditable table with formulas or a refreshable pivot. Remember that a pivot summarises what is in the source range, so extend the range or use a proper table object so new rows are included.",
      "Make models that others can trust. Keep raw data on its own sheet and never edit it by hand; put calculations on separate sheets; name inputs clearly and put assumptions in labelled cells, not inside formulas. Avoid hard-coded numbers in formulas, avoid merged cells that break sorting and filtering, and add a notes sheet describing sources and checks. If a colleague cannot follow your workbook in five minutes, it is too fragile.",
    ],
    keyIdeas: ["A lookup is a join: key in, matching value out", "SUMIFS and COUNTIFS keep totals live and auditable", "Pivots explore; formulas and tables make a durable report", "Raw data, calculations and assumptions on separate, labelled sheets"],
    example: {
      title: "Revenue by region from orders and a customer table",
      lang: "text",
      code: `Sheet "orders"  (Excel table named Orders)
  A: order_id | B: customer_id | C: order_date | D: amount

Sheet "customers" (Excel table named Customers)
  A: customer_id | B: name | C: region

1) Bring region into the orders table (new column E in Orders):
   =XLOOKUP([@[customer_id]], Customers[customer_id], Customers[region], "Unknown")
   Older Excel:
   =IFERROR(INDEX(Customers[region], MATCH([@[customer_id]], Customers[customer_id], 0)), "Unknown")

2) Revenue per region on a summary sheet (region names in A2:A6):
   =SUMIFS(Orders[amount], Orders[region], $A2)
   Orders per region:
   =COUNTIFS(Orders[region], $A2)
   Orders in a date window:
   =SUMIFS(Orders[amount], Orders[region], $A2, Orders[order_date], ">="&$H$1, Orders[order_date], "<="&$H$2)

3) Check: the regional totals must equal the grand total
   =SUM(B2:B6) - SUM(Orders[amount])      -> should be 0

4) Quick exploration: Insert > PivotTable from Orders; Region in Rows, Sum of amount in Values.`,
      walkthrough: ["The lookup adds the region next to each order, and the fallback value 'Unknown' makes missing customers visible instead of an error.", "SUMIFS reads the table directly, so adding rows updates every total.", "The reconciliation cell proves that nothing was lost or double counted, which is the habit that builds trust."],
    },
    practice: [
      { task: "Take two exports you have and join them with a lookup. Count how many rows returned the fallback value and explain why.", hint: "Check for trailing spaces and for keys stored as text in one sheet and numbers in the other." },
      { task: "Build a summary with SUMIFS and then recreate it with a pivot table. Do the totals match?", hint: "If they do not, compare the source ranges and any hidden filters." },
    ],
    quiz: [
      { q: "A lookup returns not-found for keys that look identical. What is a likely cause?", options: ["The sheet is too large", "Hidden spaces or text-versus-number mismatches in the keys", "Pivot tables are open", "The workbook is shared"], answer: 1, why: "Invisible whitespace and different data types break exact matches. Clean with TRIM and convert types." },
      { q: "Why use SUMIFS instead of filtering and copying a total?", options: ["It looks nicer", "The result updates automatically when the data changes and can be audited", "It is required by Excel", "Filtering is not allowed"], answer: 1, why: "A formula documents how the number was produced and stays live." },
      { q: "What does the check =SUM(regions) - SUM(all orders) prove when it is 0?", options: ["The workbook is fast", "No rows were lost or double counted in the breakdown", "The lookup is correct", "The pivot is refreshed"], answer: 1, why: "Reconciling parts to the whole catches missing categories and double counting." },
    ],
    pitfalls: ["Hard-coding numbers inside formulas", "Merged cells in data ranges", "Editing the raw data sheet by hand"],
  },
  {
    ...base,
    id: "da-metric-tree",
    module: "Metrics and product analytics",
    title: "Metric definitions, trees and guardrails",
    minutes: 35,
    objectives: ["Write a metric definition no one can misread", "Break a headline metric into drivers with a metric tree", "Choose guardrail metrics that stop you optimising the wrong thing"],
    explain: [
      "A metric is a number that a team agrees means something. Disagreements about numbers usually come from vague definitions, not arithmetic. 'Active users' could mean people who logged in, people who did something valuable, in a day or a month, with or without internal accounts. A good definition states the event, the population, the time window, the filters and the source table, so two analysts get the same answer.",
      "A metric tree explains why a headline number moves. Start with the top metric, such as monthly revenue, and split it into factors that multiply or add: revenue equals active customers times orders per customer times average order value. Each factor can be split again, for example customers into new and returning. The tree shows where to look when revenue changes and which team owns each lever.",
      "Good metrics are tied to value and are hard to game. A count of messages sent may reward spam. Pair every goal metric with guardrails, which are metrics that must not get worse: if you push sign-ups, watch activation and unsubscribe rates; if you push speed, watch error rates. Separate leading metrics, which move early and predict outcomes, from lagging ones, which confirm results later.",
      "Write definitions down in a shared metric dictionary with an owner, a data source and a change log. When the definition changes, tell people and restate history, or the trend line becomes meaningless. Treat ratios carefully: always keep the numerator and denominator visible, because a rate can improve simply because the denominator shrank.",
    ],
    keyIdeas: ["Event, population, window, filters and source define a metric", "Metric trees connect a headline number to its levers", "Pair goals with guardrails; separate leading and lagging", "A metric dictionary with owners and change history"],
    example: {
      title: "A metric tree and definition for monthly revenue",
      lang: "text",
      code: `Metric: Monthly Revenue
  Definition : Sum of paid order amounts (after discounts, excluding tax and refunds)
               for orders paid in the calendar month, in INR, excluding internal test accounts.
  Source     : warehouse.orders (status = 'paid', is_test = false)
  Owner      : Finance analytics        Refresh: daily 06:00

Metric tree
  Monthly Revenue
  = Active Customers  x  Orders per Customer  x  Average Order Value
      |                      |                       |
      |                      |                       +-- price mix, discounts, basket size
      |                      +-- frequency, reorder reminders, delivery speed
      +-- New customers (acquisition) + Returning customers (retention)

Guardrails
  - Refund rate must stay under 4%
  - Support tickets per 1,000 orders must not rise
  - Gross margin per order must not fall

Leading : sign-ups, first-order rate within 7 days
Lagging : 90-day retention, revenue per cohort`,
      walkthrough: ["The definition fixes the event, filters and source, so the number is reproducible.", "The multiplicative tree tells you which factor changed when revenue moves.", "Guardrails stop a team from raising revenue by discounting away profit or flooding support."],
    },
    practice: [
      { task: "Pick a product you use and write a one-paragraph definition of its 'active user' metric. List two ways a reader might misinterpret it.", hint: "Consider time window, internal users and what counts as activity." },
      { task: "Draw a metric tree for conversion rate from visit to purchase. Name an owner and a guardrail for each branch.", hint: "Break it into steps such as visit to product page, add to cart and checkout." },
    ],
    quiz: [
      { q: "Two teams report different 'active users'. What is the best fix?", options: ["Use the larger number", "Agree and publish one written definition with an owner", "Average them", "Stop reporting"], answer: 1, why: "A shared dictionary removes ambiguity at the source." },
      { q: "What is a guardrail metric?", options: ["The main goal", "A metric that must not get worse while you optimise the goal", "A banned metric", "A forecast"], answer: 1, why: "Guardrails catch harmful side effects of chasing a single number." },
      { q: "A conversion rate improved, but the denominator halved. What should you check?", options: ["Nothing, it improved", "Whether the change came from fewer eligible users rather than better performance", "The chart colours", "The refresh time"], answer: 1, why: "Always inspect numerator and denominator; a rate can rise for the wrong reason." },
    ],
    pitfalls: ["Changing a definition silently", "Reporting rates without counts", "Optimising a vanity metric with no guardrail"],
  },
  {
    ...base,
    id: "da-funnels-simpson",
    module: "Metrics and product analytics",
    title: "Funnels, segments and Simpson's paradox",
    minutes: 40,
    objectives: ["Build a funnel and compute step conversion", "Segment results to find who drives a change", "Recognise Simpson's paradox and mix effects"],
    explain: [
      "A funnel measures how many people get through each step of a journey, such as visit, sign-up, first action and purchase. Compute two numbers per step: the share of the previous step that continued, and the share of the top that reached it. The biggest drop between steps is a place to investigate, but a drop is only a symptom. Talk to users, watch sessions and look at errors before deciding what it means.",
      "Averages hide differences, so segment. Split results by channel, device, country, new versus returning customers, or plan type. A segment may be improving while the total looks flat, or the total may be moving because the mix of users changed rather than their behaviour. Always check how large each segment is, since small segments make noisy percentages.",
      "Simpson's paradox is the sharpest warning about mix. A treatment can look better inside every segment and still look worse overall if the groups have very different segment sizes. This happens when the allocation to segments is unbalanced, for example when most of the variant's users are new visitors who convert less. The lesson is not that numbers lie, but that you must ask which comparison answers the question and whether groups are comparable.",
      "When you see a surprising aggregate, break it down before explaining it. Compare segment shares between groups, compute conversion within each segment, and, if the groups differ in mix, report segment-level results or adjust for the mix. In a randomised experiment, the split should balance segments on average, so a big imbalance is itself a sign that something is wrong with assignment or tracking.",
    ],
    keyIdeas: ["Funnel: step conversion and cumulative conversion", "Segment before explaining an average", "Differences in group mix can reverse the overall result", "Check segment sizes, not just percentages"],
    example: {
      title: "A variant that wins every segment but loses overall",
      lang: "sql",
      code: `-- experiment_results: one row per user (variant, segment, converted 0/1)
WITH results AS (
  SELECT variant,
         segment,
         COUNT(*)                                    AS users,
         SUM(converted)                              AS conversions,
         ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS conv_pct
  FROM experiment_results
  GROUP BY variant, segment
  UNION ALL
  SELECT variant, 'ALL', COUNT(*), SUM(converted),
         ROUND(100.0 * SUM(converted) / COUNT(*), 1)
  FROM experiment_results
  GROUP BY variant
)
SELECT *
FROM results
ORDER BY CASE WHEN segment = 'ALL' THEN 1 ELSE 0 END, segment, variant;

-- Result with the data below:
-- control  new        200   20   10.0
-- variant  new        800   96   12.0     <- variant wins among new users
-- control  returning  800  160   20.0
-- variant  returning  200   44   22.0     <- and among returning users
-- control  ALL       1000  180   18.0
-- variant  ALL       1000  140   14.0     <- but loses overall: 80% of its users are new`,
      walkthrough: ["Each row inside a segment compares like with like, so the variant is better in both.", "The overall comparison is distorted because the variant group has a very different mix of new and returning users.", "In a properly randomised test the mix would be similar, so a mix like this points to an assignment or tracking bug."],
    },
    practice: [
      { task: "Take any dataset with a conversion flag and one segment column. Compute the overall rate and the rate per segment, and compare group mix.", hint: "If the overall and segment results disagree, compute each group's share of every segment." },
      { task: "Write the funnel for a sign-up flow with five steps and mark the step you would investigate first and why.", hint: "Look for the biggest absolute number of users lost, not only the biggest percentage drop." },
    ],
    quiz: [
      { q: "What causes Simpson's paradox?", options: ["Arithmetic errors", "Groups having very different mixes of an underlying segment", "Too much data", "Rounding"], answer: 1, why: "The overall rate is a weighted average, and different weights can reverse the comparison." },
      { q: "In a randomised experiment, a very unbalanced segment mix between groups suggests...", options: ["A great result", "A possible assignment or tracking problem", "Seasonality", "More users"], answer: 1, why: "Random assignment should balance segments on average, so imbalance needs investigating." },
      { q: "A funnel step drops from 40% to 35%. What is the right next step?", options: ["Declare the product broken", "Check significance, segment size and instrumentation, then segment the drop", "Ignore it", "Delete the step"], answer: 1, why: "Small changes may be noise, and tracking changes cause fake drops." },
    ],
    pitfalls: ["Explaining an aggregate without segmenting", "Comparing percentages from tiny segments", "Ignoring tracking changes that alter the funnel"],
  },
  {
    ...base,
    id: "da-chart-choice",
    module: "Visualisation and storytelling",
    title: "Choosing the right chart",
    minutes: 30,
    objectives: ["Match the chart to the question you are answering", "Avoid common chart mistakes that mislead", "Declutter a chart so the point is obvious"],
    explain: [
      "A chart is an argument, not decoration. Before choosing one, write down the question it answers and the single message you want a reader to take away. Then pick the form that makes that comparison easiest. People judge position along a common scale very accurately, length reasonably well, and area, angle and colour intensity poorly, so favour charts that rely on position and length.",
      "Use a few reliable defaults. To compare categories, use bars, sorted by value unless there is a natural order. To show change over time, use a line, with time on the horizontal axis. To show a relationship between two numbers, use a scatter plot. To show a distribution, use a histogram or box plot. To show parts of a whole, use a stacked bar or a simple table; pie charts work only with a few slices and one obvious comparison.",
      "Do not mislead. Bar charts must start at zero because their length encodes the value; lines can use a truncated axis if you say so. Avoid 3D effects, dual axes that suggest a false relationship, and rainbow palettes. Keep the same scale when comparing panels. Label directly instead of relying on a legend, and show uncertainty or sample sizes when they matter.",
      "Finally, declutter. Remove gridlines, borders and decoration that carry no information; use a muted colour for context and one strong colour to highlight the point; write the title as the finding, such as 'Repeat purchases fell 12% after the price change', rather than a description such as 'Repeat purchases by month'. The test is whether someone can get the message in five seconds.",
    ],
    keyIdeas: ["Start with the question and the one message", "Bars for categories, lines for time, scatter for relationships", "Bars start at zero; avoid 3D and misleading dual axes", "Declutter, highlight one thing, title with the finding"],
    example: {
      title: "A chart choice guide",
      lang: "text",
      code: `Question you are answering                  Best default                  Avoid
-------------------------------------------------------------------------------------------
Which category is biggest?                  Sorted horizontal bar         Pie with many slices
How did it change over time?                Line chart (time on x-axis)   Bars with 100 time points
Are two measures related?                   Scatter plot (+ trend line)   Two lines on dual axes
What does the spread look like?             Histogram or box plot         Average alone
How is the total split into parts?          Stacked bar or a table        3D pie
How did we do against a target?             Bullet chart or bar + line    Speedometer gauges
Where are the exact values needed?          Table, with highlights        A chart with no labels

Before publishing, check:
[ ] Title states the finding        [ ] Axis starts at zero (bars)     [ ] Units and period labelled
[ ] One highlight colour            [ ] Direct labels, no legend hunt  [ ] Source and date noted`,
      walkthrough: ["Match the visual form to the comparison the reader must make.", "The checks catch the most common ways charts mislead or confuse.", "A finding-style title lets a skimming reader get the point without studying the chart."],
    },
    practice: [
      { task: "Find a published chart that is hard to read. Redraw it using the guide and write one sentence on what improved.", hint: "Look for truncated bars, rainbow colours and legends that force eye movement." },
      { task: "Take one dataset and draw it three ways. Choose the clearest and explain why.", hint: "Show the draft to someone for five seconds and ask what they noticed." },
    ],
    quiz: [
      { q: "Why must a bar chart start at zero?", options: ["Tradition", "Bar length encodes the value, so truncation exaggerates differences", "Software requires it", "It saves space"], answer: 1, why: "Truncated bars make small differences look large." },
      { q: "Best chart for how a metric changed over 24 months?", options: ["Pie chart", "Line chart", "3D bars", "Stacked area for unrelated series"], answer: 1, why: "Lines make trends along a time axis easy to see." },
      { q: "What makes a good chart title?", options: ["The data source", "A short statement of the finding", "The chart type", "The author's name"], answer: 1, why: "A finding title tells the reader what to notice." },
    ],
    pitfalls: ["Choosing a chart because it looks impressive", "Dual axes that imply causation", "Colour used with no meaning"],
  },
  {
    ...base,
    id: "da-dashboard-design",
    module: "Visualisation and storytelling",
    title: "Designing a dashboard people use",
    minutes: 35,
    objectives: ["Design a dashboard around decisions", "Lay out information from headline to detail", "Build in trust: definitions, freshness and checks"],
    explain: [
      "Most dashboards fail because nobody decided what they were for. Start by asking who will look at it, how often and which decision it supports. An executive checking weekly health, an operations lead monitoring daily exceptions and an analyst exploring a question need different designs. A dashboard that tries to serve everyone serves nobody, so write a one-sentence purpose and cut anything that does not support it.",
      "Arrange information from the general to the specific. Put the few headline numbers at the top, each with context such as change versus last period or target. Below them place the drivers: the breakdowns that explain movement. Put detailed tables at the bottom or behind a drill-down. Group related items, align them on a grid, keep consistent colours and formats, and keep the total number of visuals small, often six to nine.",
      "Make comparison and action easy. A number alone is meaningless; show it against a target, a prior period or a benchmark, and use sparklines for trend. Use colour sparingly to flag what needs attention. Add filters only where users really need them, with sensible defaults, because every filter creates a state in which a reader can misread the page. Make sure the page loads fast, since slow dashboards are abandoned.",
      "Build trust into the page. Show the data freshness time, link each metric to its definition, and display data-quality checks such as row counts or reconciliation to finance. Name an owner who can answer questions. After launch, watch usage: if nobody opens a dashboard after a month, remove it. Ask users what decision they made with it, and improve it from their answers.",
    ],
    keyIdeas: ["Purpose and audience first", "Headline, drivers, detail", "Always show context: target, prior period, trend", "Show freshness, definitions and an owner"],
    example: {
      title: "A dashboard specification",
      lang: "text",
      code: `Name      : Weekly Subscription Health
Audience  : Product leadership (reviewed Monday, 10 minutes)
Decision  : Do we need to intervene on acquisition, activation, or retention this week?

Layout (top to bottom)
  Row 1 - Headline tiles (each: value, vs last week, vs target, 12-week sparkline)
          New subscribers | Activation rate | 30-day retention | Net revenue
  Row 2 - Drivers
          Subscribers by channel (sorted bars)      Activation by plan (bars)
          Retention curve by cohort (lines)         Revenue bridge: new, expansion, churn (waterfall)
  Row 3 - Detail (drill-down)
          Table of cohorts with sample sizes and cells highlighted where below target

Filters   : Date range (default last 12 weeks), Country (default all)
Trust     : "Data as of" timestamp | link to metric dictionary | daily reconciliation to finance
Owner     : Growth analytics (#growth-analytics)
Refresh   : daily 06:00      Load time target: under 3 seconds
Review    : check usage after 30 days; retire if unopened`,
      walkthrough: ["The purpose and decision at the top constrain every later choice.", "The three rows move from headline to drivers to detail, so a reader can stop whenever they have enough.", "The trust section answers the questions that otherwise erode confidence: is this fresh, what does it mean and who owns it."],
    },
    practice: [
      { task: "Write the one-sentence purpose and decision for a dashboard you could build from data you have. List three things that do not belong on it.", hint: "If an item does not change a decision, it belongs elsewhere." },
      { task: "Sketch the layout on paper and ask someone to say what they think is happening in 10 seconds.", hint: "If they cannot, simplify the top row." },
    ],
    quiz: [
      { q: "What should you decide before building a dashboard?", options: ["The colour theme", "Who uses it and which decision it supports", "The number of charts", "The tool"], answer: 1, why: "Purpose and audience determine content and layout." },
      { q: "Why show a number with a target or prior period?", options: ["It fills space", "A number alone has no meaning without context", "Tools require it", "To hide errors"], answer: 1, why: "Context turns a figure into a signal." },
      { q: "A dashboard has not been opened in a month. What should you do?", options: ["Add more charts", "Ask users why and retire or redesign it", "Ignore it", "Make it bigger"], answer: 1, why: "Unused dashboards cost maintenance and erode trust in the rest." },
    ],
    pitfalls: ["Twenty charts with no purpose", "No freshness timestamp or definitions", "Filters that let users create misleading views"],
  },
  {
    ...base,
    id: "da-story-memo",
    module: "Visualisation and storytelling",
    title: "From analysis to a recommendation memo",
    minutes: 35,
    objectives: ["Structure a one-page memo that leads with the answer", "Explain uncertainty and caveats without losing the message", "Tailor the same analysis to a different audience"],
    explain: [
      "Analysis only creates value when it changes a decision, and decisions are made by people who have little time. The pyramid principle is a reliable structure: lead with the answer, then give the few supporting reasons, then the evidence. A reader who stops after the first paragraph should still know what you recommend. Save the journey, including false starts, for an appendix or a conversation.",
      "A good memo has a recognisable shape. Start with the question and the recommendation in two or three sentences. Follow with the three strongest findings, each with one chart or number and a plain-language interpretation. State the size of the effect, not only that it exists. Then give the risks, caveats and what would change your mind, followed by the proposed next steps with owners and dates.",
      "Communicate uncertainty honestly. Replace vague hedging with specifics: give a range, say how confident you are and why, and separate what you measured from what you infer. 'Conversion rose by about two points, plausibly between one and three' is more useful than 'conversion may have improved'. Name data limitations that could change the conclusion, but do not bury the message in disclaimers.",
      "Adapt to the audience. An executive wants the decision, impact and risk. A product manager wants the segments and mechanisms. An engineer wants definitions and reproducibility. Keep one analysis and several views of it. Before sending, read the memo as the recipient: is the ask clear, is every term defined, and could someone act on it without a meeting? Follow up after the decision to learn what happened, which improves your next recommendation.",
    ],
    keyIdeas: ["Answer first, then reasons, then evidence", "Quantify effect size and uncertainty", "State caveats and what would change your mind", "Tailor the view to the audience; end with next steps"],
    example: {
      title: "A one-page memo template with a filled-in example",
      lang: "text",
      code: `Title: Move the free-trial prompt earlier to lift activation (recommend a 2-week rollout)

Recommendation
  Show the free-trial prompt after the first completed lesson instead of after day 3.
  Expected effect: about +2.1 points of 30-day activation (plausible range +1.0 to +3.2).

Why we believe it
  1. In the experiment (n = 16,000 over 4 weeks), the earlier prompt raised activation from 6.0% to 8.1%.
  2. The lift held in all three main channels; it was largest for paid social (+3.4 points).
  3. Support tickets and unsubscribe rate did not change (guardrails held).

Risks and caveats
  - Test ran in one country; results may differ elsewhere.
  - Effect on 90-day retention is unknown. We will check cohorts at 30 and 90 days.
  What would change our mind: a drop in retention of more than 1 point at day 30.

Next steps
  Product: ship to 50% of users by 14 March (owner: Priya)
  Analytics: monitor guardrails weekly and report at the next review (owner: Dev)
  Decision needed from: Head of Growth by 10 March`,
      walkthrough: ["The title and first paragraph carry the whole decision.", "Each finding is backed by a number and a plain interpretation, and the guardrail result is stated.", "Caveats come with a concrete trigger that would reverse the recommendation."],
    },
    practice: [
      { task: "Take an analysis you did and rewrite its summary as a memo with the answer in the first two sentences.", hint: "Delete anything that only describes how you got there." },
      { task: "Write the same findings for an executive and for an engineer. List what you cut or added for each.", hint: "Executives need impact and risk; engineers need definitions and reproducibility." },
    ],
    quiz: [
      { q: "Where does the recommendation go in a memo?", options: ["At the end", "In the first paragraph", "In an appendix", "Only in a meeting"], answer: 1, why: "Readers with little time must be able to stop early and still know the answer." },
      { q: "Which is the better statement of uncertainty?", options: ["Conversion may have improved", "Conversion rose about 2 points, plausibly between 1 and 3", "Results are inconclusive", "Conversion is up"], answer: 1, why: "A range and a size give the reader something to act on." },
      { q: "What should every caveat come with?", options: ["An apology", "An indication of whether and how it would change the decision", "A longer appendix", "A new chart"], answer: 1, why: "A caveat is useful when the reader can tell what would change the recommendation." },
    ],
    pitfalls: ["Burying the answer under methodology", "Reporting that an effect exists without its size", "Sending the same document to every audience"],
  },
  {
    ...base,
    id: "da-star-schema",
    module: "BI tools and data modelling",
    title: "Star schemas: facts, dimensions and grain",
    minutes: 40,
    objectives: ["Define the grain of a fact table", "Separate measures from descriptive attributes", "Build and query a simple star schema"],
    explain: [
      "BI tools are fast and correct when the data behind them is shaped for questions. The standard shape is the star schema. A fact table records events or measurements, such as one row per order line, with numeric measures like quantity and revenue and keys that point to dimensions. Dimension tables describe the who, what, when and where: customers, products, dates and stores. The fact sits in the middle like the hub of a star.",
      "The first and most important decision is the grain: exactly what does one row of the fact table represent? One row per order line is a grain. One row per order is a different grain. Pick the most detailed grain you will need and state it in one sentence. Every measure and every dimension key must be true at that grain. Mixing grains in one table, for example an order-level shipping fee repeated on each line, makes sums wrong.",
      "Dimensions hold the attributes people filter and group by: product category, customer segment, month name, region. Keep them descriptive and denormalised, because wide, flat dimensions make reports simple and fast. A date dimension, with one row per day and columns for week, month, quarter and holiday flags, is nearly always worth building. Use surrogate integer keys so you can track changes in a dimension, such as a customer moving region, without rewriting history.",
      "With this model, tools like Power BI and Tableau can join the dimensions to the fact automatically, and measures like total revenue are defined once and reused everywhere. Keep calculations that belong in the model in the model, not scattered across reports. Document the grain, the keys and each measure, and test the model by reconciling totals to the source system.",
    ],
    keyIdeas: ["Fact tables hold measures at a stated grain", "Dimensions hold descriptive attributes used to filter and group", "Never mix grains in one fact table", "Define measures once in the model and reconcile to the source"],
    example: {
      title: "A sales star schema and a query against it",
      lang: "sql",
      code: `-- Grain of fact_sales: ONE ROW PER ORDER LINE
CREATE TABLE dim_date (
  date_key INTEGER PRIMARY KEY,          -- e.g. 20260314
  full_date TEXT, year INTEGER, quarter INTEGER, month INTEGER, month_name TEXT, is_weekend INTEGER
);
CREATE TABLE dim_product (
  product_key INTEGER PRIMARY KEY, product_name TEXT, category TEXT, brand TEXT
);
CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY, customer_name TEXT, segment TEXT, region TEXT
);
CREATE TABLE fact_sales (
  date_key INTEGER REFERENCES dim_date(date_key),
  product_key INTEGER REFERENCES dim_product(product_key),
  customer_key INTEGER REFERENCES dim_customer(customer_key),
  order_id TEXT,
  quantity INTEGER,
  revenue REAL,                          -- measures, true at the order-line grain
  discount REAL
);

-- Revenue by category and region for one quarter
SELECT p.category, c.region, SUM(f.revenue) AS revenue, SUM(f.quantity) AS units
FROM fact_sales f
JOIN dim_product  p ON p.product_key  = f.product_key
JOIN dim_customer c ON c.customer_key = f.customer_key
JOIN dim_date     d ON d.date_key     = f.date_key
WHERE d.year = 2026 AND d.quarter = 1
GROUP BY p.category, c.region
ORDER BY revenue DESC;`,
      walkthrough: ["The comment states the grain first; every column must be true for one order line.", "Dimensions are wide and descriptive, so filters and groupings need only simple joins.", "The report query is a plain star join, which BI tools generate automatically."],
    },
    practice: [
      { task: "Take a dataset you know and write its grain in one sentence. List which columns are measures and which describe dimensions.", hint: "If you cannot state the grain in one sentence, the table is probably mixing levels." },
      { task: "Reconcile total revenue in your star schema to the source system and explain any difference.", hint: "Common causes are dropped rows from inner joins, missing dimension keys and duplicated lines." },
    ],
    quiz: [
      { q: "What is the grain of a fact table?", options: ["Its size in rows", "What one row represents", "The number of dimensions", "Its primary key name"], answer: 1, why: "The grain is the precise meaning of one row, and everything else must be consistent with it." },
      { q: "An order-level shipping fee is repeated on each order line. What goes wrong?", options: ["Nothing", "Summing the fee over lines overcounts it", "The dimension breaks", "Dates shift"], answer: 1, why: "A measure that belongs to a coarser grain must not be stored at a finer one without allocation." },
      { q: "Why use surrogate keys in dimensions?", options: ["They are shorter than names", "They allow tracking changes without rewriting history and decouple from source ids", "They are required by SQL", "They speed up charts only"], answer: 1, why: "Surrogate keys let you version a dimension row and keep old facts pointing to the old version." },
    ],
    pitfalls: ["Mixing grains in one fact table", "Using inner joins that silently drop facts with missing dimensions", "Putting calculations in each report instead of in the model"],
  },
  {
    ...base,
    id: "da-sql-interview",
    module: "Analyst interviews and case practice",
    title: "SQL interview patterns that come up again and again",
    minutes: 40,
    objectives: ["Solve top-N per group, deduplication and consecutive-days questions", "Think aloud while building a query in steps", "Check results on a tiny dataset before submitting"],
    explain: [
      "Analyst SQL interviews reuse a small set of patterns, so learning the patterns beats memorising problems. The most common are top-N per group, which uses ROW_NUMBER or DENSE_RANK partitioned by the group; deduplication, keeping the latest or first row per key with ROW_NUMBER; running totals and period comparisons with window functions; and finding consecutive sequences, called gaps and islands.",
      "Gaps and islands deserves a closer look. To find streaks of consecutive days a user was active, number each user's distinct days in order and subtract that row number from a day number. Days in the same unbroken run give the same difference, because both the day and the row number increase by one together. Group by that difference to get each streak's start, end and length. It feels like a trick the first time and is routine afterwards.",
      "How you work matters as much as the final query. Restate the problem and ask about edge cases: ties, nulls, duplicate rows, and what 'consecutive' means. Write the query in small steps with CTEs, naming each step clearly, and say what each one produces. Start with a tiny dataset of five to ten rows you can reason about, and check the result by hand before running it on the real table.",
      "Know the common traps. COUNT(*) counts rows but COUNT(column) ignores nulls. A LEFT JOIN followed by a filter on the right table turns into an inner join. Averages of averages are wrong unless the groups are equal in size. Dialects differ in date functions and in syntax such as LIMIT versus TOP, so name the dialect you assume. If you get stuck, explain your approach in words; interviewers often reward clear reasoning over a perfect query.",
    ],
    keyIdeas: ["ROW_NUMBER or DENSE_RANK for top-N and dedup", "Gaps and islands: day number minus row number", "Think aloud, use CTEs, test on a tiny dataset", "Mind ties, nulls, join filters and dialect differences"],
    example: {
      title: "Three patterns on a small table",
      lang: "sql",
      code: `-- Table: logins(user_id, day_number)   -- day_number is an integer (e.g. days since 2026-01-01)
--        orders(order_id, customer_id, amount, placed_at)

-- 1) Top 2 orders by amount per customer (ties: DENSE_RANK keeps all tied rows)
WITH ranked AS (
  SELECT customer_id, order_id, amount,
         DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rnk
  FROM orders
)
SELECT customer_id, order_id, amount FROM ranked WHERE rnk <= 2;

-- 2) Keep only the latest order per customer (deduplicate)
WITH numbered AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC, order_id DESC) AS rn
  FROM orders
)
SELECT order_id, customer_id, amount, placed_at FROM numbered WHERE rn = 1;

-- 3) Longest streak of consecutive login days per user (gaps and islands)
WITH days AS (
  SELECT DISTINCT user_id, day_number FROM logins
), grouped AS (
  SELECT user_id, day_number,
         day_number - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_number) AS grp
  FROM days
), streaks AS (
  SELECT user_id, grp, MIN(day_number) AS streak_start, MAX(day_number) AS streak_end,
         COUNT(*) AS streak_days
  FROM grouped
  GROUP BY user_id, grp
)
SELECT user_id, MAX(streak_days) AS longest_streak
FROM streaks
GROUP BY user_id
ORDER BY longest_streak DESC;`,
      walkthrough: ["DENSE_RANK keeps ties in the top-N; switch to ROW_NUMBER if you want exactly N rows.", "The deduplication adds a second sort key so the 'latest' row is deterministic.", "In the streak query, consecutive days share the same day_number minus row number, so grouping on it isolates each run."],
    },
    practice: [
      { task: "Create a ten-row logins table by hand with two streaks for one user. Run the streak query and check by eye.", hint: "Include a duplicate day to prove DISTINCT matters." },
      { task: "Solve 'second highest salary per department' two ways, with DENSE_RANK and with a subquery, and state which handles ties better.", hint: "DENSE_RANK with rnk = 2 returns the second distinct value." },
    ],
    quiz: [
      { q: "Why subtract ROW_NUMBER from the day number to find streaks?", options: ["To sort the data", "Consecutive days produce the same difference, which identifies each run", "To remove nulls", "To count users"], answer: 1, why: "Within an unbroken run both values increase by one, so their difference stays constant." },
      { q: "A top-3 per group query must return exactly 3 rows even with ties. Which function?", options: ["RANK", "DENSE_RANK", "ROW_NUMBER", "NTILE"], answer: 2, why: "ROW_NUMBER assigns unique positions; RANK and DENSE_RANK can return more rows when values tie." },
      { q: "What is the best first step in an interview SQL question?", options: ["Start typing immediately", "Clarify ties, nulls, duplicates and the dialect, then outline the steps", "Ask to skip it", "Write one huge query"], answer: 1, why: "Clarifying assumptions and building in steps prevents most mistakes." },
    ],
    pitfalls: ["Forgetting DISTINCT before computing streaks", "Not saying how ties are handled", "Writing one giant unreadable query"],
  },
  {
    ...base,
    id: "da-metric-drop",
    module: "Analyst interviews and case practice",
    title: "Case: why did the metric drop?",
    minutes: 35,
    objectives: ["Follow a repeatable structure for metric investigations", "Validate data before inventing explanations", "Rank hypotheses and say what you would check next"],
    explain: [
      "'Sign-ups fell 20% last week. Why?' is the classic analyst case, and a structure beats improvisation. First, clarify: which metric exactly, over what period, compared with when, and how sure are we that the drop is real? Ask about the definition and about recent changes, then confirm the size and shape of the drop. Is it a step down, a slow decline, or a single bad day?",
      "Second, validate the data before searching for causes. Many drops are measurement problems: a tracking event stopped firing after a release, a pipeline failed or delayed, a bot filter changed, or a dashboard filter hides a segment. Compare against an independent source such as server logs or finance records. If the number only fell in one data source, you have found a data issue, not a business problem.",
      "Third, localise the drop by decomposing the metric. Break it down by time, platform, country, channel, product version and user type, and see where the entire change sits. Use the metric tree to separate volume from rate: did traffic fall, or did conversion fall? A drop concentrated in one platform and starting at a release time points to a bug; a drop across all segments after a pricing change points to demand.",
      "Fourth, generate and rank hypotheses across internal causes such as releases, experiments, pricing and campaigns, and external ones such as seasonality, holidays, competitors and outages. For each, say which evidence would confirm or rule it out and check the cheapest and most likely first. Finish with a recommendation: what you found, how confident you are, what you would do now and what you would monitor. Interviewers want structure and judgement, not a lucky guess.",
    ],
    keyIdeas: ["Clarify, validate, localise, hypothesise, recommend", "Rule out tracking and pipeline problems first", "Decompose into volume and rate, then by segment and time", "Rank hypotheses by likelihood and cost to check"],
    example: {
      title: "Localising a drop with one query",
      lang: "sql",
      code: `-- signups(user_id, signup_day, platform, channel)  -- signup_day is an integer day number
-- Compare this week (days 15-21) with last week (days 8-14) by platform and channel
SELECT platform,
       channel,
       SUM(CASE WHEN signup_day BETWEEN 8  AND 14 THEN 1 ELSE 0 END) AS last_week,
       SUM(CASE WHEN signup_day BETWEEN 15 AND 21 THEN 1 ELSE 0 END) AS this_week,
       SUM(CASE WHEN signup_day BETWEEN 15 AND 21 THEN 1 ELSE 0 END)
     - SUM(CASE WHEN signup_day BETWEEN 8  AND 14 THEN 1 ELSE 0 END) AS change
FROM signups
WHERE signup_day BETWEEN 8 AND 21
GROUP BY platform, channel
ORDER BY change ASC;          -- the biggest decreases first

-- Reading the result:
--   android / organic: -310 while every other row is roughly flat
--   -> check app release notes, Play Store listing changes and the Android sign-up event.
--   Compare with server-side sign-up counts to rule out a tracking failure.`,
      walkthrough: ["Conditional sums put both weeks side by side, so the change per segment is visible at once.", "Sorting by change surfaces where the drop is concentrated.", "A drop in one platform and channel points to a specific cause that can be checked quickly."],
    },
    practice: [
      { task: "Write a checklist of ten things to rule out before concluding that demand fell, in the order you would check them.", hint: "Start with data and tracking, then product changes, then marketing, then external causes." },
      { task: "Practise the case aloud in five minutes using the five steps. Record yourself and note where you rambled.", hint: "Say the structure first, then fill it in." },
    ],
    quiz: [
      { q: "What should you do before explaining a metric drop?", options: ["Propose a fix", "Validate that the data and tracking are correct", "Blame the season", "Email the CEO"], answer: 1, why: "A large share of apparent drops are measurement problems." },
      { q: "A drop appears only on Android, starting the day of a release. Most likely cause?", options: ["A global recession", "A release bug or tracking change on Android", "Seasonality", "A pricing change"], answer: 1, why: "Concentration in one platform at a release time is a classic signature of an app issue." },
      { q: "Why decompose into volume and rate?", options: ["To use more SQL", "To tell whether fewer people arrived or fewer converted", "To hide the issue", "To save time"], answer: 1, why: "The two causes need different investigations and owners." },
    ],
    pitfalls: ["Jumping to a cause without checking the data", "Listing hypotheses with no plan to test them", "Ending without a recommendation"],
  },
];

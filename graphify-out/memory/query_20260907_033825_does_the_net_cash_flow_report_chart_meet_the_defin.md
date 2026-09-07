---
type: "query"
date: "2026-09-07T03:38:25.808984+00:00"
question: "Does the net cash flow report chart meet the definition of net cash flow?"
contributor: "graphify"
source_nodes: ["CashflowTrendChart", "getPeriodSummary", "getCashflowSummary"]
---

# Q: Does the net cash flow report chart meet the definition of net cash flow?

## Answer

Partially. The chart computes net per period as income minus expense, but period summaries exclude budget-offset income instead of applying offsets against expenses. This makes chart totals disagree with the cashflow summary whenever offsets exist. Empty periods are also omitted, and the default metric is income rather than net.

## Source Nodes

- CashflowTrendChart
- getPeriodSummary
- getCashflowSummary
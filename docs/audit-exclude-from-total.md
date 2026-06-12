# Audit: exclude_from_total - 2026-06-12

The SQLite transaction repository was also verified before the checklist:

- `create()` inserts `exclude_from_total`.
- `update()` persists changes to `exclude_from_total`.
- `list()` selects `t.exclude_from_total`.
- `getSummaryByAccountType()` filters with `AND t.exclude_from_total = 0`.

| # | File | Function / Component | Status | Notes |
|---|------|----------------------|--------|-------|
| 1 | TransactionList.tsx | addTransactionAmount / day group headers | Fixed | The shared helper already skipped flagged amounts while preserving count. Added the same skip to the direct day-group aggregation after retaining the item. |
| 2 | sqlite-budget.repository.ts | getSpentAmount | Pass | Filters with `AND exclude_from_total = 0`. |
| 2 | sqlite-budget.repository.ts | getSpentAmountByAccountType | Pass | Filters with `AND t.exclude_from_total = 0`. |
| 3 | sqlite-report.repository.ts | getCategorySummary | Pass | Filters with `AND t.exclude_from_total = 0`. |
| 3 | sqlite-report.repository.ts | getPeriodSummary | Pass | Filters with `AND exclude_from_total = 0`. |
| 3 | sqlite-report.repository.ts | getCashflowSummary | Pass | Filters with `AND exclude_from_total = 0`. |
| 3 | sqlite-report.repository.ts | getWalletSummary | Pass | Filters with `AND t.exclude_from_total = 0`. |
| 4 | useTransactionSummary.ts / DashboardPage.tsx | Home income and expense totals | Fixed | Dashboard totals were reduced from the transaction list without checking the flag. Added an early skip for flagged transactions. |
| 5 | in-memory-transaction.repository.ts | create() | Pass | Defaults `exclude_from_total` to `false` and persists supplied values. |
| 6 | transaction.model.ts | Transaction interface | Pass | Includes required `exclude_from_total: boolean`. |
| 6 | transaction.model.ts | CreateTransactionInput | Pass | Includes optional `exclude_from_total?: boolean`. |
| 6 | transaction.model.ts | UpdateTransactionInput | Pass | Includes optional `exclude_from_total?: boolean`. |

## Conclusion

- Total checks: 12
- Pass: 10
- Fixed: 2
- Flagged transactions remain visible and continue to affect wallet balances.
- Flagged transactions are excluded from user-visible income and expense totals covered by this audit.

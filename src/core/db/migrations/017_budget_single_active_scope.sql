-- Migration 017: add the active-budget scope index.
-- The previous data cleanup used self-join aliases with dotted id references,
-- which can fail in the Capacitor SQLite Web migration path. Runtime budget
-- writes now enforce the single-active-budget rule.

CREATE INDEX IF NOT EXISTS idx_budgets_active_scope
  ON budgets(category_id, wallet_id, account_type_scope, is_active);

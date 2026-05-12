-- Migration 015: Budget có thể scope theo account_type
-- account_type_scope NULL = áp dụng tất cả loại tài khoản
ALTER TABLE budgets ADD COLUMN account_type_scope TEXT
  CHECK (account_type_scope IN ('cash','bank','credit_card','e_wallet','investment','other') OR account_type_scope IS NULL);

-- Index hỗ trợ query budget theo account_type
CREATE INDEX IF NOT EXISTS idx_budgets_account_type ON budgets(account_type_scope, is_active);

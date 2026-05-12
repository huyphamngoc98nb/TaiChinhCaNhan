-- Migration 014: Bổ sung field cho credit_card và index hỗ trợ lọc account_type
ALTER TABLE wallets ADD COLUMN credit_limit REAL;
ALTER TABLE wallets ADD COLUMN statement_day INTEGER; -- ngày sao kê 1-31
ALTER TABLE wallets ADD COLUMN due_day INTEGER;       -- ngày đến hạn 1-31

CREATE INDEX IF NOT EXISTS idx_wallets_account_type ON wallets(account_type, is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_sort ON wallets(sort_order, is_active);

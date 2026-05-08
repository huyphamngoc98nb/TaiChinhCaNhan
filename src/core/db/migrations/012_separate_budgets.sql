-- Migration 012: Tách bảng budgets độc lập khỏi categories
-- Lý do: budget_amount/budget_period lưu trực tiếp trong categories
--        không cho phép multi-period, không có lịch sử, không gắn wallet

-- 1. Tạo bảng budgets riêng
CREATE TABLE IF NOT EXISTS budgets (
  id          TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  wallet_id   TEXT,                    -- NULL = áp dụng cho mọi ví
  amount      REAL NOT NULL CHECK (amount > 0),
  period      TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  start_date  INTEGER NOT NULL,        -- epoch ms, đầu kỳ ngân sách
  end_date    INTEGER,                 -- NULL = recurring (tự gia hạn)
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id)   REFERENCES wallets(id)   ON DELETE SET NULL
);

-- 2. Index cho query phổ biến
CREATE INDEX IF NOT EXISTS idx_budgets_active
  ON budgets(category_id, period, is_active, start_date);

CREATE INDEX IF NOT EXISTS idx_budgets_wallet
  ON budgets(wallet_id, is_active);

-- 3. Migrate data cũ từ categories → budgets
INSERT INTO budgets (
  id, category_id, wallet_id,
  amount, period, start_date,
  is_active, created_at, updated_at
)
SELECT
  lower(hex(randomblob(16))),
  id,
  NULL,
  budget_amount,
  COALESCE(budget_period, 'monthly'),
  (strftime('%s', 'now', 'start of month') * 1000),
  1,
  created_at,
  updated_at
FROM categories
WHERE budget_amount IS NOT NULL;

-- 4. Guard: chỉ DROP COLUMN nếu SQLite >= 3.35
-- Nếu version thấp hơn, application code bỏ qua cột này (nullable).
-- Kiểm tra version trong migration-runner trước khi chạy bước này.
SELECT CASE
  WHEN sqlite_version() >= '3.35.0' THEN 'DROP_SUPPORTED'
  ELSE 'DROP_NOT_SUPPORTED'
END AS drop_column_support;

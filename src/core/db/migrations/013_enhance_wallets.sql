-- Migration 013: Nâng cấp bảng wallets thành account đầy đủ
-- Thêm: loại tài khoản, icon, màu, thứ tự, trạng thái active,
--       tuỳ chọn loại trừ khỏi tổng tài sản

ALTER TABLE wallets ADD COLUMN account_type TEXT NOT NULL DEFAULT 'cash'
  CHECK (account_type IN ('cash', 'bank', 'credit_card', 'e_wallet', 'investment', 'other'));

ALTER TABLE wallets ADD COLUMN icon  TEXT;

ALTER TABLE wallets ADD COLUMN color TEXT;

ALTER TABLE wallets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE wallets ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
  CHECK (is_active IN (0, 1));

ALTER TABLE wallets ADD COLUMN exclude_from_total INTEGER NOT NULL DEFAULT 0
  CHECK (exclude_from_total IN (0, 1));

-- Backfill: tất cả ví cũ mặc định là 'cash' và active
UPDATE wallets
SET
  account_type = 'cash',
  is_active    = 1,
  sort_order   = 0
WHERE account_type IS NULL OR account_type = '';

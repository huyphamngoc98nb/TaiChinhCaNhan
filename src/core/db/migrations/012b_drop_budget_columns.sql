-- Migration 012b: Xoá cột budget_amount, budget_period khỏi categories
-- CHỈ chạy migration này nếu SQLite >= 3.35
-- migration-runner.ts sẽ kiểm tra version trước khi thực thi.

ALTER TABLE categories DROP COLUMN IF EXISTS budget_amount;
ALTER TABLE categories DROP COLUMN IF EXISTS budget_period;

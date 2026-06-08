-- Migration 007: Add to_wallet_id to transactions for transfers
-- Note: SQLite does not support adding CHECK constraints via ALTER TABLE.
-- We add the column and will enforce the logic via triggers in migration 008 
-- or application logic to keep the migration simple and safe.

ALTER TABLE transactions ADD COLUMN to_wallet_id TEXT;

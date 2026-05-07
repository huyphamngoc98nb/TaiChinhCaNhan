ALTER TABLE transactions ADD COLUMN deleted_at INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

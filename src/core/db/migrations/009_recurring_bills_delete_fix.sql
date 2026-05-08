-- Migration 009: Fix recurring_bills is_active constraint to allow soft delete (-1)
-- SQLite does not support ALTER TABLE DROP CONSTRAINT. 
-- We must recreate the table.

PRAGMA foreign_keys=OFF;

CREATE TABLE recurring_bills_new (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date INTEGER NOT NULL,
  reminder_days INTEGER NOT NULL DEFAULT 3,
  is_active INTEGER NOT NULL CHECK (is_active IN (-1, 0, 1)) DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

INSERT INTO recurring_bills_new 
SELECT id, wallet_id, category_id, name, amount, frequency, next_due_date, reminder_days, is_active, created_at, updated_at 
FROM recurring_bills;

DROP TABLE recurring_bills;
ALTER TABLE recurring_bills_new RENAME TO recurring_bills;

-- Re-create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_bills_due_active ON recurring_bills(next_due_date, is_active);

PRAGMA foreign_keys=ON;

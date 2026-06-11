-- Migration 029: Fix loan monetary columns to REAL for decimal support.
-- SQLite does not support ALTER COLUMN; recreate the tables while preserving later loan columns.

PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

ALTER TABLE loan_payments RENAME TO loan_payments_old;
ALTER TABLE loans RENAME TO loans_old;

CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  wallet_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('lend', 'borrow')),
  contact_name TEXT NOT NULL,
  contact_info TEXT,
  principal REAL NOT NULL CHECK (principal > 0),
  due_date TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  skip_transaction INTEGER NOT NULL DEFAULT 0 CHECK (skip_transaction IN (0, 1)),
  linked_transaction_id TEXT,
  loan_date TEXT,
  CHECK (skip_transaction = 1 OR wallet_id IS NOT NULL),
  FOREIGN KEY (wallet_id) REFERENCES wallets (id)
);

INSERT INTO loans (
  id, wallet_id, type, contact_name, contact_info, principal, due_date, note,
  status, created_at, updated_at, deleted_at, skip_transaction, linked_transaction_id, loan_date
)
SELECT
  id, wallet_id, type, contact_name, contact_info, principal, due_date, note,
  status, created_at, updated_at, deleted_at, skip_transaction, linked_transaction_id, loan_date
FROM loans_old;

CREATE TABLE loan_payments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_date INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets (id)
);

INSERT INTO loan_payments SELECT * FROM loan_payments_old;

DROP TABLE loan_payments_old;
DROP TABLE loans_old;

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);

PRAGMA foreign_keys=ON;

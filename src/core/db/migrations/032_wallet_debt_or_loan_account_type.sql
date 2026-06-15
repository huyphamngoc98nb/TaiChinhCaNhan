-- Migration 032: Allow wallets to be tagged as debt/loan accounts.
PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

DROP TABLE IF EXISTS wallets_new;

CREATE TABLE wallets_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'cash'
    CHECK (account_type IN ('cash', 'bank', 'credit_card', 'e_wallet', 'debt_or_loan', 'investment', 'other')),
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  exclude_from_total INTEGER NOT NULL DEFAULT 0 CHECK (exclude_from_total IN (0, 1)),
  credit_limit REAL,
  statement_day INTEGER,
  due_day INTEGER,
  annual_fee REAL
);

INSERT INTO wallets_new (
  id, name, currency, balance, created_at, updated_at,
  account_type, icon, color, sort_order, is_active, exclude_from_total,
  credit_limit, statement_day, due_day, annual_fee
)
SELECT
  id, name, currency, balance, created_at, updated_at,
  account_type, icon, color, sort_order, is_active, exclude_from_total,
  credit_limit, statement_day, due_day, annual_fee
FROM wallets;

DROP TABLE wallets;
ALTER TABLE wallets_new RENAME TO wallets;

CREATE INDEX IF NOT EXISTS idx_wallets_account_type ON wallets(account_type, is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_sort ON wallets(sort_order, is_active);

PRAGMA foreign_keys=ON;

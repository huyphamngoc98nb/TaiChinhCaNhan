-- Migration 026: Link loans to their opening transaction.
-- Keep this as a plain nullable TEXT column. Some SQLite providers reject
-- REFERENCES clauses in ALTER TABLE ADD COLUMN during first-run migrations.
ALTER TABLE loans ADD COLUMN linked_transaction_id TEXT;

-- Stores the opening transaction created for a loan when skip_transaction = 0.
-- NULL means the loan is tracked without an opening transaction.

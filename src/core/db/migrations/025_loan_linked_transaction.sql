ALTER TABLE loans ADD COLUMN linked_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL;

-- Stores the opening transaction created for a loan when skip_transaction = 0.
-- NULL means the loan is tracked without an opening transaction.

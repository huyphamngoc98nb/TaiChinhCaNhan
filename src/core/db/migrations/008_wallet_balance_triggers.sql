-- Migration 008: One-time balance sync only.
-- All triggers originally planned here have been removed:
--
--  * trg_wallets_balance_after_insert/update/delete
--    Removed: balance is managed atomically in the service layer.
--    Having both causes double-update.
--
--  * trg_transactions_transfer_check_ins/upd
--    Removed: @capacitor-community/sqlite on Android cannot execute
--    CREATE TRIGGER...BEGIN...END blocks reliably (incomplete input error).
--    Equivalent validation is enforced in transaction.schema.ts.
--
-- This file now contains only a plain UPDATE (safe on all platforms).

UPDATE wallets SET balance = (
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END), 0)
  FROM transactions
  WHERE wallet_id = wallets.id AND deleted_at IS NULL
) + (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE to_wallet_id = wallets.id AND type = 'transfer' AND deleted_at IS NULL
);

-- Migration 008: Transfer constraint triggers
-- NOTE: The balance-sync triggers (trg_wallets_balance_after_insert/update/delete)
-- have been intentionally REMOVED. Balance is managed atomically in the
-- service layer via updateBalanceDelta() (see PR #5).
-- Keeping the triggers alongside service-layer updates would cause double-update.
--
-- Each trigger is a separate statement and must remain separated;
-- the migration runner executes them individually.

-- 1. Initial balance sync (one-time, idempotent)
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

-- 2. Enforce transfer constraint on INSERT
CREATE TRIGGER IF NOT EXISTS trg_transactions_transfer_check_ins
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NEW.type = 'transfer' AND NEW.to_wallet_id IS NULL THEN
      RAISE(ABORT, 'to_wallet_id is required for transfer transactions')
    WHEN NEW.type != 'transfer' AND NEW.to_wallet_id IS NOT NULL THEN
      RAISE(ABORT, 'to_wallet_id must be NULL for non-transfer transactions')
  END;
END;

-- 3. Enforce transfer constraint on UPDATE
CREATE TRIGGER IF NOT EXISTS trg_transactions_transfer_check_upd
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NEW.type = 'transfer' AND NEW.to_wallet_id IS NULL THEN
      RAISE(ABORT, 'to_wallet_id is required for transfer transactions')
    WHEN NEW.type != 'transfer' AND NEW.to_wallet_id IS NOT NULL THEN
      RAISE(ABORT, 'to_wallet_id must be NULL for non-transfer transactions')
  END;
END;

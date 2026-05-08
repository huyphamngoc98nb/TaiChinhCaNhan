-- Migration 010: Drop obsolete balance-sync triggers.
-- Devices that already ran the original migration 008 will have these
-- triggers in the DB. They conflict with atomic service-layer balance
-- updates (double-update). DROP IF EXISTS is idempotent.

DROP TRIGGER IF EXISTS trg_wallets_balance_after_insert;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_update;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_delete;

-- Migration 010: Drop obsolete balance-sync triggers.
-- Devices that already ran the original migration 008 will have these
-- triggers in the DB. They conflict with the atomic service-layer balance
-- updates (double-update). DROP IF EXISTS is safe if they never existed.

DROP TRIGGER IF EXISTS trg_wallets_balance_after_insert;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_update;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_delete;

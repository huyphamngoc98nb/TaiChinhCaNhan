-- Migration 010: Drop obsolete balance-sync triggers
-- Devices that already ran migration 008 will have the 3 balance triggers.
-- Those triggers now conflict with the atomic service-layer balance updates
-- introduced in PR #5 and would cause every write to double-count.
-- Safe to run even if triggers were never created (DROP IF EXISTS).

DROP TRIGGER IF EXISTS trg_wallets_balance_after_insert;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_update;
DROP TRIGGER IF EXISTS trg_wallets_balance_after_delete;

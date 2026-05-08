-- Migration 011: Drop transfer-check triggers.
-- The triggers trg_transactions_transfer_check_ins and _upd were created
-- by the original migration 008 on devices that ran it before this fix.
-- Validation is now enforced in the TypeScript schema layer instead.
-- DROP IF EXISTS is idempotent.

DROP TRIGGER IF EXISTS trg_transactions_transfer_check_ins;
DROP TRIGGER IF EXISTS trg_transactions_transfer_check_upd;

-- Migration 030: Fix remaining_amount trigger to handle NULL paid_amount.
DROP TRIGGER IF EXISTS trg_credit_statement_remaining_insert;
DROP TRIGGER IF EXISTS trg_credit_statement_remaining_update;

CREATE TRIGGER IF NOT EXISTS trg_credit_statement_remaining_insert
AFTER INSERT ON credit_card_statements
BEGIN
  UPDATE credit_card_statements
  SET remaining_amount = NEW.statement_balance - COALESCE(NEW.paid_amount, 0)
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_credit_statement_remaining_update
AFTER UPDATE OF paid_amount, statement_balance ON credit_card_statements
BEGIN
  UPDATE credit_card_statements
  SET remaining_amount = NEW.statement_balance - COALESCE(NEW.paid_amount, 0)
  WHERE id = NEW.id;
END;

UPDATE credit_card_statements
SET remaining_amount = statement_balance - COALESCE(paid_amount, 0)
WHERE remaining_amount IS NULL
   OR remaining_amount != (statement_balance - COALESCE(paid_amount, 0));

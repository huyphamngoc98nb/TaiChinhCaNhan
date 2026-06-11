-- Trigger: keep remaining_amount = statement_balance - paid_amount on INSERT
CREATE TRIGGER IF NOT EXISTS trg_credit_statement_remaining_insert
AFTER INSERT ON credit_card_statements
BEGIN
  UPDATE credit_card_statements
  SET remaining_amount = NEW.statement_balance - NEW.paid_amount
  WHERE id = NEW.id;
END;

-- Trigger: keep remaining_amount = statement_balance - paid_amount on UPDATE
CREATE TRIGGER IF NOT EXISTS trg_credit_statement_remaining_update
AFTER UPDATE OF paid_amount, statement_balance ON credit_card_statements
BEGIN
  UPDATE credit_card_statements
  SET remaining_amount = NEW.statement_balance - NEW.paid_amount
  WHERE id = NEW.id;
END;

UPDATE credit_card_statements
SET remaining_amount = statement_balance - paid_amount
WHERE remaining_amount != (statement_balance - paid_amount);

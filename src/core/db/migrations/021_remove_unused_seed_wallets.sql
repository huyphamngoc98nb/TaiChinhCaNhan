-- Migration 021: Remove placeholder wallets that were previously auto-seeded.
-- Keep any wallet that has user data, a non-zero balance, transactions, bills, or budgets.
DELETE FROM wallets
WHERE id IN ('wallet-cash-1', 'wallet-bank-1', 'wallet-ewallet-1', 'wallet-cc-1')
  AND COALESCE(balance, 0) = 0
  AND NOT EXISTS (
    SELECT 1
    FROM transactions
    WHERE transactions.wallet_id = wallets.id
       OR transactions.to_wallet_id = wallets.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM recurring_bills
    WHERE recurring_bills.wallet_id = wallets.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM budgets
    WHERE budgets.wallet_id = wallets.id
  );

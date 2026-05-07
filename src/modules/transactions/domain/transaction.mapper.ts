import { Transaction } from './transaction.model';

export function mapToTransaction(row: any): Transaction {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    type: row.type,
    amount: row.amount,
    note: row.note,
    receipt_path: row.receipt_path ?? null,
    transaction_date: row.transaction_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

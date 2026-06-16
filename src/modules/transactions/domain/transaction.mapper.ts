import { Transaction } from './transaction.model';

export function mapToTransaction(row: any): Transaction {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    type: row.type,
    amount: row.amount,
    note: row.note ?? null,
    receipt_path: row.receipt_path ?? null,
    to_wallet_id: row.to_wallet_id ?? null,
    exclude_from_total: Boolean(row.exclude_from_total),
    transaction_date: row.transaction_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
    category_name: row.category_name,
    category_icon: row.category_icon,
    category_color: row.category_color,
    wallet_name: row.wallet_name,
    wallet_currency: row.wallet_currency,
    to_wallet_name: row.to_wallet_name,
  };
}

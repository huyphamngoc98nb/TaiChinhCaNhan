import { Transaction } from './transaction.model';

export function mapToTransaction(row: any): Transaction {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    type: row.type,
    amount: row.amount,
    note: row.note ?? null,
    to_wallet_id: row.to_wallet_id ?? null,
    exclude_from_total: Boolean(row.exclude_from_total),
    is_budget_offset: Boolean(row.is_budget_offset),
    offset_budget_id: row.offset_budget_id ?? null,
    source_type: row.source_type ?? null,
    source_id: row.source_id ?? null,
    source_event: row.source_event ?? null,
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
    offset_budget_name: row.offset_budget_name,
  };
}

import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/modules/transactions/domain/transaction.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';

function matchesFilter(transaction: Transaction, filter: TransactionFilter): boolean {
  if (!filter.includeDeleted && transaction.deleted_at !== null) return false;
  if (filter.wallet_id && transaction.wallet_id !== filter.wallet_id) return false;
  if (filter.category_id && transaction.category_id !== filter.category_id) return false;
  if (filter.type && transaction.type !== filter.type) return false;
  if (filter.startDate && transaction.transaction_date < filter.startDate) return false;
  if (filter.endDate && transaction.transaction_date > filter.endDate) return false;
  return true;
}

export class InMemoryTransactionRepository implements ITransactionRepository {
  private transactions = new Map<string, Transaction>();

  constructor(initialTransactions: Transaction[] = []) {
    initialTransactions.forEach((transaction) => {
      this.transactions.set(transaction.id, { ...transaction });
    });
  }

  async create(
    data: CreateTransactionInput & { id: string; created_at: number; updated_at: number }
  ): Promise<Transaction> {
    if (data.source_type != null && data.source_id != null && data.source_event != null) {
      const existing = Array.from(this.transactions.values()).find((candidate) =>
        candidate.deleted_at === null &&
        candidate.source_type === data.source_type &&
        candidate.source_id === data.source_id &&
        candidate.source_event === data.source_event
      );
      if (existing) {
        throw new Error(
          'UNIQUE constraint failed: transactions.source_type, transactions.source_id, transactions.source_event'
        );
      }
    }

    const transaction: Transaction = {
      id: data.id,
      wallet_id: data.wallet_id,
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      note: data.note ?? null,
      to_wallet_id: data.to_wallet_id ?? null,
      exclude_from_total: data.exclude_from_total ?? false,
      is_budget_offset: data.is_budget_offset ?? false,
      offset_budget_id: data.offset_budget_id ?? null,
      source_type: data.source_type ?? null,
      source_id: data.source_id ?? null,
      source_event: data.source_event ?? null,
      transaction_date: data.transaction_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: null,
    };

    this.transactions.set(transaction.id, transaction);
    return { ...transaction };
  }

  async update(
    id: string,
    data: UpdateTransactionInput & { updated_at: number }
  ): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.deleted_at !== null) return null;

    const updated: Transaction = {
      ...transaction,
      ...data,
      note: data.note !== undefined ? data.note : transaction.note,
      to_wallet_id:
        data.to_wallet_id !== undefined ? data.to_wallet_id : transaction.to_wallet_id,
      updated_at: data.updated_at,
    };

    this.transactions.set(id, updated);
    return { ...updated };
  }

  async softDelete(id: string, deleted_at: number): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.deleted_at !== null) return false;

    this.transactions.set(id, {
      ...transaction,
      deleted_at,
      updated_at: deleted_at,
    });
    return true;
  }

  async getById(id: string): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.deleted_at !== null) return null;
    return { ...transaction };
  }

  async getByIdIncludeDeleted(id: string): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    return transaction ? { ...transaction } : null;
  }

  async getBySource(
    sourceType: string,
    sourceId: string,
    sourceEvent: string
  ): Promise<Transaction | null> {
    const transaction = Array.from(this.transactions.values()).find((candidate) =>
      candidate.deleted_at === null &&
      candidate.source_type === sourceType &&
      candidate.source_id === sourceId &&
      candidate.source_event === sourceEvent
    );
    return transaction ? { ...transaction } : null;
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values())
      .filter((transaction) => matchesFilter(transaction, filter))
      .sort((a, b) => b.transaction_date - a.transaction_date || b.created_at - a.created_at);

    if (!filter.limit) return transactions.map((transaction) => ({ ...transaction }));

    const start = filter.offset ?? 0;
    return transactions.slice(start, start + filter.limit).map((transaction) => ({ ...transaction }));
  }
}

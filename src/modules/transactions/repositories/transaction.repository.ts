import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from '../domain/transaction.model';

export interface ITransactionRepository {
  create(data: CreateTransactionInput & { id: string; created_at: number; updated_at: number }): Promise<Transaction>;
  update(id: string, data: UpdateTransactionInput & { updated_at: number }): Promise<Transaction | null>;
  softDelete(id: string, deleted_at: number): Promise<boolean>;
  /** Returns active (non-deleted) transaction only */
  getById(id: string): Promise<Transaction | null>;
  /** Returns the record regardless of soft-delete status */
  getByIdIncludeDeleted(id: string): Promise<Transaction | null>;
  list(filter: TransactionFilter): Promise<Transaction[]>;
}

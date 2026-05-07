import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from '../domain/transaction.model';

export interface ITransactionRepository {
  create(input: CreateTransactionInput & { id: string, created_at: number, updated_at: number }): Promise<Transaction>;
  update(id: string, input: UpdateTransactionInput & { updated_at: number }): Promise<Transaction | null>;
  softDelete(id: string, deleted_at: number): Promise<boolean>;
  getById(id: string): Promise<Transaction | null>;
  list(filter: TransactionFilter): Promise<Transaction[]>;
}

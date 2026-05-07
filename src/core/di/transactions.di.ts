import { SQLiteTransactionRepository } from '@/modules/transactions/repositories/sqlite-transaction.repository';
import { CreateTransactionUseCase } from '@/modules/transactions/services/create-transaction';
import { UpdateTransactionUseCase } from '@/modules/transactions/services/update-transaction';
import { ListTransactionsUseCase } from '@/modules/transactions/services/list-transactions';
import { DeleteTransactionUseCase } from '@/modules/transactions/services/delete-transaction';

// Singleton instance
export const transactionRepository = new SQLiteTransactionRepository();

// Initialized Use Cases
export const createTransactionUseCase = new CreateTransactionUseCase(transactionRepository);
export const updateTransactionUseCase = new UpdateTransactionUseCase(transactionRepository);
export const listTransactionsUseCase = new ListTransactionsUseCase(transactionRepository);
export const deleteTransactionUseCase = new DeleteTransactionUseCase(transactionRepository);

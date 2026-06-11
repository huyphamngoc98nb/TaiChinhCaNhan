import { appRepositories } from '@/core/repositories/app-repositories';
import { CreateTransactionUseCase } from '@/modules/transactions/services/create-transaction';
import { UpdateTransactionUseCase } from '@/modules/transactions/services/update-transaction';
import { ListTransactionsUseCase } from '@/modules/transactions/services/list-transactions';
import { DeleteTransactionUseCase } from '@/modules/transactions/services/delete-transaction';
import { CreateCreditCardPaymentUseCase } from '@/modules/transactions/services/create-credit-card-payment';

// Singleton instance
export const transactionRepository = appRepositories.transaction;

// Initialized Use Cases
export const createTransactionUseCase = new CreateTransactionUseCase(
  transactionRepository,
  appRepositories.wallet
);
export const updateTransactionUseCase = new UpdateTransactionUseCase(
  transactionRepository,
  appRepositories.wallet
);
export const listTransactionsUseCase = new ListTransactionsUseCase(transactionRepository);
export const deleteTransactionUseCase = new DeleteTransactionUseCase(
  transactionRepository,
  appRepositories.wallet
);
export const createCreditCardPaymentUseCase = new CreateCreditCardPaymentUseCase();

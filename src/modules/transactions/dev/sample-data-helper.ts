import { SQLiteTransactionRepository } from '../repositories/sqlite-transaction.repository';
import { CreateTransactionUseCase } from '../services/create-transaction';

/**
 * DEV HELPER ONLY. DO NOT USE IN PRODUCTION UI.
 */
export async function createSampleTransactions() {
  const repo = new SQLiteTransactionRepository();
  const createUseCase = new CreateTransactionUseCase(repo);

  // Assumes these exist from default-categories.ts
  const defaultWalletId = 'wallet-default-1';
  const salaryCategoryId = 'cat-inc-1';
  const foodCategoryId = 'cat-exp-1';

  const samples = [
    {
      wallet_id: defaultWalletId,
      category_id: salaryCategoryId,
      type: 'income' as const,
      amount: 5000,
      note: 'Monthly Salary',
      transaction_date: Date.now() - 86400000 * 5, // 5 days ago
    },
    {
      wallet_id: defaultWalletId,
      category_id: foodCategoryId,
      type: 'expense' as const,
      amount: 25,
      note: 'Lunch at Cafe',
      transaction_date: Date.now() - 86400000 * 2, // 2 days ago
    },
    {
      wallet_id: defaultWalletId,
      category_id: foodCategoryId,
      type: 'expense' as const,
      amount: 80,
      note: 'Groceries',
      transaction_date: Date.now() - 86400000 * 1, // 1 day ago
    }
  ];

  for (const sample of samples) {
    await createUseCase.execute(sample);
  }
}

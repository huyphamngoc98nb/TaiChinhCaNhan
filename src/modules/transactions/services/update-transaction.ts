import { UpdateTransactionInput } from '../domain/transaction.model';
import { validateUpdateTransaction } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { getDbConnection, DB_NAME } from '@/core/db/sqlite/connection';

import { ReceiptStorageService } from '@/core/files/receipt-storage';

export class UpdateTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(id: string, input: UpdateTransactionInput, newReceiptBase64?: string) {
    validateUpdateTransaction(input);

    const db = await getDbConnection();
    const now = Date.now();
    let newSavedReceiptPath: string | undefined;
    const oldTransaction = await this.repository.getById(id);

    if (!oldTransaction) throw new Error('Transaction not found');

    const wallet = await this.walletRepository.getById(oldTransaction.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    if (newReceiptBase64) {
      newSavedReceiptPath = await ReceiptStorageService.saveReceipt(newReceiptBase64);
    }

    const isWeb = Capacitor.getPlatform() === 'web';
    if (!isWeb) await db.beginTransaction();
    try {
      const updated = await this.repository.update(id, {
        ...input,
        receipt_path: newSavedReceiptPath || input.receipt_path,
        updated_at: now,
      });

      if (updated) {
        // Adjust wallet balance
        let newBalance = wallet.balance;
        
        // 1. Revert old transaction effect
        if (oldTransaction.type === 'income') newBalance -= oldTransaction.amount;
        else if (oldTransaction.type === 'expense') newBalance += oldTransaction.amount;

        // 2. Apply new transaction effect
        const finalType = input.type || oldTransaction.type;
        const finalAmount = input.amount !== undefined ? input.amount : oldTransaction.amount;
        
        if (finalType === 'income') newBalance += finalAmount;
        else if (finalType === 'expense') newBalance -= finalAmount;

        await this.walletRepository.updateBalance(oldTransaction.wallet_id, newBalance, now);

        // Data consistency cleanup: if DB write succeeds and we uploaded a new file, delete the old file
        if (newSavedReceiptPath && oldTransaction.receipt_path) {
          await ReceiptStorageService.deleteReceipt(oldTransaction.receipt_path);
        }
      }

      if (!isWeb) {
        await db.commitTransaction();
      } else {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }
      
      return updated;
    } catch (error) {
      if (!isWeb) await db.rollbackTransaction();
      // Data consistency cleanup: if DB write fails, delete the new orphaned receipt file
      if (newSavedReceiptPath) {
        await ReceiptStorageService.deleteReceipt(newSavedReceiptPath);
      }
      throw error;
    }
  }
}

import { UpdateTransactionInput } from '../domain/transaction.model';
import { validateUpdateTransaction } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { runInTransaction } from '@/core/db/sqlite/transaction';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { Capacitor } from '@capacitor/core';

export class UpdateTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(id: string, input: UpdateTransactionInput, newReceiptBase64?: string) {
    validateUpdateTransaction(input);

    const oldTransaction = await this.repository.getById(id);
    if (!oldTransaction) throw new Error('Transaction not found');

    const wallet = await this.walletRepository.getById(oldTransaction.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    let newSavedReceiptPath: string | undefined;
    if (newReceiptBase64) {
      newSavedReceiptPath = await ReceiptStorageService.saveReceipt(newReceiptBase64);
    }

    const now = Date.now();

    // Compute net balance delta:
    // 1. Revert old effect
    let delta = 0;
    if (oldTransaction.type === 'income') delta -= oldTransaction.amount;
    else if (oldTransaction.type === 'expense') delta += oldTransaction.amount;

    // 2. Apply new effect
    const finalType = input.type ?? oldTransaction.type;
    const finalAmount = input.amount ?? oldTransaction.amount;
    if (finalType === 'income') delta += finalAmount;
    else if (finalType === 'expense') delta -= finalAmount;

    try {
      const updated = await runInTransaction(async () => {
        const result = await this.repository.update(id, {
          ...input,
          receipt_path: newSavedReceiptPath || input.receipt_path,
          updated_at: now,
        });

        if (result) {
          // Atomic delta update — no race condition
          await this.walletRepository.updateBalanceDelta(oldTransaction.wallet_id, delta, now);
        }

        return result;
      });

      // Persist web store after successful commit
      const isWeb = Capacitor.getPlatform() === 'web';
      if (isWeb) {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }

      // Cleanup old receipt only after DB fully committed
      if (updated && newSavedReceiptPath && oldTransaction.receipt_path) {
        await ReceiptStorageService.deleteReceipt(oldTransaction.receipt_path);
      }

      return updated;
    } catch (error) {
      // Cleanup new orphaned receipt on DB failure
      if (newSavedReceiptPath) {
        await ReceiptStorageService.deleteReceipt(newSavedReceiptPath);
      }
      throw error;
    }
  }
}

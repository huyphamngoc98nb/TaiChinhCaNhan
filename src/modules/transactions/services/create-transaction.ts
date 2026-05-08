import { CreateTransactionInput } from '../domain/transaction.model';
import { validateCreateTransaction, TransactionValidationError } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { runInTransaction } from '@/core/db/sqlite/transaction';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { Capacitor } from '@capacitor/core';

export class CreateTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(input: CreateTransactionInput, receiptBase64?: string) {
    validateCreateTransaction(input);

    const wallet = await this.walletRepository.getById(input.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    // Bug #4 fix: prevent negative balance for expense transactions
    if (input.type === 'expense' && wallet.balance < input.amount) {
      throw new TransactionValidationError([`Insufficient balance: available ${wallet.balance}, required ${input.amount}`]);
    }

    let savedReceiptPath: string | undefined;
    if (receiptBase64) {
      savedReceiptPath = await ReceiptStorageService.saveReceipt(receiptBase64);
    }

    const now = Date.now();
    const id = crypto.randomUUID();

    // Calculate balance delta atomically
    let delta = 0;
    if (input.type === 'income') delta = input.amount;
    else if (input.type === 'expense') delta = -input.amount;

    try {
      const transaction = await runInTransaction(async () => {
        const tx = await this.repository.create({
          ...input,
          receipt_path: savedReceiptPath || input.receipt_path,
          id,
          created_at: now,
          updated_at: now,
        });

        // Atomic delta update — no race condition
        await this.walletRepository.updateBalanceDelta(input.wallet_id, delta, now);

        return tx;
      });

      // Persist web store after successful commit
      const isWeb = Capacitor.getPlatform() === 'web';
      if (isWeb) {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }

      return transaction;
    } catch (error) {
      // Cleanup orphaned receipt file on DB failure
      if (savedReceiptPath) {
        await ReceiptStorageService.deleteReceipt(savedReceiptPath);
      }
      throw error;
    }
  }
}

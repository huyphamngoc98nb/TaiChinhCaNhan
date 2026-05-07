import { Capacitor } from '@capacitor/core';
import { CreateTransactionInput } from '../domain/transaction.model';
import { validateCreateTransaction } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { getDbConnection, DB_NAME } from '@/core/db/sqlite/connection';

import { ReceiptStorageService } from '@/core/files/receipt-storage';

export class CreateTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(input: CreateTransactionInput, receiptBase64?: string) {
    validateCreateTransaction(input);

    const db = await getDbConnection();
    const now = Date.now();
    const id = crypto.randomUUID();
    let savedReceiptPath: string | undefined;

    const wallet = await this.walletRepository.getById(input.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    if (receiptBase64) {
      savedReceiptPath = await ReceiptStorageService.saveReceipt(receiptBase64);
    }

    const isWeb = Capacitor.getPlatform() === 'web';
    if (!isWeb) await db.beginTransaction();
    
    try {
      const transaction = await this.repository.create({
        ...input,
        receipt_path: savedReceiptPath || input.receipt_path,
        id,
        created_at: now,
        updated_at: now,
      });

      // Update wallet balance
      let newBalance = wallet.balance;
      if (input.type === 'income') newBalance += input.amount;
      else if (input.type === 'expense') newBalance -= input.amount;
      
      await this.walletRepository.updateBalance(input.wallet_id, newBalance, now);

      if (!isWeb) {
        await db.commitTransaction();
      } else {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }
      
      return transaction;
    } catch (error) {
      if (!isWeb) await db.rollbackTransaction();
      // Data consistency cleanup: if DB write fails, delete the orphaned receipt file
      if (savedReceiptPath) {
        await ReceiptStorageService.deleteReceipt(savedReceiptPath);
      }
      throw error;
    }
  }
}

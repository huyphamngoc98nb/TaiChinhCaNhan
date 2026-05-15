import { CreateTransactionInput } from '../domain/transaction.model';
import { validateCreateTransaction, TransactionValidationError } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { sqliteTransactionRunner, TransactionRunner } from '@/core/db/transaction-runner';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { Capacitor } from '@capacitor/core';

export class CreateTransactionUseCase {
  constructor(
    private repository: ITransactionRepository,
    private walletRepository: IWalletRepository = appRepositories.wallet,
    private runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(input: CreateTransactionInput, receiptBase64?: string) {
    validateCreateTransaction(input);

    const wallet = await this.walletRepository.getById(input.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    // BUG-3 fix: kiểm tra số dư cho cả expense và transfer (cả 2 đều trừ số dư source wallet)
    if (
      (input.type === 'expense' || input.type === 'transfer') &&
      wallet.balance < input.amount
    ) {
      throw new TransactionValidationError([
        `Insufficient balance: available ${wallet.balance}, required ${input.amount}`,
      ]);
    }

    let savedReceiptPath: string | undefined;
    if (receiptBase64) {
      savedReceiptPath = await ReceiptStorageService.saveReceipt(receiptBase64);
    }

    const now = Date.now();
    const id = crypto.randomUUID();

    // Calculate balance delta atomically
    // - income:   +amount từ wallet
    // - expense:  -amount từ wallet
    // - transfer: -amount từ source wallet (to_wallet sẽ được xử lý riêng)
    let delta = 0;
    if (input.type === 'income') delta = input.amount;
    else if (input.type === 'expense' || input.type === 'transfer') delta = -input.amount;

    try {
      const transaction = await this.runTransaction(async () => {
        const tx = await this.repository.create({
          ...input,
          receipt_path: savedReceiptPath || input.receipt_path,
          id,
          created_at: now,
          updated_at: now,
        });

        // Atomic delta update — no race condition
        await this.walletRepository.updateBalanceDelta(input.wallet_id, delta, now);

        // Nếu là transfer, cộng số dư vào to_wallet
        if (input.type === 'transfer' && input.to_wallet_id) {
          await this.walletRepository.updateBalanceDelta(input.to_wallet_id, input.amount, now);
        }

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

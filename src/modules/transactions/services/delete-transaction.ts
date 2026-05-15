import { ITransactionRepository } from '../repositories/transaction.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { sqliteTransactionRunner, TransactionRunner } from '@/core/db/transaction-runner';
import { Capacitor } from '@capacitor/core';

export class DeleteTransactionUseCase {
  constructor(
    private repository: ITransactionRepository,
    private walletRepository: IWalletRepository = appRepositories.wallet,
    private runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(id: string) {
    // Bug #5 fix: use getByIdIncludeDeleted for idempotency check
    // (getById now filters deleted_at IS NULL, so a deleted record
    //  would throw "Transaction not found" instead of returning early)
    const transaction = await this.repository.getByIdIncludeDeleted(id);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.deleted_at) return true; // Already soft-deleted — idempotent

    const wallet = await this.walletRepository.getById(transaction.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    const now = Date.now();

    // Compute revert delta
    let delta = 0;
    if (transaction.type === 'income') delta = -transaction.amount;
    else if (transaction.type === 'expense') delta = transaction.amount;

    await this.runTransaction(async () => {
      await this.repository.softDelete(id, now);

      // Atomic delta update — no race condition
      await this.walletRepository.updateBalanceDelta(transaction.wallet_id, delta, now);
    });

    // Persist web store after successful commit
    const isWeb = Capacitor.getPlatform() === 'web';
    if (isWeb) {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      await sqlite.saveToStore(DB_NAME);
    }

    return true;
  }
}

import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { runInTransaction } from '@/core/db/sqlite/transaction';
import { Capacitor } from '@capacitor/core';

export class DeleteTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(id: string) {
    const transaction = await this.repository.getById(id);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.deleted_at) return true; // Already soft-deleted

    const wallet = await this.walletRepository.getById(transaction.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    const now = Date.now();

    // Compute revert delta
    let delta = 0;
    if (transaction.type === 'income') delta = -transaction.amount;
    else if (transaction.type === 'expense') delta = transaction.amount;

    await runInTransaction(async () => {
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

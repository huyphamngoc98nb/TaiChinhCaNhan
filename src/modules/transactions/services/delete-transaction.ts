import { ITransactionRepository } from '../repositories/transaction.repository';
import { SQLiteWalletRepository } from '../../wallets/repositories/sqlite-wallet.repository';
import { getDbConnection, DB_NAME } from '@/core/db/sqlite/connection';

export class DeleteTransactionUseCase {
  private walletRepository = new SQLiteWalletRepository();

  constructor(private repository: ITransactionRepository) {}

  async execute(id: string) {
    const db = await getDbConnection();
    const transaction = await this.repository.getById(id);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.deleted_at) return true; // Already deleted

    const wallet = await this.walletRepository.getById(transaction.wallet_id);
    if (!wallet) throw new Error('Wallet not found');

    const now = Date.now();
    const isWeb = Capacitor.getPlatform() === 'web';
    if (!isWeb) await db.beginTransaction();
    
    try {
      await this.repository.softDelete(id, now);

      // Revert wallet balance
      let newBalance = wallet.balance;
      if (transaction.type === 'income') newBalance -= transaction.amount;
      else if (transaction.type === 'expense') newBalance += transaction.amount;
      
      await this.walletRepository.updateBalance(transaction.wallet_id, newBalance, now);

      if (!isWeb) {
        await db.commitTransaction();
      } else {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }
      
      return true;
    } catch (error) {
      if (!isWeb) await db.rollbackTransaction();
      throw error;
    }
  }
}

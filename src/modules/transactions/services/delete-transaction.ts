import { ITransactionRepository } from '../repositories/transaction.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { IWalletRepository, Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { sqliteTransactionRunner, TransactionRunner } from '@/core/db/transaction-runner';
import { Capacitor } from '@capacitor/core';
import { SyncCreditCardStatementUseCase } from '@/modules/wallets/services/sync-credit-card-statement';

export class DeleteTransactionUseCase {
  constructor(
    private repository: ITransactionRepository,
    private walletRepository: IWalletRepository = appRepositories.wallet,
    private runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(id: string) {
    let didMutate = false;
    const creditCardSyncTargets = new Map<string, { wallet: Wallet; asOf: number }>();

    await this.runTransaction(async () => {
      // Read include-deleted inside serialized work so repeated delete calls
      // return success without applying balance deltas more than once.
      const transaction = await this.repository.getByIdIncludeDeleted(id);
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.deleted_at !== null) return true;

      const wallet = await this.walletRepository.getById(transaction.wallet_id);
      if (!wallet) throw new Error('Wallet not found');

      const destinationWallet = transaction.type === 'transfer' && transaction.to_wallet_id
        ? await this.walletRepository.getById(transaction.to_wallet_id)
        : null;
      const shouldRevertDestinationWallet = destinationWallet !== null;
      const now = Date.now();

      // Compute source wallet revert delta.
      let sourceDelta = 0;
      if (transaction.type === 'income') sourceDelta = -transaction.amount;
      else if (transaction.type === 'expense' || transaction.type === 'transfer') {
        sourceDelta = transaction.amount;
      }

      await this.repository.softDelete(id, now);

      // Atomic delta update: no race condition.
      await this.walletRepository.updateBalanceDelta(transaction.wallet_id, sourceDelta, now);

      if (transaction.type === 'transfer' && transaction.to_wallet_id) {
        if (shouldRevertDestinationWallet) {
          await this.walletRepository.updateBalanceDelta(transaction.to_wallet_id, -transaction.amount, now);
        } else {
          // The ledger was already inconsistent when a referenced destination wallet was deleted.
          // Revert the source best-effort and keep deletion available, but leave an audit trail.
          console.warn(
            `Cannot revert deleted transfer ${transaction.id}: destination wallet ${transaction.to_wallet_id} no longer exists`
          );
        }
      }

      if (wallet.account_type === 'credit_card') {
        creditCardSyncTargets.set(wallet.id, {
          wallet,
          asOf: transaction.transaction_date,
        });
      }
      const destinationWalletForSync = transaction.type === 'transfer' && transaction.to_wallet_id
        ? (destinationWallet ?? await this.walletRepository.getByIdIncludeDeleted(transaction.to_wallet_id))
        : null;
      if (destinationWalletForSync?.account_type === 'credit_card') {
        creditCardSyncTargets.set(destinationWalletForSync.id, {
          wallet: destinationWalletForSync,
          asOf: transaction.transaction_date,
        });
      }

      didMutate = true;
      return true;
    });

    // Persist web store after successful commit.
    if (didMutate && Capacitor.getPlatform() === 'web') {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      await sqlite.saveToStore(DB_NAME);
    }

    for (const { wallet, asOf } of creditCardSyncTargets.values()) {
      try {
        await new SyncCreditCardStatementUseCase(this.walletRepository).execute(wallet, asOf);
      } catch (error) {
        // Sync failure is non-fatal: the payment is committed.
        // Statement will be corrected on next successful sync.
        console.warn(`Failed to sync credit card statement for wallet ${wallet.id}`, error);
      }
    }

    return true;
  }
}

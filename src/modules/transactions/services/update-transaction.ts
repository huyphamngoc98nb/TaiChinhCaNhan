import { UpdateTransactionInput } from '../domain/transaction.model';
import { validateUpdateTransaction, TransactionValidationError } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { IWalletRepository, Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { registerCompensation } from '@/core/db/sqlite/transaction';
import { sqliteTransactionRunner, TransactionRunner } from '@/core/db/transaction-runner';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/core/telemetry/logger';
import { SyncCreditCardStatementUseCase } from '@/modules/wallets/services/sync-credit-card-statement';
import {
  assertActiveWallet,
  assertNoCreditCardToCreditCardTransfer,
  assertProjectedWalletDelta,
  buildUpdateTransactionBalanceDeltas,
} from './transaction-wallet-rules';

export class UpdateTransactionUseCase {
  constructor(
    private repository: ITransactionRepository,
    private walletRepository: IWalletRepository = appRepositories.wallet,
    private runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(id: string, input: UpdateTransactionInput, newReceiptBase64?: string) {
    validateUpdateTransaction(input);

    let newSavedReceiptPath: string | undefined;
    const now = Date.now();
    let finalReceiptPath = input.receipt_path;
    let previousReceiptPath: string | null = null;
    let updated: Awaited<ReturnType<ITransactionRepository['update']>>;
    const creditCardSyncTargets = new Map<string, { wallet: Wallet; asOf: number }>();

    try {
      updated = await this.runTransaction(async () => {
        const oldTransaction = await this.repository.getById(id);
        if (!oldTransaction) throw new Error('Transaction not found');
        previousReceiptPath = oldTransaction.receipt_path;

        const finalType = input.type ?? oldTransaction.type;
        const finalAmount = input.amount ?? oldTransaction.amount;
        const finalWalletId = input.wallet_id ?? oldTransaction.wallet_id;
        const finalToWalletId = finalType === 'transfer'
          ? input.to_wallet_id ?? oldTransaction.to_wallet_id
          : null;
        const finalTransactionDate = input.transaction_date ?? oldTransaction.transaction_date;

        const finalWallet = await this.walletRepository.getById(finalWalletId);
        if (!finalWallet) throw new Error('Wallet not found');
        assertActiveWallet(finalWallet, 'Wallet is inactive');

        const walletsById = new Map<string, Wallet>([[finalWallet.id, finalWallet]]);
        const oldWallet = oldTransaction.wallet_id === finalWallet.id
          ? finalWallet
          : await this.walletRepository.getById(oldTransaction.wallet_id);
        const oldToWallet = oldTransaction.to_wallet_id
          ? await this.walletRepository.getById(oldTransaction.to_wallet_id)
          : null;
        let finalToWallet: Wallet | null = null;
        if (finalType === 'transfer') {
          if (!finalToWalletId) {
            throw new TransactionValidationError(['to_wallet_id is required for transfer transactions']);
          }
          if (finalToWalletId === finalWalletId) {
            throw new TransactionValidationError(['to_wallet_id must be different from wallet_id']);
          }
          finalToWallet = oldToWallet?.id === finalToWalletId
            ? oldToWallet
            : await this.walletRepository.getById(finalToWalletId);
          if (!finalToWallet) throw new Error('Destination wallet not found');
          assertActiveWallet(finalToWallet, 'Destination wallet is inactive');
          assertNoCreditCardToCreditCardTransfer(finalWallet, finalToWallet);
          walletsById.set(finalToWallet.id, finalToWallet);
        }

        const balanceDeltas = buildUpdateTransactionBalanceDeltas(
          oldTransaction,
          finalType,
          finalAmount,
          finalWalletId,
          finalToWalletId,
        );

        for (const [walletId, walletDelta] of balanceDeltas) {
          if (walletDelta === 0) continue;
          let wallet: Wallet | undefined = walletsById.get(walletId);
          if (!wallet) {
            const loadedWallet = await this.walletRepository.getById(walletId);
            if (!loadedWallet) throw new Error('Wallet not found');
            wallet = loadedWallet;
            walletsById.set(wallet.id, wallet);
          }
          assertProjectedWalletDelta(wallet, walletDelta);
        }

        if (newReceiptBase64) {
          // NOTE: file-system and SQLite cannot be made truly atomic.
          // File is saved inside the transaction window to minimize orphan risk.
          // If the app crashes after saveReceipt but before DB commit, the file
          // becomes an orphan. Periodic cleanup (not yet implemented) should scan
          // receipts/ for files with no corresponding DB record.
          newSavedReceiptPath = await ReceiptStorageService.saveReceipt(newReceiptBase64);
          finalReceiptPath = newSavedReceiptPath;
        }

        const result = await this.repository.update(id, {
          ...input,
          to_wallet_id: finalToWalletId,
          ...(finalReceiptPath !== undefined ? { receipt_path: finalReceiptPath } : {}),
          updated_at: now,
        });

        if (result) {
          for (const [walletId, walletDelta] of balanceDeltas) {
            if (walletDelta !== 0) {
              await this.walletRepository.updateBalanceDelta(walletId, walletDelta, now);
              registerCompensation(() =>
                this.walletRepository.updateBalanceDelta(walletId, -walletDelta, now)
              );
            }
          }

          if (oldWallet?.account_type === 'credit_card' && oldWallet.id !== finalWallet.id) {
            creditCardSyncTargets.set(oldWallet.id, {
              wallet: oldWallet,
              asOf: oldTransaction.transaction_date,
            });
          }
          if (
            oldToWallet?.account_type === 'credit_card' &&
            oldToWallet.id !== finalToWallet?.id
          ) {
            creditCardSyncTargets.set(oldToWallet.id, {
              wallet: oldToWallet,
              asOf: oldTransaction.transaction_date,
            });
          }
          if (finalWallet.account_type === 'credit_card') {
            creditCardSyncTargets.set(finalWallet.id, {
              wallet: finalWallet,
              asOf: finalTransactionDate,
            });
          }
          if (finalToWallet?.account_type === 'credit_card') {
            creditCardSyncTargets.set(finalToWallet.id, {
              wallet: finalToWallet,
              asOf: finalTransactionDate,
            });
          }
        }

        return result;
      });

      const isWeb = Capacitor.getPlatform() === 'web';
      if (isWeb) {
        const { sqlite } = await import('@/core/db/sqlite/pragmas');
        await sqlite.saveToStore(DB_NAME);
      }

    } catch (error) {
      if (newSavedReceiptPath) {
        await ReceiptStorageService.deleteReceipt(newSavedReceiptPath);
      }
      throw error;
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

    // Best-effort: DB is already committed. A cleanup failure here only leaks
    // storage; it does not affect data integrity.
    if (
      updated &&
      finalReceiptPath &&
      previousReceiptPath &&
      finalReceiptPath !== previousReceiptPath
    ) {
      try {
        await ReceiptStorageService.deleteReceipt(previousReceiptPath);
      } catch (error) {
        logger.warn(`Failed to clean up previous receipt at ${previousReceiptPath}`, error);
      }
    }

    return updated;
  }
}

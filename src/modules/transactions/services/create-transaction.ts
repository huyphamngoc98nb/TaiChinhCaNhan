import { CreateTransactionInput } from '../domain/transaction.model';
import { validateCreateTransaction } from '../domain/transaction.schema';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { IWalletRepository, Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { registerCompensation } from '@/core/db/sqlite/transaction';
import { sqliteTransactionRunner, TransactionRunner } from '@/core/db/transaction-runner';
import { Capacitor } from '@capacitor/core';
import {
  assertActiveWallet,
  assertCreateTransactionFunding,
  assertNoCreditCardToCreditCardTransfer,
  getSourceDelta,
} from './transaction-wallet-rules';

export class CreateTransactionUseCase {
  constructor(
    private repository: ITransactionRepository,
    private walletRepository: IWalletRepository = appRepositories.wallet,
    private runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(input: CreateTransactionInput) {
    const normalizedInput: CreateTransactionInput = input.type === 'income'
      ? {
          ...input,
          is_budget_offset: input.is_budget_offset ?? false,
          offset_budget_id: input.is_budget_offset ? input.offset_budget_id ?? null : null,
        }
      : {
          ...input,
          is_budget_offset: false,
          offset_budget_id: null,
        };

    validateCreateTransaction(normalizedInput);

    const now = Date.now();
    const id = crypto.randomUUID();
    const sourceDelta = getSourceDelta(normalizedInput.type, normalizedInput.amount);

    const transaction = await this.runTransaction(async () => {
        const wallet = await this.walletRepository.getById(normalizedInput.wallet_id);
        if (!wallet) throw new Error('Wallet not found');
        assertActiveWallet(wallet, 'Wallet is inactive');

        let toWallet: Wallet | null = null;
        if (normalizedInput.type === 'transfer') {
          toWallet = normalizedInput.to_wallet_id
            ? await this.walletRepository.getById(normalizedInput.to_wallet_id)
            : null;
          if (!toWallet) throw new Error('Destination wallet not found');
          assertActiveWallet(toWallet, 'Destination wallet is inactive');
          assertNoCreditCardToCreditCardTransfer(wallet, toWallet);
        }

        assertCreateTransactionFunding(wallet, normalizedInput.type, normalizedInput.amount, toWallet ?? undefined);

        const tx = await this.repository.create({
          ...normalizedInput,
          id,
          created_at: now,
          updated_at: now,
        });

        // For credit cards, negative balance is outstanding liability.
        // Purchases increase it; transfers into the card reduce it.
        // Both transfer deltas remain sequential inside runTransaction; its SQLite
        // transaction commits or rolls back them together.
        await this.walletRepository.updateBalanceDelta(normalizedInput.wallet_id, sourceDelta, now);
        registerCompensation(() =>
          this.walletRepository.updateBalanceDelta(normalizedInput.wallet_id, -sourceDelta, now)
        );
        if (normalizedInput.type === 'transfer' && normalizedInput.to_wallet_id) {
          await this.walletRepository.updateBalanceDelta(normalizedInput.to_wallet_id, normalizedInput.amount, now);
          registerCompensation(() =>
            this.walletRepository.updateBalanceDelta(normalizedInput.to_wallet_id!, -normalizedInput.amount, now)
          );
        }

        return tx;
    });

    if (Capacitor.getPlatform() === 'web') {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      await sqlite.saveToStore(DB_NAME);
    }

    return transaction;
  }
}

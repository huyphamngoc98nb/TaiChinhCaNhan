import type { CreateTransactionInput } from '../domain/transaction.model';
import { TransactionValidationError } from '../domain/transaction.schema';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import { CreateTransactionUseCase } from './create-transaction';
import { SyncCreditCardStatementUseCase } from '@/modules/wallets/services/sync-credit-card-statement';
import {
  immediateTransactionRunner,
  sqliteTransactionRunner,
  TransactionRunner,
} from '@/core/db/transaction-runner';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/core/telemetry/logger';

export interface CreateCreditCardPaymentInput {
  from_wallet_id: string;
  credit_card_wallet_id: string;
  category_id: string;
  amount: number;
  note?: string;
  transaction_date: number;
}

export class CreateCreditCardPaymentUseCase {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase = new CreateTransactionUseCase(
      appRepositories.transaction,
      appRepositories.wallet,
      immediateTransactionRunner
    ),
    private readonly walletRepository: IWalletRepository = appRepositories.wallet,
    private readonly runTransaction: TransactionRunner = sqliteTransactionRunner
  ) {}

  async execute(input: CreateCreditCardPaymentInput) {
    const { transaction, targetWallet } = await this.runTransaction(async () => {
      if (input.from_wallet_id === input.credit_card_wallet_id) {
        throw new TransactionValidationError(['to_wallet_id must be different from wallet_id']);
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new TransactionValidationError(['amount must be a finite number greater than 0']);
      }

      const [sourceWallet, targetWallet] = await Promise.all([
        this.walletRepository.getById(input.from_wallet_id),
        this.walletRepository.getById(input.credit_card_wallet_id),
      ]);

      if (!sourceWallet) throw new Error('Wallet not found');
      if (!targetWallet) throw new Error('Destination wallet not found');
      if (sourceWallet.is_active !== 1) throw new Error('Wallet is inactive');
      if (targetWallet.is_active !== 1) throw new Error('Destination wallet is inactive');
      if (sourceWallet.account_type === 'credit_card') {
        throw new TransactionValidationError([
          'Credit card payment source must be a cash, bank, or e-wallet account',
        ]);
      }
      if (targetWallet.account_type !== 'credit_card') {
        throw new TransactionValidationError(['Destination wallet must be a credit card']);
      }
      if (sourceWallet.balance < input.amount) {
        throw new TransactionValidationError([
          `Insufficient balance: available ${sourceWallet.balance}, required ${input.amount}`,
        ]);
      }

      const payload: CreateTransactionInput = {
        wallet_id: input.from_wallet_id,
        category_id: input.category_id,
        type: 'transfer',
        amount: input.amount,
        note: input.note,
        to_wallet_id: input.credit_card_wallet_id,
        transaction_date: input.transaction_date,
      };

      return {
        transaction: await this.createTransaction.execute(payload),
        targetWallet,
      };
    });

    if (Capacitor.getPlatform() === 'web') {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      await sqlite.saveToStore(DB_NAME);
    }

    try {
      await new SyncCreditCardStatementUseCase(this.walletRepository).execute(
        targetWallet,
        input.transaction_date
      );
    } catch (error) {
      // Payment is already committed; statement sync is intentionally eventually consistent.
      logger.error('Failed to sync credit card statement after payment', error);
    }

    return transaction;
  }
}

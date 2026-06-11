import { Capacitor } from '@capacitor/core';
import type {
  Wallet,
  CreateWalletInput,
  UpdateWalletInput,
} from '../repositories/wallet.repository';
import { appRepositories } from '@/core/repositories/app-repositories';
import type { IWalletRepository } from '../repositories/wallet.repository';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getDbConnectionForTransaction, isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import {
  immediateTransactionRunner,
  sqliteTransactionRunner,
  TransactionRunner,
} from '@/core/db/transaction-runner';
import { CreateTransactionUseCase } from '@/modules/transactions/services/create-transaction';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Cryptographically secure random values are unavailable.');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function assertCreditCardSettings(data: CreateWalletInput | UpdateWalletInput): void {
  if (data.account_type !== 'credit_card') return;
  if (data.credit_limit !== undefined && (!data.credit_limit || data.credit_limit <= 0)) {
    throw new Error('Credit limit must be greater than 0 for credit card accounts.');
  }
  if (
    data.statement_day !== undefined &&
    data.statement_day !== null &&
    (data.statement_day < 1 || data.statement_day > 31)
  ) {
    throw new Error('Statement day must be between 1 and 31.');
  }
  if (
    data.due_day !== undefined &&
    data.due_day !== null &&
    (data.due_day < 1 || data.due_day > 31)
  ) {
    throw new Error('Due day must be between 1 and 31.');
  }
  if (data.annual_fee !== undefined && data.annual_fee !== null && data.annual_fee < 0) {
    throw new Error('Annual fee cannot be negative.');
  }
}

const BALANCE_ADJUSTMENT_NOTE = 'Cân bằng số dư';
const BALANCE_ADJUSTMENT_CATEGORIES = {
  income: {
    id: 'cat-balance-adjustment-income',
    name: BALANCE_ADJUSTMENT_NOTE,
    type: 'income',
    icon: 'wallet',
    color: '#4A6FA5',
  },
  expense: {
    id: 'cat-balance-adjustment-expense',
    name: BALANCE_ADJUSTMENT_NOTE,
    type: 'expense',
    icon: 'wallet',
    color: '#4A6FA5',
  },
} as const;

async function ensureBalanceAdjustmentCategory(type: 'income' | 'expense', now: number): Promise<string> {
  const category = BALANCE_ADJUSTMENT_CATEGORIES[type];
  const db = await getDbConnectionForTransaction();
  const { values } = await db.query(
    'SELECT id FROM categories WHERE id = ? OR (name = ? AND type = ?) LIMIT 1',
    [category.id, category.name, category.type]
  );
  const existingId = values?.[0]?.id;
  if (typeof existingId === 'string' && existingId.trim()) {
    return existingId;
  }

  await db.run(
    `INSERT OR IGNORE INTO categories
       (id, name, type, icon, color, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.name,
      category.type,
      category.icon,
      category.color,
      null,
      now,
      now,
    ],
    !isManagedTransactionActive()
  );
  return category.id;
}

async function persistWeb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const { sqlite } = await import('@/core/db/sqlite/pragmas');
    const { DB_NAME } = await import('@/core/db/sqlite/connection');
    await sqlite.saveToStore(DB_NAME);
  }
}

export class WalletService {
  private readonly createTransactionUseCase: CreateTransactionUseCase;

  constructor(
    private readonly repo: IWalletRepository = appRepositories.wallet,
    private readonly transactionRepo: ITransactionRepository = appRepositories.transaction,
    private readonly runTransaction: TransactionRunner = sqliteTransactionRunner,
    createTransactionUseCase?: CreateTransactionUseCase
  ) {
    this.createTransactionUseCase = createTransactionUseCase ?? new CreateTransactionUseCase(
      this.transactionRepo,
      this.repo,
      immediateTransactionRunner
    );
  }

  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    if (!data.name.trim()) {
      throw new Error('Wallet name is required.');
    }
    if (data.account_type === 'credit_card' && (!data.credit_limit || data.credit_limit <= 0)) {
      throw new Error('Credit limit must be greater than 0 for credit card accounts.');
    }
    assertCreditCardSettings(data);

    const id = generateId();
    const now = Date.now();
    await this.runTransaction(async () => {
      await this.repo.create(id, data, now);
    });
    await persistWeb();
    const wallet = await this.repo.getById(id);
    if (!wallet) throw new Error('Wallet creation failed: not found after insert.');
    return wallet;
  }

  async updateWallet(id: string, data: UpdateWalletInput): Promise<Wallet> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Wallet name is required.');
    }

    const now = Date.now();
    const { balance, ...walletData } = data;

    await this.runTransaction(async () => {
      const existing = await this.repo.getById(id);
      if (!existing) throw new Error('Wallet not found.');

      const nextAccountType = data.account_type ?? existing.account_type;
      const nextCreditLimit = data.credit_limit ?? existing.credit_limit;
      if (nextAccountType === 'credit_card' && (!nextCreditLimit || nextCreditLimit <= 0)) {
        throw new Error('Credit limit must be greater than 0 for credit card accounts.');
      }
      assertCreditCardSettings(data);

      const hasBalanceChange = balance !== undefined && Math.abs(balance - existing.balance) > 0.000001;

      if (hasBalanceChange) {
        const delta = balance - existing.balance;
        const transactionType = delta > 0 ? 'income' : 'expense';
        const categoryId = await ensureBalanceAdjustmentCategory(transactionType, now);
        await this.createTransactionUseCase.execute({
          wallet_id: id,
          category_id: categoryId,
          type: transactionType,
          amount: Math.abs(delta),
          note: BALANCE_ADJUSTMENT_NOTE,
          transaction_date: now,
        });
      }

      await this.repo.update(id, walletData, now);
    });
    await persistWeb();
    const wallet = await this.repo.getById(id);
    if (!wallet) throw new Error('Wallet not found after update.');
    return wallet;
  }

  async deleteWallet(id: string): Promise<void> {
    const counts = await this.repo.getReferenceCounts(id);
    const totalReferences =
      counts.transactions + counts.recurringBills + counts.budgets + counts.loans + counts.loanPayments;
    if (totalReferences > 0) {
      throw new Error('Cannot delete a wallet that is used by transactions, bills, budgets, or loans.');
    }

    await this.runTransaction(async () => {
      await this.repo.delete(id);
    });
    await persistWeb();
  }

  /** Net worth = sum of balances for wallets that are not excluded. */
  async getNetWorth(): Promise<number> {
    return this.repo.getTotalBalance();
  }

  async getAllActive(): Promise<Wallet[]> {
    return this.repo.getAllActive();
  }
}

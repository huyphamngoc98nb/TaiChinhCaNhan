import { Capacitor } from '@capacitor/core';
import {
  SQLiteWalletRepository,
  Wallet,
  CreateWalletInput,
  UpdateWalletInput,
} from '../repositories/sqlite-wallet.repository';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function persistWeb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const { sqlite } = await import('@/core/db/sqlite/pragmas');
    const { DB_NAME } = await import('@/core/db/sqlite/connection');
    await sqlite.saveToStore(DB_NAME);
  }
}

export class WalletService {
  private readonly repo: SQLiteWalletRepository;

  constructor(repo?: SQLiteWalletRepository) {
    this.repo = repo ?? new SQLiteWalletRepository();
  }

  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    if (!data.name.trim()) {
      throw new Error('Wallet name is required.');
    }
    if (data.account_type === 'credit_card') {
      if (!data.credit_limit || data.credit_limit <= 0) {
        throw new Error('Credit limit must be greater than 0 for credit card accounts.');
      }
    }

    const id = generateId();
    const now = Date.now();
    await this.repo.create(id, data, now);
    await persistWeb();
    const wallet = await this.repo.getById(id);
    if (!wallet) throw new Error('Wallet creation failed: not found after insert.');
    return wallet;
  }

  async updateWallet(id: string, data: UpdateWalletInput): Promise<Wallet> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Wallet name is required.');
    }
    if (data.account_type === 'credit_card') {
      if (data.credit_limit !== undefined && data.credit_limit !== null && data.credit_limit <= 0) {
        throw new Error('Credit limit must be greater than 0 for credit card accounts.');
      }
    }

    const now = Date.now();
    await this.repo.update(id, data, now);
    await persistWeb();
    const wallet = await this.repo.getById(id);
    if (!wallet) throw new Error('Wallet not found after update.');
    return wallet;
  }

  /** Soft-deactivate: wallet is hidden from active lists but preserved in DB. */
  async archiveWallet(id: string): Promise<void> {
    await this.repo.archive(id, Date.now());
    await persistWeb();
  }

  /** Net worth = sum of balances for wallets that are active and not excluded. */
  async getNetWorth(): Promise<number> {
    return this.repo.getTotalBalance();
  }

  async getAllActive(): Promise<Wallet[]> {
    return this.repo.getAllActive();
  }
}

import type { Wallet } from '../repositories/wallet.repository';

export function hasWalletValue(wallet: Pick<Wallet, 'balance' | 'is_active'>): boolean {
  return wallet.is_active === 1 && Number(wallet.balance || 0) !== 0;
}

export function filterWalletsWithValue<T extends Pick<Wallet, 'balance' | 'is_active'>>(
  wallets: T[]
): T[] {
  return wallets.filter(hasWalletValue);
}

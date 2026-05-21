import type { Wallet } from '../repositories/wallet.repository';

export function isActiveWallet(wallet: Pick<Wallet, 'is_active'>): boolean {
  return wallet.is_active === 1;
}

export function hasWalletValue(wallet: Pick<Wallet, 'balance' | 'is_active'>): boolean {
  return wallet.is_active === 1 && Number(wallet.balance || 0) !== 0;
}

export function filterActiveWallets<T extends Pick<Wallet, 'is_active'>>(wallets: T[]): T[] {
  return wallets.filter(isActiveWallet);
}

export function filterWalletsWithValue<T extends Pick<Wallet, 'balance' | 'is_active'>>(
  wallets: T[]
): T[] {
  return wallets.filter((wallet) => {
    if ('account_type' in wallet && wallet.account_type === 'credit_card') {
      return wallet.is_active === 1;
    }
    return hasWalletValue(wallet);
  });
}

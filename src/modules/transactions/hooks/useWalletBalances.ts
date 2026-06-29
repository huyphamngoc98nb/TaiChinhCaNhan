import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { buildWalletBalanceSummary } from '../services/wallet-balance-summary';

export function useWalletBalances() {
  const { wallets, loading, error, refresh } = useWallets();
  const {
    totalBalance,
    totalAssets,
    totalCreditCardLiability,
    totalNonCreditCardWalletBalance,
  } = buildWalletBalanceSummary(wallets);

  return {
    wallets,
    totalBalance,
    totalAssets,
    totalCreditCardLiability,
    totalNonCreditCardWalletBalance,
    loading,
    error,
    refresh,
  };
}

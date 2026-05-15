import { useWallets } from '@/modules/wallets/hooks/useWallets';

export function useWalletBalances() {
  const { wallets, totalBalance, loading, error, refresh } = useWallets();

  return {
    wallets,
    totalBalance,
    loading,
    error,
    refresh,
  };
}

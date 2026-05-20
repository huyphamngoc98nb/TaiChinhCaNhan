import { useWallets } from '@/modules/wallets/hooks/useWallets';

export function useWalletBalances() {
  const { wallets, loading, error, refresh } = useWallets();
  const totalBalance = wallets.reduce(
    (total, wallet) => total + Number(wallet.balance || 0),
    0
  );

  return {
    wallets,
    totalBalance,
    loading,
    error,
    refresh,
  };
}

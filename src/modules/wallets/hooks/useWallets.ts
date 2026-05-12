import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';
import { WalletService } from '../services/wallet.service';

interface UseWalletsReturn {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  createWallet: (data: CreateWalletInput) => Promise<Wallet>;
  updateWallet: (id: string, data: UpdateWalletInput) => Promise<Wallet>;
  archiveWallet: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWallets(): UseWalletsReturn {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => new WalletService(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, total] = await Promise.all([
        service.getAllActive(),
        service.getNetWorth(),
      ]);
      setWallets(active);
      setTotalBalance(total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load wallets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    load();
  }, [load]);

  const createWallet = useCallback(
    async (data: CreateWalletInput): Promise<Wallet> => {
      const wallet = await service.createWallet(data);
      await load();
      return wallet;
    },
    [service, load]
  );

  const updateWallet = useCallback(
    async (id: string, data: UpdateWalletInput): Promise<Wallet> => {
      const wallet = await service.updateWallet(id, data);
      await load();
      return wallet;
    },
    [service, load]
  );

  const archiveWallet = useCallback(
    async (id: string): Promise<void> => {
      await service.archiveWallet(id);
      await load();
    },
    [service, load]
  );

  return {
    wallets,
    totalBalance,
    loading,
    error,
    createWallet,
    updateWallet,
    archiveWallet,
    refresh: load,
  };
}

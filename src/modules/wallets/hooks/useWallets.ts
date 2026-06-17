import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';
import { WalletService } from '../services/wallet.service';
import { SyncCreditCardStatementUseCase } from '../services/sync-credit-card-statement';
import { appRepositories } from '@/core/repositories/app-repositories';
import { useLanguage } from '@/shared/context/LanguageContext';

interface UseWalletsReturn {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  createWallet: (data: CreateWalletInput) => Promise<Wallet>;
  updateWallet: (id: string, data: UpdateWalletInput) => Promise<Wallet>;
  deleteWallet: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWallets(): UseWalletsReturn {
  const { t } = useLanguage();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => new WalletService(), []);
  const statementSync = useMemo(
    () => new SyncCreditCardStatementUseCase(appRepositories.wallet),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, total] = await Promise.all([
        service.getAllActive(),
        service.getNetWorth(),
      ]);
      await Promise.all(
        active
          .filter((wallet) => wallet.account_type === 'credit_card')
          .map((wallet) => statementSync.execute(wallet))
      );
      setWallets(active);
      setTotalBalance(total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('wallets.load_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [service, statementSync, t]);

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

  const deleteWallet = useCallback(
    async (id: string): Promise<void> => {
      await service.deleteWallet(id);
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
    deleteWallet,
    refresh: load,
  };
}

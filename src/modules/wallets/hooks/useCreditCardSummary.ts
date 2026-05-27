import { useEffect, useState } from 'react';
import { appRepositories } from '@/core/repositories/app-repositories';
import type { Wallet } from '../repositories/wallet.repository';
import {
  CreditCardService,
  type CreditCardSummary,
} from '../services/credit-card.service';

export function useCreditCardSummary(wallet: Wallet | null) {
  const [summary, setSummary] = useState<CreditCardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet || wallet.account_type !== 'credit_card') {
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const service = new CreditCardService(appRepositories.wallet);

    service
      .getSummary(wallet)
      .then((nextSummary) => {
        if (!cancelled) setSummary(nextSummary);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet, wallet?.id, wallet?.balance, wallet?.credit_limit]);

  return { summary, loading };
}

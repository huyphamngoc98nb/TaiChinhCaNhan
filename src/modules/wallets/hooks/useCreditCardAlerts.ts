import { useEffect, useMemo, useState } from 'react';
import { appRepositories } from '@/core/repositories/app-repositories';
import type { CreditCardAlert } from '../domain/credit-card-alert.model';
import type { Wallet } from '../repositories/wallet.repository';
import { computeCreditCardAlerts } from '../services/credit-card-alerts';
import { CreditCardService } from '../services/credit-card.service';

export function useCreditCardAlerts(wallets: Wallet[]) {
  const [alerts, setAlerts] = useState<CreditCardAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const creditCards = useMemo(
    () =>
      wallets.filter(
        (wallet) => wallet.account_type === 'credit_card' && wallet.is_active === 1
      ),
    [wallets]
  );

  useEffect(() => {
    if (creditCards.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const service = new CreditCardService(appRepositories.wallet);
    const asOf = Date.now();

    Promise.all(creditCards.map((wallet) => service.getSummary(wallet, asOf)))
      .then((summaries) => {
        if (!cancelled) setAlerts(computeCreditCardAlerts(summaries, asOf));
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [creditCards]);

  return { alerts, loading };
}

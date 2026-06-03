import { useMemo } from 'react';
import { Wallet, AccountType } from '../repositories/sqlite-wallet.repository';
import { WalletCard } from './WalletCard';
import { CreditCardAlertsPanel } from './CreditCardAlertsPanel';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';
import { useCreditCardAlerts } from '../hooks/useCreditCardAlerts';
import { filterActiveWallets } from '../services/wallet-selectors';

interface Props {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  onWalletClick?: (wallet: Wallet) => void;
}

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'cash', 'bank', 'e_wallet', 'credit_card', 'investment', 'other',
];

export function WalletList({
  wallets,
  totalBalance,
  loading,
  error,
  onWalletClick,
}: Props) {
  const { formatAmount } = useCurrency();
  const { t, language } = useLanguage();
  const locale = getAppLocale(language);
  const { alerts, loading: alertsLoading } = useCreditCardAlerts(wallets);
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  const visibleWallets = useMemo(
    () => filterActiveWallets(wallets),
    [wallets]
  );

  const grouped = useMemo(() => {
    const map = new Map<AccountType, Wallet[]>();
    for (const type of ACCOUNT_TYPE_ORDER) {
      map.set(type, []);
    }
    for (const w of visibleWallets) {
      const bucket = map.get(w.account_type) ?? [];
      bucket.push(w);
      map.set(w.account_type, bucket);
    }
    return map;
  }, [visibleWallets]);

  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-2xl h-24 mb-3 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: '#ef4444', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Total balance header */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        }}
      >
        <p className="text-[13px] text-indigo-100 mb-1">{t('wallets.total_assets')}</p>
        <p className="text-[28px] font-bold text-white tabular-nums">
          {formatAmount(totalBalance)}
        </p>
        <p className="text-[11px] text-indigo-200 mt-1">
          {t('wallets.excluded_hint')}
        </p>
      </div>

      {/* Credit card alerts */}
      <CreditCardAlertsPanel
        alerts={alerts}
        loading={alertsLoading}
        onAlertPress={(walletId) => {
          const wallet = wallets.find((w) => w.id === walletId);
          if (wallet) onWalletClick?.(wallet);
        }}
        formatAmount={formatAmount}
        locale={locale}
      />

      {/* Grouped wallet cards */}
      {visibleWallets.length === 0 ? (
        <div className="text-center text-gray-400 mt-10">
          <p className="text-4xl mb-3">💼</p>
          <p className="text-[15px]">{t('wallets.no_accounts')}</p>
          <p className="text-[13px] text-gray-300 mt-1">
            {t('wallets.no_accounts_hint')}
          </p>
        </div>
      ) : (
        ACCOUNT_TYPE_ORDER.map((type) => {
          const group = grouped.get(type) ?? [];
          if (group.length === 0) return null;
          return (
            <div key={type} className="mb-4">
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {accountTypeLabels[type]}
              </p>
              {group.map((w) => (
                <WalletCard key={w.id} wallet={w} onClick={onWalletClick} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

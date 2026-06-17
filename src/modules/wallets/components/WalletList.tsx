import { useMemo } from 'react';
import { Plus, WalletCards } from 'lucide-react';
import { Wallet, AccountType } from '../repositories/sqlite-wallet.repository';
import { WalletCard } from './WalletCard';
import { CreditCardAlertsPanel } from './CreditCardAlertsPanel';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';
import { useCreditCardAlerts } from '../hooks/useCreditCardAlerts';
import { filterActiveWallets } from '../services/wallet-selectors';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';

interface Props {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  onWalletClick?: (wallet: Wallet) => void;
  onCreateWallet?: () => void;
}

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'cash', 'bank', 'e_wallet', 'credit_card', 'debt_or_loan', 'investment', 'other',
];

export function WalletList({
  wallets,
  totalBalance,
  loading,
  error,
  onWalletClick,
  onCreateWallet,
}: Props) {
  const { formatAmount } = useCurrency();
  const { t, language } = useLanguage();
  const { showAmounts } = useAmountVisibility();
  const locale = getAppLocale(language);
  const { alerts, loading: alertsLoading } = useCreditCardAlerts(wallets);
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    debt_or_loan: t('wallets.account_debt_or_loan'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  const visibleWallets = useMemo(
    () => filterActiveWallets(wallets),
    [wallets]
  );
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;

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
            className="bg-surface-muted rounded-2xl h-24 mb-3 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: 'var(--danger)', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Total balance header */}
      <div
        className="sticky top-0 z-10 rounded-2xl p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        }}
      >
        <p className="text-[13px] text-indigo-100 mb-1">{t('wallets.total_assets')}</p>
        <p className="text-[28px] font-bold text-white tabular-nums">
          {displayAmount(totalBalance)}
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
        formatAmount={displayAmount}
        locale={locale}
      />

      {/* Grouped wallet cards */}
      {visibleWallets.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <WalletCards size={28} />
          </div>
          <p className="text-[17px] font-bold text-gray-900">{t('wallets.no_wallets')}</p>
          <p className="mt-2 max-w-[280px] text-[13px] leading-5 text-gray-500">
            {t('wallets.no_wallets_hint')}
          </p>
          <button
            type="button"
            onClick={onCreateWallet}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-indigo-500 px-5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={17} />
            {t('wallets.create_wallet')}
          </button>
        </div>
      ) : (
        ACCOUNT_TYPE_ORDER.map((type) => {
          const group = grouped.get(type) ?? [];
          if (group.length === 0) return null;
          return (
            <div key={type} className="mb-4">
              <p className="text-[12px] font-semibold text-subtle uppercase tracking-wide mb-2 px-1">
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

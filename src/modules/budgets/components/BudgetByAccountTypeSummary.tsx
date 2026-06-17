import { BudgetProgress, AccountType, resolveBudgetScope } from '../domain/budget.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';

// Icon đơn giản theo account_type (emoji fallback, dễ thay bằng Lucide sau)
const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash:        '💵',
  bank:        '🏦',
  credit_card: '💳',
  e_wallet:    '📱',
  debt_or_loan: '🧾',
  investment:  '📈',
  other:       '🗂️',
};

const STATUS_COLORS = {
  safe:     'bg-emerald-500',
  warning:  'bg-amber-400',
  exceeded: 'bg-red-500',
} as const;

interface Props {
  progresses: BudgetProgress[];
}

export function BudgetByAccountTypeSummary({ progresses }: Props) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const locale = getAppLocale(language);
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    debt_or_loan: t('wallets.account_debt_or_loan'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  if (progresses.length === 0) return null;

  // Nhóm theo account_type_scope
  const grouped = progresses.reduce<Record<string, BudgetProgress[]>>((acc, p) => {
    const scope = resolveBudgetScope(p.budget);
    if (scope.type !== 'account_type') return acc;
    const key = scope.accountType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const accountTypes = Object.keys(grouped) as AccountType[];
  if (accountTypes.length === 0) return null;

  return (
    <div className="space-y-4">
      {accountTypes.map(at => (
        <div key={at} className="bg-white rounded-[16px] p-4 shadow-sm">
          {/* Header nhóm */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[20px]">{ACCOUNT_TYPE_ICONS[at]}</span>
            <span className="text-[14px] font-semibold text-gray-800">
              {accountTypeLabels[at]}
            </span>
            <span className="ml-auto text-[11px] text-gray-400">
              {grouped[at].length} {t('budgets.budget_count')}
            </span>
          </div>

          {/* Danh sách budget trong nhóm */}
          <div className="space-y-3">
            {grouped[at].map(p => {
              const pct = Math.min(p.percentage, 1);
              return (
                <div key={p.budget.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] text-gray-700">{p.budget.category_name}</span>
                    <span className="text-[12px] text-gray-500">
                      {(p.percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${STATUS_COLORS[p.status]}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[11px] text-gray-400">
                      {t('budgets.spent_amount')}: {displayAmount(p.spent_amount)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      / {displayAmount(p.budget.amount)}
                    </span>
                  </div>
                  {p.is_projected_exceeded && (
                    <div className="mt-1 text-[11px] font-semibold text-red-500">
                      {t('budgets.projected_exceeded_end_period')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

import { AccountType } from '../domain/budget.model';
import type { BudgetScopeType } from '../hooks/useBudgetForm';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';

const ALL_ACCOUNT_TYPES: AccountType[] = [
  'cash', 'bank', 'credit_card', 'e_wallet', 'debt_or_loan', 'investment', 'other',
];

interface Props {
  scopeType: BudgetScopeType;
  onScopeChange: (v: BudgetScopeType) => void;
  accountTypeScope: AccountType;
  onAccountTypeChange: (v: AccountType) => void;
}

export function BudgetScopePicker({
  scopeType,
  onScopeChange,
  accountTypeScope,
  onAccountTypeChange,
}: Props) {
  const { t } = useLanguage();
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    debt_or_loan: t('wallets.account_debt_or_loan'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-gray-900">{t('budgets.budget_scope')}</p>

      <div className="flex bg-gray-100 p-1 rounded-[10px] h-11 w-full">
        <button
          type="button"
          onClick={() => onScopeChange('global')}
          className={`flex-1 flex items-center justify-center rounded-[8px] text-[12px] font-semibold transition-all ${
            scopeType === 'global'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          {t('budgets.all_wallets')}
        </button>
        <button
          type="button"
          onClick={() => onScopeChange('account_type')}
          className={`flex-1 flex items-center justify-center rounded-[8px] text-[12px] font-semibold transition-all ${
            scopeType === 'account_type'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          {t('budgets.by_account_type_short')}
        </button>
      </div>

      {scopeType === 'account_type' && (
        <DropdownList
          value={accountTypeScope}
          onChange={onAccountTypeChange}
          ariaLabel={t('wallets.account_type')}
          buttonClassName="focus:border-orange-400"
          options={ALL_ACCOUNT_TYPES.map(at => ({
            value: at,
            label: accountTypeLabels[at],
          }))}
        />
      )}
    </div>
  );
}

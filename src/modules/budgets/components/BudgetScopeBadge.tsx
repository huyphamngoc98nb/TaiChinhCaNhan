import { BudgetScope, AccountType } from '../domain/budget.model';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  scope: BudgetScope;
}

export function BudgetScopeBadge({ scope }: Props) {
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

  if (scope.type === 'global') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
        {t('budgets.all_wallets')}
      </span>
    );
  }
  if (scope.type === 'wallet') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
        {t('budgets.specific_wallet')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600">
      {accountTypeLabels[scope.accountType]}
    </span>
  );
}

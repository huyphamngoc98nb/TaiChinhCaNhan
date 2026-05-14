import { AccountType, ACCOUNT_TYPE_LABELS } from '../domain/budget.model';
import type { BudgetScopeType } from '../hooks/useBudgetForm';
import { DropdownList } from '@/shared/components/DropdownList';

const ALL_ACCOUNT_TYPES: AccountType[] = [
  'cash', 'bank', 'credit_card', 'e_wallet', 'investment', 'other',
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
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-gray-900">Phạm vi ngân sách</p>

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
          Tất cả ví
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
          Theo loại TK
        </button>
      </div>

      {scopeType === 'account_type' && (
        <DropdownList
          value={accountTypeScope}
          onChange={onAccountTypeChange}
          ariaLabel="Loại tài khoản"
          buttonClassName="focus:border-orange-400"
          options={ALL_ACCOUNT_TYPES.map(at => ({
            value: at,
            label: ACCOUNT_TYPE_LABELS[at],
          }))}
        />
      )}
    </div>
  );
}

import { AccountType, ACCOUNT_TYPE_LABELS } from '../domain/budget.model';
import type { BudgetScopeType } from '../hooks/useBudgetForm';

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

      {/* Toggle buttons */}
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

      {/* AccountType dropdown — chỉ hiện khi chọn 'account_type' */}
      {scopeType === 'account_type' && (
        <div className="relative">
          <select
            value={accountTypeScope}
            onChange={e => onAccountTypeChange(e.target.value as AccountType)}
            className="w-full h-[48px] px-4 pr-8 bg-gray-50 border border-gray-200 rounded-[12px] text-[14px] font-medium text-gray-800 appearance-none focus:outline-none focus:border-orange-400"
          >
            {ALL_ACCOUNT_TYPES.map(at => (
              <option key={at} value={at}>
                {ACCOUNT_TYPE_LABELS[at]}
              </option>
            ))}
          </select>
          {/* chevron icon */}
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▼
          </span>
        </div>
      )}
    </div>
  );
}

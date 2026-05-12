import { BudgetScope, ACCOUNT_TYPE_LABELS } from '../domain/budget.model';

interface Props {
  scope: BudgetScope;
}

export function BudgetScopeBadge({ scope }: Props) {
  if (scope.type === 'global') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
        Tất cả ví
      </span>
    );
  }
  if (scope.type === 'wallet') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
        Ví cụ thể
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600">
      {ACCOUNT_TYPE_LABELS[scope.accountType]}
    </span>
  );
}

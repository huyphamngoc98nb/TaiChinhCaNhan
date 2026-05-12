import { BudgetProgress, AccountType, ACCOUNT_TYPE_LABELS, resolveBudgetScope } from '../domain/budget.model';

// Icon đơn giản theo account_type (emoji fallback, dễ thay bằng Lucide sau)
const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash:        '💵',
  bank:        '🏦',
  credit_card: '💳',
  e_wallet:    '📱',
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
              {ACCOUNT_TYPE_LABELS[at]}
            </span>
            <span className="ml-auto text-[11px] text-gray-400">
              {grouped[at].length} ngân sách
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
                      Đã dùng: {p.spent_amount.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-gray-400">
                      / {p.budget.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

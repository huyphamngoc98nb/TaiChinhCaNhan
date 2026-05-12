import { BudgetProgress } from '../domain/budget.model';

interface Props {
  progress: BudgetProgress;
}

export function BudgetProgressCard({ progress }: Props) {
  const { budget, spent_amount, percentage, status } = progress;

  const statusConfig = {
    safe: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 border-emerald-100',
      label: 'On Track'
    },
    warning: {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-50 border-amber-100',
      label: 'Warning'
    },
    exceeded: {
      bar: 'bg-rose-500',
      text: 'text-rose-700',
      badge: 'bg-rose-50 border-rose-100',
      label: 'Over Budget'
    }
  };

  const config = statusConfig[status];
  const cappedPercentage = Math.min(percentage * 100, 100);

  return (
    <div className={`p-5 rounded-3xl border border-gray-100 bg-white shadow-md transition-all active:scale-[0.98]`}>
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center space-x-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-50"
            style={{ backgroundColor: `${budget.color || '#F3F4F6'}20`, color: budget.color || '#6B7280' }}
          >
            {budget.icon || '💰'}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg leading-tight">{budget.category_name}</h4>
            {/* Đú́ng field: budget.period và budget.amount (kế thừa từ Budget interface) */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {budget.period} limit: ${budget.amount?.toFixed(0)}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border ${config.badge} ${config.text} uppercase tracking-widest`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Spent</span>
            <span className="text-2xl font-bold text-gray-900">${spent_amount.toFixed(0)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Remaining</span>
            <span className={`text-2xl font-bold ${percentage >= 1 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {percentage >= 1 
                ? `-$${Math.round(spent_amount - (budget.amount || 0))}` 
                : `$${Math.round((budget.amount || 0) - spent_amount)}`}
            </span>
          </div>
        </div>

        <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out shadow-sm ${config.bar}`}
            style={{ width: `${cappedPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className={config.text}>{Math.round(percentage * 100)}% of limit used</span>
          <span className="text-gray-400">
            {budget.period} cycle
          </span>
        </div>
      </div>
    </div>
  );
}

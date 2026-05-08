import { BudgetStatus } from '../domain/budget.model';

interface Props {
  status?: BudgetStatus | 'not_set';
}

export function BudgetStatusBadge({ status = 'not_set' }: Props) {
  const configs = {
    safe: {
      bg: 'bg-green-500/10',
      text: 'text-green-500',
      label: 'SAFE'
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      label: 'WARNING'
    },
    exceeded: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      label: 'OVER'
    },
    not_set: {
      bg: 'bg-gray-500/10',
      text: 'text-gray-500',
      label: 'NOT SET'
    }
  };

  const config = configs[status === 'exceeded' ? 'exceeded' : status];

  return (
    <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </div>
  );
}

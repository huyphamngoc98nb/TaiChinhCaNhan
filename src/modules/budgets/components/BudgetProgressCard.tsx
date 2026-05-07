import { BudgetProgress } from '../domain/budget.model';

interface Props {
  progress: BudgetProgress;
}

export function BudgetProgressCard({ progress }: Props) {
  const { budget, spent_amount, percentage, status } = progress;

  let statusColor = 'bg-green-500';
  let textColor = 'text-green-700';
  if (status === 'warning') {
    statusColor = 'bg-yellow-500';
    textColor = 'text-yellow-700';
  } else if (status === 'exceeded') {
    statusColor = 'bg-red-500';
    textColor = 'text-red-700';
  }

  const cappedPercentage = Math.min(percentage * 100, 100);

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-800">{budget.category_name}</h4>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${textColor} bg-opacity-20`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        Spent ${spent_amount.toFixed(2)} of ${budget.budget_amount?.toFixed(2)} ({budget.budget_period})
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${statusColor}`} style={{ width: `${cappedPercentage}%` }}></div>
      </div>
    </div>
  );
}

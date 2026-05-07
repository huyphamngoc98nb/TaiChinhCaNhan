import { BudgetProgress } from '../domain/budget.model';
import { BudgetProgressCard } from './BudgetProgressCard';

interface Props {
  alerts: BudgetProgress[];
  loading: boolean;
}

export function BudgetAlertsPanel({ alerts, loading }: Props) {
  if (loading) {
    return <div className="text-gray-500 text-sm">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return <div className="text-gray-500 text-sm italic">No active budgets. Set up budgets to see alerts here.</div>;
  }

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <BudgetProgressCard key={alert.budget.category_id} progress={alert} />
      ))}
    </div>
  );
}

import { AlertCircle } from 'lucide-react';
import { BudgetProgress } from '../domain/budget.model';

interface Props {
  alerts: BudgetProgress[];
}

export function BudgetAlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) return null;

  const hasExceeded = alerts.some(a => a.status === 'exceeded');
  const bgColor = hasExceeded ? 'bg-red-500/10' : 'bg-amber-500/10';
  const borderColor = hasExceeded ? 'border-red-500' : 'border-amber-500';
  const iconColor = hasExceeded ? 'text-red-500' : 'text-amber-500';

  const visibleAlerts = alerts.slice(0, 3);

  return (
    <div className={`${bgColor} border-l-[3px] ${borderColor} rounded-[12px] p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertCircle size={16} className={iconColor} />
          <span className="text-[13px] font-semibold text-gray-900">Budget Alerts</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${bgColor} ${iconColor}`}>
          {alerts.length}
        </div>
      </div>

      <div className="space-y-2">
        {visibleAlerts.map((alert, idx) => (
          <div key={alert.budget.category_id} className="flex flex-col">
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">{alert.budget.icon || '💰'}</span>
                <span className="font-medium text-gray-900">{alert.budget.category_name}</span>
              </div>
              <span className={`font-semibold ${alert.status === 'exceeded' ? 'text-red-500' : 'text-amber-500'}`}>
                {alert.status === 'exceeded' 
                  ? `${Math.round(alert.percentage * 100)}% over` 
                  : `${Math.round(alert.percentage * 100)}% used`}
              </span>
            </div>
            {idx < visibleAlerts.length - 1 && <div className="h-[1px] bg-black/5 w-full" />}
          </div>
        ))}
      </div>

      {alerts.length > 3 && (
        <button className="text-[12px] font-semibold text-gray-500 mt-2 w-full text-center">
          See all
        </button>
      )}
    </div>
  );
}

import { useBudgets } from '../hooks/useBudgets';
import { BudgetCategoryList } from '../components/BudgetCategoryList';
import { BudgetAlertsPanel } from '../components/BudgetAlertsPanel';

export const BudgetSettingsPage = () => {
  const { categories, alerts, loading, error, updateBudget } = useBudgets();

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Active Alerts</h2>
        <BudgetAlertsPanel alerts={alerts} loading={loading} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Manage Budgets</h2>
        {loading && <div className="text-gray-500 text-sm">Loading categories...</div>}
        {!loading && (
          <BudgetCategoryList categories={categories} onUpdateBudget={updateBudget} />
        )}
      </section>
    </div>
  );
};

import { useState } from 'react';
import { CategoryBudget } from '../domain/budget.model';

interface Props {
  category: CategoryBudget;
  onSave: (id: string, amount: number | null, period: 'weekly' | 'monthly' | null) => Promise<void>;
  onCancel: () => void;
}

export function BudgetEditForm({ category, onSave, onCancel }: Props) {
  const [amount, setAmount] = useState<string>(category.budget_amount ? category.budget_amount.toString() : '');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(category.budget_period || 'monthly');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedAmount = amount ? parseFloat(amount) : null;
      const finalPeriod = parsedAmount ? period : null;
      await onSave(category.category_id, parsedAmount, finalPeriod);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await onSave(category.category_id, null, null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
      <div className="flex flex-col space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="No budget"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex space-x-2 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isSaving}
            className="bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-sm hover:bg-red-200 disabled:opacity-50"
          >
            Remove Budget
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { CategoryBudget } from '../domain/budget.model';
import { BudgetEditForm } from './BudgetEditForm';

interface Props {
  categories: CategoryBudget[];
  onUpdateBudget: (id: string, amount: number | null, period: 'weekly' | 'monthly' | null) => Promise<void>;
}

export function BudgetCategoryList({ categories, onUpdateBudget }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <div key={category.category_id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-gray-800">{category.category_name}</h4>
              <p className="text-sm text-gray-500">
                {category.budget_amount ? `$${category.budget_amount.toFixed(2)} / ${category.budget_period}` : 'No budget set'}
              </p>
            </div>
            {editingId !== category.category_id && (
              <button
                onClick={() => setEditingId(category.category_id)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                {category.budget_amount ? 'Edit' : 'Set Budget'}
              </button>
            )}
          </div>
          {editingId === category.category_id && (
            <BudgetEditForm
              category={category}
              onSave={async (id, amount, period) => {
                await onUpdateBudget(id, amount, period);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

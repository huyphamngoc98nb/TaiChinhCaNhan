import { X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { CategoryBudget, BudgetPeriod } from '../domain/budget.model';

interface Props {
  category: CategoryBudget;
  amount: string;
  setAmount: (val: string) => void;
  period: BudgetPeriod;
  setPeriod: (val: BudgetPeriod) => void;
  onSave: () => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  error: string | null;
}

export function BudgetEditForm({
  category,
  amount,
  setAmount,
  period,
  setPeriod,
  onSave,
  onRemove,
  onClose,
  isSaving,
  error,
}: Props) {
  const { t } = useLanguage();
  const { confirm } = useConfirm();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: `${category.color}26`, color: category.color }}
          >
            {category.icon || '💰'}
          </div>
          <h4 className="text-[18px] font-semibold text-gray-900">{category.category_name}</h4>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-gray-400 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 space-y-6">
        {/* Period Toggle */}
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-gray-900">{t('budgets.budget_period')}</p>
          <div className="flex bg-gray-100 p-1 rounded-[10px] h-11 w-full">
            <button
              onClick={() => setPeriod('monthly')}
              className={`flex-1 flex items-center justify-center rounded-[8px] text-[13px] font-semibold transition-all ${
                period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('budgets.monthly')}
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`flex-1 flex items-center justify-center rounded-[8px] text-[13px] font-semibold transition-all ${
                period === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('budgets.weekly')}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-gray-900">{t('budgets.amount')}</p>
          <div
            className={`flex items-center h-[52px] bg-gray-50 border rounded-[12px] px-4 transition-all ${
              error ? 'border-red-500' : 'border-gray-200 focus-within:border-indigo-500'
            }`}
          >
            <span className="text-[14px] font-semibold text-gray-400 mr-2">VND</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-[20px] font-bold text-gray-900 outline-none tabular-nums"
              placeholder="0"
              autoFocus
            />
          </div>
          {error ? (
            <p className="text-[12px] text-red-500 font-medium ml-1">{error}</p>
          ) : (
            <p className="text-[12px] text-gray-400 ml-1 italic">
              {period === 'monthly'
                ? t('budgets.amount_hint_month')
                : t('budgets.amount_hint_week')}
            </p>
          )}
        </div>

        {/* Remove Link */}
        {category.budget_amount !== null && (
          <button
            onClick={async () => {
              const ok = await confirm({
                title: t('budgets.remove_budget'),
                message: t('budgets.remove_confirm'),
                confirmText: t('common.yes'),
                cancelText: t('common.cancel'),
              });
              if (ok) {
                onRemove();
              }
            }}
            className="text-[13px] text-red-500 font-semibold h-11 flex items-center px-1"
          >
            {t('budgets.remove_budget')}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-100">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`w-full h-[52px] rounded-[12px] bg-indigo-500 text-white text-[15px] font-semibold transition-all active:scale-[0.98] ${
            isSaving ? 'opacity-40' : 'shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isSaving ? t('common.saving') : t('budgets.save_budget')}
        </button>
      </div>
    </div>
  );
}

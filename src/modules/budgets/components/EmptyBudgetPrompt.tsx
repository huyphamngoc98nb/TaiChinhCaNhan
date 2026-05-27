import { Target } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  onClick?: () => void;
}

export function EmptyBudgetPrompt({ onClick }: Props) {
  const { t } = useLanguage();

  return (
    <div className="border-2 border-dashed border-indigo-500/30 rounded-[16px] p-6 flex flex-col items-center text-center space-y-3">
      <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
        <Target size={24} />
      </div>
      <p className="text-[14px] text-gray-500 max-w-[240px]">
        {t('budgets.set_first_budget')}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="text-[14px] font-semibold text-indigo-500"
      >
        {t('budgets.set_a_budget')}
      </button>
    </div>
  );
}

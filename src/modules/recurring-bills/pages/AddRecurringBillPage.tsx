import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RecurringBillForm } from '../components/RecurringBillForm';
import type { CreateRecurringBillInput, UpdateRecurringBillInput } from '../domain/recurring-bill.model';
import { recurringBillRepository } from '@/core/di/recurring-bills.di';
import { ROUTES } from '@/shared/constants/routes';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useToast } from '@/shared/components/Toast/ToastContext';

export function AddRecurringBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const handleSave = async (data: CreateRecurringBillInput | UpdateRecurringBillInput) => {
    try {
      await recurringBillRepository.create(data as CreateRecurringBillInput);
      toast.success(t('recurring_bills.add_success'));
      navigate(ROUTES.RECURRING_BILLS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('recurring_bills.save_failed'));
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white
            text-gray-600 active:bg-gray-100 transition-colors"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[18px] font-bold text-gray-900">{t('recurring_bills.new')}</h2>
      </div>

      <div className="px-4 pb-24">
        <div className="rounded-[16px] border border-gray-200 bg-white p-5 shadow-sm">
          <RecurringBillForm
            onSave={handleSave}
            onCancel={() => navigate(ROUTES.RECURRING_BILLS)}
          />
        </div>
      </div>
    </div>
  );
}

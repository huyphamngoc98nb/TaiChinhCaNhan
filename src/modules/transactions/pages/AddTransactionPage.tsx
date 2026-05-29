import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/shared/components/BackButton';
import { TransactionForm } from '../components/TransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ROUTES } from '@/shared/constants/routes';

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F5F7FA]">
      {/* Header */}
      <div className="sticky top-0 z-30 flex shrink-0 items-center gap-3 bg-[#F5F7FA] px-4 pt-4 pb-4 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
        <BackButton onClick={() => navigate(ROUTES.TRANSACTIONS)} ariaLabel={t('common.back')} />
        <h2 className="text-[18px] font-bold text-gray-900">{t('transactions.add_title')}</h2>
      </div>

      {/* Form */}
      <div className="min-h-0 flex-1 px-4">
        <TransactionForm
          pinTypeSelector
          scrollFields
          onSuccess={() => navigate(ROUTES.TRANSACTIONS)}
        />
      </div>
    </div>
  );
}

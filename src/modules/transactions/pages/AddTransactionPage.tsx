import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TransactionForm } from '../components/TransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white
            text-gray-600 active:bg-gray-100 transition-colors"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[18px] font-bold text-gray-900">{t('transactions.add_title')}</h2>
      </div>

      {/* Form */}
      <div className="px-4 pb-24">
        <TransactionForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  );
}

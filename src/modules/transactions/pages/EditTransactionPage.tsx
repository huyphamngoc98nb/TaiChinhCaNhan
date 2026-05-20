import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Transaction } from '../domain/transaction.model';
import { TransactionForm } from '../components/TransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { deleteTransactionUseCase } from '@/core/di/transactions.di';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { ROUTES } from '@/shared/constants/routes';

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { confirm } = useConfirm();
  const toast = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      appRepositories.transaction.getById(id).then(tx => {
        setTransaction(tx);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div style={{ padding: '16px' }}>{t('transactions.loading_detail')}</div>;
  if (!transaction) return <div style={{ padding: '16px' }}>{t('transactions.not_found')}</div>;

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('transactions.delete_confirm_title'),
      message: t('transactions.delete_confirm_msg'),
      confirmText: t('transactions.delete_confirm_btn'),
      cancelText: t('common.cancel'),
    });

    if (!ok) return;

    try {
      await deleteTransactionUseCase.execute(transaction.id);
      toast.success(t('transactions.delete_success'));
      navigate(ROUTES.TRANSACTIONS);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('transactions.delete_failed');
      toast.error(message);
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
        <h2 className="text-[18px] font-bold text-gray-900">{t('transactions.edit')}</h2>
      </div>

      <div className="px-4 pb-24">
        <TransactionForm
          existing={transaction}
          onSuccess={() => navigate(-1)}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

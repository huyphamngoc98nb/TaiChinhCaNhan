import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BackButton } from '@/shared/components/BackButton';
import { Transaction } from '../domain/transaction.model';
import { TransactionForm } from '../components/TransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { deleteTransactionUseCase } from '@/core/di/transactions.di';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { ROUTES } from '@/shared/constants/routes';
import { localizeTransactionError } from '../services/transaction-error-messages';

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
      appRepositories.transaction.getById(id).then((tx) => {
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
      toast.error(localizeTransactionError(err, t));
    }
  };

  return (
    <TransactionForm
      existing={transaction}
      header={
        <>
          <BackButton onClick={() => navigate(ROUTES.TRANSACTIONS)} ariaLabel={t('common.back')} />
          <h2 className="transaction-form-title">{t('transactions.edit')}</h2>
        </>
      }
      pinTypeSelector
      onSuccess={() => navigate(ROUTES.TRANSACTIONS)}
      onDelete={handleDelete}
    />
  );
}

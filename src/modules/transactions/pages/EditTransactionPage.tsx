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
import { triggerWarningHaptic } from '@/shared/utils/haptics';

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { confirm } = useConfirm();
  const toast = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setLoadFailed(false);
    appRepositories.transaction.getById(id)
      .then((tx) => {
        if (cancelled) return;
        setTransaction(tx);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load transaction detail', error);
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const backToHistory = () => navigate(ROUTES.TRANSACTIONS);

  if (loading) {
    return (
      <main className="transaction-form-state" aria-busy="true">
        <header className="transaction-form-state__header">
          <BackButton onClick={backToHistory} ariaLabel={t('common.back')} />
          <h1 className="transaction-form-title">{t('transactions.edit')}</h1>
        </header>
        <div className="transaction-form-state__content" role="status">
          <h2>{t('transactions.loading_detail')}</h2>
          <div className="transaction-form-state__skeleton" aria-hidden="true" />
          <div className="transaction-form-state__skeleton" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className="transaction-form-state">
        <header className="transaction-form-state__header">
          <BackButton onClick={backToHistory} ariaLabel={t('common.back')} />
          <h1 className="transaction-form-title">{t('transactions.edit')}</h1>
        </header>
        <div className="transaction-form-state__content" role="alert">
          <h2>
            {loadFailed
              ? t('transactions.load_error_title')
              : t('transactions.not_found_title')}
          </h2>
          <p>
            {loadFailed
              ? t('transactions.load_error_hint')
              : t('transactions.not_found_hint')}
          </p>
          <button
            type="button"
            className="transaction-form-state__action"
            onClick={backToHistory}
          >
            {t('transactions.back_to_history')}
          </button>
        </div>
      </main>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('transactions.delete_confirm_title'),
      message: t('transactions.delete_confirm_msg'),
      confirmText: t('transactions.delete_confirm_btn'),
      cancelText: t('common.cancel'),
    });

    if (!ok) return;

    setDeleting(true);
    try {
      await deleteTransactionUseCase.execute(transaction.id);
      void triggerWarningHaptic();
      toast.success(t('transactions.delete_success'));
      navigate(ROUTES.TRANSACTIONS);
    } catch (err) {
      toast.error(localizeTransactionError(err, t));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TransactionForm
      existing={transaction}
      header={
        <>
          <BackButton onClick={() => navigate(ROUTES.TRANSACTIONS)} ariaLabel={t('common.back')} />
          <h1 className="transaction-form-title">{t('transactions.edit')}</h1>
        </>
      }
      pinTypeSelector
      onSuccess={() => navigate(ROUTES.TRANSACTIONS)}
      onDelete={handleDelete}
      deleting={deleting}
    />
  );
}

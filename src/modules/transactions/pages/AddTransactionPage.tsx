import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/shared/components/BackButton';
import { TransactionForm } from '../components/TransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ROUTES } from '@/shared/constants/routes';

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <TransactionForm
      header={
        <>
          <BackButton onClick={() => navigate(ROUTES.TRANSACTIONS)} ariaLabel={t('common.back')} />
          <h2 className="transaction-form-title">{t('transactions.add_title')}</h2>
        </>
      }
      pinTypeSelector
      onSuccess={() => navigate(ROUTES.TRANSACTIONS)}
    />
  );
}

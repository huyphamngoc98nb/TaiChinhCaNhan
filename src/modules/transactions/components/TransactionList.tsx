import { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onSelect: (id: string) => void;
  viewType?: 'day' | 'month' | 'year';
}

export function TransactionList({ transactions, loading, onSelect, viewType = 'day' }: Props) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('transactions.loading')}</div>;
  }

  if (transactions.length === 0) {
    return <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('transactions.empty')}</div>;
  }

  const sortedTransactions = [...transactions].sort((a, b) => b.transaction_date - a.transaction_date);

  const groups: { label: string; items: Transaction[]; income: number; expense: number }[] = [];
  let currentGroup: { label: string; items: Transaction[]; income: number; expense: number } | null = null;

  sortedTransactions.forEach(tx => {
    const date = new Date(tx.transaction_date);
    let label = '';

    if (viewType === 'day') {
      label = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (viewType === 'month') {
      label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (viewType === 'year') {
      label = date.toLocaleDateString(locale, { year: 'numeric' });
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [], income: 0, expense: 0 };
      groups.push(currentGroup);
    }

    currentGroup.items.push(tx);
    if (tx.type === 'income') currentGroup.income += tx.amount;
    else if (tx.type === 'expense') currentGroup.expense += tx.amount;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {groups.map((group) => (
        <div key={group.label}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: 'var(--text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '1rem' }}>{group.label}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                {group.items.length}{' '}
                {group.items.length === 1
                  ? t('transactions.records_one')
                  : t('transactions.records_many')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: '500' }}>
              <div style={{ color: '#059669' }}>
                {t('transactions.label_income')}: {formatAmount(group.income, locale)}
              </div>
              <div style={{ color: '#e11d48' }}>
                {t('transactions.label_expense')}: {formatAmount(group.expense, locale)}
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                {t('transactions.label_balance')}: {formatAmount(group.income - group.expense, locale)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {group.items.map(tx => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onSelect={onSelect}
                showDate={viewType !== 'day'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

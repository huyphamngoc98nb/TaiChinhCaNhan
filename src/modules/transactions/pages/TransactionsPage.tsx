import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { useCategories } from '@/modules/categories/hooks/useCategories';
import { AdvancedTransactionFilterSheet } from '../components/AdvancedTransactionFilterSheet';
import type { TransactionFilter } from '../domain/transaction.model';

export type ViewType = 'day' | 'month' | 'year';

function getDefaultHistoryFilter(): TransactionFilter {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return {
    startDate: startOfMonth.getTime(),
    endDate: endOfToday.getTime(),
  };
}

export function TransactionsPage() {
  const navigate = useNavigate();
  const initialFilter = useMemo(() => getDefaultHistoryFilter(), []);
  const { transactions, loading, filter, setFilter } = useTransactions(initialFilter);
  const { t } = useLanguage();
  const { wallets } = useWallets();
  const { categories } = useCategories();
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('day');

  const handleEdit = (id: string) => navigate(`/transactions/${id}/edit`);

  const viewLabels: Record<ViewType, string> = {
    day: t('transactions.view_day'),
    month: t('transactions.view_month'),
    year: t('transactions.view_year'),
  };

  const hasAdvancedFilter = Boolean(
    filter.startDate || filter.endDate || filter.wallet_id || filter.type || filter.category_id,
  );

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: 0 }}>{t('transactions.history_title')}</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedFilter(open => !open)}
          aria-label="Lọc nâng cao"
          aria-expanded={showAdvancedFilter}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hasAdvancedFilter ? 'var(--primary)' : 'var(--surface)',
            color: hasAdvancedFilter ? 'white' : 'var(--text)',
            border: hasAdvancedFilter ? 'none' : '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: hasAdvancedFilter
              ? '0 4px 6px -1px rgba(14, 165, 233, 0.2)'
              : '0 1px 2px rgba(0,0,0,0.04)',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div style={{
        display: 'flex',
        background: 'var(--border)',
        padding: '2px',
        borderRadius: '10px',
        marginBottom: '18px',
      }}>
        {(['day', 'month', 'year'] as ViewType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setViewType(type)}
            style={{
              flex: 1,
              minHeight: '38px',
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: viewType === type ? 'var(--surface)' : 'transparent',
              color: viewType === type ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: viewType === type ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {viewLabels[type]}
          </button>
        ))}
      </div>

      <AdvancedTransactionFilterSheet
        isOpen={showAdvancedFilter}
        filter={filter}
        wallets={wallets}
        categories={categories}
        onChange={setFilter}
        onClose={() => setShowAdvancedFilter(false)}
      />

      <TransactionList
        transactions={transactions}
        loading={loading}
        onSelect={handleEdit}
        viewType={viewType}
      />
    </div>
  );
}

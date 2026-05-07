import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';

export type ViewType = 'day' | 'month' | 'year';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { transactions, loading, filter, setFilter, remove } = useTransactions();
  const { confirm } = useConfirm();
  const [viewType, setViewType] = useState<ViewType>('day');

  const handleEdit = (id: string) => navigate(`/transactions/${id}/edit`);
  
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    
    if (ok) {
      await remove(id);
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>History</h2>
        <button 
          onClick={() => navigate('/transactions/new')}
          style={{ 
            padding: '10px 20px', 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '10px',
            fontWeight: '600',
            boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)'
          }}
        >
          + New
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {/* Filters and View Type Toggle */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <select 
            value={filter.type || ''} 
            onChange={e => setFilter({ ...filter, type: e.target.value as any || undefined })}
            style={{ 
              padding: '10px 14px', 
              borderRadius: '10px', 
              border: '1px solid var(--border)', 
              background: 'var(--surface)',
              fontSize: '0.9rem',
              color: 'var(--text)'
            }}
          >
            <option value="">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>

          <div style={{ 
            display: 'flex', 
            background: 'var(--border)', 
            padding: '2px', 
            borderRadius: '10px',
            flex: 1
          }}>
            {(['day', 'month', 'year'] as ViewType[]).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  background: viewType === type ? 'var(--surface)' : 'transparent',
                  color: viewType === type ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: viewType === type ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TransactionList 
        transactions={transactions} 
        loading={loading} 
        onEdit={handleEdit} 
        onDelete={handleDelete}
        viewType={viewType}
      />
    </div>
  );
}

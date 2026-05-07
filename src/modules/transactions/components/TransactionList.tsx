import { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  viewType?: 'day' | 'month' | 'year';
}

export function TransactionList({ transactions, loading, onEdit, onDelete, viewType = 'day' }: Props) {
  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</div>;
  }

  // Sort transactions by date descending
  const sortedTransactions = [...transactions].sort((a, b) => b.transaction_date - a.transaction_date);

  // Group transactions based on viewType
  const groups: { label: string, items: Transaction[], income: number, expense: number }[] = [];
  let currentGroup: { label: string, items: Transaction[], income: number, expense: number } | null = null;

  sortedTransactions.forEach(t => {
    const date = new Date(t.transaction_date);
    let label = '';

    if (viewType === 'day') {
      label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (viewType === 'month') {
      label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewType === 'year') {
      label = date.toLocaleDateString('en-US', { year: 'numeric' });
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [], income: 0, expense: 0 };
      groups.push(currentGroup);
    }
    
    currentGroup.items.push(t);
    if (t.type === 'income') currentGroup.income += t.amount;
    else currentGroup.expense += t.amount;
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
                {group.items.length} {group.items.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: '500' }}>
              <div style={{ color: '#059669' }}>
                Income: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.income)}
              </div>
              <div style={{ color: '#e11d48' }}>
                Expense: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.expense)}
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                Balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.income - group.expense)}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {group.items.map(t => (
              <TransactionItem 
                key={t.id} 
                transaction={t} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                showDate={viewType !== 'day'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {transactions.map(t => (
        <TransactionItem 
          key={t.id} 
          transaction={t} 
          onEdit={onEdit} 
          onDelete={onDelete} 
        />
      ))}
    </div>
  );
}

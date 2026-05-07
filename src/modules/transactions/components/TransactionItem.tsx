import { Transaction } from '../domain/transaction.model';

interface Props {
  transaction: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: Props) {
  const isExpense = transaction.type === 'expense';
  
  return (
    <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          {transaction.category_id} {/* Will map to name later */}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {new Date(transaction.transaction_date).toLocaleDateString()}
          {transaction.receipt_path && ' • 📎 Receipt'}
        </div>
        {transaction.note && (
          <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>{transaction.note}</div>
        )}
      </div>
      
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isExpense ? 'red' : 'green' }}>
          {isExpense ? '-' : '+'}${transaction.amount.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => onEdit(transaction.id)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
          <button onClick={() => onDelete(transaction.id)} style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'red', cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

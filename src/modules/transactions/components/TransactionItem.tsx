import { Transaction } from '../domain/transaction.model';
import { Edit2, Trash2, Paperclip } from 'lucide-react';

interface Props {
  transaction: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}

export function TransactionItem({ transaction, onEdit, onDelete, showDate = false }: Props) {
  const isExpense = transaction.type === 'expense';
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDateShort = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ 
      padding: '16px', 
      background: 'var(--surface)', 
      borderRadius: '12px', 
      border: '1px solid var(--border)', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '10px', 
          background: isExpense ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem'
        }}>
          {isExpense ? '💸' : '💰'}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text)' }}>
            {transaction.category_id}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {showDate ? formatDateShort(transaction.transaction_date) : formatTime(transaction.transaction_date)}
            {transaction.receipt_path && <><span style={{ opacity: 0.5 }}>•</span> <Paperclip size={12} /></>}
          </div>
          {transaction.note && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
              "{transaction.note}"
            </div>
          )}
        </div>
      </div>
      
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <div style={{ 
          fontWeight: '700', 
          fontSize: '1.1rem', 
          color: isExpense ? '#e11d48' : '#059669' 
        }}>
          {isExpense ? '-' : '+'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount)}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => onEdit(transaction.id)} 
            style={{ 
              padding: '6px', 
              borderRadius: '6px', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex'
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(transaction.id)} 
            style={{ 
              padding: '6px', 
              borderRadius: '6px', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer',
              color: '#f43f5e',
              display: 'flex'
            }}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

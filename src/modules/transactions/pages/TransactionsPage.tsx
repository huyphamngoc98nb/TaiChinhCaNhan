import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { transactions, loading, filter, setFilter, remove } = useTransactions();

  const handleEdit = (id: string) => navigate(`/transactions/${id}/edit`);
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await remove(id);
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Transactions</h2>
        <button 
          onClick={() => navigate('/transactions/new')}
          style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          + Add
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select 
          value={filter.type || ''} 
          onChange={e => setFilter({ ...filter, type: e.target.value as any || undefined })}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
        >
          <option value="">All Types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <TransactionList 
        transactions={transactions} 
        loading={loading} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      />
    </div>
  );
}

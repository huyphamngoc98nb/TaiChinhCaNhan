import { useNavigate } from 'react-router-dom';
import { TransactionForm } from '../components/TransactionForm';

export function AddTransactionPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ marginBottom: '16px' }}>Add Transaction</h2>
      <TransactionForm onSuccess={() => navigate('/')} />
    </div>
  );
}

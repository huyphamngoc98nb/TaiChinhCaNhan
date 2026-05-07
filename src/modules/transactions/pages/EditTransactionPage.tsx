import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transaction } from '../domain/transaction.model';
import { SQLiteTransactionRepository } from '../repositories/sqlite-transaction.repository';
import { TransactionForm } from '../components/TransactionForm';

const repo = new SQLiteTransactionRepository();

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      repo.getById(id).then(t => {
        setTransaction(t);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div style={{ padding: '16px' }}>Loading...</div>;
  if (!transaction) return <div style={{ padding: '16px' }}>Transaction not found</div>;

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ marginBottom: '16px' }}>Edit Transaction</h2>
      <TransactionForm existing={transaction} onSuccess={() => navigate(-1)} />
    </div>
  );
}

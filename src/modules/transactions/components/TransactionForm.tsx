import { FormEvent } from 'react';
import { Transaction } from '../domain/transaction.model';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { ReceiptCapture } from './ReceiptCapture';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
}

export function TransactionForm({ existing, onSuccess }: Props) {
  const { formData, setFormData, setReceiptBase64, save, error, submitting, options } = useTransactionForm(existing);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await save();
    if (success) onSuccess();
  };

  // Convert timestamp to YYYY-MM-DDTHH:mm for datetime-local
  const formatDateTimeLocal = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  const handleDateChange = (val: string) => {
    const timestamp = new Date(val).getTime();
    setFormData({ ...formData, transaction_date: timestamp });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
      
      {/* Segmented Control for Type */}
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'expense', category_id: '' })}
          style={{ 
            flex: 1, padding: '12px', border: 'none', 
            background: formData.type === 'expense' ? 'var(--primary)' : 'var(--bg)',
            color: formData.type === 'expense' ? 'white' : 'inherit',
            fontWeight: formData.type === 'expense' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'income', category_id: '' })}
          style={{ 
            flex: 1, padding: '12px', border: 'none', 
            background: formData.type === 'income' ? 'var(--primary)' : 'var(--bg)',
            color: formData.type === 'income' ? 'white' : 'inherit',
            fontWeight: formData.type === 'income' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Income
        </button>
      </div>

      {/* Date */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Date & Time</label>
        <input 
          type="datetime-local" 
          value={formatDateTimeLocal(formData.transaction_date)} 
          onChange={e => handleDateChange(e.target.value)}
          required
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '1rem', color: 'var(--text)' }}
        />
      </div>

      {/* Amount */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Amount</label>
        <input 
          type="number" 
          inputMode="decimal"
          step="0.01"
          value={formData.amount || ''} 
          onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
          required
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '1rem', color: 'var(--text)' }}
        />
      </div>

      {/* Category */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Category</label>
        <select 
          value={formData.category_id || ''} 
          onChange={e => setFormData({ ...formData, category_id: e.target.value })}
          required
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '1rem', color: 'var(--text)' }}
        >
          <option value="" disabled>Select a category</option>
          {options?.categories
            .filter(c => c.type === formData.type)
            .map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))
          }
        </select>
      </div>

      {/* Note */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Note (Optional)</label>
        <textarea 
          value={formData.note || ''} 
          onChange={e => setFormData({ ...formData, note: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '1rem', color: 'var(--text)' }}
        />
      </div>

      <ReceiptCapture existingPath={formData.receipt_path} onImageSelected={setReceiptBase64} />

      <button 
        type="submit" 
        disabled={submitting}
        style={{ padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '8px', cursor: 'pointer' }}
      >
        {submitting ? 'Saving...' : 'Save Transaction'}
      </button>
    </form>
  );
}

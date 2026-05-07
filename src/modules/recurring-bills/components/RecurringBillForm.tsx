import React, { FormEvent, useEffect, useState } from 'react';
import { CreateRecurringBillInput, RecurringBill, UpdateRecurringBillInput } from '../domain/recurring-bill.model';
import { getDbConnection } from '@/core/db/sqlite/connection';

interface Props {
  existing?: RecurringBill;
  onSave: (data: CreateRecurringBillInput | UpdateRecurringBillInput) => Promise<void>;
  onCancel: () => void;
}

interface SelectOption { id: string; name: string; }

export const RecurringBillForm: React.FC<Props> = ({ existing, onSave, onCancel }) => {
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [frequency] = useState<RecurringBill['frequency']>('monthly');
  const [reminderDays, setReminderDays] = useState(existing?.reminder_days?.toString() ?? '3');
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = existing ? new Date(existing.next_due_date) : new Date();
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [walletId, setWalletId] = useState(existing?.wallet_id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? '');
  const [wallets, setWallets] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const db = await getDbConnection();
      const { values: ws } = await db.query('SELECT id, name FROM wallets');
      const { values: cs } = await db.query("SELECT id, name FROM categories WHERE type = 'expense'");
      const loadedWallets = ws || [];
      const loadedCats = cs || [];
      setWallets(loadedWallets);
      setCategories(loadedCats);
      if (!existing && loadedWallets.length > 0 && !walletId) setWalletId(loadedWallets[0].id);
      if (!existing && loadedCats.length > 0 && !categoryId) setCategoryId(loadedCats[0].id);
    }
    loadOptions();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Amount must be a positive number.'); return; }
    if (!walletId) { setError('Please select a wallet.'); return; }
    if (!categoryId) { setError('Please select a category.'); return; }

    const dueDateMs = new Date(nextDueDate).getTime();
    if (isNaN(dueDateMs)) { setError('Invalid due date.'); return; }

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        frequency,
        next_due_date: dueDateMs,
        reminder_days: Math.max(0, parseInt(reminderDays) || 3),
        wallet_id: walletId,
        category_id: categoryId,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: '1rem', color: 'var(--text)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-muted)',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && <div style={{ color: '#e11d48', fontSize: '0.9rem', padding: '10px', background: 'rgba(244,63,94,0.08)', borderRadius: '8px' }}>{error}</div>}

      <div>
        <label style={labelStyle}>Bill Name</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix Subscription" required />
      </div>

      <div>
        <label style={labelStyle}>Amount</label>
        <input style={inputStyle} type="number" inputMode="decimal" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
      </div>

      <div>
        <label style={labelStyle}>Next Due Date</label>
        <input style={inputStyle} type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required />
      </div>

      <div>
        <label style={labelStyle}>Remind me (days before due)</label>
        <input style={inputStyle} type="number" min="0" max="30" value={reminderDays} onChange={e => setReminderDays(e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Wallet</label>
        <select style={inputStyle} value={walletId} onChange={e => setWalletId(e.target.value)} required>
          <option value="" disabled>Select wallet</option>
          {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Category</label>
        <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
          <option value="" disabled>Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '8px' }}>
        ℹ️ Frequency is monthly. Reminders are in-app only and do not auto-create transactions.
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)' }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          style={{ flex: 2, padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>
          {submitting ? 'Saving…' : existing ? 'Update Bill' : 'Add Bill'}
        </button>
      </div>
    </form>
  );
};

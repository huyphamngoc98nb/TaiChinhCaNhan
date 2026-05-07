import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRecurringBills } from '../hooks/useRecurringBills';
import { RecurringBillList } from '../components/RecurringBillList';
import { RecurringBillForm } from '../components/RecurringBillForm';
import { RecurringBill } from '../domain/recurring-bill.model';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';

export function RecurringBillsPage() {
  const { bills, loading, error, create, update, remove, toggleActive, advanceDueDate } = useRecurringBills();
  const { confirm } = useConfirm();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringBill | null>(null);

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await update(editing.id, data);
        toast.success('Bill updated successfully');
      } else {
        await create(data);
        toast.success('Bill added successfully');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save bill');
      throw e;
    }
  };

  const handleEdit = (bill: RecurringBill) => {
    setEditing(bill);
    setShowForm(true);
  };

  const handleDelete = async (bill: RecurringBill) => {
    const ok = await confirm({
      title: 'Delete Recurring Bill',
      message: `Delete "${bill.name}"? This cannot be undone.`,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      await remove(bill.id);
      toast.success('Bill deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete bill');
    }
  };

  const handleToggle = async (bill: RecurringBill) => {
    try {
      await toggleActive(bill);
      toast.info(bill.is_active === 1 ? 'Bill paused' : 'Bill resumed');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update bill');
    }
  };

  const handleAdvance = async (bill: RecurringBill) => {
    try {
      await advanceDueDate(bill);
      toast.success(`"${bill.name}" marked as paid — next due date advanced`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to advance due date');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>Recurring Bills</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Monthly bills · {bills.filter(b => b.is_active === 1).length} active
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(14,165,233,0.2)',
            }}
          >
            <Plus size={18} /> Add
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(244,63,94,0.08)', borderRadius: '10px', color: '#be123c', marginBottom: '16px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: '700', color: 'var(--text)' }}>
            {editing ? 'Edit Bill' : 'New Monthly Bill'}
          </h3>
          <RecurringBillForm
            existing={editing ?? undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Loading bills…</div>
      ) : (
        <RecurringBillList
          bills={bills}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggle}
          onAdvanceDueDate={handleAdvance}
        />
      )}
    </div>
  );
}

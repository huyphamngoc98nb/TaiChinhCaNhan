import React from 'react';
import { RecurringBill } from '../domain/recurring-bill.model';
import { Edit2, Trash2, ToggleLeft, ToggleRight, CalendarCheck } from 'lucide-react';
import { classifyDueStatus, daysDiff } from '../services/classify-due-status';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  bills: RecurringBill[];
  onEdit: (bill: RecurringBill) => void;
  onDelete: (bill: RecurringBill) => void;
  onToggleActive: (bill: RecurringBill) => void;
  onAdvanceDueDate: (bill: RecurringBill) => void;
}

const STATUS_COLORS = {
  overdue: { dot: '#e11d48', text: '#be123c' },
  due_today: { dot: '#f59e0b', text: '#92400e' },
  upcoming: { dot: '#0ea5e9', text: '#0369a1' },
};

export const RecurringBillList: React.FC<Props> = ({ bills, onEdit, onDelete, onToggleActive, onAdvanceDueDate }) => {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();

  if (bills.length === 0) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅</div>
        <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t('recurring_bills.empty_title')}</p>
        <p style={{ fontSize: '0.85rem' }}>{t('recurring_bills.empty_hint')}</p>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {bills.map(bill => {
        const isDeleted = bill.is_active === -1 as any;
        if (isDeleted) return null;

        const isActive = bill.is_active === 1;
        const status = isActive ? classifyDueStatus(bill.next_due_date, bill.reminder_days, now) : null;
        const diff = daysDiff(bill.next_due_date, now);
        const dueLabel = diff < 0 ? `${Math.abs(diff)} ${t('recurring_bills.days_overdue')}`
          : diff === 0 ? t('recurring_bills.due_today')
          : `${t('recurring_bills.due_in')} ${diff} ${t('recurring_bills.days_short')}`;

        const dotColor = status ? STATUS_COLORS[status].dot : '#94a3b8';

        return (
          <div key={bill.id} style={{
            padding: '14px 16px',
            background: 'var(--surface)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px var(--shadow-color)',
            opacity: isActive ? 1 : 0.55,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bill.name}
                  </span>
                </div>
                <div style={{ marginLeft: '16px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {formatAmount(bill.amount)} · {isActive ? dueLabel : t('recurring_bills.paused')} · {t('recurring_bills.remind_before')} {bill.reminder_days} {t('recurring_bills.days_short')}
                </div>
              </div>

              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--danger)', marginLeft: '12px', flexShrink: 0 }}>
                {formatAmount(bill.amount)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
              {isActive && (
                <button onClick={() => onAdvanceDueDate(bill)} title={t('recurring_bills.mark_paid_advance')}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #d1fae5', background: 'rgba(16,185,129,0.08)', color: '#059669', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                  <CalendarCheck size={14} /> {t('recurring_bills.paid')}
                </button>
              )}
              <button onClick={() => onToggleActive(bill)} title={isActive ? t('recurring_bills.pause') : t('recurring_bills.resume')}
                style={{ display: 'flex', padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {isActive ? <ToggleRight size={20} color="var(--primary)" /> : <ToggleLeft size={20} />}
              </button>
              <button onClick={() => onEdit(bill)} title={t('common.edit')}
                style={{ display: 'flex', padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(bill)} title={t('common.delete')}
                style={{ display: 'flex', padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#f43f5e' }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

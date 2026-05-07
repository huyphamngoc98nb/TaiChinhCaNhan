import React from 'react';
import { RecurringBillReminder } from '../domain/recurring-bill.model';
import { AlertTriangle, Clock, CalendarCheck } from 'lucide-react';

interface Props {
  reminders: RecurringBillReminder[];
}

const STATUS_CONFIG = {
  overdue: {
    bg: 'rgba(244,63,94,0.08)',
    border: '#fecdd3',
    color: '#be123c',
    icon: <AlertTriangle size={16} color="#be123c" />,
    label: 'Overdue',
  },
  due_today: {
    bg: 'rgba(234,179,8,0.08)',
    border: '#fde68a',
    color: '#92400e',
    icon: <Clock size={16} color="#b45309" />,
    label: 'Due Today',
  },
  upcoming: {
    bg: 'rgba(14,165,233,0.08)',
    border: '#bae6fd',
    color: '#0369a1',
    icon: <CalendarCheck size={16} color="#0369a1" />,
    label: 'Upcoming',
  },
};

function formatDaysDiff(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  if (days === 0) return 'due today';
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

export const RecurringBillReminderBanner: React.FC<Props> = ({ reminders }) => {
  if (reminders.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Bill Reminders
      </div>
      {reminders.map(({ bill, status, days_diff }) => {
        const cfg = STATUS_CONFIG[status];
        return (
          <div
            key={bill.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: '12px',
            }}
          >
            <div style={{ flexShrink: 0 }}>{cfg.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bill.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: cfg.color }}>
                {formatDaysDiff(days_diff)} · ${bill.amount.toFixed(2)}
              </div>
            </div>
            <div style={{
              flexShrink: 0,
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '999px',
              background: cfg.border,
              color: cfg.color,
            }}>
              {cfg.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

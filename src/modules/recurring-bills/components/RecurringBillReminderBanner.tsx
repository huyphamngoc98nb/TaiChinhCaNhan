import React from 'react';
import { RecurringBillReminder } from '../domain/recurring-bill.model';
import { AlertTriangle, Clock, CalendarCheck } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  reminders: RecurringBillReminder[];
}

const STATUS_CONFIG = {
  overdue: {
    bg: 'rgba(244,63,94,0.08)',
    border: '#fecdd3',
    color: '#be123c',
    icon: <AlertTriangle size={16} color="#be123c" />,
    labelKey: 'recurring_bills.overdue',
  },
  due_today: {
    bg: 'rgba(234,179,8,0.08)',
    border: '#fde68a',
    color: '#92400e',
    icon: <Clock size={16} color="#b45309" />,
    labelKey: 'recurring_bills.due_today',
  },
  upcoming: {
    bg: 'rgba(14,165,233,0.08)',
    border: '#bae6fd',
    color: '#0369a1',
    icon: <CalendarCheck size={16} color="#0369a1" />,
    labelKey: 'recurring_bills.upcoming',
  },
} as const;

function formatDaysDiff(days: number, t: ReturnType<typeof useLanguage>['t']): string {
  if (days < 0) {
    return t('recurring_bills.reminder_overdue_days').replace('{days}', String(Math.abs(days)));
  }
  if (days === 0) return t('recurring_bills.reminder_due_today');
  return t('recurring_bills.reminder_due_in_days').replace('{days}', String(days));
}

export const RecurringBillReminderBanner: React.FC<Props> = ({ reminders }) => {
  const { t } = useLanguage();

  if (reminders.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {t('recurring_bills.reminder_title')}
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
                {formatDaysDiff(days_diff, t)} · ${bill.amount.toFixed(2)}
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
              {t(cfg.labelKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

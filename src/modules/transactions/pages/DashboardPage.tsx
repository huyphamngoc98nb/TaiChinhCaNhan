import { useBudgets } from '@/modules/budgets/hooks/useBudgets';
import { BudgetAlertsPanel } from '@/modules/budgets/components/BudgetAlertsPanel';
import { useRecurringBills } from '@/modules/recurring-bills/hooks/useRecurringBills';
import { RecurringBillReminderBanner } from '@/modules/recurring-bills/components/RecurringBillReminderBanner';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useLanguage } from '@/shared/context/LanguageContext';

export function DashboardPage() {
  const { alerts, loading: budgetsLoading } = useBudgets();
  const { reminders, loading: billsLoading } = useRecurringBills();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('dashboard.title')}</h1>
      </div>

      {/* Bill Reminders */}
      {!billsLoading && reminders.length > 0 && (
        <div>
          <RecurringBillReminderBanner reminders={reminders} />
          <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '20px' }}>
            <button
              onClick={() => navigate(ROUTES.RECURRING_BILLS)}
              style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              {t('dashboard.manage_bills')} →
            </button>
          </div>
        </div>
      )}

      {/* Budget Alerts */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>{t('dashboard.budget_alerts')}</h2>
        <BudgetAlertsPanel alerts={alerts} loading={budgetsLoading} />
      </div>
    </div>
  );
}

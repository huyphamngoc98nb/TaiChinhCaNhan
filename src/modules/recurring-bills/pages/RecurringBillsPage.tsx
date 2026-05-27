import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useRecurringBills } from '../hooks/useRecurringBills';
import { RecurringBillList } from '../components/RecurringBillList';
import { RecurringBill } from '../domain/recurring-bill.model';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ROUTES } from '@/shared/constants/routes';

export function RecurringBillsPage() {
  const { bills, loading, error, remove, toggleActive, advanceDueDate } = useRecurringBills();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const toast = useToast();
  const { t } = useLanguage();

  const handleEdit = (bill: RecurringBill) => {
    navigate(`/recurring-bills/${bill.id}/edit`);
  };

  const handleDelete = async (bill: RecurringBill) => {
    const ok = await confirm({
      title: t('recurring_bills.delete_confirm_title'),
      message: `${t('recurring_bills.delete_confirm_msg')} ${bill.name}`,
      confirmText: t('recurring_bills.delete_confirm_btn'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await remove(bill.id);
      toast.success(t('recurring_bills.delete_success'));
    } catch (e: any) {
      toast.error(e.message || t('recurring_bills.delete_failed'));
    }
  };

  const handleToggle = async (bill: RecurringBill) => {
    try {
      await toggleActive(bill);
      toast.info(bill.is_active === 1 ? t('recurring_bills.bill_paused') : t('recurring_bills.bill_resumed'));
    } catch (e: any) {
      toast.error(e.message || t('recurring_bills.update_failed'));
    }
  };

  const handleAdvance = async (bill: RecurringBill) => {
    try {
      await advanceDueDate(bill);
      toast.success(`${bill.name} ${t('recurring_bills.mark_paid_success')}`);
    } catch (e: any) {
      toast.error(e.message || t('recurring_bills.advance_failed'));
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('recurring_bills.title')}</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {t('recurring_bills.subtitle')} - {bills.filter(b => b.is_active === 1).length} {t('recurring_bills.active_count')}
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.RECURRING_BILLS_NEW)}
          aria-label={t('recurring_bills.add')}
          title={t('recurring_bills.add')}
          className="w-10 h-10 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center text-[24px] font-light active:scale-95 transition-transform flex-shrink-0"
        >
          <Plus size={24} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(244,63,94,0.08)', borderRadius: '10px', color: '#be123c', marginBottom: '16px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>{t('common.loading')}</div>
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

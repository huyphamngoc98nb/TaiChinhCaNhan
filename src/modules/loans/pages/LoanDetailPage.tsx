import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CircleDollarSign, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { FormSheet } from '@/shared/components/FormSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { loanRepository } from '@/core/di/loans.di';
import { computeLoanDebtStatus } from '@/modules/debts/services/debt-status';
import { ROUTES } from '@/shared/constants/routes';
import { useLanguage } from '@/shared/context/LanguageContext';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate } from '@/shared/utils/display-format';
import type { CreateLoanPaymentInput, LoanPayment, LoanWithSummary, UpdateLoanInput } from '../domain/loan.model';
import { PaymentForm } from '../components/PaymentForm';
import { LoanForm } from '../components/LoanForm';
import { useLoanMutations } from '../hooks/useLoanMutations';
import { LoanHasPaymentsError, type DeleteLoanMode } from '../services/delete-loan';

interface LoanDetailPageProps {
  loanId?: string;
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function LoanDetailPage({ loanId: loanIdProp }: LoanDetailPageProps = {}) {
  const { t } = useLanguage();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const params = useParams<{ id: string }>();
  const loanId = loanIdProp ?? params.id;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { addPayment, cancelLoan, deleteLoan, updateLoan, loading: mutationLoading } = useLoanMutations();
  const [loan, setLoan] = useState<LoanWithSummary | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function typeLabel(type: LoanWithSummary['type']): string {
    return type === 'lend' ? t('loans.card.typeLend') : t('loans.card.typeBorrow');
  }

  function statusLabel(status: LoanWithSummary['status']): string {
    if (status === 'active') return t('loans.card.statusActive');
    if (status === 'settled') return t('loans.card.statusSettled');
    return t('loans.card.statusCancelled');
  }
  const displayAmount = (value: number) => showAmounts ? formatVnd(value) : HIDDEN_AMOUNT;

  function formatIsoDate(value: string | null): string {
    if (!value) return t('loans.pages.detail.noDueDate');
    return formatAppDate(new Date(`${value}T00:00:00`).getTime(), displayFormatSettings);
  }

  function formatMsDate(value: number): string {
    return formatAppDate(value, displayFormatSettings);
  }

  const load = useCallback(async () => {
    if (!loanId) {
      setError(new Error(t('loans.pages.detail.notFound')));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [loanRows, paymentRows] = await Promise.all([
        loanRepository.listLoans({ includeDeleted: true }),
        loanRepository.listPayments(loanId),
      ]);
      const currentLoan = loanRows.find((item) => item.id === loanId) ?? null;
      if (!currentLoan) throw new Error(t('loans.pages.detail.notFound'));
      setLoan(currentLoan);
      setPayments(paymentRows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [loanId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddPayment(input: CreateLoanPaymentInput) {
    await addPayment(input);
    setPaymentOpen(false);
    await load();
  }

  async function handleUpdateLoan(input: UpdateLoanInput) {
    if (!loan) return;

    await updateLoan(loan.id, input);
    toast.success(t('loans.pages.detail.updatedSuccess'));
    setEditOpen(false);
    await load();
  }

  async function handleCancelLoan() {
    if (!loan) return;

    const ok = await confirm.confirm({
      title: t('loans.pages.detail.cancelTitle'),
      message: `${t('loans.pages.detail.cancelMessage')} ${loan.contact_name}?`,
      confirmText: t('loans.pages.detail.cancelConfirm'),
      cancelText: t('loans.pages.detail.close'),
    });
    if (!ok) return;

    try {
      await cancelLoan(loan.id);
      toast.success(t('loans.pages.detail.cancelledSuccess'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loans.pages.detail.cancelFailed'));
    }
  }

  async function performDelete(mode: DeleteLoanMode, force = false) {
    if (!loan) return;

    try {
      await deleteLoan(loan.id, mode, force);
      toast.success(mode === 'soft' ? t('loans.pages.common.hiddenSuccess') : t('loans.pages.common.deletedSuccess'));
      setDeleteOpen(false);
      navigate(ROUTES.LOANS);
    } catch (err) {
      if (mode === 'hard' && err instanceof LoanHasPaymentsError) {
        setDeleteOpen(false);
        const ok = await confirm.confirm({
          title: t('loans.pages.common.hardDeleteTitle'),
          message: err.message,
          confirmText: t('loans.pages.common.hardDeleteConfirm'),
          cancelText: t('loans.pages.common.cancel'),
        });
        if (!ok) return;
        await performDelete('hard', true);
        return;
      }

      toast.error(err instanceof Error ? err.message : t('loans.pages.common.deleteFailed'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-bg px-4 py-4">
        <div className="h-[220px] animate-pulse rounded-[16px] bg-surface-muted" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-full bg-bg px-4 py-4">
        <div className="mb-4">
          <BackButton onClick={() => navigate(-1)} ariaLabel={t('loans.pages.common.back')} />
        </div>
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
          {error?.message ?? t('loans.pages.detail.notFound')}
        </div>
      </div>
    );
  }
  const debtStatus = computeLoanDebtStatus(loan);
  const attentionStatus = debtStatus === 'dueSoon' || debtStatus === 'overdue';
  const detailStatusLabel =
    debtStatus === 'paidOff'
      ? t('loans.card.statusPaidOff')
      : loan.status === 'cancelled'
        ? t('loans.card.statusCancelled')
        : debtStatus === 'overdue'
          ? t('loans.card.statusOverdue')
          : debtStatus === 'dueSoon'
            ? t('loans.card.statusDueSoon')
            : statusLabel(loan.status);

  return (
    <div className="min-h-full bg-bg pb-24">
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm shadow-gray-200/60">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate(-1)} ariaLabel={t('loans.pages.common.back')} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-extrabold text-text">
              {loan.contact_name}
            </h1>
            <p className="text-[12px] font-medium text-gray-500">
              {typeLabel(loan.type)} · {detailStatusLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-[16px] border border-border bg-surface p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                {t('loans.pages.detail.contact')}
              </p>
              <p className="mt-1 truncate text-[18px] font-extrabold text-text">
                {loan.contact_name}
              </p>
              {loan.contact_info && (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-gray-500">
                  <Phone size={14} />
                  <span className="truncate">{loan.contact_info}</span>
                </p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${
              debtStatus === 'paidOff'
                ? 'bg-emerald-100 text-emerald-700'
                : loan.status === 'cancelled'
                  ? 'bg-gray-100 text-gray-600'
                  : attentionStatus
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-blue-100 text-blue-700'
            }`}>
              {detailStatusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-bg-subtle p-3">
              <p className="text-[12px] font-semibold text-gray-400">{t('loans.pages.detail.principal')}</p>
              <p className="mt-1 text-[15px] font-extrabold text-text">
                {displayAmount(loan.principal)}
              </p>
            </div>
            <div className="rounded-[12px] bg-bg-subtle p-3">
              <p className="text-[12px] font-semibold text-gray-400">{t('loans.card.remaining')}</p>
              <p className="mt-1 text-[15px] font-extrabold text-rose-600">
                {displayAmount(loan.remaining)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-bg-subtle p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
                <CalendarDays size={14} />
                {t('loans.card.dueDate')}
              </p>
              <p className="mt-1 text-[14px] font-bold text-gray-700">
                {formatIsoDate(loan.due_date)}
              </p>
            </div>
            <div className="rounded-[12px] bg-bg-subtle p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
                <CircleDollarSign size={14} />
                {t('loans.card.paid')}
              </p>
              <p className="mt-1 text-[14px] font-bold text-emerald-600">
                {displayAmount(loan.paid_amount)}
              </p>
            </div>
          </div>

          {loan.note && (
            <div className="mt-3 rounded-[12px] bg-bg-subtle p-3 text-[13px] font-medium text-muted">
              {loan.note}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          disabled={mutationLoading}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-indigo-200 bg-white text-[14px] font-bold text-indigo-600 active:scale-[0.98] disabled:opacity-50"
        >
          <Pencil size={17} />
          {t('loans.pages.detail.editInfo')}
        </button>

        {loan.status === 'active' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              className="flex h-[48px] items-center justify-center gap-2 rounded-[14px] bg-emerald-500 text-[14px] font-bold text-white shadow-lg shadow-emerald-300/40 active:scale-[0.98]"
            >
              <Plus size={17} />
              {t('loans.pages.detail.recordPayment')}
            </button>
            <button
              type="button"
              onClick={handleCancelLoan}
              disabled={mutationLoading}
              className="h-[48px] rounded-[14px] border border-rose-200 bg-white text-[14px] font-bold text-rose-600 active:scale-[0.98] disabled:opacity-50"
            >
              {t('loans.pages.detail.cancelTitle')}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={mutationLoading}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-white text-[14px] font-bold text-rose-600 active:scale-[0.98] disabled:opacity-50"
        >
          <Trash2 size={17} />
          {t('loans.pages.detail.deleteLoan')}
        </button>

        <section>
          <h2 className="mb-3 text-[16px] font-extrabold text-text">{t('loans.pages.detail.payments')}</h2>
          {payments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-border bg-surface px-4 py-8 text-center text-[13px] font-medium text-subtle">
              {t('loans.pages.detail.noPayments')}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[14px] border border-border bg-surface px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-extrabold text-emerald-600">
                      {displayAmount(payment.amount)}
                    </p>
                    <p className="text-[12px] font-bold text-gray-400">
                      {formatMsDate(payment.payment_date)}
                    </p>
                  </div>
                  {payment.note && (
                    <p className="mt-1 text-[13px] font-medium text-gray-500">{payment.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <FormSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        fullScreenOnAndroid
        transitionKey={`edit-${loan.id}`}
        title={t('loans.pages.detail.editTitle')}
        logContext="LoanForm"
      >
        <div className="pb-[calc(32px+env(safe-area-inset-bottom))]">
          <LoanForm
            initialLoan={loan}
            onSubmit={handleUpdateLoan}
            loading={mutationLoading}
            title={t('loans.pages.detail.editTitle')}
            description={t('loans.pages.detail.editDescription')}
            submitLabel={t('loans.pages.detail.saveChanges')}
          />
        </div>
      </FormSheet>

      <FormSheet
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        fullScreenOnAndroid
        transitionKey={`payment-${loan.id}`}
        title={t('loans.pages.detail.recordPayment')}
        logContext="PaymentForm"
      >
        <PaymentForm loan={loan} onSubmit={handleAddPayment} loading={mutationLoading} />
      </FormSheet>

      <FormSheet
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        transitionKey={`delete-${loan.id}`}
        title={t('loans.pages.detail.deleteLoan')}
        logContext="LoanDeleteSheet"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-[18px] font-bold text-text">{t('loans.pages.detail.deleteLoan')}</h3>
            <p className="mt-1 text-[12px] font-medium text-muted">
              {t('loans.pages.detail.deleteDescription')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void performDelete('soft')}
            disabled={mutationLoading || loan.deleted_at != null}
            className="h-[48px] w-full rounded-[14px] bg-surface-muted text-[14px] font-bold text-muted active:scale-[0.98] disabled:opacity-50"
          >
            {t('loans.pages.detail.hideFromList')}
          </button>
          <button
            type="button"
            onClick={() => void performDelete('hard')}
            disabled={mutationLoading}
            className="h-[48px] w-full rounded-[14px] bg-rose-500 text-[14px] font-bold text-white shadow-lg shadow-rose-300/40 active:scale-[0.98] disabled:opacity-50"
          >
            {t('loans.pages.detail.deletePermanently')}
          </button>
        </div>
      </FormSheet>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CircleDollarSign, Phone, Plus, Trash2 } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { loanRepository } from '@/core/di/loans.di';
import { ROUTES } from '@/shared/constants/routes';
import type { CreateLoanPaymentInput, LoanPayment, LoanStatus, LoanType, LoanWithSummary } from '../domain/loan.model';
import { PaymentForm } from '../components/PaymentForm';
import { useLoanMutations } from '../hooks/useLoanMutations';
import { LoanHasPaymentsError, type DeleteLoanMode } from '../services/delete-loan';

interface LoanDetailPageProps {
  loanId?: string;
}

const TYPE_LABELS: Record<LoanType, string> = {
  lend: 'Cho vay',
  borrow: 'Vay nợ',
};

const STATUS_LABELS: Record<LoanStatus, string> = {
  active: 'Còn nợ',
  settled: 'Đã tất toán',
  cancelled: 'Đã hủy',
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatIsoDate(value: string | null): string {
  if (!value) return 'Chưa đặt hạn';
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMsDate(value: number): string {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function LoanDetailPage({ loanId: loanIdProp }: LoanDetailPageProps = {}) {
  const params = useParams<{ id: string }>();
  const loanId = loanIdProp ?? params.id;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { addPayment, cancelLoan, deleteLoan, loading: mutationLoading } = useLoanMutations();
  const [loan, setLoan] = useState<LoanWithSummary | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!loanId) {
      setError(new Error('Loan not found'));
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
      if (!currentLoan) throw new Error('Loan not found');
      setLoan(currentLoan);
      setPayments(paymentRows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddPayment(input: CreateLoanPaymentInput) {
    await addPayment(input);
    setPaymentOpen(false);
    await load();
  }

  async function handleCancelLoan() {
    if (!loan) return;

    const ok = await confirm.confirm({
      title: 'Hủy khoản',
      message: `Hủy khoản với ${loan.contact_name}?`,
      confirmText: 'Hủy khoản',
      cancelText: 'Đóng',
    });
    if (!ok) return;

    try {
      await cancelLoan(loan.id);
      toast.success('Đã hủy khoản.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy khoản.');
    }
  }

  async function performDelete(mode: DeleteLoanMode, force = false) {
    if (!loan) return;

    try {
      await deleteLoan(loan.id, mode, force);
      toast.success(mode === 'soft' ? 'Đã ẩn khoản.' : 'Đã xoá vĩnh viễn khoản.');
      setDeleteOpen(false);
      navigate(ROUTES.LOANS);
    } catch (err) {
      if (mode === 'hard' && err instanceof LoanHasPaymentsError) {
        setDeleteOpen(false);
        const ok = await confirm.confirm({
          title: 'Xoá vĩnh viễn?',
          message: err.message,
          confirmText: 'Xác nhận xoá vĩnh viễn',
          cancelText: 'Huỷ',
        });
        if (!ok) return;
        await performDelete('hard', true);
        return;
      }

      toast.error(err instanceof Error ? err.message : 'Không thể xoá khoản.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-4">
        <div className="h-[220px] animate-pulse rounded-[16px] bg-gray-200" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-4">
        <div className="mb-4">
          <BackButton onClick={() => navigate(-1)} ariaLabel="Quay lại" />
        </div>
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
          {error?.message ?? 'Loan not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pb-3 pt-4 shadow-sm shadow-gray-200/60">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate(-1)} ariaLabel="Quay lại" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-extrabold text-gray-900">
              {loan.contact_name}
            </h1>
            <p className="text-[12px] font-medium text-gray-500">
              {TYPE_LABELS[loan.type]} · {STATUS_LABELS[loan.status]}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                Người liên hệ
              </p>
              <p className="mt-1 truncate text-[18px] font-extrabold text-gray-900">
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
              loan.status === 'settled'
                ? 'bg-emerald-100 text-emerald-700'
                : loan.status === 'cancelled'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-rose-100 text-rose-700'
            }`}>
              {STATUS_LABELS[loan.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-gray-50 p-3">
              <p className="text-[12px] font-semibold text-gray-400">Gốc</p>
              <p className="mt-1 text-[15px] font-extrabold text-gray-900">
                {formatVnd(loan.principal)}
              </p>
            </div>
            <div className="rounded-[12px] bg-gray-50 p-3">
              <p className="text-[12px] font-semibold text-gray-400">Còn lại</p>
              <p className="mt-1 text-[15px] font-extrabold text-rose-600">
                {formatVnd(loan.remaining)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-gray-50 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
                <CalendarDays size={14} />
                Hạn trả
              </p>
              <p className="mt-1 text-[14px] font-bold text-gray-700">
                {formatIsoDate(loan.due_date)}
              </p>
            </div>
            <div className="rounded-[12px] bg-gray-50 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
                <CircleDollarSign size={14} />
                Đã trả
              </p>
              <p className="mt-1 text-[14px] font-bold text-emerald-600">
                {formatVnd(loan.paid_amount)}
              </p>
            </div>
          </div>

          {loan.note && (
            <div className="mt-3 rounded-[12px] bg-gray-50 p-3 text-[13px] font-medium text-gray-600">
              {loan.note}
            </div>
          )}
        </section>

        {loan.status === 'active' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              className="flex h-[48px] items-center justify-center gap-2 rounded-[14px] bg-emerald-500 text-[14px] font-bold text-white shadow-lg shadow-emerald-300/40 active:scale-[0.98]"
            >
              <Plus size={17} />
              Ghi nhận
            </button>
            <button
              type="button"
              onClick={handleCancelLoan}
              disabled={mutationLoading}
              className="h-[48px] rounded-[14px] border border-rose-200 bg-white text-[14px] font-bold text-rose-600 active:scale-[0.98] disabled:opacity-50"
            >
              Hủy khoản
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
          Xoá khoản này
        </button>

        <section>
          <h2 className="mb-3 text-[16px] font-extrabold text-gray-900">Thanh toán</h2>
          {payments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-[13px] font-medium text-gray-400">
              Chưa có thanh toán nào.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-extrabold text-emerald-600">
                      {formatVnd(payment.amount)}
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

      <BottomSheet isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} fullScreenOnAndroid>
        <PaymentForm loan={loan} onSubmit={handleAddPayment} loading={mutationLoading} />
      </BottomSheet>

      <BottomSheet isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-[18px] font-bold text-gray-900">Xoá khoản này</h3>
            <p className="mt-1 text-[12px] font-medium text-gray-500">
              Giao dịch trong ví vẫn được giữ lại như lịch sử thực tế.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void performDelete('soft')}
            disabled={mutationLoading || loan.deleted_at != null}
            className="h-[48px] w-full rounded-[14px] bg-gray-100 text-[14px] font-bold text-gray-700 active:scale-[0.98] disabled:opacity-50"
          >
            Ẩn khỏi danh sách
          </button>
          <button
            type="button"
            onClick={() => void performDelete('hard')}
            disabled={mutationLoading}
            className="h-[48px] w-full rounded-[14px] bg-rose-500 text-[14px] font-bold text-white shadow-lg shadow-rose-300/40 active:scale-[0.98] disabled:opacity-50"
          >
            Xoá vĩnh viễn
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

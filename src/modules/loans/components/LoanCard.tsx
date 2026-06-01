import type { LoanStatus, LoanType, LoanWithSummary } from '../domain/loan.model';

interface LoanCardProps {
  loan: LoanWithSummary;
  onPress: (id: string) => void;
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

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isOverdue(loan: LoanWithSummary): boolean {
  if (!loan.due_date || loan.status !== 'active' || loan.remaining <= 0) return false;
  const due = new Date(`${loan.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  const isDeleted = loan.deleted_at != null;
  const progress = Math.min(100, Math.max(0, (loan.paid_amount / loan.principal) * 100));
  const overdue = isOverdue(loan);
  const typeClass = loan.type === 'lend'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-blue-100 text-blue-700';
  const statusClass =
    loan.status === 'settled'
      ? 'bg-emerald-100 text-emerald-700'
      : loan.status === 'cancelled'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-rose-100 text-rose-700';

  return (
    <button
      type="button"
      onClick={() => onPress(loan.id)}
      className={`w-full rounded-[14px] border border-gray-200 bg-white p-4 text-left shadow-sm active:scale-[0.99] transition-all ${
        isDeleted ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-gray-900">{loan.contact_name}</p>
          {loan.wallet_name && (
            <p className="mt-0.5 truncate text-[12px] font-medium text-gray-400">
              {loan.wallet_name}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${typeClass}`}>
            {TYPE_LABELS[loan.type]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>
            {STATUS_LABELS[loan.status]}
          </span>
          {isDeleted && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
              Đã ẩn
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold text-gray-500">
          <span>{formatVnd(loan.paid_amount)} đã trả</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${loan.type === 'lend' ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-400">Còn lại</p>
          <p className={`mt-0.5 text-[17px] font-extrabold ${overdue ? 'text-rose-600' : 'text-gray-900'}`}>
            {formatVnd(loan.remaining)}
          </p>
        </div>
        {loan.due_date && (
          <div className="text-right">
            <p className="text-[12px] font-medium text-gray-400">Hạn trả</p>
            <p className={`mt-0.5 text-[13px] font-bold ${overdue ? 'text-rose-600' : 'text-gray-600'}`}>
              {formatDate(loan.due_date)}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

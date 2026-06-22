import { computeLoanDebtStatus } from '@/modules/debts/services/debt-status';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate } from '@/shared/utils/display-format';
import type { LoanWithSummary } from '../domain/loan.model';

interface LoanCardProps {
  loan: LoanWithSummary;
  onPress: (id: string) => void;
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const displayAmount = (value: number) => (
    showAmounts ? formatAmount(value, locale) : HIDDEN_AMOUNT
  );

  function formatDate(value: string): string {
    return formatAppDate(new Date(`${value}T00:00:00`).getTime(), displayFormatSettings);
  }

  const isDeleted = loan.deleted_at != null;
  const progress = Math.min(100, Math.max(0, (loan.paid_amount / loan.principal) * 100));
  const debtStatus = computeLoanDebtStatus(loan);
  const isAttention = debtStatus === 'dueSoon' || debtStatus === 'overdue';
  const typeClass = loan.type === 'lend'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-blue-100 text-blue-700';
  const statusClass =
    debtStatus === 'paidOff'
      ? 'bg-emerald-100 text-emerald-700'
      : loan.status === 'cancelled'
        ? 'bg-gray-100 text-gray-600'
        : debtStatus === 'overdue'
          ? 'bg-rose-100 text-rose-700'
          : debtStatus === 'dueSoon'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-blue-100 text-blue-700';
  const statusLabel =
    debtStatus === 'paidOff'
      ? t('loans.card.statusPaidOff')
      : loan.status === 'cancelled'
        ? t('loans.card.statusCancelled')
        : debtStatus === 'overdue'
          ? t('loans.card.statusOverdue')
          : debtStatus === 'dueSoon'
            ? t('loans.card.statusDueSoon')
            : t('loans.card.statusActive');

  return (
    <button
      type="button"
      onClick={() => onPress(loan.id)}
      className={`w-full rounded-[14px] border border-border bg-surface p-4 text-left shadow-sm active:scale-[0.99] transition-all ${
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
            {loan.type === 'lend' ? t('loans.card.typeLend') : t('loans.card.typeBorrow')}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>
            {statusLabel}
          </span>
          {isDeleted && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
              {t('loans.card.statusDeleted')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold text-gray-500">
          <span>{displayAmount(loan.paid_amount)} {t('loans.card.paid')}</span>
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
          <p className="text-[12px] font-medium text-gray-400">{t('loans.card.remaining')}</p>
          <p className={`mt-0.5 text-[17px] font-extrabold ${isAttention ? 'text-rose-600' : 'text-gray-900'}`}>
            {displayAmount(loan.remaining)}
          </p>
        </div>
        {loan.due_date && (
          <div className="text-right">
            <p className="text-[12px] font-medium text-gray-400">{t('loans.card.dueDate')}</p>
            <p className={`mt-0.5 text-[13px] font-bold ${isAttention ? 'text-rose-600' : 'text-gray-600'}`}>
              {formatDate(loan.due_date)}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

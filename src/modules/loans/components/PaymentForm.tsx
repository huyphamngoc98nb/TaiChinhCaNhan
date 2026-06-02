import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { DropdownList } from '@/shared/components/DropdownList';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import type { CreateLoanPaymentInput, LoanWithSummary } from '../domain/loan.model';

interface PaymentFormProps {
  loan: LoanWithSummary;
  onSubmit: (input: CreateLoanPaymentInput) => Promise<void>;
  loading: boolean;
}

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PaymentForm({ loan, onSubmit, loading }: PaymentFormProps) {
  const { wallets, loading: walletsLoading } = useWallets();
  const [walletId, setWalletId] = useState(loan.wallet_id ?? '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => startOfLocalDay(Date.now()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletId && wallets[0]) {
      setWalletId(wallets[0].id);
    }
  }, [walletId, wallets]);

  const walletOptions = useMemo(
    () => wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
    [wallets],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (numericAmount > loan.remaining) {
      setError('Số tiền thanh toán vượt quá số tiền còn lại.');
      return;
    }

    try {
      await onSubmit({
        loan_id: loan.id,
        wallet_id: walletId,
        amount: numericAmount,
        payment_date: startOfLocalDay(paymentDate),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận thanh toán.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-[18px] font-bold text-gray-900">Ghi nhận thanh toán</h3>
        <div className="mt-3 rounded-[12px] bg-gray-50 px-4 py-3">
          <p className="truncate text-[15px] font-bold text-gray-900">{loan.contact_name}</p>
          <p className="mt-1 text-[13px] font-semibold text-rose-600">
            Còn lại: {formatVnd(loan.remaining)}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Ví *</p>
        <DropdownList
          value={walletId}
          onChange={setWalletId}
          ariaLabel="Ví"
          placeholder={walletsLoading ? 'Đang tải ví...' : 'Chọn ví'}
          disabled={walletsLoading || walletOptions.length === 0}
          openOnInputBlurPointerDown
          options={[
            { value: '', label: 'Chọn ví', disabled: true },
            ...walletOptions,
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Số tiền *</p>
        <CurrencyAmountInput
          currency="VND"
          value={amount}
          onValueChange={setAmount}
          required
          className="border-emerald-200"
        />
        <p className="text-[11px] font-medium text-gray-400">Tối đa {formatVnd(loan.remaining)}</p>
      </div>

      <DateTimePicker
        value={paymentDate}
        onChange={setPaymentDate}
        label="Ngày thanh toán"
      />

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Ghi chú</p>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`h-[52px] w-full rounded-[14px] bg-emerald-500 text-[15px] font-bold text-white shadow-lg shadow-emerald-300/40 transition-all active:scale-[0.98] ${
          loading ? 'opacity-50' : ''
        }`}
      >
        {loading ? 'Đang lưu...' : 'Ghi nhận'}
      </button>
    </form>
  );
}

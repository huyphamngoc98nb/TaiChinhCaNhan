import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { DropdownList } from '@/shared/components/DropdownList';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import type { CreateLoanInput, Loan, LoanType } from '../domain/loan.model';

interface LoanFormProps {
  onSubmit: (input: CreateLoanInput) => Promise<void>;
  loading: boolean;
  initialLoan?: Loan;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const TYPE_OPTIONS: Array<{ id: LoanType; label: string; activeClass: string }> = [
  { id: 'lend', label: 'Cho vay', activeClass: 'bg-amber-500 text-white' },
  { id: 'borrow', label: 'Vay nợ', activeClass: 'bg-blue-500 text-white' },
];

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateStringToTimestamp(value?: string | null): number {
  if (!value) return startOfLocalDay(Date.now());
  return new Date(`${value}T00:00:00`).getTime();
}

function timestampToDateString(timestamp: number): string {
  const date = new Date(startOfLocalDay(timestamp));
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function LoanForm({
  onSubmit,
  loading,
  initialLoan,
  title,
  description,
  submitLabel,
}: LoanFormProps) {
  const { wallets, loading: walletsLoading } = useWallets();
  const skipTransactionId = useId();
  const [type, setType] = useState<LoanType>(initialLoan?.type ?? 'lend');
  const [contactName, setContactName] = useState(initialLoan?.contact_name ?? '');
  const [contactInfo, setContactInfo] = useState(initialLoan?.contact_info ?? '');
  const [walletId, setWalletId] = useState(initialLoan?.wallet_id ?? '');
  const [principal, setPrincipal] = useState(initialLoan ? String(initialLoan.principal) : '');
  const [dueDate, setDueDate] = useState(() => dateStringToTimestamp(initialLoan?.due_date));
  const [note, setNote] = useState(initialLoan?.note ?? '');
  const [skipTransaction, setSkipTransaction] = useState(initialLoan?.skip_transaction ?? false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skipTransaction && !walletId && wallets[0]) {
      setWalletId(wallets[0].id);
    }
  }, [skipTransaction, walletId, wallets]);

  const walletOptions = useMemo(
    () => wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
    [wallets],
  );

  function handleSkipTransactionChange(checked: boolean) {
    setSkipTransaction(checked);
    if (checked) {
      setWalletId('');
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!skipTransaction && !walletId) {
      setError('Vui lòng chọn ví.');
      return;
    }

    try {
      await onSubmit({
        wallet_id: skipTransaction ? null : walletId,
        skip_transaction: skipTransaction,
        type,
        contact_name: contactName.trim(),
        contact_info: contactInfo.trim() || undefined,
        principal: Number(principal),
        due_date: timestampToDateString(dueDate),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu khoản vay.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-[18px] font-bold text-gray-900">{title ?? 'Thêm khoản'}</h3>
        <p className="mt-1 text-[12px] text-gray-500">
          {description ?? 'Cho vay hoặc vay nợ cá nhân.'}
        </p>
      </div>

      {error && (
        <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="flex h-[48px] rounded-[12px] bg-gray-100 p-1">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setType(option.id)}
            className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
              type === option.id ? `${option.activeClass} shadow-sm` : 'text-gray-500'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Người liên hệ *</p>
        <input
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Thông tin liên hệ</p>
        <input
          value={contactInfo}
          onChange={(event) => setContactInfo(event.target.value)}
          placeholder="SĐT, địa chỉ..."
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      {!skipTransaction && (
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
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Số tiền *</p>
        <CurrencyAmountInput
          currency="VND"
          value={principal}
          onValueChange={setPrincipal}
          required
          className={type === 'lend' ? 'border-amber-200' : 'border-blue-200'}
        />
      </div>

      <DateTimePicker
        value={dueDate}
        onChange={setDueDate}
        label="Hạn trả"
      />

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Ghi chú</p>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-[12px] border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor={skipTransactionId}
          className="flex cursor-pointer select-none items-start gap-3 rounded-[12px] border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <input
            id={skipTransactionId}
            type="checkbox"
            aria-label="Không tạo giao dịch"
            checked={skipTransaction}
            onChange={(event) => handleSkipTransactionChange(event.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-gray-800">
              Không trừ/cộng tiền vào ví
            </span>
            <span className="mt-0.5 block text-[12px] font-medium text-gray-500">
              Dùng khi khoản này đã xảy ra trước đó
            </span>
          </span>
        </label>
        {skipTransaction && (
          <p className="rounded-[12px] bg-indigo-50 px-4 py-3 text-[12px] font-semibold text-indigo-600">
            Khoản này chỉ được theo dõi, không ảnh hưởng số dư ví
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`h-[52px] w-full rounded-[14px] text-[15px] font-bold text-white transition-all active:scale-[0.98] ${
          type === 'lend'
            ? 'bg-amber-500 shadow-lg shadow-amber-300/40'
            : 'bg-blue-500 shadow-lg shadow-blue-300/40'
        } ${loading ? 'opacity-50' : ''}`}
      >
        {loading ? 'Đang lưu...' : (submitLabel ?? 'Lưu khoản')}
      </button>
    </form>
  );
}

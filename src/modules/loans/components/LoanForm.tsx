import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';
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

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateStringToTimestamp(value?: string | null): number | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).getTime();
}

function timestampToDateString(timestamp: number | null): string | undefined {
  if (timestamp === null) return undefined;

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
  const { t } = useLanguage();
  const { wallets, loading: walletsLoading } = useWallets();
  const skipTransactionId = useId();
  const [type, setType] = useState<LoanType>(initialLoan?.type ?? 'lend');
  const [contactName, setContactName] = useState(initialLoan?.contact_name ?? '');
  const [contactInfo, setContactInfo] = useState(initialLoan?.contact_info ?? '');
  const [walletId, setWalletId] = useState(initialLoan?.wallet_id ?? '');
  const [principal, setPrincipal] = useState(initialLoan ? String(initialLoan.principal) : '');
  const [loanDate, setLoanDate] = useState<number | null>(() =>
    dateStringToTimestamp(initialLoan?.loan_date ?? timestampToDateString(initialLoan?.created_at ?? Date.now()))
      ?? startOfLocalDay(Date.now())
  );
  const [dueDate, setDueDate] = useState(() => dateStringToTimestamp(initialLoan?.due_date));
  const [note, setNote] = useState(initialLoan?.note ?? '');
  const [skipTransaction, setSkipTransaction] = useState(initialLoan?.skip_transaction ?? false);
  const [error, setError] = useState<string | null>(null);
  const TYPE_OPTIONS = useMemo(() => [
    { id: 'lend' as LoanType, label: t('loans.form.typeLabel.lend'), activeClass: 'bg-amber-500 text-white' },
    { id: 'borrow' as LoanType, label: t('loans.form.typeLabel.borrow'), activeClass: 'bg-blue-500 text-white' },
  ], [t]);

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
    } else if (!walletId && wallets[0]) {
      // Select a wallet immediately so saving right after unchecking can
      // create the linked transaction and apply its balance delta.
      setWalletId(wallets[0].id);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!skipTransaction && !walletId) {
      setError(t('loans.form.errorSelectWallet'));
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
        loan_date: timestampToDateString(loanDate),
        due_date: timestampToDateString(dueDate),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loans.form.errorSaveFailed'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-[18px] font-bold text-gray-900">{title ?? t('loans.form.title')}</h3>
        <p className="mt-1 text-[12px] text-gray-500">
          {description ?? t('loans.form.description')}
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
        <p className="text-[13px] font-semibold text-gray-700">{t('loans.form.contactName')} *</p>
        <input
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('loans.form.contactInfo')}</p>
        <input
          value={contactInfo}
          onChange={(event) => setContactInfo(event.target.value)}
          placeholder={t('loans.form.contactInfoPlaceholder')}
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      {!skipTransaction && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('loans.form.wallet')} *</p>
          <DropdownList
            value={walletId}
            onChange={setWalletId}
            ariaLabel={t('loans.form.wallet')}
            placeholder={walletsLoading ? t('loans.form.walletLoading') : t('loans.form.walletPlaceholder')}
            disabled={walletsLoading || walletOptions.length === 0}
            openOnInputBlurPointerDown
            options={[
              { value: '', label: t('loans.form.walletPlaceholder'), disabled: true },
              ...walletOptions,
            ]}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('loans.form.amount')} *</p>
        <CurrencyAmountInput
          currency="VND"
          value={principal}
          onValueChange={setPrincipal}
          required
          className={type === 'lend' ? 'border-amber-200' : 'border-blue-200'}
        />
      </div>

      <DateTimePicker
        value={loanDate}
        onChange={setLoanDate}
        label={type === 'lend' ? t('loans.form.dateLend') : t('loans.form.dateBorrow')}
      />

      <DateTimePicker
        value={dueDate}
        onChange={setDueDate}
        label={t('loans.form.dueDate')}
      />

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('loans.form.note')}</p>
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
            aria-label={t('loans.form.skipTransactionAria')}
            checked={skipTransaction}
            onChange={(event) => handleSkipTransactionChange(event.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-gray-800">
              {t('loans.form.skipTransaction')}
            </span>
            <span className="mt-0.5 block text-[12px] font-medium text-gray-500">
              {t('loans.form.skipTransactionSub')}
            </span>
          </span>
        </label>
        {skipTransaction && (
          <p className="rounded-[12px] bg-indigo-50 px-4 py-3 text-[12px] font-semibold text-indigo-600">
            {t('loans.form.skipTransactionHint')}
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
        {loading ? t('loans.form.saving') : (submitLabel ?? t('loans.form.save'))}
      </button>
    </form>
  );
}

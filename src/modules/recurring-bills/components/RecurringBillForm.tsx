import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreateRecurringBillInput,
  RecurringBill,
  UpdateRecurringBillInput,
} from '../domain/recurring-bill.model';
import { useCategories } from '@/modules/categories/hooks/useCategories';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { filterWalletsWithValue } from '@/modules/wallets/services/wallet-selectors';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import type { CurrencyCode } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';

interface Props {
  existing?: RecurringBill;
  onSave: (data: CreateRecurringBillInput | UpdateRecurringBillInput) => Promise<void>;
  onCancel: () => void;
}

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function parseDueDate(value: string, language: 'en' | 'vi'): number | null {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);

  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    return isValidDateParts(year, month, day)
      ? new Date(year, month - 1, day).getTime()
      : null;
  }

  const parts = trimmed.split(/[\/.-]/).map(part => Number(part));
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) {
    return null;
  }

  const [first, second, year] = parts;
  const day = language === 'vi' ? first : second;
  const month = language === 'vi' ? second : first;

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return new Date(year, month - 1, day).getTime();
}

function formatDueDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function RecurringBillForm({ existing, onSave, onCancel }: Props) {
  const { t, language } = useLanguage();
  const locale = getAppLocale(language);
  const { wallets } = useWallets();
  const { categories } = useCategories();
  const selectableWallets = useMemo(
    () => filterWalletsWithValue(wallets).filter(wallet => wallet.name.trim()),
    [wallets],
  );
  const expenseCategories = useMemo(
    () => categories.filter(category => category.type === 'expense'),
    [categories],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [walletId, setWalletId] = useState(existing?.wallet_id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? '');
  const [dueDateTimestamp, setDueDateTimestamp] = useState(
    startOfLocalDay(existing?.next_due_date ?? Date.now()),
  );
  const [dueDateText, setDueDateText] = useState(() =>
    formatDueDate(startOfLocalDay(existing?.next_due_date ?? Date.now()), locale),
  );
  const [reminderDays, setReminderDays] = useState(String(existing?.reminder_days ?? 3));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previousLocaleRef = useRef(locale);
  const selectedWallet = selectableWallets.find(wallet => wallet.id === walletId);
  const selectedCurrency = (selectedWallet?.currency ?? 'VND') as CurrencyCode;

  useEffect(() => {
    if (previousLocaleRef.current !== locale) {
      setDueDateText(formatDueDate(dueDateTimestamp, locale));
      previousLocaleRef.current = locale;
    }
  }, [dueDateTimestamp, locale]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    const parsedReminderDays = Number(reminderDays);

    if (!name.trim()) {
      setError(t('recurring_bills.validation_name'));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('recurring_bills.validation_amount'));
      return;
    }
    if (!walletId || !selectableWallets.some(wallet => wallet.id === walletId)) {
      setError(t('recurring_bills.validation_wallet'));
      return;
    }
    if (!categoryId) {
      setError(t('recurring_bills.validation_category'));
      return;
    }
    const parsedDueDate = parseDueDate(dueDateText, language);
    if (parsedDueDate === null) {
      setError(t('recurring_bills.validation_due_date'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        wallet_id: walletId,
        category_id: categoryId,
        frequency: 'monthly',
        next_due_date: parsedDueDate,
        reminder_days: Number.isFinite(parsedReminderDays) && parsedReminderDays >= 0
          ? parsedReminderDays
          : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('recurring_bills.save_failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
          {error}
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.name')}</span>
        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={t('recurring_bills.name_placeholder')}
          className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-4 text-[14px] font-medium text-gray-900 outline-none transition-colors focus:border-indigo-400"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.amount')}</span>
        <CurrencyAmountInput
          value={amount}
          onValueChange={setAmount}
          currency={selectedCurrency}
          className="border-gray-200"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.wallet')}</span>
        <DropdownList
          value={walletId}
          onChange={setWalletId}
          ariaLabel={t('recurring_bills.wallet')}
          placeholder={t('recurring_bills.select_wallet')}
          options={selectableWallets.map(wallet => ({
            value: wallet.id,
            label: wallet.name,
          }))}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.category')}</span>
        <DropdownList
          value={categoryId}
          onChange={setCategoryId}
          ariaLabel={t('recurring_bills.category')}
          placeholder={t('recurring_bills.select_category')}
          options={expenseCategories.map(category => ({
            value: category.id,
            label: category.name,
          }))}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.due_date')}</span>
          <input
            type="text"
            inputMode="numeric"
            value={dueDateText}
            onChange={event => {
              const nextText = event.target.value;
              setDueDateText(nextText);
              const parsed = parseDueDate(nextText, language);
              if (parsed !== null) {
                setDueDateTimestamp(parsed);
              }
            }}
            onBlur={() => {
              const parsed = parseDueDate(dueDateText, language);
              if (parsed !== null) {
                setDueDateTimestamp(parsed);
                setDueDateText(formatDueDate(parsed, locale));
              }
            }}
            placeholder={language === 'vi' ? 'dd/mm/yyyy' : 'mm/dd/yyyy'}
            className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3 text-[14px] font-medium text-gray-900 outline-none transition-colors focus:border-indigo-400"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-gray-700">{t('recurring_bills.remind_days')}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={reminderDays}
            onChange={event => setReminderDays(event.target.value)}
            className="h-[48px] w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3 text-[14px] font-medium text-gray-900 outline-none transition-colors focus:border-indigo-400"
          />
        </label>
      </div>

      <p className="text-[12px] text-gray-500">{t('recurring_bills.frequency_info')}</p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-[12px] border border-gray-200 bg-white text-[14px] font-semibold text-gray-600"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-12 flex-1 rounded-[12px] bg-indigo-500 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}

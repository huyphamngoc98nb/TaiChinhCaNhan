import { FormEvent, useMemo, useState } from 'react';
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

interface Props {
  existing?: RecurringBill;
  onSave: (data: CreateRecurringBillInput | UpdateRecurringBillInput) => Promise<void>;
  onCancel: () => void;
}

function toDateInput(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function fromDateInput(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

export function RecurringBillForm({ existing, onSave, onCancel }: Props) {
  const { t } = useLanguage();
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
  const [dueDate, setDueDate] = useState(toDateInput(existing?.next_due_date ?? Date.now()));
  const [reminderDays, setReminderDays] = useState(String(existing?.reminder_days ?? 3));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedWallet = selectableWallets.find(wallet => wallet.id === walletId);
  const selectedCurrency = (selectedWallet?.currency ?? 'VND') as CurrencyCode;

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
    if (!dueDate || Number.isNaN(fromDateInput(dueDate))) {
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
        next_due_date: fromDateInput(dueDate),
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
            type="date"
            value={dueDate}
            onChange={event => setDueDate(event.target.value)}
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

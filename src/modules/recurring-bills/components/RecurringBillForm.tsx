import React, { FormEvent, useEffect, useState } from 'react';
import { CreateRecurringBillInput, RecurringBill, UpdateRecurringBillInput } from '../domain/recurring-bill.model';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  existing?: RecurringBill;
  onSave: (data: CreateRecurringBillInput | UpdateRecurringBillInput) => Promise<void>;
  onCancel: () => void;
}

interface SelectOption {
  id: string;
  name: string;
}

export const RecurringBillForm: React.FC<Props> = ({ existing, onSave, onCancel }) => {
  const { currency } = useCurrency();
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '');
  const [reminderDays, setReminderDays] = useState(existing?.reminder_days?.toString() ?? '3');
  const [nextDueDate, setNextDueDate] = useState(() => {
    const date = existing ? new Date(existing.next_due_date) : new Date();
    return date.toISOString().split('T')[0];
  });
  const [walletId, setWalletId] = useState(existing?.wallet_id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? '');
  const [wallets, setWallets] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const db = await getDbConnection();
      const { values: loadedWallets = [] } = await db.query('SELECT id, name FROM wallets');
      const { values: loadedCategories = [] } = await db.query("SELECT id, name FROM categories WHERE type = 'expense'");

      setWallets(loadedWallets);
      setCategories(loadedCategories);
      if (!existing && loadedWallets.length > 0 && !walletId) setWalletId(loadedWallets[0].id);
      if (!existing && loadedCategories.length > 0 && !categoryId) setCategoryId(loadedCategories[0].id);
    }

    loadOptions();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setError('Tên hóa đơn không được để trống.');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!walletId) {
      setError('Vui lòng chọn ví.');
      return;
    }
    if (!categoryId) {
      setError('Vui lòng chọn danh mục.');
      return;
    }

    const dueDateMs = new Date(nextDueDate).getTime();
    if (Number.isNaN(dueDateMs)) {
      setError('Ngày đến hạn không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        frequency: 'monthly',
        next_due_date: dueDateMs,
        reminder_days: Math.max(0, parseInt(reminderDays, 10) || 3),
        wallet_id: walletId,
        category_id: categoryId,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Tên hóa đơn *</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="VD: Netflix, Tiền điện..."
          required
          className="w-full h-[48px] bg-gray-50 border border-gray-200 rounded-[14px] px-4
            text-[14px] text-gray-900 outline-none focus:border-indigo-400 transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Số tiền</p>
        <CurrencyAmountInput
          currency={currency}
          value={amount}
          onValueChange={setAmount}
          required
          className="border-gray-200"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Ngày đến hạn</p>
        <input
          type="date"
          value={nextDueDate}
          onChange={e => setNextDueDate(e.target.value)}
          required
          className="w-full h-[48px] bg-gray-50 border border-gray-200 rounded-[12px] px-4
            text-[14px] text-gray-800 font-medium focus:outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Nhắc trước (ngày)</p>
        <input
          type="number"
          min="0"
          max="30"
          value={reminderDays}
          onChange={e => setReminderDays(e.target.value)}
          className="w-full h-[48px] bg-gray-50 border border-gray-200 rounded-[12px] px-4
            text-[14px] text-gray-900 outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Ví</p>
        <DropdownList
          value={walletId}
          onChange={setWalletId}
          ariaLabel="Ví"
          placeholder="Chọn ví"
          options={[
            { value: '', label: 'Chọn ví', disabled: true },
            ...wallets.map(wallet => ({ value: wallet.id, label: wallet.name })),
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">Danh mục</p>
        <DropdownList
          value={categoryId}
          onChange={setCategoryId}
          ariaLabel="Danh mục"
          placeholder="Chọn danh mục"
          options={[
            { value: '', label: 'Chọn danh mục', disabled: true },
            ...categories.map(category => ({ value: category.id, label: category.name })),
          ]}
        />
      </div>

      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-[12px] text-[12px] text-gray-500 italic">
        Tần suất mặc định là hàng tháng. Nhắc nhở chỉ hiển thị trong ứng dụng, không tự tạo giao dịch.
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-[54px] rounded-[14px] border border-gray-200 text-gray-600 text-[15px] font-semibold
            transition-all active:scale-[0.98]"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`flex-[2] h-[54px] rounded-[14px] bg-indigo-500 text-white text-[16px] font-bold
            transition-all active:scale-[0.98] ${
            submitting ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
          }`}
        >
          {submitting ? 'Đang lưu...' : existing ? 'Lưu thay đổi' : 'Thêm hóa đơn'}
        </button>
      </div>
    </form>
  );
};

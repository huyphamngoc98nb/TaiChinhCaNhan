import { FormEvent, useState } from 'react';
import { Transaction } from '../domain/transaction.model';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { ReceiptCapture } from './ReceiptCapture';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
}

export function TransactionForm({ existing, onSuccess }: Props) {
  const { formData, setFormData, setReceiptBase64, save, error, submitting, options } =
    useTransactionForm(existing);
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const [amountInput, setAmountInput] = useState(() => (
    formData.amount ? String(formData.amount) : ''
  ));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await save();
    if (ok) onSuccess();
  };

  const transactionTypes: { id: 'expense' | 'income'; label: string; active: string }[] = [
    { id: 'expense', label: t('form.type_expense'), active: 'bg-rose-500 text-white' },
    { id: 'income', label: t('form.type_income'), active: 'bg-emerald-500 text-white' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="flex bg-gray-100 p-1 rounded-[12px] h-[48px]">
        {transactionTypes.map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => setFormData({ ...formData, type: type.id, category_id: '' })}
            className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
              formData.type === type.id ? `${type.active} shadow-sm` : 'text-gray-500'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_amount')}</p>
        <CurrencyAmountInput
          currency={currency}
          value={amountInput}
          onValueChange={value => {
            setAmountInput(value);
            setFormData({ ...formData, amount: Number(value) });
          }}
          required
          className={formData.type === 'expense' ? 'border-rose-200' : 'border-emerald-200'}
        />
      </div>

      {options.wallets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">Ví</p>
          <div className="flex gap-2 flex-wrap">
            {options.wallets.map((wallet: { id: string; name: string }) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => setFormData({ ...formData, wallet_id: wallet.id })}
                className={`px-4 h-[36px] rounded-full text-[13px] font-semibold transition-all border ${
                  formData.wallet_id === wallet.id
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {wallet.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_category')}</p>
        <DropdownList
          value={formData.category_id || ''}
          onChange={value => setFormData({ ...formData, category_id: value })}
          ariaLabel={t('form.label_category')}
          placeholder={t('form.select_category')}
          options={[
            { value: '', label: t('form.select_category'), disabled: true },
            ...options.categories
              .filter((category: { type: string }) => category.type === formData.type)
              .map((category: { id: string; name: string }) => ({
                value: category.id,
                label: category.name,
              })),
          ]}
        />
      </div>

      <DateTimePicker
        value={formData.transaction_date ?? Date.now()}
        onChange={timestamp => setFormData({ ...formData, transaction_date: timestamp })}
      />

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_note')}</p>
        <textarea
          value={formData.note || ''}
          onChange={e => setFormData({ ...formData, note: e.target.value })}
          rows={2}
          placeholder="Ghi chú (tùy chọn)"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[12px]
            text-[14px] text-gray-800 resize-none focus:outline-none focus:border-indigo-400"
        />
      </div>

      <ReceiptCapture
        existingPath={formData.receipt_path}
        onImageSelected={setReceiptBase64}
      />

      <button
        type="submit"
        disabled={submitting}
        className={`w-full h-[54px] rounded-[14px] text-white text-[16px] font-bold
          transition-all active:scale-[0.98] mt-2 ${
            formData.type === 'expense'
              ? 'bg-rose-500 shadow-lg shadow-rose-300/40'
              : 'bg-emerald-500 shadow-lg shadow-emerald-300/40'
          } ${submitting ? 'opacity-50' : ''}`}
      >
        {submitting ? t('form.saving') : t('form.save')}
      </button>
    </form>
  );
}

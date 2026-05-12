import { FormEvent } from 'react';
import { Transaction } from '../domain/transaction.model';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { ReceiptCapture } from './ReceiptCapture';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DateTimePicker } from '@/shared/components/DateTimePicker';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
}

export function TransactionForm({ existing, onSuccess }: Props) {
  const { formData, setFormData, setReceiptBase64, save, error, submitting, options } =
    useTransactionForm(existing);
  const { t } = useLanguage();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await save();
    if (ok) onSuccess();
  };

  // ─ type toggle ──────────────────────────────────────────────────
  const TYPES: { id: 'expense' | 'income'; label: string; active: string }[] = [
    { id: 'expense', label: t('form.type_expense'), active: 'bg-rose-500 text-white' },
    { id: 'income',  label: t('form.type_income'),  active: 'bg-emerald-500 text-white' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Type segmented */}
      <div className="flex bg-gray-100 p-1 rounded-[12px] h-[48px]">
        {TYPES.map(tp => (
          <button
            key={tp.id}
            type="button"
            onClick={() => setFormData({ ...formData, type: tp.id, category_id: '' })}
            className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
              formData.type === tp.id ? tp.active + ' shadow-sm' : 'text-gray-500'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_amount')}</p>
        <div
          className={`flex items-center h-[56px] bg-gray-50 border rounded-[14px] px-4
            transition-colors focus-within:border-indigo-400 ${
              formData.type === 'expense' ? 'border-rose-200' : 'border-emerald-200'
            }`}
        >
          <span className="text-[14px] font-semibold text-gray-400 mr-2">VND</span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={formData.amount || ''}
            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
            placeholder="0"
            className="flex-1 bg-transparent text-[26px] font-bold text-gray-900 outline-none tabular-nums"
          />
        </div>
      </div>

      {/* Wallet */}
      {options.wallets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">Ví</p>
          <div className="flex gap-2 flex-wrap">
            {options.wallets.map((w: { id: string; name: string }) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setFormData({ ...formData, wallet_id: w.id })}
                className={`px-4 h-[36px] rounded-full text-[13px] font-semibold transition-all border ${
                  formData.wallet_id === w.id
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_category')}</p>
        <div className="relative">
          <select
            value={formData.category_id || ''}
            onChange={e => setFormData({ ...formData, category_id: e.target.value })}
            required
            className="w-full h-[48px] px-4 pr-8 bg-gray-50 border border-gray-200 rounded-[12px]
              text-[14px] text-gray-800 font-medium appearance-none
              focus:outline-none focus:border-indigo-400"
          >
            <option value="" disabled>{t('form.select_category')}</option>
            {options.categories
              .filter((c: { type: string }) => c.type === formData.type)
              .map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▼
          </span>
        </div>
      </div>

      {/* Date Time Picker */}
      <DateTimePicker
        value={formData.transaction_date ?? Date.now()}
        onChange={ts => setFormData({ ...formData, transaction_date: ts })}
      />

      {/* Note */}
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

      {/* Receipt */}
      <ReceiptCapture
        existingPath={formData.receipt_path}
        onImageSelected={setReceiptBase64}
      />

      {/* Submit */}
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

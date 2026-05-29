import { FocusEvent, FormEvent, ReactNode, useState } from 'react';
import { Transaction, TransactionType } from '../domain/transaction.model';
import { TRANSFER_CATEGORY_ID, useTransactionForm } from '../hooks/useTransactionForm';
import { ReceiptCapture } from './ReceiptCapture';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
  onDelete?: () => Promise<void>;
  header?: ReactNode;
  pinTypeSelector?: boolean;
}

export function TransactionForm({
  existing,
  onSuccess,
  onDelete,
  header,
  pinTypeSelector = false,
}: Props) {
  const { formData, setFormData, setReceiptBase64, save, submitting, options } =
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

  const handleNoteFocus = (e: FocusEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const scrollNoteIntoView = () => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    scrollNoteIntoView();
    window.setTimeout(scrollNoteIntoView, 180);
    window.setTimeout(scrollNoteIntoView, 360);
  };

  const transactionTypes: { id: TransactionType; label: string; active: string }[] = [
    { id: 'expense', label: t('form.type_expense'), active: 'bg-rose-500 text-white' },
    { id: 'income', label: t('form.type_income'), active: 'bg-emerald-500 text-white' },
    { id: 'transfer', label: t('transactions.transfer'), active: 'bg-indigo-500 text-white' },
  ];

  const handleTypeChange = (type: TransactionType) => {
    setFormData({
      ...formData,
      type,
      category_id: type === 'transfer' ? TRANSFER_CATEGORY_ID : '',
      to_wallet_id: type === 'transfer' ? formData.to_wallet_id : undefined,
    });
  };

  const selectableDestinationWallets = options.wallets.filter(
    (wallet: { id: string }) => wallet.id !== formData.wallet_id,
  );
  const selectedDestinationWallet = options.wallets.find(
    (wallet: { id: string }) => wallet.id === formData.to_wallet_id,
  );
  const isCreditCardPayment =
    formData.type === 'transfer' && selectedDestinationWallet?.account_type === 'credit_card';

  const amountAccentClass =
    formData.type === 'expense'
      ? 'border-rose-200'
      : formData.type === 'income'
        ? 'border-emerald-200'
        : 'border-indigo-200';

  const submitClass =
    formData.type === 'expense'
      ? 'bg-rose-500 shadow-lg shadow-rose-300/40'
      : formData.type === 'income'
        ? 'bg-emerald-500 shadow-lg shadow-emerald-300/40'
        : 'bg-indigo-500 shadow-lg shadow-indigo-300/40';

  const fields = (
    <>
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
          className={amountAccentClass}
        />
      </div>

      {options.wallets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">
            {isCreditCardPayment ? t('transactions.payment_from_wallet') : t('transactions.wallet')}
          </p>
          <DropdownList
            value={formData.wallet_id || ''}
            onChange={value => {
              const nextData = { ...formData, wallet_id: value };
              if (nextData.to_wallet_id === value) {
                nextData.to_wallet_id = '';
              }
              setFormData(nextData);
            }}
            ariaLabel={t('transactions.wallet')}
            placeholder={t('transactions.select_wallet')}
            options={[
              { value: '', label: t('transactions.select_wallet'), disabled: true },
              ...options.wallets.map((wallet: { id: string; name: string }) => ({
                value: wallet.id,
                label: wallet.name,
              })),
            ]}
          />
        </div>
      )}

      {formData.type === 'transfer' && options.wallets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">
            {isCreditCardPayment
              ? t('transactions.payment_to_card')
              : t('transactions.destination_wallet')}
          </p>
          <DropdownList
            value={formData.to_wallet_id || ''}
            onChange={value => setFormData({ ...formData, to_wallet_id: value, category_id: TRANSFER_CATEGORY_ID })}
            ariaLabel={t('transactions.destination_wallet')}
            placeholder={t('transactions.select_destination_wallet')}
            options={[
              { value: '', label: t('transactions.select_destination_wallet'), disabled: true },
              ...selectableDestinationWallets.map((wallet: { id: string; name: string; account_type?: string }) => ({
                value: wallet.id,
                label: wallet.account_type === 'credit_card'
                  ? `${wallet.name} (${t('transactions.credit_card_payment')})`
                  : wallet.name,
              })),
            ]}
          />
        </div>
      )}

      {formData.type !== 'transfer' && (
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
                .filter((category: { id: string; type: string }) => (
                  category.id !== TRANSFER_CATEGORY_ID && category.type === formData.type
                ))
                .map((category: { id: string; name: string }) => ({
                  value: category.id,
                  label: category.name,
                })),
            ]}
          />
        </div>
      )}

      <DateTimePicker
        value={formData.transaction_date ?? Date.now()}
        onChange={timestamp => setFormData({ ...formData, transaction_date: timestamp })}
      />

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_note')}</p>
        <input
          type="text"
          value={formData.note || ''}
          onChange={e => setFormData({ ...formData, note: e.target.value })}
          onFocus={handleNoteFocus}
          placeholder={t('form.note_placeholder')}
          enterKeyHint="done"
          className="w-full h-[46px] px-4 bg-gray-50 border border-gray-200 rounded-[12px]
            text-[14px] text-gray-800 focus:outline-none focus:border-indigo-400"
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
            submitClass
          } ${submitting ? 'opacity-50' : ''}`}
      >
        {submitting ? t('form.saving') : t('form.save')}
      </button>

      {existing && onDelete && (
        <button
          type="button"
          disabled={submitting}
          onClick={onDelete}
          className="w-full h-[48px] rounded-[14px] border border-red-200 text-red-500 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {t('transactions.delete_confirm_btn')}
        </button>
      )}
    </>
  );

  const typeSelector = (
    <div className="flex h-[48px] rounded-[12px] bg-gray-100 p-1">
      {transactionTypes.map(type => (
        <button
          key={type.id}
          type="button"
          onClick={() => handleTypeChange(type.id)}
          className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
            formData.type === type.id ? `${type.active} shadow-sm` : 'text-gray-500'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );

  if (header || pinTypeSelector) {
    return (
      <form onSubmit={handleSubmit} className="transaction-form-page">
        <div className="transaction-form-sticky-shell">
          {header && (
            <div className="transaction-form-header">
              {header}
            </div>
          )}

          <div className="transaction-form-type-switcher">
            {typeSelector}
          </div>
        </div>

        <div className="transaction-form-content space-y-5">
          {fields}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="shrink-0">
        {typeSelector}
      </div>

      {fields}
    </form>
  );
}

import { FocusEvent, FormEvent, PointerEvent, ReactNode, useEffect, useState } from 'react';
import { Transaction, TransactionType } from '../domain/transaction.model';
import { TRANSFER_CATEGORY_ID, useTransactionForm } from '../hooks/useTransactionForm';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { FormTransition } from '@/shared/components/FormTransition';
import { ImeTextInput } from '@/shared/components/ImeTextInput';
import { getTransactionInputSettings } from '@/modules/settings/services/transaction-input-settings.service';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import {
  DuplicateTransactionCheckInput,
  findDuplicateTransaction,
} from '../services/duplicate-transaction.service';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
  onDelete?: () => Promise<void>;
  header?: ReactNode;
  pinTypeSelector?: boolean;
}

const HIDDEN_MANUAL_TRANSACTION_CATEGORY_KEYS = new Set([
  'cho_vay',
  'vay_no',
  'thu_no',
  'tra_no',
]);

interface TransactionFormCategoryOption {
  id: string;
  name: string;
  type: string;
  slug?: string | null;
}

function normalizeCategoryFilterKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isHiddenManualTransactionCategory(category: TransactionFormCategoryOption): boolean {
  const keys = [category.slug, category.name]
    .filter((value): value is string => Boolean(value))
    .map(normalizeCategoryFilterKey);

  return keys.some((key) => HIDDEN_MANUAL_TRANSACTION_CATEGORY_KEYS.has(key));
}

function blurActiveEditableElement() {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;

  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || activeElement.isContentEditable) {
    activeElement.blur();
  }
}

function isDuplicateCheckTransactionType(value: unknown): value is DuplicateTransactionCheckInput['type'] {
  return value === 'income' || value === 'expense' || value === 'transfer';
}

export function TransactionForm({
  existing,
  onSuccess,
  onDelete,
  header,
  pinTypeSelector = false,
}: Props) {
  const { formData, setFormData, save, submitting, options } =
    useTransactionForm(existing);
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { confirm } = useConfirm();
  const [transactionInputSettings] = useState(() => getTransactionInputSettings());
  const [amountInput, setAmountInput] = useState(() => (
    formData.amount ? String(formData.amount) : ''
  ));
  const [dateTimeError, setDateTimeError] = useState<string | null>(null);
  const [excludeFromTotal, setExcludeFromTotal] = useState<boolean>(
    existing?.exclude_from_total ?? false
  );

  useEffect(() => {
    setFormData(current => (
      current.exclude_from_total === excludeFromTotal
        ? current
        : { ...current, exclude_from_total: excludeFromTotal }
    ));
  }, [excludeFromTotal, setFormData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.transaction_date) {
      setDateTimeError(t('date_time.error_required'));
      return;
    }

    if (!existing && transactionInputSettings.duplicateWarningEnabled) {
      const duplicateCheckInput = getDuplicateCheckInput();

      if (duplicateCheckInput) {
        try {
          const duplicate = await findDuplicateTransaction(duplicateCheckInput);

          if (duplicate) {
            const shouldContinue = await confirm({
              title: t('transactions.duplicate_warning_title'),
              message: t('transactions.duplicate_warning_message'),
              cancelText: t('transactions.duplicate_warning_cancel'),
              confirmText: t('transactions.duplicate_warning_continue'),
            });

            if (!shouldContinue) {
              return;
            }
          }
        } catch (error) {
          console.error('Failed to check duplicate transaction', error);
        }
      }
    }

    const ok = await save();
    if (ok) {
      if (!existing) {
        setAmountInput('');
      }
      onSuccess();
    }
  };

  const getDuplicateCheckInput = (): DuplicateTransactionCheckInput | null => {
    const type = formData.type;
    const amount = Number(formData.amount);
    const walletId = formData.wallet_id;
    const categoryId = type === 'transfer' ? TRANSFER_CATEGORY_ID : formData.category_id;
    const transactionDate = formData.transaction_date;

    if (!isDuplicateCheckTransactionType(type)) return null;
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (!walletId) return null;
    if (!categoryId) return null;
    if (typeof transactionDate !== 'number' || !Number.isFinite(transactionDate)) return null;

    return {
      type,
      amount,
      walletId,
      categoryId,
      transactionDate,
    };
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
      is_budget_offset: type === 'income' ? formData.is_budget_offset ?? false : false,
      offset_budget_id: type === 'income' ? formData.offset_budget_id ?? null : null,
    });
  };

  const handleTypePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    type: TransactionType,
  ) => {
    if (event.pointerType === 'mouse') return;

    blurActiveEditableElement();
    handleTypeChange(type);
  };

  const selectableDestinationWallets = options.wallets.filter(
    (wallet: { id: string }) => wallet.id !== formData.wallet_id,
  );
  const selectedDestinationWallet = options.wallets.find(
    (wallet: { id: string }) => wallet.id === formData.to_wallet_id,
  );
  const isCreditCardPayment =
    formData.type === 'transfer' && selectedDestinationWallet?.account_type === 'credit_card';
  const hasSelectedOffsetBudget = Boolean(
    formData.offset_budget_id &&
    options.budgets.some((budget: { id: string }) => budget.id === formData.offset_budget_id),
  );

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
          enableMoneyKeyboard={transactionInputSettings.enableMoneyKeyboard}
          autoFocus={transactionInputSettings.autoFocusAmount && !existing}
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
            openOnInputBlurPointerDown
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
            openOnInputBlurPointerDown
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
            openOnInputBlurPointerDown
            options={[
              { value: '', label: t('form.select_category'), disabled: true },
              ...options.categories
                .filter((category: TransactionFormCategoryOption) => (
                  category.id !== TRANSFER_CATEGORY_ID
                    && category.type === formData.type
                    && !isHiddenManualTransactionCategory(category)
                ))
                .map((category: TransactionFormCategoryOption) => ({
                  value: category.id,
                  label: category.name,
                })),
            ]}
          />
        </div>
      )}

      <DateTimePicker
        value={formData.transaction_date ?? null}
        onChange={timestamp => {
          setFormData({ ...formData, transaction_date: timestamp });
          setDateTimeError(timestamp ? null : t('date_time.error_required'));
        }}
        required
        error={dateTimeError}
      />

      {formData.type === 'income' && (
        <div className="space-y-2 rounded-[12px] border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-400/30 dark:bg-emerald-400/10">
          <label className="flex items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-text">
            <input
              type="checkbox"
              checked={formData.is_budget_offset ?? false}
              onChange={(e) => {
                const checked = e.target.checked;
                setFormData({
                  ...formData,
                  is_budget_offset: checked,
                  offset_budget_id: checked ? formData.offset_budget_id ?? null : null,
                });
              }}
              className="h-4 w-4 cursor-pointer"
            />
            {t('transactions.budget_offset')}
          </label>

          {formData.is_budget_offset && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-muted">
                {t('transactions.offset_budget')}
              </p>
              <DropdownList
                value={formData.offset_budget_id || ''}
                onChange={value => setFormData({ ...formData, offset_budget_id: value })}
                ariaLabel={t('transactions.offset_budget')}
                placeholder={t('transactions.select_offset_budget')}
                openOnInputBlurPointerDown
                options={[
                  { value: '', label: t('transactions.select_offset_budget'), disabled: true },
                  ...(!hasSelectedOffsetBudget && formData.offset_budget_id
                    ? [{ value: formData.offset_budget_id, label: t('transactions.deleted_budget') }]
                    : []),
                  ...options.budgets.map((budget: {
                    id: string;
                    category_name: string;
                    period: string;
                  }) => ({
                    value: budget.id,
                    label: `${budget.category_name} (${budget.period === 'weekly' ? t('budgets.weekly') : t('budgets.monthly')})`,
                  })),
                ]}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-gray-700">{t('form.label_note')}</p>
        <ImeTextInput
          type="text"
          value={formData.note || ''}
          onValueChange={value => setFormData({ ...formData, note: value })}
          onFocus={handleNoteFocus}
          placeholder={t('form.note_placeholder')}
          enterKeyHint="done"
          className="w-full h-[46px] px-4 bg-gray-50 border border-gray-200 rounded-[12px]
            text-[14px] text-gray-800 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {formData.type !== 'transfer' && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            color: 'var(--text)',
            padding: '8px 0',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={excludeFromTotal}
            onChange={(e) => {
              const checked = e.target.checked;
              setExcludeFromTotal(checked);
              setFormData({ ...formData, exclude_from_total: checked });
            }}
            style={{
              width: '16px',
              height: '16px',
              borderColor: 'var(--border)',
              cursor: 'pointer',
            }}
          />
          {t('transactions.exclude_from_income_expense_total')}
        </label>
      )}

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
          onPointerDown={event => handleTypePointerDown(event, type.id)}
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

        <FormTransition
          className="transaction-form-content space-y-5"
          transitionKey={existing?.id ?? 'new-transaction'}
        >
          {fields}
        </FormTransition>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormTransition className="space-y-5" transitionKey={existing?.id ?? 'inline-transaction'}>
        <div className="shrink-0">
          {typeSelector}
        </div>

        {fields}
      </FormTransition>
    </form>
  );
}

import {
  FocusEvent,
  FormEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import './TransactionForm.css';

interface Props {
  existing?: Transaction;
  onSuccess: () => void;
  onDelete?: () => Promise<void>;
  header?: ReactNode;
  pinTypeSelector?: boolean;
  deleting?: boolean;
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
  deleting = false,
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
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const submitGuardRef = useRef(false);
  const noteScrollTimeoutsRef = useRef<number[]>([]);

  useEffect(() => () => {
    noteScrollTimeoutsRef.current.forEach(window.clearTimeout);
  }, []);

  const getDuplicateCheckInput = (): DuplicateTransactionCheckInput | null => {
    const type = formData.type;
    const amount = Number(formData.amount);
    const walletId = formData.wallet_id;
    const categoryId = type === 'transfer' ? TRANSFER_CATEGORY_ID : formData.category_id;
    const transactionDate = formData.transaction_date;

    if (!isDuplicateCheckTransactionType(type)) return null;
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (!walletId || !categoryId) return null;
    if (typeof transactionDate !== 'number' || !Number.isFinite(transactionDate)) return null;

    return {
      type,
      amount,
      walletId,
      categoryId,
      transactionDate,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    blurActiveEditableElement();

    if (submitGuardRef.current || submitting || deleting) return;

    if (!formData.transaction_date) {
      setDateTimeError(t('date_time.error_required'));
      return;
    }

    submitGuardRef.current = true;
    setCheckingDuplicate(true);

    try {
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

              if (!shouldContinue) return;
            }
          } catch (error) {
            console.error('Failed to check duplicate transaction', error);
          }
        }
      }

      const ok = await save();
      if (ok) {
        if (!existing) setAmountInput('');
        onSuccess();
      }
    } finally {
      submitGuardRef.current = false;
      setCheckingDuplicate(false);
    }
  };

  const handleNoteFocus = (event: FocusEvent<HTMLInputElement>) => {
    noteScrollTimeoutsRef.current.forEach(window.clearTimeout);
    const target = event.currentTarget;
    const scrollNoteIntoView = () => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    scrollNoteIntoView();
    noteScrollTimeoutsRef.current = [
      window.setTimeout(scrollNoteIntoView, 180),
      window.setTimeout(scrollNoteIntoView, 360),
    ];
  };

  const transactionTypes: { id: TransactionType; label: string }[] = [
    { id: 'expense', label: t('form.type_expense') },
    { id: 'income', label: t('form.type_income') },
    { id: 'transfer', label: t('transactions.transfer') },
  ];

  const handleTypeChange = (type: TransactionType) => {
    if (formData.type === type) return;

    setFormData({
      ...formData,
      type,
      category_id: type === 'transfer' ? TRANSFER_CATEGORY_ID : '',
      to_wallet_id: type === 'transfer' ? formData.to_wallet_id : undefined,
      is_budget_offset: type === 'income' ? formData.is_budget_offset ?? false : false,
      offset_budget_id: type === 'income' ? formData.offset_budget_id ?? null : null,
    });
  };

  const handleTypePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') blurActiveEditableElement();
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
  const isBusy = submitting || checkingDuplicate || deleting;

  const typeSelector = (
    <div
      className="transaction-form__type-switcher"
      role="group"
      aria-label={t('transactions.type')}
    >
      {transactionTypes.map(type => (
        <button
          key={type.id}
          type="button"
          data-transaction-type={type.id}
          aria-pressed={formData.type === type.id}
          onPointerDown={handleTypePointerDown}
          onClick={() => handleTypeChange(type.id)}
          className="transaction-form__type-option"
        >
          {type.label}
        </button>
      ))}
    </div>
  );

  const fields = (
    <>
      <section className="transaction-form__section" aria-labelledby="transaction-primary-heading">
        <div className="transaction-form__section-heading">
          <h2 id="transaction-primary-heading">{t('transactions.form_primary_details')}</h2>
          <p>{t('transactions.form_primary_details_hint')}</p>
        </div>

        <label className="transaction-form__field transaction-form__field--amount">
          <span className="transaction-form__label">
            {t('form.label_amount')}
          </span>
          <CurrencyAmountInput
            currency={currency}
            value={amountInput}
            onValueChange={value => {
              setAmountInput(value);
              setFormData({ ...formData, amount: Number(value) });
            }}
            required
            className="transaction-form__amount-input"
            enableMoneyKeyboard={transactionInputSettings.enableMoneyKeyboard}
            autoFocus={transactionInputSettings.autoFocusAmount && !existing}
          />
        </label>

        {options.wallets.length > 0 && (
          <div className="transaction-form__field">
            <p className="transaction-form__label">
              {isCreditCardPayment ? t('transactions.payment_from_wallet') : t('transactions.wallet')}
            </p>
            <DropdownList
              value={formData.wallet_id || ''}
              onChange={value => {
                const nextData = { ...formData, wallet_id: value };
                if (nextData.to_wallet_id === value) nextData.to_wallet_id = '';
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
          <div className="transaction-form__field">
            <p className="transaction-form__label">
              {isCreditCardPayment
                ? t('transactions.payment_to_card')
                : t('transactions.destination_wallet')}
            </p>
            <DropdownList
              value={formData.to_wallet_id || ''}
              onChange={value => setFormData({
                ...formData,
                to_wallet_id: value,
                category_id: TRANSFER_CATEGORY_ID,
              })}
              ariaLabel={t('transactions.destination_wallet')}
              placeholder={t('transactions.select_destination_wallet')}
              openOnInputBlurPointerDown
              options={[
                { value: '', label: t('transactions.select_destination_wallet'), disabled: true },
                ...selectableDestinationWallets.map((wallet: {
                  id: string;
                  name: string;
                  account_type?: string;
                }) => ({
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
          <div className="transaction-form__field">
            <p className="transaction-form__label">{t('form.label_category')}</p>
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
      </section>

      <section className="transaction-form__section" aria-labelledby="transaction-additional-heading">
        <div className="transaction-form__section-heading">
          <h2 id="transaction-additional-heading">{t('transactions.form_additional_details')}</h2>
        </div>

        <div className="transaction-form__field">
          <DateTimePicker
            label={t('form.label_date')}
            value={formData.transaction_date ?? null}
            onChange={timestamp => {
              setFormData({ ...formData, transaction_date: timestamp });
              setDateTimeError(timestamp ? null : t('date_time.error_required'));
            }}
            required
            error={dateTimeError}
          />
        </div>

        <div className="transaction-form__field">
          <label className="transaction-form__label" htmlFor="transaction-note">
            {t('form.label_note')}
          </label>
          <ImeTextInput
            id="transaction-note"
            type="text"
            value={formData.note || ''}
            onValueChange={value => setFormData({ ...formData, note: value })}
            onFocus={handleNoteFocus}
            placeholder={t('form.note_placeholder')}
            enterKeyHint="done"
            className="transaction-form__text-input"
          />
        </div>
      </section>

      {formData.type !== 'transfer' && (
        <section className="transaction-form__section" aria-labelledby="transaction-report-heading">
          <div className="transaction-form__section-heading">
            <h2 id="transaction-report-heading">{t('transactions.report_options')}</h2>
          </div>

          {formData.type === 'income' && (
            <div className="transaction-form__setting">
              <label className="transaction-form__check-row">
                <input
                  type="checkbox"
                  checked={formData.is_budget_offset ?? false}
                  onChange={event => {
                    const checked = event.target.checked;
                    setFormData({
                      ...formData,
                      is_budget_offset: checked,
                      offset_budget_id: checked ? formData.offset_budget_id ?? null : null,
                    });
                  }}
                />
                <span>
                  <strong>{t('transactions.budget_offset')}</strong>
                  <small>{t('transactions.budget_offset_hint')}</small>
                </span>
              </label>

              {formData.is_budget_offset && (
                <div className="transaction-form__nested-field">
                  <p className="transaction-form__label">{t('transactions.offset_budget')}</p>
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
                        label: `${budget.category_name} (${budget.period === 'weekly'
                          ? t('budgets.weekly')
                          : t('budgets.monthly')})`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          <div className="transaction-form__setting">
            <label className="transaction-form__check-row">
              <input
                type="checkbox"
                checked={Boolean(formData.exclude_from_total)}
                onChange={event => setFormData({
                  ...formData,
                  exclude_from_total: event.target.checked,
                })}
              />
              <span>
                <strong>{t('transactions.exclude_from_income_expense_total')}</strong>
                <small>{t('transactions.exclude_from_total_hint')}</small>
              </span>
            </label>
          </div>
        </section>
      )}

      <div className="transaction-form__actions">
        <button
          type="submit"
          disabled={isBusy}
          aria-busy={isBusy}
          className="transaction-form__save"
        >
          {isBusy && !deleting ? t('form.saving') : t('form.save')}
        </button>

        {existing && onDelete && (
          <section className="transaction-form__danger-zone" aria-labelledby="transaction-danger-heading">
            <div>
              <h2 id="transaction-danger-heading">{t('transactions.delete_section_title')}</h2>
              <p>{t('transactions.delete_section_hint')}</p>
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onDelete()}
              className="transaction-form__delete"
            >
              {t('transactions.delete_confirm_btn')}
            </button>
          </section>
        )}
      </div>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`transaction-form-page${header || pinTypeSelector ? ' transaction-form-page--screen' : ''}`}
      aria-busy={isBusy}
    >
      {(header || pinTypeSelector) && (
        <div className="transaction-form-sticky-shell">
          {header && <div className="transaction-form-header">{header}</div>}
          <div className="transaction-form-type-switcher">{typeSelector}</div>
        </div>
      )}

      <FormTransition
        className="transaction-form-content"
        transitionKey={existing?.id ?? (header || pinTypeSelector
          ? 'new-transaction'
          : 'inline-transaction')}
      >
        {!header && !pinTypeSelector && typeSelector}
        {fields}
      </FormTransition>
    </form>
  );
}

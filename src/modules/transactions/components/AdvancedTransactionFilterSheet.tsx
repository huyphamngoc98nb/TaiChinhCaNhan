import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ImeTextInput } from '@/shared/components/ImeTextInput';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/sqlite-wallet.repository';
import type { TransactionFilter, TransactionType } from '../domain/transaction.model';

interface Props {
  id: string;
  isOpen: boolean;
  filter: TransactionFilter;
  wallets: Wallet[];
  categories: Category[];
  onApply: (filter: TransactionFilter) => void;
  onResetDraft: () => TransactionFilter;
  onClose: () => void;
}

export function toDateInputValue(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function endOfLocalDay(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

export function AdvancedTransactionFilterSheet({
  id,
  isOpen,
  filter,
  wallets,
  categories,
  onApply,
  onResetDraft,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [draftFilter, setDraftFilter] = useState<TransactionFilter>(() => ({ ...filter }));
  const isApplyingRef = useRef(false);
  const titleId = `${id}-title`;
  const resetHintId = `${id}-reset-hint`;

  useEffect(() => {
    if (isOpen) {
      setDraftFilter({ ...filter });
      isApplyingRef.current = false;
    }
  }, [filter, isOpen]);

  const visibleCategories = draftFilter.type === 'expense' || draftFilter.type === 'income'
    ? categories.filter((category) => category.type === draftFilter.type)
    : categories;

  const updateDraft = (updates: Partial<TransactionFilter>) => {
    setDraftFilter((current) => ({ ...current, ...updates }));
  };

  const handleTypeChange = (value: string) => {
    const nextType = (value || undefined) as TransactionType | undefined;

    setDraftFilter((current) => {
      const categoryStillValid = categories.some((category) =>
        category.id === current.category_id && (!nextType || category.type === nextType),
      );

      return {
        ...current,
        type: nextType,
        category_id: categoryStillValid ? current.category_id : undefined,
      };
    });
  };

  const handleApply = () => {
    if (isApplyingRef.current) return;

    isApplyingRef.current = true;
    onApply({ ...draftFilter });
    onClose();
  };

  const handleResetDraft = () => {
    setDraftFilter({ ...onResetDraft() });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      transitionKey="advanced-transaction-filter"
      logContext="AdvancedTransactionFilterSheet"
    >
      <div
        id={id}
        className="transaction-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="transaction-filter-sheet__header">
          <h2 id={titleId} className="transaction-filter-sheet__title">
            {t('transactions.advanced_filter')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="transaction-filter-sheet__close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div
          className="transaction-filter-sheet__body"
          data-modal-scroll-container="true"
        >
          <label className="transaction-filter-sheet__field">
            <span className="transaction-filter-sheet__label">
              {t('transactions.search_note')}
            </span>
            <span className="transaction-filter-sheet__input-shell">
              <span className="transaction-filter-sheet__input-icon">
                <Search size={18} aria-hidden="true" />
              </span>
              <ImeTextInput
                type="text"
                value={draftFilter.note ?? ''}
                onValueChange={(value) => updateDraft({ note: value || undefined })}
                placeholder={t('transactions.search_note_placeholder')}
                className="transaction-filter-sheet__input"
                enterKeyHint="done"
              />
            </span>
          </label>

          <fieldset className="transaction-filter-sheet__field">
            <legend className="transaction-filter-sheet__label">
              {t('transactions.date_range')}
            </legend>
            <div className="transaction-filter-sheet__dates">
              <label className="transaction-filter-sheet__field">
                <span className="transaction-filter-sheet__label">
                  {t('transactions.filter_from_date')}
                </span>
                <input
                  type="date"
                  value={toDateInputValue(draftFilter.startDate)}
                  onChange={(event) => updateDraft({
                    startDate: startOfLocalDay(event.target.value),
                  })}
                  className="transaction-filter-sheet__date"
                />
              </label>

              <label className="transaction-filter-sheet__field">
                <span className="transaction-filter-sheet__label">
                  {t('transactions.filter_to_date')}
                </span>
                <input
                  type="date"
                  value={toDateInputValue(draftFilter.endDate)}
                  onChange={(event) => updateDraft({
                    endDate: endOfLocalDay(event.target.value),
                  })}
                  className="transaction-filter-sheet__date"
                />
              </label>
            </div>
          </fieldset>

          <div className="transaction-filter-sheet__field">
            <span className="transaction-filter-sheet__label">
              {t('transactions.wallet')}
            </span>
            <DropdownList
              value={draftFilter.wallet_id || ''}
              onChange={(value) => updateDraft({ wallet_id: value || undefined })}
              ariaLabel={t('transactions.wallet')}
              buttonClassName="transaction-filter-sheet__control"
              options={[
                { value: '', label: t('transactions.all_wallets') },
                ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
              ]}
            />
          </div>

          <div className="transaction-filter-sheet__field">
            <span className="transaction-filter-sheet__label">
              {t('transactions.type')}
            </span>
            <DropdownList
              value={draftFilter.type || ''}
              onChange={handleTypeChange}
              ariaLabel={t('transactions.type')}
              buttonClassName="transaction-filter-sheet__control"
              options={[
                { value: '', label: t('transactions.all_types') },
                { value: 'expense', label: t('transactions.filter_expenses') },
                { value: 'income', label: t('transactions.filter_income') },
              ]}
            />
          </div>

          <div className="transaction-filter-sheet__field">
            <span className="transaction-filter-sheet__label">
              {t('transactions.category')}
            </span>
            <DropdownList
              value={draftFilter.category_id || ''}
              onChange={(value) => updateDraft({ category_id: value || undefined })}
              ariaLabel={t('transactions.category')}
              buttonClassName="transaction-filter-sheet__control"
              options={[
                { value: '', label: t('transactions.all_categories') },
                ...visibleCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          </div>
        </div>

        <footer className="transaction-filter-sheet__footer">
          <button
            type="button"
            onClick={handleApply}
            className="transaction-filter-sheet__apply"
          >
            {t('transactions.filter_apply')}
          </button>

          <button
            type="button"
            onClick={handleResetDraft}
            className="transaction-filter-sheet__reset"
            aria-describedby={resetHintId}
          >
            {t('transactions.reset_filters')}
          </button>
          <span id={resetHintId} className="sr-only">
            {t('transactions.filter_reset_hint')}
          </span>
        </footer>
      </div>
    </BottomSheet>
  );
}

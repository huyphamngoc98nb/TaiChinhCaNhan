import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { Calendar, Search, X } from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';
import { ImeTextInput } from '@/shared/components/ImeTextInput';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/sqlite-wallet.repository';
import type { TransactionFilter, TransactionType } from '../domain/transaction.model';

interface Props {
  isOpen: boolean;
  filter: TransactionFilter;
  wallets: Wallet[];
  categories: Category[];
  onChange: (filter: TransactionFilter) => void;
  onReset: () => void;
  onClose: () => void;
}

function toDateInputValue(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateDisplayValue(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function startOfLocalDay(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

function endOfLocalDay(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

const inputStyle: CSSProperties = {
  minHeight: '44px',
  width: '100%',
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
};

const dateInputShellStyle: CSSProperties = {
  position: 'relative',
};

const hiddenDateInputStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '1px',
  height: '1px',
  opacity: 0,
  pointerEvents: 'none',
};

const dateIconStyle: CSSProperties = {
  position: 'absolute',
  left: '11px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const dateDisplayInputStyle: CSSProperties = {
  ...inputStyle,
  padding: '0 10px 0 34px',
  cursor: 'pointer',
};

interface DateDisplayInputProps {
  value?: number;
  onChange: (timestamp?: number) => void;
  endOfDay?: boolean;
}

function DateDisplayInput({ value, onChange, endOfDay = false }: DateDisplayInputProps) {
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = nativeInputRef.current;
    if (!input) return;

    if (input.showPicker) {
      input.showPicker();
    } else {
      input.click();
    }
    input.focus();
  };

  const handleNativeDateChange = (nextValue: string) => {
    onChange(endOfDay ? endOfLocalDay(nextValue) : startOfLocalDay(nextValue));
  };

  return (
    <div style={dateInputShellStyle}>
      <span style={dateIconStyle}>
        <Calendar size={15} />
      </span>
      <input
        ref={nativeInputRef}
        type="date"
        value={toDateInputValue(value)}
        onChange={event => handleNativeDateChange(event.target.value)}
        style={hiddenDateInputStyle}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        type="text"
        value={toDateDisplayValue(value)}
        readOnly
        placeholder="dd/mm/yyyy"
        onClick={openDatePicker}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDatePicker();
          }
        }}
        style={dateDisplayInputStyle}
      />
    </div>
  );
}

export function AdvancedTransactionFilterSheet({
  isOpen,
  filter,
  wallets,
  categories,
  onChange,
  onReset,
  onClose,
}: Props) {
  const { t } = useLanguage();

  const visibleCategories = filter.type === 'expense' || filter.type === 'income'
    ? categories.filter(category => category.type === filter.type)
    : categories;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} transitionKey={filter.type ?? 'all-transactions'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            {t('transactions.advanced_filter')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: 'var(--bg)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <label style={labelStyle}>
          {t('transactions.search_note')}
          <div style={{ position: 'relative' }}>
            <span style={dateIconStyle}>
              <Search size={15} />
            </span>
            <ImeTextInput
              type="text"
              value={filter.note ?? ''}
              onValueChange={value => onChange({ ...filter, note: value || undefined })}
              placeholder={t('transactions.search_note_placeholder')}
              style={{ ...inputStyle, paddingLeft: '34px' }}
            />
          </div>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label style={labelStyle}>
            {t('transactions.filter_from_date')}
            <DateDisplayInput
              value={filter.startDate}
              onChange={timestamp => onChange({ ...filter, startDate: timestamp })}
            />
          </label>

          <label style={labelStyle}>
            {t('transactions.filter_to_date')}
            <DateDisplayInput
              value={filter.endDate}
              endOfDay
              onChange={timestamp => onChange({ ...filter, endDate: timestamp })}
            />
          </label>
        </div>

        <DropdownList
          value={filter.wallet_id || ''}
          onChange={value => onChange({ ...filter, wallet_id: value || undefined })}
          ariaLabel={t('transactions.wallet')}
          buttonClassName="bg-white min-h-[44px]"
          options={[
            { value: '', label: t('transactions.all_wallets') },
            ...wallets.map(wallet => ({ value: wallet.id, label: wallet.name })),
          ]}
        />

        <DropdownList
          value={filter.type || ''}
          onChange={value => {
            const nextType = (value || undefined) as TransactionType | undefined;
            const categoryStillValid = categories.some(category =>
              category.id === filter.category_id && (!nextType || category.type === nextType),
            );

            onChange({
              ...filter,
              type: nextType,
              category_id: categoryStillValid ? filter.category_id : undefined,
            });
          }}
          ariaLabel={t('transactions.all_types')}
          buttonClassName="bg-white min-h-[44px]"
          options={[
            { value: '', label: t('transactions.all_types') },
            { value: 'expense', label: t('transactions.filter_expenses') },
            { value: 'income', label: t('transactions.filter_income') },
          ]}
        />

        <DropdownList
          value={filter.category_id || ''}
          onChange={value => onChange({ ...filter, category_id: value || undefined })}
          ariaLabel={t('transactions.category')}
          buttonClassName="bg-white min-h-[44px]"
          options={[
            { value: '', label: t('transactions.all_categories') },
            ...visibleCategories.map(category => ({ value: category.id, label: category.name })),
          ]}
        />

        <button
          type="button"
          onClick={onClose}
          style={{
            minHeight: '46px',
            borderRadius: '12px',
            background: 'var(--primary)',
            color: 'white',
            fontWeight: 700,
            border: 'none',
          }}
        >
          {t('common.apply')}
        </button>

        <button
          type="button"
          onClick={onReset}
          style={{
            minHeight: '44px',
            borderRadius: '12px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontWeight: 700,
            border: '1px solid var(--border)',
          }}
        >
          {t('transactions.reset_filters')}
        </button>
      </div>
    </BottomSheet>
  );
}

import { X } from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/sqlite-wallet.repository';
import type { TransactionFilter, TransactionType } from '../domain/transaction.model';

interface Props {
  isOpen: boolean;
  filter: TransactionFilter;
  wallets: Wallet[];
  categories: Category[];
  onChange: (filter: TransactionFilter) => void;
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

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
};

export function AdvancedTransactionFilterSheet({
  isOpen,
  filter,
  wallets,
  categories,
  onChange,
  onClose,
}: Props) {
  const { t } = useLanguage();

  const visibleCategories = filter.type === 'expense' || filter.type === 'income'
    ? categories.filter(category => category.type === filter.type)
    : categories;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Lọc nâng cao</h3>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label style={labelStyle}>
            Từ ngày
            <input
              type="date"
              value={toDateInputValue(filter.startDate)}
              onChange={event => onChange({ ...filter, startDate: startOfLocalDay(event.target.value) })}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Đến ngày
            <input
              type="date"
              value={toDateInputValue(filter.endDate)}
              onChange={event => onChange({ ...filter, endDate: endOfLocalDay(event.target.value) })}
              style={inputStyle}
            />
          </label>
        </div>

        <DropdownList
          value={filter.wallet_id || ''}
          onChange={value => onChange({ ...filter, wallet_id: value || undefined })}
          ariaLabel={t('transactions.wallet')}
          buttonClassName="bg-white min-h-[44px]"
          options={[
            { value: '', label: 'Tất cả ví' },
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
            { value: '', label: 'Tất cả danh mục' },
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
          Áp dụng
        </button>
      </div>
    </BottomSheet>
  );
}

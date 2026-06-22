import { Transaction } from '../domain/transaction.model';
import { ArrowLeftRight, Paperclip } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppTime } from '@/shared/utils/display-format';

interface Props {
  transaction: Transaction;
  onSelect: (id: string) => void;
  showDate?: boolean;
}

export function TransactionItem({ transaction, onSelect, showDate = false }: Props) {
  const { language, t } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isTransfer ? '#4f46e5' : isExpense ? '#e11d48' : '#059669';
  const amountPrefix = isTransfer ? '' : isExpense ? '-' : '+';
  const amountText = showAmounts ? `${amountPrefix}${formatAmount(transaction.amount, locale)}` : HIDDEN_AMOUNT;
  const categoryColor = transaction.category_color ?? (isExpense ? '#e11d48' : '#059669');
  const title = isTransfer
    ? `${transaction.wallet_name ?? transaction.wallet_id} -> ${transaction.to_wallet_name ?? transaction.to_wallet_id ?? ''}`
    : transaction.category_name ?? transaction.category_id;

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction.id)}
      style={{
      padding: '8px 10px',
      background: 'var(--surface)',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      width: '100%',
      minHeight: '56px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 2px var(--shadow-color)',
      textAlign: 'left',
      cursor: 'pointer',
    }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flex: '1 1 auto' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '9px',
          background: isTransfer
            ? 'rgba(79, 70, 229, 0.1)'
            : `${categoryColor}1A`,
          color: isTransfer ? '#4f46e5' : categoryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          flexShrink: 0,
        }}>
          {isTransfer ? (
            <ArrowLeftRight size={16} color="#4f46e5" />
          ) : (
            <CategoryIcon
              icon={transaction.category_icon}
              name={transaction.category_name ?? transaction.category_id}
              type={isExpense ? 'expense' : 'income'}
              size={16}
            />
          )}
        </div>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.25', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.72rem', lineHeight: '1.3', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, marginTop: '2px' }}>
            {showDate
              ? formatAppDate(transaction.transaction_date, displayFormatSettings)
              : formatAppTime(transaction.transaction_date, displayFormatSettings, locale)}
            {transaction.note && (
              <>
                <span style={{ opacity: 0.5 }}>-</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{transaction.note}</span>
              </>
            )}
            {transaction.exclude_from_total && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  marginLeft: '6px',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('transactions.excluded_from_total')}
              </span>
            )}
            {transaction.is_budget_offset && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.65rem',
                  color: '#047857',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  marginLeft: '6px',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('transactions.budget_offset_badge')}
              </span>
            )}
            {transaction.receipt_path && <><span style={{ opacity: 0.5 }}>-</span> <Paperclip size={12} style={{ flexShrink: 0 }} /></>}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginLeft: '10px' }}>
        <div style={{
          fontWeight: '700',
          fontSize: '0.95rem',
          lineHeight: '1.25',
          color: amountColor,
          whiteSpace: 'nowrap',
        }}>
          {amountText}
        </div>
      </div>
    </button>
  );
}

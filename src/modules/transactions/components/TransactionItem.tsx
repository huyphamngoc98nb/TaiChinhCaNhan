import { Transaction } from '../domain/transaction.model';
import { ArrowLeftRight, Paperclip } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';

interface Props {
  transaction: Transaction;
  onSelect: (id: string) => void;
  showDate?: boolean;
}

export function TransactionItem({ transaction, onSelect, showDate = false }: Props) {
  const { language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isTransfer ? '#4f46e5' : isExpense ? '#e11d48' : '#059669';
  const amountPrefix = isTransfer ? '' : isExpense ? '-' : '+';
  const categoryColor = transaction.category_color ?? (isExpense ? '#e11d48' : '#059669');
  const title = isTransfer
    ? `${transaction.wallet_name ?? transaction.wallet_id} -> ${transaction.to_wallet_name ?? transaction.to_wallet_id ?? ''}`
    : transaction.category_name ?? transaction.category_id;

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language !== 'vi',
    });

  const formatDateShort = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });

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
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      textAlign: 'left',
      cursor: 'pointer',
    }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.25', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.72rem', lineHeight: '1.3', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, marginTop: '2px' }}>
            {showDate ? formatDateShort(transaction.transaction_date) : formatTime(transaction.transaction_date)}
            {transaction.note && (
              <>
                <span style={{ opacity: 0.5 }}>-</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.note}</span>
              </>
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
          {amountPrefix}{formatAmount(transaction.amount, locale)}
        </div>
      </div>
    </button>
  );
}

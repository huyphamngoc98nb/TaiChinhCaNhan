import type { CSSProperties } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { Transaction } from '../domain/transaction.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { useUiPersonalizationSettings } from '@/shared/hooks/useUiPersonalizationSettings';
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
  const { listDensity } = useUiPersonalizationSettings();
  const locale = getAppLocale(language);
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';
  const amountPrefix = isTransfer ? '' : isExpense ? '−' : '+';
  const amountText = showAmounts
    ? `${amountPrefix}${formatAmount(transaction.amount, locale)}`
    : HIDDEN_AMOUNT;
  const title = isTransfer
    ? `${transaction.wallet_name ?? transaction.wallet_id} → ${transaction.to_wallet_name ?? transaction.to_wallet_id ?? ''}`
    : transaction.category_name ?? transaction.category_id;
  const typeLabel = transaction.type === 'income'
    ? t('form.type_income')
    : transaction.type === 'expense'
      ? t('form.type_expense')
      : t('transactions.transfer');
  const markerStyle = transaction.category_color && !isTransfer
    ? ({ '--transaction-category-color': transaction.category_color } as CSSProperties)
    : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction.id)}
      className="transaction-item"
      data-density={listDensity}
      data-transaction-type={transaction.type}
    >
      <span className="transaction-item__identity">
        <span className="transaction-item__marker" style={markerStyle} aria-hidden="true">
          {isTransfer ? (
            <ArrowLeftRight size={18} />
          ) : (
            <CategoryIcon
              icon={transaction.category_icon}
              name={transaction.category_name ?? transaction.category_id}
              type={isExpense ? 'expense' : 'income'}
              size={18}
            />
          )}
        </span>

        <span className="transaction-item__content">
          <span className="transaction-item__title">{title}</span>
          <span className="transaction-item__meta">
            <span className="transaction-item__kind">{typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="transaction-item__time">
              {showDate
                ? formatAppDate(transaction.transaction_date, displayFormatSettings)
                : formatAppTime(transaction.transaction_date, displayFormatSettings, locale)}
            </span>
            {transaction.note && (
              <>
                <span aria-hidden="true">·</span>
                <span className="transaction-item__note">{transaction.note}</span>
              </>
            )}
          </span>

          {(transaction.exclude_from_total || transaction.is_budget_offset) && (
            <span className="transaction-item__badges">
              {transaction.exclude_from_total && (
                <span className="transaction-status-badge">
                  {t('transactions.excluded_from_total')}
                </span>
              )}
              {transaction.is_budget_offset && (
                <span className="transaction-status-badge transaction-status-badge--offset">
                  {t('transactions.budget_offset_badge')}
                </span>
              )}
            </span>
          )}
        </span>
      </span>

      <span className="transaction-item__amount">{amountText}</span>
    </button>
  );
}

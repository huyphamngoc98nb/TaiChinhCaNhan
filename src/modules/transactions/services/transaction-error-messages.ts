import type { TranslationPath } from '@/shared/constants/translations';

type Translate = (path: TranslationPath) => string;

const MESSAGE_KEYS: Record<string, TranslationPath> = {
  'Transaction Validation Failed': 'transactions.error_validation_failed',
  'Transaction not found': 'transactions.error_transaction_not_found',
  'Wallet not found': 'transactions.error_wallet_not_found',
  'Destination wallet not found': 'transactions.error_destination_wallet_not_found',
  'Wallet is inactive': 'transactions.error_wallet_inactive',
  'Destination wallet is inactive': 'transactions.error_destination_wallet_inactive',
  'Destination wallet must be a credit card': 'transactions.error_destination_must_be_credit_card',
  'wallet_id is required': 'transactions.validation_wallet_required',
  'category_id is required': 'transactions.validation_category_required',
  'type must be income, expense, or transfer': 'transactions.validation_type_invalid',
  'amount must be a finite number greater than 0': 'transactions.validation_amount_required',
  'transaction_date is required': 'transactions.validation_date_required',
  'to_wallet_id is required for transfer transactions': 'transactions.validation_destination_required',
  'to_wallet_id is required when changing type to transfer': 'transactions.validation_destination_required',
  'to_wallet_id must not be null for transfer transactions': 'transactions.validation_destination_required',
  'to_wallet_id must be different from wallet_id': 'transactions.validation_destination_different',
  'to_wallet_id must be null for non-transfer transactions': 'transactions.validation_destination_not_allowed',
  'note must be less than 500 characters': 'transactions.validation_note_too_long',
  'receipt_path is too long': 'transactions.validation_receipt_too_long',
  'offset_budget_id is required for budget offset income transactions': 'transactions.validation_offset_budget_required',
  'is_budget_offset is only allowed for income transactions': 'transactions.validation_budget_offset_income_only',
};

function localizeMessage(message: string, t: Translate): string {
  if (message.startsWith('Insufficient balance:')) {
    return t('transactions.error_insufficient_balance');
  }

  const key = MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

export function localizeTransactionError(error: unknown, t: Translate): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const errors = (error as { errors?: unknown }).errors;
    if (Array.isArray(errors)) {
      return errors.map((item) => localizeMessage(String(item), t)).join(', ');
    }
  }

  if (error instanceof Error) {
    return localizeMessage(error.message, t);
  }

  return t('transactions.error_unknown');
}

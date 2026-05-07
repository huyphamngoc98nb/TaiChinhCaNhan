import { CreateTransactionInput, UpdateTransactionInput } from './transaction.model';

export class TransactionValidationError extends Error {
  constructor(public errors: string[]) {
    super('Transaction Validation Failed');
    this.name = 'TransactionValidationError';
  }
}

export function validateCreateTransaction(input: CreateTransactionInput) {
  const errors: string[] = [];
  
  if (!input.wallet_id) errors.push('wallet_id is required');
  if (!input.category_id) errors.push('category_id is required');
  
  if (!['income', 'expense', 'transfer'].includes(input.type)) {
    errors.push('type must be income, expense, or transfer');
  }
  
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push('amount must be a finite number greater than 0');
  }
  
  if (!input.transaction_date) {
    errors.push('transaction_date is required');
  }

  if (input.note && input.note.length > 500) {
    errors.push('note must be less than 500 characters');
  }

  if (input.receipt_path && input.receipt_path.length > 1000) {
    errors.push('receipt_path is too long');
  }

  if (errors.length > 0) {
    throw new TransactionValidationError(errors);
  }
}

export function validateUpdateTransaction(input: UpdateTransactionInput) {
  const errors: string[] = [];

  if (input.type && !['income', 'expense', 'transfer'].includes(input.type)) {
    errors.push('type must be income, expense, or transfer');
  }
  
  if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0)) {
    errors.push('amount must be a finite number greater than 0');
  }

  if (input.note && input.note.length > 500) {
    errors.push('note must be less than 500 characters');
  }

  if (input.receipt_path && input.receipt_path.length > 1000) {
    errors.push('receipt_path is too long');
  }

  if (errors.length > 0) {
    throw new TransactionValidationError(errors);
  }
}

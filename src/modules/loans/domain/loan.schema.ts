import type { CreateLoanInput, CreateLoanPaymentInput, LoanType, UpdateLoanInput } from './loan.model';

const LOAN_TYPES: LoanType[] = ['lend', 'borrow'];

export class LoanValidationError extends Error {
  constructor(public errors: string[]) {
    super('Loan Validation Failed');
    this.name = 'LoanValidationError';
  }
}

function validateLoanFields(input: CreateLoanInput | UpdateLoanInput): void {
  const errors: string[] = [];
  const skipTransaction = input.skip_transaction ?? false;

  if (!skipTransaction && !input.wallet_id) errors.push('wallet_id is required');
  if (!input.contact_name) errors.push('contact_name is required');

  if (!LOAN_TYPES.includes(input.type)) {
    errors.push('type must be lend or borrow');
  }

  if (!Number.isFinite(input.principal) || input.principal <= 0) {
    errors.push('principal must be a finite number greater than 0');
  }

  if (errors.length > 0) throw new LoanValidationError(errors);
}

export function validateCreateLoan(input: CreateLoanInput): void {
  validateLoanFields(input);
}

export function validateUpdateLoan(input: UpdateLoanInput): void {
  validateLoanFields(input);
}

export function validateCreateLoanPayment(input: CreateLoanPaymentInput): void {
  const errors: string[] = [];

  if (!input.loan_id) errors.push('loan_id is required');
  if (!input.wallet_id) errors.push('wallet_id is required');
  if (!input.payment_date) errors.push('payment_date is required');

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push('amount must be a finite number greater than 0');
  }

  if (errors.length > 0) throw new LoanValidationError(errors);
}

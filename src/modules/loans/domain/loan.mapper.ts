import type { Loan, LoanPayment, LoanWithSummary } from './loan.model';

function mapBooleanFlag(value: unknown): boolean {
  return value === true || Number(value ?? 0) === 1;
}

export function mapToLoan(row: unknown[]): Loan {
  return {
    id: row[0] as string,
    wallet_id: (row[1] as string | null) ?? null,
    skip_transaction: mapBooleanFlag(row[12]),
    linked_transaction_id: (row[13] as string | null) ?? null,
    type: row[2] as Loan['type'],
    contact_name: row[3] as string,
    contact_info: (row[4] as string | null) ?? null,
    principal: Number(row[5]),
    due_date: (row[6] as string | null) ?? null,
    note: (row[7] as string | null) ?? null,
    status: row[8] as Loan['status'],
    created_at: Number(row[9]),
    updated_at: Number(row[10]),
    deleted_at: row[11] == null ? null : Number(row[11]),
  };
}

export function mapToLoanPayment(row: unknown[]): LoanPayment {
  return {
    id: row[0] as string,
    loan_id: row[1] as string,
    wallet_id: row[2] as string,
    amount: Number(row[3]),
    payment_date: Number(row[4]),
    note: (row[5] as string | null) ?? null,
    created_at: Number(row[6]),
  };
}

export function mapToLoanWithSummary(row: unknown[]): LoanWithSummary {
  const loan = mapToLoan(row);
  const walletName = row[16] as string | null | undefined;

  return {
    ...loan,
    paid_amount: Number(row[14] ?? 0),
    remaining: Number(row[15] ?? 0),
    ...(walletName == null ? {} : { wallet_name: walletName }),
  };
}

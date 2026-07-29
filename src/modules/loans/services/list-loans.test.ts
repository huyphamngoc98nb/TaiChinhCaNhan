import { describe, expect, it, vi } from 'vitest';
import type { LoanWithSummary } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';
import { listLoans, sortLoansByLoanDate } from './list-loans';

function loan(
  id: string,
  loanDate: string | null,
  createdAt: number
): LoanWithSummary {
  return {
    id,
    wallet_id: null,
    skip_transaction: true,
    type: 'borrow',
    contact_name: id,
    contact_info: null,
    principal: 1_000,
    loan_date: loanDate,
    due_date: null,
    note: null,
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
    paid_amount: 0,
    remaining: 1_000,
  };
}

describe('listLoans sorting', () => {
  const source = [
    loan('older', '2026-01-02', 200),
    loan('newer', '2026-03-04', 100),
    loan('middle', '2026-02-03', 300),
  ];

  it('sorts newest loan dates first by default without mutating repository data', async () => {
    const repositoryRows = [...source];
    const loanRepo = {
      listLoans: vi.fn().mockResolvedValue(repositoryRows),
    } as unknown as ILoanRepository;

    const result = await listLoans({}, { loanRepo });

    expect(result.map(({ id }) => id)).toEqual(['newer', 'middle', 'older']);
    expect(repositoryRows.map(({ id }) => id)).toEqual(['older', 'newer', 'middle']);
  });

  it('sorts oldest loan dates first when requested', () => {
    const result = sortLoansByLoanDate(source, 'loanDateAsc');

    expect(result.map(({ id }) => id)).toEqual(['older', 'middle', 'newer']);
  });

  it('uses created time and then id for a stable order on the same loan date', () => {
    const sameDate = [
      loan('loan-b', '2026-02-03', 100),
      loan('loan-c', '2026-02-03T23:45:00.000Z', 200),
      loan('loan-a', '2026-02-03', 100),
    ];

    expect(sortLoansByLoanDate(sameDate).map(({ id }) => id))
      .toEqual(['loan-c', 'loan-b', 'loan-a']);
    expect(sortLoansByLoanDate(sameDate, 'loanDateAsc').map(({ id }) => id))
      .toEqual(['loan-a', 'loan-b', 'loan-c']);
  });

  it('falls back to the local created date for pre-migration records', () => {
    const legacyCreatedAt = new Date(2026, 3, 5, 23, 30).getTime();
    const result = sortLoansByLoanDate([
      loan('explicit', '2026-04-04', legacyCreatedAt + 1),
      loan('legacy', null, legacyCreatedAt),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['legacy', 'explicit']);
  });
});

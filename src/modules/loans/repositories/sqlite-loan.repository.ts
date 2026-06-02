import { getDbConnection } from '@/core/db/sqlite/connection';
import { isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import type {
  CreateLoanInput,
  CreateLoanPaymentInput,
  Loan,
  LoanFilter,
  LoanPayment,
  LoanStatus,
  LoanWithSummary,
  UpdateLoanInput,
} from '../domain/loan.model';
import { mapToLoan, mapToLoanPayment, mapToLoanWithSummary } from '../domain/loan.mapper';
import type { ILoanRepository } from './loan.repository';

const LOAN_PAYMENT_COLUMNS = `
  id, loan_id, wallet_id, amount, payment_date, note, created_at
`;

function loanRowToArray(row: unknown): unknown[] {
  if (Array.isArray(row)) {
    return row.length >= 13 ? row : [...row, 0];
  }

  const record = row as Record<string, unknown>;
  return [
    record.id,
    record.wallet_id,
    record.type,
    record.contact_name,
    record.contact_info,
    record.principal,
    record.due_date,
    record.note,
    record.status,
    record.created_at,
    record.updated_at,
    record.deleted_at,
    record.skip_transaction ?? 0,
  ];
}

function loanWithSummaryRowToArray(row: unknown): unknown[] {
  if (Array.isArray(row)) {
    return row.length >= 16 ? row : [...row.slice(0, 12), 0, ...row.slice(12)];
  }

  const record = row as Record<string, unknown>;
  return [
    ...loanRowToArray(row),
    record.paid_amount,
    record.remaining,
    record.wallet_name,
  ];
}

function loanPaymentRowToArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;

  const record = row as Record<string, unknown>;
  return [
    record.id,
    record.loan_id,
    record.wallet_id,
    record.amount,
    record.payment_date,
    record.note,
    record.created_at,
  ];
}

export class SQLiteLoanRepository implements ILoanRepository {
  async createLoan(
    data: CreateLoanInput & { id: string; created_at: number; updated_at: number }
  ): Promise<Loan> {
    const db = await getDbConnection();
    const sql = `
      INSERT INTO loans (
        id, wallet_id, type, contact_name, contact_info, principal,
        due_date, note, status, created_at, updated_at, deleted_at, skip_transaction
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.id,
      data.wallet_id ?? null,
      data.type,
      data.contact_name,
      data.contact_info ?? null,
      data.principal,
      data.due_date ?? null,
      data.note ?? null,
      'active',
      data.created_at,
      data.updated_at,
      null,
      data.skip_transaction ? 1 : 0,
    ];

    await db.run(sql, values, !isManagedTransactionActive());
    return this.getLoanById(data.id) as Promise<Loan>;
  }

  async getLoanById(id: string): Promise<Loan | null> {
    const db = await getDbConnection();
    const sql = `
      SELECT loans.*
      FROM loans
      LEFT JOIN wallets w ON loans.wallet_id = w.id
      WHERE loans.id = ? AND loans.deleted_at IS NULL
      LIMIT 1
    `;
    const { values } = await db.query(sql, [id]);
    if (!values || values.length === 0) return null;
    return mapToLoan(loanRowToArray(values[0]));
  }

  async updateLoan(
    id: string,
    data: UpdateLoanInput & { updated_at: number }
  ): Promise<Loan | null> {
    const db = await getDbConnection();
    const sql = `
      UPDATE loans
      SET wallet_id = ?,
          skip_transaction = ?,
          type = ?,
          contact_name = ?,
          contact_info = ?,
          principal = ?,
          due_date = ?,
          note = ?,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;
    const values = [
      data.wallet_id ?? null,
      data.skip_transaction ? 1 : 0,
      data.type,
      data.contact_name,
      data.contact_info ?? null,
      data.principal,
      data.due_date ?? null,
      data.note ?? null,
      data.updated_at,
      id,
    ];

    await db.run(sql, values, !isManagedTransactionActive());
    return this.getLoanById(id);
  }

  async listLoans(filter: LoanFilter): Promise<LoanWithSummary[]> {
    const db = await getDbConnection();
    let sql = `
      SELECT
        loans.*,
        COALESCE(SUM(lp.amount), 0) AS paid_amount,
        (loans.principal - COALESCE(SUM(lp.amount), 0)) AS remaining,
        w.name AS wallet_name
      FROM loans
      LEFT JOIN loan_payments lp ON lp.loan_id = loans.id
      LEFT JOIN wallets w ON loans.wallet_id = w.id
      WHERE 1=1
    `;
    const values: unknown[] = [];

    if (!filter.includeDeleted) {
      sql += ` AND loans.deleted_at IS NULL`;
    }
    if (filter.status) {
      sql += ` AND loans.status = ?`;
      values.push(filter.status);
    }
    if (filter.type) {
      sql += ` AND loans.type = ?`;
      values.push(filter.type);
    }

    sql += `
      GROUP BY loans.id
      ORDER BY loans.due_date ASC NULLS LAST, loans.created_at DESC
    `;

    const { values: rows } = await db.query(sql, values);
    return (rows ?? []).map((row) => mapToLoanWithSummary(loanWithSummaryRowToArray(row)));
  }

  async updateLoanStatus(
    id: string,
    status: LoanStatus,
    updated_at: number
  ): Promise<Loan | null> {
    const db = await getDbConnection();
    const sql = `UPDATE loans SET status = ?, updated_at = ? WHERE id = ?`;
    await db.run(sql, [status, updated_at, id], !isManagedTransactionActive());
    return this.getLoanById(id);
  }

  async softDeleteLoan(id: string, deleted_at: number): Promise<boolean> {
    const db = await getDbConnection();
    const sql = `UPDATE loans SET deleted_at = ?, updated_at = ? WHERE id = ?`;
    const res = await db.run(sql, [deleted_at, deleted_at, id], !isManagedTransactionActive());
    return (res.changes?.changes ?? 0) > 0;
  }

  async hardDeleteLoan(id: string): Promise<boolean> {
    const db = await getDbConnection();
    await db.run(
      'DELETE FROM loans WHERE id = ?',
      [id],
      !isManagedTransactionActive()
    );
    return true;
  }

  async createPayment(
    data: CreateLoanPaymentInput & { id: string; created_at: number }
  ): Promise<LoanPayment> {
    const db = await getDbConnection();
    const sql = `
      INSERT INTO loan_payments (id, loan_id, wallet_id, amount, payment_date, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.id,
      data.loan_id,
      data.wallet_id,
      data.amount,
      data.payment_date,
      data.note ?? null,
      data.created_at,
    ];

    await db.run(sql, values, !isManagedTransactionActive());

    const payments = await this.listPayments(data.loan_id);
    return payments.find((payment) => payment.id === data.id) as LoanPayment;
  }

  async listPayments(loan_id: string): Promise<LoanPayment[]> {
    const db = await getDbConnection();
    const sql = `
      SELECT ${LOAN_PAYMENT_COLUMNS}
      FROM loan_payments
      WHERE loan_id = ?
      ORDER BY payment_date DESC
    `;
    const { values } = await db.query(sql, [loan_id]);
    return (values ?? []).map((row) => mapToLoanPayment(loanPaymentRowToArray(row)));
  }

  async getTotalPaid(loan_id: string): Promise<number> {
    const db = await getDbConnection();
    const sql = `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM loan_payments
      WHERE loan_id = ?
    `;
    const { values } = await db.query(sql, [loan_id]);
    return Number(values?.[0]?.total ?? 0);
  }
}

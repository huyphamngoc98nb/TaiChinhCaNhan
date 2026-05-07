/**
 * schema-validation.test.ts
 *
 * Tests for transaction domain validation rules and the row mapper.
 * High-risk area: amount precision, NaN, date handling, nullability.
 */
import { describe, it, expect } from 'vitest';
import {
  validateCreateTransaction,
  validateUpdateTransaction,
  TransactionValidationError,
} from '../modules/transactions/domain/transaction.schema';
import { mapToTransaction } from '../modules/transactions/domain/transaction.mapper';

// ---------------------------------------------------------------------------
// validateCreateTransaction
// ---------------------------------------------------------------------------
describe('validateCreateTransaction – amount edge cases', () => {
  const base = {
    wallet_id: 'w1',
    category_id: 'c1',
    type: 'expense' as const,
    transaction_date: Date.now(),
  };

  it('rejects amount === 0', () => {
    expect(() => validateCreateTransaction({ ...base, amount: 0 }))
      .toThrow(TransactionValidationError);
  });

  it('rejects negative amount', () => {
    expect(() => validateCreateTransaction({ ...base, amount: -1 }))
      .toThrow(TransactionValidationError);
  });

  it('rejects NaN amount (currently passes typeof check – regression guard)', () => {
    // BUG: typeof NaN === 'number' so the typeof guard does NOT catch NaN.
    // This test documents and pins the expected behavior: NaN should throw.
    expect(() => validateCreateTransaction({ ...base, amount: NaN }))
      .toThrow(TransactionValidationError);
  });

  it('rejects Infinity amount', () => {
    expect(() => validateCreateTransaction({ ...base, amount: Infinity }))
      .toThrow(TransactionValidationError);
  });

  it('accepts a very large positive amount', () => {
    expect(() => validateCreateTransaction({ ...base, amount: 999_999_999.99 }))
      .not.toThrow();
  });

  it('accepts amount with decimal precision', () => {
    expect(() => validateCreateTransaction({ ...base, amount: 0.01 }))
      .not.toThrow();
  });
});

describe('validateCreateTransaction – date edge cases', () => {
  const base = {
    wallet_id: 'w1',
    category_id: 'c1',
    type: 'income' as const,
    amount: 100,
  };

  it('rejects missing transaction_date (0 / falsy)', () => {
    expect(() => validateCreateTransaction({ ...base, transaction_date: 0 }))
      .toThrow(TransactionValidationError);
  });

  it('rejects NaN transaction_date', () => {
    // NaN is falsy → the !input.transaction_date guard catches it
    expect(() => validateCreateTransaction({ ...base, transaction_date: NaN }))
      .toThrow(TransactionValidationError);
  });

  it('accepts a midnight epoch boundary timestamp', () => {
    // Midnight 2024-01-01 UTC
    const midnight = new Date('2024-01-01T00:00:00.000Z').getTime();
    expect(() => validateCreateTransaction({ ...base, transaction_date: midnight }))
      .not.toThrow();
  });

  it('accepts a future timestamp', () => {
    const future = Date.now() + 86_400_000;
    expect(() => validateCreateTransaction({ ...base, transaction_date: future }))
      .not.toThrow();
  });
});

describe('validateCreateTransaction – required fields', () => {
  it('rejects empty wallet_id', () => {
    expect(() =>
      validateCreateTransaction({
        wallet_id: '',
        category_id: 'c1',
        type: 'expense',
        amount: 100,
        transaction_date: Date.now(),
      })
    ).toThrow(TransactionValidationError);
  });

  it('rejects empty category_id', () => {
    expect(() =>
      validateCreateTransaction({
        wallet_id: 'w1',
        category_id: '',
        type: 'expense',
        amount: 100,
        transaction_date: Date.now(),
      })
    ).toThrow(TransactionValidationError);
  });

  it('rejects invalid type', () => {
    expect(() =>
      validateCreateTransaction({
        wallet_id: 'w1',
        category_id: 'c1',
        type: 'unknown' as any,
        amount: 100,
        transaction_date: Date.now(),
      })
    ).toThrow(TransactionValidationError);
  });

  it('rejects note longer than 500 chars', () => {
    expect(() =>
      validateCreateTransaction({
        wallet_id: 'w1',
        category_id: 'c1',
        type: 'expense',
        amount: 100,
        transaction_date: Date.now(),
        note: 'x'.repeat(501),
      })
    ).toThrow(TransactionValidationError);
  });

  it('accepts note of exactly 500 chars', () => {
    expect(() =>
      validateCreateTransaction({
        wallet_id: 'w1',
        category_id: 'c1',
        type: 'expense',
        amount: 100,
        transaction_date: Date.now(),
        note: 'x'.repeat(500),
      })
    ).not.toThrow();
  });

  it('collects multiple errors at once', () => {
    try {
      validateCreateTransaction({
        wallet_id: '',
        category_id: '',
        type: 'expense',
        amount: -1,
        transaction_date: 0,
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TransactionValidationError);
      const err = e as TransactionValidationError;
      // Expect errors for: wallet_id, category_id, amount, transaction_date
      expect(err.errors.length).toBeGreaterThanOrEqual(4);
    }
  });
});

// ---------------------------------------------------------------------------
// validateUpdateTransaction
// ---------------------------------------------------------------------------
describe('validateUpdateTransaction – amount edge cases', () => {
  it('rejects amount === 0 on update', () => {
    expect(() => validateUpdateTransaction({ amount: 0 }))
      .toThrow(TransactionValidationError);
  });

  it('rejects NaN amount on update', () => {
    expect(() => validateUpdateTransaction({ amount: NaN }))
      .toThrow(TransactionValidationError);
  });

  it('allows partial update with no amount field', () => {
    expect(() => validateUpdateTransaction({ note: 'hello' })).not.toThrow();
  });

  it('allows valid amount on update', () => {
    expect(() => validateUpdateTransaction({ amount: 50.5 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// mapToTransaction – null/undefined coercion
// ---------------------------------------------------------------------------
describe('mapToTransaction – nullable fields', () => {
  it('maps null note correctly', () => {
    const row = {
      id: 'tx1', wallet_id: 'w1', category_id: 'c1', type: 'expense',
      amount: 100, note: null, receipt_path: null, transaction_date: 1000,
      created_at: 1000, updated_at: 1000, deleted_at: null,
    };
    const tx = mapToTransaction(row);
    expect(tx.note).toBeNull();
    expect(tx.receipt_path).toBeNull();
    expect(tx.deleted_at).toBeNull();
  });

  it('maps undefined note to undefined (passthrough) – documents current behavior', () => {
    // row.note undefined happens if the DB driver omits the key entirely
    const row = {
      id: 'tx1', wallet_id: 'w1', category_id: 'c1', type: 'expense',
      amount: 100, transaction_date: 1000, created_at: 1000, updated_at: 1000,
    };
    const tx = mapToTransaction(row);
    // note is not explicitly set; mapper returns row.note which is undefined
    // The Transaction type says note: string | null – this is a type gap
    expect(tx.note === null || tx.note === undefined).toBe(true);
  });

  it('correctly preserves deleted_at = 0 (not coerced to null)', () => {
    // Previously: deleted_at: row.deleted_at || null coerced 0 → null (FIXED with ??)
    // After fix: deleted_at: row.deleted_at ?? null correctly preserves 0.
    const row = {
      id: 'tx1', wallet_id: 'w1', category_id: 'c1', type: 'expense',
      amount: 100, note: null, receipt_path: null, transaction_date: 1000,
      created_at: 1000, updated_at: 1000, deleted_at: 0,
    };
    const tx = mapToTransaction(row);
    // Epoch 0 is a valid (if unusual) soft-delete timestamp and must be preserved.
    expect(tx.deleted_at).toBe(0);
  });

  it('maps a fully populated row correctly', () => {
    const now = Date.now();
    const row = {
      id: 'tx-full', wallet_id: 'w2', category_id: 'cat1', type: 'income',
      amount: 9999.99, note: 'Salary', receipt_path: 'receipts/sal.jpeg',
      transaction_date: now - 1000, created_at: now - 500, updated_at: now,
      deleted_at: null,
    };
    const tx = mapToTransaction(row);
    expect(tx).toMatchObject({
      id: 'tx-full',
      wallet_id: 'w2',
      category_id: 'cat1',
      type: 'income',
      amount: 9999.99,
      note: 'Salary',
      receipt_path: 'receipts/sal.jpeg',
      deleted_at: null,
    });
  });
});

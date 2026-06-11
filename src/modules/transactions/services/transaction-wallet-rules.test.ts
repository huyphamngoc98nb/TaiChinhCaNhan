import { describe, expect, it } from 'vitest';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { TransactionValidationError } from '../domain/transaction.schema';
import {
  assertCreateTransactionFunding,
  assertNoCreditCardToCreditCardTransfer,
  assertProjectedWalletDelta,
} from './transaction-wallet-rules';

function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'wallet-1',
    name: 'Wallet',
    currency: 'VND',
    balance: 0,
    account_type: 'cash',
    icon: null,
    color: null,
    sort_order: 0,
    is_active: 1,
    exclude_from_total: 0,
    credit_limit: null,
    statement_day: null,
    due_day: null,
    annual_fee: null,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  };
}

function expectValidationError(action: () => void, message: string) {
  try {
    action();
    throw new Error('Expected TransactionValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(TransactionValidationError);
    expect((error as TransactionValidationError).errors).toContainEqual(
      expect.stringContaining(message),
    );
  }
}

describe('assertCreateTransactionFunding', () => {
  describe('credit card expense', () => {
    it('allows an expense within available credit', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: 0,
        credit_limit: 2_000_000,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'expense', 500_000)).not.toThrow();
    });

    it('rejects an expense above available credit', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: -500_000,
        credit_limit: 2_000_000,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'expense', 1_600_000)).toThrow(
        TransactionValidationError,
      );
    });

    it('allows any expense when no credit limit is configured', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: 0,
        credit_limit: null,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'expense', 99_999_999)).not.toThrow();
    });
  });

  describe('credit card transfer', () => {
    it('allows a bank transfer into a credit card, including overpayment', () => {
      const bank = makeWallet({
        account_type: 'bank',
        balance: 2_000_000,
      });
      const creditCard = makeWallet({
        id: 'credit-card',
        account_type: 'credit_card',
        balance: -100_000,
        credit_limit: 500_000,
      });

      expect(() =>
        assertCreateTransactionFunding(bank, 'transfer', 1_000_000, creditCard)
      ).not.toThrow();
    });

    it('rejects a credit-card-to-credit-card transfer', () => {
      const source = makeWallet({
        account_type: 'credit_card',
        credit_limit: 2_000_000,
      });
      const destination = makeWallet({
        id: 'credit-card-2',
        account_type: 'credit_card',
        credit_limit: 2_000_000,
      });

      expect(() => assertNoCreditCardToCreditCardTransfer(source, destination)).toThrow(
        TransactionValidationError,
      );
    });

    it('allows a transfer within available credit when balance is negative', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: -500_000,
        credit_limit: 2_000_000,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'transfer', 1_000_000)).not.toThrow();
    });

    it('rejects a transfer above available credit with an insufficient credit error', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: 0,
        credit_limit: 500_000,
      });

      expectValidationError(
        () => assertCreateTransactionFunding(wallet, 'transfer', 600_000),
        'Insufficient credit',
      );
    });

    it('allows a transfer equal to available credit', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: -200_000,
        credit_limit: 1_000_000,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'transfer', 800_000)).not.toThrow();
    });

    it('allows a transfer when no credit limit is configured', () => {
      const wallet = makeWallet({
        account_type: 'credit_card',
        balance: -9_000_000,
        credit_limit: null,
      });

      expect(() => assertCreateTransactionFunding(wallet, 'transfer', 5_000_000)).not.toThrow();
    });
  });

  describe('non-credit-card', () => {
    it('allows a cash expense within the balance', () => {
      const wallet = makeWallet({ balance: 500_000 });

      expect(() => assertCreateTransactionFunding(wallet, 'expense', 300_000)).not.toThrow();
    });

    it('rejects a cash expense above the balance with an insufficient balance error', () => {
      const wallet = makeWallet({ balance: 100_000 });

      expectValidationError(
        () => assertCreateTransactionFunding(wallet, 'expense', 200_000),
        'Insufficient balance',
      );
    });

    it('allows a bank transfer equal to the balance', () => {
      const wallet = makeWallet({ account_type: 'bank', balance: 1_000_000 });

      expect(() => assertCreateTransactionFunding(wallet, 'transfer', 1_000_000)).not.toThrow();
    });

    it('allows income when the balance is negative', () => {
      const wallet = makeWallet({ balance: -999 });

      expect(() => assertCreateTransactionFunding(wallet, 'income', 500_000)).not.toThrow();
    });
  });
});

describe('assertProjectedWalletDelta', () => {
  it('allows a positive delta into a credit card wallet', () => {
    const creditCard = makeWallet({
      account_type: 'credit_card',
      balance: -100_000,
      credit_limit: 500_000,
    });

    expect(() => assertProjectedWalletDelta(creditCard, 1_000_000)).not.toThrow();
  });
});

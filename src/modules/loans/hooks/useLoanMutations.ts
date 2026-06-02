import { useCallback, useState } from 'react';
import { loanMutationDeps, loanServiceDeps } from '@/core/di/loans.di';
import type { CreateLoanInput, CreateLoanPaymentInput, Loan, LoanPayment, UpdateLoanInput } from '../domain/loan.model';
import { addLoanPayment as addLoanPaymentService } from '../services/add-loan-payment';
import { cancelLoan as cancelLoanService } from '../services/cancel-loan';
import { createLoan as createLoanService } from '../services/create-loan';
import { updateLoan as updateLoanService } from '../services/update-loan';
import {
  deleteLoan as deleteLoanService,
  type DeleteLoanMode,
} from '../services/delete-loan';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function emitLoanEvent(name: string, detail?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function useLoanMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createLoan = useCallback(async (input: CreateLoanInput): Promise<Loan> => {
    setLoading(true);
    setError(null);

    try {
      const loan = await createLoanService(input, loanServiceDeps);
      emitLoanEvent('loan:created', loan);
      return loan;
    } catch (err) {
      const nextError = toError(err);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLoan = useCallback(async (loanId: string, input: UpdateLoanInput): Promise<Loan> => {
    setLoading(true);
    setError(null);

    try {
      const loan = await updateLoanService(loanId, input, loanServiceDeps);
      emitLoanEvent('loan:updated', loan);
      return loan;
    } catch (err) {
      const nextError = toError(err);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const addPayment = useCallback(async (input: CreateLoanPaymentInput): Promise<LoanPayment> => {
    setLoading(true);
    setError(null);

    try {
      const payment = await addLoanPaymentService(input, loanMutationDeps);
      emitLoanEvent('loan:payment-added', payment);
      return payment;
    } catch (err) {
      const nextError = toError(err);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelLoan = useCallback(async (loanId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await cancelLoanService(loanId, loanMutationDeps);
      emitLoanEvent('loan:cancelled', { loanId });
    } catch (err) {
      const nextError = toError(err);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLoan = useCallback(async (
    loanId: string,
    mode: DeleteLoanMode,
    force = false
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await deleteLoanService(loanId, mode, loanMutationDeps, { force });
      emitLoanEvent('loan:deleted', { loanId, mode });
    } catch (err) {
      const nextError = toError(err);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createLoan, updateLoan, addPayment, cancelLoan, deleteLoan, loading, error };
}

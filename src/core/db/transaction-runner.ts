import { runInTransaction } from './sqlite/transaction';

export type TransactionRunner = <T>(work: () => Promise<T>) => Promise<T>;

export const sqliteTransactionRunner: TransactionRunner = async (work) => {
  return runInTransaction(() => work());
};

export const immediateTransactionRunner: TransactionRunner = async (work) => {
  return work();
};

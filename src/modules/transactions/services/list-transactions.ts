import { TransactionFilter } from '../domain/transaction.model';
import { ITransactionRepository } from '../repositories/transaction.repository';

export class ListTransactionsUseCase {
  constructor(private repository: ITransactionRepository) {}

  async execute(filter: TransactionFilter = {}) {
    return this.repository.list(filter);
  }
}

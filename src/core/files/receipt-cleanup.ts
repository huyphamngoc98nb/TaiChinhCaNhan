import { logger } from '@/core/telemetry/logger';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { ReceiptStorageService } from './receipt-storage';

export async function runReceiptOrphanCleanup(
  transactionRepo: ITransactionRepository
): Promise<void> {
  const paths = await transactionRepo.getAllReceiptPaths();
  const deletedCount = await ReceiptStorageService.cleanupOrphans(paths);
  logger.info(`Receipt orphan cleanup deleted ${deletedCount} file(s).`);
}

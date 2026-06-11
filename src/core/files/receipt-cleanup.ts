import { getDbConnectionForTransaction } from '@/core/db/sqlite/transaction';
import { logger } from '@/core/telemetry/logger';
import { ReceiptStorageService } from './receipt-storage';

const ACTIVE_RECEIPT_QUERY = `
  SELECT id
  FROM transactions
  WHERE receipt_path = ? AND deleted_at IS NULL
  LIMIT 1
`;

export class OrphanReceiptCleanupService {
  async run(): Promise<{ deleted: number; errors: number }> {
    const receiptPaths = await ReceiptStorageService.listOrphanedReceipts([]);
    const db = await getDbConnectionForTransaction();
    let deleted = 0;
    let errors = 0;

    for (const path of receiptPaths) {
      try {
        const { values = [] } = await db.query(ACTIVE_RECEIPT_QUERY, [path]);
        if (values.length > 0) continue;

        const wasDeleted = await ReceiptStorageService.deleteReceipt(path);
        if (!wasDeleted) {
          errors += 1;
          continue;
        }

        deleted += 1;
        logger.info(`Deleted orphan receipt: ${path}`);
      } catch (error) {
        errors += 1;
        logger.warn(`Failed to clean up receipt at ${path}`, error);
      }
    }

    return { deleted, errors };
  }
}

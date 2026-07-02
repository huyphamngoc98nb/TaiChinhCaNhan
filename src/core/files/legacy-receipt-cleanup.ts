import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { logger } from '@/core/telemetry/logger';

const LEGACY_RECEIPT_DIRECTORY = 'receipts';
export const LEGACY_RECEIPT_CLEANUP_KEY = 'legacy_receipt_cleanup_v1';

export interface LegacyReceiptCleanupResult {
  completed: boolean;
  skipped: boolean;
  errors: number;
}

function isMissingDirectoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:folder|directory|file|entry) does not exist/i.test(message);
}

export async function runLegacyReceiptCleanupOnce(): Promise<LegacyReceiptCleanupResult> {
  try {
    const { value } = await Preferences.get({ key: LEGACY_RECEIPT_CLEANUP_KEY });
    if (value === 'completed') {
      return { completed: true, skipped: true, errors: 0 };
    }
  } catch (error) {
    logger.warn('Could not read the legacy receipt cleanup marker', error);
    return { completed: false, skipped: false, errors: 1 };
  }

  try {
    await Filesystem.rmdir({
      path: LEGACY_RECEIPT_DIRECTORY,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (error) {
    if (!isMissingDirectoryError(error)) {
      logger.warn('Could not remove the legacy receipt directory', error);
      return { completed: false, skipped: false, errors: 1 };
    }
  }

  try {
    await Preferences.set({ key: LEGACY_RECEIPT_CLEANUP_KEY, value: 'completed' });
  } catch (error) {
    logger.warn('Could not persist the legacy receipt cleanup marker', error);
    return { completed: false, skipped: false, errors: 1 };
  }

  logger.info('Legacy receipt directory cleanup completed');
  return { completed: true, skipped: false, errors: 0 };
}

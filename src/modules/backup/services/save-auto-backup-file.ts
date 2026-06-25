import { Capacitor } from '@capacitor/core';
import { documentSaver } from '@/core/files/document-saver';
import type { SavedBackupFile } from '../domain/backup-file.model';
import { saveBackupFile } from './save-backup-file';

const BACKUP_MIME_TYPE = 'application/json';
const AUTO_BACKUP_DOWNLOAD_DIRECTORY = 'Expense Tracker';

export async function saveAutoBackupFile(
  fileName: string,
  content: string
): Promise<SavedBackupFile> {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    const result = await documentSaver.saveTextFileToDownloads({
      fileName,
      content,
      mimeType: BACKUP_MIME_TYPE,
      directoryName: AUTO_BACKUP_DOWNLOAD_DIRECTORY,
    });

    return {
      saved: result.saved,
      fileName,
      uri: result.uri,
      path: result.path,
      platform,
    };
  }

  const saved = await saveBackupFile(fileName, content);

  return {
    saved,
    fileName,
    platform,
  };
}

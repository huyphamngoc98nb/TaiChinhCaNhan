import { assertBackupPayload } from './validate-backup-payload';
import { restoreDatabase } from './restore-database';

export async function importBackupJson(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const payload = JSON.parse(text);
        
        assertBackupPayload(payload);
        await restoreDatabase(payload);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

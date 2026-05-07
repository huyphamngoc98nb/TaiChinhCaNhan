import { Filesystem, Directory } from '@capacitor/filesystem';
import { logger } from '@/core/telemetry/logger';

export class ReceiptStorageService {
  private static DIRECTORY = Directory.Data;
  private static FOLDER_NAME = 'receipts';

  /**
   * Initializes the receipts directory if it doesn't exist
   */
  static async init() {
    try {
      await Filesystem.mkdir({
        path: this.FOLDER_NAME,
        directory: this.DIRECTORY,
        recursive: true
      });
    } catch (e) {
      // Ignored if it already exists
    }
  }

  /**
   * Saves a base64 image to the filesystem
   * @param base64Data Raw base64 string (without data:image/jpeg;base64, prefix)
   * @param fileName Optional filename. If omitted, generates a unique one.
   * @returns The relative path to the saved file
   */
  static async saveReceipt(base64Data: string, fileName?: string): Promise<string> {
    await this.init();
    
    const name = fileName || `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.jpeg`;
    const path = `${this.FOLDER_NAME}/${name}`;

    try {
      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: this.DIRECTORY
      });
      return path;
    } catch (error) {
      logger.error('Failed to save receipt', error);
      throw new Error('Could not save receipt image');
    }
  }

  /**
   * Reads a receipt as a base64 data URL for displaying in an <img> tag
   */
  static async getReceiptDataUrl(path: string): Promise<string | null> {
    try {
      const contents = await Filesystem.readFile({
        path,
        directory: this.DIRECTORY
      });
      return `data:image/jpeg;base64,${contents.data}`;
    } catch (error) {
      logger.error(`Failed to read receipt at ${path}`, error);
      return null;
    }
  }

  /**
   * Deletes a receipt from the filesystem
   */
  static async deleteReceipt(path: string): Promise<boolean> {
    if (!path) return true;
    try {
      await Filesystem.deleteFile({
        path,
        directory: this.DIRECTORY
      });
      return true;
    } catch (error) {
      logger.warn(`Failed to delete receipt at ${path}. It might already be deleted.`, error);
      return false;
    }
  }
}

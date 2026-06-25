import { registerPlugin } from '@capacitor/core';

interface SaveTextFileOptions {
  fileName: string;
  content: string;
  mimeType: string;
}

interface SaveTextFileToDownloadsOptions extends SaveTextFileOptions {
  directoryName?: string;
}

interface SaveTextFileResult {
  saved: boolean;
  uri?: string;
  path?: string;
}

interface DeleteSavedFileOptions {
  uri?: string;
  path?: string;
}

interface DeleteSavedFileResult {
  deleted: boolean;
  missing?: boolean;
}

interface DocumentSaverPlugin {
  saveTextFile(options: SaveTextFileOptions): Promise<SaveTextFileResult>;
  saveTextFileToDownloads(options: SaveTextFileToDownloadsOptions): Promise<SaveTextFileResult>;
  deleteSavedFile(options: DeleteSavedFileOptions): Promise<DeleteSavedFileResult>;
}

export const documentSaver = registerPlugin<DocumentSaverPlugin>('DocumentSaver');

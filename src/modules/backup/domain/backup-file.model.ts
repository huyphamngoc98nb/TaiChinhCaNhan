export type BackupFileKind = 'auto' | 'manual';

export interface SavedBackupFile {
  saved: boolean;
  fileName?: string;
  uri?: string;
  path?: string;
  platform?: string;
}

export interface BackupFileRecord {
  id: string;
  fileName: string;
  uri?: string | null;
  path?: string | null;
  kind: BackupFileKind;
  platform: string;
  encrypted: boolean;
  createdAt: number;
  deletedAt?: number | null;
}

export interface BackupRetentionSettings {
  enabled: boolean;
  maxFiles: number;
}

import { Capacitor } from '@capacitor/core';

export type SQLiteEncryptionMode = 'no-encryption' | 'encryption' | 'secret' | 'newsecret';

export interface SQLiteEncryptionConfig {
  encrypted: boolean;
  mode: SQLiteEncryptionMode;
  requiresNativeSecret: boolean;
}

export const SQLITE_ENCRYPTION_CONFIG: SQLiteEncryptionConfig = {
  encrypted: false,
  mode: 'no-encryption',
  requiresNativeSecret: false,
};

export function getSQLiteEncryptionConfig(): SQLiteEncryptionConfig {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    return {
      encrypted: false,
      mode: 'no-encryption',
      requiresNativeSecret: false,
    };
  }

  return SQLITE_ENCRYPTION_CONFIG;
}

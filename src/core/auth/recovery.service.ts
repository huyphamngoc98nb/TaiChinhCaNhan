import { Preferences } from '@capacitor/preferences';
import {
  clearNativeEncryptionSecret,
  deleteLocalDatabase,
} from '@/core/db/reset-local-data';

export const BIOMETRIC_UNLOCK_KEY = 'biometric_unlock_enabled';

export class RecoveryService {
  async resetLocalData(): Promise<void> {
    await deleteLocalDatabase();
    await clearNativeEncryptionSecret();
    await Preferences.set({
      key: BIOMETRIC_UNLOCK_KEY,
      value: 'false',
    });
  }
}

export const recoveryService = new RecoveryService();

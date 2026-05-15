import { Capacitor } from '@capacitor/core';
import { sqlite } from '@/core/db/sqlite/pragmas';
import { getSQLiteEncryptionConfig } from '@/core/db/sqlite/encryption';

export interface AuthResult {
  authenticated: boolean;
  createdSecret: boolean;
}

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web';
}

export class AuthService {
  requiresUnlock(): boolean {
    return isNativePlatform() && getSQLiteEncryptionConfig().requiresNativeSecret;
  }

  async unlockWithPin(pin: string): Promise<AuthResult> {
    if (!this.requiresUnlock()) {
      return { authenticated: true, createdSecret: false };
    }

    const normalizedPin = pin.trim();
    if (normalizedPin.length < 6) {
      throw new Error('PIN must contain at least 6 characters.');
    }

    const secretStored = (await sqlite.isSecretStored()).result === true;

    if (!secretStored) {
      await sqlite.setEncryptionSecret(normalizedPin);
      return { authenticated: true, createdSecret: true };
    }

    const verified = (await sqlite.checkEncryptionSecret(normalizedPin)).result === true;
    if (!verified) {
      throw new Error('Invalid PIN or biometric verification failed.');
    }

    return { authenticated: true, createdSecret: false };
  }
}

export const authService = new AuthService();

import { Capacitor, registerPlugin } from '@capacitor/core';

export const AUTO_BACKUP_PASSWORD_SECRET_KEY = 'auto_backup_password';

export interface SecureSecretStorePlugin {
  setSecret(options: { key: string; value: string }): Promise<{ saved: boolean }>;
  getSecret(options: { key: string }): Promise<{ value?: string; exists: boolean }>;
  removeSecret(options: { key: string }): Promise<{ removed: boolean }>;
  hasSecret(options: { key: string }): Promise<{ exists: boolean }>;
}

const nativeSecureSecretStore = registerPlugin<SecureSecretStorePlugin>('SecureSecretStore');

const webSecureSecretStore: SecureSecretStorePlugin = {
  async setSecret() {
    return { saved: false };
  },
  async getSecret() {
    return { exists: false };
  },
  async removeSecret() {
    return { removed: false };
  },
  async hasSecret() {
    return { exists: false };
  },
};

export function isSecureSecretStoreAvailable(): boolean {
  return Capacitor.getPlatform() === 'android';
}

function getStore(): SecureSecretStorePlugin {
  return isSecureSecretStoreAvailable() ? nativeSecureSecretStore : webSecureSecretStore;
}

export const secureSecretStore: SecureSecretStorePlugin = {
  setSecret(options) {
    return getStore().setSecret(options);
  },
  getSecret(options) {
    return getStore().getSecret(options);
  },
  removeSecret(options) {
    return getStore().removeSecret(options);
  },
  hasSecret(options) {
    return getStore().hasSecret(options);
  },
};

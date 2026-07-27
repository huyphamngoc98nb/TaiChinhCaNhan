import { Capacitor, registerPlugin } from '@capacitor/core';

interface PrivacyShieldPlugin {
  hide(): Promise<void>;
}

const nativePrivacyShield = registerPlugin<PrivacyShieldPlugin>('PrivacyShield');

export const privacyShield = {
  async hide(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;

    try {
      await nativePrivacyShield.hide();
    } catch {
      // The React shield still protects the transition when an older native
      // binary does not have this bridge yet.
    }
  },
};

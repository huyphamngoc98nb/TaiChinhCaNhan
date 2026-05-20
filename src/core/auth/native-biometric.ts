import { registerPlugin } from '@capacitor/core';

export interface NativeBiometricAvailability {
  available: boolean;
  message?: string;
}

export interface NativeBiometricAuthResult {
  authenticated: boolean;
}

export interface NativeBiometricPlugin {
  isAvailable(): Promise<NativeBiometricAvailability>;
  authenticate(options?: {
    title?: string;
    subtitle?: string;
  }): Promise<NativeBiometricAuthResult>;
}

export const nativeBiometric = registerPlugin<NativeBiometricPlugin>('NativeBiometric');

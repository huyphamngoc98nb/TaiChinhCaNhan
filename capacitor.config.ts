import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taixiucanhan.app',
  appName: 'Expense Tracker',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: true,
      iosKeychainPrefix: 'taixiucanhan',
      iosBiometric: {
        biometricAuth: true,
        biometricTitle: 'Unlock Expense Tracker',
      },
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: true,
        biometricTitle: 'Unlock Expense Tracker',
        biometricSubTitle: 'Verify before opening your encrypted database',
      },
    },
  },
};

export default config;

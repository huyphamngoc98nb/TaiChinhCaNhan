import { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor app configuration.
 * Version info được quản lý tập trung tại version.config.json (xem docs/versioning.md).
 * appId và appName KHÔNG thay đổi giữa các release.
 */
const config: CapacitorConfig = {
  appId: 'com.taixiucanhan.app',
  appName: 'Expense Tracker',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    // Placeholder cho UpdateService plugin (Sprint 1.2+)
    // SplashScreen, Filesystem, App plugins sử dụng default config
  },
};

export default config;

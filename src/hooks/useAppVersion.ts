/**
 * useAppVersion.ts
 * React hook tổng hợp version info từ cả native layer (Capacitor) và web layer.
 * Dùng để hiển thị ở màn hình About/Settings và làm input cho UpdateCoordinator.
 */

import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { getBundleVersionInfo, type BundleVersionInfo } from '../config/appVersion';

export interface AppVersionInfo {
  /** Version hiển thị cho người dùng, đọc từ native. VD: "0.1.0" */
  nativeVersionName: string;
  /** Build number tăng dần, đọc từ native. VD: 100 */
  nativeVersionCode: number;
  /** Bundle OTA version. VD: "0.1.0-b1" */
  bundleVersion: string;
  /** Thời điểm bundle được build */
  builtAt: string;
  /** Đang load */
  loading: boolean;
  /** Lỗi nếu có */
  error: string | null;
}

const DEFAULT_STATE: AppVersionInfo = {
  nativeVersionName: '',
  nativeVersionCode: 0,
  bundleVersion: '',
  builtAt: '',
  loading: true,
  error: null,
};

export function useAppVersion(): AppVersionInfo {
  const [info, setInfo] = useState<AppVersionInfo>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Đọc song song: native info + bundle manifest
        const [appInfo, bundleInfo]: [{ version: string; build: string }, BundleVersionInfo] =
          await Promise.all([
            App.getInfo(),
            getBundleVersionInfo(),
          ]);

        if (!cancelled) {
          setInfo({
            nativeVersionName: appInfo.version,
            nativeVersionCode: parseInt(appInfo.build, 10),
            bundleVersion: bundleInfo.bundleVersion,
            builtAt: bundleInfo.builtAt,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setInfo((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error loading version info',
          }));
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

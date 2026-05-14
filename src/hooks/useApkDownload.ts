import { useCallback, useEffect, useState } from 'react';
import {
  apkDownloadService,
  type ApkDownloadInput,
  type ApkDownloadState,
} from '@/services/apkDownloadService';

export function useApkDownload() {
  const [state, setState] = useState<ApkDownloadState>(() => apkDownloadService.getState());

  useEffect(() => apkDownloadService.subscribe(setState), []);

  const start = useCallback((input: ApkDownloadInput) => apkDownloadService.start(input), []);
  const dismiss = useCallback(() => apkDownloadService.cancel(), []);

  return {
    state,
    start,
    dismiss,
    isVisible: state.status === 'downloading' || state.status === 'error',
  };
}

import { Download, X } from 'lucide-react';
import type { ApkDownloadState } from '@/services/apkDownloadService';

interface ApkDownloadProgressProps {
  state: ApkDownloadState;
  onDismiss?: () => void;
}

function formatKilobytesPerSecond(bytesPerSecond: number): string {
  return `${Math.max(bytesPerSecond / 1024, 0).toFixed(0)} KB/s`;
}

function formatRemaining(downloadedBytes: number, totalBytes: number | null): string {
  if (!totalBytes || totalBytes <= downloadedBytes) {
    return '0 KB còn lại';
  }

  const remainingKb = Math.ceil((totalBytes - downloadedBytes) / 1024);
  return `${remainingKb.toLocaleString('vi-VN')} KB còn lại`;
}

function getPercentage(downloadedBytes: number, totalBytes: number | null): number {
  if (!totalBytes || totalBytes <= 0) {
    return 0;
  }

  return Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100);
}

export function ApkDownloadProgress({ state, onDismiss }: ApkDownloadProgressProps) {
  const percentage = getPercentage(state.downloadedBytes, state.totalBytes);
  const isForceUpdate = state.mandatory;
  const isVisible = state.status === 'downloading' || state.status === 'error';

  if (!isVisible) {
    return null;
  }

  const content = (
    <section
      className="w-full max-w-md bg-white p-5 shadow-2xl"
      aria-label="Tiến trình tải APK"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Download size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Đang tải bản cập nhật</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isForceUpdate ? 'Cập nhật bắt buộc. Vui lòng đợi...' : 'Bạn vẫn có thể tiếp tục dùng ứng dụng.'}
            </p>
          </div>
        </div>

        {!isForceUpdate && onDismiss ? (
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onDismiss}
            aria-label="Để sau"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        className="h-3 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Tiến trình tải APK"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-200"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">{percentage}%</span>
        <span>{formatKilobytesPerSecond(state.bytesPerSecond)}</span>
        <span>{formatRemaining(state.downloadedBytes, state.totalBytes)}</span>
      </div>

      {state.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          Tải cập nhật bị gián đoạn. Ứng dụng sẽ tiếp tục khi có kết nối.
        </p>
      ) : null}

      {!isForceUpdate && onDismiss ? (
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          onClick={onDismiss}
        >
          Để sau
        </button>
      ) : null}
    </section>
  );

  if (isForceUpdate) {
    return (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 px-4 pb-4">
        <div className="w-full max-w-md overflow-hidden rounded-t-2xl">{content}</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex justify-center px-4 pb-4">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl">{content}</div>
    </div>
  );
}

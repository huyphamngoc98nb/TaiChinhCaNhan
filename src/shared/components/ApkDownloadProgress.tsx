import type { CSSProperties } from 'react';
import { useApkDownload } from '@/hooks/useApkDownload';

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.max(bytes, 0).toFixed(0)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bps: number): string {
  if (bps < 1024) {
    return `${Math.max(bps, 0).toFixed(0)} B/s`;
  }

  if (bps < 1024 * 1024) {
    return `${(bps / 1024).toFixed(1)} KB/s`;
  }

  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function getPercentage(downloadedBytes: number, totalBytes: number | null): number {
  if (!totalBytes || totalBytes <= 0) {
    return 0;
  }

  return Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100);
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    left: '16px',
    right: '16px',
    bottom: '70px',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  panel: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '12px',
    background: '#1e293b',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    color: '#f1f5f9',
    padding: '16px',
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.35,
  },
  progressTrack: {
    width: '100%',
    height: '8px',
    overflow: 'hidden',
    borderRadius: '999px',
    background: '#334155',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    marginTop: '10px',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.35,
  },
  percent: {
    color: '#f1f5f9',
    fontWeight: 700,
  },
  error: {
    margin: '10px 0 0',
    color: '#ef4444',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  dismissButton: {
    flex: '0 0 auto',
    border: '1px solid #475569',
    borderRadius: '8px',
    background: 'transparent',
    color: '#f1f5f9',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    padding: '7px 10px',
  },
};

export function ApkDownloadProgress() {
  const { state, dismiss, isVisible } = useApkDownload();

  if (!isVisible) {
    return null;
  }

  const percentage = getPercentage(state.downloadedBytes, state.totalBytes);
  const percentageText = state.totalBytes === null ? '...' : `${percentage}%`;
  const totalText = state.totalBytes === null ? '...' : formatBytes(state.totalBytes);
  const title = state.mandatory ? '🔒 Cập nhật bắt buộc' : '⬇️ Đang tải bản cập nhật';
  const canDismiss = !state.mandatory && state.status !== 'error';

  return (
    <div style={styles.overlay}>
      <section style={styles.panel} aria-label="Tiến trình tải bản cập nhật">
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {canDismiss ? (
            <button type="button" style={styles.dismissButton} onClick={dismiss}>
              Để sau
            </button>
          ) : null}
        </div>

        <div
          role="progressbar"
          aria-label="Tiến trình tải APK"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          style={styles.progressTrack}
        >
          <div style={{ ...styles.progressFill, width: `${percentage}%` }} />
        </div>

        <div style={styles.meta}>
          <span style={styles.percent}>{percentageText}</span>
          <span>{formatSpeed(state.bytesPerSecond)}</span>
          <span>
            {formatBytes(state.downloadedBytes)} / {totalText}
          </span>
        </div>

        {state.status === 'error' ? (
          <p role="alert" style={styles.error}>
            Tải thất bại. Vui lòng thử lại.
          </p>
        ) : null}
      </section>
    </div>
  );
}

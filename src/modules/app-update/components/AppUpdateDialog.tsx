import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';
import { useLanguage } from '@/shared/context/LanguageContext';
import { registerAppBackHandler } from '@/shared/utils/app-back-stack';
import type {
  AndroidLatestRelease,
  AppUpdateDownloadProgress,
  UpdateInstallState,
} from '../types/app-update.types';
import '@/shared/components/ConfirmDialog/ConfirmDialog.css';
import './AppUpdateDialog.css';

type AppUpdateDialogProps = {
  latest: AndroidLatestRelease;
  currentVersionCode: number;
  mandatory: boolean;
  installState: UpdateInstallState;
  isUpdating: boolean;
  progress: AppUpdateDownloadProgress | null;
  error: string | null;
  onUpdate: () => void;
  onDismiss: () => void;
};

export function AppUpdateDialog({
  latest,
  currentVersionCode,
  mandatory,
  installState,
  isUpdating,
  progress,
  error,
  onUpdate,
  onDismiss,
}: AppUpdateDialogProps) {
  const { t } = useLanguage();
  const releaseSummary = latest.releaseSummary?.trim();
  const releaseNoteSections = (latest.releaseNoteSections ?? []).filter(
    (section) => section.items.length > 0,
  );
  const releaseNotes = (latest.releaseNotes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);
  const hasStructuredSections = releaseNoteSections.length > 0;
  const visibleReleaseNotes = releaseNotes.length > 0
    ? releaseNotes
    : releaseSummary || hasStructuredSections
      ? []
      : [t('app_update.default_release_note')];
  const isRetry = installState === 'error' || installState === 'permission_required';
  const dialogRef = useRef<HTMLElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);

  useEffect(() => registerAppBackHandler(() => true), []);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    function focusFirstDialogControl() {
      const focusable = getFocusableElements(dialogRef.current);
      (focusable[0] ?? dialogRef.current)?.focus();
    }

    if (primaryButtonRef.current?.disabled) {
      dialogRef.current?.focus();
    } else {
      primaryButtonRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialogRef.current?.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialogRef.current?.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        focusFirstDialogControl();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      className="confirm-overlay"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <section
        ref={dialogRef}
        className="confirm-dialog app-update-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-update-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-content app-update-content">
          <h2 id="app-update-title" className="confirm-title">
            {t('app_update.update_available_title')}
          </h2>

          <p className="app-update-version">
            {t('app_update.latest_version')}: {latest.versionName} ({latest.versionCode})
          </p>
          <p className="app-update-current-version">
            {t('app_update.current_version_code')}: {currentVersionCode}
          </p>

          {mandatory && (
            <p className="app-update-mandatory">
              {t('app_update.mandatory_message')}
            </p>
          )}

          <div className="app-update-notes">
            <h3>{t('app_update.release_notes')}</h3>
            {releaseSummary && (
              <p className="app-update-release-summary">{releaseSummary}</p>
            )}

            {hasStructuredSections ? (
              <div className="app-update-note-sections">
                {releaseNoteSections.map((section, sectionIndex) => {
                  const headingId = `app-update-note-section-${sectionIndex}`;
                  return (
                    <section
                      key={`${section.type}-${sectionIndex}`}
                      className="app-update-note-section"
                      aria-labelledby={headingId}
                    >
                      <h4 id={headingId}>{section.title}</h4>
                      <ul>
                        {section.items.map((item, itemIndex) => (
                          <li key={`${item.title}-${itemIndex}`}>
                            <strong className="app-update-note-item-title">
                              {item.title}
                            </strong>
                            {item.description && (
                              <p className="app-update-note-item-description">
                                {item.description}
                              </p>
                            )}
                            {item.impact && (
                              <p className="app-update-note-item-impact">{item.impact}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : (
              visibleReleaseNotes.length > 0 && (
                <ul>
                  {visibleReleaseNotes.map((note, index) => (
                    <li key={`${index}-${note}`}>{note}</li>
                  ))}
                </ul>
              )
            )}
          </div>

          {isUpdating && (
            <div className="app-update-progress" aria-live="polite">
              <div className="app-update-progress-label">
                <span>
                  {installState === 'verifying'
                    ? t('app_update.verifying')
                    : t('app_update.downloading')}
                </span>
                {progress && progress.percent >= 0 && <strong>{progress.percent}%</strong>}
              </div>

              {progress && progress.percent >= 0 ? (
                <div
                  className="app-update-progress-track"
                  role="progressbar"
                  aria-label={t('app_update.downloading')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div
                    className="app-update-progress-value"
                    style={{
                      transform: `scaleX(${Math.min(Math.max(progress.percent, 0), 100) / 100})`,
                    }}
                  />
                </div>
              ) : (
                <div className="app-update-progress-indeterminate" role="status" />
              )}

              {progress && progress.percent < 0 && (
                <p className="app-update-progress-bytes">
                  {t('app_update.downloaded')}: {formatBytes(progress.bytesDownloaded)}
                </p>
              )}
            </div>
          )}

          {installState === 'installer_opened' && (
            <p className="app-update-success" role="status">
              {t('app_update.installer_opened')}
            </p>
          )}

          {error && <p className="app-update-error" role="alert">{error}</p>}
        </div>

        <div className="confirm-actions">
          {!mandatory && (
            <button
              type="button"
              className="confirm-button"
              onClick={onDismiss}
              disabled={isUpdating}
            >
              {t('app_update.skip_this_version')}
            </button>
          )}
          <button
            ref={primaryButtonRef}
            type="button"
            className="confirm-button app-update-primary-button"
            onClick={onUpdate}
            disabled={isUpdating}
          >
            {isUpdating
              ? t('app_update.updating')
              : isRetry
                ? t('app_update.retry')
                : t('app_update.update_now')}
          </button>
        </div>
      </section>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  ));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

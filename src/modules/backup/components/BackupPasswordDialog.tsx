import { FormEvent, useState } from 'react';
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';
import '@/shared/components/ConfirmDialog/ConfirmDialog.css';

interface BackupPasswordDialogProps {
  title: string;
  label: string;
  warning: string;
  submitText: string;
  cancelText: string;
  loading: boolean;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function BackupPasswordDialog({
  title,
  label,
  warning,
  submitText,
  cancelText,
  loading,
  onSubmit,
  onCancel,
}: BackupPasswordDialogProps) {
  const [password, setPassword] = useState('');
  useBodyScrollLock(true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password && !loading) void onSubmit(password);
  };

  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <form className="confirm-dialog" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="confirm-content" style={{ textAlign: 'left' }}>
          <h3 className="confirm-title">{title}</h3>
          <label style={{ display: 'grid', gap: '6px', marginTop: '16px', fontSize: '0.9rem' }}>
            <span>{label}</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </label>
          <p className="confirm-message" style={{ textAlign: 'left', marginBottom: 0 }}>
            {warning}
          </p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-button" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button type="submit" className="confirm-button confirm-button-danger" disabled={!password || loading}>
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
}

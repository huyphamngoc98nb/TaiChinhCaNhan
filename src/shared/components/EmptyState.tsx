import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', textAlign: 'center' }}>
      {icon && <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{icon}</div>}
      <h3 style={{ marginBottom: '8px', color: 'var(--text)' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

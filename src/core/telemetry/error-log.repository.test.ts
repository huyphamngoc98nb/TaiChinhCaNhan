import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDbConnection, isDatabaseReady } from '@/core/db/sqlite/connection';
import { ErrorLogRepository, readPendingErrorLogs } from './error-log.repository';
import type { StructuredLogEntry } from './logger';

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
  isDatabaseReady: vi.fn(),
}));

describe('ErrorLogRepository', () => {
  const entry: StructuredLogEntry = {
    level: 'error',
    message: 'Restore failed',
    context: 'BackupPage.confirm_restore',
    metadata: { action: 'confirm_restore' },
    created_at: 123,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('stores logs as pending when the database is not ready', async () => {
    vi.mocked(isDatabaseReady).mockResolvedValue(false);

    await new ErrorLogRepository().append(entry);

    expect(readPendingErrorLogs()).toEqual([entry]);
    expect(getDbConnection).not.toHaveBeenCalled();
  });

  it('keeps a pending copy when database insertion fails', async () => {
    vi.mocked(isDatabaseReady).mockResolvedValue(true);
    vi.mocked(getDbConnection).mockResolvedValue({
      run: vi.fn().mockRejectedValue(new Error('database is locked')),
    } as any);

    await expect(new ErrorLogRepository().append(entry)).rejects.toThrow('database is locked');

    expect(readPendingErrorLogs()).toEqual([entry]);
  });
});

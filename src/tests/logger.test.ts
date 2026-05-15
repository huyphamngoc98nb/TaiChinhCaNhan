import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorLogRepository } from '@/core/telemetry/error-log.repository';
import * as connection from '@/core/db/sqlite/connection';

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
  isDatabaseReady: vi.fn(),
}));

describe('ErrorLogRepository', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      query: vi.fn().mockResolvedValue({ values: [] }),
    };
    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb);
  });

  it('does not write when database is not ready', async () => {
    vi.mocked(connection.isDatabaseReady).mockResolvedValue(false);

    await new ErrorLogRepository().append({
      level: 'error',
      message: 'Boom',
      created_at: 1,
    });

    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('persists structured error log entries', async () => {
    vi.mocked(connection.isDatabaseReady).mockResolvedValue(true);

    await new ErrorLogRepository().append({
      level: 'error',
      message: 'Boom',
      context: 'test',
      stack: 'stacktrace',
      metadata: { route: '/dashboard' },
      created_at: 1,
    });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO error_logs'),
      expect.arrayContaining([
        'error',
        'Boom',
        'test',
        'stacktrace',
        JSON.stringify({ route: '/dashboard' }),
        1,
      ])
    );
  });
});

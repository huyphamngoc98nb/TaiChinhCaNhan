import { describe, it, expect, vi } from 'vitest';
import { BuildExportDatasetUseCase } from '@/modules/export/services/build-export-dataset';
import { exportToCsv } from '@/modules/export/services/export-excel';
import { exportErrorLogsToJson } from '@/modules/export/services/export-error-logs';

describe('Export Module Tests', () => {
  describe('BuildExportDatasetUseCase', () => {
    it('aggregates data correctly from multiple repositories', async () => {
      const mockReportRepo: any = {
        getCashflowSummary: vi.fn().mockResolvedValue({ totalIncome: 100, totalExpense: 50, netAmount: 50 }),
        getCategorySummary: vi.fn().mockResolvedValue([]),
        getPeriodSummary: vi.fn().mockResolvedValue([]),
      };
      const mockTransactionRepo: any = {
        list: vi.fn().mockResolvedValue([{ id: '1', amount: 10, type: 'expense' }]),
      };

      const useCase = new BuildExportDatasetUseCase(mockReportRepo, mockTransactionRepo);
      const range = { startDate: 0, endDate: 1000 };
      const result = await useCase.execute(range);

      expect(result.cashflow.totalIncome).toBe(100);
      expect(result.rawTransactions).toHaveLength(1);
      expect(mockReportRepo.getCashflowSummary).toHaveBeenCalledWith(range);
    });
  });

  describe('CSV Export Logic', () => {
    it('generates a valid CSV string with headers and escaped notes', () => {
      const dataset: any = {
        rawTransactions: [
          {
            id: 'tx-1',
            transaction_date: new Date('2024-01-01').getTime(),
            wallet_name: 'Cash',
            wallet_currency: 'VND',
            wallet_id: 'wallet-1',
            category_id: 'category-1',
            category_name: 'Food',
            type: 'expense',
            amount: 15.5,
            note: 'Pizza "night"',
            created_at: new Date('2024-01-01T01:00:00.000Z').getTime(),
            updated_at: new Date('2024-01-01T02:00:00.000Z').getTime(),
          }
        ]
      };

      const csv = exportToCsv(dataset);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('id,date,type,amount,currency,wallet/account,category,note,tags,createdAt,updatedAt');
      expect(lines[1]).toContain('2024-01-01');
      expect(lines[1]).toContain('Food');
      expect(lines[1]).toContain('VND');
      expect(lines[1]).toContain('"Pizza ""night"""');
    });

    it('handles empty datasets gracefully', () => {
      const dataset: any = { rawTransactions: [] };
      const csv = exportToCsv(dataset);
      expect(csv).toBe('id,date,type,amount,currency,wallet/account,category,note,tags,createdAt,updatedAt');
    });
  });

  describe('Error Log JSON Export', () => {
    it('exports structured error logs with parsed metadata', () => {
      const json = exportErrorLogsToJson([
        {
          id: 'err_1',
          level: 'error',
          message: 'Boom',
          context: 'GlobalErrorBoundary',
          stack: 'stacktrace',
          metadata_json: JSON.stringify({ route: '/dashboard' }),
          created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
        },
      ]);

      const payload = JSON.parse(json);

      expect(payload.schema_version).toBe(1);
      expect(payload.count).toBe(1);
      expect(payload.logs[0]).toMatchObject({
        id: 'err_1',
        level: 'error',
        message: 'Boom',
        context: 'GlobalErrorBoundary',
        metadata: { route: '/dashboard' },
        created_at_iso: '2024-01-01T00:00:00.000Z',
      });
    });
  });
});

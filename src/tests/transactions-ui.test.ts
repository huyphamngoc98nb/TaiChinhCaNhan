import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiptStorageService } from '../core/files/receipt-storage';
import { CreateTransactionUseCase } from '../modules/transactions/services/create-transaction';
import { UpdateTransactionUseCase } from '../modules/transactions/services/update-transaction';
import { getDbConnection } from '@/core/db/sqlite/connection';

// Mock dependencies
vi.mock('@/core/files/receipt-storage', () => ({
  ReceiptStorageService: {
    saveReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
    getReceiptDataUrl: vi.fn(),
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

vi.mock('@/core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: { saveToStore: vi.fn() },
}));

const walletRow = {
  id: 'w1',
  name: 'Cash',
  currency: 'VND',
  balance: 10_000,
  account_type: 'cash',
  icon: null,
  color: null,
  sort_order: 0,
  is_active: 1,
  exclude_from_total: 0,
  credit_limit: null,
  statement_day: null,
  due_day: null,
  created_at: 0,
  updated_at: 0,
};

const mockDb = {
  query: vi.fn(async () => ({ values: [walletRow] })),
  run: vi.fn(async () => ({ changes: { changes: 1 } })),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBaseInput(overrides = {}) {
  return {
    wallet_id: 'w1',
    category_id: 'c1',
    type: 'expense' as const,
    amount: 100,
    transaction_date: Date.now(),
    ...overrides,
  };
}

const existingWithReceipt = {
  id: 't1',
  wallet_id: 'w1',
  category_id: 'c1',
  type: 'expense' as const,
  amount: 100,
  note: null,
  receipt_path: 'receipts/old.jpg',
  transaction_date: Date.now(),
  created_at: Date.now(),
  updated_at: Date.now(),
  deleted_at: null,
};

const existingNoReceipt = { ...existingWithReceipt, receipt_path: null };

// ---------------------------------------------------------------------------
// CreateTransactionUseCase – receipt handling
// ---------------------------------------------------------------------------
describe('CreateTransactionUseCase – receipt handling', () => {
  let mockRepo: any;
  let createUseCase: CreateTransactionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.mockResolvedValue({ values: [walletRow] });
    mockDb.run.mockResolvedValue({ changes: { changes: 1 } });
    vi.mocked(getDbConnection).mockResolvedValue(mockDb as any);
    mockRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    createUseCase = new CreateTransactionUseCase(mockRepo);
  });

  it('saves receipt and stores path when base64 provided', async () => {
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('receipts/new.jpg');

    const res = await createUseCase.execute(makeBaseInput(), 'base64data');

    expect(ReceiptStorageService.saveReceipt).toHaveBeenCalledWith('base64data');
    expect(res.receipt_path).toBe('receipts/new.jpg');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('does not call saveReceipt when no base64 provided', async () => {
    await createUseCase.execute(makeBaseInput());

    expect(ReceiptStorageService.saveReceipt).not.toHaveBeenCalled();
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('deletes orphaned receipt if DB create fails', async () => {
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('receipts/orphaned.jpg');
    mockRepo.create.mockRejectedValue(new Error('DB Error'));

    await expect(createUseCase.execute(makeBaseInput(), 'base64data'))
      .rejects.toThrow('DB Error');

    expect(ReceiptStorageService.saveReceipt).toHaveBeenCalled();
    expect(ReceiptStorageService.deleteReceipt).toHaveBeenCalledWith('receipts/orphaned.jpg');
  });

  it('does NOT call deleteReceipt if no receipt was saved (no base64) and DB fails', async () => {
    mockRepo.create.mockRejectedValue(new Error('DB Error'));

    await expect(createUseCase.execute(makeBaseInput())).rejects.toThrow('DB Error');

    expect(ReceiptStorageService.deleteReceipt).not.toHaveBeenCalled();
  });

  it('receipt_path from input is used as fallback when no base64 given', async () => {
    const input = makeBaseInput({ receipt_path: 'receipts/existing.jpg' });
    await createUseCase.execute(input);

    const callArgs = mockRepo.create.mock.calls[0][0];
    expect(callArgs.receipt_path).toBe('receipts/existing.jpg');
  });
});

// ---------------------------------------------------------------------------
// UpdateTransactionUseCase – receipt handling
// ---------------------------------------------------------------------------
describe('UpdateTransactionUseCase – receipt handling', () => {
  let mockRepo: any;
  let updateUseCase: UpdateTransactionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.mockResolvedValue({ values: [walletRow] });
    mockDb.run.mockResolvedValue({ changes: { changes: 1 } });
    vi.mocked(getDbConnection).mockResolvedValue(mockDb as any);
    mockRepo = {
      getById: vi.fn().mockResolvedValue(existingWithReceipt),
      update: vi.fn().mockImplementation((_id, data) =>
        Promise.resolve({ ...existingWithReceipt, ...data })
      ),
    };
    updateUseCase = new UpdateTransactionUseCase(mockRepo);
  });

  it('replaces old receipt with new one on successful update', async () => {
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('receipts/new2.jpg');
    mockRepo.update.mockResolvedValue({ ...existingWithReceipt, receipt_path: 'receipts/new2.jpg' });

    await updateUseCase.execute('t1', { amount: 200 }, 'newbase64data');

    expect(ReceiptStorageService.saveReceipt).toHaveBeenCalledWith('newbase64data');
    expect(mockRepo.update).toHaveBeenCalled();
    // Old receipt must be deleted after successful DB write
    expect(ReceiptStorageService.deleteReceipt).toHaveBeenCalledWith('receipts/old.jpg');
  });

  it('deletes newly-saved receipt if DB update fails', async () => {
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('receipts/orphaned2.jpg');
    mockRepo.update.mockRejectedValue(new Error('DB Error Update'));

    await expect(updateUseCase.execute('t1', { amount: 200 }, 'newbase64data'))
      .rejects.toThrow('DB Error Update');

    expect(ReceiptStorageService.saveReceipt).toHaveBeenCalled();
    expect(mockRepo.update).toHaveBeenCalled();
    expect(ReceiptStorageService.deleteReceipt).toHaveBeenCalledWith('receipts/orphaned2.jpg');
  });

  it('does NOT delete old receipt when no new receipt base64 provided', async () => {
    // Update only the amount, no new file upload
    await updateUseCase.execute('t1', { amount: 300 });

    expect(ReceiptStorageService.saveReceipt).not.toHaveBeenCalled();
    expect(ReceiptStorageService.deleteReceipt).not.toHaveBeenCalled();
  });

  it('does NOT call deleteReceipt for old record when old receipt_path is null', async () => {
    // Transaction never had a receipt; uploading one for the first time
    mockRepo.getById.mockResolvedValue(existingNoReceipt);
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('receipts/brand-new.jpg');

    await updateUseCase.execute('t1', { amount: 100 }, 'newbase64');

    expect(ReceiptStorageService.saveReceipt).toHaveBeenCalled();
    // No old path to delete
    expect(ReceiptStorageService.deleteReceipt).not.toHaveBeenCalled();
  });

  it('throws Transaction not found before any file operations when id is missing', async () => {
    mockRepo.getById.mockResolvedValue(null);

    await expect(updateUseCase.execute('ghost-id', { amount: 50 }, 'base64'))
      .rejects.toThrow('Transaction not found');

    // receipt save should NOT have been attempted before the not-found check
    // Note: current implementation calls getById BEFORE saveReceipt – this is correct
    expect(ReceiptStorageService.saveReceipt).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Receipt storage service – edge cases (mocked at call boundary)
// ---------------------------------------------------------------------------
describe('ReceiptStorageService – boundary behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.mockResolvedValue({ values: [walletRow] });
    mockDb.run.mockResolvedValue({ changes: { changes: 1 } });
    vi.mocked(getDbConnection).mockResolvedValue(mockDb as any);
  });

  it('saveReceipt returning undefined would cause receipt_path to be undefined', async () => {
    // Documenting: if saveReceipt ever returns undefined (wrong override),
    // the create service would store undefined as receipt_path.
    // Guarded by TypeScript return type Promise<string>.
    vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue(undefined as any);

    const mockRepo: any = {
      create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const createUseCase = new CreateTransactionUseCase(mockRepo);

    const result = await createUseCase.execute(
      {
        wallet_id: 'w1', category_id: 'c1', type: 'expense',
        amount: 100, transaction_date: Date.now(),
      },
      'somebase64'
    );

    // receipt_path will be the fallback: input.receipt_path (undefined) so the stored value
    // is undefined — which then becomes null via the mapper. This test pins the behavior.
    expect(result.receipt_path == null).toBe(true);
  });
});

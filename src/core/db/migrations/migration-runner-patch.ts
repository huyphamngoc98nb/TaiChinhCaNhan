/**
 * Patch cho migration-runner: thêm hàm kiểm tra SQLite version
 * và guard DROP COLUMN cho migration 012b.
 *
 * Tích hợp vào migration-runner.ts hiện có bằng cách import và gọi
 * runDropBudgetColumnsIfSupported() sau khi migration 012 hoàn thành.
 */
import { getDbConnection } from '@/core/db/sqlite/connection';

/** Lấy major.minor.patch của SQLite đang dùng */
export async function getSQLiteVersion(): Promise<{ raw: string; major: number; minor: number; patch: number }> {
  const db = await getDbConnection();
  const { values } = await db.query('SELECT sqlite_version() AS ver');
  const raw: string = values?.[0]?.ver ?? '0.0.0';
  const [major = 0, minor = 0, patch = 0] = raw.split('.').map(Number);
  return { raw, major, minor, patch };
}

/** Trả về true nếu DROP COLUMN được hỗ trợ (SQLite >= 3.35.0) */
export async function supportsDropColumn(): Promise<boolean> {
  const { major, minor } = await getSQLiteVersion();
  return major > 3 || (major === 3 && minor >= 35);
}

/**
 * Chạy migration 012b (DROP COLUMN budget_amount, budget_period)
 * chỉ khi SQLite >= 3.35. Nếu không, log warning và bỏ qua.
 *
 * @example
 * // Trong migration-runner.ts, sau khi chạy 012:
 * await runDropBudgetColumnsIfSupported();
 */
export async function runDropBudgetColumnsIfSupported(): Promise<void> {
  const db = await getDbConnection();
  const supported = await supportsDropColumn();

  if (!supported) {
    const { raw } = await getSQLiteVersion();
    console.warn(
      `[Migration 012b] DROP COLUMN skipped: SQLite ${raw} < 3.35.0. ` +
      'Columns budget_amount/budget_period remain in categories table but are ignored by application.'
    );
    return;
  }

  try {
    await db.execute('ALTER TABLE categories DROP COLUMN IF EXISTS budget_amount;');
    await db.execute('ALTER TABLE categories DROP COLUMN IF EXISTS budget_period;');
    console.info('[Migration 012b] Dropped budget_amount and budget_period from categories.');
  } catch (err) {
    // Cột đã bị xoá trước đó → bỏ qua
    console.warn('[Migration 012b] Columns may already be dropped:', err);
  }
}

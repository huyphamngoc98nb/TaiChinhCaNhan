import { getDbConnection } from '../sqlite/connection';
import { logger } from '@/core/telemetry/logger';

type DefaultCategoryType = 'income' | 'expense';

interface DefaultCategory {
  id: string;
  name: string;
  type: DefaultCategoryType;
  icon: string;
  color: string;
}

const TRANSFER_CATEGORY_ID = 'cat-transfer';

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { id: 'cat-inc-1', name: 'Salary',          type: 'income',  icon: 'briefcase',    color: '#10b981' },
  { id: 'cat-inc-2', name: 'Investments',     type: 'income',  icon: 'trending-up',  color: '#3b82f6' },
  { id: 'cat-exp-1', name: 'Food & Dining',   type: 'expense', icon: 'coffee',       color: '#f59e0b' },
  { id: 'cat-exp-2', name: 'Shopping',        type: 'expense', icon: 'shopping-bag', color: '#ec4899' },
  { id: 'cat-exp-3', name: 'Transport',       type: 'expense', icon: 'truck',        color: '#6366f1' },
  { id: 'cat-exp-4', name: 'Bills & Utilities', type: 'expense', icon: 'zap',        color: '#ef4444' },
  { id: TRANSFER_CATEGORY_ID, name: 'Transfer', type: 'expense', icon: 'arrow-left-right', color: '#6366f1' },
];

async function insertDefaultCategories(
  db: Awaited<ReturnType<typeof getDbConnection>>,
  categories: DefaultCategory[],
  now: number
) {
  for (const cat of categories) {
    await db.run(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.type, cat.icon, cat.color, now, now]
    );
  }
}

export async function seedDefaultData() {
  const db = await getDbConnection();
  const now = Date.now();

  // Seed each category group independently. Migration 019 may create only the
  // transfer category, so an app can still be missing user-facing defaults.
  const incomeDefaults = DEFAULT_CATEGORIES.filter((cat) => cat.type === 'income');
  const expenseDefaults = DEFAULT_CATEGORIES.filter((cat) => cat.type === 'expense');

  const { values: incomeCategories } = await db.query(
    'SELECT id FROM categories WHERE type = ? LIMIT 1',
    ['income']
  );
  if (!incomeCategories || incomeCategories.length === 0) {
    logger.info('Seeding default income categories...');
    await insertDefaultCategories(db, incomeDefaults, now);
  }

  const { values: expenseCategories } = await db.query(
    'SELECT id FROM categories WHERE type = ? AND id <> ? LIMIT 1',
    ['expense', TRANSFER_CATEGORY_ID]
  );
  if (!expenseCategories || expenseCategories.length === 0) {
    logger.info('Seeding default expense categories...');
    await insertDefaultCategories(db, expenseDefaults, now);
  }
}

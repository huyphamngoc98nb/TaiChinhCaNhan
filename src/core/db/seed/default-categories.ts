import { getDbConnection } from '../sqlite/connection';
import { logger } from '@/core/telemetry/logger';

interface DefaultWallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  account_type: string;
  icon: string;
  color: string;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
}

const DEFAULT_WALLETS: DefaultWallet[] = [
  {
    id: 'wallet-cash-1',
    name: 'Tiền mặt',
    currency: 'VND',
    balance: 0,
    account_type: 'cash',
    icon: '💵',
    color: '#4CAF50',
    credit_limit: null,
    statement_day: null,
    due_day: null,
  },
  {
    id: 'wallet-bank-1',
    name: 'MB Bank',
    currency: 'VND',
    balance: 0,
    account_type: 'bank',
    icon: '🏦',
    color: '#2196F3',
    credit_limit: null,
    statement_day: null,
    due_day: null,
  },
  {
    id: 'wallet-ewallet-1',
    name: 'MoMo',
    currency: 'VND',
    balance: 0,
    account_type: 'e_wallet',
    icon: '📱',
    color: '#E91E63',
    credit_limit: null,
    statement_day: null,
    due_day: null,
  },
  {
    id: 'wallet-cc-1',
    name: 'Visa TCB',
    currency: 'VND',
    balance: 0,
    account_type: 'credit_card',
    icon: '💳',
    color: '#FF9800',
    credit_limit: 50_000_000,
    statement_day: 15,
    due_day: 5,
  },
];

const DEFAULT_CATEGORIES = [
  { id: 'cat-inc-1', name: 'Salary',          type: 'income',  icon: 'briefcase',    color: '#10b981' },
  { id: 'cat-inc-2', name: 'Investments',     type: 'income',  icon: 'trending-up',  color: '#3b82f6' },
  { id: 'cat-exp-1', name: 'Food & Dining',   type: 'expense', icon: 'coffee',       color: '#f59e0b' },
  { id: 'cat-exp-2', name: 'Shopping',        type: 'expense', icon: 'shopping-bag', color: '#ec4899' },
  { id: 'cat-exp-3', name: 'Transport',       type: 'expense', icon: 'truck',        color: '#6366f1' },
  { id: 'cat-exp-4', name: 'Bills & Utilities', type: 'expense', icon: 'zap',        color: '#ef4444' },
];

export async function seedDefaultData() {
  const db = await getDbConnection();
  const now = Date.now();

  // Seed default wallets (only when table is empty)
  const { values: wallets } = await db.query('SELECT id FROM wallets LIMIT 1');
  if (!wallets || wallets.length === 0) {
    logger.info('Seeding default wallets...');
    for (let i = 0; i < DEFAULT_WALLETS.length; i++) {
      const w = DEFAULT_WALLETS[i];
      await db.run(
        `INSERT INTO wallets
           (id, name, currency, balance, account_type, icon, color,
            sort_order, is_active, exclude_from_total,
            credit_limit, statement_day, due_day,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`,
        [
          w.id, w.name, w.currency, w.balance,
          w.account_type, w.icon, w.color,
          i,            // sort_order
          w.credit_limit,
          w.statement_day,
          w.due_day,
          now, now,
        ]
      );
    }
  }

  // Seed default categories (only when table is empty)
  const { values: categories } = await db.query('SELECT id FROM categories LIMIT 1');
  if (!categories || categories.length === 0) {
    logger.info('Seeding default categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      await db.run(
        'INSERT INTO categories (id, name, type, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.type, cat.icon, cat.color, now, now]
      );
    }
  }
}

import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { SQLiteCategoryRepository } from '../repositories/sqlite-category.repository';
import type { Category, CategoryInput, CategoryType } from '../domain/category.model';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function persistWeb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const { sqlite } = await import('@/core/db/sqlite/pragmas');
    await sqlite.saveToStore(DB_NAME);
  }
}

function normalizeInput(input: CategoryInput): CategoryInput {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Tên danh mục không được để trống.');
  }
  if (!['income', 'expense'].includes(input.type)) {
    throw new Error('Loại danh mục không hợp lệ.');
  }

  return {
    name,
    type: input.type,
    icon: input.icon?.trim() || null,
    color: input.color || null,
    description: input.description?.trim() || null,
  };
}

export class CategoryService {
  constructor(private readonly repository = new SQLiteCategoryRepository()) {}

  list(type?: CategoryType): Promise<Category[]> {
    return this.repository.list(type);
  }

  async create(input: CategoryInput): Promise<void> {
    const data = normalizeInput(input);
    await this.repository.create(generateId(), data, Date.now());
    await persistWeb();
  }

  async update(id: string, input: CategoryInput): Promise<void> {
    const data = normalizeInput(input);
    await this.repository.update(id, data, Date.now());
    await persistWeb();
  }

  async delete(id: string): Promise<void> {
    const counts = await this.repository.getReferenceCounts(id);
    const totalReferences = counts.transactions + counts.recurringBills + counts.budgets;
    if (totalReferences > 0) {
      throw new Error('Không thể xóa danh mục đang được dùng trong giao dịch, hóa đơn hoặc ngân sách.');
    }

    await this.repository.delete(id);
    await persistWeb();
  }
}

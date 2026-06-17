import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '@/core/db/sqlite/connection';
import { translations, type TranslationPath } from '@/shared/constants/translations';
import { SQLiteCategoryRepository } from '../repositories/sqlite-category.repository';
import type { Category, CategoryInput, CategoryType } from '../domain/category.model';

function defaultText(path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations.en;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

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
    throw new Error(defaultText('categories.service_name_required'));
  }
  if (!['income', 'expense'].includes(input.type)) {
    throw new Error(defaultText('categories.service_type_invalid'));
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
    const existing = await this.repository.getById(id);
    if (existing?.is_system === 1) {
      throw new Error(defaultText('categories.service_system_edit_forbidden'));
    }

    const data = normalizeInput(input);
    await this.repository.update(id, data, Date.now());
    await persistWeb();
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.getById(id);
    if (existing?.is_system === 1) {
      throw new Error(defaultText('categories.service_system_delete_forbidden'));
    }

    const counts = await this.repository.getReferenceCounts(id);
    const totalReferences = counts.transactions + counts.recurringBills + counts.budgets;
    if (totalReferences > 0) {
      throw new Error(defaultText('categories.service_delete_in_use'));
    }

    await this.repository.delete(id);
    await persistWeb();
  }
}

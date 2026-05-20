import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Tags } from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import type { Category, CategoryInput, CategoryType } from '../domain/category.model';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryList } from '../components/CategoryList';
import { useCategories } from '../hooks/useCategories';
import { useLanguage } from '@/shared/context/LanguageContext';

export function CategoriesPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { t } = useLanguage();
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>();

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === activeType),
    [activeType, categories],
  );

  function openCreate() {
    setEditTarget(undefined);
    setSheetOpen(true);
  }

  function openEdit(category: Category) {
    setEditTarget(category);
    setActiveType(category.type);
    setSheetOpen(true);
  }

  async function handleSave(input: CategoryInput) {
    if (editTarget) {
      await updateCategory(editTarget.id, input);
    } else {
      await createCategory(input);
    }
    setSheetOpen(false);
  }

  async function handleDelete(category: Category) {
    const ok = await confirm.confirm({
      title: t('categories.delete_confirm_title'),
      message: `${t('categories.delete_confirm_msg')} ${category.name}`,
      confirmText: t('categories.delete_confirm_btn'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    try {
      await deleteCategory(category.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('categories.delete_failed'));
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-600 active:bg-gray-100 transition-colors"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-gray-900">{t('categories.title')}</h1>
          <p className="text-[12px] text-gray-500">{t('categories.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center active:scale-[0.96] transition-transform"
          style={{ boxShadow: '0 6px 14px rgba(99,102,241,0.28)' }}
          aria-label={t('categories.add')}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-4 pb-24">
        <div className="flex bg-gray-100 p-1 rounded-[12px] h-[48px] mb-4">
          {[
            { id: 'expense' as const, label: t('categories.expense_type') },
            { id: 'income' as const, label: t('categories.income_type') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveType(item.id)}
              className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
                activeType === item.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[72px] rounded-[14px] bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Tags size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-[15px] font-semibold text-gray-500">{t('categories.no_categories')}</p>
            <p className="text-[13px] mt-1">{t('categories.no_categories_hint')}</p>
          </div>
        ) : (
          <CategoryList
            categories={visibleCategories}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <CategoryForm
          existing={editTarget}
          defaultType={activeType}
          onSave={handleSave}
          onCancel={() => setSheetOpen(false)}
        />
      </BottomSheet>
    </div>
  );
}

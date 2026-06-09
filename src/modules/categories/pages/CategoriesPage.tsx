import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tags } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { ROUTES } from '@/shared/constants/routes';
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
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const { t } = useLanguage();
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>();
  const isCreateRoute = location.pathname === ROUTES.CATEGORIES_NEW;

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === activeType),
    [activeType, categories],
  );

  const openCreate = useCallback(() => {
    setEditTarget(undefined);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (isCreateRoute) {
      navigate(ROUTES.CATEGORIES, { replace: true });
    }
    setSheetOpen(false);
  }, [isCreateRoute, navigate]);

  useEffect(() => {
    if (isCreateRoute && !sheetOpen) {
      openCreate();
    }
  }, [isCreateRoute, openCreate, sheetOpen]);

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
    closeSheet();
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
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-10 bg-bg px-4">
        <div className="flex items-center gap-3 pt-4 pb-3">
          <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold text-text">{t('categories.title')}</h1>
            <p className="text-[12px] text-muted">{t('categories.subtitle')}</p>
          </div>
        </div>

        <div className="flex h-[48px] rounded-[12px] bg-surface-muted p-1">
          {[
            { id: 'expense' as const, label: t('categories.expense_type') },
            { id: 'income' as const, label: t('categories.income_type') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveType(item.id)}
              className={`flex-1 rounded-[9px] text-[14px] font-semibold transition-all ${
                activeType === item.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[72px] rounded-[14px] bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-subtle py-12">
            <Tags size={36} className="mx-auto mb-3 text-subtle" />
            <p className="text-[15px] font-semibold text-muted">
              {t('categories.no_categories')}
            </p>
            <p className="text-[13px] mt-1">{t('categories.no_categories_hint')}</p>
          </div>
        ) : (
          <CategoryList categories={visibleCategories} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      <BottomSheet isOpen={sheetOpen} onClose={closeSheet}>
        <CategoryForm
          existing={editTarget}
          defaultType={activeType}
          onSave={handleSave}
          onCancel={closeSheet}
        />
      </BottomSheet>
    </div>
  );
}

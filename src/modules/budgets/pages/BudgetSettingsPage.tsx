import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useBudgets } from '../hooks/useBudgets';
import { useBudgetAddForm } from '../hooks/useBudgetAddForm';
import { useBudgetForm } from '../hooks/useBudgetForm';
import { BudgetSummaryStats } from '../components/BudgetSummaryStats';
import { BudgetCategoryList } from '../components/BudgetCategoryList';
import { BudgetAddSheet } from '../components/BudgetAddSheet';
import { BudgetEditForm } from '../components/BudgetEditForm';
import { BudgetByAccountTypeSummary } from '../components/BudgetByAccountTypeSummary';
import { FormSheet } from '@/shared/components/FormSheet';
import { BackButton } from '@/shared/components/BackButton';
import { FormTransition } from '@/shared/components/FormTransition';
import { SkeletonCard } from '@/shared/components/SkeletonCard/SkeletonCard';
import { ErrorScreen } from '@/shared/components/ErrorScreen';
import { ROUTES } from '@/shared/constants/routes';
import { buildDateRange } from '@/modules/reports/services/build-date-range';
import { resolveBudgetTransactionFilter } from '@/modules/reports/services/financial-calculations';
import { logAppError } from '@/core/telemetry/error.service';
import type { BudgetProgress } from '../domain/budget.model';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';

type ScopeTab = 'all' | 'account_type';

export function BudgetSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const displayFormatSettings = useDisplayFormatSettings();
  const {
    categories,
    allProgress,
    summaryStats,
    progressByScope,
    isLoading,
    error,
    refresh,
  } = useBudgets();
  const isCreateRoute = location.pathname === ROUTES.BUDGETS_NEW;

  const handleAddSuccess = useCallback(() => {
    void refresh();
    if (isCreateRoute) {
      navigate(ROUTES.BUDGETS, { replace: true });
    }
  }, [isCreateRoute, navigate, refresh]);

  const addForm = useBudgetAddForm(handleAddSuccess);
  const editForm = useBudgetForm(refresh);

  const [activeTab, setActiveTab] = useState<ScopeTab>('all');

  const handleViewTransactions = useCallback((progress: BudgetProgress) => {
    const range = buildDateRange(
      progress.budget.period === 'weekly' ? 'this_week' : 'this_month',
      undefined,
      displayFormatSettings
    );
    navigate(ROUTES.TRANSACTIONS, {
      state: {
        filter: {
          ...resolveBudgetTransactionFilter(progress.budget),
          startDate: range.startDate,
          endDate: range.endDate,
        },
        title: progress.budget.category_name,
      },
    });
  }, [displayFormatSettings, navigate]);

  useEffect(() => {
    if (isCreateRoute && !addForm.isOpen) {
      addForm.open();
    }
  }, [addForm.isOpen, addForm.open, isCreateRoute]);

  useEffect(() => {
    if (!editForm.isOpen || !editForm.selectedCategory) return;

    const categoryId = editForm.selectedCategory.category_id;
    const stillExists = categories.some((category) => category.category_id === categoryId)
      || allProgress.some((progress) => progress.budget.category_id === categoryId);

    if (stillExists) return;

    void logAppError(new Error('budget_edit_missing_budget'), {
      screen: 'BudgetSettingsPage',
      component: 'BudgetEditForm',
      action: 'budget_edit_missing_budget',
      extra: {
        categoryId,
        mode: editForm.mode,
      },
    });
    editForm.close();
  }, [allProgress, categories, editForm.close, editForm.isOpen, editForm.mode, editForm.selectedCategory]);

  const closeAddForm = useCallback(() => {
    if (isCreateRoute) {
      navigate(ROUTES.BUDGETS, { replace: true });
    }
    addForm.close();
  }, [addForm.close, isCreateRoute, navigate]);

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-bg px-4 pt-10 pb-20 space-y-4">
        <div className="h-10 bg-surface-muted rounded w-1/3 animate-pulse" />
        <div className="flex space-x-2 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-20 bg-surface-muted rounded-[12px] animate-pulse" />
          ))}
        </div>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error && categories.length === 0) {
    return <ErrorScreen error={error} onRetry={refresh} />;
  }

  if (!isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center text-muted">
          <Wallet size={48} />
        </div>
        <div className="space-y-2">
          <h3 className="text-[16px] font-semibold text-text">{t('budgets.no_categories')}</h3>
          <p className="text-[13px] text-muted max-w-[240px]">
            {t('budgets.no_categories_hint')}
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.CATEGORIES)}
          className="w-full h-[52px] rounded-[12px] bg-indigo-500 text-white text-[15px] font-semibold shadow-lg shadow-indigo-500/20"
        >
          {t('budgets.go_to_categories')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg" style={{ padding: '0 16px' }}>
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4 pb-4 shadow-[0_1px_0_var(--border)]">
        {/* Header */}
        <header className="pb-4" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
              <h1 className="min-w-0 truncate text-[20px] font-bold leading-tight text-text">
                {t('budgets.title')}
              </h1>
            </div>
          </div>
        </header>

        {/* Summary Stats */}
        <BudgetSummaryStats stats={summaryStats} />
      </div>

      <div className="space-y-6 pb-20 pt-5" style={{ scrollMarginTop: '132px' }}>
        {/* Tab: chỉ hiện khi có budget theo loại TK */}
        {progressByScope.byAccountType.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-surface text-muted border border-border'
              }`}
            >
              {t('budgets.all')}
            </button>
            <button
              onClick={() => setActiveTab('account_type')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                activeTab === 'account_type'
                  ? 'bg-orange-500 text-white'
                  : 'bg-surface text-muted border border-border'
              }`}
            >
              {t('budgets.account_type_tab')}
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                {progressByScope.byAccountType.length}
              </span>
            </button>
          </div>
        )}

        {/* Content */}
        <FormTransition transitionKey={activeTab}>
          {activeTab === 'all' ? (
            <BudgetCategoryList
              allProgress={allProgress}
              onItemClick={editForm.open}
              onViewTransactions={handleViewTransactions}
              onCreateBudget={() => navigate(ROUTES.BUDGETS_NEW)}
            />
          ) : (
            <BudgetByAccountTypeSummary progresses={progressByScope.byAccountType} />
          )}
        </FormTransition>
      </div>

      {/* Edit Sheet */}
      <FormSheet
        isOpen={editForm.isOpen}
        onClose={editForm.close}
        onExited={editForm.resetAfterClose}
        transitionKey={editForm.selectedCategory?.category_id ?? 'edit-budget'}
        title={t('budgets.save_budget')}
        logContext="BudgetEditForm"
      >
        {editForm.selectedCategory && (
          <BudgetEditForm
            category={editForm.selectedCategory}
            amount={editForm.amount}
            setAmount={editForm.setAmount}
            period={editForm.period}
            setPeriod={editForm.setPeriod}
            scopeType={editForm.scopeType}
            setScopeType={editForm.setScopeType}
            accountTypeScope={editForm.accountTypeScope}
            setAccountTypeScope={editForm.setAccountTypeScope}
            onSave={editForm.handleSave}
            onRemove={editForm.handleRemove}
            onClose={editForm.close}
            isSaving={editForm.isSaving}
            error={editForm.validationError}
          />
        )}
      </FormSheet>

      {/* Add Sheet */}
      <FormSheet
        isOpen={addForm.isOpen}
        onClose={closeAddForm}
        onExited={addForm.resetAfterClose}
        fullScreenOnAndroid
        transitionKey={addForm.selectedCategory?.category_id ?? 'new-budget'}
        title={t('budgets.title')}
        logContext="BudgetAddForm"
      >
        <BudgetAddSheet
          categories={categories}
          selectedCategory={addForm.selectedCategory}
          setSelectedCategory={addForm.setSelectedCategory}
          amount={addForm.amount}
          setAmount={addForm.setAmount}
          period={addForm.period}
          setPeriod={addForm.setPeriod}
          scopeType={addForm.scopeType}
          setScopeType={addForm.setScopeType}
          accountTypeScope={addForm.accountTypeScope}
          setAccountTypeScope={addForm.setAccountTypeScope}
          onSave={addForm.handleSave}
          onClose={closeAddForm}
          isSaving={addForm.isSaving}
        />
      </FormSheet>
    </div>
  );
}

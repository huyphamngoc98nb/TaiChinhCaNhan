import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useBudgets } from '../hooks/useBudgets';
import { useBudgetAddForm } from '../hooks/useBudgetAddForm';
import { useBudgetForm } from '../hooks/useBudgetForm';
import { BudgetSummaryStats } from '../components/BudgetSummaryStats';
import { BudgetAlertsPanel } from '../components/BudgetAlertsPanel';
import { BudgetCategoryList } from '../components/BudgetCategoryList';
import { BudgetAddSheet } from '../components/BudgetAddSheet';
import { BudgetEditForm } from '../components/BudgetEditForm';
import { BudgetByAccountTypeSummary } from '../components/BudgetByAccountTypeSummary';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { SkeletonCard } from '@/shared/components/SkeletonCard/SkeletonCard';
import { ErrorScreen } from '@/shared/components/ErrorScreen';
import { ROUTES } from '@/shared/constants/routes';

type ScopeTab = 'all' | 'account_type';

export function BudgetSettingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    categories,
    allProgress,
    summaryStats,
    alerts,
    progressByScope,
    isLoading,
    error,
    refresh,
  } = useBudgets();

  const addForm = useBudgetAddForm(refresh);
  const editForm = useBudgetForm(refresh);

  const [activeTab, setActiveTab] = useState<ScopeTab>('all');

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] px-4 pt-10 pb-20 space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="flex space-x-2 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-20 bg-gray-200 rounded-[12px] animate-pulse" />
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
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
          <Wallet size={48} />
        </div>
        <div className="space-y-2">
          <h3 className="text-[16px] font-semibold text-gray-900">{t('budgets.no_categories')}</h3>
          <p className="text-[13px] text-gray-500 max-w-[240px]">
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
    <div className="min-h-screen bg-[#F5F7FA]" style={{ padding: '0 16px' }}>
      {/* Header */}
      <header className="pt-10 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 leading-tight">{t('budgets.title')}</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-1">{t('budgets.subtitle')}</p>
          </div>
          <button
            onClick={addForm.open}
            aria-label={t('budgets.add_budget')}
            className="w-10 h-10 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center text-[24px] font-light active:scale-95 transition-transform flex-shrink-0 mt-0"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="space-y-6 pb-20">
        {/* Summary Stats */}
        <BudgetSummaryStats stats={summaryStats} />

        {/* Alerts Panel */}
        <BudgetAlertsPanel alerts={alerts} />

        {/* Tab: chỉ hiện khi có budget theo loại TK */}
        {progressByScope.byAccountType.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {t('budgets.all')}
            </button>
            <button
              onClick={() => setActiveTab('account_type')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                activeTab === 'account_type'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
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
        {activeTab === 'all' ? (
          <BudgetCategoryList
            allProgress={allProgress}
            onItemClick={editForm.open}
          />
        ) : (
          <BudgetByAccountTypeSummary progresses={progressByScope.byAccountType} />
        )}
      </div>

      {/* Edit Sheet */}
      <BottomSheet isOpen={editForm.isOpen} onClose={editForm.close}>
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
      </BottomSheet>

      {/* Add Sheet */}
      <BottomSheet isOpen={addForm.isOpen} onClose={addForm.close}>
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
          onClose={addForm.close}
          isSaving={addForm.isSaving}
          error={addForm.error}
        />
      </BottomSheet>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useBudgetForm } from '../hooks/useBudgetForm';
import { BudgetSummaryStats } from '../components/BudgetSummaryStats';
import { BudgetAlertsPanel } from '../components/BudgetAlertsPanel';
import { BudgetCategoryList } from '../components/BudgetCategoryList';
import { BudgetEditForm } from '../components/BudgetEditForm';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { SkeletonCard } from '@/shared/components/SkeletonCard/SkeletonCard';
import { ErrorScreen } from '@/shared/components/ErrorScreen';

export function BudgetSettingsPage() {
  const navigate = useNavigate();
  const { 
    categories, 
    allProgress, 
    summaryStats, 
    alerts, 
    isLoading, 
    error, 
    refresh 
  } = useBudgets();

  const {
    isOpen,
    selectedCategory,
    open,
    close,
    amount,
    setAmount,
    period,
    setPeriod,
    handleSave,
    handleRemove,
    isSaving,
    validationError
  } = useBudgetForm(refresh);

  if (isLoading && categories.length === 0) {
    return (
      <div className="bg-[#F5F7FA] min-h-full px-4 pt-10 pb-20 space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="flex space-x-2 mt-4">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 h-20 bg-gray-200 rounded-[12px] animate-pulse" />)}
        </div>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error && categories.length === 0) {
    return <ErrorScreen error={error} onRetry={refresh} />;
  }

  // Section 5: Empty Onboarding
  if (!isLoading && categories.length === 0) {
    return (
      <div className="bg-[#F5F7FA] min-h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
          <Wallet size={48} />
        </div>
        <div className="space-y-2">
          <h3 className="text-[16px] font-semibold text-gray-900">No categories yet</h3>
          <p className="text-[13px] text-gray-500 max-w-[240px]">
            Add categories first to start setting budgets.
          </p>
        </div>
        <button 
          onClick={() => navigate('/settings/categories')} // Assuming path
          className="w-full h-[52px] rounded-[12px] bg-indigo-500 text-white text-[15px] font-semibold shadow-lg shadow-indigo-500/20"
        >
          Go to Categories
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F7FA] min-h-full" style={{ padding: '0 16px' }}>
      {/* Section 1: PageHeader */}
      <header className="pt-10 pb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[24px] font-bold text-gray-900 leading-tight">Budgets</h1>
          <p className="text-[12px] text-gray-500 font-medium">Manage spending limits</p>
        </div>
        <div className="bg-indigo-500 rounded-full px-3 py-1.5 text-white text-[12px] font-bold">
          This month
        </div>
      </header>

      <div className="space-y-6">
        {/* Section 2: SummaryStats */}
        <BudgetSummaryStats stats={summaryStats} />

        {/* Section 3: AlertsPanel */}
        <BudgetAlertsPanel alerts={alerts} />

        {/* Section 4: CategoryBudgetList */}
        <BudgetCategoryList 
          categories={categories}
          allProgress={allProgress}
          onItemClick={open}
        />
      </div>


      {/* Bottom Sheet for Editing */}
      <BottomSheet isOpen={isOpen} onClose={close}>
        {selectedCategory && (
          <BudgetEditForm 
            category={selectedCategory}
            amount={amount}
            setAmount={setAmount}
            period={period}
            setPeriod={setPeriod}
            onSave={handleSave}
            onRemove={handleRemove}
            onClose={close}
            isSaving={isSaving}
            error={validationError}
          />
        )}
      </BottomSheet>
    </div>
  );
}

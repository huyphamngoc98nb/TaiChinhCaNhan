import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackButton } from '@/shared/components/BackButton';
import { DropdownList } from '@/shared/components/DropdownList';
import { FormSheet } from '@/shared/components/FormSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { ROUTES } from '@/shared/constants/routes';
import { useLanguage } from '@/shared/context/LanguageContext';
import type {
  CreateLoanInput,
  LoanFilter,
  LoanSortOrder,
  LoanType,
  LoanWithSummary,
} from '../domain/loan.model';
import { LoanCard } from '../components/LoanCard';
import { LoanForm } from '../components/LoanForm';
import { useLoans } from '../hooks/useLoans';
import { useLoanMutations } from '../hooks/useLoanMutations';
import { LoanHasPaymentsError, type DeleteLoanMode } from '../services/delete-loan';

type FilterTab = 'all' | LoanType | 'settled';

function filterFromTab(tab: FilterTab): LoanFilter {
  if (tab === 'lend' || tab === 'borrow') return { type: tab };
  if (tab === 'settled') return { status: 'settled' };
  return {};
}

interface SwipeableLoanRowProps {
  loan: LoanWithSummary;
  mutationLoading: boolean;
  onOpen: (id: string) => void;
  onDelete: (loan: LoanWithSummary, mode: DeleteLoanMode) => Promise<void>;
}

function SwipeableLoanRow({ loan, mutationLoading, onOpen, onDelete }: SwipeableLoanRowProps) {
  const { t } = useLanguage();
  const [actionsOpen, setActionsOpen] = useState(false);
  const startX = useRef<number | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return;
    startX.current = event.clientX;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (startX.current == null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;

    if (delta < -48) setActionsOpen(true);
    if (delta > 48) setActionsOpen(false);
  }

  return (
    <div
      className="relative overflow-hidden rounded-[14px]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="absolute inset-y-0 right-0 flex w-[132px] gap-2 py-1">
        <button
          type="button"
          onClick={() => void onDelete(loan, 'soft')}
          disabled={mutationLoading || loan.deleted_at != null}
          className="w-[62px] rounded-[12px] bg-gray-600 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {t('loans.pages.common.hide')}
        </button>
        <button
          type="button"
          onClick={() => void onDelete(loan, 'hard')}
          disabled={mutationLoading}
          className="w-[62px] rounded-[12px] bg-rose-500 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {t('loans.pages.common.delete')}
        </button>
      </div>

      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: actionsOpen ? 'translateX(-140px)' : 'translateX(0)' }}
      >
        <LoanCard
          loan={loan}
          onPress={(id) => {
            if (actionsOpen) {
              setActionsOpen(false);
              return;
            }
            onOpen(id);
          }}
        />
      </div>
    </div>
  );
}

export function LoanListPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortOrder, setSortOrder] = useState<LoanSortOrder>('loanDateDesc');
  const filterTabs = useMemo<Array<{ id: FilterTab; label: string }>>(() => [
    { id: 'all', label: t('loans.pages.list.filterAll') },
    { id: 'lend', label: t('loans.card.typeLend') },
    { id: 'borrow', label: t('loans.card.typeBorrow') },
    { id: 'settled', label: t('loans.card.statusSettled') },
  ], [t]);
  const isCreateRoute = location.pathname === ROUTES.LOANS_NEW;
  const sortOptions = useMemo(() => [
    { value: 'loanDateDesc' as const, label: t('loans.pages.list.sortNewest') },
    { value: 'loanDateAsc' as const, label: t('loans.pages.list.sortOldest') },
  ], [t]);
  const filter = useMemo(
    () => ({
      ...filterFromTab(activeTab),
      includeDeleted: showDeleted,
      sortOrder,
    }),
    [activeTab, showDeleted, sortOrder],
  );
  const { loans, loading, error, reload } = useLoans(filter);
  const { createLoan, deleteLoan, loading: mutationLoading } = useLoanMutations();

  useEffect(() => {
    if (isCreateRoute) {
      setFormOpen(true);
    }
  }, [isCreateRoute]);

  function closeForm() {
    if (isCreateRoute) {
      navigate(ROUTES.LOANS, { replace: true });
    }
    setFormOpen(false);
  }

  async function handleCreateLoan(input: CreateLoanInput) {
    await createLoan(input);
    toast.success(t('loans.pages.list.addedSuccess'));
    await reload();
    closeForm();
  }

  async function handleDeleteLoan(loan: LoanWithSummary, mode: DeleteLoanMode, force = false) {
    try {
      await deleteLoan(loan.id, mode, force);
      toast.success(mode === 'soft' ? t('loans.pages.common.hiddenSuccess') : t('loans.pages.common.deletedSuccess'));
      await reload();
    } catch (err) {
      if (mode === 'hard' && err instanceof LoanHasPaymentsError) {
        const ok = await confirm.confirm({
          title: t('loans.pages.common.hardDeleteTitle'),
          message: err.message,
          confirmText: t('loans.pages.common.hardDeleteConfirm'),
          cancelText: t('loans.pages.common.cancel'),
        });
        if (!ok) return;
        await handleDeleteLoan(loan, 'hard', true);
        return;
      }

      toast.error(err instanceof Error ? err.message : t('loans.pages.common.deleteFailed'));
    }
  }

  return (
    <div className="min-h-full bg-bg pb-24">
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm shadow-gray-200/60">
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('loans.pages.common.back')} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-extrabold text-text">
              {t('loans.pages.list.title')}
            </h1>
          </div>
        </div>

        <div className="flex h-[44px] gap-1 overflow-x-auto rounded-[12px] bg-surface-muted p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-fit flex-1 rounded-[9px] px-3 text-[13px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-surface text-indigo-600 shadow-sm'
                  : 'text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3 py-2 shadow-sm">
          <span className="text-[12px] font-bold text-muted">{t('loans.pages.list.showDeleted')}</span>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(event) => setShowDeleted(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2 shadow-sm">
          <span className="min-w-fit text-[12px] font-bold text-muted">
            {t('loans.pages.list.sortLabel')}
          </span>
          <DropdownList
            value={sortOrder}
            onChange={setSortOrder}
            ariaLabel={t('loans.pages.list.sortLabel')}
            options={sortOptions}
            className="min-w-0 flex-1"
            buttonClassName="min-h-[40px] border-0 bg-transparent px-2 shadow-none"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[154px] animate-pulse rounded-[14px] bg-surface-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
            {error.message}
          </div>
        ) : loans.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-bold text-muted">{t('loans.pages.list.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <SwipeableLoanRow
                key={loan.id}
                loan={loan}
                mutationLoading={mutationLoading}
                onOpen={(id) => navigate(ROUTES.LOANS_DETAIL.replace(':id', id))}
                onDelete={handleDeleteLoan}
              />
            ))}
          </div>
        )}
      </div>

      <FormSheet
        isOpen={formOpen}
        onClose={closeForm}
        fullScreenOnAndroid
        transitionKey="new-loan"
        title={t('loans.pages.list.title')}
        logContext="LoanForm"
      >
        <div className="pb-[calc(32px+env(safe-area-inset-bottom))]">
          <LoanForm onSubmit={handleCreateLoan} loading={mutationLoading} />
        </div>
      </FormSheet>
    </div>
  );
}

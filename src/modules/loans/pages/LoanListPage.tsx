import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { ROUTES } from '@/shared/constants/routes';
import type { CreateLoanInput, LoanFilter, LoanType, LoanWithSummary } from '../domain/loan.model';
import { LoanCard } from '../components/LoanCard';
import { LoanForm } from '../components/LoanForm';
import { useLoans } from '../hooks/useLoans';
import { useLoanMutations } from '../hooks/useLoanMutations';
import { LoanHasPaymentsError, type DeleteLoanMode } from '../services/delete-loan';

type FilterTab = 'all' | LoanType | 'settled';

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lend', label: 'Cho vay' },
  { id: 'borrow', label: 'Vay nợ' },
  { id: 'settled', label: 'Đã tất toán' },
];

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
          Ẩn
        </button>
        <button
          type="button"
          onClick={() => void onDelete(loan, 'hard')}
          disabled={mutationLoading}
          className="w-[62px] rounded-[12px] bg-rose-500 text-[12px] font-bold text-white disabled:opacity-50"
        >
          Xoá
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
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const filter = useMemo(
    () => ({ ...filterFromTab(activeTab), includeDeleted: showDeleted }),
    [activeTab, showDeleted],
  );
  const { loans, loading, error, reload } = useLoans(filter);
  const { createLoan, deleteLoan, loading: mutationLoading } = useLoanMutations();

  async function handleCreateLoan(input: CreateLoanInput) {
    await createLoan(input);
    setFormOpen(false);
    await reload();
  }

  async function handleDeleteLoan(loan: LoanWithSummary, mode: DeleteLoanMode, force = false) {
    try {
      await deleteLoan(loan.id, mode, force);
      toast.success(mode === 'soft' ? 'Đã ẩn khoản.' : 'Đã xoá vĩnh viễn khoản.');
      await reload();
    } catch (err) {
      if (mode === 'hard' && err instanceof LoanHasPaymentsError) {
        const ok = await confirm.confirm({
          title: 'Xoá vĩnh viễn?',
          message: err.message,
          confirmText: 'Xác nhận xoá vĩnh viễn',
          cancelText: 'Huỷ',
        });
        if (!ok) return;
        await handleDeleteLoan(loan, 'hard', true);
        return;
      }

      toast.error(err instanceof Error ? err.message : 'Không thể xoá khoản.');
    }
  }

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pb-3 pt-4 shadow-sm shadow-gray-200/60">
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel="Quay lại" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-extrabold text-gray-900">
              Cho vay & Vay nợ
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-300/40 active:scale-95"
            aria-label="Thêm khoản"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="flex h-[44px] gap-1 overflow-x-auto rounded-[12px] bg-gray-100 p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-fit flex-1 rounded-[9px] px-3 text-[13px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center justify-between gap-3 rounded-[12px] bg-white px-3 py-2 shadow-sm">
          <span className="text-[12px] font-bold text-gray-600">Hiện khoản đã ẩn</span>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(event) => setShowDeleted(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[154px] animate-pulse rounded-[14px] bg-gray-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
            {error.message}
          </div>
        ) : loans.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-bold text-gray-500">Chưa có khoản nào. Nhấn + để thêm</p>
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

      <BottomSheet isOpen={formOpen} onClose={() => setFormOpen(false)} fullScreenOnAndroid>
        <LoanForm onSubmit={handleCreateLoan} loading={mutationLoading} />
      </BottomSheet>
    </div>
  );
}

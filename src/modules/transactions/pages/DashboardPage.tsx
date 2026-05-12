import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, PieChart, ChevronRight, Bell } from 'lucide-react';
import { useBudgets } from '@/modules/budgets/hooks/useBudgets';
import { useRecurringBills } from '@/modules/recurring-bills/hooks/useRecurringBills';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { ROUTES } from '@/shared/constants/routes';
import type { AccountType } from '@/modules/wallets/repositories/sqlite-wallet.repository';

// ── helpers ────────────────────────────────────────────────────────────────────
function formatVND(n: number): string {
  if (Math.abs(n) >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)} tr`;
  return n.toLocaleString('vi-VN');
}

const ACCOUNT_TYPE_ICON: Record<AccountType, string> = {
  cash:        '💵',
  bank:        '🏦',
  credit_card: '💳',
  e_wallet:    '📱',
  investment:  '📈',
  other:       '🗂️',
};

const STATUS_GRADIENT: Record<'safe' | 'warning' | 'exceeded', string> = {
  safe:     'from-emerald-400 to-emerald-500',
  warning:  'from-amber-400 to-orange-400',
  exceeded: 'from-red-400 to-rose-500',
};

const STATUS_BG: Record<'safe' | 'warning' | 'exceeded', string> = {
  safe:     'bg-emerald-50',
  warning:  'bg-amber-50',
  exceeded: 'bg-red-50',
};

// ── component ────────────────────────────────────────────────────────────
function DashboardPage() {
  const { alerts, allProgress, isLoading: budgetLoading } = useBudgets();
  const { reminders } = useRecurringBills();
  const { wallets, totalBalance, loading: walletLoading } = useWallets();
  const navigate = useNavigate();

  // Top 5 budgets for mini-cards (warning/exceeded first)
  const topBudgets = useMemo(() => {
    const sorted = [...allProgress].sort((a, b) => {
      const order = { exceeded: 0, warning: 1, safe: 2 };
      return order[a.status] - order[b.status];
    });
    return sorted.slice(0, 5);
  }, [allProgress]);

  const hasAlerts = alerts.length > 0;
  const hasBills  = reminders.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div
        className="relative mx-4 mt-6 rounded-[24px] p-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A78BFA 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10" />

        <p className="text-white/70 text-[12px] font-medium mb-1">Tổng số dư</p>
        {walletLoading ? (
          <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse mb-3" />
        ) : (
          <h2 className="text-white text-[32px] font-bold tracking-tight mb-3">
            ₫{formatVND(totalBalance)}
          </h2>
        )}

        <div className="flex gap-2 flex-wrap">
          {wallets.slice(0, 4).map(w => (
            <div
              key={w.id}
              className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"
            >
              <span className="text-[13px]">
                {w.icon || ACCOUNT_TYPE_ICON[w.account_type]}
              </span>
              <span className="text-white text-[11px] font-semibold">{w.name}</span>
              <span className="text-white/70 text-[11px]">₫{formatVND(w.balance)}</span>
            </div>
          ))}
          {wallets.length > 4 && (
            <div className="flex items-center bg-white/15 rounded-full px-3 py-1">
              <span className="text-white/70 text-[11px]">+{wallets.length - 4} ví</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <div className="flex gap-3 mx-4 mt-4">
        <button
          onClick={() => navigate(ROUTES.TRANSACTIONS_NEW)}
          className="flex-1 flex items-center justify-center gap-2 h-[48px] bg-indigo-500 text-white rounded-[14px] text-[13px] font-semibold shadow-md shadow-indigo-300/40 active:scale-95 transition-transform"
        >
          <PlusCircle size={17} />
          Thêm giao dịch
        </button>
        <button
          onClick={() => navigate(ROUTES.BUDGETS)}
          className="flex-1 flex items-center justify-center gap-2 h-[48px] bg-white text-indigo-600 border border-indigo-100 rounded-[14px] text-[13px] font-semibold active:scale-95 transition-transform"
        >
          <PieChart size={17} />
          Ngân sách
        </button>
      </div>

      {/* ── Bill Reminders banner ────────────────────────────────────────── */}
      {hasBills && (
        <div
          className="mx-4 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-[16px] px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate(ROUTES.RECURRING_BILLS)}
        >
          <Bell size={18} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">
              {reminders.length} hoá đơn sắp đến hạn
            </p>
            <p className="text-[11px] text-amber-600">
              {reminders.filter(r => r.status === 'overdue').length > 0
                ? `${reminders.filter(r => r.status === 'overdue').length} đã quá hạn`
                : 'Nhấn để xem chi tiết'}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      )}

      {/* ── Budget Mini-cards ────────────────────────────────────────────── */}
      {!budgetLoading && topBudgets.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">Ngân sách</h3>
            <button
              onClick={() => navigate(ROUTES.BUDGETS)}
              className="text-[12px] text-indigo-500 font-semibold flex items-center gap-0.5"
            >
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>
          <div
            className="flex gap-3 px-4 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {topBudgets.map(p => (
              <div
                key={p.budget.category_id}
                onClick={() => navigate(ROUTES.BUDGETS)}
                className={`shrink-0 w-[148px] rounded-[18px] p-4 cursor-pointer active:scale-95 transition-transform ${
                  STATUS_BG[p.status]
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[20px]">{p.budget.icon || '💰'}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${
                      STATUS_GRADIENT[p.status]
                    } text-white`}
                  >
                    {Math.round(p.percentage * 100)}%
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-gray-800 leading-tight mb-2 truncate">
                  {p.budget.category_name}
                </p>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${STATUS_GRADIENT[p.status]}`}
                    style={{ width: `${Math.min(p.percentage * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  còn ₫{formatVND(Math.max(p.remaining_amount, 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget Alerts ────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="mx-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">Cảnh báo ngân sách</h3>
            <span className="text-[11px] bg-red-100 text-red-500 font-bold px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div
                key={alert.budget.category_id}
                className="flex items-center gap-3 bg-white rounded-[14px] px-4 py-3"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                onClick={() => navigate(ROUTES.BUDGETS)}
              >
                <span className="text-[22px]">{alert.budget.icon || '💰'}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-900">{alert.budget.category_name}</p>
                  <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden w-24">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(alert.percentage * 100, 100)}%`,
                        background: alert.status === 'exceeded' ? '#ef4444' : '#f59e0b',
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`text-[12px] font-bold ${
                    alert.status === 'exceeded' ? 'text-red-500' : 'text-amber-500'
                  }`}
                >
                  {Math.round(alert.percentage * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!walletLoading && wallets.length === 0 && topBudgets.length === 0 && !hasAlerts && (
        <div className="flex flex-col items-center justify-center mt-20 px-8 text-center space-y-4">
          <div className="text-6xl">👋</div>
          <h3 className="text-[18px] font-bold text-gray-900">Chào mừng!</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Bắt đầu bằng cách thêm ví và giao dịch đầu tiên.
          </p>
          <button
            onClick={() => navigate(ROUTES.TRANSACTIONS_NEW)}
            className="w-full h-[52px] rounded-[14px] bg-indigo-500 text-white font-semibold text-[15px] shadow-md shadow-indigo-300/40"
          >
            Thêm giao dịch đầu tiên
          </button>
        </div>
      )}
    </div>
  );
}

export { DashboardPage };

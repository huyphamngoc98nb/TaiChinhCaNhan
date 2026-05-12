import { useState, useEffect, FormEvent } from 'react';
import { X } from 'lucide-react';
import { Wallet, AccountType, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from './WalletCard';

interface Props {
  /** Pass an existing wallet to edit; omit for create mode. */
  existing?: Wallet;
  onSave: (data: CreateWalletInput | UpdateWalletInput) => Promise<void>;
  onClose: () => void;
  onArchive?: () => Promise<void>;
}

const EMOJI_PRESETS = ['💵', '🏦', '💳', '📱', '📈', '💼', '🏧', '💰', '🪙', '🎯'];
const COLOR_PRESETS = [
  '#4CAF50', '#2196F3', '#E91E63', '#FF9800', '#9C27B0',
  '#00BCD4', '#F44336', '#3F51B5', '#009688', '#795548',
];
const ACCOUNT_TYPES: AccountType[] = [
  'cash', 'bank', 'credit_card', 'e_wallet', 'investment', 'other',
];

export function WalletForm({ existing, onSave, onClose, onArchive }: Props) {
  const isEdit = !!existing;

  const [name, setName]               = useState(existing?.name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(existing?.account_type ?? 'cash');
  const [currency, setCurrency]       = useState(existing?.currency ?? 'VND');
  const [balance, setBalance]         = useState(existing?.balance?.toString() ?? '0');
  const [icon, setIcon]               = useState(existing?.icon ?? '');
  const [color, setColor]             = useState(existing?.color ?? '#6366F1');
  const [excludeFromTotal, setExclude]= useState<boolean>((existing?.exclude_from_total ?? 0) === 1);
  const [creditLimit, setCreditLimit] = useState(existing?.credit_limit?.toString() ?? '');
  const [statementDay, setStatDay]    = useState(existing?.statement_day?.toString() ?? '');
  const [dueDay, setDueDay]           = useState(existing?.due_day?.toString() ?? '');
  const [error, setError]             = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  // Auto-fill default icon when account type changes (only if icon not customised)
  useEffect(() => {
    if (!existing) {
      setIcon(ACCOUNT_TYPE_ICONS[accountType]);
    }
  }, [accountType, existing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tên tài khoản không được để trống.');
      return;
    }
    if (accountType === 'credit_card') {
      const limit = parseFloat(creditLimit);
      if (isNaN(limit) || limit <= 0) {
        setError('Hạn mức thẻ tín dụng phải lớn hơn 0.');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        const data: UpdateWalletInput = {
          name:               name.trim(),
          account_type:       accountType,
          currency,
          icon:               icon || null,
          color,
          exclude_from_total: excludeFromTotal ? 1 : 0,
          credit_limit:       accountType === 'credit_card' ? (parseFloat(creditLimit) || null) : null,
          statement_day:      accountType === 'credit_card' ? (parseInt(statementDay, 10) || null) : null,
          due_day:            accountType === 'credit_card' ? (parseInt(dueDay, 10) || null) : null,
        };
        await onSave(data);
      } else {
        const data: CreateWalletInput = {
          name:               name.trim(),
          account_type:       accountType,
          currency,
          balance:            parseFloat(balance) || 0,
          icon:               icon || null,
          color,
          exclude_from_total: excludeFromTotal ? 1 : 0,
          credit_limit:       accountType === 'credit_card' ? (parseFloat(creditLimit) || null) : null,
          statement_day:      accountType === 'credit_card' ? (parseInt(statementDay, 10) || null) : null,
          due_day:            accountType === 'credit_card' ? (parseInt(dueDay, 10) || null) : null,
        };
        await onSave(data);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!onArchive) return;
    setSaving(true);
    try {
      await onArchive();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu trữ thất bại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] font-bold text-gray-900">
          {isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5">
        {error && (
          <p className="text-[13px] text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        {/* Name */}
        <div className="space-y-1">
          <label className="text-[13px] font-semibold text-gray-700">Tên tài khoản *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: MB Bank, Ví MoMo..."
            className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-indigo-400"
          />
        </div>

        {/* Account type */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-gray-700">Loại tài khoản *</label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={`h-11 rounded-xl text-[12px] font-semibold border transition-all ${
                  accountType === type
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {ACCOUNT_TYPE_ICONS[type]} {ACCOUNT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-1">
          <label className="text-[13px] font-semibold text-gray-700">Đơn vị tiền tệ</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-indigo-400"
          >
            {['VND', 'USD', 'EUR', 'JPY', 'GBP', 'SGD', 'THB', 'KRW'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Initial balance — create mode only */}
        {!isEdit && (
          <div className="space-y-1">
            <label className="text-[13px] font-semibold text-gray-700">Số dư ban đầu</label>
            <input
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-indigo-400"
            />
          </div>
        )}

        {/* Credit-card specific fields */}
        {accountType === 'credit_card' && (
          <div className="space-y-4 bg-orange-50 rounded-2xl p-4">
            <p className="text-[12px] font-semibold text-orange-600 uppercase tracking-wide">
              Thông tin thẻ tín dụng
            </p>
            <div className="space-y-1">
              <label className="text-[13px] font-semibold text-gray-700">Hạn mức tín dụng *</label>
              <input
                type="number"
                inputMode="decimal"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="VD: 50000000"
                className="w-full h-12 bg-white border border-orange-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-orange-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[13px] font-semibold text-gray-700">Ngày sao kê</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={(e) => setStatDay(e.target.value)}
                  placeholder="1–31"
                  className="w-full h-12 bg-white border border-orange-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-orange-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-semibold text-gray-700">Ngày đến hạn</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="1–31"
                  className="w-full h-12 bg-white border border-orange-200 rounded-xl px-4 text-[15px] text-gray-900 outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Icon picker */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-gray-700">Biểu tượng</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`w-10 h-10 rounded-xl text-xl border-2 transition-all ${
                  icon === e ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-gray-700">Màu sắc</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? '#000' : 'transparent',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Exclude from total */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setExclude(!excludeFromTotal)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
              excludeFromTotal ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                excludeFromTotal ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-[14px] text-gray-700">Không tính vào tổng tài sản</span>
        </label>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 space-y-3 pb-4">
          <button
            type="submit"
            disabled={saving}
            className={`w-full h-[52px] rounded-2xl bg-indigo-500 text-white text-[15px] font-semibold transition-all ${
              saving ? 'opacity-40' : 'shadow-lg shadow-indigo-500/20 active:scale-[0.98]'
            }`}
          >
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>

          {isEdit && onArchive && (
            <button
              type="button"
              disabled={saving}
              onClick={handleArchive}
              className="w-full h-11 rounded-2xl border border-red-200 text-red-500 text-[14px] font-semibold"
            >
              Lưu trữ tài khoản
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { Wallet, AccountType, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';
import { ACCOUNT_TYPE_ICONS } from './WalletCard';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { DropdownList } from '@/shared/components/DropdownList';
import { CURRENCIES, CurrencyCode } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  existing?: Wallet;
  onSave: (data: CreateWalletInput | UpdateWalletInput) => Promise<void>;
  onClose: () => void;
  onDelete?: () => Promise<boolean>;
}

const EMOJI_PRESETS = ['💼', '🏦', '💸', '📱', '📊', '💳', '🏠', '💵', '🧾', '🎆'];
const COLOR_PRESETS = [
  '#4CAF50', '#2196F3', '#E91E63', '#FF9800', '#9C27B0',
  '#00BCD4', '#F44336', '#3F51B5', '#009688', '#795548',
];
const ACCOUNT_TYPES: AccountType[] = [
  'cash', 'bank', 'credit_card', 'e_wallet', 'debt_or_loan', 'investment', 'other',
];

export function WalletForm({ existing, onSave, onClose, onDelete }: Props) {
  const isEdit = !!existing;
  const { t, language } = useLanguage();
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    debt_or_loan: t('wallets.account_debt_or_loan'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  const [name, setName] = useState(existing?.name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(existing?.account_type ?? 'cash');
  const [currency, setCurrency] = useState<CurrencyCode>((existing?.currency as CurrencyCode) ?? 'VND');
  const [balance, setBalance] = useState(
    existing?.account_type === 'credit_card'
      ? Math.max(0, -Number(existing.balance || 0)).toString()
      : existing?.balance?.toString() ?? '0'
  );
  const [icon, setIcon] = useState(existing?.icon ?? '');
  const [color, setColor] = useState(existing?.color ?? '#6366F1');
  const [excludeFromTotal, setExclude] = useState<boolean>((existing?.exclude_from_total ?? 0) === 1);
  const [creditLimit, setCreditLimit] = useState(existing?.credit_limit?.toString() ?? '');
  const [statementDay, setStatDay] = useState(existing?.statement_day?.toString() ?? '');
  const [dueDay, setDueDay] = useState(existing?.due_day?.toString() ?? '');
  const [annualFee, setAnnualFee] = useState(existing?.annual_fee?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) setIcon(ACCOUNT_TYPE_ICONS[accountType]);
  }, [accountType, existing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('wallets.name_required'));
      return;
    }
    if (accountType === 'credit_card') {
      const limit = parseFloat(creditLimit);
      if (Number.isNaN(limit) || limit <= 0) {
        setError(t('wallets.credit_limit_required'));
        return;
      }
    }

    setSaving(true);
    try {
      const common = {
        name: name.trim(),
        account_type: accountType,
        currency,
        icon: icon || null,
        color,
        exclude_from_total: excludeFromTotal ? 1 : 0,
        credit_limit: accountType === 'credit_card' ? (parseFloat(creditLimit) || null) : null,
        statement_day: accountType === 'credit_card' ? (parseInt(statementDay, 10) || null) : null,
        due_day: accountType === 'credit_card' ? (parseInt(dueDay, 10) || null) : null,
        annual_fee: accountType === 'credit_card' ? (parseFloat(annualFee) || null) : null,
      };

      if (isEdit) {
        await onSave({
          ...common,
          balance: accountType === 'credit_card'
            ? -(parseFloat(balance) || 0)
            : parseFloat(balance) || 0,
        } as UpdateWalletInput);
      } else {
        await onSave({
          ...common,
          balance: accountType === 'credit_card'
            ? -(parseFloat(balance) || 0)
            : parseFloat(balance) || 0,
        } as CreateWalletInput);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('wallets.save_failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    setError(null);
    try {
      const deleted = await onDelete();
      if (deleted) onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('wallets.delete_failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] font-bold text-gray-900">
          {isEdit ? t('wallets.edit_account') : t('wallets.add_account')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-gray-400 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('wallets.name')} *</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('wallets.name_placeholder')}
            className="w-full h-[48px] bg-gray-50 border border-gray-200 rounded-[14px] px-4 text-[14px] text-gray-900 outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('wallets.account_type')} *</p>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={`h-[44px] rounded-[12px] text-[12px] font-semibold border transition-all ${
                  accountType === type
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {ACCOUNT_TYPE_ICONS[type]} {accountTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('wallets.currency_unit')}</p>
          <DropdownList
            value={currency}
            onChange={setCurrency}
            ariaLabel={t('wallets.currency_unit')}
            options={CURRENCIES.map(item => ({
              value: item.code,
              label: `${item.flag} ${item.code} - ${language === 'vi' ? item.name_vi : item.name_en}`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">
            {accountType === 'credit_card'
              ? t('wallets.current_outstanding')
              : t('wallets.initial_balance')}
          </p>
          <CurrencyAmountInput
            currency={currency}
            value={balance}
            onValueChange={setBalance}
            className="border-gray-200"
          />
        </div>

        {accountType === 'credit_card' && (
          <div className="space-y-4 bg-orange-50 rounded-[14px] p-4">
            <p className="text-[12px] font-semibold text-orange-600 uppercase tracking-wide">
              {t('wallets.credit_info')}
            </p>
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-gray-700">{t('wallets.credit_limit')} *</p>
              <CurrencyAmountInput
                currency={currency}
                value={creditLimit}
                onValueChange={setCreditLimit}
                className="h-[48px] bg-white border-orange-200 rounded-[12px] focus-within:border-orange-400"
                inputClassName="text-[16px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-gray-700">{t('wallets.statement_day')}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={(e) => setStatDay(e.target.value)}
                  placeholder="1-31"
                  className="w-full h-[48px] bg-white border border-orange-200 rounded-[12px] px-4 text-[14px] text-gray-900 outline-none focus:border-orange-400"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-gray-700">{t('wallets.due_day')}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="1-31"
                  className="w-full h-[48px] bg-white border border-orange-200 rounded-[12px] px-4 text-[14px] text-gray-900 outline-none focus:border-orange-400"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-gray-700">{t('wallets.annual_fee')}</p>
              <CurrencyAmountInput
                currency={currency}
                value={annualFee}
                onValueChange={setAnnualFee}
                className="h-[48px] bg-white border-orange-200 rounded-[12px] focus-within:border-orange-400"
                inputClassName="text-[16px]"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('wallets.icon')}</p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-[12px] text-xl border-2 transition-all ${
                  icon === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('wallets.color')}</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: preset,
                  borderColor: color === preset ? '#000' : 'transparent',
                  transform: color === preset ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

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
          <span className="text-[14px] text-gray-700">{t('wallets.exclude_total')}</span>
        </label>

        <div className="pt-4 border-t border-gray-100 space-y-3 pb-4">
          <button
            type="submit"
            disabled={saving}
            className={`w-full h-[54px] rounded-[14px] bg-indigo-500 text-white text-[16px] font-bold
              transition-all active:scale-[0.98] ${
              saving ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
            }`}
          >
            {saving ? t('wallets.saving') : isEdit ? t('wallets.save_changes') : t('wallets.create_account')}
          </button>

          {isEdit && onDelete && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="w-full h-[48px] rounded-[14px] border border-red-200 text-red-500 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {t('wallets.delete_wallet')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

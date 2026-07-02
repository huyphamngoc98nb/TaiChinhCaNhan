import { useState, useEffect } from 'react';
import { CreateTransactionInput, UpdateTransactionInput, Transaction } from '../domain/transaction.model';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { createTransactionUseCase, updateTransactionUseCase } from '@/core/di/transactions.di';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { localizeTransactionError } from '../services/transaction-error-messages';
import {
  TransactionInputSettings,
  getLastUsedTransactionDate,
  getTransactionInputSettings,
  saveLastUsedTransactionDate,
} from '@/modules/settings/services/transaction-input-settings.service';
import { triggerSuccessHaptic } from '@/shared/utils/haptics';

export const TRANSFER_CATEGORY_ID = 'cat-transfer';
const TRANSACTION_DRAFT_KEY = 'transaction_draft';
const LEGACY_LAST_SUCCESSFUL_CREATE_KEY = 'transaction_last_successful_create';

type CreateTransactionFormValues = Omit<Partial<CreateTransactionInput>, 'transaction_date'> & {
  transaction_date?: number | null;
};

function clearStoredCreateTransactionState() {
  localStorage.removeItem(TRANSACTION_DRAFT_KEY);
  localStorage.removeItem(LEGACY_LAST_SUCCESSFUL_CREATE_KEY);
}

function getDefaultTransactionDate(settings: TransactionInputSettings): number {
  if (settings.defaultDateMode === 'last_used') {
    return getLastUsedTransactionDate() || Date.now();
  }

  return Date.now();
}

export function getDefaultCreateTransactionValues(): CreateTransactionFormValues {
  const settings = getTransactionInputSettings();
  const defaultTransactionType = settings.defaultTransactionType;

  return {
    type: defaultTransactionType,
    amount: 0,
    category_id: defaultTransactionType === 'transfer' ? TRANSFER_CATEGORY_ID : '',
    wallet_id: '',
    note: '',
    transaction_date: getDefaultTransactionDate(settings),
    is_budget_offset: false,
    offset_budget_id: null
  };
}

export function getCreateTransactionInitialValues(): CreateTransactionFormValues {
  clearStoredCreateTransactionState();

  return getDefaultCreateTransactionValues();
}

export function getEditTransactionInitialValues(existing: Transaction): CreateTransactionFormValues {
  return {
    type: existing.type,
    amount: existing.amount,
    category_id: existing.category_id,
    wallet_id: existing.wallet_id,
    to_wallet_id: existing.to_wallet_id || undefined,
    note: existing.note || '',
    transaction_date: existing.transaction_date,
    exclude_from_total: existing.exclude_from_total,
    is_budget_offset: existing.is_budget_offset ?? false,
    offset_budget_id: existing.offset_budget_id ?? null,
  };
}

export function useTransactionForm(existing?: Transaction) {
  const [formData, setFormData] = useState<CreateTransactionFormValues>(() => {
    if (existing) {
      return getEditTransactionInitialValues(existing);
    }

    return getCreateTransactionInitialValues();
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{ wallets: any[], categories: any[], budgets: any[] }>({ wallets: [], categories: [], budgets: [] });
  const toast = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    async function loadOptions() {
      try {
        const db = await getDbConnection();
        const { values: wallets } = await db.query(
          `SELECT id, name, account_type, balance
           FROM wallets
           WHERE is_active = 1
             AND balance <> 0
             AND TRIM(name) <> ''
           ORDER BY sort_order ASC, name ASC`
        );
        const { values: categories } = await db.query('SELECT id, name, type, slug FROM categories');
        const { values: budgets } = await db.query(`
          SELECT
            b.id,
            b.category_id,
            b.period,
            b.amount,
            b.wallet_id,
            b.account_type_scope,
            c.name AS category_name
          FROM budgets b
          JOIN categories c ON c.id = b.category_id
          WHERE b.is_active = 1
            AND c.type = 'expense'
          ORDER BY c.name ASC, b.period ASC
        `);
        
        const loadedWallets = wallets || [];
        const loadedCategories = categories || [];
        const loadedBudgets = budgets || [];
        
        setOptions({ wallets: loadedWallets, categories: loadedCategories, budgets: loadedBudgets });
        if (!existing) {
          const settings = getTransactionInputSettings();
          const requestedDefaultWalletId = settings.defaultWalletId ?? '';
          const validDefaultWalletId = requestedDefaultWalletId && loadedWallets.some(
            (wallet: { id: string }) => wallet.id === requestedDefaultWalletId
          )
            ? requestedDefaultWalletId
            : '';

          setFormData((current) => {
            if (
              current.wallet_id &&
              current.wallet_id !== requestedDefaultWalletId
            ) {
              return current;
            }

            if (current.wallet_id === validDefaultWalletId) {
              return current;
            }

            return { ...current, wallet_id: validDefaultWalletId };
          });
        }

      } catch (err) {
        console.error('Failed to load form options', err);
      }
    }
    loadOptions();
  }, [existing]); // Removed formData.wallet_id from deps to avoid loop

  const save = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        category_id: formData.type === 'transfer' ? TRANSFER_CATEGORY_ID : formData.category_id,
        to_wallet_id: formData.type === 'transfer' ? formData.to_wallet_id : undefined,
        is_budget_offset: formData.type === 'income' ? formData.is_budget_offset ?? false : false,
        offset_budget_id: formData.type === 'income' && formData.is_budget_offset
          ? formData.offset_budget_id ?? null
          : null,
      };

      if (existing) {
        await updateTransactionUseCase.execute(existing.id, payload as UpdateTransactionInput);
        void triggerSuccessHaptic();
        toast.success(t('transactions.update_success'));
      } else {
        await createTransactionUseCase.execute(payload as CreateTransactionInput);
        if (typeof formData.transaction_date === 'number' && Number.isFinite(formData.transaction_date)) {
          saveLastUsedTransactionDate(formData.transaction_date);
        }
        clearStoredCreateTransactionState();
        setFormData(getDefaultCreateTransactionValues());
        void triggerSuccessHaptic();
        toast.success(t('transactions.add_success'));
      }
      return true;
    } catch (e: unknown) {
      toast.error(localizeTransactionError(e, t));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { formData, setFormData, save, submitting, options };
}

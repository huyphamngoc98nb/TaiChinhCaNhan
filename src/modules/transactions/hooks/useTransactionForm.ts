import { useState, useEffect } from 'react';
import { CreateTransactionInput, UpdateTransactionInput, Transaction } from '../domain/transaction.model';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { createTransactionUseCase, updateTransactionUseCase } from '@/core/di/transactions.di';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { localizeTransactionError } from '../services/transaction-error-messages';

export const TRANSFER_CATEGORY_ID = 'cat-transfer';
const TRANSACTION_DRAFT_KEY = 'transaction_draft';
const LEGACY_LAST_SUCCESSFUL_CREATE_KEY = 'transaction_last_successful_create';

type CreateTransactionFormValues = Partial<CreateTransactionInput>;

function clearStoredCreateTransactionState() {
  localStorage.removeItem(TRANSACTION_DRAFT_KEY);
  localStorage.removeItem(LEGACY_LAST_SUCCESSFUL_CREATE_KEY);
}

export function getDefaultCreateTransactionValues(): CreateTransactionFormValues {
  return {
    type: 'expense',
    amount: 0,
    category_id: '',
    wallet_id: '',
    note: '',
    transaction_date: Date.now(),
    receipt_path: undefined
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
    receipt_path: existing.receipt_path || undefined
  };
}

export function useTransactionForm(existing?: Transaction) {
  const [formData, setFormData] = useState<CreateTransactionFormValues>(() => {
    if (existing) {
      return getEditTransactionInitialValues(existing);
    }

    return getCreateTransactionInitialValues();
  });
  
  const [receiptBase64, setReceiptBase64] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{ wallets: any[], categories: any[] }>({ wallets: [], categories: [] });
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
        const { values: categories } = await db.query('SELECT id, name, type FROM categories');
        
        const loadedWallets = wallets || [];
        const loadedCategories = categories || [];
        
        setOptions({ wallets: loadedWallets, categories: loadedCategories });

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
      };

      if (existing) {
        await updateTransactionUseCase.execute(existing.id, payload as UpdateTransactionInput, receiptBase64);
        toast.success(t('transactions.update_success'));
      } else {
        await createTransactionUseCase.execute(payload as CreateTransactionInput, receiptBase64);
        clearStoredCreateTransactionState();
        setFormData(getDefaultCreateTransactionValues());
        setReceiptBase64(undefined);
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

  return { formData, setFormData, receiptBase64, setReceiptBase64, save, submitting, options };
}

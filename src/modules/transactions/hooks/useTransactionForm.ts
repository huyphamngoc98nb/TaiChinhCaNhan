import { useState, useEffect } from 'react';
import { CreateTransactionInput, UpdateTransactionInput, Transaction } from '../domain/transaction.model';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { createTransactionUseCase, updateTransactionUseCase } from '@/core/di/transactions.di';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { localizeTransactionError } from '../services/transaction-error-messages';

export const TRANSFER_CATEGORY_ID = 'cat-transfer';

export function useTransactionForm(existing?: Transaction) {
  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>(() => {
    if (existing) {
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
    
    // Check for draft in localStorage
    const saved = localStorage.getItem('transaction_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }

    return {
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '', 
      note: '',
      transaction_date: Date.now(),
      receipt_path: undefined
    };
  });
  
  const [receiptBase64, setReceiptBase64] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{ wallets: any[], categories: any[] }>({ wallets: [], categories: [] });
  const toast = useToast();
  const { t } = useLanguage();

  // Save draft to localStorage
  useEffect(() => {
    if (!existing) {
      localStorage.setItem('transaction_draft', JSON.stringify(formData));
    }
  }, [formData, existing]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const db = await getDbConnection();
        const { values: wallets } = await db.query(
          `SELECT id, name
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

        // Auto-select first wallet if not editing and no draft wallet
        if (!existing && loadedWallets.length > 0 && !formData.wallet_id) {
          setFormData(prev => ({ ...prev, wallet_id: loadedWallets[0].id }));
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
      };

      if (existing) {
        await updateTransactionUseCase.execute(existing.id, payload as UpdateTransactionInput, receiptBase64);
        toast.success(t('transactions.update_success'));
      } else {
        await createTransactionUseCase.execute(payload as CreateTransactionInput, receiptBase64);
        localStorage.removeItem('transaction_draft'); // Clear draft on success
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

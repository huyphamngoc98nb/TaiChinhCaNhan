import { useState } from 'react';
import { useWallets } from '../hooks/useWallets';
import { WalletList } from '../components/WalletList';
import { WalletForm } from '../components/WalletForm';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';

export function WalletsPage() {
  const { wallets, totalBalance, loading, error, createWallet, updateWallet, deleteWallet } =
    useWallets();
  const { confirm } = useConfirm();
  const toast = useToast();
  const { t } = useLanguage();

  const [sheetOpen, setSheetOpen]         = useState(false);
  const [editTarget, setEditTarget]       = useState<Wallet | undefined>(undefined);

  function openCreate() {
    setEditTarget(undefined);
    setSheetOpen(true);
  }

  function openEdit(wallet: Wallet) {
    setEditTarget(wallet);
    setSheetOpen(true);
  }

  async function handleSave(data: CreateWalletInput | UpdateWalletInput) {
    if (editTarget) {
      await updateWallet(editTarget.id, data as UpdateWalletInput);
    } else {
      await createWallet(data as CreateWalletInput);
    }
  }

  async function handleDelete(): Promise<boolean> {
    if (!editTarget) return false;

    const ok = await confirm({
      title: t('wallets.delete_confirm_title'),
      message: `${t('wallets.delete_confirm_msg')} ${editTarget.name}`,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return false;

    await deleteWallet(editTarget.id);
    toast.success(t('wallets.delete_success'));
    return true;
  }

  return (
    <>
      <WalletList
        wallets={wallets}
        totalBalance={totalBalance}
        loading={loading}
        error={error}
        onWalletClick={openEdit}
        onAddClick={openCreate}
      />

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <WalletForm
          existing={editTarget}
          onSave={handleSave}
          onClose={() => setSheetOpen(false)}
          onDelete={editTarget ? handleDelete : undefined}
        />
      </BottomSheet>
    </>
  );
}

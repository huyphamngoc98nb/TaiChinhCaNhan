import { useState } from 'react';
import { useWallets } from '../hooks/useWallets';
import { WalletList } from '../components/WalletList';
import { WalletForm } from '../components/WalletForm';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '../repositories/sqlite-wallet.repository';

export function WalletsPage() {
  const { wallets, totalBalance, loading, error, createWallet, updateWallet, archiveWallet } =
    useWallets();

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

  async function handleArchive() {
    if (editTarget) {
      await archiveWallet(editTarget.id);
    }
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
          onArchive={editTarget ? handleArchive : undefined}
        />
      </BottomSheet>
    </>
  );
}

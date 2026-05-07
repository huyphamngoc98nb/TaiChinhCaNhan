import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ROUTES } from '@/shared/constants/routes';
import { DashboardPage } from '@/modules/transactions/pages/DashboardPage';
import { TransactionsPage } from '@/modules/transactions/pages/TransactionsPage';
import { AddTransactionPage } from '@/modules/transactions/pages/AddTransactionPage';
import { EditTransactionPage } from '@/modules/transactions/pages/EditTransactionPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: ROUTES.TRANSACTIONS, element: <TransactionsPage /> },
      { path: ROUTES.TRANSACTIONS_NEW, element: <AddTransactionPage /> },
      { path: ROUTES.TRANSACTIONS_EDIT, element: <EditTransactionPage /> },
      { path: ROUTES.SETTINGS, element: <SettingsPage /> },
    ],
  },
]);


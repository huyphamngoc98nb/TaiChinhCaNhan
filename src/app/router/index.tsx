import { createBrowserRouter } from 'react-router-dom';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { MainLayout } from '../layouts/MainLayout';
import { ROUTES } from '@/shared/constants/routes';
import { DashboardPage } from '@/modules/transactions/pages/DashboardPage';
import { TransactionsPage } from '@/modules/transactions/pages/TransactionsPage';
import { AddTransactionPage } from '@/modules/transactions/pages/AddTransactionPage';
import { EditTransactionPage } from '@/modules/transactions/pages/EditTransactionPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { BudgetSettingsPage } from '@/modules/budgets/pages/BudgetSettingsPage';
import { RecurringBillsPage } from '@/modules/recurring-bills/pages/RecurringBillsPage';
import { AddRecurringBillPage } from '@/modules/recurring-bills/pages/AddRecurringBillPage';
import { EditRecurringBillPage } from '@/modules/recurring-bills/pages/EditRecurringBillPage';
import { BackupPage } from '@/modules/backup/pages/BackupPage';
import { ExportPage } from '@/modules/export/pages/ExportPage';
import { WalletsPage } from '@/modules/wallets/pages/WalletsPage';
import { CategoriesPage } from '@/modules/categories/pages/CategoriesPage';
import { LoanListPage } from '@/modules/loans/pages/LoanListPage';
import { LoanDetailPage } from '@/modules/loans/pages/LoanDetailPage';

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
      { path: ROUTES.CATEGORIES, element: <CategoriesPage /> },
      { path: ROUTES.CATEGORIES_NEW, element: <CategoriesPage /> },
      { path: ROUTES.REPORTS, element: <ReportsPage /> },
      { path: ROUTES.BUDGETS, element: <BudgetSettingsPage /> },
      { path: ROUTES.BUDGETS_NEW, element: <BudgetSettingsPage /> },
      { path: ROUTES.RECURRING_BILLS, element: <RecurringBillsPage /> },
      { path: ROUTES.RECURRING_BILLS_NEW, element: <AddRecurringBillPage /> },
      { path: ROUTES.RECURRING_BILLS_EDIT, element: <EditRecurringBillPage /> },
      { path: ROUTES.LOANS, element: <LoanListPage /> },
      { path: ROUTES.LOANS_NEW, element: <LoanListPage /> },
      { path: ROUTES.LOANS_DETAIL, element: <LoanDetailPage /> },
      { path: ROUTES.BACKUP,          element: <BackupPage /> },
      { path: ROUTES.EXPORT,          element: <ExportPage /> },
      { path: ROUTES.WALLETS,         element: <WalletsPage /> },
      { path: ROUTES.WALLETS_NEW,     element: <WalletsPage /> },
    ],
  },
]);

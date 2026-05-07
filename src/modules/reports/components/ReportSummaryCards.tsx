import React from 'react';
import { CashflowSummary } from '../domain/report.model';

interface Props {
  data: CashflowSummary | null;
  loading: boolean;
}

export const ReportSummaryCards: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return <div className="grid grid-cols-3 gap-4 mb-6 text-gray-500">Loading summaries...</div>;
  }

  const income = data?.totalIncome || 0;
  const expense = data?.totalExpense || 0;
  const net = data?.netAmount || 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">Income</div>
        <div className="text-lg sm:text-xl font-bold text-green-600">${income.toFixed(2)}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">Expense</div>
        <div className="text-lg sm:text-xl font-bold text-red-600">${expense.toFixed(2)}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">Net</div>
        <div className={`text-lg sm:text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${net.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

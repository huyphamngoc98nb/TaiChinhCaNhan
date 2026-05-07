import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PeriodSummary } from '../domain/report.model';

interface Props {
  data: PeriodSummary[];
}

export const CashflowBarChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center border border-gray-100">
        <div className="text-gray-400">No cashflow data in this period.</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow h-80 mb-6 border border-gray-100" style={{ minHeight: '320px' }}>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Cashflow Over Time</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="period" tick={{fontSize: 12}} tickMargin={10} />
          <YAxis tick={{fontSize: 12}} />
          <Tooltip 
            formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`}
            cursor={{fill: '#f9fafb'}}
          />
          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
          <Bar dataKey="income" fill="#10B981" name="Income" radius={[2, 2, 0, 0]} maxBarSize={40} />
          <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

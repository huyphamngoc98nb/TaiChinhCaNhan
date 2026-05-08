import { useState, useEffect } from 'react';
import { SQLiteReportRepository } from '../repositories/sqlite-report.repository';
import { GetCashflowSummaryUseCase } from '../services/get-cashflow-summary';
import { GetCategorySummaryUseCase } from '../services/get-category-summary';
import { GetPeriodSummaryUseCase } from '../services/get-period-summary';
import { buildDateRange, DateRangePreset } from '../services/build-date-range';
import { ReportGranularity, CashflowSummary, CategorySummary, PeriodSummary } from '../domain/report.model';

import { ReportSummaryCards } from '../components/ReportSummaryCards';
import { DateRangePicker } from '../components/DateRangePicker';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { CashflowBarChart } from '../components/CashflowBarChart';

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [granularity, setGranularity] = useState<ReportGranularity>('day');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);
  const [expenses, setExpenses] = useState<CategorySummary[]>([]);
  const [periodData, setPeriodData] = useState<PeriodSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const repo = new SQLiteReportRepository();
        const range = buildDateRange(preset);

        const [cashflowRes, expensesRes, periodRes] = await Promise.all([
          new GetCashflowSummaryUseCase(repo).execute(range),
          new GetCategorySummaryUseCase(repo).execute(range, 'expense'),
          new GetPeriodSummaryUseCase(repo).execute(range, granularity),
        ]);

        if (isMounted) {
          setCashflow(cashflowRes);
          setExpenses(expensesRes);
          setPeriodData(periodRes);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || t('reports.no_data'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [preset, granularity]);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <button
          onClick={() => navigate(ROUTES.EXPORT)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
        >
          <FileText size={18} />
          <span>{t('reports.export')}</span>
        </button>
      </div>

      <DateRangePicker
        preset={preset}
        granularity={granularity}
        onPresetChange={setPreset}
        onGranularityChange={setGranularity}
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
          <p className="font-semibold">{t('reports.error_title')}</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <ReportSummaryCards data={cashflow} loading={loading} />

      {!loading && !error && (
        <div className="space-y-6">
          <CashflowBarChart data={periodData} />
          <ExpensePieChart data={expenses} />
        </div>
      )}
    </div>
  );
};

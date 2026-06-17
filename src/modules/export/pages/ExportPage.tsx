import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, FileText, Table, Share2, Calendar } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { buildExportDatasetUseCase } from '@/core/di/export.di';
import { logger } from '@/core/telemetry/logger';
import { errorLogRepository } from '@/core/telemetry/error-log.repository';
import { exportToPdf } from '../services/export-pdf';
import { exportToCsv } from '../services/export-excel';
import { exportErrorLogsToJson } from '../services/export-error-logs';
import { saveErrorLogFile } from '../services/save-error-log-file';
import { shareFile } from '../services/share-file';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { ROUTES } from '@/shared/constants/routes';

export function ExportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { language, t } = useLanguage();
  const { currency, currencyInfo } = useCurrency();
  const locale = getAppLocale(language);
  const [loading, setLoading] = useState(false);

  // Default range: last 30 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handleExport = async (format: 'pdf' | 'csv') => {
    setLoading(true);
    try {
      const range = {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime() + 86399999, // End of day
      };

      const dataset = await buildExportDatasetUseCase.execute(range);

      if (dataset.rawTransactions.length === 0) {
        toast.info(t('export_data.empty_transactions'));
      }

      const fileName = `expense_report_${startDate}_to_${endDate}.${format}`;

      if (format === 'pdf') {
        const isVietnamese = language === 'vi';
        const formatPdfAmount = (value: number) => new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          currencyDisplay: 'code',
          maximumFractionDigits: currencyInfo.fractionDigits,
          minimumFractionDigits: currencyInfo.fractionDigits,
        }).format(value);

        const dataUri = await exportToPdf(dataset, locale, {
          labels: {
            title: t('reports.title'),
            period: t('reports.period_label'),
            exportedOn: t('reports.exported_on'),
            financialSummary: t('reports.financial_summary'),
            description: t('reports.description'),
            amount: t('form.label_amount'),
            totalIncome: t('reports.total_income'),
            totalExpense: t('reports.total_expense'),
            netBalance: t('reports.net'),
            expenseByCategory: t('reports.expense_by_category'),
            category: t('form.label_category'),
            transactionDetails: t('transactions.title'),
            date: t('form.label_date'),
            type: t('transactions.type'),
            note: t('form.label_note'),
            uncategorized: t('reports.other'),
            typeIncome: t('form.type_income'),
            typeExpense: t('form.type_expense'),
            typeTransfer: t('transactions.transfer'),
          },
          formatAmount: formatPdfAmount,
          renderAsImage: isVietnamese,
        });
        await shareFile(fileName, dataUri, 'application/pdf');
      } else {
        const csvContent = exportToCsv(dataset);
        await shareFile(fileName, csvContent, 'text/csv');
      }

      toast.success(`${format.toUpperCase()} ${t('export_data.export_complete')}`);
    } catch (error: unknown) {
      logger.error('Report export failed', error, {
        context: 'ExportPage',
        metadata: { format },
      });
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('export_data.export_failed')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportErrorLogs = async () => {
    setLoading(true);
    try {
      const logs = await errorLogRepository.list(500);
      const content = exportErrorLogsToJson(logs);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const saved = await saveErrorLogFile(`error_logs_${timestamp}.json`, content);

      if (!saved) {
        toast.info(t('export_data.log_export_cancelled'));
        return;
      }

      if (logs.length === 0) {
        toast.info(t('export_data.empty_logs'));
      } else {
        toast.success(t('export_data.logs_exported'));
      }
    } catch (error: unknown) {
      logger.error('Error log export failed', error, { context: 'ExportPage' });
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('export_data.log_export_failed')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: '20px',
    background: 'var(--surface)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.1s',
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{t('export_data.title')}</h2>
      </div>

      {/* Date Selection */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            color: 'var(--text-muted)',
          }}
        >
          <Calendar size={18} />
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('export_data.select_date_range')}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              {t('export_data.from')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              {t('export_data.to')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={cardStyle} onClick={() => !loading && handleExport('pdf')}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(244, 63, 94, 0.1)',
              color: '#f43f5e',
              borderRadius: '12px',
            }}
          >
            <FileText size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{t('export_data.pdf_title')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('export_data.pdf_description')}
            </div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>

        <div style={cardStyle} onClick={() => !loading && handleExport('csv')}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              borderRadius: '12px',
            }}
          >
            <Table size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{t('export_data.csv_title')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('export_data.csv_description')}
            </div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>

        <div style={cardStyle} onClick={() => !loading && handleExportErrorLogs()}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: '12px',
            }}
          >
            <Bug size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{t('export_data.logs_title')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('export_data.logs_description')}
            </div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)' }}>
          <p>{t('export_data.generating')}</p>
        </div>
      )}

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5',
        }}
      >
        <b>{t('export_data.tip_label')}</b> {t('export_data.tip')}
      </div>
    </div>
  );
}

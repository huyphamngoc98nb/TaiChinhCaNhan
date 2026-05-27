import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, FileText, Table, Share2, Calendar } from 'lucide-react';
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
import { getAppLocale } from '@/shared/utils/locale';

const EXPORT_COPY = {
  en: {
    title: 'Export Data',
    selectDateRange: 'Select Date Range',
    from: 'From',
    to: 'To',
    pdfTitle: 'PDF Report',
    pdfDescription: 'Formatted document with summaries',
    csvTitle: 'Excel (CSV)',
    csvDescription: 'Raw transaction data spreadsheet',
    logsTitle: 'Error Logs (JSON)',
    logsDescription: 'Saved app errors and diagnostic metadata',
    generating: 'Generating file...',
    emptyTransactions: 'No transactions found for the selected range, but generating summary report.',
    exportComplete: 'export complete',
    exportFailed: 'Export failed',
    logExportCancelled: 'Log export cancelled',
    emptyLogs: 'No error logs found. Exported an empty JSON log file.',
    logsExported: 'Error logs exported as JSON',
    logExportFailed: 'Log export failed',
    tipLabel: 'Pro Tip:',
    tip: 'Use the PDF report for sharing with your accountant, and Excel for your own custom analysis.',
  },
  vi: {
    title: 'Xuất dữ liệu',
    selectDateRange: 'Chọn khoảng ngày',
    from: 'Từ ngày',
    to: 'Đến ngày',
    pdfTitle: 'Báo cáo PDF',
    pdfDescription: 'Tài liệu đã định dạng kèm tổng hợp',
    csvTitle: 'Excel (CSV)',
    csvDescription: 'Dữ liệu giao dịch dạng bảng tính',
    logsTitle: 'Nhật ký lỗi (JSON)',
    logsDescription: 'Lỗi ứng dụng và thông tin chẩn đoán đã lưu',
    generating: 'Đang tạo tập tin...',
    emptyTransactions: 'Không có giao dịch trong khoảng ngày đã chọn, vẫn tạo báo cáo tổng hợp.',
    exportComplete: 'Đã xuất xong',
    exportFailed: 'Xuất dữ liệu thất bại',
    logExportCancelled: 'Đã hủy xuất nhật ký',
    emptyLogs: 'Không có nhật ký lỗi. Đã xuất tập tin JSON rỗng.',
    logsExported: 'Đã xuất nhật ký lỗi dạng JSON',
    logExportFailed: 'Xuất nhật ký thất bại',
    tipLabel: 'Gợi ý:',
    tip: 'Dùng báo cáo PDF để chia sẻ, và Excel để tự phân tích dữ liệu.',
  },
} as const;

export function ExportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { language } = useLanguage();
  const locale = getAppLocale(language);
  const copy = EXPORT_COPY[language];
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
        endDate: new Date(endDate).getTime() + 86399999 // End of day
      };

      const dataset = await buildExportDatasetUseCase.execute(range);
      
      if (dataset.rawTransactions.length === 0) {
        toast.info(copy.emptyTransactions);
      }

      const fileName = `expense_report_${startDate}_to_${endDate}.${format}`;
      
      if (format === 'pdf') {
        const dataUri = await exportToPdf(dataset, locale);
        // datauristring contains the base64, but shareFile expects raw string or base64?
        // My shareFile expects string. For PDF I'll just use download via window.open on web, 
        // but for native I should be careful.
        // Let's simplify: on native we might need base64.
        await shareFile(fileName, dataUri, 'application/pdf');
      } else {
        const csvContent = exportToCsv(dataset);
        await shareFile(fileName, csvContent, 'text/csv');
      }

      toast.success(`${format.toUpperCase()} ${copy.exportComplete}`);
    } catch (error: unknown) {
      logger.error('Report export failed', error, {
        context: 'ExportPage',
        metadata: { format },
      });
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${copy.exportFailed}: ${message}`);
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
        toast.info(copy.logExportCancelled);
        return;
      }

      if (logs.length === 0) {
        toast.info(copy.emptyLogs);
      } else {
        toast.success(copy.logsExported);
      }
    } catch (error: unknown) {
      logger.error('Error log export failed', error, { context: 'ExportPage' });
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${copy.logExportFailed}: ${message}`);
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
    transition: 'transform 0.1s'
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{copy.title}</h2>
      </div>

      {/* Date Selection */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-muted)' }}>
          <Calendar size={18} />
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{copy.selectDateRange}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{copy.from}</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{copy.to}</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div 
          style={cardStyle}
          onClick={() => !loading && handleExport('pdf')}
        >
          <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: '12px' }}>
            <FileText size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{copy.pdfTitle}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{copy.pdfDescription}</div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>

        <div 
          style={cardStyle}
          onClick={() => !loading && handleExport('csv')}
        >
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px' }}>
            <Table size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{copy.csvTitle}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{copy.csvDescription}</div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>

        <div
          style={cardStyle}
          onClick={() => !loading && handleExportErrorLogs()}
        >
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px' }}>
            <Bug size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{copy.logsTitle}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{copy.logsDescription}</div>
          </div>
          <Share2 size={20} color="var(--border)" />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)' }}>
          <p>{copy.generating}</p>
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        <b>{copy.tipLabel}</b> {copy.tip}
      </div>
    </div>
  );
}

import { ExportDataset } from './build-export-dataset';

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatCsvDate(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function exportToCsv(dataset: ExportDataset): string {
  const { rawTransactions } = dataset;
  const rows: string[][] = [];

  rows.push([
    'id',
    'date',
    'type',
    'amount',
    'currency',
    'wallet/account',
    'category',
    'note',
    'tags',
    'createdAt',
    'updatedAt',
  ]);

  rawTransactions.forEach((transaction) => {
    rows.push([
      transaction.id,
      formatCsvDate(transaction.transaction_date),
      transaction.type,
      transaction.amount.toString(),
      transaction.wallet_currency || '',
      transaction.wallet_name || transaction.wallet_id,
      transaction.category_name || transaction.category_id,
      transaction.note || '',
      '',
      formatCsvDate(transaction.created_at),
      formatCsvDate(transaction.updated_at),
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ExportDataset } from './build-export-dataset';

// Extending jsPDF with autotable types for TS
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

export async function exportToPdf(dataset: ExportDataset): Promise<string> {
  const doc = new jsPDF();
  const { range, cashflow, expensesByCategory, rawTransactions } = dataset;

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString();

  // Header
  doc.setFontSize(22);
  doc.text('Expense Tracker Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${formatDate(range.startDate)} - ${formatDate(range.endDate)}`, 14, 30);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 35);

  // Cashflow Summary
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Financial Summary', 14, 50);
  
  doc.autoTable({
    startY: 55,
    head: [['Description', 'Amount']],
    body: [
      ['Total Income', `$${cashflow.totalIncome.toFixed(2)}`],
      ['Total Expenses', `$${cashflow.totalExpense.toFixed(2)}`],
      ['Net Balance', `$${cashflow.netAmount.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [14, 165, 233] },
  });

  // Categories
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.text('Expenses by Category', 14, currentY);
  
  doc.autoTable({
    startY: currentY + 5,
    head: [['Category', 'Amount']],
    body: expensesByCategory.map(c => [c.category_name, `$${c.amount.toFixed(2)}`]),
    theme: 'grid',
    headStyles: { fillColor: [244, 63, 94] },
  });

  // Transactions (Detailed)
  doc.addPage();
  doc.text('Transaction Details', 14, 20);
  
  doc.autoTable({
    startY: 25,
    head: [['Date', 'Category', 'Type', 'Amount', 'Note']],
    body: rawTransactions.map(t => [
      formatDate(t.transaction_date),
      t.category_name || 'Uncategorized',
      t.type.toUpperCase(),
      `$${t.amount.toFixed(2)}`,
      t.note || '-'
    ]),
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      4: { cellWidth: 50 } // Note column wrap
    }
  });

  return doc.output('datauristring');
}

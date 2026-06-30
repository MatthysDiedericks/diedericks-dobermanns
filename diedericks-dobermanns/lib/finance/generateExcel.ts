import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import type { FinanceReportData } from '@/types/finance';

export async function exportFinanceExcel(reportData: FinanceReportData) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['DIEDERICKS DOBERMANNS'],
    ['INCOME STATEMENT'],
    [`Period: ${reportData.periodLabel}`],
    ['Generated:', new Date().toLocaleDateString('en-ZA')],
    [],
    ['INCOME', '', 'AMOUNT (ZAR)'],
    ...reportData.incomeLines.map((l) => [l.label, '', l.amount]),
    ['TOTAL INCOME', '', reportData.totalIncome],
    [],
    ['EXPENSES', '', 'AMOUNT (ZAR)'],
    ...reportData.expenseLines.map((l) => [l.label, '', l.amount]),
    ['TOTAL EXPENSES', '', reportData.totalExpenses],
    [],
    ['NET PROFIT', '', reportData.netProfit],
    ['PROFIT MARGIN', '', `${reportData.profitMargin.toFixed(1)}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Income Statement');

  const invoiceData = [
    ['Invoice #', 'Client', 'Dog', 'Date', 'Total', 'Paid', 'Outstanding', 'Status'],
    ...reportData.invoices.map((i) => [
      i.invoice_number,
      i.clientName,
      i.dogName ?? '',
      i.issue_date,
      i.total_amount,
      i.amount_paid,
      i.amount_outstanding,
      i.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invoiceData), 'Invoices');

  const expenseData = [
    ['Date', 'Category', 'Description', 'Supplier', 'Amount', 'Dog', 'Recurring'],
    ...reportData.expenses.map((e) => [
      e.expense_date,
      e.categoryName,
      e.description,
      e.supplier_name ?? '',
      e.amount,
      e.dogName ?? '',
      e.is_recurring ? 'Yes' : 'No',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseData), 'Expenses');

  const monthlyData = [
    ['Month', 'Income', 'Expenses', 'Net Profit', 'Margin %'],
    ...reportData.monthlySummary.map((m) => [
      m.month,
      m.income,
      m.expenses,
      m.income - m.expenses,
      m.income > 0 ? `${(((m.income - m.expenses) / m.income) * 100).toFixed(1)}%` : '0%',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyData), 'Monthly Summary');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `DD_Finance_${reportData.periodLabel.replace(/\s/g, '_')}.xlsx`;
  const fileUri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Finance Report',
  });
}

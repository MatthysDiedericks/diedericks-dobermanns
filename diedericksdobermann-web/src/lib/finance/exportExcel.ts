import * as XLSX from "xlsx";

import type { FinanceReportData } from "@/types/finance";

function buildWorkbook(report: FinanceReportData) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["DIEDERICKS DOBERMANNS"],
    ["INCOME STATEMENT"],
    [`Period: ${report.periodLabel}`],
    ["Generated:", new Date().toLocaleDateString("en-ZA")],
    [],
    ["INCOME", "", "AMOUNT (ZAR)"],
    ...report.incomeLines.map((l) => [l.label, "", l.amount]),
    ["TOTAL INCOME", "", report.totalIncome],
    [],
    ["EXPENSES", "", "AMOUNT (ZAR)"],
    ...report.expenseLines.map((l) => [l.label, "", l.amount]),
    ["TOTAL EXPENSES", "", report.totalExpenses],
    [],
    ["NET PROFIT", "", report.netProfit],
    ["PROFIT MARGIN", "", `${report.profitMargin.toFixed(1)}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Income Statement");

  const invoiceData = [
    [
      "Invoice #",
      "Client",
      "Dog",
      "Date",
      "Total",
      "Paid",
      "Outstanding",
      "Status",
    ],
    ...report.invoices.map((i) => [
      i.invoice_number,
      i.clientName,
      i.dogName ?? "",
      i.issue_date,
      i.total_amount,
      i.amount_paid,
      i.amount_outstanding,
      i.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(invoiceData),
    "Invoices",
  );

  const expenseData = [
    ["Date", "Category", "Description", "Supplier", "Amount", "Dog", "Recurring"],
    ...report.expenses.map((e) => [
      e.expense_date,
      e.categoryName,
      e.description,
      e.supplier_name ?? "",
      e.amount,
      e.dogName ?? "",
      e.is_recurring ? "Yes" : "No",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(expenseData),
    "Expenses",
  );

  const monthlyData = [
    ["Month", "Income", "Expenses", "Net Profit", "Margin %"],
    ...report.monthlySummary.map((m) => [
      m.month,
      m.income,
      m.expenses,
      m.income - m.expenses,
      m.income > 0
        ? `${(((m.income - m.expenses) / m.income) * 100).toFixed(1)}%`
        : "0%",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(monthlyData),
    "Monthly Summary",
  );

  return wb;
}

export function exportFinanceExcel(report: FinanceReportData) {
  const wb = buildWorkbook(report);
  const filename = `DD_Finance_${report.periodLabel.replace(/\s/g, "_")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

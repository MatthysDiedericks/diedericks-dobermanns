import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatAmountPlain } from "@/lib/finance/formatters";
import type { FinanceReportData, InvoiceWithDetails } from "@/types/finance";

export function exportInvoicePDF(invoice: InvoiceWithDetails) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(17, 16, 8);
  doc.rect(0, 0, 210, 50, "F");
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(22);
  doc.setFont("times", "bold");
  doc.text("DIEDERICKS DOBERMANNS", 20, 22);
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text("Precision bred. Professionally trained. Lifetime proven.", 20, 30);

  doc.setTextColor(245, 240, 232);
  doc.setFontSize(28);
  doc.text("INVOICE", 160, 22, { align: "right" });
  doc.setFontSize(11);
  doc.text(invoice.invoice_number, 160, 30, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.text("BILL TO:", 20, 62);
  doc.setFont("times", "bold");
  doc.text(invoice.clientName, 20, 68);
  doc.setFont("times", "normal");
  doc.text(invoice.clientEmail, 20, 73);

  doc.text(`Issue Date: ${invoice.issue_date}`, 140, 62);
  doc.text(`Due Date: ${invoice.due_date ?? "On receipt"}`, 140, 68);

  autoTable(doc, {
    startY: 85,
    head: [["Description", "Type", "Qty", "Unit Price", "Total"]],
    body: invoice.items.map((i) => [
      i.description,
      i.item_type,
      i.quantity,
      `R ${formatAmountPlain(i.unit_price)}`,
      `R ${formatAmountPlain(i.line_total)}`,
    ]),
    headStyles: {
      fillColor: [17, 16, 8],
      textColor: [196, 163, 90],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 249, 245] },
    columnStyles: { 4: { halign: "right" } },
  });

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  doc.text("Subtotal:", 145, finalY);
  doc.text(
    `R ${formatAmountPlain(invoice.subtotal)}`,
    190,
    finalY,
    { align: "right" },
  );
  if (invoice.discount_amount > 0) {
    doc.text("Discount:", 145, finalY + 6);
    doc.text(
      `-R ${formatAmountPlain(invoice.discount_amount)}`,
      190,
      finalY + 6,
      { align: "right" },
    );
  }
  doc.setFont("times", "bold");
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(13);
  doc.text("TOTAL:", 145, finalY + 14);
  doc.text(
    `R ${formatAmountPlain(invoice.total_amount)}`,
    190,
    finalY + 14,
    { align: "right" },
  );

  doc.setFont("times", "normal");
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(
    `Amount Paid: R ${formatAmountPlain(invoice.amount_paid)}`,
    145,
    finalY + 22,
  );
  doc.setTextColor(192, 57, 43);
  doc.text(
    `Outstanding: R ${formatAmountPlain(invoice.amount_outstanding)}`,
    145,
    finalY + 28,
  );

  doc.setFillColor(17, 16, 8);
  doc.rect(0, 280, 210, 17, "F");
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(8);
  doc.text("Diedericks Dobermanns · Confidential", 105, 290, { align: "center" });

  doc.save(`${invoice.invoice_number}.pdf`);
}

export function exportIncomeStatementPDF(report: FinanceReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(17, 16, 8);
  doc.rect(0, 0, 210, 45, "F");
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(18);
  doc.setFont("times", "bold");
  doc.text("DIEDERICKS DOBERMANNS", 20, 18);
  doc.setFontSize(11);
  doc.text("INCOME STATEMENT", 20, 26);
  doc.setTextColor(245, 240, 232);
  doc.setFontSize(9);
  doc.text(`Period: ${report.periodLabel}`, 20, 34);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, 20, 39);

  autoTable(doc, {
    startY: 55,
    head: [["INCOME", "Amount (ZAR)"]],
    body: [
      ...report.incomeLines.map((l) => [
        l.label,
        `R ${l.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      ]),
      [
        { content: "TOTAL INCOME", styles: { fontStyle: "bold" } },
        {
          content: `R ${report.totalIncome.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    headStyles: { fillColor: [17, 16, 8], textColor: [196, 163, 90] },
    columnStyles: { 1: { halign: "right" } },
  });

  autoTable(doc, {
    startY:
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8,
    head: [["EXPENSES", "Amount (ZAR)"]],
    body: [
      ...report.expenseLines.map((l) => [
        l.label,
        `R ${l.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      ]),
      [
        { content: "TOTAL EXPENSES", styles: { fontStyle: "bold" } },
        {
          content: `R ${report.totalExpenses.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    headStyles: { fillColor: [17, 16, 8], textColor: [196, 163, 90] },
    columnStyles: { 1: { halign: "right" } },
  });

  const y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;
  doc.setDrawColor(196, 163, 90);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(14);
  doc.setFont("times", "bold");
  doc.text("NET PROFIT", 20, y + 9);
  doc.text(
    `R ${report.netProfit.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
    190,
    y + 9,
    { align: "right" },
  );
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Profit Margin: ${report.profitMargin.toFixed(1)}%`, 20, y + 17);

  doc.setFillColor(17, 16, 8);
  doc.rect(0, 280, 210, 17, "F");
  doc.setTextColor(196, 163, 90);
  doc.setFontSize(8);
  doc.setFont("times", "normal");
  doc.text(
    "CONFIDENTIAL — Management use only · Diedericks Dobermanns",
    105,
    290,
    { align: "center" },
  );

  doc.save(
    `DD_Income_Statement_${report.periodLabel.replace(/\s/g, "-")}.pdf`,
  );
}

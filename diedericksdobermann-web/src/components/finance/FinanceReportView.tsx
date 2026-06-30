"use client";

import { useState } from "react";

import { exportFinanceExcel } from "@/lib/finance/exportExcel";
import { exportIncomeStatementPDF } from "@/lib/finance/exportPDF";
import { formatAmount } from "@/lib/finance/formatters";
import { primaryBtn } from "@/lib/admin/styles";
import type { FinanceReportData } from "@/types/finance";

export function FinanceReportView({
  initialReport,
}: {
  initialReport: FinanceReportData;
}) {
  const [report, setReport] = useState(initialReport);
  const [from, setFrom] = useState(initialReport.from);
  const [to, setTo] = useState(initialReport.to);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(
      `/api/admin/finance-report?from=${from}&to=${to}`,
    );
    if (res.ok) {
      const data = (await res.json()) as FinanceReportData;
      setReport(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-sm border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-sm border border-border bg-background px-3 py-2 text-sm"
        />
        <button onClick={generate} disabled={loading} className={primaryBtn}>
          {loading ? "Loading…" : "Generate"}
        </button>
        <button
          onClick={() => exportIncomeStatementPDF(report)}
          className="rounded-sm border border-gold px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-gold"
        >
          Download PDF
        </button>
        <button
          onClick={() => exportFinanceExcel(report)}
          className="rounded-sm border border-gold px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-gold"
        >
          Download Excel
        </button>
      </div>

      <article className="rounded-sm border border-gold/20 bg-surface p-8 font-mono text-sm">
        <p className="font-cinzel text-lg tracking-widest text-gold">
          DIEDERICKS DOBERMANNS
        </p>
        <p className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Income Statement
        </p>
        <p className="mt-2 text-xs text-subtle">Period: {report.periodLabel}</p>

        <section className="mt-8">
          <h2 className="border-b border-gold/30 pb-1 font-cinzel text-xs uppercase tracking-widest text-gold">
            Income
          </h2>
          {report.incomeLines.map((l) => (
            <div key={l.label} className="flex justify-between py-1 pl-4">
              <span className="text-muted">{l.label}</span>
              <span>{formatAmount(l.amount)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-gold/20 pt-2 font-bold">
            <span>TOTAL INCOME</span>
            <span className="text-gold">{formatAmount(report.totalIncome)}</span>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="border-b border-gold/30 pb-1 font-cinzel text-xs uppercase tracking-widest text-gold">
            Expenses
          </h2>
          {report.expenseLines.map((l) => (
            <div key={l.label} className="flex justify-between py-1 pl-4">
              <span className="text-muted">{l.label}</span>
              <span>{formatAmount(l.amount)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-gold/20 pt-2 font-bold">
            <span>TOTAL EXPENSES</span>
            <span>{formatAmount(report.totalExpenses)}</span>
          </div>
        </section>

        <div className="mt-8 border-y border-gold/40 py-4">
          <div className="flex justify-between font-cinzel text-xl text-gold">
            <span>NET PROFIT</span>
            <span>{formatAmount(report.netProfit)}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs text-subtle">
            <span>Profit Margin</span>
            <span>{report.profitMargin.toFixed(1)}%</span>
          </div>
        </div>

        <p className="mt-8 text-[10px] uppercase tracking-widest text-subtle">
          Confidential — management use only
        </p>
      </article>
    </div>
  );
}

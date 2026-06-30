import Link from "next/link";

import { FinanceCharts } from "@/components/finance/FinanceCharts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cardClass } from "@/lib/admin/styles";
import { formatAmount, formatDate } from "@/lib/finance/formatters";
import {
  buildMonthlySummary,
  computeKpis,
  fetchExpensesInRange,
  fetchIncomeByItemType,
  fetchInvoicesInRange,
  yearMonthRange,
} from "@/lib/finance/queries";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const year = Number(params.year ?? new Date().getFullYear());
  const month =
    params.month !== undefined && params.month !== "all"
      ? Number(params.month)
      : undefined;

  const { from, to } = yearMonthRange(year, month);

  const [kpis, monthly, incomeByType, invoices, expenses] = await Promise.all([
    computeKpis(from, to),
    buildMonthlySummary(year),
    fetchIncomeByItemType(from, to),
    fetchInvoicesInRange(from, to),
    fetchExpensesInRange(from, to),
  ]);

  const expenseByCategory = expenses.reduce(
    (acc, e) => {
      const name = e.categoryName ?? "Other";
      acc.set(name, (acc.get(name) ?? 0) + Number(e.amount));
      return acc;
    },
    new Map<string, number>(),
  );
  const expenseLines = [...expenseByCategory.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const recentInvoices = invoices.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-3xl text-gold">Finance</h1>
          <p className="mt-1 text-sm text-muted">
            Income, expenses, and profit at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <YearMonthFilters year={year} month={params.month ?? "all"} />
          <Link
            href="/admin/finance/invoices/new"
            className="rounded-sm bg-gold px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-background"
          >
            New Invoice
          </Link>
          <Link
            href="/admin/finance/expenses/new"
            className="rounded-sm border border-gold px-4 py-2 font-cinzel text-xs uppercase tracking-widest text-gold"
          >
            Log Expense
          </Link>
        </div>
      </div>

      <FinanceCharts
        kpis={kpis}
        monthly={monthly}
        incomeByType={incomeByType}
        expenseByCategory={expenseLines}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
              Recent Invoices
            </h2>
            <Link href="/admin/finance/invoices" className="text-xs text-gold">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/admin/finance/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-sm px-2 py-2 hover:bg-elevated"
              >
                <div>
                  <p className="font-mono text-sm text-gold">
                    {inv.invoice_number}
                  </p>
                  <p className="text-xs text-subtle">
                    {inv.client?.full_name ?? "—"} · {formatDate(inv.issue_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatAmount(inv.total_amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-subtle">No invoices yet.</p>
            ) : null}
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
              Recent Expenses
            </h2>
            <Link href="/admin/finance/expenses" className="text-xs text-gold">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-sm px-2 py-2"
              >
                <div>
                  <p className="text-sm text-text">{exp.description}</p>
                  <p className="text-xs text-subtle">
                    {exp.categoryName} · {formatDate(exp.expense_date)}
                  </p>
                </div>
                <p className="text-sm text-gold">{formatAmount(exp.amount)}</p>
              </div>
            ))}
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-subtle">No expenses yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function YearMonthFilters({ year, month }: { year: number; month: string }) {
  const months = [
    "all",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
  ];
  const monthLabels = [
    "All",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {[year, year - 1].map((y) => (
        <Link
          key={y}
          href={`/admin/finance?year=${y}&month=${month}`}
          className={
            y === year
              ? "rounded-sm border border-gold bg-gold/10 px-3 py-1.5 text-xs uppercase tracking-widest text-gold"
              : "rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted"
          }
        >
          {y}
        </Link>
      ))}
      {months.map((m, i) => (
        <Link
          key={m}
          href={`/admin/finance?year=${year}&month=${m}`}
          className={
            month === m
              ? "rounded-sm border border-gold bg-gold/10 px-2 py-1.5 text-[10px] uppercase tracking-widest text-gold"
              : "rounded-sm border border-border px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted"
          }
        >
          {monthLabels[i]}
        </Link>
      ))}
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAmount } from "@/lib/finance/formatters";
import type { FinanceKpis, FinanceLine, MonthlySummary } from "@/types/finance";

type Props = {
  kpis: FinanceKpis;
  monthly: MonthlySummary[];
  incomeByType: FinanceLine[];
  expenseByCategory: FinanceLine[];
};

const GOLD = "#C4A35A";
const RED = "#C0392B";
const GREEN = "#2ECC71";

export function FinanceCharts({
  kpis,
  monthly,
  incomeByType,
  expenseByCategory,
}: Props) {
  const chartData = monthly.map((m) => ({
    month: m.month,
    income: m.income,
    expenses: m.expenses,
    profit: m.income - m.expenses,
  }));

  const pieColors = [GOLD, "#D4B472", "#8A7240", "#5C5746", "#9E9880"];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Income"
          value={formatAmount(kpis.totalIncome)}
          sub="Received"
          delta={kpis.incomeDeltaPct}
        />
        <KpiCard
          label="Total Expenses"
          value={formatAmount(kpis.totalExpenses)}
          sub="Paid out"
          delta={kpis.expenseDeltaPct}
          invertDelta
        />
        <KpiCard
          label="Net Profit"
          value={formatAmount(kpis.netProfit)}
          sub="Income − expenses"
          delta={kpis.profitDeltaPct}
          valueClass={kpis.netProfit >= 0 ? "text-gold" : "text-red-400"}
        />
        <KpiCard
          label="Profit Margin"
          value={`${kpis.profitMargin.toFixed(1)}%`}
          sub="Of income"
          valueClass={kpis.profitMargin >= 0 ? "text-gold" : "text-red-400"}
        />
      </div>

      <div className="rounded-sm border border-gold/20 bg-surface p-6">
        <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Monthly Income vs Expenses
        </h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="#2E2B1E" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#9E9880" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9E9880" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#1C1A0E",
                  border: "1px solid rgba(196,163,90,0.3)",
                }}
                formatter={(v) => formatAmount(Number(v ?? 0))}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill={GOLD} />
              <Bar dataKey="expenses" name="Expenses" fill={RED} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Net Profit"
                stroke={GREEN}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-gold/20 bg-surface p-6">
          <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
            Income by Type
          </h2>
          <div className="mt-4 h-64">
            {incomeByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeByType}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {incomeByType.map((_, i) => (
                      <Cell
                        key={i}
                        fill={pieColors[i % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAmount(Number(v ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-subtle">No income in this period.</p>
            )}
          </div>
        </div>

        <div className="rounded-sm border border-gold/20 bg-surface p-6">
          <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
            Expenses by Category
          </h2>
          <div className="mt-4 h-64">
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={expenseByCategory.slice(0, 8)}
                  margin={{ left: 80 }}
                >
                  <CartesianGrid stroke="#2E2B1E" horizontal={false} />
                  <XAxis type="number" stroke="#9E9880" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#9E9880"
                    tick={{ fontSize: 10 }}
                    width={75}
                  />
                  <Tooltip formatter={(v) => formatAmount(Number(v ?? 0))} />
                  <Bar dataKey="amount" fill={GOLD} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-subtle">No expenses in this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  invertDelta,
  valueClass = "text-gold",
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number | null;
  invertDelta?: boolean;
  valueClass?: string;
}) {
  const up = delta !== null && delta !== undefined && delta >= 0;
  const good = invertDelta ? !up : up;
  return (
    <div className="rounded-sm border border-gold/20 bg-surface p-6">
      <p className="font-cinzel text-xs uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className={`mt-2 font-cinzel text-3xl ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-subtle">{sub}</p>
      {delta !== null && delta !== undefined ? (
        <p
          className={`mt-2 text-xs ${good ? "text-emerald-400" : "text-red-400"}`}
        >
          {up ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs prior period
        </p>
      ) : null}
    </div>
  );
}

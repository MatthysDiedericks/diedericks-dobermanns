import { addDays, addMonths, format } from "date-fns";

import { currentMonthKey, horizonKeys, monthKey, monthLabel } from "./format";
import { projectRecurring, type ProjectedOut } from "./projectRecurring";
import { allocateReceiptByTier, emptyTierMap, type IncomeTier } from "./tier";
import type {
  BudgetMonthRow,
  CashflowSummary,
  DepositHeldRow,
  ExpectedInRow,
  ExpenseCashRow,
  MonthBucket,
  ReceiptRow,
} from "./types";

export type InvoiceLines = Record<string, { item_type: string; line_total: number }[]>;

export type CashflowModel = {
  receipts: ReceiptRow[];
  expectedIn: ExpectedInRow[];
  expectedOut: ProjectedOut[];
  expenses: ExpenseCashRow[];
  months: MonthBucket[];
  profitMonths: MonthBucket[];
  incomeByTier: Record<IncomeTier, number>;
  expenseByCategory: { label: string; amount: number }[];
  litterProfit: {
    litterId: string;
    label: string;
    cost: number;
    earned: number;
    net: number;
  }[];
  depositsHeld: number;
  depositRows: DepositHeldRow[];
  summary: CashflowSummary;
};

function num(v: unknown): number {
  return Number(v ?? 0) || 0;
}

function actualOutDate(e: ExpenseCashRow): string | null {
  if (e.is_payable && !e.payable_paid_date) return null;
  if (e.is_payable && e.payable_paid_date) return e.payable_paid_date.slice(0, 10);
  return e.expense_date.slice(0, 10);
}

export function buildExpectedOut(input: {
  expenses: ExpenseCashRow[];
  budgets: BudgetMonthRow[];
  horizonStart: string;
  horizonEnd: string;
}): ProjectedOut[] {
  const rows: ProjectedOut[] = [];

  for (const e of input.expenses) {
    if (e.is_payable && !e.payable_paid_date && e.payable_due_date) {
      const due = e.payable_due_date.slice(0, 10);
      if (due >= input.horizonStart && due <= input.horizonEnd) {
        rows.push({
          id: e.id,
          date: due,
          amount: num(e.amount),
          description: e.description,
          categoryId: e.category_id,
          categoryName: e.category_name,
          kind: "payable",
          basis: "dated from the payable due date",
        });
      }
    }
    if (e.is_recurring) {
      rows.push(
        ...projectRecurring(
          {
            id: e.id,
            amount: num(e.amount),
            description: e.description,
            categoryId: e.category_id,
            categoryName: e.category_name,
            interval: e.recurrence_interval,
            startDate: e.expense_date,
            endDate: e.recurrence_end_date,
          },
          input.horizonStart,
          input.horizonEnd,
        ),
      );
    }
  }

  const committedByMonthCat = new Map<string, number>();
  for (const r of rows) {
    const k = `${monthKey(r.date)}:${r.categoryId ?? "none"}`;
    committedByMonthCat.set(k, (committedByMonthCat.get(k) ?? 0) + 1);
  }

  const startKey = monthKey(input.horizonStart)!;
  const endKey = monthKey(input.horizonEnd)!;
  let cursor = startKey;
  while (cursor <= endKey) {
    const [ys, ms] = cursor.split("-");
    const year = Number(ys);
    const month = Number(ms);
    for (const b of input.budgets) {
      if (b.budget_type === "income" || b.year !== year || b.month !== month) continue;
      const k = `${cursor}:${b.category_id ?? "none"}`;
      if ((committedByMonthCat.get(k) ?? 0) > 0) continue;
      rows.push({
        id: `budget:${b.year}:${b.month}:${b.category_id}`,
        date: `${cursor}-01`,
        amount: num(b.budgeted_amount),
        description: b.category_name,
        categoryId: b.category_id,
        categoryName: b.category_name,
        kind: "budget",
        basis: "budget figure — no committed expense this month",
      });
    }
    const [y, m] = cursor.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    cursor = next;
  }

  return rows;
}

export function buildCashflowModel(input: {
  receipts: ReceiptRow[];
  expectedIn: ExpectedInRow[];
  expenses: ExpenseCashRow[];
  budgets: BudgetMonthRow[];
  depositRows: DepositHeldRow[];
  invoiceLines: InvoiceLines;
  litterNames: Record<string, string>;
  horizonMonths: number;
  now?: Date;
}): CashflowModel {
  const now = input.now ?? new Date();
  const today = format(now, "yyyy-MM-dd");
  const thisKey = currentMonthKey(now);
  const horizonStart = today;
  const horizonEnd = format(addMonths(now, input.horizonMonths), "yyyy-MM-dd");
  const expectedOut = buildExpectedOut({
    expenses: input.expenses,
    budgets: input.budgets,
    horizonStart,
    horizonEnd,
  });

  const monthSet = new Set<string>();
  for (const r of input.receipts) {
    const k = monthKey(r.received_on);
    if (k) monthSet.add(k);
  }
  for (const e of input.expenses) {
    const d = actualOutDate(e);
    const k = monthKey(d);
    if (k) monthSet.add(k);
  }
  monthSet.add(thisKey);
  for (const k of horizonKeys(thisKey, input.horizonMonths)) monthSet.add(k);

  const keys = [...monthSet].sort();
  const buckets = new Map<string, MonthBucket>();
  for (const key of keys) {
    buckets.set(key, {
      key,
      label: monthLabel(key),
      actualIn: 0,
      actualOut: 0,
      actualNet: 0,
      forecastIn: 0,
      forecastOut: 0,
      forecastNet: 0,
      budgetOut: 0,
      cumulativeActual: 0,
      rolling12: 0,
    });
  }

  const incomeByTier = emptyTierMap();
  for (const r of input.receipts) {
    const k = monthKey(r.received_on);
    if (!k || !buckets.has(k)) continue;
    const amt = num(r.amount);
    buckets.get(k)!.actualIn += amt;
    const lines = r.invoice_id ? input.invoiceLines[r.invoice_id] ?? [] : [];
    const split = allocateReceiptByTier(amt, lines);
    incomeByTier.standard += split.standard;
    incomeByTier.elite_developed += split.elite_developed;
    incomeByTier.protection_dog += split.protection_dog;
    incomeByTier.other += split.other;
  }

  const expenseByCategory = new Map<string, number>();
  for (const e of input.expenses) {
    const d = actualOutDate(e);
    const k = monthKey(d);
    const amt = num(e.amount);
    if (k && buckets.has(k)) buckets.get(k)!.actualOut += amt;
    if (d) {
      const name = e.category_name || "Other";
      expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + amt);
    }
  }

  for (const row of input.expectedIn) {
    const k = monthKey(row.expected_date);
    if (!k || !buckets.has(k)) continue;
    if ((row.expected_date ?? "") < today) continue;
    buckets.get(k)!.forecastIn += num(row.amount);
  }
  for (const row of expectedOut) {
    const k = monthKey(row.date);
    if (!k || !buckets.has(k)) continue;
    if (row.kind === "budget") buckets.get(k)!.budgetOut += row.amount;
    else buckets.get(k)!.forecastOut += row.amount;
  }

  let running = 0;
  const months = keys.map((key) => {
    const b = buckets.get(key)!;
    b.actualNet = b.actualIn - b.actualOut;
    b.forecastNet = b.forecastIn - b.forecastOut - b.budgetOut;
    running += b.actualNet;
    b.cumulativeActual = running;
    return b;
  });
  for (let i = 0; i < months.length; i++) {
    const window = months.slice(Math.max(0, i - 11), i + 1);
    months[i].rolling12 = window.reduce((s, m) => s + m.actualNet, 0);
  }

  const costByLitter = new Map<string, number>();
  const earnedByLitter = new Map<string, number>();
  for (const e of input.expenses) {
    if (!e.litter_id) continue;
    costByLitter.set(e.litter_id, (costByLitter.get(e.litter_id) ?? 0) + num(e.amount));
  }
  for (const r of input.receipts) {
    if (!r.litter_id) continue;
    earnedByLitter.set(r.litter_id, (earnedByLitter.get(r.litter_id) ?? 0) + num(r.amount));
  }
  const litterIds = new Set([...costByLitter.keys(), ...earnedByLitter.keys()]);
  const litterProfit = [...litterIds]
    .filter((id) => costByLitter.has(id))
    .map((litterId) => {
      const cost = costByLitter.get(litterId) ?? 0;
      const earned = earnedByLitter.get(litterId) ?? 0;
      return {
        litterId,
        label: input.litterNames[litterId] ?? litterId.slice(0, 8),
        cost,
        earned,
        net: earned - cost,
      };
    })
    .sort((a, b) => a.net - b.net);

  const depositsHeld = input.depositRows.reduce((s, r) => s + num(r.amount_paid), 0);
  const thisMonth = buckets.get(thisKey);
  const in30 = format(addDays(now, 30), "yyyy-MM-dd");
  const expectedNext30 = input.expectedIn
    .filter((r) => r.expected_date && r.expected_date >= today && r.expected_date <= in30)
    .reduce((s, r) => s + num(r.amount), 0);

  let trough: CashflowSummary["trough"] = null;
  let run = 0;
  for (const k of horizonKeys(thisKey, input.horizonMonths)) {
    const b = buckets.get(k);
    if (!b) continue;
    run += b.forecastNet;
    if (!trough || run < trough.depth) trough = { key: k, depth: run };
  }

  return {
    receipts: input.receipts,
    expectedIn: input.expectedIn,
    expectedOut,
    expenses: input.expenses,
    months,
    profitMonths: months,
    incomeByTier,
    expenseByCategory: [...expenseByCategory.entries()]
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount),
    litterProfit,
    depositsHeld,
    depositRows: input.depositRows,
    summary: {
      receivedThisMonth: thisMonth?.actualIn ?? 0,
      expectedNext30,
      netThisMonth: thisMonth?.actualNet ?? 0,
      depositsHeld,
      trough,
    },
  };
}

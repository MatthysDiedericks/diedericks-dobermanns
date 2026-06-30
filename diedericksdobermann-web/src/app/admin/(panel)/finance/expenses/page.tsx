import Link from "next/link";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/server";
import { formatAmount, formatDate } from "@/lib/finance/formatters";
import type { ExpenseWithCategory } from "@/types/finance";

export const dynamic = "force-dynamic";

export default async function FinanceExpensesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, category:expense_categories(name, colour)")
    .order("expense_date", { ascending: false });

  const expenses = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const cat = r.category as { name: string; colour: string } | null;
    return {
      ...(r as unknown as ExpenseWithCategory),
      categoryName: cat?.name ?? "Other",
      categoryColour: cat?.colour ?? "#888",
    };
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <AdminHeader
        title="Expenses"
        subtitle={`${formatAmount(total)} — ${expenses.length} entries`}
        action={{ href: "/admin/finance/expenses/new", label: "Log Expense" }}
      />

      <div className="space-y-2">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-sm border border-gold/20 bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: e.categoryColour }}
              />
              <div>
                <p className="text-sm text-text">{e.description}</p>
                <p className="text-xs text-subtle">
                  {e.categoryName} · {formatDate(e.expense_date)}
                </p>
              </div>
            </div>
            <p className="font-cinzel text-gold">{formatAmount(e.amount)}</p>
          </div>
        ))}
        {expenses.length === 0 ? (
          <p className="py-12 text-center text-subtle">No expenses logged yet.</p>
        ) : null}
      </div>
    </>
  );
}

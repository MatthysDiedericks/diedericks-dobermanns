"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createExpense } from "@/app/admin/(panel)/finance/actions";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import type { ExpenseCategory } from "@/types/finance";

export function CreateExpenseForm({
  categories,
}: {
  categories: ExpenseCategory[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [supplier, setSupplier] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!description.trim() || !amount) {
      setError("Description and amount are required.");
      return;
    }
    setBusy(true);
    const res = await createExpense({
      category_id: categoryId,
      description,
      amount: Number(amount),
      expense_date: expenseDate,
      supplier_name: supplier || null,
      receipt_url: receiptUrl,
      is_recurring: recurring,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/admin/finance/expenses");
    router.refresh();
  };

  return (
    <div className="max-w-xl space-y-5 rounded-sm border border-gold/20 bg-surface p-6">
      <div>
        <label className={labelClass}>Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={
                categoryId === c.id
                  ? "rounded-sm border border-gold bg-gold/10 px-3 py-1.5 text-xs uppercase tracking-widest text-gold"
                  : "rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted"
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Amount (ZAR)</label>
          <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Supplier</label>
        <input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Receipt</label>
        <ImageUploader
          bucket="receipts"
          pathPrefix={`expenses/${Date.now()}`}
          accept="image/*"
          onUploaded={async (file) => setReceiptUrl(file.url)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-[#c4a35a]" />
        Recurring expense
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button onClick={submit} disabled={busy} className={primaryBtn}>
        {busy ? "Saving…" : "Log Expense"}
      </button>
    </div>
  );
}

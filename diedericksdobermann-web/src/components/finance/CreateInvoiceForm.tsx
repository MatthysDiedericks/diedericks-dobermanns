"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createInvoice } from "@/app/admin/(panel)/finance/actions";
import { inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import type { InvoiceItemType } from "@/types/finance";

type Client = { id: string; full_name: string | null };
type Line = {
  description: string;
  item_type: InvoiceItemType;
  quantity: number;
  unit_price: number;
};

const ITEM_TYPES: InvoiceItemType[] = [
  "dog_sale",
  "deposit",
  "training_fee",
  "transport",
  "other",
];

export function CreateInvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(due);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [lines, setLines] = useState<Line[]>([
    {
      description: "",
      item_type: "dog_sale",
      quantity: 1,
      unit_price: 0,
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subtotal = lines.reduce(
    (s, l) => s + l.quantity * l.unit_price,
    0,
  );
  const discountNum = Number(discount) || 0;
  const total = subtotal - discountNum;

  const submit = async (status: string) => {
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError("Every line item needs a description.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createInvoice({
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate,
      notes: notes || null,
      internal_notes: internalNotes || null,
      discount_amount: discountNum,
      status,
      items: lines,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(`/admin/finance/invoices/${res.id}`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5 rounded-sm border border-gold/20 bg-surface p-6">
        <div>
          <label className={labelClass}>Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.id}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Line Items</label>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-4">
                <input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].description = e.target.value;
                    setLines(next);
                  }}
                  className={inputClass}
                />
                <select
                  value={line.item_type}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].item_type = e.target.value as InvoiceItemType;
                    setLines(next);
                  }}
                  className={inputClass}
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].quantity = Number(e.target.value);
                    setLines(next);
                  }}
                  className={inputClass}
                />
                <input
                  type="number"
                  min={0}
                  value={line.unit_price}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].unit_price = Number(e.target.value);
                    setLines(next);
                  }}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setLines([
                ...lines,
                {
                  description: "",
                  item_type: "other",
                  quantity: 1,
                  unit_price: 0,
                },
              ])
            }
            className="mt-2 text-xs uppercase tracking-widest text-gold"
          >
            + Add line
          </button>
        </div>

        <div>
          <label className={labelClass}>Discount (ZAR)</label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Notes (client)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Internal notes</label>
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => submit("draft")}
            className={primaryBtn}
          >
            Save Draft
          </button>
          <button
            disabled={busy}
            onClick={() => submit("sent")}
            className="rounded-sm border border-gold px-5 py-2.5 font-cinzel text-xs uppercase tracking-widest text-gold"
          >
            Save & Mark Sent
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-gold/20 bg-elevated p-6">
        <p className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
          Preview
        </p>
        <div className="mt-4 space-y-2 text-sm">
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between">
              <span>{l.description || "Line item"}</span>
              <span>
                R {(l.quantity * l.unit_price).toLocaleString("en-ZA")}
              </span>
            </div>
          ))}
          <div className="border-t border-gold/20 pt-3 flex justify-between font-cinzel text-lg text-gold">
            <span>Total</span>
            <span>R {total.toLocaleString("en-ZA")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

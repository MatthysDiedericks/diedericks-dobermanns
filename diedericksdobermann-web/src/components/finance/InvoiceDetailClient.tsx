"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  recordPayment,
  updateInvoiceStatus,
} from "@/app/admin/(panel)/finance/actions";
import { exportInvoicePDF } from "@/lib/finance/exportPDF";
import { formatAmount, formatDate } from "@/lib/finance/formatters";
import { ghostBtn, inputClass, primaryBtn } from "@/lib/admin/styles";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { InvoiceItem, InvoicePayment, InvoiceWithDetails } from "@/types/finance";

export function InvoiceDetailClient({
  invoice,
}: {
  invoice: InvoiceWithDetails;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    String(invoice.amount_outstanding ?? 0),
  );
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    await recordPayment({
      invoice_id: invoice.id,
      amount: Number(amount),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "bank_transfer",
    });
    router.refresh();
    setBusy(false);
  };

  const voidInvoice = async () => {
    if (!confirm("Void this invoice?")) return;
    setBusy(true);
    await updateInvoiceStatus(invoice.id, "void");
    router.refresh();
    setBusy(false);
  };

  const markSent = async () => {
    setBusy(true);
    await updateInvoiceStatus(invoice.id, "sent");
    router.refresh();
    setBusy(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportInvoicePDF(invoice)}
          className={ghostBtn}
        >
          Download PDF
        </button>
        {invoice.status === "draft" ? (
          <button onClick={markSent} disabled={busy} className={ghostBtn}>
            Mark Sent
          </button>
        ) : null}
        {invoice.status !== "void" && invoice.status !== "paid" ? (
          <>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} max-w-[140px]`}
            />
            <button onClick={pay} disabled={busy} className={primaryBtn}>
              Record Payment
            </button>
          </>
        ) : null}
        {invoice.status !== "void" ? (
          <button onClick={voidInvoice} disabled={busy} className={ghostBtn}>
            Void
          </button>
        ) : null}
      </div>

      <article className="rounded-sm border border-gold/20 bg-surface p-8 print:border-none">
        <div className="flex justify-between">
          <div>
            <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-gold-dim">
              Diedericks Dobermanns
            </p>
            <h1 className="mt-2 font-cinzel text-4xl text-gold">Invoice</h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg text-gold">{invoice.invoice_number}</p>
            <StatusBadge status={invoice.status} className="mt-2" />
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-subtle">
              Bill To
            </dt>
            <dd className="mt-1 font-cinzel text-lg">{invoice.clientName}</dd>
            <dd className="text-sm text-muted">{invoice.clientEmail}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-subtle">
              Dates
            </dt>
            <dd className="mt-1 text-sm text-muted">
              Issue: {formatDate(invoice.issue_date)}
            </dd>
            <dd className="text-sm text-muted">
              Due: {formatDate(invoice.due_date)}
            </dd>
          </div>
        </dl>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: InvoiceItem) => (
              <tr key={item.id} className="border-b border-gold/5">
                <td className="py-3">{item.description}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3 text-right">
                  {formatAmount(item.unit_price)}
                </td>
                <td className="py-3 text-right text-gold">
                  {formatAmount(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 space-y-2 border-t border-gold/20 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatAmount(invoice.subtotal)}</span>
          </div>
          {invoice.discount_amount > 0 ? (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatAmount(invoice.discount_amount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-cinzel text-lg text-gold">
            <span>Total</span>
            <span>{formatAmount(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Amount Paid</span>
            <span>{formatAmount(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between text-red-300">
            <span>Outstanding</span>
            <span>{formatAmount(invoice.amount_outstanding)}</span>
          </div>
        </div>

        {invoice.notes ? (
          <p className="mt-6 text-sm text-muted">{invoice.notes}</p>
        ) : null}
      </article>

      {invoice.payments.length > 0 ? (
        <div>
          <h2 className="font-cinzel text-sm uppercase tracking-widest text-gold-dim">
            Payment History
          </h2>
          <ul className="mt-3 space-y-2">
            {invoice.payments.map((p: InvoicePayment) => (
              <li
                key={p.id}
                className="flex justify-between rounded-sm border border-gold/10 bg-surface px-4 py-3 text-sm"
              >
                <span>{formatDate(p.payment_date)}</span>
                <span className="text-gold">{formatAmount(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

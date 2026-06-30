import Link from "next/link";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatAmount, formatDate } from "@/lib/finance/formatters";
import type { InvoiceListRow } from "@/types/finance";

export const dynamic = "force-dynamic";

export default async function FinanceInvoicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "*, client:users!invoices_client_id_fkey(full_name), dog:dogs(name)",
    )
    .order("issue_date", { ascending: false });

  const invoices = (data ?? []) as unknown as InvoiceListRow[];

  return (
    <>
      <AdminHeader
        title="Invoices"
        subtitle={`${invoices.length} total`}
        action={{ href: "/admin/finance/invoices/new", label: "New Invoice" }}
      />

      <div className="overflow-x-auto rounded-sm border border-gold/20">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-widest text-subtle">
              <th className="p-3">Invoice #</th>
              <th className="p-3">Client</th>
              <th className="p-3">Dog</th>
              <th className="p-3">Issue</th>
              <th className="p-3">Due</th>
              <th className="p-3">Total</th>
              <th className="p-3">Outstanding</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gold/5">
                <td className="p-3 font-mono text-gold">{inv.invoice_number}</td>
                <td className="p-3">{inv.client?.full_name ?? "—"}</td>
                <td className="p-3 text-muted">{inv.dog?.name ?? "—"}</td>
                <td className="p-3 text-muted">{formatDate(inv.issue_date)}</td>
                <td className="p-3 text-muted">{formatDate(inv.due_date)}</td>
                <td className="p-3">{formatAmount(inv.total_amount)}</td>
                <td className="p-3 text-red-300">
                  {formatAmount(inv.amount_outstanding)}
                </td>
                <td className="p-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/finance/invoices/${inv.id}`}
                    className="font-cinzel text-xs uppercase tracking-widest text-gold"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-subtle">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceDetailClient } from "@/components/finance/InvoiceDetailClient";
import { createClient } from "@/lib/supabase/server";
import type {
  InvoiceItem,
  InvoicePayment,
  InvoiceWithDetails,
} from "@/types/finance";

export const dynamic = "force-dynamic";

export default async function FinanceInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, client:users!invoices_client_id_fkey(full_name, email)")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  const client = invoice.client as { full_name: string; email: string } | null;

  const detail: InvoiceWithDetails = {
    ...(invoice as unknown as InvoiceWithDetails),
    clientName: client?.full_name ?? "—",
    clientEmail: client?.email ?? "",
    items: (items ?? []) as InvoiceItem[],
    payments: (payments ?? []) as InvoicePayment[],
  };

  return (
    <>
      <Link
        href="/admin/finance/invoices"
        className="font-cinzel text-xs uppercase tracking-widest text-muted hover:text-gold"
      >
        ← All Invoices
      </Link>
      <div className="mt-4">
        <InvoiceDetailClient invoice={detail} />
      </div>
    </>
  );
}

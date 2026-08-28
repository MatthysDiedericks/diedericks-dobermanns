export type StatementRow = {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

type InvoiceInput = {
  issue_date: string;
  invoice_number: string;
  total_amount: number;
  notes: string | null;
};

type PaymentInput = {
  payment_date: string;
  amount: number;
  reference: string | null;
  invoice_number: string;
};

type LineGroup = {
  sortDate: string;
  invoice: InvoiceInput | null;
  payments: PaymentInput[];
};

/**
 * Group each invoice with the payments that settle it. Emit the charge first,
 * then those payments, even when a deposit landed before the invoice was
 * captured. Running totals stay the same; stored issue_date is not rewritten.
 */
export function buildStatementRows(
  invoices: InvoiceInput[],
  payments: PaymentInput[],
): StatementRow[] {
  const paymentsByInvoice = new Map<string, PaymentInput[]>();
  const orphans: PaymentInput[] = [];
  for (const pay of payments) {
    if (pay.invoice_number) {
      const list = paymentsByInvoice.get(pay.invoice_number) ?? [];
      list.push(pay);
      paymentsByInvoice.set(pay.invoice_number, list);
    } else {
      orphans.push(pay);
    }
  }

  const groups: LineGroup[] = [];
  const used = new Set<string>();
  for (const inv of invoices) {
    const pays = (paymentsByInvoice.get(inv.invoice_number) ?? []).sort((a, b) =>
      a.payment_date.localeCompare(b.payment_date),
    );
    const dates = [inv.issue_date, ...pays.map((p) => p.payment_date)].sort();
    groups.push({
      sortDate: dates[0] ?? inv.issue_date,
      invoice: inv,
      payments: pays,
    });
    used.add(inv.invoice_number);
  }
  for (const [invoiceNumber, pays] of paymentsByInvoice) {
    if (used.has(invoiceNumber)) continue;
    const sorted = [...pays].sort((a, b) => a.payment_date.localeCompare(b.payment_date));
    groups.push({
      sortDate: sorted[0]!.payment_date,
      invoice: null,
      payments: sorted,
    });
  }
  for (const pay of orphans) {
    groups.push({
      sortDate: pay.payment_date,
      invoice: null,
      payments: [pay],
    });
  }

  groups.sort((a, b) => {
    if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
    return (a.invoice?.invoice_number ?? "").localeCompare(b.invoice?.invoice_number ?? "");
  });

  let balance = 0;
  const rows: StatementRow[] = [];
  for (const group of groups) {
    if (group.invoice) {
      balance += group.invoice.total_amount;
      rows.push({
        date: group.invoice.issue_date,
        reference: group.invoice.invoice_number,
        description: group.invoice.notes?.trim() || "Invoice",
        debit: group.invoice.total_amount,
        credit: 0,
        balance,
      });
    }
    for (const pay of group.payments) {
      balance -= pay.amount;
      rows.push({
        date: pay.payment_date,
        reference: pay.reference ?? `PAY-${pay.invoice_number}`,
        description: "Payment received",
        debit: 0,
        credit: pay.amount,
        balance,
      });
    }
  }
  return rows;
}

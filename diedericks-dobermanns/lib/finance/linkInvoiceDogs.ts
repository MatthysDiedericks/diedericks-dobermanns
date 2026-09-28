/**
 * Writes invoices.dog_id only where the link is unambiguous.
 *
 * Certain:
 * - A quote has exactly one distinct dog on its lines, and exactly one invoice.
 * - An invoice has exactly one line, and that line carries a dog_id.
 *
 * Buyer name is not an input. Matching on a name is how one client's dog
 * lands on another client's record.
 */

export type QuoteForLink = {
  id: string;
  convertedInvoiceId: string | null;
  itemDogIds: Array<string | null>;
};

export type InvoiceForLink = {
  id: string;
  dogId: string | null;
  quoteId: string | null;
};

export type InvoiceLineForLink = {
  invoiceId: string;
  dogId: string | null;
};

export type PlannedLink = {
  invoiceId: string;
  dogId: string;
  via: "quote_single_dog" | "invoice_single_line";
};

export type RefusedLink = {
  quoteId: string | null;
  invoiceId: string | null;
  reason:
    | "multiple_dogs_on_quote"
    | "quote_has_multiple_invoices"
    | "multiple_dogs_on_invoice_lines"
    | "invoice_already_linked_to_other_dog";
  dogIds: string[];
};

function distinct(ids: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (id) out.add(id);
  }
  return [...out];
}

export function planInvoiceDogLinks(input: {
  quotes: QuoteForLink[];
  invoices: InvoiceForLink[];
  lines: InvoiceLineForLink[];
}): { links: PlannedLink[]; refused: RefusedLink[] } {
  const invoicesById = new Map(input.invoices.map((row) => [row.id, row]));
  const links: PlannedLink[] = [];
  const refused: RefusedLink[] = [];
  const closed = new Set<string>();

  function consider(invoiceId: string, dogId: string, via: PlannedLink["via"], quoteId: string | null) {
    const invoice = invoicesById.get(invoiceId);
    if (!invoice) return;
    if (invoice.dogId && invoice.dogId !== dogId) {
      refused.push({
        quoteId,
        invoiceId,
        reason: "invoice_already_linked_to_other_dog",
        dogIds: [invoice.dogId, dogId],
      });
      closed.add(invoiceId);
      return;
    }
    closed.add(invoiceId);
    if (invoice.dogId === dogId) return;
    links.push({ invoiceId, dogId, via });
  }

  for (const quote of input.quotes) {
    const dogIds = distinct(quote.itemDogIds);
    const invoiceIds = new Set<string>();
    if (quote.convertedInvoiceId && invoicesById.has(quote.convertedInvoiceId)) {
      invoiceIds.add(quote.convertedInvoiceId);
    }
    for (const invoice of input.invoices) {
      if (invoice.quoteId === quote.id) invoiceIds.add(invoice.id);
    }
    if (dogIds.length === 0) continue;
    if (dogIds.length > 1) {
      refused.push({
        quoteId: quote.id,
        invoiceId: invoiceIds.size === 1 ? [...invoiceIds][0]! : null,
        reason: "multiple_dogs_on_quote",
        dogIds,
      });
      for (const id of invoiceIds) closed.add(id);
      continue;
    }
    if (invoiceIds.size === 0) continue;
    if (invoiceIds.size > 1) {
      refused.push({
        quoteId: quote.id,
        invoiceId: null,
        reason: "quote_has_multiple_invoices",
        dogIds,
      });
      for (const id of invoiceIds) closed.add(id);
      continue;
    }
    consider([...invoiceIds][0]!, dogIds[0]!, "quote_single_dog", quote.id);
  }

  const linesByInvoice = new Map<string, InvoiceLineForLink[]>();
  for (const line of input.lines) {
    const list = linesByInvoice.get(line.invoiceId) ?? [];
    list.push(line);
    linesByInvoice.set(line.invoiceId, list);
  }

  for (const [invoiceId, rows] of linesByInvoice) {
    if (closed.has(invoiceId)) continue;
    const dogIds = distinct(rows.map((row) => row.dogId));
    if (rows.length !== 1) {
      if (dogIds.length > 1) {
        refused.push({
          quoteId: null,
          invoiceId,
          reason: "multiple_dogs_on_invoice_lines",
          dogIds,
        });
      }
      continue;
    }
    const only = rows[0]!;
    if (!only.dogId) continue;
    consider(invoiceId, only.dogId, "invoice_single_line", null);
  }

  return { links, refused };
}

/** Live income. Drafts and voids are not money received or billed. */
const EXCLUDED = new Set(["void", "cancelled", "draft"]);

export function isLiveInvoice(status: string | null | undefined): boolean {
  return !EXCLUDED.has((status ?? "").toLowerCase());
}

export type IncomeLinkInvoice = {
  id: string;
  dogId: string | null;
  /** A litter link is income attributed. It leaves the unlinked count. */
  litterId?: string | null;
  status: string;
  total: number;
};

export type IncomeLinkSummary = {
  unlinkedInvoices: number;
  unlinkedAmount: number;
  soldDogs: number;
  soldDogsLinked: number;
  soldDogsWithoutIncome: number;
};

export function summarizeIncomeLinks(input: {
  invoices: IncomeLinkInvoice[];
  historicalDogIds: Array<string | null>;
  soldDogIds: string[];
}): IncomeLinkSummary {
  const live = input.invoices.filter((row) => isLiveInvoice(row.status));
  const unlinked = live.filter((row) => !row.dogId && !row.litterId);
  const linkedDogs = new Set<string>();
  for (const row of live) {
    if (row.dogId) linkedDogs.add(row.dogId);
  }
  for (const id of input.historicalDogIds) {
    if (id) linkedDogs.add(id);
  }
  const sold = new Set(input.soldDogIds);
  let soldDogsLinked = 0;
  for (const id of sold) {
    if (linkedDogs.has(id)) soldDogsLinked += 1;
  }
  const amount = unlinked.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  return {
    unlinkedInvoices: unlinked.length,
    unlinkedAmount: Math.round(amount * 100) / 100,
    soldDogs: sold.size,
    soldDogsLinked,
    soldDogsWithoutIncome: sold.size - soldDogsLinked,
  };
}

export function soldDogsProgressLabel(linked: number, total: number): string {
  return `${linked} of ${total} sold dogs linked`;
}

export function unlinkedIncomeLabel(count: number, amountLabel: string): string {
  return `${count} invoice${count === 1 ? "" : "s"}, ${amountLabel}`;
}

export function soldWithoutIncomeLabel(count: number): string {
  return `${count} dog${count === 1 ? "" : "s"}`;
}

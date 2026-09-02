/** Invoice total wins over quote total over dog.price. A null quote total must not wipe dog.price. */
export function resolveSalePurchasePrice(
  dogPrice: number | null | undefined,
  quote: { total: number | null } | null | undefined,
  invoice: { total_amount: number | null } | null | undefined,
): number | null {
  let purchasePrice = dogPrice ?? null;
  if (quote && quote.total != null) purchasePrice = quote.total;
  if (invoice && invoice.total_amount != null) purchasePrice = invoice.total_amount;
  return purchasePrice;
}

import type { LineItemType } from '@/types/app.types';

/**
 * Shared draft line-item shape for `LineItemRow`/`LineItemList` (currently
 * only used by the quote builder — `app/(admin)/quotes/new.tsx`; invoice
 * creation has its own `DraftLineItem` in `types/finance.ts`).
 *
 * The actual quote CRUD (create/update/status/convert-to-invoice) lives in
 * `lib/finance/quoteQueries.ts`, and invoice CRUD lives in
 * `hooks/useInvoices.ts` — this file used to duplicate both against a schema
 * that didn't match the live database; that dead code has been removed so
 * there's exactly one code path for each.
 */
export interface LineItemInput {
  item_type: LineItemType;
  dog_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

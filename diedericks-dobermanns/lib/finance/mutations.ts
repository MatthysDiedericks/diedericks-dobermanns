import type { LineItemType } from '@/types/app.types';
import type { QuoteSubjectKind } from '@/lib/finance/quoteSubject';

/**
 * Shared draft line-item shape for `LineItemRow`/`LineItemList`.
 */
export interface LineItemInput {
  item_type: LineItemType;
  dog_id?: string | null;
  litter_id?: string | null;
  subject_kind?: QuoteSubjectKind | null;
  programme_tier?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  catalogue_code?: string | null;
  allowZeroPrice?: boolean;
}

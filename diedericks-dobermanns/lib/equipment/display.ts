import { STOCK_STATUSES, type CatalogueItem, type StockStatus } from '@/lib/finance/catalogue';
import { formatAmount } from '@/lib/finance/formatters';
import { getPublicUrl } from '@/lib/storage';

/** Shown wherever a shop price appears. Delivery is quoted separately. */
export const DELIVERY_EXCLUDED_NOTE = 'Delivery cost excluded';

/** Enquiry form, above submit. Same rule as the card note, in a full sentence. */
export const ENQUIRY_DELIVERY_NOTE =
  'Prices exclude delivery. We confirm the delivery cost on your quote.';

/** Same rules as the website `lib/equipment/display.ts`. price_varies never prints a number. */
export function shopPriceLabel(item: Pick<CatalogueItem, 'price_varies' | 'default_price'>): string {
  if (item.price_varies) return 'Price on request';
  return formatAmount(item.default_price);
}

export type StockPresenceKey = 'live' | 'no_photo' | 'internal' | 'inactive';

export type StockPresence = {
  key: StockPresenceKey;
  label: string;
  reason: string | null;
};

/** Shop presence — why an item does or does not appear on /shop. One function, both screens. */
export function stockStatusFor(
  item: Pick<CatalogueItem, 'is_active' | 'is_client_visible' | 'image_path'>,
): StockPresence {
  if (!item.is_active) {
    return {
      key: 'inactive',
      label: 'Inactive',
      reason: 'Switched off. It cannot reach the shop until Active is on.',
    };
  }
  if (!item.is_client_visible) {
    return {
      key: 'internal',
      label: 'Internal only',
      reason: 'Used on quotes, hidden from the public shop.',
    };
  }
  if (!item.image_path) {
    return {
      key: 'no_photo',
      label: 'In shop — no photo',
      reason: 'Showing publicly with no product picture.',
    };
  }
  return { key: 'live', label: 'Live in shop', reason: null };
}

export function stockStatusLabel(status: StockStatus): string | null {
  if (status === 'in_stock') return null;
  return STOCK_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ');
}

export function equipmentImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  try {
    return getPublicUrl('equipment', imagePath);
  } catch {
    return null;
  }
}

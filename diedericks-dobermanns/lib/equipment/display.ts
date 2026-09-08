import { STOCK_STATUSES, type CatalogueItem, type StockStatus } from '@/lib/finance/catalogue';
import { formatPrice } from '@/lib/format';
import { getPublicUrl } from '@/lib/storage';

export function shopPriceLabel(item: Pick<CatalogueItem, 'price_varies' | 'default_price'>): string {
  if (item.price_varies) return 'Price on request';
  return formatPrice(item.default_price);
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

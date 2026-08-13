import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { DELIVERY_CATALOGUE_CODE, defaultDeliveryDecision } from '@/lib/finance/catalogue';
import type { LineItemType } from '@/types/app.types';

export type DraftishCatalogueLine = {
  key: string;
  item_type: LineItemType;
  dog_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  catalogue_code?: string | null;
  allowZeroPrice?: boolean;
};

export function lineFromCatalogue(
  item: CatalogueItem,
  nextKey: () => string,
): DraftishCatalogueLine {
  return {
    key: nextKey(),
    item_type: item.item_type as LineItemType,
    dog_id: null,
    description: item.description_template?.trim() || item.label,
    quantity: 1,
    unit_price: item.price_varies || item.default_price == null ? 0 : item.default_price,
    catalogue_code: item.code,
    allowZeroPrice: false,
  };
}

export function syncDeliveryLine(
  items: DraftishCatalogueLine[],
  decision: DeliveryDecision | null,
  catalogue: CatalogueItem[],
  nextKey: () => string,
): DraftishCatalogueLine[] {
  const deliveryIdx = items.findIndex(
    (it) => it.catalogue_code === DELIVERY_CATALOGUE_CODE || it.item_type === 'delivery',
  );
  const template =
    catalogue.find((c) => c.code === DELIVERY_CATALOGUE_CODE) ??
    ({
      code: DELIVERY_CATALOGUE_CODE,
      label: 'Delivery / travel',
      item_type: 'delivery',
      description_template: 'Delivery / travel',
      price_varies: true,
      default_price: null,
    } as CatalogueItem);

  if (decision === 'included') {
    if (deliveryIdx >= 0) {
      return items.map((it, i) =>
        i === deliveryIdx
          ? {
              ...it,
              item_type: 'delivery' as const,
              catalogue_code: DELIVERY_CATALOGUE_CODE,
              description: it.description.trim() || template.description_template || template.label,
              unit_price: 0,
              allowZeroPrice: true,
              quantity: it.quantity || 1,
            }
          : it,
      );
    }
    return [
      ...items,
      {
        key: nextKey(),
        item_type: 'delivery',
        dog_id: null,
        description: template.description_template || template.label,
        quantity: 1,
        unit_price: 0,
        catalogue_code: DELIVERY_CATALOGUE_CODE,
        allowZeroPrice: true,
      },
    ];
  }

  if (decision === 'charged' || decision === 'to_be_confirmed') {
    if (deliveryIdx >= 0) {
      return items.map((it, i) =>
        i === deliveryIdx
          ? {
              ...it,
              item_type: 'delivery' as const,
              catalogue_code: it.catalogue_code ?? DELIVERY_CATALOGUE_CODE,
              allowZeroPrice: true,
            }
          : it,
      );
    }
    return [
      ...items,
      {
        key: nextKey(),
        item_type: 'delivery',
        dog_id: null,
        description: template.description_template || template.label,
        quantity: 1,
        unit_price: 0,
        catalogue_code: DELIVERY_CATALOGUE_CODE,
        allowZeroPrice: true,
      },
    ];
  }

  return items;
}

export function deliveryLineAmount(items: DraftishCatalogueLine[]): number | null {
  const line = items.find(
    (it) => it.catalogue_code === DELIVERY_CATALOGUE_CODE || it.item_type === 'delivery',
  );
  return line ? line.unit_price : null;
}

export function computeDeliveryDefaults(
  programmeTiers: (string | null | undefined)[],
  buyerCountry: string | null | undefined,
) {
  return defaultDeliveryDecision(programmeTiers, buyerCountry);
}

export const EXPORT_PROMPT =
  'International buyer — consider: export crate, health certificate, rabies titre, airline freight.';

import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { DELIVERY_CATALOGUE_CODE, DELIVERY_TBC_DESCRIPTION, defaultDeliveryDecision } from '@/lib/finance/catalogue';
import type { LineItemType } from '@/types/app.types';

export type DraftishCatalogueLine = {
  key: string;
  item_type: LineItemType;
  dog_id?: string | null;
  litter_id?: string | null;
  subject_kind?: 'dog' | 'litter' | 'unallocated' | null;
  description: string;
  quantity: number;
  unit_price: number;
  catalogue_code?: string | null;
  allowZeroPrice?: boolean;
};

const STOCK_DELIVERY_DESCRIPTIONS = [
  'delivery / travel',
  'delivery/travel',
  'delivery / travel — to be confirmed, quoted separately.',
];

function normalizeDeliveryDescription(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when Matt clearly wrote the delivery wording himself — never delete that. */
export function isHandTypedDeliveryDescription(
  description: string,
  template?: { description_template?: string | null; label?: string | null },
): boolean {
  const normalized = normalizeDeliveryDescription(description);
  if (!normalized) return false;
  const stock = new Set(STOCK_DELIVERY_DESCRIPTIONS);
  if (template?.description_template) {
    stock.add(normalizeDeliveryDescription(template.description_template));
  }
  if (template?.label) stock.add(normalizeDeliveryDescription(template.label));
  return !stock.has(normalized);
}

export function isDeliveryLine(line: {
  item_type?: string | null;
  catalogue_code?: string | null;
}): boolean {
  return line.catalogue_code === DELIVERY_CATALOGUE_CODE || line.item_type === 'delivery';
}

function deliveryTemplate(catalogue: CatalogueItem[]): CatalogueItem {
  return (
    catalogue.find((c) => c.code === DELIVERY_CATALOGUE_CODE) ??
    ({
      code: DELIVERY_CATALOGUE_CODE,
      label: 'Delivery / travel',
      item_type: 'delivery',
      description_template: 'Delivery / travel',
      price_varies: true,
      default_price: null,
    } as CatalogueItem)
  );
}

function dropOrKeepHandTypedDelivery(
  items: DraftishCatalogueLine[],
  deliveryIdx: number,
  template: CatalogueItem,
): DraftishCatalogueLine[] {
  const line = items[deliveryIdx]!;
  if (isHandTypedDeliveryDescription(line.description, template)) {
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
  return items.filter((_, i) => i !== deliveryIdx);
}

export function stockDeliveryLineIdsToDrop<
  T extends {
    id: string;
    description: string;
    item_type?: string | null;
    catalogue_code?: string | null;
  },
>(decision: string | null | undefined, rows: T[]): string[] {
  if (decision !== 'collection' && decision !== 'not_applicable') return [];
  return rows
    .filter((row) => isDeliveryLine(row) && !isHandTypedDeliveryDescription(row.description))
    .map((row) => row.id);
}

export function lineFromCatalogue(
  item: CatalogueItem,
  nextKey: () => string,
): DraftishCatalogueLine {
  return {
    key: nextKey(),
    item_type: item.item_type as LineItemType,
    dog_id: null,
    litter_id: null,
    subject_kind: 'unallocated',
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
  const deliveryIdx = items.findIndex((it) => isDeliveryLine(it));
  const template = deliveryTemplate(catalogue);

  if (decision === 'collection' || decision === 'not_applicable') {
    if (deliveryIdx < 0) return items;
    return dropOrKeepHandTypedDelivery(items, deliveryIdx, template);
  }

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
        litter_id: null,
        subject_kind: 'unallocated',
        description: template.description_template || template.label,
        quantity: 1,
        unit_price: 0,
        catalogue_code: DELIVERY_CATALOGUE_CODE,
        allowZeroPrice: true,
      },
    ];
  }

  if (decision === 'to_be_confirmed') {
    const tbcPatch = (it: DraftishCatalogueLine): DraftishCatalogueLine => ({
      ...it,
      item_type: 'delivery',
      catalogue_code: it.catalogue_code ?? DELIVERY_CATALOGUE_CODE,
      allowZeroPrice: true,
      description: isHandTypedDeliveryDescription(it.description, template)
        ? it.description
        : DELIVERY_TBC_DESCRIPTION,
    });
    if (deliveryIdx >= 0) {
      return items.map((it, i) => (i === deliveryIdx ? tbcPatch(it) : it));
    }
    return [
      ...items,
      tbcPatch({
        key: nextKey(),
        item_type: 'delivery',
        dog_id: null,
        litter_id: null,
        subject_kind: 'unallocated',
        description: DELIVERY_TBC_DESCRIPTION,
        quantity: 1,
        unit_price: 0,
        catalogue_code: DELIVERY_CATALOGUE_CODE,
        allowZeroPrice: true,
      }),
    ];
  }

  if (decision === 'charged') {
    if (deliveryIdx >= 0) {
      return items.map((it, i) =>
        i === deliveryIdx
          ? {
              ...it,
              item_type: 'delivery' as const,
              catalogue_code: it.catalogue_code ?? DELIVERY_CATALOGUE_CODE,
              allowZeroPrice: true,
              description: isHandTypedDeliveryDescription(it.description, template)
                ? it.description
                : template.description_template || template.label,
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
        litter_id: null,
        subject_kind: 'unallocated',
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
  const line = items.find((it) => isDeliveryLine(it));
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

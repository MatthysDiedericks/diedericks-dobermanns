/** Catalogue domain + delivery decision helpers for quote builder. */

export type CatalogueCategory =
  | 'dog'
  | 'logistics'
  | 'export'
  | 'health'
  | 'training'
  | 'accessory'
  | 'other';

export type DeliveryDecision =
  | 'collection'
  | 'included'
  | 'charged'
  | 'to_be_confirmed'
  | 'not_applicable';

export type CatalogueItem = {
  id: string;
  code: string;
  label: string;
  item_type: string;
  category: CatalogueCategory;
  default_price: number | null;
  price_varies: boolean;
  description_template: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export type LastChargeRow = {
  line_total: number;
  quote_number: string;
  created_at: string;
  destination: string | null;
};

export const DELIVERY_DECISIONS: { value: DeliveryDecision; label: string }[] = [
  { value: 'collection', label: 'Collection' },
  { value: 'included', label: 'Included' },
  { value: 'charged', label: 'Charged' },
  { value: 'to_be_confirmed', label: 'To be confirmed' },
  { value: 'not_applicable', label: 'Not applicable' },
];

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = [
  'dog',
  'logistics',
  'export',
  'health',
  'training',
  'accessory',
  'other',
];

export const DELIVERY_CATALOGUE_CODE = 'delivery_travel';

export const DELIVERY_TBC_DESCRIPTION =
  'Delivery / travel — to be confirmed, quoted separately.';

const LOCAL_COUNTRIES = new Set([
  'south africa',
  'sa',
  'rsa',
  'za',
  'eswatini',
  'swaziland',
  'sz',
]);

export function isLocalDeliveryCountry(country: string | null | undefined): boolean {
  if (!country?.trim()) return true;
  return LOCAL_COUNTRIES.has(country.trim().toLowerCase());
}

export function isInternationalBuyer(country: string | null | undefined): boolean {
  if (!country?.trim()) return false;
  return !isLocalDeliveryCountry(country);
}

export function uniqueDogTiers(tiers: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const t of tiers) {
    if (t) set.add(t);
  }
  return [...set];
}

export type DeliveryDefaultResult = {
  decision: DeliveryDecision | null;
  reason: string | null;
  suggestExport: boolean;
};

export function defaultDeliveryDecision(
  programmeTiers: (string | null | undefined)[],
  buyerCountry: string | null | undefined,
): DeliveryDefaultResult {
  const tiers = uniqueDogTiers(programmeTiers);
  if (tiers.length === 0) {
    return { decision: null, reason: null, suggestExport: isInternationalBuyer(buyerCountry) };
  }
  if (tiers.length > 1) {
    return {
      decision: null,
      reason: 'Mixed programme tiers on this quote — confirm delivery case by case.',
      suggestExport: isInternationalBuyer(buyerCountry),
    };
  }

  const tier = tiers[0]!;
  const intl = isInternationalBuyer(buyerCountry);
  const countryLabel = buyerCountry?.trim() || 'that country';

  if (tier === 'puppy') {
    if (intl) {
      return {
        decision: null,
        reason: `This buyer is in ${countryLabel} — confirm whether delivery is included or charged.`,
        suggestExport: true,
      };
    }
    return {
      decision: 'included',
      reason: 'Standard Puppy includes delivery.',
      suggestExport: false,
    };
  }

  if (tier === 'elite_developed' || tier === 'protection_dog') {
    return {
      decision: 'charged',
      reason: 'Elite / protection tiers do not include delivery — an amount is required before send.',
      suggestExport: intl,
    };
  }

  return { decision: null, reason: null, suggestExport: intl };
}

export function assertDeliveryReadyToSend(input: {
  deliveryDecision: DeliveryDecision | null | undefined;
  deliveryLineAmount: number | null | undefined;
}): string | null {
  if (!input.deliveryDecision) {
    return 'Choose a delivery decision before sending — collection, included, charged, to be confirmed, or not applicable.';
  }
  if (input.deliveryDecision === 'charged' && !(Number(input.deliveryLineAmount) > 0)) {
    return 'Delivery is marked charged / to be confirmed — enter an amount on the delivery line before sending.';
  }
  return null;
}

export function formatLastChargedHistory(
  rows: LastChargeRow[],
  formatAmount: (n: number) => string,
  formatDay: (iso: string) => string,
): string {
  if (!rows.length) return 'Not charged before.';
  const bits = rows.map((r) => {
    const place = r.destination?.trim() || '—';
    return `${formatAmount(r.line_total)} (${place}, ${formatDay(r.created_at)})`;
  });
  return `Last charged: ${bits.join(' · ')}`;
}

export function isStarterCatalogueItem(item: Pick<CatalogueItem, 'notes'>): boolean {
  return Boolean(item.notes?.includes('[starter]'));
}

export function codeFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

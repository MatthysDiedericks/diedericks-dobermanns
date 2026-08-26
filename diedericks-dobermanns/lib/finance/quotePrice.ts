import {
  isProgrammeTierKey,
  PROGRAMME_TIER_KEYS,
  type ProgrammeTierKey,
} from '@/lib/dogs/programmeTier';

export type { ProgrammeTierKey };
export { isProgrammeTierKey, PROGRAMME_TIER_KEYS };

export type QuotePriceTier = {
  tier_key: string;
  display_label: string;
  price: number;
  price_on_request?: boolean | null;
};

export function formatZarWhole(value: number): string {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

export type QuotePriceInput = {
  dogPrice?: number | null;
  dogTier?: string | null;
  /** Ignored. A litter is not sold at one tier. */
  litterDefaultTier?: string | null;
  applicationTier?: string | null;
};

export type QuotePriceResult = {
  unitPrice: number | null;
  priceOnRequest: boolean;
  sourceLabel: string;
};

function tierOf(key: string | null | undefined, tiers: QuotePriceTier[]): QuotePriceTier | undefined {
  if (!key) return undefined;
  return tiers.find((t) => t.tier_key === key);
}

function priced(tier: QuotePriceTier | undefined): QuotePriceResult | null {
  if (!tier) return null;
  if (tier.price_on_request) {
    return {
      unitPrice: null,
      priceOnRequest: true,
      sourceLabel: `Set a price (${tier.display_label}, on request)`,
    };
  }
  if (tier.price > 0) {
    return {
      unitPrice: tier.price,
      priceOnRequest: false,
      sourceLabel: `${formatZarWhole(tier.price)} (${tier.display_label})`,
    };
  }
  return null;
}

/** Order: this puppy's price → this puppy's tier → application interest. */
export function resolveQuotePrice(input: QuotePriceInput, tiers: QuotePriceTier[]): QuotePriceResult {
  if (input.dogPrice != null && input.dogPrice > 0) {
    return {
      unitPrice: input.dogPrice,
      priceOnRequest: false,
      sourceLabel: `${formatZarWhole(input.dogPrice)} (this puppy's price)`,
    };
  }

  const fromDog = priced(tierOf(input.dogTier, tiers));
  if (fromDog) {
    const label = tierOf(input.dogTier, tiers)?.display_label ?? 'tier';
    if (fromDog.priceOnRequest) {
      return { ...fromDog, sourceLabel: `Set a price (${label}, this puppy's tier, on request)` };
    }
    return {
      ...fromDog,
      sourceLabel: `${formatZarWhole(fromDog.unitPrice!)} (${label}, this puppy's tier)`,
    };
  }

  const fromApp = priced(tierOf(input.applicationTier, tiers));
  if (fromApp) {
    const label = tierOf(input.applicationTier, tiers)?.display_label;
    if (fromApp.priceOnRequest) {
      return { ...fromApp, sourceLabel: `Set a price (${label}, from application)` };
    }
    return {
      ...fromApp,
      sourceLabel: `${formatZarWhole(fromApp.unitPrice!)} (${label}, from application)`,
    };
  }

  return { unitPrice: null, priceOnRequest: false, sourceLabel: 'Set a price' };
}

/**
 * budget_range (the form) and pricing_tiers.tier_key (the money, and
 * dogs.programme_tier) are two vocabularies. Map them here and nowhere else.
 *
 * Do not add a list of live tier keys. Those come from pricing_tiers.
 * This file only translates the applicant's own answer onto those keys.
 */

/** Applicant form value → pricing_tiers.tier_key. `open` has no price. */
export const BUDGET_RANGE_TO_TIER_KEY: Record<string, string> = {
  standard: 'puppy',
  elite: 'elite_developed',
};

const BUDGET_RANGE_LABELS: Record<string, string> = {
  standard: 'Standard Puppy',
  elite: 'Elite Developed Puppy',
  open: 'Open — best available option',
};

const BUDGET_RANGE_SHORT: Record<string, string> = {
  standard: 'Standard',
  elite: 'Elite',
  open: 'Open',
};

export type PricingTierLabel = {
  tier_key: string;
  display_label: string;
  price?: number;
  price_on_request?: boolean | null;
  description?: string | null;
};

export function tierKeyFromBudgetRange(
  budgetRange: string | null | undefined,
): string | null {
  if (!budgetRange) return null;
  return BUDGET_RANGE_TO_TIER_KEY[budgetRange] ?? null;
}

export function budgetRangeLabel(budgetRange: string | null | undefined): string {
  if (!budgetRange) return '—';
  return BUDGET_RANGE_LABELS[budgetRange] ?? budgetRange;
}

export function budgetRangeShort(budgetRange: string | null | undefined): string {
  if (!budgetRange) return '—';
  return BUDGET_RANGE_SHORT[budgetRange] ?? budgetRange;
}

export function effectiveTierKey(
  agreedTier: string | null | undefined,
  budgetRange: string | null | undefined,
): string | null {
  if (agreedTier) return agreedTier;
  return tierKeyFromBudgetRange(budgetRange);
}

export function applicationCommercialTierKey(row: {
  agreed_tier?: string | null;
  dog_interest?: string | null;
  budget_range?: string | null;
}): string | null {
  return row.agreed_tier ?? row.dog_interest ?? tierKeyFromBudgetRange(row.budget_range);
}

export function labelForTierKey(
  tierKey: string | null | undefined,
  tiers: PricingTierLabel[],
): string {
  if (!tierKey) return '—';
  return tiers.find((t) => t.tier_key === tierKey)?.display_label ?? humanizeTierKey(tierKey);
}

export function humanizeTierKey(tierKey: string): string {
  return tierKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ApplicationTierDisplay = {
  primary: string;
  appliedForShort: string | null;
  differs: boolean;
  line: string;
};

export function applicationTierDisplay(
  agreedTier: string | null | undefined,
  budgetRange: string | null | undefined,
  tiers: PricingTierLabel[],
): ApplicationTierDisplay {
  const appliedKey = tierKeyFromBudgetRange(budgetRange);
  const appliedFull = budgetRangeLabel(budgetRange);
  const appliedShort = budgetRangeShort(budgetRange);

  if (agreedTier) {
    const primary = labelForTierKey(agreedTier, tiers);
    const differs = Boolean(budgetRange) && appliedKey !== agreedTier;
    return {
      primary,
      appliedForShort: differs ? appliedShort : null,
      differs,
      line: differs ? `${primary} (applied for ${appliedShort})` : primary,
    };
  }

  const mapped = appliedKey ? labelForTierKey(appliedKey, tiers) : null;
  const primary = mapped && mapped !== '—' ? mapped : appliedFull;
  return { primary, appliedForShort: null, differs: false, line: primary };
}

export function formatRandWhole(n: number): string {
  return `R${Math.round(n).toLocaleString('en-ZA')}`;
}

export function tierPriceLabel(tier: PricingTierLabel | null | undefined): string {
  if (!tier) return '—';
  if (tier.price_on_request) return 'price on request';
  if (tier.price == null) return '—';
  return formatRandWhole(tier.price);
}

export function priceChangeSentence(
  from: PricingTierLabel | null | undefined,
  to: PricingTierLabel | null | undefined,
): string {
  if (!to) return '';
  const fromLabel = tierPriceLabel(from);
  const toLabel = tierPriceLabel(to);
  const fromOnRequest = Boolean(from?.price_on_request);
  const toOnRequest = Boolean(to.price_on_request);
  if (fromOnRequest || toOnRequest || from?.price == null || to.price == null) {
    return `${fromLabel} → ${toLabel}.`;
  }
  const delta = Math.round(to.price) - Math.round(from.price);
  if (delta === 0) return `${fromLabel} → ${toLabel}, the price is unchanged.`;
  const word = delta > 0 ? 'increase' : 'decrease';
  return `${fromLabel} → ${toLabel}, an ${word} of ${formatRandWhole(Math.abs(delta))}.`;
}

export function buildTierChangeEmailDraft(input: {
  fullName: string;
  referenceCode: string | null;
  appliedForLabel: string;
  newLabel: string;
  newDescription: string | null;
  priceSentence: string;
  hasDeposit: boolean;
}): { subject: string; body: string } {
  const first = input.fullName.trim() || 'there';
  const reference = input.referenceCode
    ? ` Your reference is ${input.referenceCode}.`
    : '';
  const includes = input.newDescription?.trim()
    ? `\n\nWhat this now includes:\n${input.newDescription.trim()}`
    : '';
  const deposit = input.hasDeposit
    ? ' Any deposit you have already paid stays on your account against the new figure.'
    : '';

  const subject = input.referenceCode
    ? `Your application — a change of programme (${input.referenceCode})`
    : 'Your application — a change of programme';

  const body = `Dear ${first},

Thank you for coming back to us about your application.${reference}

You originally applied for ${input.appliedForLabel}. We have now agreed the ${input.newLabel} programme.

The price moves as follows: ${input.priceSentence}${includes}

What happens next: we will send you a revised quotation that reflects the new figure. The quotation you already have does not change until you have that revision in front of you.${deposit}

If anything here does not match what we discussed, reply to this email and we will put it right.

Kind regards,
Matt
Diedericks Dobermanns`;

  return { subject, body };
}

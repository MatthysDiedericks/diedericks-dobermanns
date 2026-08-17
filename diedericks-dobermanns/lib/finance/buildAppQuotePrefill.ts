import { labelFor } from '@/components/forms/ApplicationForm/labels';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { fetchPricingTiers } from '@/lib/finance/pricingQueries';
import { resolveQuotePrice } from '@/lib/finance/quotePrice';
import { requireSupabase } from '@/lib/supabase';

const QUOTE_LABELS: Record<string, Record<string, string>> = {
  tail_preference: { docked: 'Docked', natural: 'Natural tail' },
};

export type AppQuotePrefill = {
  applicationId: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  notes: string;
  description: string;
  dogId: string | null;
  unitPrice: number | null;
  priceOnRequest: boolean;
  priceSourceLabel: string;
  litterInterestId: string | null;
  applicationTier: string | null;
  existingQuoteId: string | null;
};

function quoteLabel(field: keyof ApplicationFormValues, value: string): string {
  return QUOTE_LABELS[field]?.[value] ?? labelFor(field, value as never);
}

function preferenceSummary(app: {
  preferred_sex: string | null;
  preferred_colour: string | null;
  tail_preference: string | null;
}): string {
  const fields: (keyof ApplicationFormValues)[] = [
    'preferred_sex',
    'preferred_colour',
    'tail_preference',
  ];
  const values = [app.preferred_sex, app.preferred_colour, app.tail_preference];
  const parts = fields
    .map((field, i) => {
      const value = values[i];
      if (!value || value === 'no_preference') return null;
      return quoteLabel(field, value);
    })
    .filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export async function buildAppQuotePrefill(
  applicationId: string,
): Promise<AppQuotePrefill> {
  const supabase = requireSupabase();
  const { data: app, error } = await supabase
    .from('applications')
    .select(
      'id, user_id, full_name, email, dog_interest, specific_dog_id, litter_interest_id, preferred_sex, preferred_colour, tail_preference',
    )
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error('Application not found.');

  const { data: existing } = await supabase
    .from('quotes')
    .select('id')
    .eq('application_id', applicationId)
    .limit(1)
    .maybeSingle();

  const tiers = await fetchPricingTiers();
  let litterDefaultTier: string | null = null;
  let dogPrice: number | null = null;
  let dogTier: string | null = null;
  if (app.specific_dog_id) {
    const { data: dog } = await supabase
      .from('dogs')
      .select('price, programme_tier, litter:litters(default_programme_tier)')
      .eq('id', app.specific_dog_id)
      .maybeSingle();
    if (dog) {
      dogPrice = dog.price;
      dogTier = dog.programme_tier;
      const litterRaw = dog.litter;
      const litter = Array.isArray(litterRaw) ? litterRaw[0] : litterRaw;
      litterDefaultTier = litter?.default_programme_tier ?? null;
    }
  } else if (app.litter_interest_id) {
    const { data: litter } = await supabase
      .from('litters')
      .select('default_programme_tier')
      .eq('id', app.litter_interest_id)
      .maybeSingle();
    litterDefaultTier = litter?.default_programme_tier ?? null;
  }

  const resolved = resolveQuotePrice(
    {
      dogPrice,
      dogTier,
      litterDefaultTier,
      applicationTier: app.dog_interest,
    },
    tiers,
  );
  const tier = app.dog_interest ? tiers.find((t) => t.tier_key === app.dog_interest) : undefined;
  const tierLabel =
    tier?.display_label ??
    labelFor('dog_interest', (app.dog_interest ?? undefined) as never);

  return {
    applicationId,
    clientId: app.user_id,
    clientName: app.full_name,
    clientEmail: app.email,
    notes: `From application ${applicationId.slice(0, 8)}.`,
    description: `${tierLabel}${preferenceSummary(app)}`,
    dogId: app.specific_dog_id,
    unitPrice: resolved.unitPrice,
    priceOnRequest: resolved.priceOnRequest || resolved.unitPrice == null,
    priceSourceLabel: resolved.sourceLabel,
    litterInterestId: app.litter_interest_id,
    applicationTier: app.dog_interest,
    existingQuoteId: existing?.id ?? null,
  };
}

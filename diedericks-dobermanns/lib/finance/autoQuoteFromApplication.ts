import { labelFor } from '@/components/forms/ApplicationForm/labels';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { createQuote } from '@/lib/finance/quoteQueries';
import { fetchPricingTier } from '@/lib/finance/pricingQueries';
import { requireSupabase } from '@/lib/supabase';

const APPLICATION_SELECT =
  'id, user_id, full_name, email, phone, dog_interest, specific_dog_id, litter_interest_id, preferred_sex, preferred_colour, tail_preference';

interface AutoQuoteApplicationRow {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  dog_interest: string | null;
  specific_dog_id: string | null;
  litter_interest_id: string | null;
  preferred_sex: string | null;
  preferred_colour: string | null;
  tail_preference: string | null;
}

/** Bracketed preference summary appended to the line item description, e.g. "(Male, Black & Tan, docked)". */
function preferenceSummary(app: AutoQuoteApplicationRow): string {
  const parts: string[] = [];
  if (app.preferred_sex && app.preferred_sex !== 'no_preference') {
    parts.push(labelFor('preferred_sex', app.preferred_sex as ApplicationFormValues['preferred_sex']));
  }
  if (app.preferred_colour && app.preferred_colour !== 'no_preference') {
    parts.push(labelFor('preferred_colour', app.preferred_colour as ApplicationFormValues['preferred_colour']));
  }
  if (app.tail_preference && app.tail_preference !== 'no_preference') {
    parts.push(labelFor('tail_preference', app.tail_preference as ApplicationFormValues['tail_preference']));
  }
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/**
 * Builds a DRAFT quote from an approved application.
 *
 * Deliberately draft-only: the quote is never sent to the client automatically.
 * Matt reviews and sends it from app/(admin)/quotes/[id].tsx.
 *
 * Returns the new quote id, or null if a quote already exists for this
 * application (idempotency — approving twice must not create two quotes).
 */
export async function createDraftQuoteFromApplication(
  applicationId: string,
): Promise<{ quoteId: string | null; error: string | null }> {
  try {
    const supabase = requireSupabase();

    // 1. Idempotency guard first — approving twice must never create a second quote.
    const { data: existingRows, error: existingErr } = await supabase
      .from('quotes')
      .select('id')
      .eq('application_id', applicationId)
      .limit(1);
    if (existingErr) throw new Error(existingErr.message);
    const existing = existingRows?.[0] as { id: string } | undefined;
    if (existing) return { quoteId: existing.id, error: null };

    // 2. Fetch the application.
    const { data: appRow, error: appErr } = await supabase
      .from('applications')
      .select(APPLICATION_SELECT)
      .eq('id', applicationId)
      .single();
    if (appErr) throw new Error(appErr.message);
    const app = appRow as unknown as AutoQuoteApplicationRow;

    // 3. Look up the tier. No tier row, or a tier still priced at 0, still creates the
    // quote — Matt needs to see the draft, not have it silently abort.
    const tier = app.dog_interest ? await fetchPricingTier(app.dog_interest) : null;
    const unitPrice = tier?.price ?? 0;
    const pricingWarning =
      !tier || tier.price === 0
        ? ' Pricing not yet configured for this tier — set the amount before sending.'
        : '';
    const tierLabel =
      tier?.display_label ??
      labelFor('dog_interest', (app.dog_interest ?? undefined) as ApplicationFormValues['dog_interest']);

    // 4. One line item, priced from the tier and annotated with the applicant's preferences.
    const description = `${tierLabel}${preferenceSummary(app)}`;

    // 5. Create via the existing createQuote() — never a second insert path.
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quoteId = await createQuote(
      {
        client_id: app.user_id ?? null,
        historical_client_name: app.user_id ? null : app.full_name,
        application_id: applicationId,
        status: 'draft',
        valid_until: validUntil.toISOString().slice(0, 10),
        notes: `Auto-generated from application ${applicationId.slice(0, 8)}.${pricingWarning}`,
      },
      [
        {
          item_type: 'dog',
          dog_id: app.specific_dog_id ?? null,
          description,
          quantity: 1,
          unit_price: unitPrice,
        },
      ],
    );

    return { quoteId, error: null };
  } catch (e) {
    return { quoteId: null, error: e instanceof Error ? e.message : 'Could not create draft quote.' };
  }
}

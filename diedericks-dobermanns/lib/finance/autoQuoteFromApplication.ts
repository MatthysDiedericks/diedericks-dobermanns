import { labelFor } from '@/components/forms/ApplicationForm/labels';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { buildAppQuotePrefill } from '@/lib/finance/buildAppQuotePrefill';
import { createQuote } from '@/lib/finance/quoteQueries';

/**
 * Builds a DRAFT quote from an approved application. Never sends.
 */
export async function createDraftQuoteFromApplication(
  applicationId: string,
): Promise<{ quoteId: string | null; error: string | null }> {
  try {
    const prefill = await buildAppQuotePrefill(applicationId);
    if (prefill.existingQuoteId) return { quoteId: prefill.existingQuoteId, error: null };

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    const warning =
      prefill.priceSourceLabel === 'Set a price'
        ? ' Pricing not yet configured — set the amount before sending.'
        : '';

    const quoteId = await createQuote(
      {
        client_id: prefill.clientId,
        buyer_kind: 'applicant',
        buyer_id: applicationId,
        application_id: applicationId,
        status: 'draft',
        valid_until: validUntil.toISOString().slice(0, 10),
        notes: `${prefill.notes}${warning}`,
      },
      [
        {
          item_type: 'dog',
          dog_id: prefill.dogId,
          description: prefill.description,
          quantity: 1,
          unit_price: prefill.unitPrice ?? 0,
        },
      ],
    );

    return { quoteId, error: null };
  } catch (e) {
    return { quoteId: null, error: e instanceof Error ? e.message : 'Could not create draft quote.' };
  }
}

/** Kept for callers that still format a preference label. */
export function preferenceLine(app: {
  preferred_sex: string | null;
  preferred_colour: string | null;
  tail_preference: string | null;
}): string {
  const parts: string[] = [];
  if (app.preferred_sex && app.preferred_sex !== 'no_preference') {
    parts.push(labelFor('preferred_sex', app.preferred_sex as ApplicationFormValues['preferred_sex']));
  }
  if (app.preferred_colour && app.preferred_colour !== 'no_preference') {
    parts.push(
      labelFor('preferred_colour', app.preferred_colour as ApplicationFormValues['preferred_colour']),
    );
  }
  if (app.tail_preference && app.tail_preference !== 'no_preference') {
    parts.push(labelFor('tail_preference', app.tail_preference as ApplicationFormValues['tail_preference']));
  }
  return parts.length ? ` (${parts.join(', ')})` : '';
}

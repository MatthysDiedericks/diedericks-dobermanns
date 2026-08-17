import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { AppQuotePrefill } from '@/lib/finance/buildAppQuotePrefill';
import { buyerKey } from '@/lib/finance/quoteBuyerOptions';
import { defaultSubjectKind, inferTierKeyFromDescription } from '@/lib/finance/quoteSubject';
import type { Quote } from '@/types/app.types';

export type QuotePrefill = {
  waitlistId?: string;
  clientId?: string;
  walkinName?: string;
  walkinContact?: string;
  dogId?: string;
  litterId?: string;
  applicationId?: string;
  application?: AppQuotePrefill;
};

let keyCounter = 0;
export const nextQuoteLineKey = () => `item-${keyCounter++}`;

export function seedAppQuoteItems(
  quote?: Quote | null,
  application?: AppQuotePrefill,
): DraftLineItem[] {
  if (quote?.items?.length) {
    return quote.items.map((it) => {
      const kind =
        (it.subject_kind as DraftLineItem['subject_kind']) ??
        (it.dog_id ? 'dog' : it.litter_id ? 'litter' : 'unallocated');
      return {
        key: nextQuoteLineKey(),
        item_type: it.item_type,
        dog_id: it.dog_id,
        litter_id: it.litter_id ?? null,
        subject_kind: kind,
        programme_tier: inferTierKeyFromDescription(it.description),
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        catalogue_code: it.catalogue_code ?? null,
        allowZeroPrice: it.item_type === 'delivery' && it.unit_price === 0,
      };
    });
  }
  if (application) {
    const kind = application.subjectKind ?? defaultSubjectKind({
      specificDogId: application.dogId,
      litterInterestId: application.litterInterestId,
    });
    return [
      {
        key: nextQuoteLineKey(),
        item_type: 'dog',
        dog_id: application.dogId,
        litter_id: kind === 'litter' ? application.litterInterestId : null,
        subject_kind: kind,
        programme_tier: application.applicationTier,
        description: application.description,
        quantity: 1,
        unit_price: application.unitPrice ?? 0,
        priceSourceLabel: application.priceSourceLabel,
      },
    ];
  }
  return [
    {
      key: nextQuoteLineKey(),
      item_type: 'dog',
      dog_id: null,
      litter_id: null,
      subject_kind: 'unallocated',
      programme_tier: null,
      description: '',
      quantity: 1,
      unit_price: 0,
    },
  ];
}

export function initialBuyerKey(initial?: Quote | null, prefill?: QuotePrefill): string {
  if (initial?.client_id) return buyerKey('user', initial.client_id);
  if (initial?.contact_id) return buyerKey('contact', initial.contact_id);
  if (initial?.historical_client_name) return buyerKey('walkin');
  if (prefill?.application?.clientId) return buyerKey('user', prefill.application.clientId);
  if (prefill?.applicationId) return buyerKey('applicant', prefill.applicationId);
  if (prefill?.clientId) return buyerKey('user', prefill.clientId);
  if (prefill?.walkinName) return buyerKey('walkin');
  return '';
}

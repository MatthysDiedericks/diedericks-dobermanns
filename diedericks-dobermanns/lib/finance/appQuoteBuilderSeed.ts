import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { AppQuotePrefill } from '@/lib/finance/buildAppQuotePrefill';
import { buyerKey } from '@/lib/finance/quoteBuyerOptions';
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
    return quote.items.map((it) => ({
      key: nextQuoteLineKey(),
      item_type: it.item_type,
      dog_id: it.dog_id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      catalogue_code: it.catalogue_code ?? null,
      allowZeroPrice: it.item_type === 'delivery' && it.unit_price === 0,
    }));
  }
  if (application) {
    return [
      {
        key: nextQuoteLineKey(),
        item_type: 'dog',
        dog_id: application.dogId,
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

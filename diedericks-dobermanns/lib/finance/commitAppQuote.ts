import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { DeliveryDecision } from '@/lib/finance/catalogue';
import { ERROR_CODES, logQuoteFailure } from '@/lib/finance/quoteErrors';
import { saveAppQuote } from '@/lib/finance/saveAppQuote';
import type { Quote } from '@/types/app.types';

export async function commitAppQuote(input: {
  initial?: Quote | null;
  quoteId: string | null;
  items: DraftLineItem[];
  selectedBuyer: string;
  buyerKind: 'applicant' | 'user' | 'contact' | 'walkin';
  buyerId: string | null;
  applicationId: string | null;
  walkinName: string;
  walkinEmail?: string;
  walkinPhone?: string;
  quoteType?: string;
  notes: string;
  validUntil: string;
  discountNum: number;
  deliveryDecision: DeliveryDecision | null;
  deliveryNote: string;
  changeNote: string;
  waitlistId?: string;
  total: number;
}): Promise<{ quoteId: string; toWaitlist?: string }> {
  if (!input.selectedBuyer) {
    const error = 'Choose the applicant, a portal user, a contact, or not in the list.';
    await logQuoteFailure(ERROR_CODES.QUOTE_VALIDATION_FAILED, error, {
      step: 'save',
      field: 'buyer',
      lineCount: input.items.length,
      quoteId: input.quoteId,
      contactAttached: false,
    });
    throw new Error(error);
  }
  return saveAppQuote({
    initial: input.initial,
    quoteId: input.quoteId,
    items: input.items,
    buyerKind: input.buyerKind,
    buyerId: input.buyerId,
    applicationId: input.applicationId,
    walkinName: input.walkinName,
    walkinContact: '',
    walkinEmail: input.walkinEmail,
    walkinPhone: input.walkinPhone,
    quoteType: input.quoteType,
    notes: input.notes,
    validUntil: input.validUntil,
    discountNum: input.discountNum,
    deliveryDecision: input.deliveryDecision,
    deliveryNote: input.deliveryNote,
    changeNote: input.changeNote,
    waitlistId: input.waitlistId,
    total: input.total,
    mode: 'strict',
  });
}

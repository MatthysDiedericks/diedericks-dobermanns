import type { DraftLineItem } from '@/components/finance/LineItemRow';
import { assertQuoteLineCount, assertQuoteTotalsMatch } from '@/lib/errors/assertQuote';
import type { LineItemInput } from '@/lib/finance/mutations';
import { createQuote, updateQuote } from '@/lib/finance/quoteQueries';
import { prepareQuoteLinesForSave, quoteDraftHasContent } from '@/lib/finance/prepareQuoteLines';
import { subjectColumnsForSave } from '@/lib/finance/quoteSubjectSave';
import type { DeliveryDecision } from '@/lib/finance/catalogue';
import { syncDeliveryLine } from '@/lib/finance/quoteDelivery';
import {
  ERROR_CODES,
  logQuoteFailure,
  QuoteDbError,
  quoteUnhandled,
} from '@/lib/finance/quoteErrors';
import { requireSupabase } from '@/lib/supabase';
import type { Quote } from '@/types/app.types';

export { quoteDraftHasContent };

export async function saveAppQuote(input: {
  initial?: Quote | null;
  items: DraftLineItem[];
  buyerKind: 'applicant' | 'user' | 'contact' | 'walkin';
  buyerId: string | null;
  applicationId: string | null;
  walkinName: string;
  walkinContact: string;
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
  mode?: 'strict' | 'draft';
  quoteId?: string | null;
}): Promise<{ quoteId: string; toWaitlist?: string }> {
  const existingId = input.quoteId ?? input.initial?.id ?? null;
  const ctx = {
    step: 'save',
    lineCount: input.items.length,
    quoteId: existingId,
    contactAttached: Boolean(input.buyerId || input.walkinName.trim()),
    populated: {
      buyerKind: Boolean(input.buyerKind),
      buyerId: Boolean(input.buyerId),
      walkinName: Boolean(input.walkinName.trim()),
      changeNote: Boolean(input.changeNote.trim()),
    },
  };

  const synced = syncDeliveryLine(input.items, input.deliveryDecision, [], () => 'delivery-sync');
  const prepared = prepareQuoteLinesForSave(synced, input.mode ?? 'strict');
  if (!prepared.ok) {
    await logQuoteFailure(ERROR_CODES.QUOTE_VALIDATION_FAILED, prepared.error, {
      ...ctx,
      field: 'lines',
    });
    throw new Error(prepared.error);
  }

  const cleanItems: LineItemInput[] = prepared.lines.map((it) => ({
    item_type: it.item_type as LineItemInput['item_type'],
    ...subjectColumnsForSave(it),
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    catalogue_code: it.catalogue_code ?? null,
    allowZeroPrice: it.allowZeroPrice,
  }));

  const intendedMeaningful = synced.filter(
    (it) =>
      Boolean(it.dog_id) ||
      Boolean(it.litter_id) ||
      Boolean(it.programme_tier) ||
      it.unit_price > 0 ||
      it.description.trim() ||
      it.allowZeroPrice,
  );
  if (cleanItems.length < intendedMeaningful.length) {
    const dropErr = await assertQuoteLineCount({
      intendedCount: intendedMeaningful.length,
      writtenCount: cleanItems.length,
      droppedDescriptions: intendedMeaningful.slice(cleanItems.length).map((it) => it.description),
      quoteId: existingId,
    });
    if (dropErr) {
      await logQuoteFailure(ERROR_CODES.QUOTE_VALIDATION_FAILED, dropErr, {
        ...ctx,
        field: 'line_count',
      });
      throw new Error(dropErr);
    }
  }

  if (input.mode !== 'draft') {
    const totalErr = await assertQuoteTotalsMatch({
      displayedTotal: Math.max(
        cleanItems.reduce((s, it) => s + it.quantity * it.unit_price, 0) - input.discountNum,
        0,
      ),
      lines: cleanItems,
      discount: input.discountNum,
      quoteId: existingId,
    });
    if (totalErr) {
      await logQuoteFailure(ERROR_CODES.QUOTE_VALIDATION_FAILED, totalErr, {
        ...ctx,
        field: 'total',
      });
      throw new Error(totalErr);
    }
  }

  const combinedNotes = [
    input.notes.trim(),
    input.walkinContact.trim() ? `Contact: ${input.walkinContact.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const header = {
    client_id: input.buyerKind === 'user' ? input.buyerId : null,
    contact_id: input.buyerKind === 'contact' ? input.buyerId : null,
    historical_client_name: input.buyerKind === 'walkin' ? input.walkinName.trim() || null : null,
    walkin_email: input.walkinEmail?.trim() || null,
    walkin_phone: input.walkinPhone?.trim() || null,
    quote_type: input.quoteType ?? 'dog_sale',
    buyer_kind: input.buyerKind,
    buyer_id: input.buyerId,
    application_id: input.applicationId,
    status: 'draft' as const,
    notes: combinedNotes || null,
    valid_until: input.validUntil.trim() || null,
    discount: input.discountNum,
    delivery_decision: input.deliveryDecision,
    delivery_note: input.deliveryNote.trim() || null,
  };

  try {
    let quoteId: string;
    if (existingId) {
      await updateQuote(existingId, header, cleanItems, {
        changeNote: input.changeNote.trim() || null,
      });
      quoteId = existingId;
    } else {
      quoteId = await createQuote(header, cleanItems);
    }

    if (!existingId && input.waitlistId) {
      await requireSupabase()
        .from('waiting_list')
        .update({ quote_id: quoteId, quoted_price: input.total, status: 'active' })
        .eq('id', input.waitlistId);
      return { quoteId, toWaitlist: input.waitlistId };
    }
    return { quoteId };
  } catch (e) {
    if (e instanceof QuoteDbError) {
      await logQuoteFailure(ERROR_CODES.QUOTE_SAVE_FAILED, e.message, {
        ...ctx,
        step: e.step,
        sqlstate: e.sqlstate,
      });
    } else {
      await quoteUnhandled(e, ctx);
    }
    throw e instanceof Error ? e : new Error('Could not save this quote.');
  }
}

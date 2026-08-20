import type { DraftLineItem } from '@/components/finance/LineItemRow';
import { assertQuoteLineCount, assertQuoteTotalsMatch } from '@/lib/errors/assertQuote';
import type { LineItemInput } from '@/lib/finance/mutations';
import { createQuote, updateQuote } from '@/lib/finance/quoteQueries';
import { prepareQuoteLinesForSave } from '@/lib/finance/prepareQuoteLines';
import { subjectColumnsForSave } from '@/lib/finance/quoteSubjectSave';
import type { DeliveryDecision } from '@/lib/finance/catalogue';
import { syncDeliveryLine } from '@/lib/finance/quoteDelivery';
import { requireSupabase } from '@/lib/supabase';
import type { Quote } from '@/types/app.types';

export async function saveAppQuote(input: {
  initial?: Quote | null;
  items: DraftLineItem[];
  buyerKind: 'applicant' | 'user' | 'contact' | 'walkin';
  buyerId: string | null;
  applicationId: string | null;
  walkinName: string;
  walkinContact: string;
  notes: string;
  validUntil: string;
  discountNum: number;
  deliveryDecision: DeliveryDecision | null;
  deliveryNote: string;
  changeNote: string;
  waitlistId?: string;
  total: number;
}): Promise<{ quoteId: string; toWaitlist?: string }> {
  const synced = syncDeliveryLine(input.items, input.deliveryDecision, [], () => 'delivery-sync');
  const prepared = prepareQuoteLinesForSave(synced);
  if (!prepared.ok) throw new Error(prepared.error);

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
      quoteId: input.initial?.id ?? null,
    });
    if (dropErr) throw new Error(dropErr);
  }

  const totalErr = await assertQuoteTotalsMatch({
    displayedTotal: Math.max(
      cleanItems.reduce((s, it) => s + it.quantity * it.unit_price, 0) - input.discountNum,
      0,
    ),
    lines: cleanItems,
    discount: input.discountNum,
    quoteId: input.initial?.id ?? null,
  });
  if (totalErr) throw new Error(totalErr);

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

  let quoteId: string;
  if (input.initial) {
    await updateQuote(input.initial.id, header, cleanItems, {
      changeNote: input.changeNote.trim() || null,
    });
    quoteId = input.initial.id;
  } else {
    quoteId = await createQuote(header, cleanItems);
  }

  if (!input.initial && input.waitlistId) {
    await requireSupabase()
      .from('waiting_list')
      .update({ quote_id: quoteId, quoted_price: input.total, status: 'active' })
      .eq('id', input.waitlistId);
    return { quoteId, toWaitlist: input.waitlistId };
  }
  return { quoteId };
}

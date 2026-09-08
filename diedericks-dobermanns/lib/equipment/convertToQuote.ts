import { createQuote } from '@/lib/finance/quoteQueries';
import type { LineItemType } from '@/types/app.types';
import { fetchEquipmentEnquiry } from '@/lib/equipment/queries';
import { requireSupabase } from '@/lib/supabase';

const LINE_TYPES: LineItemType[] = [
  'dog',
  'delivery',
  'board_train',
  'training',
  'transport',
  'accessory',
  'other',
];

function asLineType(value: string): LineItemType {
  return LINE_TYPES.includes(value as LineItemType) ? (value as LineItemType) : 'accessory';
}

/** Builds a quotes + quote_items draft from an equipment enquiry, then marks it quoted. */
export async function convertEquipmentEnquiryToQuote(
  enquiryId: string,
): Promise<{ quoteId?: string; error?: string }> {
  const enquiry = await fetchEquipmentEnquiry(enquiryId);
  if (!enquiry) return { error: 'Enquiry not found.' };
  if (enquiry.quote_id) return { quoteId: enquiry.quote_id };
  if (enquiry.items.length === 0) return { error: 'This enquiry has no items to quote.' };

  try {
    const quoteId = await createQuote(
      {
        client_id: enquiry.client_id,
        contact_id: enquiry.contact_id,
        buyer_kind: enquiry.contact_id ? 'contact' : enquiry.client_id ? 'user' : 'walkin',
        buyer_id: enquiry.contact_id ?? enquiry.client_id,
        historical_client_name: enquiry.full_name,
        walkin_email: enquiry.email,
        walkin_phone: enquiry.phone,
        quote_type: 'other',
        status: 'draft',
        notes: enquiry.message,
        delivery_decision: enquiry.fulfilment === 'collection' ? 'collection' : 'to_be_confirmed',
        delivery_note:
          enquiry.fulfilment === 'delivery' ? enquiry.delivery_address : null,
      },
      enquiry.items.map((it) => ({
        item_type: asLineType(it.item_type),
        description: (it.description_template?.trim() || it.label).trim(),
        quantity: it.quantity,
        unit_price: it.price_varies ? 0 : Number(it.default_price ?? 0),
        catalogue_code: it.code,
        allowZeroPrice: true,
      })),
    );

    const supabase = requireSupabase();
    const { error } = await supabase
      .from('equipment_enquiries' as never)
      .update({ quote_id: quoteId, status: 'quoted', updated_at: new Date().toISOString() } as never)
      .eq('id' as never, enquiryId);
    if (error) return { quoteId, error: error.message };
    return { quoteId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not convert this enquiry.' };
  }
}

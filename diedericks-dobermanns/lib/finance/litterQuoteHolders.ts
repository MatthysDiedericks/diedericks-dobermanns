import { allocateDogToClient } from '@/lib/dogs/allocation';
import { dogLineDescription, litterPairLabel } from '@/lib/finance/quoteSubject';
import { requireSupabase } from '@/lib/supabase';

export type LitterQuoteHolder = {
  quoteItemId: string;
  quoteId: string;
  quoteNumber: string;
  total: number;
  convertedInvoiceId: string | null;
  buyerName: string;
  depositPaid: boolean;
  quotedAt: string;
  preferredSex: string | null;
  preferredColour: string | null;
  tailPreference: string | null;
  dogInterest: string | null;
};

type QuoteJoin = {
  id: string;
  quote_number: string;
  total: number;
  converted_invoice_id: string | null;
  created_at: string;
  historical_client_name: string | null;
  client: { full_name: string | null } | null;
  application: {
    full_name: string;
    preferred_sex: string | null;
    preferred_colour: string | null;
    tail_preference: string | null;
    dog_interest: string | null;
  } | null;
};

/** Buyers holding a place in this litter — the queue when matching starts. */
export async function fetchLitterQuoteHolders(litterId: string): Promise<LitterQuoteHolder[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quote_items')
    .select(
      'id, quote_id, quote:quotes!quote_items_quote_id_fkey(id, quote_number, total, converted_invoice_id, created_at, historical_client_name, client:users!quotes_client_id_fkey(full_name), application:applications(full_name, preferred_sex, preferred_colour, tail_preference, dog_interest))',
    )
    .eq('litter_id', litterId)
    .eq('subject_kind', 'litter');
  if (error) {
    console.error('[fetchLitterQuoteHolders]', error.message);
    return [];
  }

  return ((data ?? []) as unknown as { id: string; quote: QuoteJoin | null }[])
    .filter((row) => row.quote)
    .map((row) => {
      const q = row.quote!;
      return {
        quoteItemId: row.id,
        quoteId: q.id,
        quoteNumber: q.quote_number,
        total: Number(q.total),
        convertedInvoiceId: q.converted_invoice_id,
        buyerName: q.client?.full_name ?? q.application?.full_name ?? q.historical_client_name ?? 'Buyer',
        depositPaid: Boolean(q.converted_invoice_id),
        quotedAt: q.created_at,
        preferredSex: q.application?.preferred_sex ?? null,
        preferredColour: q.application?.preferred_colour ?? null,
        tailPreference: q.application?.tail_preference ?? null,
        dogInterest: q.application?.dog_interest ?? null,
      };
    })
    .sort((a, b) => a.quotedAt.localeCompare(b.quotedAt));
}

/**
 * Resolves a litter-place line onto a real puppy. Same quote, same money.
 * Never creates a second quote.
 */
export async function allocatePuppyToLitterQuote(
  quoteItemId: string,
  dogId: string,
): Promise<{ error?: string }> {
  const supabase = requireSupabase();

  const { data: item, error: itemErr } = await supabase
    .from('quote_items')
    .select('id, quote_id, litter_id, subject_kind')
    .eq('id', quoteItemId)
    .maybeSingle();
  if (itemErr) return { error: itemErr.message };
  if (!item) return { error: 'Quote line not found.' };
  if (item.subject_kind !== 'litter' || !item.litter_id) {
    return { error: 'This line is not a place in a litter.' };
  }

  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select(
      'id, name, sex, colour, collar_colour, tail_type, birth_order, status, litter_id, price, programme_tier, litter:litters(mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name))',
    )
    .eq('id', dogId)
    .maybeSingle();
  if (dogErr) return { error: dogErr.message };
  if (!dog) return { error: 'Puppy not found.' };
  if (dog.litter_id !== item.litter_id) return { error: 'That puppy is not from this litter.' };

  const litterRaw = dog.litter as {
    mother?: { name: string } | { name: string }[] | null;
    father?: { name: string } | { name: string }[] | null;
  } | null;
  const mother = Array.isArray(litterRaw?.mother) ? litterRaw?.mother[0] : litterRaw?.mother;
  const father = Array.isArray(litterRaw?.father) ? litterRaw?.father[0] : litterRaw?.father;
  const description = dogLineDescription({
    id: dog.id,
    name: dog.name,
    sex: dog.sex,
    colour: dog.colour,
    collar_colour: (dog as { collar_colour?: string | null }).collar_colour ?? null,
    tail_type: (dog as { tail_type?: string | null }).tail_type ?? null,
    birth_order: (dog as { birth_order?: number | null }).birth_order ?? null,
    status: dog.status,
    price: dog.price,
    programme_tier: dog.programme_tier,
    litter_id: dog.litter_id,
    litter_default_tier: null,
    litter_label: litterPairLabel({ mother_name: mother?.name, father_name: father?.name }),
  });

  const { error: updErr } = await supabase
    .from('quote_items')
    .update({ subject_kind: 'dog', dog_id: dogId, description } as never)
    .eq('id', quoteItemId)
    .eq('quote_id', item.quote_id);
  if (updErr) return { error: updErr.message };

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, client_id, converted_invoice_id')
    .eq('id', item.quote_id)
    .maybeSingle();

  if (quote?.converted_invoice_id && quote.client_id) {
    const alloc = await allocateDogToClient(dogId, quote.client_id);
    if (alloc.error) return { error: alloc.error };
  } else if (dog.status === 'available') {
    await supabase.from('dogs').update({ status: 'reserved' }).eq('id', dogId);
  }

  return {};
}

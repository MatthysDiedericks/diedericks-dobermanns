import { fetchMyFinancialClientIds } from '@/lib/portal/memberScope';
import { requireSupabase } from '@/lib/supabase';
import { litterPairLabel, subjectStatement, type QuoteSubjectKind } from '@/lib/finance/quoteSubject';

export type ClientQuoteListRow = {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  currency: string;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  last_sent_revision: number | null;
  revision: number | null;
};

export type ClientQuoteDetail = ClientQuoteListRow & {
  notes: string | null;
  subtotal: number;
  discount: number;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    subjectNote?: string | null;
    item_type?: string;
    dog_id?: string | null;
    litter_id?: string | null;
    subject_kind?: string | null;
  }[];
};

type Named = { name: string | null };
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Non-draft quotes visible to the signed-in client. Filter by userId — admin RLS would otherwise return every quote. */
export async function fetchMyClientQuotes(userId: string): Promise<ClientQuoteListRow[]> {
  const supabase = requireSupabase();
  const userIds = await fetchMyFinancialClientIds();
  const { data: apps } = await supabase.from('applications').select('id').in('user_id', userIds);
  const appIds = (apps ?? []).map((a) => a.id);
  let q = supabase
    .from('quotes')
    .select(
      'id, quote_number, status, total, currency, valid_until, sent_at, created_at, last_sent_revision, revision',
    )
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  q =
    appIds.length > 0
      ? q.or(`${userIds.map((id) => `client_id.eq.${id}`).join(',')},application_id.in.(${appIds.join(',')})`)
      : userIds.length === 1
        ? q.eq('client_id', userIds[0]!)
        : q.in('client_id', userIds);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ClientQuoteListRow[]).map((q) => ({
    ...q,
    total: Number(q.total),
  }));
}

export async function fetchMyClientQuoteById(
  id: string,
  userId: string,
): Promise<ClientQuoteDetail | null> {
  const supabase = requireSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, total, currency, valid_until, sent_at, created_at, last_sent_revision, revision, notes, subtotal, discount, client_id, application_id',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) return null;

  const row = quote as unknown as ClientQuoteDetail & {
    client_id: string | null;
    application_id: string | null;
  };
  const userIds = await fetchMyFinancialClientIds();
  if (row.client_id && userIds.includes(row.client_id)) {
    // owned by this portal
  } else if (row.application_id) {
    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('id', row.application_id)
      .in('user_id', userIds)
      .maybeSingle();
    if (!app) return null;
  } else {
    return null;
  }

  await supabase.rpc('stamp_quote_client_activity' as never, { p_quote_id: id } as never);

  const { data: items, error: itemsErr } = await supabase
    .from('quote_items')
    .select('description, quantity, unit_price, line_total, dog_id, litter_id, subject_kind, item_type')
    .eq('quote_id', id)
    .order('sort_order');
  if (itemsErr) throw new Error(itemsErr.message);

  const rows = (items ?? []) as {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    dog_id: string | null;
    litter_id: string | null;
    subject_kind: string | null;
    item_type: string;
  }[];
  const dogIds = [...new Set(rows.map((r) => r.dog_id).filter(Boolean))] as string[];
  const litterIds = [...new Set(rows.map((r) => r.litter_id).filter(Boolean))] as string[];
  const [{ data: dogs }, { data: litters }] = await Promise.all([
    dogIds.length
      ? supabase
          .from('dogs')
          .select(
            'id, name, sex, colour, collar_colour, tail_type, birth_order, status, price, programme_tier, litter_id, litter:litters(mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name))',
          )
          .in('id', dogIds)
      : Promise.resolve({ data: [] as never[] }),
    litterIds.length
      ? supabase
          .from('litters')
          .select(
            'id, status, expected_date, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)',
          )
          .in('id', litterIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const dogMap = new Map((dogs ?? []).map((d) => [d.id, d]));
  const litterMap = new Map((litters ?? []).map((l) => [l.id, l]));

  const detail = quote as unknown as ClientQuoteDetail;
  return {
    ...detail,
    total: Number(detail.total),
    subtotal: Number(detail.subtotal),
    discount: Number(detail.discount),
    items: rows.map((it) => {
      if (it.item_type !== 'dog') {
        return {
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          line_total: Number(it.line_total),
          subjectNote: null,
        };
      }
      const kind: QuoteSubjectKind =
        (it.subject_kind as QuoteSubjectKind | null) ??
        (it.dog_id ? 'dog' : it.litter_id ? 'litter' : 'unallocated');
      const dog = it.dog_id ? dogMap.get(it.dog_id) : null;
      const litter = it.litter_id ? litterMap.get(it.litter_id) : null;
      const litterJoin = dog
        ? one(
            dog.litter as
              | { mother?: Named | Named[] | null; father?: Named | Named[] | null }
              | { mother?: Named | Named[] | null; father?: Named | Named[] | null }[]
              | null,
          )
        : null;
      const subjectNote = subjectStatement({
        kind,
        puppy: dog
          ? {
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
              litter_label: litterPairLabel({
                mother_name: one(litterJoin?.mother as Named | Named[] | null)?.name,
                father_name: one(litterJoin?.father as Named | Named[] | null)?.name,
              }),
            }
          : null,
        litter: litter
          ? {
              id: litter.id,
              mother_name: one(litter.mother as unknown as Named | Named[] | null)?.name ?? '',
              father_name: one(litter.father as unknown as Named | Named[] | null)?.name ?? '',
              expected_date: litter.expected_date,
              status: litter.status,
              default_programme_tier: null,
            }
          : null,
      });
      return {
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        line_total: Number(it.line_total),
        subjectNote,
      };
    }),
  };
}

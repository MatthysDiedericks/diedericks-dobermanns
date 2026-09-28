import type { SupabaseClient } from '@supabase/supabase-js';

import { getCachedUser } from '@/lib/auth/getCachedUser';
import { supabase } from '@/lib/supabase';
import type { AppDatabase } from '@/types/appDatabase';
import {
  dogLinkOnClose,
  entriesSettledByBalance,
  entriesToClose,
  handoverClosePatch,
  type CloseCandidate,
  type PlacementLink,
} from '@/lib/waitlist/placementClose';

type Client = SupabaseClient<AppDatabase>;

const CANDIDATE_SELECT =
  'id, pipeline_stage, assigned_dog_id, client_id, application_id, quote_id, enquirer_name';

function hasLink(link: PlacementLink): boolean {
  return Boolean(
    link.entryId?.trim() ||
      link.dogId?.trim() ||
      link.clientId?.trim() ||
      link.applicationId?.trim() ||
      link.quoteId?.trim(),
  );
}

async function loadCandidates(
  client: Client,
  link: PlacementLink,
): Promise<{ entries: CloseCandidate[]; error: string | null }> {
  if (!hasLink(link)) return { entries: [], error: null };

  if (link.entryId?.trim()) {
    const { data, error } = await client
      .from('waiting_list')
      .select(CANDIDATE_SELECT)
      .eq('id', link.entryId);
    return {
      entries: (data ?? []) as unknown as CloseCandidate[],
      error: error?.message ?? null,
    };
  }

  const parts: string[] = [];
  if (link.dogId) parts.push(`assigned_dog_id.eq.${link.dogId}`);
  if (link.clientId) parts.push(`client_id.eq.${link.clientId}`);
  if (link.applicationId) parts.push(`application_id.eq.${link.applicationId}`);
  if (link.quoteId) parts.push(`quote_id.eq.${link.quoteId}`);
  const { data, error } = await client.from('waiting_list').select(CANDIDATE_SELECT).or(parts.join(','));
  return {
    entries: (data ?? []) as unknown as CloseCandidate[],
    error: error?.message ?? null,
  };
}

/** Closes matching waiting-list lines. No name is ever sent to the query. */
export async function closeLinkedPlacements(
  client: Client,
  link: PlacementLink,
  note: string,
  actorId: string | null,
): Promise<{ error: string | null; closed: string[] }> {
  const loaded = await loadCandidates(client, link);
  if (loaded.error) return { error: loaded.error, closed: [] };
  const hits = entriesToClose(loaded.entries, link);
  if (hits.length === 0) return { error: null, closed: [] };

  const dogFields = hits.length === 1 ? dogLinkOnClose(hits[0], link) : {};
  const patch = {
    ...handoverClosePatch(note, new Date().toISOString(), actorId),
    ...dogFields,
  };
  const { error } = await client
    .from('waiting_list')
    .update(patch as never)
    .in(
      'id',
      hits.map((hit) => hit.id),
    );
  if (error) return { error: error.message, closed: [] };
  return { error: null, closed: hits.map((hit) => hit.id) };
}

/** Dog id, its owner, and a single quote for that dog. Never the buyer's name. */
export async function closePlacementForDog(
  dogId: string,
  note: string,
): Promise<{ error: string | null; closed: string[] }> {
  if (!supabase) return { error: null, closed: [] };
  const user = await getCachedUser();
  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select('owner_id')
    .eq('id', dogId)
    .maybeSingle();
  if (dogErr) return { error: dogErr.message, closed: [] };

  const { data: items, error: itemErr } = await supabase
    .from('quote_items')
    .select('quote_id')
    .eq('dog_id', dogId);
  if (itemErr) return { error: itemErr.message, closed: [] };
  const quoteIds = [...new Set((items ?? []).map((item) => item.quote_id).filter(Boolean))];

  let quoteId: string | null = null;
  let applicationId: string | null = null;
  let quoteClientId: string | null = null;
  if (quoteIds.length === 1) {
    quoteId = quoteIds[0] ?? null;
    const { data: quote, error: quoteErr } = await supabase
      .from('quotes')
      .select('application_id, client_id')
      .eq('id', quoteId!)
      .maybeSingle();
    if (quoteErr) return { error: quoteErr.message, closed: [] };
    applicationId = quote?.application_id ?? null;
    quoteClientId = quote?.client_id ?? null;
  }

  return closeLinkedPlacements(
    supabase,
    {
      dogId,
      clientId: dog?.owner_id ?? quoteClientId,
      applicationId,
      quoteId,
    },
    note,
    user?.id ?? null,
  );
}

export async function closeEntryPlacement(
  entryId: string,
  note: string,
  dogId?: string | null,
): Promise<{ error: string | null; closed: string[] }> {
  if (!supabase) return { error: null, closed: [] };
  const user = await getCachedUser();
  return closeLinkedPlacements(
    supabase,
    { entryId, dogId: dogId ?? null },
    note,
    user?.id ?? null,
  );
}

/** Distinct balance invoice, paid in full. A deposit that shares the invoice is left open. */
export async function closeSettledBalance(invoiceId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };
  const user = await getCachedUser();
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('amount_outstanding')
    .eq('id', invoiceId)
    .maybeSingle();
  if (invErr) return { error: invErr.message };
  const outstanding = Number(invoice?.amount_outstanding ?? 0);

  const { data: rows, error } = await supabase
    .from('waiting_list')
    .select('id, pipeline_stage, balance_invoice_id, deposit_invoice_id')
    .eq('balance_invoice_id', invoiceId);
  if (error) return { error: error.message };

  const ids = entriesSettledByBalance(rows ?? [], invoiceId, outstanding);
  if (ids.length === 0) return { error: null };
  const patch = handoverClosePatch(
    'Closed because the balance invoice was paid.',
    new Date().toISOString(),
    user?.id ?? null,
  );
  const { error: updErr } = await supabase.from('waiting_list').update(patch as never).in('id', ids);
  return { error: updErr?.message ?? null };
}

import { requireSupabase } from '@/lib/supabase';
import type { Quote } from '@/types/app.types';

export type UnsentDraftOffer = {
  id: string;
  quote_number: string | null;
  updated_at: string;
  line_count: number;
  total: number;
};

export async function findUnsentDraft(input: {
  clientId?: string | null;
  contactId?: string | null;
  applicationId?: string | null;
  excludeId?: string | null;
}): Promise<UnsentDraftOffer | null> {
  if (!input.clientId && !input.contactId && !input.applicationId) return null;
  const supabase = requireSupabase();
  let q = supabase
    .from('quotes')
    .select('id, quote_number, updated_at, total, items:quote_items(id)')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5);
  if (input.applicationId) q = q.eq('application_id', input.applicationId);
  else if (input.clientId) q = q.eq('client_id', input.clientId);
  else if (input.contactId) q = q.eq('contact_id', input.contactId);
  const { data, error } = await q;
  if (error || !data?.length) return null;
  const row = data.find((r) => r.id !== input.excludeId);
  if (!row) return null;
  const items = (row as unknown as { items?: { id: string }[] }).items ?? [];
  return {
    id: row.id,
    quote_number: row.quote_number,
    updated_at: row.updated_at,
    line_count: items.length,
    total: Number(row.total) || 0,
  };
}

export async function loadQuoteDraft(id: string): Promise<Quote | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, client_id, contact_id, historical_client_name, application_id, status, discount, total, notes, valid_until, delivery_decision, delivery_note, items:quote_items(*)',
    )
    .eq('id', id)
    .eq('status', 'draft')
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Quote;
}

export async function cancelDraftIfStillDraft(id: string): Promise<void> {
  const supabase = requireSupabase();
  await supabase
    .from('quotes')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('status', 'draft');
}

import { requireSupabase } from '@/lib/supabase';

export type QuoteContactLinks = {
  clientId: string | null;
  contactId: string | null;
  historicalName: string | null;
};

export type QuoteContactHint = 'portal' | 'contact' | 'new';

async function findActiveContactByEmail(email: string): Promise<{
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
} | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contacts_active' as 'contacts')
    .select('id, user_id, full_name, email, phone')
    .ilike('email', needle.replace(/[%_]/g, ''))
    .limit(8);
  if (error) throw new Error(error.message);
  const match = (data ?? []).find((c) => (c.email ?? '').trim().toLowerCase() === needle);
  if (!match) return null;
  return {
    id: match.id,
    user_id: match.user_id,
    full_name: match.full_name,
    phone: match.phone,
  };
}

async function resolvePortalUserId(email: string): Promise<string | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('resolve_confirmed_user_id' as never, {
    p_email: email.trim().toLowerCase(),
  } as never);
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function lookupQuoteContactHint(email: string): Promise<QuoteContactHint> {
  const needle = email.trim().toLowerCase();
  if (!needle || !needle.includes('@')) return 'new';
  const portalId = await resolvePortalUserId(needle);
  if (portalId) return 'portal';
  const existing = await findActiveContactByEmail(needle);
  return existing ? 'contact' : 'new';
}

export async function searchContactsForQuote(query: string): Promise<
  { id: string; full_name: string; email: string | null; phone: string | null; user_id: string | null }[]
> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = requireSupabase();
  const safe = q.replace(/[%_,]/g, '');
  const { data, error } = await supabase
    .from('contacts_active' as 'contacts')
    .select('id, full_name, email, phone, user_id, updated_at')
    .or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
    .order('updated_at', { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    user_id: c.user_id,
  }));
}

/**
 * Create-or-find a contacts row on lower(trim(email)). Never writes
 * historical_client_name. If the email belongs to a users row, clientId is set.
 */
export async function findOrCreateQuoteContact(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  existingContactId?: string | null;
}): Promise<QuoteContactLinks> {
  const name = input.name.trim();
  if (!name) throw new Error('Enter a name for a buyer who is not in the list.');
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const supabase = requireSupabase();

  if (email) {
    const existing = await findActiveContactByEmail(email);
    const portalId = await resolvePortalUserId(email);
    if (existing) {
      const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
      if (!existing.phone && phone) patch.phone = phone;
      await supabase.from('contacts').update(patch as never).eq('id', existing.id);
      return {
        clientId: portalId ?? existing.user_id,
        contactId: existing.id,
        historicalName: null,
      };
    }
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        full_name: name,
        email,
        phone,
        contact_type: 'prospect',
        source: 'manual',
        first_contact_date: new Date().toISOString(),
        user_id: portalId,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not create contact.');
    return { clientId: portalId, contactId: data.id, historicalName: null };
  }

  if (input.existingContactId) {
    const patch: Record<string, string | null> = {
      full_name: name,
      updated_at: new Date().toISOString(),
    };
    if (phone) patch.phone = phone;
    await supabase.from('contacts').update(patch as never).eq('id', input.existingContactId);
    return { clientId: null, contactId: input.existingContactId, historicalName: null };
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: name,
      email: null,
      phone,
      contact_type: 'prospect',
      source: 'manual',
      first_contact_date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create contact.');
  return { clientId: null, contactId: data.id, historicalName: null };
}

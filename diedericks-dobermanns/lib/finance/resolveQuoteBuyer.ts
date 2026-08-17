import { requireSupabase } from '@/lib/supabase';

export type QuoteBuyerLinks = {
  clientId: string | null;
  contactId: string | null;
  historicalName: string | null;
};

async function findActiveContactIdByEmail(email: string): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contacts_active' as 'contacts')
    .select('id, email')
    .ilike('email', needle.replace(/[%_]/g, ''))
    .limit(5);
  if (error) throw new Error(error.message);
  const match = (data ?? []).find((c) => (c.email ?? '').trim().toLowerCase() === needle);
  return match?.id ?? null;
}

export async function findOrCreateContactFromApplication(applicationId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data: app, error } = await supabase
    .from('applications')
    .select('full_name, email, phone, country')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app?.email?.trim()) {
    throw new Error('This application has no email, so a contact cannot be created.');
  }

  const existing = await findActiveContactIdByEmail(app.email);
  if (existing) return existing;

  const { data, error: insertErr } = await supabase
    .from('contacts')
    .insert({
      full_name: app.full_name,
      email: app.email.trim(),
      phone: app.phone?.trim() || null,
      country: app.country?.trim() || null,
      contact_type: 'prospect',
      source: 'enquiry',
      first_contact_date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertErr || !data) throw new Error(insertErr?.message ?? 'Could not create contact.');
  return data.id;
}

/**
 * Live buyer → confirmed account, else a contacts row. Never a typed name.
 * Walk-in names are only for the explicit "not in the list" path.
 */
export async function resolveQuoteBuyer(input: {
  kind: 'applicant' | 'user' | 'contact' | 'walkin';
  id?: string | null;
  applicationId?: string | null;
  walkinName?: string | null;
}): Promise<QuoteBuyerLinks> {
  const supabase = requireSupabase();
  if (input.kind === 'walkin') {
    const name = input.walkinName?.trim() || null;
    if (!name) throw new Error('Enter a name for a buyer who is not in the list.');
    return { clientId: null, contactId: null, historicalName: name };
  }

  if (input.kind === 'user' && input.id) {
    return { clientId: input.id, contactId: null, historicalName: null };
  }

  if (input.kind === 'contact' && input.id) {
    return { clientId: null, contactId: input.id, historicalName: null };
  }

  const applicationId =
    input.kind === 'applicant' ? input.id || input.applicationId : input.applicationId;
  if (!applicationId) {
    throw new Error('Select a buyer, or mark them as not in the list.');
  }

  const { data: app, error } = await supabase
    .from('applications')
    .select('id, email, full_name, user_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error('Application not found.');

  let clientId = app.user_id ?? null;
  if (!clientId && app.email?.trim()) {
    const { data: resolved, error: resolveErr } = await supabase.rpc(
      'resolve_confirmed_user_id' as never,
      { p_email: app.email.trim().toLowerCase() } as never,
    );
    if (resolveErr) throw new Error(resolveErr.message);
    clientId = (resolved as string | null) ?? null;
    if (clientId && !app.user_id) {
      await supabase
        .from('applications')
        .update({ user_id: clientId })
        .eq('id', applicationId)
        .is('user_id', null);
    }
  }

  if (clientId) return { clientId, contactId: null, historicalName: null };

  const contactId = await findOrCreateContactFromApplication(applicationId);
  return { clientId: null, contactId, historicalName: null };
}

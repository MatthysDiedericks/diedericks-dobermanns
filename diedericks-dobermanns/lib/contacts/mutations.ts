import { requireSupabase } from '@/lib/supabase';
import type { TablesUpdate } from '@/types/database.types';
import type { ContactInput } from '@/types/phase10';

export async function createContact(input: ContactInput): Promise<string> {
  const supabase = requireSupabase();
  const marketing = input.marketing_opt_in ?? false;
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      whatsapp_number: input.whatsapp_number?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      company: input.company?.trim() || null,
      id_number: input.id_number?.trim() || null,
      contact_type: input.contact_type,
      tags: input.tags ?? [],
      marketing_opt_in: marketing,
      popia_consent: input.popia_consent ?? marketing,
      popia_consent_date: marketing ? new Date().toISOString() : null,
      notes: input.notes?.trim() || null,
      source: input.source ?? 'manual',
      first_contact_date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateContact(id: string, input: Partial<ContactInput>): Promise<void> {
  const supabase = requireSupabase();
  const { data: existing } = await supabase.from('contacts').select('user_id').eq('id', id).maybeSingle();
  const patch: TablesUpdate<'contacts'> = { updated_at: new Date().toISOString() };
  if (input.full_name != null) patch.full_name = input.full_name.trim();
  if (input.email !== undefined) patch.email = input.email?.trim() || null;
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.whatsapp_number !== undefined) patch.whatsapp_number = input.whatsapp_number?.trim() || null;
  if (input.address !== undefined) patch.address = input.address?.trim() || null;
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  if (input.country !== undefined) patch.country = input.country?.trim() || null;
  if (input.company !== undefined) patch.company = input.company?.trim() || null;
  if (input.id_number !== undefined) patch.id_number = input.id_number?.trim() || null;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.source !== undefined) patch.source = input.source;
  if (input.contact_type !== undefined && !existing?.user_id) {
    patch.contact_type = input.contact_type;
  }
  if (input.marketing_opt_in !== undefined) {
    patch.marketing_opt_in = input.marketing_opt_in;
    patch.popia_consent = input.popia_consent ?? input.marketing_opt_in;
    patch.popia_consent_date = input.marketing_opt_in ? new Date().toISOString() : null;
  }
  const { error } = await supabase.from('contacts').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

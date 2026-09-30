import { getCachedUser } from '@/lib/auth/getCachedUser';
import {
  buyerLinkPatch,
  identityLinkAudit,
  invoiceContactLinkPatch,
  invoiceDogLinkPatch,
  paymentGapReviewWrite,
  type PaymentGapResolution,
} from '@/lib/clients/clientRecord';
import { requireSupabase } from '@/lib/supabase';

function safeTerm(value: string): string {
  return value.replace(/[%_,()*]/g, ' ').trim();
}

async function actorId(): Promise<string> {
  const user = await getCachedUser();
  if (!user) throw new Error('Sign in again before changing a link.');
  return user.id;
}

async function writeAudit(row: ReturnType<typeof identityLinkAudit>): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('audit_log').insert({
    table_name: row.table_name,
    record_id: row.record_id,
    action: row.action,
    actor_id: row.actor_id,
    changed_fields: row.changed_fields,
    old_values: row.old_values,
    new_values: row.new_values,
  });
  if (error) throw new Error(`The link was saved, but the audit row failed: ${error.message}`);
}

export async function searchDogsForLink(query: string) {
  const term = safeTerm(query);
  if (term.length < 2) return [];
  const supabase = requireSupabase();
  const pattern = `%${term}%`;
  const { data, error } = await supabase
    .from('dogs')
    .select('id, name, call_name, new_owner_name')
    .or(`name.ilike.${pattern},call_name.ilike.${pattern},new_owner_name.ilike.${pattern}`)
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((dog: { id: string; name: string; call_name: string | null; new_owner_name: string | null }) => ({
    id: dog.id,
    name: dog.call_name?.trim() || dog.name,
    ownerName: dog.new_owner_name,
  }));
}

export async function searchContactsForLink(query: string) {
  const term = safeTerm(query);
  if (term.length < 2) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contacts')
    .select('id, full_name')
    .ilike('full_name', `%${term}%`)
    .order('full_name')
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((contact: { id: string; full_name: string }) => ({
    id: contact.id,
    fullName: contact.full_name,
  }));
}

export async function linkInvoiceToDog(input: {
  invoiceId: string;
  dogId: string | null;
  confirmed: boolean;
}): Promise<void> {
  const patch = invoiceDogLinkPatch({ confirmed: input.confirmed, dogId: input.dogId });
  if ('error' in patch) throw new Error(patch.error);
  const userId = await actorId();
  const supabase = requireSupabase();
  const { data: existing, error: loadError } = await supabase
    .from('invoices')
    .select('id, dog_id')
    .eq('id', input.invoiceId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing) throw new Error('Invoice not found.');
  const { error } = await supabase.from('invoices').update({ dog_id: patch.dog_id }).eq('id', input.invoiceId);
  if (error) throw new Error(error.message);
  await writeAudit(
    identityLinkAudit({
      table: 'invoices',
      recordId: input.invoiceId,
      field: 'dog_id',
      before: existing.dog_id ?? null,
      after: patch.dog_id,
      actorId: userId,
    }),
  );
}

export async function linkInvoiceToContact(input: {
  invoiceId: string;
  contactId: string | null;
  confirmed: boolean;
}): Promise<void> {
  const patch = invoiceContactLinkPatch({ confirmed: input.confirmed, contactId: input.contactId });
  if ('error' in patch) throw new Error(patch.error);
  const userId = await actorId();
  const supabase = requireSupabase();
  const { data: existing, error: loadError } = await supabase
    .from('invoices')
    .select('id, contact_id')
    .eq('id', input.invoiceId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing) throw new Error('Invoice not found.');
  if (patch.contact_id) {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', patch.contact_id)
      .maybeSingle();
    if (contactError) throw new Error(contactError.message);
    if (!contact) throw new Error('Contact not found. Search the existing contacts before creating one.');
  }
  const { error } = await supabase
    .from('invoices')
    .update({ contact_id: patch.contact_id })
    .eq('id', input.invoiceId);
  if (error) {
    if (/contact_id/i.test(error.message)) {
      throw new Error(
        'The contact link column is not in the database yet. Apply migration 0199, then confirm again. Nothing else was changed.',
      );
    }
    throw new Error(error.message);
  }
  await writeAudit(
    identityLinkAudit({
      table: 'invoices',
      recordId: input.invoiceId,
      field: 'contact_id',
      before: existing.contact_id ?? null,
      after: patch.contact_id,
      actorId: userId,
    }),
  );
}

export async function confirmDogBuyer(input: {
  dogId: string;
  contactId: string;
  confirmed: boolean;
  alsoCurrentOwner: boolean;
}): Promise<void> {
  const patch = buyerLinkPatch(input);
  if ('error' in patch) throw new Error(patch.error);
  const userId = await actorId();
  const supabase = requireSupabase();
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .select('id, buyer_contact_id, owner_contact_id')
    .eq('id', input.dogId)
    .maybeSingle();
  if (dogError) throw new Error(dogError.message);
  if (!dog) throw new Error('Dog not found.');
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', patch.buyer_contact_id)
    .maybeSingle();
  if (contactError) throw new Error(contactError.message);
  if (!contact) throw new Error('Contact not found. Search the existing contacts before creating one.');
  const { error } = await supabase.from('dogs').update(patch).eq('id', dog.id);
  if (error) throw new Error(error.message);
  await writeAudit(
    identityLinkAudit({
      table: 'dogs',
      recordId: dog.id,
      field: 'buyer_contact_id',
      before: dog.buyer_contact_id ?? null,
      after: patch.buyer_contact_id,
      actorId: userId,
    }),
  );
  if (patch.owner_contact_id) {
    await writeAudit(
      identityLinkAudit({
        table: 'dogs',
        recordId: dog.id,
        field: 'owner_contact_id',
        before: dog.owner_contact_id ?? null,
        after: patch.owner_contact_id,
        actorId: userId,
      }),
    );
  }
}

export async function savePaymentGapExplanation(input: {
  invoiceId: string;
  note: string;
  resolution: PaymentGapResolution;
}): Promise<void> {
  const write = paymentGapReviewWrite(input);
  if ('error' in write) throw new Error(write.error);
  const userId = await actorId();
  const supabase = requireSupabase();
  const { error } = await supabase.from('invoice_payment_gap_reviews').upsert({
    invoice_id: input.invoiceId,
    resolution: write.resolution,
    note: write.note,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  });
  if (error) {
    if (/invoice_payment_gap_reviews/i.test(error.message)) {
      throw new Error(
        'The explanation log is not in the database yet. Apply migration 0199, then save again. The amount paid was not changed.',
      );
    }
    throw new Error(error.message);
  }
}

import { signingUrl } from '@/lib/contracts/signingLink';
import { requireSupabase } from '@/lib/supabase';

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function merge(body: string, tokens: Record<string, string>): string {
  return body.replace(TOKEN_RE, (_m, key: string) => {
    const value = tokens[key];
    return value == null || value === '' ? `{{${key}}}` : value;
  });
}

type CreateDraftInput = {
  dogId: string;
  litterId?: string | null;
  contactId?: string | null;
  actorId: string;
};

/** Draft only. Nothing is emailed. Body editing is website-only. */
export async function createDraftContract(input: CreateDraftInput): Promise<{
  contractId?: string;
  skipped?: boolean;
  error?: string;
}> {
  const supabase = requireSupabase();
  const { data: dog, error: dErr } = await supabase
    .from('dogs')
    .select(
      'id, name, sex, colour, date_of_birth, microchip_number, registration_number, programme_tier, litter_id, father_id, mother_id, owner_contact_id, owner_id, reserved_for_name, price, litter:litter_id(name, litter_letter)',
    )
    .eq('id', input.dogId)
    .maybeSingle();
  if (dErr) return { error: dErr.message };
  if (!dog) return { error: 'Dog not found.' };
  const tier = dog.programme_tier;
  if (!tier) return { error: 'Set programme_tier on this dog first.' };

  const contactId = input.contactId ?? dog.owner_contact_id;
  let contact: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    user_id: string | null;
  } | null = null;
  if (contactId) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, address, user_id')
      .eq('id', contactId)
      .maybeSingle();
    contact = data;
  }
  if (!contact && dog.reserved_for_name) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, address, user_id')
      .ilike('full_name', dog.reserved_for_name)
      .is('merged_into_contact_id', null)
      .limit(1)
      .maybeSingle();
    contact = data;
  }
  if (!contact) return { error: 'No buyer contact on this dog.' };

  const { data: existing } = await supabase
    .from('contracts')
    .select('id, parent_contract_id')
    .eq('dog_id', input.dogId)
    .eq('contact_id' as never, contact.id)
    .neq('status', 'void');
  const main = (existing ?? []).find((r) => !r.parent_contract_id);
  if (main) return { skipped: true, contractId: main.id };

  const { data: templates, error: tErr } = await supabase
    .from('contract_templates')
    .select('id, name, contract_title, body_html, version, programme_tier, is_addendum, is_active')
    .eq('is_active', true);
  if (tErr) return { error: tErr.message };
  const rows = templates ?? [];
  const puppyMain = rows.find((t) => !t.is_addendum && (t.programme_tier == null || t.programme_tier === 'puppy'));
  const protection = rows.find((t) => !t.is_addendum && t.programme_tier === 'protection_dog');
  const tmpl = tier === 'protection_dog' ? protection ?? puppyMain : puppyMain;
  if (!tmpl) return { error: 'No active sale template.' };

  let fatherName = '';
  let motherName = '';
  const parentIds = [dog.father_id, dog.mother_id].filter(Boolean) as string[];
  if (parentIds.length) {
    const { data: parents } = await supabase.from('dogs').select('id, name').in('id', parentIds);
    fatherName = parents?.find((p) => p.id === dog.father_id)?.name ?? '';
    motherName = parents?.find((p) => p.id === dog.mother_id)?.name ?? '';
  }
  const litter = dog.litter as { name: string | null; litter_letter: string | null } | null;
  const body = merge(tmpl.body_html, {
    buyer_full_name: contact.full_name ?? 'Buyer',
    buyer_email: contact.email ?? '',
    buyer_phone: contact.phone ?? '',
    buyer_address: contact.address ?? '',
    buyer_id_number: '',
    dog_name: dog.name,
    dog_sex: dog.sex ?? '',
    dog_colour: dog.colour ?? '',
    dog_dob: dog.date_of_birth ?? '',
    dog_microchip: dog.microchip_number ?? '',
    dog_registration: dog.registration_number ?? '',
    sire_name: fatherName,
    dam_name: motherName,
    litter_name: litter?.name ?? litter?.litter_letter ?? '',
    purchase_price: dog.price != null ? `R${Number(dog.price).toFixed(2)}` : '',
    amount_paid: '',
    payment_date: '',
    programme_tier: tier,
    quote_number: '—',
    invoice_number: '—',
    template_version: String(tmpl.version ?? 1),
    generated_at: new Date().toISOString().slice(0, 10),
    breeder_signature: 'Matthys Diedericks',
    buyer_signature: 'Pending electronic acceptance',
  });

  const now = new Date().toISOString();
  const { data: created, error: cErr } = await supabase
    .from('contracts')
    .insert({
      client_id: contact.user_id,
      contact_id: contact.id,
      dog_id: input.dogId,
      litter_id: input.litterId ?? dog.litter_id,
      template_id: tmpl.id,
      contract_title: tmpl.contract_title,
      body_html: body,
      document_url: '',
      status: 'draft',
      signed_by_client: false,
      signed_by_breeder: true,
      breeder_signed_at: now,
      template_version: tmpl.version ?? 1,
    } as never)
    .select('id')
    .single();
  if (cErr) return { error: cErr.message };

  await supabase.from('contract_events' as never).insert({
    contract_id: created.id,
    event_type: 'created',
    actor_id: input.actorId,
    actor_label: 'Admin (app)',
  } as never);

  return { contractId: created.id };
}

export async function sendContractLink(contractId: string): Promise<{
  error: string | null;
  link?: string;
  expiresAt?: string;
}> {
  const supabase = requireSupabase();
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'sent',
      esign_token: token,
      esign_sent_at: new Date().toISOString(),
      esign_expires_at: expires,
      body_snapshot_at: new Date().toISOString(),
    } as never)
    .eq('id', contractId);
  if (error) return { error: error.message };
  return { error: null, link: signingUrl(token), expiresAt: expires };
}

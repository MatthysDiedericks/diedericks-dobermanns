import { sendBlockMessage } from '@/lib/contracts/contractReadiness';
import { createSaleContract } from '@/lib/contracts/createSale';
import { recordContractEvent } from '@/lib/contracts/events';
import { signingUrl } from '@/lib/contracts/signingLink';
import { requireSupabase } from '@/lib/supabase';

const ESIGN_TTL_DAYS = 30;

type CreateDraftInput = {
  dogId: string;
  litterId?: string | null;
  contactId?: string | null;
  actorId: string;
};

/** Draft only via createSaleContract — never a second merge path. */
export async function createDraftContract(input: CreateDraftInput): Promise<{
  contractId?: string;
  skipped?: boolean;
  error?: string;
}> {
  return createSaleContract({
    dogId: input.dogId,
    contactId: input.contactId,
    actorId: input.actorId,
    actorLabel: 'Admin (app)',
  });
}

export async function sendContractLink(contractId: string): Promise<{
  error: string | null;
  link?: string;
  expiresAt?: string;
}> {
  const supabase = requireSupabase();
  const { data, error: loadErr } = await supabase
    .from('contracts')
    .select(
      'id, body_html, dog_id, client_id, contact_id, status, signed_by_client, parent_contract_id, template_id, esign_token, esign_expires_at',
    )
    .eq('id', contractId)
    .maybeSingle();
  if (loadErr) return { error: loadErr.message };
  if (!data) return { error: 'Contract not found.' };
  if (data.signed_by_client) return { error: 'Already accepted — nothing to send.' };
  if (data.status === 'void') return { error: 'Cannot send a voided agreement.' };
  if (data.parent_contract_id && data.template_id) {
    const { data: tmpl } = await supabase
      .from('contract_templates')
      .select('is_addendum')
      .eq('id', data.template_id)
      .maybeSingle();
    if (tmpl?.is_addendum) return { error: 'Send the main agreement, not the addendum.' };
  }

  const blocked = sendBlockMessage({
    body_html: data.body_html,
    dog_id: data.dog_id,
    client_id: data.client_id,
    contact_id: data.contact_id,
  });
  if (blocked) return { error: blocked };

  const now = new Date().toISOString();
  const token =
    data.esign_token ||
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const expires =
    data.esign_expires_at && new Date(data.esign_expires_at) > new Date()
      ? data.esign_expires_at
      : new Date(Date.now() + ESIGN_TTL_DAYS * 86_400_000).toISOString();

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'sent',
      esign_token: token,
      esign_sent_at: now,
      esign_expires_at: expires,
      body_snapshot_at: now,
    } as never)
    .eq('id', contractId);
  if (error) return { error: error.message };

  const { data: kids } = await supabase
    .from('contracts')
    .select('id, template:contract_templates(is_addendum)')
    .eq('parent_contract_id', contractId);
  const addendumIds = (
    (kids ?? []) as unknown as { id: string; template?: { is_addendum: boolean | null } }[]
  )
    .filter((k) => k.template?.is_addendum)
    .map((k) => k.id);
  if (addendumIds.length) {
    await supabase
      .from('contracts')
      .update({ status: 'sent', body_snapshot_at: now } as never)
      .in('id', addendumIds);
  }

  await recordContractEvent({
    contractId,
    eventType: 'sent',
    actorId: null,
    actorLabel: 'Admin (app)',
    detail: { esign_expires_at: expires },
  });

  return { error: null, link: signingUrl(token), expiresAt: expires };
}

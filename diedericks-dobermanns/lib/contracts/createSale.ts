import { recordContractEvent } from '@/lib/contracts/events';
import { insertEliteAddendum } from '@/lib/contracts/insertAddendum';
import { replaceToken } from '@/lib/contracts/merge';
import { renderSaleContract } from '@/lib/contracts/renderSaleContract';
import { requireSupabase } from '@/lib/supabase';

export { resolveSalePurchasePrice } from '@/lib/contracts/salePrice';

export type CreateSaleInput = {
  dogId: string;
  actorId: string;
  actorLabel: string;
  contactId?: string | null;
  templateId?: string | null;
  quoteId?: string | null;
  invoiceId?: string | null;
};

export type CreateSaleResult = {
  contractId?: string;
  contractNumber?: string | null;
  addendumNumber?: string | null;
  purchasePrice?: number | null;
  skipped?: boolean;
  error?: string;
};

/** Creates a draft sale agreement. Never emails. Matt presses send. */
export async function createSaleContract(input: CreateSaleInput): Promise<CreateSaleResult> {
  const rendered = await renderSaleContract({
    dogId: input.dogId,
    contactId: input.contactId,
    quoteId: input.quoteId,
    invoiceId: input.invoiceId,
    templateId: input.templateId,
  });
  if (!rendered.ok) return { error: rendered.error };
  const { party, bodyHtml, tokens, mainTemplate, addendumTemplate, litterId, purchasePrice } =
    rendered.value;

  const supabase = requireSupabase();
  const { data: existing } = await supabase
    .from('contracts')
    .select('id, parent_contract_id, status')
    .eq('dog_id', input.dogId)
    .eq('contact_id', party.contactId)
    .neq('status', 'void');
  const mains = (existing ?? []).filter((r) => !r.parent_contract_id);
  if (mains[0]) return { skipped: true, contractId: mains[0].id };

  const quoteId = input.quoteId ?? rendered.value.quoteId ?? party.quoteId;
  const invoiceId = input.invoiceId ?? rendered.value.invoiceId ?? party.invoiceId;
  const now = new Date().toISOString();

  const { data: created, error: cErr } = await supabase
    .from('contracts')
    .insert({
      client_id: party.clientId,
      contact_id: party.contactId,
      dog_id: input.dogId,
      litter_id: litterId,
      template_id: mainTemplate.id,
      contract_title: mainTemplate.contract_title,
      body_html: bodyHtml,
      document_url: '',
      status: 'draft',
      signed_by_client: false,
      signed_by_breeder: true,
      breeder_signed_at: now,
      template_version: mainTemplate.version ?? 1,
      quote_id: quoteId,
      invoice_id: invoiceId,
    } as never)
    .select('id, contract_number')
    .single();
  if (cErr) return { error: cErr.message };

  const contractId = created.id;
  const contractNumber = created.contract_number ?? null;
  let filled = bodyHtml;
  if (contractNumber) {
    filled = replaceToken(
      replaceToken(bodyHtml, 'contract_number', contractNumber),
      'contract_reference',
      contractNumber,
    );
  }
  await supabase
    .from('contracts')
    .update({
      body_html: filled,
      document_url: `/portal/contracts/${contractId}`,
    } as never)
    .eq('id', contractId);

  await recordContractEvent({
    contractId,
    eventType: 'created',
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    detail: { contact_id: party.contactId, quote_id: quoteId, invoice_id: invoiceId },
  });

  let addendumNumber: string | null = null;
  if (addendumTemplate && contractNumber) {
    addendumNumber = await insertEliteAddendum({
      addendum: addendumTemplate,
      baseTokens: tokens,
      contractNumber,
      parentContractId: contractId,
      clientId: party.clientId,
      contactId: party.contactId,
      dogId: input.dogId,
      litterId,
      quoteId,
      invoiceId,
      actorId: input.actorId,
      actorLabel: input.actorLabel,
      now,
    });
  }

  return { contractId, contractNumber, addendumNumber, purchasePrice };
}

export async function bulkCreateLitterContracts(
  litterId: string,
  actorId: string,
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = requireSupabase();
  const { data: puppies, error } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('litter_id', litterId)
    .is('deceased_at', null)
    .order('birth_order', { ascending: true, nullsFirst: false });
  if (error) return { created: 0, skipped: 0, errors: [error.message] };

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const pup of puppies ?? []) {
    const result = await createSaleContract({
      dogId: pup.id,
      actorId,
      actorLabel: 'Admin (litter bulk)',
    });
    if (result.skipped) skipped += 1;
    else if (result.contractId) created += 1;
    else errors.push(`${pup.name}: ${result.error ?? 'failed'}`);
  }
  return { created, skipped, errors };
}

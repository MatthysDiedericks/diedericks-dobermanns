import { recordContractEvent } from '@/lib/contracts/events';
import { mergeContractBody, type ContractTokenMap } from '@/lib/contracts/merge';
import type { ContractTemplateRow } from '@/lib/contracts/resolveTemplates';
import { requireSupabase } from '@/lib/supabase';

/** Snapshot Addendum A under the parent agreement (inherits DD-AGR-…-A via trigger). */
export async function insertEliteAddendum(input: {
  addendum: ContractTemplateRow;
  baseTokens: ContractTokenMap;
  contractNumber: string;
  parentContractId: string;
  clientId: string | null;
  contactId: string | null;
  dogId: string;
  litterId: string | null;
  quoteId: string | null;
  invoiceId: string | null;
  actorId: string;
  actorLabel: string;
  now: string;
}): Promise<string | null> {
  const supabase = requireSupabase();
  const addBody = mergeContractBody(input.addendum.body_html, {
    ...input.baseTokens,
    contract_number: input.contractNumber,
    contract_reference: input.contractNumber,
    template_version: String(input.addendum.version ?? 1),
  });

  const { data: addRow, error: aErr } = await supabase
    .from('contracts')
    .insert({
      client_id: input.clientId,
      contact_id: input.contactId,
      dog_id: input.dogId,
      litter_id: input.litterId,
      template_id: input.addendum.id,
      contract_title: input.addendum.contract_title,
      body_html: addBody,
      document_url: `/portal/contracts/${input.parentContractId}`,
      status: 'draft',
      signed_by_client: false,
      signed_by_breeder: true,
      breeder_signed_at: input.now,
      parent_contract_id: input.parentContractId,
      template_version: input.addendum.version ?? 1,
      quote_id: input.quoteId,
      invoice_id: input.invoiceId,
    } as never)
    .select('id, contract_number')
    .single();
  if (aErr) {
    console.error('[contracts] addendum insert:', aErr.message);
    return null;
  }
  if (!addRow) return null;
  const addId = addRow.id;
  await recordContractEvent({
    contractId: addId,
    eventType: 'created',
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    detail: { parent_contract_id: input.parentContractId, contract_number: addRow.contract_number },
  });
  return addRow.contract_number ?? addId;
}

import {
  companyProfileFromSettings,
  loadContractSettings,
} from '@/lib/contracts/companySettings';
import { findSaleQuoteInvoice } from '@/lib/contracts/findSaleQuote';
import { mergeContractBody, replaceToken, type ContractTokenMap } from '@/lib/contracts/merge';
import { resolveBuyerForDog, type ResolvedBuyer } from '@/lib/contracts/resolveBuyer';
import { resolveSaleTemplates, type ContractTemplateRow } from '@/lib/contracts/resolveTemplates';
import { resolveSalePurchasePrice } from '@/lib/contracts/salePrice';
import { buildSaleContractTokens } from '@/lib/contracts/tokens';
import { requireSupabase } from '@/lib/supabase';

export type SaleRenderResult = {
  bodyHtml: string;
  tokens: ContractTokenMap;
  purchasePrice: number | null;
  quoteId: string | null;
  invoiceId: string | null;
  party: ResolvedBuyer;
  programmeTier: string;
  litterId: string | null;
  mainTemplate: ContractTemplateRow;
  addendumTemplate: ContractTemplateRow | null;
};

async function enrichIdFromQuote(quoteId: string | null, party: ResolvedBuyer): Promise<ResolvedBuyer> {
  if (!quoteId || party.buyer.id_number) return party;
  const supabase = requireSupabase();
  const { data: quote } = await supabase
    .from('quotes')
    .select('application_id')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote?.application_id) return party;
  const { data: app } = await supabase
    .from('applications')
    .select('id_number, address, city, country')
    .eq('id', quote.application_id)
    .maybeSingle();
  if (!app?.id_number) return party;
  return {
    ...party,
    buyer: {
      ...party.buyer,
      id_number: app.id_number,
      address:
        party.buyer.address ??
        ([app.address, app.city, app.country].filter(Boolean).join(', ') || null),
    },
  };
}

/** Same merge createSaleContract uses. Regenerating must call this, not a second path. */
export async function renderSaleContract(input: {
  dogId: string;
  contactId?: string | null;
  quoteId?: string | null;
  invoiceId?: string | null;
  templateId?: string | null;
  contractNumber?: string | null;
}): Promise<{ ok: true; value: SaleRenderResult } | { ok: false; error: string }> {
  const resolved = await resolveBuyerForDog(input.dogId, input.contactId);
  if (resolved.error || !resolved.buyer) return { ok: false, error: resolved.error ?? 'No buyer.' };
  let party = resolved.buyer;

  const supabase = requireSupabase();
  const { data: dog, error: dErr } = await supabase
    .from('dogs')
    .select(
      `id, name, sex, colour, date_of_birth, microchip_number, registration_number,
       programme_tier, litter_id, father_id, mother_id, price,
       litter:litter_id(name, litter_letter)`,
    )
    .eq('id', input.dogId)
    .maybeSingle();
  if (dErr) return { ok: false, error: dErr.message };
  if (!dog) return { ok: false, error: 'Dog not found.' };

  const programmeTier = dog.programme_tier ?? null;
  if (!programmeTier) {
    return {
      ok: false,
      error:
        'This dog has no programme tier set. Set programme_tier (puppy / elite_developed / protection_dog), then try again.',
    };
  }

  const settingsLoaded = await loadContractSettings();
  if ('error' in settingsLoaded) return { ok: false, error: settingsLoaded.error };
  const { settings, breedingPenalty } = settingsLoaded;
  const company = companyProfileFromSettings(settings);

  const templates = await resolveSaleTemplates(programmeTier, input.templateId);
  if (templates.error || !templates.main) return { ok: false, error: templates.error ?? 'Template missing.' };

  let fatherName: string | null = null;
  let motherName: string | null = null;
  const parentIds = [dog.father_id, dog.mother_id].filter(Boolean) as string[];
  if (parentIds.length) {
    const { data: parents } = await supabase.from('dogs').select('id, name').in('id', parentIds);
    fatherName = parents?.find((p) => p.id === dog.father_id)?.name ?? null;
    motherName = parents?.find((p) => p.id === dog.mother_id)?.name ?? null;
  }
  const litter = dog.litter as { name: string | null; litter_letter: string | null } | null;

  let quoteNumber = '—';
  let invoiceNumber = '—';
  let quote: { quote_number: string; total: number | null } | null = null;
  let invoice: { invoice_number: string | null; total_amount: number | null } | null = null;
  const fromSale = await findSaleQuoteInvoice({
    dogId: input.dogId,
    contactId: party.contactId,
    clientId: party.clientId,
  });
  const quoteId = input.quoteId ?? party.quoteId ?? fromSale.quoteId;
  const invoiceId = input.invoiceId ?? party.invoiceId ?? fromSale.invoiceId;
  party = await enrichIdFromQuote(quoteId, party);

  if (quoteId) {
    const { data } = await supabase
      .from('quotes')
      .select('quote_number, total')
      .eq('id', quoteId)
      .maybeSingle();
    if (data) {
      quote = data;
      quoteNumber = data.quote_number;
    }
  }
  if (invoiceId) {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number, total_amount')
      .eq('id', invoiceId)
      .maybeSingle();
    if (data) {
      invoice = data;
      invoiceNumber = data.invoice_number ?? '—';
    }
  }
  const purchasePrice = resolveSalePurchasePrice(dog.price, quote, invoice);

  const tokens = buildSaleContractTokens({
    company,
    buyer: party.buyer,
    dog: {
      name: dog.name,
      sex: dog.sex,
      colour: dog.colour,
      date_of_birth: dog.date_of_birth,
      microchip_number: dog.microchip_number,
      registration_number: dog.registration_number,
      programme_tier: programmeTier,
      litter_id: dog.litter_id,
      fatherName,
      motherName,
      litterName: litter?.name ?? litter?.litter_letter ?? null,
    },
    quoteNumber,
    invoiceNumber,
    purchasePrice,
    amountPaid: purchasePrice,
    paymentDate: new Date().toISOString().slice(0, 10),
    breedingPenalty,
    templateVersion: templates.main.version ?? 1,
    contractNumber: input.contractNumber ?? undefined,
    contractReference: input.contractNumber ?? undefined,
  });

  let bodyHtml = mergeContractBody(templates.main.body_html, tokens);
  if (input.contractNumber) {
    bodyHtml = replaceToken(
      replaceToken(bodyHtml, 'contract_number', input.contractNumber),
      'contract_reference',
      input.contractNumber,
    );
  }

  return {
    ok: true,
    value: {
      bodyHtml,
      tokens,
      purchasePrice,
      quoteId,
      invoiceId,
      party,
      programmeTier,
      litterId: dog.litter_id,
      mainTemplate: templates.main,
      addendumTemplate: templates.addendum,
    },
  };
}

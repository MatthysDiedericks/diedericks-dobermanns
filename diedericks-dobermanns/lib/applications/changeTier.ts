import type { SupabaseClient } from '@supabase/supabase-js';

import { categoryFromDogInterest } from '@/lib/waitlist/helpers';
import {
  budgetRangeLabel,
  buildTierChangeEmailDraft,
  effectiveTierKey,
  labelForTierKey,
  priceChangeSentence,
  type PricingTierLabel,
} from '@/lib/applications/tierVocab';
import { requireSupabase } from '@/lib/supabase';

export type PublicPricingTier = PricingTierLabel & {
  is_public: boolean;
};

export type StaleQuote = {
  id: string;
  quoteNumber: string;
  sent: boolean;
  inferredTierKey: string | null;
  inferredLabel: string;
};

export type DepositOnFile = {
  amount: number;
  againstLabel: string;
} | null;

export type AllocatedDog = {
  id: string;
  name: string;
  programmeTier: string | null;
};

export type ChangeTierContext = {
  applicationId: string;
  fullName: string;
  email: string;
  referenceCode: string | null;
  budgetRange: string | null;
  agreedTier: string | null;
  appliedForLabel: string;
  currentTierKey: string | null;
  currentLabel: string;
  publicTiers: PublicPricingTier[];
  allTiers: PublicPricingTier[];
  staleQuotes: StaleQuote[];
  deposit: DepositOnFile;
  allocatedDogs: AllocatedDog[];
  waitlistCount: number;
};

export type ChangeTierResult = {
  budgetRangeBefore: string | null;
  budgetRangeAfter: string | null;
  agreedTier: string;
  eventMessage: string;
  draftSubject: string;
  draftBody: string;
  waitlistUpdated: number;
};

type AppRow = {
  id: string;
  full_name: string;
  email: string;
  reference_code: string | null;
  budget_range: string | null;
  agreed_tier: string | null;
  dog_interest: string | null;
  specific_dog_id: string | null;
};

function asTiers(rows: unknown): PublicPricingTier[] {
  return ((rows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    tier_key: String(row.tier_key),
    display_label: String(row.display_label),
    price: Number(row.price ?? 0),
    price_on_request: Boolean(row.price_on_request),
    description: (row.description as string | null) ?? null,
    is_public: Boolean(row.is_public),
  }));
}

function inferQuoteTier(
  items: Array<{ programme_tier?: string | null; unit_price?: number | null }>,
  tiers: PublicPricingTier[],
): string | null {
  const keyed = items.map((it) => it.programme_tier).find((k) => Boolean(k));
  if (keyed) return keyed;
  for (const it of items) {
    const price = it.unit_price;
    if (price == null) continue;
    const match = tiers.find(
      (t) => !t.price_on_request && Math.round(t.price ?? 0) === Math.round(price),
    );
    if (match) return match.tier_key;
  }
  return null;
}

export async function loadChangeTierContext(
  applicationId: string,
  client?: SupabaseClient,
): Promise<{ context?: ChangeTierContext; error?: string }> {
  const supabase = client ?? requireSupabase();
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (appError) return { error: appError.message };
  if (!app) return { error: 'Application not found.' };

  const row = app as AppRow;
  row.agreed_tier = (app as AppRow).agreed_tier ?? null;

  const { data: tierRows, error: tierError } = await supabase
    .from('pricing_tiers')
    .select('tier_key, display_label, price, price_on_request, description, is_public')
    .order('sort_order');
  if (tierError) return { error: tierError.message };
  const allTiers = asTiers(tierRows);
  const publicTiers = allTiers.filter((t) => t.is_public);

  const currentTierKey = effectiveTierKey(row.agreed_tier, row.budget_range);
  const appliedForLabel = budgetRangeLabel(row.budget_range);
  const currentLabel = currentTierKey
    ? labelForTierKey(currentTierKey, allTiers)
    : appliedForLabel;

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, total, sent_at, status')
    .eq('application_id', applicationId);

  const quoteList = (quotes ?? []) as Array<{
    id: string;
    quote_number: string;
    total: number | null;
    sent_at: string | null;
    status: string;
  }>;
  const quoteIds = quoteList.map((q) => q.id);

  let items: Array<{
    quote_id: string;
    programme_tier?: string | null;
    unit_price: number | null;
  }> = [];
  if (quoteIds.length) {
    const { data: itemRows } = await supabase
      .from('quote_items' as never)
      .select('quote_id, unit_price, programme_tier' as never)
      .in('quote_id' as never, quoteIds);
    items = (itemRows ?? []) as unknown as typeof items;
  }

  const staleQuotes: StaleQuote[] = quoteList.map((q) => {
    const qItems = items.filter((it) => it.quote_id === q.id);
    const inferred =
      inferQuoteTier(qItems, allTiers) ??
      inferQuoteTier([{ unit_price: q.total }], allTiers);
    return {
      id: q.id,
      quoteNumber: q.quote_number,
      sent: Boolean(q.sent_at) || q.status === 'sent',
      inferredTierKey: inferred,
      inferredLabel: inferred ? labelForTierKey(inferred, allTiers) : currentLabel,
    };
  });

  const { data: waitRows } = await supabase
    .from('waiting_list')
    .select('id, preferred_category, payment_status, deposit_amount, assigned_dog_id')
    .eq('application_id', applicationId);

  const waitlist = (waitRows ?? []) as Array<{
    id: string;
    preferred_category: string | null;
    payment_status: string | null;
    deposit_amount: number | null;
    assigned_dog_id: string | null;
  }>;

  let invoicePaid = 0;
  if (quoteIds.length) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount_paid')
      .in('quote_id', quoteIds);
    invoicePaid = (invoices ?? []).reduce(
      (sum, inv) => sum + Number((inv as { amount_paid?: number | null }).amount_paid ?? 0),
      0,
    );
  }

  const waitlistDeposit = waitlist
    .filter(
      (w) =>
        w.payment_status === 'deposit_paid' ||
        w.payment_status === 'paid_in_full' ||
        Number(w.deposit_amount ?? 0) > 0,
    )
    .reduce((sum, w) => sum + Number(w.deposit_amount ?? 0), 0);

  const paid = Math.max(waitlistDeposit, invoicePaid);
  const deposit: DepositOnFile =
    paid > 0 ? { amount: paid, againstLabel: currentLabel } : null;

  const dogIds = [
    ...waitlist.map((w) => w.assigned_dog_id),
    row.specific_dog_id,
  ].filter((id): id is string => Boolean(id));

  const { data: reservation } = await supabase
    .from('reservations')
    .select('dog_id')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (reservation?.dog_id) dogIds.push(reservation.dog_id);

  const uniqueDogIds = [...new Set(dogIds)];
  let allocatedDogs: AllocatedDog[] = [];
  if (uniqueDogIds.length) {
    const { data: dogs } = await supabase
      .from('dogs')
      .select('id, name, programme_tier')
      .in('id', uniqueDogIds);
    allocatedDogs = ((dogs ?? []) as Array<{
      id: string;
      name: string;
      programme_tier: string | null;
    }>).map((d) => ({
      id: d.id,
      name: d.name,
      programmeTier: d.programme_tier,
    }));
  }

  return {
    context: {
      applicationId,
      fullName: row.full_name,
      email: row.email,
      referenceCode: row.reference_code,
      budgetRange: row.budget_range,
      agreedTier: row.agreed_tier,
      appliedForLabel,
      currentTierKey,
      currentLabel,
      publicTiers,
      allTiers,
      staleQuotes,
      deposit,
      allocatedDogs,
      waitlistCount: waitlist.length,
    },
  };
}

export async function applyAgreedTierChange(input: {
  applicationId: string;
  newTierKey: string;
  reason: string;
  actorId: string;
}): Promise<{ result?: ChangeTierResult; error?: string }> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { error: 'Write a one-line reason. Six months from now that sentence is the record.' };
  }

  const supabase = requireSupabase();
  const loaded = await loadChangeTierContext(input.applicationId, supabase);
  if (loaded.error || !loaded.context) return { error: loaded.error };

  const ctx = loaded.context;
  const newTier = ctx.allTiers.find((t) => t.tier_key === input.newTierKey);
  if (!newTier) {
    return { error: 'That tier is not on the pricing list. Add it under Settings → Pricing.' };
  }
  if (!newTier.is_public) {
    return { error: 'Pick a public tier from the pricing list.' };
  }
  if (input.newTierKey === ctx.currentTierKey && ctx.agreedTier === input.newTierKey) {
    return { error: 'This application is already on that tier.' };
  }

  const fromLabel = ctx.currentLabel;
  const toLabel = newTier.display_label;
  const now = new Date().toISOString();
  const budgetBefore = ctx.budgetRange;

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      agreed_tier: input.newTierKey,
      agreed_tier_at: now,
      agreed_tier_by: input.actorId,
      agreed_tier_reason: reason,
    } as never)
    .eq('id', input.applicationId);
  if (updateError) return { error: updateError.message };

  const { data: after, error: afterError } = await supabase
    .from('applications')
    .select('budget_range')
    .eq('id', input.applicationId)
    .maybeSingle();
  if (afterError) return { error: afterError.message };
  const budgetAfter = (after as { budget_range: string | null } | null)?.budget_range ?? null;

  const category = categoryFromDogInterest(input.newTierKey);
  const { data: waitUpdated, error: waitError } = await supabase
    .from('waiting_list')
    .update({ preferred_category: category } as never)
    .eq('application_id', input.applicationId)
    .select('id, position');
  if (waitError) {
    console.error('[applyAgreedTierChange] waitlist tier update failed:', waitError.message);
  }

  const eventMessage = `${fromLabel} → ${toLabel}. ${reason}`.slice(0, 500);
  const { error: eventError } = await supabase.from('application_events' as never).insert({
    application_id: input.applicationId,
    event_type: 'tier_changed',
    message: eventMessage,
    created_by: input.actorId,
  } as never);
  if (eventError) console.error('[applyAgreedTierChange] event:', eventError.message);

  const fromTier = ctx.currentTierKey
    ? ctx.allTiers.find((t) => t.tier_key === ctx.currentTierKey) ?? null
    : null;
  const draft = buildTierChangeEmailDraft({
    fullName: ctx.fullName,
    referenceCode: ctx.referenceCode,
    appliedForLabel: ctx.appliedForLabel,
    newLabel: toLabel,
    newDescription: newTier.description ?? null,
    priceSentence: priceChangeSentence(fromTier, newTier),
    hasDeposit: Boolean(ctx.deposit),
  });

  return {
    result: {
      budgetRangeBefore: budgetBefore,
      budgetRangeAfter: budgetAfter,
      agreedTier: input.newTierKey,
      eventMessage,
      draftSubject: draft.subject,
      draftBody: draft.body,
      waitlistUpdated: waitUpdated?.length ?? 0,
    },
  };
}

export function staleQuotesForTier(
  quotes: StaleQuote[],
  newTierKey: string | null,
): StaleQuote[] {
  if (!newTierKey) return quotes;
  return quotes.filter((q) => !q.inferredTierKey || q.inferredTierKey !== newTierKey);
}

export function dogMismatchForTier(
  dogs: AllocatedDog[],
  newTierKey: string | null,
  tiers: PricingTierLabel[],
): { name: string; programmeLabel: string }[] {
  if (!newTierKey) return [];
  return dogs
    .filter((d) => d.programmeTier && d.programmeTier !== newTierKey)
    .map((d) => ({
      name: d.name,
      programmeLabel: labelForTierKey(d.programmeTier, tiers),
    }));
}

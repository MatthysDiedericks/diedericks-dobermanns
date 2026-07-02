import { callNotify } from '@/lib/functions';
import { supabase } from '@/lib/supabase';
import { categoryFromDogInterest } from '@/lib/waitlist/helpers';
import type { Application, WaitingListEntry } from '@/types/app.types';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

import { simulate, type MutationResult, type SaveResult } from '@/lib/shared/mutationTypes';

export interface WaitlistUpdate {
  feedback?: string | null;
  expected_delivery_date?: string | null;
  status?: WaitingListEntry['status'];
  position?: number | null;
  pipeline_stage?: string | null;
  follow_up_date?: string | null;
  preference_notes?: string | null;
  litter_id?: string | null;
  list_type_id?: string | null;
  enquirer_name?: string | null;
  enquirer_email?: string | null;
  enquirer_phone?: string | null;
  enquirer_country?: string | null;
  source?: string | null;
  preferred_category?: string | null;
  preferred_sex?: string | null;
  preferred_colour?: string | null;
  ear_preference?: string | null;
  tail_preference?: string | null;
  registration_preference?: string | null;
  priority?: WaitingListEntry['priority'];
  payment_status?: WaitingListEntry['payment_status'];
  deposit_amount?: number | null;
  quoted_price?: number | null;
  quote_expires_at?: string | null;
  deposit_invoice_id?: string | null;
  assigned_dog_id?: string | null;
  assigned_litter_id?: string | null;
  last_contact_date?: string | null;
  admin_notes?: string | null;
  client_visible_note?: string | null;
  internal_flags?: string[];
  do_not_sell_reason?: string | null;
  stage_change_note?: string | null;
}

export interface CreateWaitlistInput {
  list_type_id: string;
  pipeline_stage?: string;
  client_id?: string | null;
  application_id?: string | null;
  enquirer_name?: string | null;
  enquirer_email?: string | null;
  enquirer_phone?: string | null;
  enquirer_country?: string | null;
  source?: string;
  preferred_category?: string;
  preferred_sex?: string | null;
  preferred_colour?: string | null;
  preference_notes?: string | null;
  follow_up_date?: string | null;
  priority?: WaitingListEntry['priority'];
}

export async function createWaitlistEntry(input: CreateWaitlistInput): Promise<SaveResult> {
  if (!supabase) {
    await simulate();
    return { error: null, id: 'wl-demo' };
  }

  const row = {
    list_type_id: input.list_type_id,
    pipeline_stage: input.pipeline_stage ?? 'enquiry',
    client_id: input.client_id ?? null,
    application_id: input.application_id ?? null,
    enquirer_name: input.enquirer_name ?? null,
    enquirer_email: input.enquirer_email ?? null,
    enquirer_phone: input.enquirer_phone ?? null,
    enquirer_country: input.enquirer_country ?? null,
    source: input.source ?? 'manual',
    preferred_category: input.preferred_category ?? 'any',
    preferred_sex: input.preferred_sex ?? 'any',
    preferred_colour: input.preferred_colour ?? null,
    preference_notes: input.preference_notes ?? null,
    follow_up_date: input.follow_up_date ?? null,
    priority: input.priority ?? 'normal',
    status: 'active',
  };

  const { data, error } = await supabase.from('waiting_list').insert(row as TablesInsert<'waiting_list'>).select('id').single();
  return { error: error?.message ?? null, id: (data?.id as string | undefined) ?? null };
}

export async function createWaitlistFromApplication(
  app: Application,
  listTypeId: string,
  overrides?: Partial<CreateWaitlistInput>,
): Promise<SaveResult> {
  const result = await createWaitlistEntry({
    list_type_id: listTypeId,
    pipeline_stage: 'application',
    client_id: app.user_id,
    application_id: app.id,
    enquirer_name: app.full_name,
    enquirer_email: app.email,
    enquirer_phone: app.phone,
    enquirer_country: app.country,
    source: 'app',
    preferred_category: categoryFromDogInterest(app.dog_interest),
    preferred_sex: app.preferred_sex ?? 'any',
    preferred_colour: app.preferred_colour ?? null,
    preference_notes: app.special_requests ?? app.why_dobermann,
    ...overrides,
  });

  if (!result.error && supabase) {
    await supabase
      .from('applications')
      .update({ status: 'waitlisted', reviewed_at: new Date().toISOString() })
      .eq('id', app.id);
  }

  return result;
}

export async function updateWaitlistEntry(
  id: string,
  values: WaitlistUpdate,
): Promise<MutationResult> {
  if (!supabase) return simulate();

  if (values.pipeline_stage === 'do_not_sell' && !values.do_not_sell_reason) {
    return { error: 'A reason is required when marking Do Not Sell.' };
  }

  let clientId: string | null = null;
  if (values.pipeline_stage === 'reserved') {
    const { data } = await supabase.from('waiting_list').select('client_id').eq('id', id).single();
    clientId = data?.client_id ?? null;
  }

  const { error } = await supabase
    .from('waiting_list')
    .update(values as TablesUpdate<'waiting_list'>)
    .eq('id', id);
  if (error) return { error: error.message };

  if (clientId) {
    void callNotify({
      userId: clientId,
      title: 'Puppy Reserved!',
      body: 'Your reservation has been confirmed. Welcome to the Diedericks family.',
    });
  }

  return { error: null };
}

export async function moveWaitlistStage(
  id: string,
  stage: string,
  note?: string | null,
  doNotSellReason?: string | null,
): Promise<MutationResult> {
  const status =
    stage === 'withdrawn' || stage === 'do_not_sell' ? ('removed' as const) : ('active' as const);
  return updateWaitlistEntry(id, {
    pipeline_stage: stage,
    status,
    stage_change_note: note ?? null,
    ...(stage === 'do_not_sell' ? { do_not_sell_reason: doNotSellReason ?? null } : {}),
  });
}

export async function markWaitlistContacted(id: string): Promise<MutationResult> {
  const today = new Date().toISOString().slice(0, 10);
  return updateWaitlistEntry(id, { last_contact_date: today, follow_up_date: null });
}

export async function assignWaitlistMatch(
  id: string,
  opts: { dogId?: string | null; litterId?: string | null },
): Promise<MutationResult> {
  const patch: WaitlistUpdate = {
    pipeline_stage: 'matched',
    assigned_dog_id: opts.dogId ?? null,
    assigned_litter_id: opts.litterId ?? null,
    stage_change_note: 'Assigned via preference matching',
  };
  const result = await updateWaitlistEntry(id, patch);
  if (result.error || !supabase) return result;

  const { data } = await supabase.from('waiting_list').select('client_id').eq('id', id).single();
  if (data?.client_id) {
    void callNotify({
      userId: data.client_id,
      title: 'Potential Match Found',
      body: 'Great news — we may have found your match. Your breeder will be in touch.',
    });
  }
  return result;
}

export async function reorderWaitlistPosition(
  id: string,
  position: number,
): Promise<MutationResult> {
  return updateWaitlistEntry(id, { position });
}

export async function deleteWaitlistEntry(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('waiting_list').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function createWaitlistType(name: string): Promise<SaveResult> {
  if (!supabase) {
    await simulate();
    return { error: null, id: 'type-demo' };
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const { data, error } = await supabase
    .from('waiting_list_types')
    .insert({ name, slug, sort_order: 50 })
    .select('id')
    .single();
  return { error: error?.message ?? null, id: (data?.id as string | undefined) ?? null };
}

/** Client self-registration for a specific litter waiting list. */
export async function joinLitterWaitlist(
  clientId: string,
  litterId: string,
  preferenceNotes?: string,
): Promise<SaveResult> {
  if (!supabase) {
    await simulate();
    return { error: null, id: 'wl-join-demo' };
  }

  const { data: existing } = await supabase
    .from('waiting_list')
    .select('id')
    .eq('client_id', clientId)
    .eq('litter_id', litterId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existing) {
    return { error: 'You are already on the waiting list for this litter.', id: existing.id };
  }

  const { data, error } = await supabase
    .from('waiting_list')
    .insert({
      client_id: clientId,
      litter_id: litterId,
      preference_notes: preferenceNotes?.trim() || null,
      status: 'active',
    })
    .select('id')
    .single();

  return { error: error?.message ?? null, id: (data?.id as string | undefined) ?? null };
}

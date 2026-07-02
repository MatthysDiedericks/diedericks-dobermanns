import { supabase } from '@/lib/supabase';
import { callSendBroadcast } from '@/lib/functions';
import type {
  BroadcastChannel,
  ClientGroupType,
  TimelineCategory,
  TimelineSource,
} from '@/types/app.types';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

import { simulate, type MutationResult, type SaveResult } from '@/lib/shared/mutationTypes';

export {
  assignWaitlistMatch,
  createWaitlistEntry,
  createWaitlistFromApplication,
  createWaitlistType,
  deleteWaitlistEntry,
  joinLitterWaitlist,
  markWaitlistContacted,
  moveWaitlistStage,
  reorderWaitlistPosition,
  updateWaitlistEntry,
} from '@/lib/waitlist/mutations';

export async function setMarketingOptIn(
  userId: string,
  optIn: boolean,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('users')
    .update({ marketing_opt_in: optIn })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

export interface TimelineInput {
  dog_id: string;
  source: TimelineSource;
  category: TimelineCategory;
  entry_date: string;
  title: string;
  notes?: string | null;
  photo_urls: string[];
  video_url?: string | null;
  author_id?: string | null;
}

export async function saveTimelineEntry(
  values: TimelineInput,
  id?: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const row: TablesInsert<'dog_timeline'> = {
    dog_id: values.dog_id,
    source: values.source,
    category: values.category,
    entry_date: values.entry_date,
    title: values.title,
    notes: values.notes ?? null,
    photo_urls: values.photo_urls,
    video_url: values.video_url ?? null,
    author_id: values.author_id ?? null,
  };
  if (id) {
    const { error } = await supabase
      .from('dog_timeline')
      .update(row as TablesUpdate<'dog_timeline'>)
      .eq('id', id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from('dog_timeline').insert(row);
  return { error: error?.message ?? null };
}

export async function deleteTimelineEntry(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('dog_timeline').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function createClientGroup(
  name: string,
  type: ClientGroupType,
): Promise<SaveResult> {
  if (!supabase) {
    await simulate();
    return { error: null, id: 'group-demo' };
  }
  const { data, error } = await supabase
    .from('client_groups')
    .insert({ name, type })
    .select('id')
    .single();
  return { error: error?.message ?? null, id: data?.id ?? null };
}

export async function renameClientGroup(id: string, name: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('client_groups').update({ name }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteClientGroup(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('client_groups').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function addGroupMember(groupId: string, clientId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('client_group_members')
    .insert({ group_id: groupId, client_id: clientId });
  return { error: error?.message ?? null };
}

export async function removeGroupMember(memberId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('client_group_members').delete().eq('id', memberId);
  return { error: error?.message ?? null };
}

export interface BroadcastInput {
  group_id: string | null;
  title: string;
  body: string;
  image_url?: string | null;
  channels: BroadcastChannel[];
  scheduled_for?: string | null;
}

export async function sendBroadcast(input: BroadcastInput): Promise<SaveResult> {
  const scheduled = !!input.scheduled_for;
  if (!supabase) {
    await simulate();
    return { error: null, id: 'bc-demo' };
  }
  const { data, error } = await supabase
    .from('broadcast_messages')
    .insert({
      group_id: input.group_id,
      title: input.title,
      body: input.body,
      image_url: input.image_url ?? null,
      channels: input.channels,
      status: scheduled ? 'scheduled' : 'sent',
      scheduled_for: input.scheduled_for ?? null,
      sent_at: scheduled ? null : new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) return { error: error.message, id: null };

  if (!scheduled && data?.id) {
    void callSendBroadcast(data.id);
  }

  return { error: null, id: data?.id ?? null };
}

export async function markBroadcastRead(
  broadcastId: string,
  clientId: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('broadcast_reads')
    .upsert(
      { broadcast_id: broadcastId, client_id: clientId },
      { onConflict: 'broadcast_id,client_id' },
    );
  return { error: error?.message ?? null };
}

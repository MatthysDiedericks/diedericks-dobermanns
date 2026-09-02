import { addBuyerToLitterGroup } from '@/lib/dogs/litterGroups';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

async function writeShareAudit(args: {
  dogId: string;
  action: 'share' | 'unshare';
  fromOwnerId: string | null;
  toOwnerId: string | null;
}) {
  if (!supabase) return;
  const session = useAuthStore.getState().session;
  const profile = useAuthStore.getState().profile;
  const { error } = await supabase.from('audit_log').insert({
    table_name: 'dogs',
    record_id: args.dogId,
    action: 'update',
    actor_id: session?.user.id ?? null,
    actor_email: session?.user.email ?? null,
    actor_role: profile?.role ?? null,
    changed_fields: ['owner_id', 'shared'],
    old_values: { owner_id: args.fromOwnerId, share: args.action === 'unshare' },
    new_values: { owner_id: args.toOwnerId, share: args.action === 'share' },
  });
  if (error) console.error('[share] audit_log:', error.message);
}

async function pushShareNotice(clientUserId: string, dogName: string, sharing: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from('notifications_log').insert({
    recipient_id: clientUserId,
    type: 'dog_shared',
    subject: sharing
      ? `${dogName} is now in your portal`
      : `${dogName} is no longer in your portal`,
    body: null,
    status: 'sent',
  });
  if (error) console.error('[share] in-app notice:', error.message);
}

/**
 * Links a dog to a client's login. Does not send email.
 */
export async function allocateDogToClient(
  dogId: string,
  clientUserId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data: client, error: clientErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', clientUserId)
    .maybeSingle();
  if (clientErr) return { error: clientErr.message };
  if (!client || client.role !== 'client') {
    return { error: 'Selected account is not a client.' };
  }

  const { data: before } = await supabase
    .from('dogs')
    .select('id, name, owner_id')
    .eq('id', dogId)
    .maybeSingle();
  if (!before) return { error: 'Dog not found.' };

  const { error: dogErr } = await supabase
    .from('dogs')
    .update({ owner_id: clientUserId, status: 'sold', handover_status: 'awaiting_go_home' } as never)
    .eq('id', dogId);
  if (dogErr) return { error: dogErr.message };

  const { data: existing, error: findErr } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('dog_id', dogId)
    .eq('client_id', clientUserId)
    .maybeSingle();
  if (findErr) return { error: findErr.message };

  if (existing) {
    if (existing.status !== 'confirmed') {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', existing.id);
      if (error) return { error: error.message };
    }
  } else {
    const { error } = await supabase.from('reservations').insert({
      dog_id: dogId,
      client_id: clientUserId,
      status: 'confirmed',
    });
    if (error) return { error: error.message };
  }

  const group = await addBuyerToLitterGroup(dogId, clientUserId);
  if (group.warning) {
    console.error('[allocateDogToClient] litter group:', group.warning);
  }

  await writeShareAudit({
    dogId,
    action: 'share',
    fromOwnerId: before.owner_id,
    toOwnerId: clientUserId,
  });
  await pushShareNotice(clientUserId, before.name, true);
  return { error: null };
}

/** Clears owner_id and cancels reservations. Does not send email. */
export async function deallocateDog(dogId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data: before } = await supabase
    .from('dogs')
    .select('id, name, owner_id')
    .eq('id', dogId)
    .maybeSingle();
  if (!before) return { error: 'Dog not found.' };

  const { error: dogErr } = await supabase.from('dogs').update({ owner_id: null }).eq('id', dogId);
  if (dogErr) return { error: dogErr.message };

  const { error: resErr } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('dog_id', dogId)
    .in('status', ['pending', 'confirmed']);
  if (resErr) return { error: resErr.message };

  await writeShareAudit({
    dogId,
    action: 'unshare',
    fromOwnerId: before.owner_id,
    toOwnerId: null,
  });
  if (before.owner_id) await pushShareNotice(before.owner_id, before.name, false);
  return { error: null };
}

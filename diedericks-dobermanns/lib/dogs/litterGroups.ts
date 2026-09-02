import { requireSupabase } from '@/lib/supabase';

function groupNameFor(litter: { name: string | null; litter_letter: string | null }): string {
  if (litter.litter_letter) return `Litter ${litter.litter_letter} Buyers`;
  if (litter.name) return `${litter.name} Buyers`;
  return 'Litter Buyers';
}

/**
 * Finds or creates the buyer group for a litter and adds the client.
 * A group is a convenience — failure must never block allocation.
 */
export async function addBuyerToLitterGroup(
  dogId: string,
  clientId: string,
): Promise<{ warning?: string }> {
  const supabase = requireSupabase();
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .select('id, litter_id')
    .eq('id', dogId)
    .maybeSingle();
  if (dogError) return { warning: dogError.message };
  if (!dog?.litter_id) return {};

  const { data: litter, error: litterError } = await supabase
    .from('litters')
    .select('id, name, litter_letter')
    .eq('id', dog.litter_id)
    .maybeSingle();
  if (litterError) return { warning: litterError.message };
  if (!litter) return {};

  const { data: existing, error: findError } = await supabase
    .from('client_groups')
    .select('id')
    .eq('litter_id', litter.id)
    .maybeSingle();
  if (findError) return { warning: findError.message };

  let groupId = existing?.id ?? null;
  if (!groupId) {
    const { data: created, error: createError } = await supabase
      .from('client_groups')
      .insert({
        name: groupNameFor(litter),
        type: 'litter',
        litter_id: litter.id,
      })
      .select('id')
      .single();
    if (createError) return { warning: createError.message };
    groupId = created.id;
  }

  const { data: member, error: memberFindError } = await supabase
    .from('client_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (memberFindError) return { warning: memberFindError.message };

  if (!member) {
    const { error: addError } = await supabase.from('client_group_members').insert({
      group_id: groupId,
      client_id: clientId,
      dog_id: dogId,
      litter_id: litter.id,
    });
    if (addError) return { warning: addError.message };
  }

  const { count } = await supabase
    .from('client_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);
  await supabase.from('client_groups').update({ member_count: count ?? 0 }).eq('id', groupId);
  return {};
}

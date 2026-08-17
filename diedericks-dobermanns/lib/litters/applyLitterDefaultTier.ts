import { requireSupabase } from '@/lib/supabase';
import { isProgrammeTierKey, type ProgrammeTierKey } from '@/lib/finance/quotePrice';

/** Apply a litter default tier to puppies that have neither their own tier nor price. */
export async function applyLitterDefaultTier(
  litterId: string,
  tier: ProgrammeTierKey,
): Promise<{ updated: number; skipped: number }> {
  if (!isProgrammeTierKey(tier)) throw new Error('Choose a valid programme tier.');
  const supabase = requireSupabase();

  const { error: litterErr } = await supabase
    .from('litters')
    .update({ default_programme_tier: tier } as never)
    .eq('id', litterId);
  if (litterErr) throw new Error(litterErr.message);

  const { data: pups, error } = await supabase
    .from('dogs')
    .select('id, programme_tier, price')
    .eq('litter_id', litterId);
  if (error) throw new Error(error.message);

  const eligible = (pups ?? []).filter((p) => {
    const ownTier = (p.programme_tier as string | null)?.trim();
    const ownPrice = p.price != null && Number(p.price) > 0;
    return !ownTier && !ownPrice;
  });

  if (eligible.length) {
    const { error: upErr } = await supabase
      .from('dogs')
      .update({ programme_tier: tier } as never)
      .in(
        'id',
        eligible.map((p) => p.id),
      );
    if (upErr) throw new Error(upErr.message);
  }

  return { updated: eligible.length, skipped: (pups ?? []).length - eligible.length };
}

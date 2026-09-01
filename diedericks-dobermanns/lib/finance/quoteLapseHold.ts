import { requireSupabase } from '@/lib/supabase';

export async function setQuoteLapseHold(
  id: string,
  holdUntil: string | null,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (holdUntil && trimmed.length < 3) {
    throw new Error('A reason is required to hold a quote. It has to outlive the person who set it.');
  }
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('quotes')
    .update({
      lapse_hold_until: holdUntil,
      lapse_hold_reason: holdUntil ? trimmed : null,
      lapse_hold_set_by: holdUntil ? user?.id ?? null : null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

import { buyerNameFields, isPlaceholderDogName, realDogName } from '@/lib/dogs/placeholderName';
import { requireSupabase } from '@/lib/supabase';

export type HandoverStatus = 'awaiting_go_home' | 'ready' | 'scheduled' | 'delivered';

/** Same rules as website `updateDogHandover`. Delivered branch is unchanged. */
export async function updateDogHandover(input: {
  dogId: string;
  handover_status: HandoverStatus;
  handover_date?: string | null;
  delivery_method?: string | null;
  delivery_notes?: string | null;
  buyerCallName?: string | null;
}): Promise<{ error?: string }> {
  const supabase = requireSupabase();
  const { data: dog, error: loadErr } = await supabase
    .from('dogs')
    .select('name, call_name')
    .eq('id', input.dogId)
    .maybeSingle();
  if (loadErr) return { error: loadErr.message };

  const submitted = input.buyerCallName?.trim() ?? '';
  if (input.handover_status === 'delivered') {
    if (submitted && isPlaceholderDogName(submitted)) {
      return {
        error: 'That still looks like a kennel placeholder (Puppy N). Use the name they call the dog.',
      };
    }
    const existing = realDogName(submitted || dog?.call_name, dog?.name);
    if (!existing) {
      return {
        error:
          'Record the name the buyer uses before marking delivered. A later “Happy birthday Puppy 7” is worse than asking now.',
      };
    }
  }

  const patch: Record<string, unknown> = {
    handover_status: input.handover_status,
  };

  if (input.handover_status === 'scheduled') {
    patch.handover_date = input.handover_date || null;
  }

  if (input.handover_status === 'delivered') {
    patch.handover_date = input.handover_date || null;
    patch.delivery_method = input.delivery_method || null;
    patch.delivery_notes = input.delivery_notes?.trim() || null;
    patch.delivered_at = new Date().toISOString();
    if (submitted) Object.assign(patch, buyerNameFields(dog?.name, submitted));
  }

  const { error } = await supabase
    .from('dogs')
    .update(patch as never)
    .eq('id', input.dogId);
  if (error) return { error: error.message };

  if (input.handover_status === 'delivered') {
    await supabase
      .from('waiting_list')
      .update({ pipeline_stage: 'handover_complete' })
      .eq('assigned_dog_id', input.dogId);
  }

  return {};
}

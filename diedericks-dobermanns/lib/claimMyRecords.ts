import { supabase } from '@/lib/supabase';

/**
 * Links applications / quotes / waitlist / contracts raised against the
 * caller's confirmed email. Takes no arguments — never pass a user-supplied email.
 * Safe to call repeatedly; failures must not block sign-in.
 */
export async function claimMyRecords(): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc('claim_my_records');
    if (error) {
      console.error('[claimMyRecords]', error.message);
    }
  } catch (err) {
    console.error('[claimMyRecords]', err);
  }
}

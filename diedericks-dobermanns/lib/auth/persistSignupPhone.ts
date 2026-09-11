import { parsePhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

/**
 * Copy a validated signup phone onto public.users so the existing
 * sync_user_to_contacts trigger can fill contacts.phone. No migration.
 */
export async function persistSignupPhone(
  phone: string | null | undefined,
  userId?: string | null,
): Promise<void> {
  if (!supabase) return;
  const parsed = parsePhone(phone);
  if (!parsed.ok) return;
  let id = userId ?? null;
  if (!id) {
    const { data } = await supabase.auth.getUser();
    id = data.user?.id ?? null;
  }
  if (!id) return;
  await supabase.from('users').update({ phone: parsed.value }).eq('id', id);
}

export function phoneFromUserMetadata(user: {
  user_metadata?: Record<string, unknown> | null;
} | null | undefined): string | null {
  const raw = user?.user_metadata?.phone;
  return typeof raw === 'string' ? raw : null;
}

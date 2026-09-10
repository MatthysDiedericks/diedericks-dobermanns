import { supabase } from '@/lib/supabase';
import type { ShopContactPrefill } from '@/lib/equipment/types';

/** Signed-in shop form: contact first, then the user profile — same order as the website. */
export async function fetchShopContactPrefill(): Promise<ShopContactPrefill | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle();

  const fromProfile: ShopContactPrefill = {
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? user.email ?? '',
    phone: profile?.phone ?? '',
  };

  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name, email, phone')
    .eq('user_id', user.id)
    .is('merged_into_contact_id', null)
    .limit(1)
    .maybeSingle();

  if (!contact) return fromProfile;
  return {
    full_name: (contact.full_name as string | null) || fromProfile.full_name,
    email: (contact.email as string | null) || fromProfile.email,
    phone: (contact.phone as string | null) || fromProfile.phone,
  };
}

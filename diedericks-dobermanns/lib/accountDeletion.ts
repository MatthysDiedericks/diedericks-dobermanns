import { Linking } from 'react-native';

import { LEGAL_URLS } from '@/lib/legalUrls';
import { supabase } from '@/lib/supabase';

const DEMO_ERROR =
  'Account deletion requires a connected backend. Add Supabase credentials to .env.';

/**
 * Deletes the signed-in user's own account via the `delete-account` Edge
 * Function (Apple 5.1.1(v) / Google Play in-app deletion requirement).
 *
 * The function identifies the caller from their JWT: staff roles (admin/
 * super_admin/trainer) get a 403 with a clear message; client accounts are
 * anonymized and either hard-deleted or permanently disabled. This is the
 * PRIMARY deletion path — see `openAccountDeletionRequest` below for the
 * secondary email fallback.
 */
export async function deleteOwnAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: DEMO_ERROR };
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return { error: error.message ?? 'Deletion failed. Please try again.' };
  if (data?.error) return { error: data.error };
  return { error: null };
}

/**
 * Secondary fallback: opens a pre-filled email to request account deletion.
 * Kept for users who can't complete the in-app flow — NOT the primary path.
 */
export function openAccountDeletionRequest(): void {
  const subject = encodeURIComponent('Account Deletion Request');
  const body = encodeURIComponent(
    'Please delete my Diedericks Dobermanns app account and associated personal data.\n\n' +
      'Registered email:\n\n' +
      'Reason (optional):\n',
  );
  void Linking.openURL(
    `mailto:${LEGAL_URLS.contactEmail}?subject=${subject}&body=${body}`,
  );
}

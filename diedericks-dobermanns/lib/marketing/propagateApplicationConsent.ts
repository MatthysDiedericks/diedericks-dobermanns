import { requireSupabase } from '@/lib/supabase';

/** True-only: never set marketing_opt_in back to false. */
export async function applyTrueMarketingConsentToContact(contactId: string): Promise<void> {
  const supabase = requireSupabase();
  await supabase
    .from('contacts')
    .update({
      marketing_opt_in: true,
      popia_consent: true,
      popia_consent_date: new Date().toISOString(),
    } as never)
    .eq('id', contactId)
    .eq('marketing_opt_in' as never, false);
}

export async function propagateApplicationMarketingConsent(
  applicationId: string,
  contactId: string,
): Promise<void> {
  const supabase = requireSupabase();
  const { data: app, error } = await supabase
    .from('applications' as never)
    .select('marketing_opt_in' as never)
    .eq('id' as never, applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app || !(app as { marketing_opt_in?: boolean }).marketing_opt_in) return;
  await applyTrueMarketingConsentToContact(contactId);
}

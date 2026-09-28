import { paymentCountryFor } from '@/lib/finance/bankDetails';
import { requireSupabase } from '@/lib/supabase';

/** Live country for payment routing — never stored on quotes or invoices. */
export async function fetchBuyerCountry(ids: {
  client_id?: string | null;
  contact_id?: string | null;
  application_id?: string | null;
}): Promise<string | null> {
  const supabase = requireSupabase();
  const [contact, application, client] = await Promise.all([
    ids.contact_id
      ? supabase
          .from('contacts')
          .select('country, merged_into_contact_id')
          .eq('id', ids.contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ids.application_id
      ? supabase
          .from('applications')
          .select('country')
          .eq('id', ids.application_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ids.client_id
      ? supabase.from('users').select('country').eq('id', ids.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const contactRow = contact.data as
    | { country?: string | null; merged_into_contact_id?: string | null }
    | null;
  return paymentCountryFor({
    contactCountry: contactRow && !contactRow.merged_into_contact_id ? contactRow.country : null,
    applicationCountry: application.data?.country ?? null,
    clientCountry: client.data?.country ?? null,
  });
}

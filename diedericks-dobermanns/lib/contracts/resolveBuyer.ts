import type { ContractBuyer } from '@/lib/contracts/tokens';
import { requireSupabase } from '@/lib/supabase';

export type ResolvedBuyer = {
  contactId: string;
  clientId: string | null;
  quoteId: string | null;
  invoiceId: string | null;
  reservationId: string | null;
  buyer: ContractBuyer;
};

type ContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  user_id: string | null;
};

async function contactById(id: string): Promise<ContactRow | null> {
  const { data } = await requireSupabase()
    .from('contacts')
    .select('id, full_name, email, phone, whatsapp_number, address, user_id')
    .eq('id', id)
    .maybeSingle();
  return (data as ContactRow | null) ?? null;
}

function toBuyer(c: ContactRow, extras?: Partial<ContractBuyer>): ContractBuyer {
  return {
    full_name: extras?.full_name ?? c.full_name ?? 'Buyer',
    email: extras?.email ?? c.email,
    phone: extras?.phone ?? c.phone ?? c.whatsapp_number,
    id_number: extras?.id_number ?? null,
    address: extras?.address ?? c.address,
  };
}

/** Person this dog is being sold to — contact first, portal account if they have one. */
export async function resolveBuyerForDog(
  dogId: string,
  explicitContactId?: string | null,
): Promise<{ buyer: ResolvedBuyer; error?: undefined } | { buyer?: undefined; error: string }> {
  if (explicitContactId) {
    const c = await contactById(explicitContactId);
    if (!c) return { error: 'Contact not found.' };
    return {
      buyer: {
        contactId: c.id,
        clientId: c.user_id,
        quoteId: null,
        invoiceId: null,
        reservationId: null,
        buyer: toBuyer(c),
      },
    };
  }

  const supabase = requireSupabase();
  const { data: dog } = await supabase
    .from('dogs')
    .select('id, owner_id, owner_contact_id, reserved_for_name')
    .eq('id', dogId)
    .maybeSingle();
  if (!dog) return { error: 'Dog not found.' };

  if (dog.owner_contact_id) {
    const c = await contactById(dog.owner_contact_id);
    if (c) {
      return {
        buyer: {
          contactId: c.id,
          clientId: c.user_id ?? dog.owner_id,
          quoteId: null,
          invoiceId: null,
          reservationId: null,
          buyer: toBuyer(c),
        },
      };
    }
  }

  const fromQuote = await buyerFromQuote(dogId);
  if (fromQuote) return { buyer: fromQuote };

  const fromWait = await buyerFromWaitlist(dogId);
  if (fromWait) return { buyer: fromWait };

  if (dog.owner_id) {
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .eq('id', dog.owner_id)
      .maybeSingle();
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, whatsapp_number, address, user_id')
      .eq('user_id', dog.owner_id)
      .maybeSingle();
    if (contact) {
      return {
        buyer: {
          contactId: contact.id,
          clientId: dog.owner_id,
          quoteId: null,
          invoiceId: null,
          reservationId: null,
          buyer: toBuyer(contact as ContactRow, {
            full_name: user?.full_name ?? contact.full_name ?? 'Buyer',
            email: user?.email ?? contact.email,
            phone: user?.phone ?? contact.phone,
          }),
        },
      };
    }
  }

  const name = dog.reserved_for_name?.trim();
  if (name) {
    const { data: byName } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, whatsapp_number, address, user_id')
      .ilike('full_name', name)
      .is('merged_into_contact_id', null)
      .limit(1)
      .maybeSingle();
    if (byName) {
      return {
        buyer: {
          contactId: byName.id,
          clientId: byName.user_id,
          quoteId: null,
          invoiceId: null,
          reservationId: null,
          buyer: toBuyer(byName as ContactRow),
        },
      };
    }
  }

  return {
    error:
      'No buyer on this dog. Link a contact (owner, waitlist, or quote) before creating the agreement.',
  };
}

async function buyerFromQuote(dogId: string): Promise<ResolvedBuyer | null> {
  const supabase = requireSupabase();
  const { data: items } = await supabase
    .from('quote_items')
    .select(
      'quote_id, quote:quotes!quote_items_quote_id_fkey(id, contact_id, client_id, converted_invoice_id, application_id)',
    )
    .eq('dog_id', dogId)
    .order('sort_order');
  const q = (
    (items ?? []) as unknown as {
      quote: {
        id: string;
        contact_id: string | null;
        client_id: string | null;
        converted_invoice_id: string | null;
        application_id: string | null;
      } | null;
    }[]
  ).find((r) => r.quote)?.quote;
  if (!q?.contact_id && !q?.client_id) return null;

  let contact: ContactRow | null = q.contact_id ? await contactById(q.contact_id) : null;
  if (!contact && q.client_id) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, whatsapp_number, address, user_id')
      .eq('user_id', q.client_id)
      .maybeSingle();
    contact = (data as ContactRow | null) ?? null;
  }
  if (!contact) return null;

  let extras: Partial<ContractBuyer> = {};
  if (q.application_id) {
    const { data: app } = await supabase
      .from('applications')
      .select('id_number, address, city, country, phone, full_name, email')
      .eq('id', q.application_id)
      .maybeSingle();
    if (app) {
      extras = {
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        id_number: app.id_number,
        address: [app.address, app.city, app.country].filter(Boolean).join(', ') || null,
      };
    }
  }
  return {
    contactId: contact.id,
    clientId: q.client_id ?? contact.user_id,
    quoteId: q.id,
    invoiceId: q.converted_invoice_id,
    reservationId: null,
    buyer: toBuyer(contact, extras),
  };
}

async function buyerFromWaitlist(dogId: string): Promise<ResolvedBuyer | null> {
  const supabase = requireSupabase();
  const { data: wl } = await supabase
    .from('waiting_list')
    .select('id, client_id, quote_id, application_id, enquirer_name, enquirer_email, enquirer_phone')
    .eq('assigned_dog_id', dogId)
    .maybeSingle();
  if (!wl) return null;

  if (wl.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, contact_id, client_id, converted_invoice_id')
      .eq('id', wl.quote_id)
      .maybeSingle();
    if (quote?.contact_id) {
      const c = await contactById(quote.contact_id);
      if (c) {
        return {
          contactId: c.id,
          clientId: quote.client_id ?? c.user_id ?? wl.client_id,
          quoteId: quote.id,
          invoiceId: quote.converted_invoice_id,
          reservationId: null,
          buyer: toBuyer(c, {
            full_name: wl.enquirer_name ?? c.full_name ?? 'Buyer',
            email: wl.enquirer_email ?? c.email,
            phone: wl.enquirer_phone ?? c.phone,
          }),
        };
      }
    }
  }

  if (wl.enquirer_email) {
    const { data: c } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, whatsapp_number, address, user_id')
      .ilike('email', wl.enquirer_email.trim())
      .is('merged_into_contact_id', null)
      .limit(1)
      .maybeSingle();
    if (c) {
      return {
        contactId: c.id,
        clientId: wl.client_id ?? c.user_id,
        quoteId: wl.quote_id,
        invoiceId: null,
        reservationId: null,
        buyer: toBuyer(c as ContactRow, {
          full_name: wl.enquirer_name ?? c.full_name ?? 'Buyer',
          email: wl.enquirer_email ?? c.email,
          phone: wl.enquirer_phone ?? c.phone,
        }),
      };
    }
  }
  return null;
}

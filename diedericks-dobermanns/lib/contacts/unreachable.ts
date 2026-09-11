import { isUnreachableContact } from '@/lib/contacts/reachable';
import { requireSupabase } from '@/lib/supabase';

export type UnreachableContact = {
  id: string;
  full_name: string;
  source: string | null;
  tags: string[] | null;
  user_id: string | null;
  linkedDog: string | null;
  lastInvoiceDate: string | null;
};

function rank(row: UnreachableContact): number {
  if (row.linkedDog) return 0;
  if (row.lastInvoiceDate) return 1;
  return 2;
}

export async function fetchUnreachableContacts(): Promise<UnreachableContact[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contacts_active' as 'contacts')
    .select('id, full_name, email, phone, source, tags, user_id');
  if (error) throw new Error(error.message);

  const unreachable = (data ?? []).filter((row) =>
    isUnreachableContact({
      phone: row.phone,
      email: row.email,
      tags: row.tags,
    }),
  );
  if (unreachable.length === 0) return [];

  const ids = unreachable.map((c) => c.id);
  const userIds = unreachable.map((c) => c.user_id).filter((id): id is string => Boolean(id));

  const [dogsRes, quotesRes, invoicesRes] = await Promise.all([
    supabase
      .from('dogs')
      .select('id, name, call_name, owner_contact_id, buyer_contact_id')
      .or(`owner_contact_id.in.(${ids.join(',')}),buyer_contact_id.in.(${ids.join(',')})`),
    supabase
      .from('quotes')
      .select('contact_id, converted_invoice_id')
      .in('contact_id', ids)
      .not('converted_invoice_id', 'is', null),
    userIds.length
      ? supabase
          .from('invoices')
          .select('client_id, issue_date, paid_date')
          .in('client_id', userIds)
      : Promise.resolve({
          data: [] as { client_id: string | null; issue_date: string | null; paid_date: string | null }[],
        }),
  ]);

  const dogByContact = new Map<string, string>();
  for (const dog of dogsRes.data ?? []) {
    const label = dog.call_name || dog.name || 'Dog';
    if (dog.owner_contact_id && !dogByContact.has(dog.owner_contact_id)) {
      dogByContact.set(dog.owner_contact_id, label);
    }
    if (dog.buyer_contact_id && !dogByContact.has(dog.buyer_contact_id)) {
      dogByContact.set(dog.buyer_contact_id, label);
    }
  }

  const invoiceIds = (quotesRes.data ?? [])
    .map((q) => q.converted_invoice_id)
    .filter((id): id is string => Boolean(id));
  const invoiceDateById = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoiceRows } = await supabase
      .from('invoices')
      .select('id, issue_date, paid_date')
      .in('id', invoiceIds);
    for (const inv of invoiceRows ?? []) {
      const date = inv.paid_date || inv.issue_date;
      if (date) invoiceDateById.set(inv.id, date);
    }
  }

  const lastInvoiceByContact = new Map<string, string>();
  for (const q of quotesRes.data ?? []) {
    if (!q.contact_id || !q.converted_invoice_id) continue;
    const date = invoiceDateById.get(q.converted_invoice_id);
    if (!date) continue;
    const prev = lastInvoiceByContact.get(q.contact_id);
    if (!prev || date > prev) lastInvoiceByContact.set(q.contact_id, date);
  }

  const lastInvoiceByUser = new Map<string, string>();
  for (const inv of invoicesRes.data ?? []) {
    if (!inv.client_id) continue;
    const date = inv.paid_date || inv.issue_date;
    if (!date) continue;
    const prev = lastInvoiceByUser.get(inv.client_id);
    if (!prev || date > prev) lastInvoiceByUser.set(inv.client_id, date);
  }

  const rows: UnreachableContact[] = unreachable.map((c) => {
    const fromQuote = lastInvoiceByContact.get(c.id) ?? null;
    const fromUser = c.user_id ? lastInvoiceByUser.get(c.user_id) ?? null : null;
    const lastInvoiceDate =
      fromQuote && fromUser ? (fromQuote > fromUser ? fromQuote : fromUser) : fromQuote ?? fromUser;
    return {
      id: c.id,
      full_name: c.full_name,
      source: c.source,
      tags: c.tags,
      user_id: c.user_id,
      linkedDog: dogByContact.get(c.id) ?? null,
      lastInvoiceDate,
    };
  });

  rows.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return a.full_name.localeCompare(b.full_name);
  });

  return rows;
}

export async function countUnreachableContacts(): Promise<number> {
  const rows = await fetchUnreachableContacts();
  return rows.length;
}

import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { OWNERSHIP_LABELS, type OwnershipStatus } from '@/lib/followUps/types';
import { requireSupabase } from '@/lib/supabase';

export type ContactLinkRow = {
  id: string;
  label: string;
  meta: string;
  href: string;
};

export type ContactLinks = {
  quotes: ContactLinkRow[];
  invoices: ContactLinkRow[];
  contracts: ContactLinkRow[];
  dogs: ContactLinkRow[];
  applications: ContactLinkRow[];
};

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
}

function str(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  return typeof v === 'number' ? v : null;
}

/** Survivor plus soft-merged losers — quotes left on an alias still belong here. */
async function contactIdsIncludingAliases(contactId: string): Promise<string[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('merged_into_contact_id', contactId);
  if (error) throw new Error(error.message);
  return [contactId, ...(data ?? []).map((r) => r.id)];
}

async function fetchQuotes(contactIds: string[]): Promise<ContactLinkRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number, status, total, created_at')
    .in('contact_id', contactIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const r = asRecord(raw);
    return {
      id: String(r.id),
      label: str(r, 'quote_number') ?? 'Quote',
      meta: [str(r, 'status'), formatAmount(num(r, 'total'))].filter(Boolean).join(' · '),
      href: `/(admin)/quotes/${r.id}`,
    };
  });
}

async function fetchInvoices(contactIds: string[], userId: string | null): Promise<ContactLinkRow[]> {
  const supabase = requireSupabase();
  const { data: quoteRows, error: quoteErr } = await supabase
    .from('quotes')
    .select('converted_invoice_id')
    .in('contact_id', contactIds)
    .not('converted_invoice_id', 'is', null);
  if (quoteErr) throw new Error(quoteErr.message);

  const fromQuotes = (quoteRows ?? [])
    .map((r) => asRecord(r).converted_invoice_id)
    .filter((id): id is string => typeof id === 'string');

  const seen = new Set<string>();
  const out: ContactLinkRow[] = [];

  const pushRows = (rows: unknown[]) => {
    for (const raw of rows) {
      const r = asRecord(raw);
      const id = str(r, 'id');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        label: str(r, 'invoice_number') ?? 'Invoice',
        meta: [str(r, 'status'), formatAmount(num(r, 'total_amount'))].filter(Boolean).join(' · '),
        href: `/(admin)/finance/invoices/${id}`,
      });
    }
  };

  if (fromQuotes.length) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, issue_date')
      .in('id', fromQuotes)
      .order('issue_date', { ascending: false });
    if (error) throw new Error(error.message);
    pushRows(data ?? []);
  }

  if (userId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, issue_date')
      .eq('client_id', userId)
      .order('issue_date', { ascending: false });
    if (error) throw new Error(error.message);
    pushRows(data ?? []);
  }

  return out;
}

async function fetchContracts(contactIds: string[]): Promise<ContactLinkRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contracts')
    .select('id, contract_number, contract_title, status, created_at, dog:dogs!contracts_dog_id_fkey(name)')
    .in('contact_id', contactIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const r = asRecord(raw);
    const dog = asRecord(r.dog);
    return {
      id: String(r.id),
      label: str(r, 'contract_number') ?? str(r, 'contract_title') ?? 'Contract',
      meta: [str(r, 'status'), str(dog, 'name')].filter(Boolean).join(' · '),
      href: `/(admin)/contracts/${r.id}`,
    };
  });
}

async function fetchDogs(contactIds: string[]): Promise<ContactLinkRow[]> {
  const supabase = requireSupabase();
  const ownerOr = contactIds.map((id) => `owner_contact_id.eq.${id}`).join(',');
  const buyerOr = contactIds.map((id) => `buyer_contact_id.eq.${id}`).join(',');
  const { data, error } = await supabase
    .from('dogs')
    .select(
      'id, name, call_name, ownership_status, placement_date, do_not_contact, owner_contact_id, buyer_contact_id',
    )
    .or(`${ownerOr},${buyerOr}`)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const r = asRecord(raw);
    const status = (str(r, 'ownership_status') ?? 'unknown') as OwnershipStatus;
    const placed = str(r, 'placement_date');
    const ownerId = str(r, 'owner_contact_id');
    const role = ownerId && contactIds.includes(ownerId) ? 'owner' : 'buyer';
    return {
      id: String(r.id),
      label: str(r, 'call_name') ?? str(r, 'name') ?? 'Dog',
      meta: [
        OWNERSHIP_LABELS[status] ?? status,
        placed ? `placed ${formatDate(placed)}` : null,
        role,
        r.do_not_contact ? 'do not contact' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/(admin)/dogs/${r.id}`,
    };
  });
}

async function fetchApplications(
  email: string | null,
  userId: string | null,
): Promise<ContactLinkRow[]> {
  if (!email && !userId) return [];
  const supabase = requireSupabase();
  const seen = new Set<string>();
  const out: ContactLinkRow[] = [];

  const push = (rows: unknown[]) => {
    for (const raw of rows) {
      const r = asRecord(raw);
      const id = str(r, 'id');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        label: str(r, 'full_name') ?? 'Application',
        meta: [str(r, 'status'), str(r, 'reference_code')].filter(Boolean).join(' · '),
        href: `/(admin)/applications/${id}`,
      });
    }
  };

  if (email) {
    const { data, error } = await supabase
      .from('applications')
      .select('id, full_name, status, reference_code, created_at')
      .ilike('email', email)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    push(data ?? []);
  }
  if (userId) {
    const { data, error } = await supabase
      .from('applications')
      .select('id, full_name, status, reference_code, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    push(data ?? []);
  }
  return out;
}

/** Linked records for a contact — quotes, invoices, contracts, dogs, applications. */
export async function fetchContactLinks(
  contactId: string,
  opts: { email: string | null; userId: string | null },
): Promise<ContactLinks> {
  const ids = await contactIdsIncludingAliases(contactId);
  const [quotes, invoices, contracts, dogs, applications] = await Promise.all([
    fetchQuotes(ids),
    fetchInvoices(ids, opts.userId),
    fetchContracts(ids),
    fetchDogs(ids),
    fetchApplications(opts.email, opts.userId),
  ]);
  return { quotes, invoices, contracts, dogs, applications };
}

import { useCallback, useEffect, useState } from 'react';

import { updateEnquiryStatus } from '@/hooks/useMutations';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  ContactInteraction,
  ContactRow,
  ContactSegment,
  ContactSummaryCounts,
} from '@/types/phase10';

export type { ContactInput, ContactInteraction } from '@/types/phase10';
export { createContact, updateContact } from '@/lib/contacts/mutations';

export const CONTACT_TAGS = [
  'Breeder',
  'Customer',
  'Judge',
  'Potential Customer',
  'Supplier',
  'Other',
] as const;

const CONTACT_SELECT =
  'id, full_name, email, phone, whatsapp_number, address, city, country, company, id_number, tags, is_do_not_sell, popia_consent, popia_consent_date, marketing_opt_in, contact_type, user_id, source, first_contact_date, created_at, updated_at, notes';

const OTHER_TYPES = ['breeder', 'supplier', 'judge', 'staff', 'other'] as const;

function mapContact(row: Record<string, unknown>): ContactRow {
  return row as unknown as ContactRow;
}

function applySearch(rows: ContactRow[], search: string): ContactRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (c) =>
      c.full_name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false) ||
      (c.company?.toLowerCase().includes(q) ?? false),
  );
}

export function useContacts(
  tag?: string,
  search = '',
  contactType: ContactSegment = 'all',
) {
  const role = useAuthStore((s) => s.profile?.role);
  const [data, setData] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      let q = supabase.from('contacts').select(CONTACT_SELECT).order('full_name');
      if (tag && tag !== 'all') q = q.contains('tags', [tag]);
      if (contactType === 'client') q = q.eq('contact_type', 'client');
      else if (contactType === 'prospect') q = q.eq('contact_type', 'prospect');
      else if (contactType === 'other') q = q.in('contact_type', [...OTHER_TYPES]);

      const { data: rows, error: err } = await q;
      if (err) throw new Error(err.message);

      let filtered = (rows ?? []).map((r) => mapContact(r as Record<string, unknown>));
      if (role !== 'super_admin') {
        filtered = filtered.filter((c) => !c.is_do_not_sell);
      }
      setData(applySearch(filtered, search));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tag, search, contactType, role]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useContactSummary() {
  const role = useAuthStore((s) => s.profile?.role);
  const [summary, setSummary] = useState<ContactSummaryCounts>({
    client: 0,
    prospect: 0,
    other: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.from('contacts').select('contact_type, is_do_not_sell');
      if (error) throw error;
      let rows = data ?? [];
      if (role !== 'super_admin') {
        rows = rows.filter((r) => !r.is_do_not_sell);
      }
      const counts = { client: 0, prospect: 0, other: 0, total: rows.length };
      for (const row of rows) {
        const t = row.contact_type ?? 'prospect';
        if (t === 'client') counts.client++;
        else if (t === 'prospect') counts.prospect++;
        else counts.other++;
      }
      setSummary(counts);
    } catch {
      setSummary({ client: 0, prospect: 0, other: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, refresh };
}

export function useContact(id: string) {
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('contacts')
        .select(CONTACT_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setContact(data ? mapContact(data as Record<string, unknown>) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contact');
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contact, loading, error, refresh };
}

const CONTACT_INTERACTION_SELECT =
  'id, contact_id, logged_by, interaction_type, direction, subject, body, interaction_date, created_at';

export function useContactInteractions(contactId: string) {
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('contact_interactions')
        .select(CONTACT_INTERACTION_SELECT)
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false });
      if (err) throw new Error(err.message);
      setInteractions((data ?? []) as ContactInteraction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load interactions');
      setInteractions([]);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logInteraction = useCallback(
    async (input: {
      interaction_type: ContactInteraction['interaction_type'];
      direction: ContactInteraction['direction'];
      subject?: string;
      body?: string;
      interaction_date?: string;
    }) => {
      const supabase = requireSupabase();
      const uid = useAuthStore.getState().session?.user?.id ?? null;
      const { error: err } = await supabase.from('contact_interactions').insert({
        contact_id: contactId,
        logged_by: uid,
        interaction_type: input.interaction_type,
        direction: input.direction,
        subject: input.subject ?? null,
        body: input.body ?? null,
        interaction_date: input.interaction_date ?? new Date().toISOString(),
      });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [contactId, refresh],
  );

  return { interactions, loading, error, refresh, logInteraction };
}

export interface EnquiryDetail {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  replied_at: string | null;
  dog_id: string | null;
}

export function useEnquiry(id: string) {
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('enquiries')
        .select(
          'id, full_name, email, phone, subject, message, status, admin_notes, created_at, replied_at, dog_id',
        )
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      setEnquiry(data as EnquiryDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load enquiry');
      setEnquiry(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateStatus = async (status: string) => {
    const { error: err } = await updateEnquiryStatus(id, status);
    if (!err) await refresh();
    return err;
  };

  return { enquiry, loading, error, refresh, updateStatus };
}

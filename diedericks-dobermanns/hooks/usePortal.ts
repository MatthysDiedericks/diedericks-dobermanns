import { MOCK_APPLICATIONS, MOCK_CONTRACTS } from '@/lib/mockData';
import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import { useCallback, useEffect, useState } from 'react';

import { WAITLIST_SELECT } from '@/lib/waitlist/queries';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  Application,
  Contract,
  Dog,
  PortalReservation,
  WaitingListEntry,
} from '@/types/app.types';

/** Contracts belonging to the signed-in client (scoped by RLS server-side). */
export function useContracts(): ListResult<Contract> {
  return useRemoteList<Contract>(MOCK_CONTRACTS, (client) =>
    client.from('contracts').select('id, created_at, signed_at, signed_by_client, notes, dog_id, client_id, document_url, contract_title, status').order('created_at', { ascending: false }),
  );
}

/** The signed-in client's own applications. */
export function useMyApplications(userId?: string): ListResult<Application> {
  return useRemoteList<Application>(MOCK_APPLICATIONS, (client) => {
    const base = client
      .from('applications')
      .select('id, full_name, email, phone, status, purpose, country, created_at, admin_notes')
      .order('created_at', { ascending: false });
    return userId ? base.eq('user_id', userId) : base;
  });
}

const PORTAL_DOG_SELECT =
  'id, name, colour, sex, status, date_of_birth, microchip_number, dog_media(url, is_primary)';

export function usePortalDogs() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('dogs')
        .select(PORTAL_DOG_SELECT)
        .eq('owner_id', userId);
      if (err) throw new Error(err.message);
      const mapped = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const media = (r.dog_media as Dog['media']) ?? [];
        return { ...(r as unknown as Dog), media };
      });
      setDogs(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your dogs');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dogs, loading, error, refresh };
}

const RESERVATION_SELECT =
  'id, status, deposit_paid, deposit_amount, total_price, expected_pickup_date, dog:dogs(id, name, colour, sex, date_of_birth, microchip_number, dog_media(url, is_primary))';

export function usePortalReservation() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [reservation, setReservation] = useState<PortalReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setReservation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('reservations')
        .select(RESERVATION_SELECT)
        .eq('client_id', userId)
        .eq('status', 'confirmed')
        .maybeSingle();
      if (err) throw new Error(err.message);
      if (!data) {
        setReservation(null);
      } else {
        const r = data as Record<string, unknown>;
        const dogRaw = r.dog as Record<string, unknown> | null;
        let dog: Dog | null = null;
        if (dogRaw) {
          const media = (dogRaw.dog_media as Dog['media']) ?? [];
          dog = { ...(dogRaw as unknown as Dog), media };
        }
        setReservation({
          id: r.id as string,
          status: r.status as string,
          deposit_paid: r.deposit_paid as boolean,
          deposit_amount: r.deposit_amount as number | null,
          total_price: r.total_price as number | null,
          expected_pickup_date: r.expected_pickup_date as string | null,
          dog,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reservation');
      setReservation(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reservation, loading, error, refresh };
}

export interface PortalGroupRow {
  id: string;
  name: string;
  type: string;
  member_count: number | null;
  litter_id: string | null;
}

export function usePortalGroups() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [groups, setGroups] = useState<PortalGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('client_group_members')
        .select('group:client_groups(id, name, type, member_count, litter_id)')
        .eq('client_id', userId);
      if (err) throw new Error(err.message);
      const rows = (data ?? [])
        .map((r) => (r as unknown as { group: PortalGroupRow | null }).group)
        .filter(Boolean) as PortalGroupRow[];
      setGroups(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}

export function usePortalWaitlistEntry() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [entry, setEntry] = useState<WaitingListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntry(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('waiting_list')
        .select(WAITLIST_SELECT)
        .eq('client_id', userId)
        .neq('pipeline_stage', 'withdrawn')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setEntry((data as unknown as WaitingListEntry) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load waitlist');
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entry, loading, error, refresh };
}

export function useLitterWaitlistStatus(litterId: string) {
  const userId = useAuthStore((s) => s.profile?.id);
  const [litterName, setLitterName] = useState('');
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const [{ data: litter }, { data: existing }] = await Promise.all([
        supabase.from('litters').select('name').eq('id', litterId).maybeSingle(),
        userId
          ? supabase
              .from('waiting_list')
              .select('id')
              .eq('client_id', userId)
              .eq('litter_id', litterId)
              .neq('status', 'cancelled')
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      setLitterName((litter?.name as string) ?? 'This litter');
      setAlreadyJoined(!!existing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litter');
    } finally {
      setLoading(false);
    }
  }, [litterId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { litterName, alreadyJoined, loading, error, refresh };
}

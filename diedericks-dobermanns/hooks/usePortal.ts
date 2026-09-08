import { fetchMyClientIds, fetchMyDogIds, fetchMyFinancialClientIds } from '@/lib/portal/memberScope';
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
const PORTAL_CONTRACT_SELECT =
  'id, created_at, signed_at, signed_by_client, notes, dog_id, client_id, contact_id, document_url, contract_title, status, ' +
  'client_signed_at, client_signature_url, client_signature_device, client_ip_on_sign, esign_token, body_html';

export function useContracts(): ListResult<Contract> {
  const userId = useAuthStore((s) => s.session?.user.id ?? s.profile?.id);
  return useRemoteList<Contract>(MOCK_CONTRACTS, async (client) => {
    const ids = userId ? await fetchMyFinancialClientIds() : [];
    return await client
      .from('contracts')
      .select(PORTAL_CONTRACT_SELECT)
      .in('client_id', ids.length ? ids : [userId ?? ''])
      .order('created_at', { ascending: false });
  });
}

/** The signed-in client's own applications. */
export function useMyApplications(): ListResult<Application> {
  const userId = useAuthStore((s) => s.session?.user.id ?? s.profile?.id);
  return useRemoteList<Application>(MOCK_APPLICATIONS, (client) =>
    client
      .from('applications')
      .select('id, full_name, email, phone, status, purpose, country, created_at, admin_notes')
      .eq('user_id', userId ?? '')
      .order('created_at', { ascending: false }),
  );
}

const PORTAL_DOG_SELECT =
  'id, name, colour, sex, status, date_of_birth, microchip_number, dog_media!dog_media_dog_id_fkey(url, thumbnail_url, is_primary, uploaded_at)';

export function usePortalDogs(forUserId?: string) {
  const sessionId = useAuthStore((s) => s.session?.user.id);
  const userId = forUserId ?? sessionId;
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
      const dogIds = await fetchMyDogIds(forUserId, sessionId);
      if (dogIds.length === 0) {
        setDogs([]);
        return;
      }
      const { data, error: err } = await supabase
        .from('dogs')
        .select(PORTAL_DOG_SELECT)
        .in('id', dogIds);
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
  'id, status, deposit_paid, deposit_amount, total_price, expected_pickup_date, dog:dogs(id, name, colour, sex, date_of_birth, microchip_number, dog_media!dog_media_dog_id_fkey(url, thumbnail_url, is_primary, uploaded_at))';

export function usePortalReservations() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [reservations, setReservations] = useState<PortalReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setReservations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const ids = await fetchMyClientIds();
      const { data, error: err } = await supabase
        .from('reservations')
        .select(RESERVATION_SELECT)
        .in('client_id', ids)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });
      if (err) throw new Error(err.message);
      setReservations(
        (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          const dogRaw = r.dog as Record<string, unknown> | null;
          let dog: Dog | null = null;
          if (dogRaw) {
            const media = (dogRaw.dog_media as Dog['media']) ?? [];
            dog = { ...(dogRaw as unknown as Dog), media };
          }
          return {
            id: r.id as string,
            status: r.status as string,
            deposit_paid: r.deposit_paid as boolean,
            deposit_amount: r.deposit_amount as number | null,
            total_price: r.total_price as number | null,
            expected_pickup_date: r.expected_pickup_date as string | null,
            dog,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reservations, loading, error, refresh };
}

export function usePortalReservation() {
  const { reservations, loading, error, refresh } = usePortalReservations();
  return { reservation: reservations[0] ?? null, loading, error, refresh };
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

export function usePortalWaitlistEntries() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const ids = await fetchMyClientIds();
      const { data, error: err } = await supabase
        .from('waiting_list')
        .select(WAITLIST_SELECT as never)
        .in('client_id', ids)
        .neq('pipeline_stage', 'withdrawn')
        .order('queue_anchor_at' as never, { ascending: true })
        .order('request_index' as never, { ascending: true });
      if (err) throw new Error(err.message);
      setEntries((data as unknown as WaitingListEntry[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load waitlist');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}

/** @deprecated Use usePortalWaitlistEntries — a client can have more than one line. */
export function usePortalWaitlistEntry() {
  const { entries, loading, error, refresh } = usePortalWaitlistEntries();
  return { entry: entries[0] ?? null, loading, error, refresh };
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

import { useCallback, useEffect, useState } from 'react';

import { Config } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

export type LitterContractRow = {
  id: string;
  status: string | null;
  contract_title: string | null;
  signed_by_client: boolean;
  signed_at: string | null;
  created_at: string;
  client?: { full_name: string | null; phone?: string | null } | null;
  dog?: { name: string; colour: string | null } | null;
};

const CONTRACT_SELECT =
  'id, status, contract_title, signed_by_client, signed_at, created_at, dog_id, ' +
  'client:users!contracts_client_id_fkey(full_name, phone), ' +
  'dog:dogs!contracts_dog_id_fkey(name, colour)';

export function useLitterContracts(litterId: string, puppyIds: string[]) {
  const [contracts, setContracts] = useState<LitterContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setContracts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        setContracts([]);
        setLoading(false);
        return;
      }
      const supabase = requireSupabase();
      const { data: byLitter, error: litterErr } = await (
        supabase.from('contracts').select(CONTRACT_SELECT) as unknown as {
          eq: (
            column: string,
            value: string,
          ) => {
            order: (
              column: string,
              options: { ascending: boolean },
            ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
          };
        }
      )
        .eq('litter_id', litterId)
        .order('created_at', { ascending: false });
      if (!litterErr && Array.isArray(byLitter) && byLitter.length > 0) {
        setContracts(byLitter as unknown as LitterContractRow[]);
        setLoading(false);
        return;
      }

      if (puppyIds.length === 0) {
        setContracts([]);
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('contracts')
        .select(CONTRACT_SELECT)
        .in('dog_id', puppyIds)
        .order('created_at', { ascending: false });
      if (err) throw new Error(err.message);
      setContracts((data ?? []) as unknown as LitterContractRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contracts');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [litterId, puppyIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createContract = useCallback(
    async (dogId: string, clientId: string, title: string) => {
      const supabase = requireSupabase();
      const row: TablesInsert<'contracts'> & { litter_id?: string } = {
        dog_id: dogId,
        client_id: clientId,
        litter_id: litterId,
        contract_title: title,
        status: 'draft',
        document_url: null,
        signed_by_client: false,
      };
      const { error: err } = await supabase.from('contracts').insert(row as TablesInsert<'contracts'>);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [litterId, refresh],
  );

  const sendEsign = useCallback(
    async (id: string) => {
      const supabase = requireSupabase();
      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();
      const { error: err } = await supabase
        .from('contracts')
        .update({
          status: 'sent',
          esign_token: token,
          esign_expires_at: expires,
          esign_sent_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { contracts, loading, error, createContract, sendEsign, refresh };
}

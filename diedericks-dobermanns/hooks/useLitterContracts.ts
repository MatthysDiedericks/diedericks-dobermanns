import { useCallback, useEffect, useState } from 'react';

import { createDraftContract, sendContractLink } from '@/lib/contracts/createDraft';
import { bulkCreateLitterContracts } from '@/lib/contracts/createSale';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type LitterContractRow = {
  id: string;
  status: string | null;
  contract_title: string | null;
  signed_by_client: boolean;
  signed_at: string | null;
  client_signed_at?: string | null;
  client_signature_url?: string | null;
  esign_token?: string | null;
  esign_expires_at?: string | null;
  body_html?: string | null;
  created_at: string;
  dog_id?: string | null;
  parent_contract_id?: string | null;
  client?: { full_name: string | null; phone?: string | null } | null;
  contact?: { full_name: string | null; phone?: string | null } | null;
  dog?: { name: string; colour: string | null } | null;
};

const CONTRACT_SELECT =
  'id, status, contract_title, signed_by_client, signed_at, client_signed_at, client_signature_url, esign_token, esign_expires_at, body_html, created_at, dog_id, parent_contract_id, ' +
  'client:users!contracts_client_id_fkey(full_name, phone), ' +
  'contact:contacts!contracts_contact_id_fkey(full_name, phone), ' +
  'dog:dogs!contracts_dog_id_fkey(name, colour)';

export function useLitterContracts(litterId: string, puppyIds: string[]) {
  const [contracts, setContracts] = useState<LitterContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const actorId = useAuthStore((s) => s.session?.user.id);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setContracts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = puppyIds.length
        ? await supabase
            .from('contracts')
            .select(CONTRACT_SELECT)
            .in('dog_id', puppyIds)
            .order('created_at', { ascending: false })
        : await supabase
            .from('contracts')
            .select(CONTRACT_SELECT)
            .eq('litter_id', litterId)
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
    async (dogId: string, contactId?: string) => {
      if (!actorId) throw new Error('Not signed in.');
      const res = await createDraftContract({
        dogId,
        litterId,
        contactId,
        actorId,
      });
      if (res.error) throw new Error(res.error);
      await refresh();
      return res;
    },
    [actorId, litterId, refresh],
  );

  const bulkCreate = useCallback(async () => {
    if (!actorId) throw new Error('Not signed in.');
    const res = await bulkCreateLitterContracts(litterId, actorId);
    await refresh();
    return res;
  }, [actorId, litterId, refresh]);

  const sendEsign = useCallback(
    async (id: string) => {
      const res = await sendContractLink(id);
      if (res.error) throw new Error(res.error);
      await refresh();
      return res;
    },
    [refresh],
  );

  return { contracts, loading, error, createContract, bulkCreate, sendEsign, refresh };
}

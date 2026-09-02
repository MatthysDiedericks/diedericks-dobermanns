import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import type { ContractTemplate } from '@/types/kennel';

export type ContractRow = {
  id: string;
  contract_title: string | null;
  status: string | null;
  created_at: string;
  signed_by_client: boolean;
  signed_at: string | null;
  client_signed_at: string | null;
  client_signature_url: string | null;
  esign_token: string | null;
  esign_expires_at: string | null;
  body_html: string | null;
  dog_id: string | null;
  client_id: string | null;
  contact_id: string | null;
  client?: { full_name: string } | null;
  contact?: { full_name: string } | null;
  dog?: { name: string; released_at: string | null } | null;
};

export function useContracts() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const [tRes, cRes] = await Promise.all([
        supabase
          .from('contract_templates')
          .select('id, name, body_html, contract_title, created_at, updated_at')
          .order('name'),
        supabase
          .from('contracts')
          .select(
            'id, created_at, signed_at, client_signed_at, client_signature_url, signed_by_client, notes, dog_id, client_id, contact_id, document_url, contract_title, status, esign_token, esign_expires_at, body_html, ' +
              'client:users!contracts_client_id_fkey(full_name), ' +
              'contact:contacts!contracts_contact_id_fkey(full_name), ' +
              'dog:dogs!contracts_dog_id_fkey(name, released_at)',
          )
          .order('created_at', { ascending: false }),
      ]);
      if (tRes.error) throw new Error(tRes.error.message);
      if (cRes.error) throw new Error(cRes.error.message);
      setTemplates((tRes.data ?? []) as ContractTemplate[]);
      setContracts((cRes.data ?? []) as unknown as ContractRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendEsign = async (id: string) => {
    const { sendContractLink } = await import('@/lib/contracts/createDraft');
    const res = await sendContractLink(id);
    if (res.error) throw new Error(res.error);
    await refresh();
    return res;
  };

  return { contracts, templates, loading, error, refresh, sendEsign };
}

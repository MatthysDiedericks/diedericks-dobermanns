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
  client?: { full_name: string } | null;
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
            'id, created_at, signed_at, client_signed_at, client_signature_url, signed_by_client, notes, dog_id, client_id, document_url, contract_title, status, ' +
              'client:users!contracts_client_id_fkey(full_name), ' +
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
    const supabase = requireSupabase();
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();
    await supabase
      .from('contracts')
      .update({
        status: 'sent',
        esign_token: token,
        esign_expires_at: expires,
        esign_sent_at: new Date().toISOString(),
      })
      .eq('id', id);
    await refresh();
  };

  return { contracts, templates, loading, error, refresh, sendEsign };
}

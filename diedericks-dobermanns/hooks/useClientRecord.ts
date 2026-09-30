import { useCallback, useEffect, useState } from 'react';

import type { ClientRecord } from '@/lib/clients/clientRecord';
import { loadClientRecord } from '@/lib/clients/loadClientRecord';
import { requireSupabase } from '@/lib/supabase';

export function useClientRecord(contact: {
  id: string;
  email: string | null;
  userId: string | null;
}) {
  const [record, setRecord] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contact.id) return;
    setLoading(true);
    setError(null);
    try {
      const next = await loadClientRecord(
        requireSupabase(),
        { id: contact.id, email: contact.email, userId: contact.userId },
        {
          invoice: (id) => `/(admin)/finance/invoices/${id}`,
          dog: (id) => `/(admin)/dogs/${id}`,
          quote: (id) => `/(admin)/quotes/${id}`,
          application: (id) => `/(admin)/applications/${id}`,
          waitingList: (id) => `/(admin)/waitlist/${id}`,
        },
      );
      setRecord(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this client record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [contact.id, contact.email, contact.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { record, loading, error, refresh };
}

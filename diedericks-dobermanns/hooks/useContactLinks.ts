import { useCallback, useEffect, useState } from 'react';

import { fetchContactLinks, type ContactLinks } from '@/lib/contacts/links';

const EMPTY: ContactLinks = {
  quotes: [],
  invoices: [],
  contracts: [],
  dogs: [],
  applications: [],
};

export function useContactLinks(
  contactId: string,
  opts: { email: string | null; userId: string | null },
) {
  const [links, setLinks] = useState<ContactLinks>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
      setLinks(await fetchContactLinks(contactId, opts));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load linked records');
      setLinks(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [contactId, opts.email, opts.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { links, loading, error, refresh };
}

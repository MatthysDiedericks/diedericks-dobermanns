import { useCallback, useEffect, useState } from 'react';

import {
  fetchPortalMembers,
  type PortalMemberRow,
} from '@/lib/portal/members';
import { useAuthStore } from '@/stores/authStore';

export function usePortalMembers() {
  const holderId = useAuthStore((s) => s.session?.user.id);
  const [members, setMembers] = useState<PortalMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!holderId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setMembers(await fetchPortalMembers(holderId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load people on your portal.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { members, loading, error, refresh, holderId };
}

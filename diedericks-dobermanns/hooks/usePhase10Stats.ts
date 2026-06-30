import { useCallback, useEffect, useState } from 'react';

import { fetchPhase10DashboardStats } from '@/lib/phase10/queries';

export function usePhase10Stats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchPhase10DashboardStats>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchPhase10DashboardStats();
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

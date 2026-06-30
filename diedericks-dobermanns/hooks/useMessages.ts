import { useCallback, useEffect, useState } from 'react';

import { MOCK_BROADCASTS } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { BroadcastMessage } from '@/types/app.types';

/**
 * Broadcast messages the signed-in client can see (RLS limits these to groups
 * they belong to). Merges per-client read state and exposes an unread count for
 * the portal navigation badge.
 */
export function useClientMessages() {
  const profileId = useAuthStore((s) => s.profile?.id);
  const [data, setData] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setData(MOCK_BROADCASTS);
      setLoading(false);
      return;
    }
    const { data: msgs } = await supabase
      .from('broadcast_messages')
      .select('*, group:client_groups(*)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });

    let reads: { broadcast_id: string }[] = [];
    if (profileId) {
      const { data: r } = await supabase
        .from('broadcast_reads')
        .select('broadcast_id')
        .eq('client_id', profileId);
      reads = r ?? [];
    }
    const readSet = new Set(reads.map((x) => x.broadcast_id));
    const merged = ((msgs as BroadcastMessage[]) ?? []).map((m) => ({
      ...m,
      read_at: readSet.has(m.id) ? (m.read_at ?? new Date().toISOString()) : null,
    }));
    setData(merged);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = data.filter((m) => !m.read_at).length;
  return { data, unreadCount, loading, refetch: load };
}

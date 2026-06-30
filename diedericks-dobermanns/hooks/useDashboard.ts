import { useCallback, useEffect, useState } from 'react';

import { fetchAllDashboardData, completeTodoItem } from '@/lib/kennel/queries';
import { supabase } from '@/lib/supabase';

export function useDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAllDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllDashboardData();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'heat_cycles' }, () => refresh())
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [refresh]);

  const completeTodo = async (id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, todos: prev.todos.filter((t) => t.id !== id) };
    });
    try {
      await completeTodoItem(id);
    } catch {
      refresh();
    }
  };

  return { data, loading, error, refresh, completeTodo };
}

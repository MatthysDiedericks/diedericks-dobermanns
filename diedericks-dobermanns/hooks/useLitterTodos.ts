import { addDays, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

export interface LitterTodo {
  id: string;
  litter_id: string | null;
  dog_id: string | null;
  due_date: string | null;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
}

export async function seedLitterTodos(litterId: string, whelpDate: string) {
  if (!supabase) return;
  const base = parseISO(whelpDate.slice(0, 10));
  const templates = [
    { days: 14, title: 'Deworming #1', description: 'First deworming for all puppies' },
    { days: 28, title: 'Deworming #2', description: 'Second deworming for all puppies' },
    { days: 42, title: 'Deworming #3', description: 'Third deworming for all puppies' },
    { days: 49, title: 'First vaccination', description: 'First vaccination round' },
    { days: 63, title: 'Second vaccination', description: 'Second vaccination round' },
  ];
  const rows = templates.map((t) => ({
    litter_id: litterId,
    dog_id: null,
    due_date: addDays(base, t.days).toISOString().slice(0, 10),
    title: t.title,
    description: t.description,
  }));
  await requireSupabase().from('litter_todos').insert(rows);
}

export function useLitterTodos(litterId: string, showCompleted = true) {
  const [todos, setTodos] = useState<LitterTodo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setTodos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await requireSupabase()
      .from('litter_todos')
      .select('*')
      .eq('litter_id', litterId)
      .order('due_date');
    if (!error) setTodos((data ?? []) as LitterTodo[]);
    setLoading(false);
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => (showCompleted ? todos : todos.filter((t) => !t.completed)),
    [todos, showCompleted],
  );
  const litterTodos = filtered.filter((t) => !t.dog_id);
  const puppyTodos = filtered.filter((t) => t.dog_id);

  const toggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const { error } = await requireSupabase()
        .from('litter_todos')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
      await refresh();
    },
    [refresh],
  );

  const addTodo = useCallback(
    async (payload: {
      dog_id?: string | null;
      due_date?: string;
      title: string;
      description?: string;
    }) => {
      const { error } = await requireSupabase().from('litter_todos').insert({
        litter_id: litterId,
        ...payload,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [litterId, refresh],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      const { error } = await requireSupabase().from('litter_todos').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await refresh();
    },
    [refresh],
  );

  return { todos: filtered, litterTodos, puppyTodos, loading, refresh, toggleComplete, addTodo, deleteTodo };
}

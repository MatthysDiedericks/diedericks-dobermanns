import { useCallback, useEffect, useState } from 'react';

import { completeTodoItem } from '@/lib/kennel/queries';
import { requireSupabase } from '@/lib/supabase';
import type { TodoItemWithLinks } from '@/types/kennel';

export function useTodos() {
  const [todos, setTodos] = useState<TodoItemWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('todo_items')
        .select(
          'id, title, due_date, is_completed, priority, category, dog_id, litter_id, litter:litters(litter_letter, mother:dogs!litters_mother_id_fkey(name)), dog:dogs(name)',
        )
        .eq('is_completed', false)
        .order('due_date', { ascending: true });
      if (err) throw new Error(err.message);
      setTodos(
        (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          const litter = r.litter as { litter_letter: string | null; mother?: { name: string } | null } | null;
          const dog = r.dog as { name: string } | null;
          const litter_label = litter
            ? `🐾 ${litter.mother?.name ?? 'Dam'}: Litter ${litter.litter_letter ?? '?'}`
            : null;
          return { ...(r as unknown as TodoItemWithLinks), litter_label, dog_name: dog?.name };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load todos');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completeTodo = async (id: string) => {
    setTodos((prev) => prev.filter((i) => i.id !== id));
    await completeTodoItem(id);
  };

  const addTodo = async (title: string, dueDate: string | null) => {
    const supabase = requireSupabase();
    await supabase.from('todo_items').insert({
      title: title.trim(),
      due_date: dueDate || null,
      category: 'general',
      priority: 'normal',
    });
    await refresh();
  };

  return { todos, loading, error, refresh, completeTodo, addTodo };
}

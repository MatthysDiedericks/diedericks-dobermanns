import { useCallback, useEffect, useState } from 'react';

import { Config } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

export type LitterCalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  notes: string | null;
  dog_id: string | null;
  is_completed: boolean;
};

export type AddLitterEventInput = {
  title: string;
  event_type: string;
  event_date: string;
  notes?: string;
  dog_id?: string | null;
};

const EVENT_SELECT =
  'id, title, event_type, event_date, notes, dog_id, is_completed';

type CalendarEventsQuery = {
  eq: (column: string, value: string) => CalendarEventsQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

async function fetchByLitterId(litterId: string): Promise<LitterCalendarEvent[]> {
  const supabase = requireSupabase();
  const { data, error } = await (
    supabase.from('calendar_events').select(EVENT_SELECT) as unknown as CalendarEventsQuery
  )
    .eq('litter_id', litterId)
    .order('event_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LitterCalendarEvent[];
}

async function fetchByPuppyIds(puppyIds: string[]): Promise<LitterCalendarEvent[]> {
  if (puppyIds.length === 0) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('calendar_events')
    .select(EVENT_SELECT)
    .in('dog_id', puppyIds)
    .order('event_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LitterCalendarEvent[];
}

export function useLitterCalendar(litterId: string, puppyIds: string[]) {
  const [events, setEvents] = useState<LitterCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Config.isDemoMode) {
        setEvents([]);
        setLoading(false);
        return;
      }
      const merged = new Map<string, LitterCalendarEvent>();

      try {
        const byLitter = await fetchByLitterId(litterId);
        byLitter.forEach((e) => merged.set(e.id, e));
      } catch {
        /* litter_id column may not exist yet — fall back to puppy query */
      }

      if (puppyIds.length > 0) {
        const byDog = await fetchByPuppyIds(puppyIds);
        byDog.forEach((e) => merged.set(e.id, e));
      }

      setEvents(
        [...merged.values()].sort((a, b) => a.event_date.localeCompare(b.event_date)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [litterId, puppyIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEvent = useCallback(
    async (input: AddLitterEventInput) => {
      const supabase = requireSupabase();
      const row: TablesInsert<'calendar_events'> & { litter_id?: string } = {
        title: input.title.trim(),
        event_type: input.event_type,
        event_date: input.event_date,
        notes: input.notes?.trim() || null,
        dog_id: input.dog_id ?? null,
        litter_id: litterId,
        is_completed: false,
      };
      const { error: err } = await supabase.from('calendar_events').insert(row as TablesInsert<'calendar_events'>);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [litterId, refresh],
  );

  return { events, loading, error, addEvent, refresh };
}

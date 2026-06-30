import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { subscribeCalendarRefresh } from '@/lib/calendar/refresh';
import { CALENDAR_EVENT_SELECT, EVENT_TYPE_COLORS } from '@/lib/health/constants';
import { requireSupabase } from '@/lib/supabase';
import type { CalendarEvent, CalendarViewMode } from '@/types/phase10';

const VIEW_KEY = 'calendar_view_mode';

const CALENDAR_EVENT_SELECT_FALLBACK =
  'id, title, event_type, event_date, end_date, dog_id, is_completed, is_reminder, notes, source_table, source_id';

function bookingColor(status: string): string {
  if (status === 'confirmed') return '#C4A35A';
  if (status === 'completed') return '#4CAF50';
  return '#F5A623';
}

function eventColour(type: string, predicted?: boolean): string {
  if (type === 'heat' && predicted) return EVENT_TYPE_COLORS.heat_predicted;
  if (type === 'heat_predicted') return EVENT_TYPE_COLORS.heat_predicted;
  if (type === 'heat' || type === 'heat_confirmed') return EVENT_TYPE_COLORS.heat;
  return EVENT_TYPE_COLORS[type] ?? '#C4A35A';
}

function mapCalendarRow(row: Record<string, unknown>): CalendarEvent {
  const type = String(row.event_type ?? 'todo');
  const predicted = type.includes('predicted');
  let route: string | undefined;
  let params: Record<string, string> | undefined;

  if (row.source_table === 'vaccinations' && row.source_id) {
    route = '/(tabs)/health/vaccinations/[id]';
    params = { id: String(row.source_id) };
  } else if (row.source_table === 'vet_visits' && row.source_id) {
    route = '/(tabs)/health/vet-visits/[id]';
    params = { id: String(row.source_id) };
  } else if (row.dog_id) {
    route = '/(admin)/dogs/[id]/index';
    params = { id: String(row.dog_id) };
  }

  const dogs = row.dogs as { name?: string } | null;
  const title = String(row.title ?? dogs?.name ?? type);

  return {
    id: String(row.id),
    date: String(row.event_date).slice(0, 10),
    type: type as CalendarEvent['type'],
    colour: eventColour(type, predicted),
    title,
    route,
    params,
    allDay: true,
  };
}

async function loadFallbackEvents(monthStart: string, monthEnd: string): Promise<CalendarEvent[]> {
  const supabase = requireSupabase();
  const [litters, heats, vets, vacs, deworm, todos, training] = await Promise.all([
    supabase
      .from('litters')
      .select('id, name, actual_date, go_home_date')
      .or(`actual_date.gte.${monthStart},go_home_date.gte.${monthStart}`),
    supabase
      .from('heat_cycles')
      .select('id, dog_id, heat_start_date, mating_date, expected_whelp_date, is_predicted, status')
      .gte('heat_start_date', monthStart)
      .lte('heat_start_date', monthEnd),
    supabase
      .from('vet_visits')
      .select('id, dog_id, visit_date, reason, next_due_date, follow_up_date')
      .or(`visit_date.gte.${monthStart},next_due_date.gte.${monthStart},follow_up_date.gte.${monthStart}`),
    supabase
      .from('vaccinations')
      .select('id, dog_id, vaccine_name, next_due_date')
      .gte('next_due_date', monthStart)
      .lte('next_due_date', monthEnd),
    supabase
      .from('deworming_records')
      .select('id, next_due_date, product_name, treatment_type')
      .gte('next_due_date', monthStart)
      .lte('next_due_date', monthEnd),
    supabase
      .from('todo_items')
      .select('id, title, due_date, is_completed')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .eq('is_completed', false),
    supabase
      .from('training_bookings')
      .select('id, scheduled_at, status, session_format, client_id, dog_id, session_type:training_session_types(name)')
      .neq('status', 'cancelled')
      .gte('scheduled_at', `${monthStart}T00:00:00`)
      .lte('scheduled_at', `${monthEnd}T23:59:59`),
  ]);

  const merged: CalendarEvent[] = [];

  (litters.data ?? []).forEach((l) => {
    if (l.actual_date) {
      merged.push({
        id: `lb-${l.id}`,
        date: l.actual_date,
        type: 'whelping',
        colour: EVENT_TYPE_COLORS.whelping,
        title: `Litter born: ${l.name ?? 'Litter'}`,
        route: '/(tabs)/dogs/litters/[id]',
        params: { id: l.id },
        allDay: true,
      });
    }
    if (l.go_home_date) {
      merged.push({
        id: `lg-${l.id}`,
        date: l.go_home_date,
        type: 'go_home',
        colour: EVENT_TYPE_COLORS.go_home,
        title: `Go home: ${l.name ?? 'Litter'}`,
        route: '/(tabs)/dogs/litters/[id]',
        params: { id: l.id },
        allDay: true,
      });
    }
  });

  (heats.data ?? []).forEach((h) => {
    const d = h.expected_whelp_date ?? h.heat_start_date;
    if (!d || d < monthStart || d > monthEnd) return;
    const predicted = Boolean(h.is_predicted);
    merged.push({
      id: `heat-${h.id}`,
      date: d,
      type: 'heat',
      colour: predicted ? EVENT_TYPE_COLORS.heat_predicted : EVENT_TYPE_COLORS.heat,
      title: predicted ? 'Predicted heat' : 'Heat cycle',
      route: '/(admin)/heats/[dogId]/index',
      params: { dogId: h.dog_id },
      allDay: true,
    });
  });

  (vets.data ?? []).forEach((v) => {
    const dates = [v.visit_date?.slice(0, 10), v.next_due_date, v.follow_up_date?.slice(0, 10)].filter(
      Boolean,
    ) as string[];
    for (const date of dates) {
      if (date < monthStart || date > monthEnd) continue;
      merged.push({
        id: `vet-${v.id}-${date}`,
        date,
        type: 'vet_visit',
        colour: EVENT_TYPE_COLORS.vet_visit,
        title: v.reason ?? 'Vet visit',
        route: '/(tabs)/health/vet-visits/[id]',
        params: { id: v.id },
        allDay: true,
      });
    }
  });

  (vacs.data ?? []).forEach((v) => {
    if (v.next_due_date) {
      merged.push({
        id: `vac-${v.id}`,
        date: v.next_due_date,
        type: 'vaccination',
        colour: EVENT_TYPE_COLORS.vaccination,
        title: v.vaccine_name,
        route: '/(tabs)/health/vaccinations/[id]',
        params: { id: v.id },
        allDay: true,
      });
    }
  });

  (deworm.data ?? []).forEach((d) => {
    if (d.next_due_date) {
      const type = d.treatment_type === 'tick_flea' ? 'tick_flea' : 'deworming';
      merged.push({
        id: `dew-${d.id}`,
        date: d.next_due_date,
        type,
        colour: EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.deworming,
        title: d.product_name ?? 'Treatment due',
        allDay: true,
      });
    }
  });

  (todos.data ?? []).forEach((t) => {
    if (t.due_date) {
      const overdue = t.due_date < new Date().toISOString().slice(0, 10);
      merged.push({
        id: `todo-${t.id}`,
        date: t.due_date,
        type: 'todo',
        colour: overdue ? '#EF4444' : '#F5F0E8',
        title: t.title,
        allDay: true,
      });
    }
  });

  (training.data ?? []).forEach((b) => {
    const stype = b.session_type as { name?: string } | null;
    merged.push({
      id: `booking-${b.id}`,
      date: b.scheduled_at.slice(0, 10),
      type: 'training',
      colour: bookingColor(b.status),
      title: stype?.name ?? 'Training Session',
      route: '/(admin)/training/[id]',
      params: { id: b.id },
      allDay: false,
    });
  });

  return merged;
}

export function useCalendarViewMode() {
  const [mode, setMode] = useState<CalendarViewMode>('month');

  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY).then((v) => {
      if (v === 'day' || v === 'week' || v === 'month' || v === 'year') setMode(v);
    });
  }, []);

  const setPersisted = async (m: CalendarViewMode) => {
    setMode(m);
    await AsyncStorage.setItem(VIEW_KEY, m);
  };

  return { mode, setMode: setPersisted };
}

export function useCalendarEvents(monthStart: string, monthEnd: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const byId = new Map<string, CalendarEvent>();

      let calData = null;
      let calErr = null;
      ({ data: calData, error: calErr } = await supabase
        .from('calendar_events')
        .select(CALENDAR_EVENT_SELECT)
        .eq('is_completed', false)
        .gte('event_date', monthStart)
        .lte('event_date', monthEnd)
        .order('event_date', { ascending: true }));

      if (calErr) {
        ({ data: calData, error: calErr } = await supabase
          .from('calendar_events')
          .select(CALENDAR_EVENT_SELECT_FALLBACK)
          .eq('is_completed', false)
          .gte('event_date', monthStart)
          .lte('event_date', monthEnd)
          .order('event_date', { ascending: true }));
      }

      if (calErr && __DEV__) console.warn('[calendar_events]', calErr.message);

      if (!calErr && calData) {
        for (const row of calData) {
          const ev = mapCalendarRow(row as Record<string, unknown>);
          byId.set(ev.id, ev);
        }
      }

      const fallback = await loadFallbackEvents(monthStart, monthEnd);
      for (const ev of fallback) {
        if (!byId.has(ev.id)) byId.set(ev.id, ev);
      }

      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setEvents(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeCalendarRefresh(() => void load()), [load]);

  return { events, loading, error, refresh: load };
}

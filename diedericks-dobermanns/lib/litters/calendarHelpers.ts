export const LITTER_EVENT_TYPES = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'weigh_day', label: 'Weigh Day' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'handover', label: 'Handover' },
  { value: 'other', label: 'Other' },
] as const;

export function litterEventTypeLabel(type: string): string {
  return LITTER_EVENT_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function formatLitterEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isEventOverdue(eventDate: string, isCompleted: boolean): boolean {
  if (isCompleted) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(eventDate).getTime() < today.getTime();
}

/** Monday of the week containing `iso` (YYYY-MM-DD). */
export function weekGroupKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function formatWeekLabel(mondayIso: string): string {
  const start = new Date(mondayIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `Week of ${fmt(start)} – ${fmt(end)}`;
}

export function groupEventsByWeek<T extends { event_date: string }>(
  events: T[],
): { week: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const e of events) {
    const key = weekGroupKey(e.event_date);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, items]) => ({
      week,
      label: formatWeekLabel(week),
      items: items.sort((a, b) => a.event_date.localeCompare(b.event_date)),
    }));
}

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEWORMING_SELECT, VACCINATION_SELECT } from '@/lib/health/constants';
import { requireSupabase, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface HealthScheduleEntry {
  id: string;
  dogId: string;
  dogName: string;
  kind: 'vaccination' | 'deworming';
  title: string;
  eventDate: string;
  nextDueDate: string | null;
  isUpcoming: boolean;
  isOverdue: boolean;
  notes: string | null;
}

function isOverdue(nextDue: string | null): boolean {
  if (!nextDue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function isFuture(nextDue: string | null): boolean {
  if (!nextDue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  return due.getTime() >= today.getTime();
}

/**
 * Vaccination and deworming schedule for dogs owned by the logged-in client.
 */
export function useDogHealthSchedule() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [entries, setEntries] = useState<HealthScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !supabase) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data: dogs, error: dErr } = await client
        .from('dogs')
        .select('id, name')
        .eq('owner_id', userId);
      if (dErr) throw new Error(dErr.message);
      const owned = dogs ?? [];
      if (owned.length === 0) {
        setEntries([]);
        return;
      }

      const dogIds = owned.map((d) => d.id);
      const nameById = new Map(owned.map((d) => [d.id, d.name]));

      const [vRes, dewRes] = await Promise.all([
        client
          .from('vaccinations')
          .select(VACCINATION_SELECT)
          .in('dog_id', dogIds)
          .order('date_administered', { ascending: false }),
        client
          .from('deworming_records')
          .select(DEWORMING_SELECT)
          .order('date_treated', { ascending: false }),
      ]);
      if (vRes.error) throw new Error(vRes.error.message);
      if (dewRes.error) throw new Error(dewRes.error.message);

      const rows: HealthScheduleEntry[] = [];

      for (const raw of vRes.data ?? []) {
        const r = raw as Record<string, unknown>;
        const dogId = r.dog_id as string;
        const nextDue = (r.next_due_date as string | null) ?? null;
        rows.push({
          id: `vax-${r.id}`,
          dogId,
          dogName: nameById.get(dogId) ?? 'Your dog',
          kind: 'vaccination',
          title: String(r.vaccine_name ?? 'Vaccination'),
          eventDate: String(r.date_administered),
          nextDueDate: nextDue,
          isUpcoming: isFuture(nextDue),
          isOverdue: isOverdue(nextDue),
          notes: (r.notes as string | null) ?? null,
        });
      }

      for (const raw of dewRes.data ?? []) {
        const r = raw as Record<string, unknown>;
        const ids = (r.dog_ids as string[] | null) ?? [];
        const dogId = ids.find((id) => dogIds.includes(id));
        if (!dogId) continue;
        const nextDue = (r.next_due_date as string | null) ?? null;
        rows.push({
          id: `dew-${r.id}`,
          dogId,
          dogName: nameById.get(dogId) ?? 'Your dog',
          kind: 'deworming',
          title: String(r.product_name ?? r.treatment_type ?? 'Deworming'),
          eventDate: String(r.date_treated),
          nextDueDate: nextDue,
          isUpcoming: isFuture(nextDue),
          isOverdue: isOverdue(nextDue),
          notes: (r.notes as string | null) ?? null,
        });
      }

      rows.sort((a, b) => {
        const aKey = a.nextDueDate ?? a.eventDate;
        const bKey = b.nextDueDate ?? b.eventDate;
        return aKey.localeCompare(bKey);
      });
      setEntries(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health schedule');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byDog = useMemo(() => {
    const map = new Map<string, { dogName: string; entries: HealthScheduleEntry[] }>();
    for (const e of entries) {
      const group = map.get(e.dogId) ?? { dogName: e.dogName, entries: [] };
      group.entries.push(e);
      map.set(e.dogId, group);
    }
    return Array.from(map.entries()).map(([dogId, g]) => ({ dogId, ...g }));
  }, [entries]);

  const upcoming = useMemo(() => entries.filter((e) => e.isUpcoming || e.isOverdue), [entries]);

  return { entries, byDog, upcoming, loading, error, refresh };
}

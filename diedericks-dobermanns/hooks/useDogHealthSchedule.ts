import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  dewormingGroupKey,
  dueFlags,
  healthDueItems,
  latestPerGroup,
  vaccinationGroupKey,
} from '@/lib/dogs/healthCalendar';
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

const VAX_SELECT =
  'id, dog_id, vaccine_name, date_administered, next_due_date, notes';
const WORM_SELECT =
  'id, dog_id, product_name, treatment_date, next_due_date, treatment_type, notes';

/**
 * Vaccination and deworming schedule for dogs owned by the logged-in client.
 * Due flags use the same `latestPerGroup` + `dueFlags` as the website.
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
          .select(VAX_SELECT)
          .in('dog_id', dogIds)
          .order('date_administered', { ascending: false }),
        client
          .from('deworming_records')
          .select(WORM_SELECT)
          .in('dog_id', dogIds)
          .order('treatment_date', { ascending: false }),
      ]);
      if (vRes.error) throw new Error(vRes.error.message);
      if (dewRes.error) throw new Error(dewRes.error.message);

      const vaccinations = vRes.data ?? [];
      const deworming = dewRes.data ?? [];
      const latestVax = new Set(
        latestPerGroup(
          vaccinations,
          (r) => `${r.dog_id}::${vaccinationGroupKey(r.vaccine_name)}`,
          (r) => r.date_administered,
        ).map((r) => r.id),
      );
      const latestWorm = new Set(
        latestPerGroup(
          deworming,
          (r) => `${r.dog_id}::${dewormingGroupKey(r.treatment_type)}`,
          (r) => r.treatment_date,
        ).map((r) => r.id),
      );

      const rows: HealthScheduleEntry[] = [];

      for (const r of vaccinations) {
        const flags = latestVax.has(r.id)
          ? dueFlags(r.next_due_date)
          : { isOverdue: false, isUpcoming: false };
        rows.push({
          id: `vax-${r.id}`,
          dogId: r.dog_id,
          dogName: nameById.get(r.dog_id) ?? 'Your dog',
          kind: 'vaccination',
          title: String(r.vaccine_name ?? 'Vaccination'),
          eventDate: String(r.date_administered),
          nextDueDate: r.next_due_date,
          isUpcoming: flags.isUpcoming,
          isOverdue: flags.isOverdue,
          notes: r.notes ?? null,
        });
      }

      for (const r of deworming) {
        const flags = latestWorm.has(r.id)
          ? dueFlags(r.next_due_date)
          : { isOverdue: false, isUpcoming: false };
        rows.push({
          id: `dew-${r.id}`,
          dogId: r.dog_id,
          dogName: nameById.get(r.dog_id) ?? 'Your dog',
          kind: 'deworming',
          title: String(r.product_name ?? 'Deworming'),
          eventDate: String(r.treatment_date),
          nextDueDate: r.next_due_date,
          isUpcoming: flags.isUpcoming,
          isOverdue: flags.isOverdue,
          notes: r.notes ?? null,
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

  const upcoming = useMemo(() => healthDueItems(entries), [entries]);

  return { entries, byDog, upcoming, loading, error, refresh };
}

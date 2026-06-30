import { useCallback, useEffect, useMemo, useState } from 'react';

import { matchesDogSearch } from '@/lib/dogs/search';
import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';
import { daysUntil } from '@/lib/heats/calculations';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';
import type { DogFilterTab } from '@/types/phase10';

const DOG_SELECT =
  'id, name, call_name, breed, colour, sex, status, date_of_birth, microchip_number, updated_at, dog_media(url, is_primary)';

export interface KennelDog extends Dog {
  inHeat?: boolean;
}

export interface ExpectingDogEntry {
  dog: KennelDog;
  matingDate: string;
  sireName: string | null;
  whelpEarliest: string;
  whelpExpected: string;
  whelpLatest: string;
  daysUntilWhelp: number;
  goHomeEarliest: string;
  goHomeStandard: string;
  goHomeLatest: string;
}

export interface BreedingStockSections {
  studs: KennelDog[];
  females: KennelDog[];
}

function mapDogRow(row: Record<string, unknown>): KennelDog {
  const mediaRaw = (row.dog_media as { url: string; is_primary: boolean }[] | null) ?? [];
  const media = mediaRaw.map((m, i) => ({
    id: `${row.id}-${i}`,
    dog_id: row.id as string,
    type: 'photo' as const,
    url: m.url,
    thumbnail_url: null,
    caption: null,
    is_primary: m.is_primary,
    sort_order: i,
    uploaded_at: '',
  }));
  return { ...(row as unknown as KennelDog), media };
}

export function useKennelDogs(filter: DogFilterTab = 'breeding', search = '') {
  const role = useAuthStore((s) => s.profile?.role);
  const [breedingStock, setBreedingStock] = useState<BreedingStockSections>({
    studs: [],
    females: [],
  });
  const [expecting, setExpecting] = useState<ExpectingDogEntry[]>([]);
  const [deceased, setDeceased] = useState<KennelDog[]>([]);
  const [alumni, setAlumni] = useState<KennelDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();

      if (filter === 'breeding') {
        const { data: rows, error: err } = await supabase
          .from('dogs')
          .select(DOG_SELECT)
          .in('status', ['keep', 'stud', 'breeding_stock'])
          .order('name');
        if (err) throw new Error(err.message);

        const dogs = (rows ?? []).map((r) => mapDogRow(r as Record<string, unknown>));
        const femaleIds = dogs
          .filter(
            (d) =>
              d.sex === 'female' &&
              (d.status === 'keep' || d.status === 'breeding_stock'),
          )
          .map((d) => d.id);

        let inHeatIds = new Set<string>();
        if (femaleIds.length > 0) {
          const { data: heats } = await supabase
            .from('heat_cycles')
            .select('dog_id')
            .in('dog_id', femaleIds)
            .eq('is_predicted', false)
            .in('status', ['active', 'in_heat']);
          inHeatIds = new Set((heats ?? []).map((h) => h.dog_id));
        }

        const withHeat = dogs.map((d) => ({
          ...d,
          inHeat: inHeatIds.has(d.id),
        }));

        setBreedingStock({
          studs: withHeat
            .filter(
              (d) =>
                d.status === 'stud' ||
                (d.sex === 'male' && (d.status === 'keep' || d.status === 'breeding_stock')),
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
          females: withHeat
            .filter(
              (d) =>
                d.sex === 'female' &&
                (d.status === 'keep' || d.status === 'breeding_stock'),
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        });
        return;
      }

      if (filter === 'expecting') {
        const { data: rows, error: err } = await supabase
          .from('heat_cycles')
          .select(
            `id, mating_date, expected_whelp_date, ovulation_date, status, dog_id,
            dog:dogs!inner(${DOG_SELECT}),
            sire:dogs!heat_cycles_sire_id_fkey(name)`,
          )
          .not('mating_date', 'is', null)
          .is('actual_whelp_date', null)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'skipped')
          .order('mating_date', { ascending: false });
        if (err) throw new Error(err.message);

        const byDog = new Map<string, ExpectingDogEntry>();
        for (const row of rows ?? []) {
          const r = row as Record<string, unknown>;
          const dogRow = r.dog as Record<string, unknown> | null;
          if (!dogRow) continue;
          const dogId = dogRow.id as string;
          if (byDog.has(dogId)) continue;

          const matingDate = r.mating_date as string;
          const ovulation = r.ovulation_date as string | null;
          const expectedWhelp = r.expected_whelp_date as string | null;
          const window = whelpWindow(ovulation, matingDate, expectedWhelp);
          const goHome = goHomeWindow(window.expected);
          const sire = r.sire as { name: string } | null;

          byDog.set(dogId, {
            dog: mapDogRow(dogRow),
            matingDate,
            sireName: sire?.name ?? null,
            whelpEarliest: window.earliest,
            whelpExpected: window.expected,
            whelpLatest: window.latest,
            daysUntilWhelp: daysUntil(window.earliest) ?? 0,
            goHomeEarliest: goHome.earliest,
            goHomeStandard: goHome.standard,
            goHomeLatest: goHome.latest,
          });
        }
        setExpecting(Array.from(byDog.values()).sort((a, b) => a.dog.name.localeCompare(b.dog.name)));
        return;
      }

      if (filter === 'deceased') {
        const { data: rows, error: err } = await supabase
          .from('dogs')
          .select(DOG_SELECT)
          .eq('status', 'deceased')
          .order('name');
        if (err) throw new Error(err.message);
        setDeceased((rows ?? []).map((r) => mapDogRow(r as Record<string, unknown>)));
        return;
      }

      const { data: rows, error: err } = await supabase
        .from('dogs')
        .select(DOG_SELECT)
        .in('status', ['sold', 'retired', 'donated', 'gifted'])
        .order('name');
      if (err) throw new Error(err.message);
      setAlumni((rows ?? []).map((r) => mapDogRow(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dogs');
      setBreedingStock({ studs: [], females: [] });
      setExpecting([]);
      setDeceased([]);
      setAlumni([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredBreeding = useMemo(() => {
    const studs = breedingStock.studs.filter((d) => matchesDogSearch(d, search));
    const females = breedingStock.females.filter((d) => matchesDogSearch(d, search));
    return { studs, females };
  }, [breedingStock, search]);

  const filteredExpecting = useMemo(
    () => expecting.filter((e) => matchesDogSearch(e.dog, search)),
    [expecting, search],
  );

  const filteredDeceased = useMemo(
    () => deceased.filter((d) => matchesDogSearch(d, search)),
    [deceased, search],
  );

  const filteredAlumni = useMemo(
    () => alumni.filter((d) => matchesDogSearch(d, search)),
    [alumni, search],
  );

  const totalCount = useMemo(() => {
    if (filter === 'breeding') {
      return filteredBreeding.studs.length + filteredBreeding.females.length;
    }
    if (filter === 'expecting') return filteredExpecting.length;
    if (filter === 'deceased') return filteredDeceased.length;
    return filteredAlumni.length;
  }, [filter, filteredBreeding, filteredExpecting, filteredDeceased, filteredAlumni]);

  return {
    filter,
    breedingStock: filteredBreeding,
    expecting: filteredExpecting,
    deceased: filteredDeceased,
    alumni: filteredAlumni,
    totalCount,
    loading,
    error,
    refresh,
    role,
  };
}

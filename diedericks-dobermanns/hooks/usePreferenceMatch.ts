import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_DOGS, MOCK_WAITING_LIST } from '@/lib/mockData';
import {
  isMatchableDogStatus,
  rankBuyersForDog,
  rankDogsForBuyer,
  type MatchableDog,
} from '@/lib/waitlist/matching';
import { supabase } from '@/lib/supabase';
import { filterWaitlistEntries, useWaitingList } from '@/hooks/useWaitingList';
import type { Dog, WaitingListEntry } from '@/types/app.types';

export function usePreferenceMatch() {
  const { data: entries } = useWaitingList();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'dog' | 'buyer'>('dog');

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setDogs(MOCK_DOGS.filter((d) => isMatchableDogStatus(d.status)));
        return;
      }
      const { data } = await supabase
        .from('dogs')
        .select(
          'id, name, breed, colour, sex, status, category, programme_tier, date_of_birth, litter_id, tail_type',
        )
        .in('status', ['available', 'puppy'])
        .order('name');
      setDogs((data ?? []) as Dog[]);
    })();
  }, []);

  const selectedDog = dogs.find((d) => d.id === selectedDogId) ?? null;
  const matchable = useMemo(
    () => filterWaitlistEntries(entries.length ? entries : MOCK_WAITING_LIST, { excludeDoNotSell: true }),
    [entries],
  );
  const selectedBuyer =
    matchable.find((e) => e.id === selectedBuyerId) ?? (null as WaitingListEntry | null);

  const results = useMemo(() => {
    if (!selectedDog) return [];
    const dog: MatchableDog = {
      id: selectedDog.id,
      name: selectedDog.name,
      sex: selectedDog.sex,
      colour: selectedDog.colour,
      status: selectedDog.status,
      programme_tier: selectedDog.programme_tier,
      category: selectedDog.category,
      tail_type: selectedDog.tail_type ?? null,
    };
    return rankBuyersForDog(matchable, dog);
  }, [matchable, selectedDog]);

  const buyerResults = useMemo(() => {
    if (!selectedBuyer) return [];
    const dogRows: MatchableDog[] = dogs.map((d) => ({
      id: d.id,
      name: d.name,
      sex: d.sex,
      colour: d.colour,
      status: d.status,
      programme_tier: d.programme_tier,
      category: d.category,
      tail_type: d.tail_type ?? null,
    }));
    return rankDogsForBuyer(selectedBuyer, dogRows);
  }, [dogs, selectedBuyer]);

  const selectDog = useCallback((id: string | null) => setSelectedDogId(id), []);
  const selectBuyer = useCallback((id: string | null) => setSelectedBuyerId(id), []);

  return {
    dogs,
    selectedDog,
    selectedDogId,
    selectDog,
    results,
    matchable,
    mode,
    setMode,
    selectedBuyer,
    selectedBuyerId,
    selectBuyer,
    buyerResults,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_DOGS, MOCK_WAITING_LIST } from '@/lib/mockData';
import { rankMatches } from '@/lib/waitlist/matching';
import { supabase } from '@/lib/supabase';
import { filterWaitlistEntries, useWaitingList } from '@/hooks/useWaitingList';
import type { Dog } from '@/types/app.types';

export function usePreferenceMatch() {
  const { data: entries } = useWaitingList();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setDogs(MOCK_DOGS.filter((d) => d.status === 'available' || d.status === 'reserved'));
        return;
      }
      const { data } = await supabase
        .from('dogs')
        .select('id, name, breed, colour, sex, status, category, date_of_birth')
        .in('status', ['available', 'reserved', 'puppy'])
        .order('name');
      setDogs((data ?? []) as Dog[]);
    })();
  }, []);

  const selectedDog = dogs.find((d) => d.id === selectedDogId) ?? null;
  const matchable = useMemo(
    () => filterWaitlistEntries(entries.length ? entries : MOCK_WAITING_LIST, { excludeDoNotSell: true }),
    [entries],
  );

  const results = useMemo(() => {
    if (!selectedDog) return [];
    return rankMatches(matchable, selectedDog);
  }, [matchable, selectedDog]);

  const selectDog = useCallback((id: string | null) => setSelectedDogId(id), []);

  return { dogs, selectedDog, selectedDogId, selectDog, results };
}

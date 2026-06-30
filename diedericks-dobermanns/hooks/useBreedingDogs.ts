import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

export interface BreedingDog {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  registration_number: string | null;
}

export function useBreedingDogs() {
  const [dogs, setDogs] = useState<BreedingDog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from('dogs')
        .select('id, name, sex, colour, registration_number')
        .not('status', 'eq', 'puppy')
        .not('status', 'eq', 'sold')
        .eq('is_public', false)
        .order('name');
      if (error) throw error;
      setDogs((data ?? []) as BreedingDog[]);
    } catch {
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const females = dogs.filter((d) => d.sex === 'female' || d.sex === 'F');
  const males = dogs.filter((d) => d.sex === 'male' || d.sex === 'M');

  return { females, males, loading };
}

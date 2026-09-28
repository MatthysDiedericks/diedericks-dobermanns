import { useCallback, useEffect, useState } from 'react';

import {
  MY_DOGS_STATUSES,
  toKennelCard,
  type KennelCard,
  type KennelHeatCycle,
} from '@/lib/dogs/kennel';
import { PROFILE_PHOTO_EMBED, type ProfilePhotoInput } from '@/lib/dogs/profilePhoto';
import type { ProgenyDogRow } from '@/lib/dogs/progenySummary';
import { requireSupabase } from '@/lib/supabase';

const DOG_COLUMNS = `
  id, name, call_name, registered_name, sex, status, date_of_birth,
  microchip_number, colour, collar_colour, registration_number,
  deceased_at, outcome_date,
  dog_media!dog_media_dog_id_fkey(${PROFILE_PHOTO_EMBED})
`;

type DogRow = {
  id: string;
  name: string;
  call_name: string | null;
  registered_name: string | null;
  sex: string | null;
  status: string;
  date_of_birth: string | null;
  microchip_number: string | null;
  colour: string | null;
  collar_colour: string | null;
  registration_number: string | null;
  deceased_at: string | null;
  outcome_date: string | null;
  dog_media: ProfilePhotoInput[] | ProfilePhotoInput | null;
};

type HeatRow = KennelHeatCycle & { dog_id: string };
type PupRow = ProgenyDogRow & { father_id: string | null };

function asMedia(value: DogRow['dog_media']): ProfilePhotoInput[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

export function useMyDogs() {
  const [cards, setCards] = useState<KennelCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: dogsError } = await supabase
        .from('dogs')
        .select(DOG_COLUMNS)
        .in('status', [...MY_DOGS_STATUSES]);
      if (dogsError) throw new Error(dogsError.message);

      const dogs = (data ?? []) as unknown as DogRow[];
      const femaleIds = dogs.filter((dog) => dog.sex === 'female').map((dog) => dog.id);
      const maleIds = dogs.filter((dog) => dog.sex === 'male').map((dog) => dog.id);
      const now = new Date();

      const [heats, pups] = await Promise.all([
        femaleIds.length
          ? supabase
              .from('heat_cycles')
              .select('dog_id, heat_start_date, is_predicted, predicted_next_heat_date')
              .in('dog_id', femaleIds)
          : Promise.resolve({ data: [] as HeatRow[], error: null }),
        maleIds.length
          ? supabase
              .from('dogs')
              .select('id, sex, date_of_birth, litter_id, father_id')
              .in('father_id', maleIds)
          : Promise.resolve({ data: [] as PupRow[], error: null }),
      ]);
      if (heats.error) throw new Error(heats.error.message);
      if (pups.error) throw new Error(pups.error.message);

      const heatsByDog = new Map<string, KennelHeatCycle[]>();
      for (const row of (heats.data ?? []) as HeatRow[]) {
        const list = heatsByDog.get(row.dog_id) ?? [];
        list.push(row);
        heatsByDog.set(row.dog_id, list);
      }
      const pupsByFather = new Map<string, ProgenyDogRow[]>();
      for (const row of (pups.data ?? []) as PupRow[]) {
        if (!row.father_id) continue;
        const list = pupsByFather.get(row.father_id) ?? [];
        list.push(row);
        pupsByFather.set(row.father_id, list);
      }

      setCards(
        dogs.map((dog) =>
          toKennelCard({
            now,
            dog: { ...dog, media: asMedia(dog.dog_media) },
            heats: heatsByDog.get(dog.id) ?? [],
            progeny: pupsByFather.get(dog.id) ?? [],
          }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dogs');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cards, loading, error, refresh };
}

import { MOCK_DOGS } from '@/lib/mockData';
import { useRemoteList } from '@/hooks/useRemoteList';
import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';
import type { Dog, LitterWithPuppies } from '@/types/app.types';

export interface UseDogsOptions {
  category?: string;
  featuredOnly?: boolean;
  /** Include dogs no longer active in the kennel (sold, deceased, retired, donated, gifted). Defaults to false — public listings should only show current dogs. */
  includeInactive?: boolean;
}

/** Statuses that mean a dog is no longer part of the active, marketable kennel. */
const INACTIVE_STATUSES = ['sold', 'deceased', 'retired', 'donated', 'gifted'];

const DOG_LIST_SELECT =
  'id, name, breed, colour, sex, status, date_of_birth, microchip_number, category, price, is_public, is_featured, dog_media(url, is_primary, type, sort_order, id, dog_id, thumbnail_url, caption, uploaded_at)';

const DOG_DETAIL_SELECT =
  'id, name, call_name, breed, colour, sex, date_of_birth, location, ' +
  'microchip_number, tattoo_number, passport_number, dna_number, insurance_number, ' +
  'registration_number, registration_type, ' +
  'bloodline, description, temperament_notes, training_notes, ' +
  'health_tested, hip_score, elbow_score, dcm_status, ' +
  'coat_type, height_cm, body_length_cm, chest_depth_cm, chest_girth_cm, ear_type, eye_colour, ' +
  'standard, bloodline_type, ' +
  'is_spayed_neutered, wrights_coi, ' +
  'genetics_b_locus, genetics_d_locus, genetics_vwd_status, genetics_dcm1_status, genetics_dcm2_status, genetics_notes, ' +
  'status, category, price, is_public, is_featured, ' +
  'father_id, mother_id, litter_id, owner_id, ' +
  'dog_media(id, url, thumbnail_url, is_primary, type, sort_order, caption, uploaded_at)';

function mapDogMedia(row: Record<string, unknown>): Dog {
  const media = (row.dog_media as Dog['media']) ?? [];
  return { ...(row as unknown as Dog), media };
}

export function useDogs(options?: UseDogsOptions) {
  const mock = MOCK_DOGS.filter((d) => {
    if (options?.category && d.category !== options.category) return false;
    if (options?.featuredOnly && !d.is_featured) return false;
    if (!options?.includeInactive && INACTIVE_STATUSES.includes(d.status ?? '')) return false;
    return d.is_public;
  });

  const list = useRemoteList<Dog>(mock, (client) => {
    let q = client.from('dogs').select(DOG_LIST_SELECT).eq('is_public', true);
    if (options?.category) q = q.eq('category', options.category);
    if (options?.featuredOnly) q = q.eq('is_featured', true);
    if (!options?.includeInactive) q = q.not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
    return q.order('name');
  });

  const dogs = list.data.map((row) => {
    const r = row as Dog & { dog_media?: Dog['media'] };
    if (r.dog_media) return { ...r, media: r.dog_media };
    return row;
  });

  return {
    dogs,
    loading: list.loading,
    error: list.error,
    refetch: list.refetch,
  };
}

export function useDog(id: string) {
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setDog(MOCK_DOGS.find((d) => d.id === id) ?? null);
      setLoading(false);
      return;
    }
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('dogs')
        .select(DOG_DETAIL_SELECT)
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      if (data) setDog(mapDogMedia(data as unknown as Record<string, unknown>));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dog profile');
      setDog(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dog, loading, error, refresh };
}

const LITTER_WITH_PUPPIES_SELECT = `
  id, name, status, actual_date, expected_date, go_home_date,
  puppy_count, available_count, notes,
  mother:dogs!litters_mother_id_fkey(id, name),
  father:dogs!litters_father_id_fkey(id, name),
  puppies:dogs!dogs_litter_id_fkey(
    id, name, sex, colour, status, date_of_birth,
    dog_media(url, is_primary)
  )
`;

export function useLittersWithPuppies() {
  const [litters, setLitters] = useState<LitterWithPuppies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('litters')
        .select(LITTER_WITH_PUPPIES_SELECT)
        .order('actual_date', { ascending: false });
      if (err) throw new Error(err.message);
      setLitters((data ?? []) as unknown as LitterWithPuppies[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litters');
      setLitters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { litters, loading, error, refresh };
}

const LITTER_DETAIL_SELECT = `
  id, name, status, actual_date, expected_date, go_home_date, go_home_weeks,
  litter_letter, mating_type, male_count, female_count, deceased_count, description, notes, whelping_notes, updated_at,
  mother:dogs!litters_mother_id_fkey(id, name),
  father:dogs!litters_father_id_fkey(id, name),
  puppies:dogs!dogs_litter_id_fkey(
    id, name, sex, colour, collar_colour, birth_weight_grams, status, date_of_birth, price, reserved_for_name,
    dog_media(url, is_primary)
  )
`;

export function useLitterDetail(id: string) {
  const [litter, setLitter] = useState<LitterWithPuppies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('litters')
        .select(LITTER_DETAIL_SELECT)
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      setLitter(data as unknown as LitterWithPuppies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litter');
      setLitter(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { litter, puppies: litter?.puppies ?? [], loading, error, refresh };
}
